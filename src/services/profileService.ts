import { isMockMode, db, auth, storage } from './firebase';
import { signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface UserProfile {
  fname: string;
  lname: string;
  email: string;
  pin: string;
  role: string;
  avatarUrl: string;
  engineerId: string;
}

const STORAGE_KEY_PROFILE = 'tracker2_user_profile';

const DEFAULT_PROFILE: UserProfile = {
  fname: "John",
  lname: "Doe",
  email: "superadmin@gmail.com",
  pin: "123456",
  role: "Superadmin",
  avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWMhF9fnTXbHM8KuHZRrZXP7OaExxlqQN7CrpsL6hfd4OtCkbgN-8WYJ3CfO_Hhx9XLJbL86ZNuI8ZWxx1ENTyqkxEmdAONA0f7jfGzU1SELzp0cKEBTx0XjwgkJUWX61KrTr_JVnobThK1Sobj54Vhj-8qG3wygVwUyUxjQzA-fqxvhBNxWd_gpMkH_47Rv99lPypfZg3LiuksOTdGSmvglBzJ-nfa5OZ3NKRizVtG0lXX8-ls1aR65NYxg2kHPn6k2whOMEUVei3",
  engineerId: "#4421"
};

// Role mappings between Firestore integers and Web UI strings
const ROLE_MAP_TO_STRING: Record<number, string> = {
  0: 'Superadmin',
  1: 'Client Engineer',
  2: 'Test Engineer',
  3: 'Load Engineer'
};

const ROLE_MAP_TO_INT: Record<string, number> = {
  'Superadmin': 0,
  'Client Engineer': 1,
  'Test Engineer': 2,
  'Load Engineer': 3
};

export class ProfileService {
  static getProfile(): UserProfile {
    const data = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    return JSON.parse(data);
  }

  static async login(pin: string): Promise<UserProfile | null> {
    if (isMockMode) {
      // Mock mode: login if pin matches local profile or default
      const profile = this.getProfile();
      if (pin === profile.pin) {
        localStorage.setItem('tracker2_logged_in', 'true');
        return profile;
      }
      return null;
    }

    try {
      // 1. Sign in anonymously via Firebase Auth
      await signInAnonymously(auth);

      // 2. Query Firestore users collection for document matching the PIN
      const docRef = doc(db, 'users', pin);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Map Firestore document data to React UserProfile structure
        const mappedProfile: UserProfile = {
          fname: data.first_name || '',
          lname: data.last_name || '',
          email: data.email || '',
          pin: pin,
          role: ROLE_MAP_TO_STRING[data.role ?? 0] || 'Client Engineer',
          avatarUrl: data.profilePictureUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWMhF9fnTXbHM8KuHZRrZXP7OaExxlqQN7CrpsL6hfd4OtCkbgN-8WYJ3CfO_Hhx9XLJbL86ZNuI8ZWxx1ENTyqkxEmdAONA0f7jfGzU1SELzp0cKEBTx0XjwgkJUWX61KrTr_JVnobThK1Sobj54Vhj-8qG3wygVwUyUxjQzA-fqxvhBNxWd_gpMkH_47Rv99lPypfZg3LiuksOTdGSmvglBzJ-nfa5OZ3NKRizVtG0lXX8-ls1aR65NYxg2kHPn6k2whOMEUVei3',
          engineerId: `#${pin.substring(0, 4)}` // derived or custom engineer ID matching PIN prefix
        };

        // 3. Save profile to localStorage for session tracking
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(mappedProfile));
        localStorage.setItem('tracker2_logged_in', 'true');
        window.dispatchEvent(new Event('profile_updated'));
        
        return mappedProfile;
      } else {
        console.warn(`No user document found for PIN: ${pin}`);
        return null;
      }
    } catch (error) {
      console.error("Firebase Auth or Firestore fetch failed during login:", error);
      throw error;
    }
  }

  static async saveProfile(profile: UserProfile): Promise<void> {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    
    if (!isMockMode) {
      try {
        const docRef = doc(db, 'users', profile.pin);
        await updateDoc(docRef, {
          first_name: profile.fname,
          last_name: profile.lname,
          email: profile.email,
          role: ROLE_MAP_TO_INT[profile.role] ?? 1,
          profilePictureUrl: profile.avatarUrl
        });
      } catch (error) {
        console.error("Failed to update user profile in Firestore:", error);
      }
    }
    
    // Trigger custom event to notify components
    window.dispatchEvent(new Event('profile_updated'));
  }

  static async logout(): Promise<void> {
    if (!isMockMode) {
      try {
        await firebaseSignOut(auth);
      } catch (error) {
        console.error("Firebase signout failed:", error);
      }
    }

    localStorage.removeItem('tracker2_logged_in');
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    
    // Trigger events to clear profile/auth state
    window.dispatchEvent(new Event('profile_updated'));
    window.dispatchEvent(new Event('auth_state_changed'));
  }

  static async uploadProfilePicture(pin: string, file: File): Promise<string> {
    if (isMockMode) {
      return URL.createObjectURL(file);
    }

    try {
      // Upload to folder profile_pictures/{pin}
      const fileRef = ref(storage, `profile_pictures/${pin}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }
}

