import { isMockMode, db, storage } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface Transformer {
  serialNo: string; // e.g. "12345-030-099"
  partNo: string;
  pin: string;
  status: 'Saved' | 'Submitted' | 'Approved' | 'Rejected' | 'Received' | 'Declined' | 'Shipping' | 'Reviewed';
  dateSubmitted: string | null;
  feedbackDate?: string | null;
  feedback?: string;
  feedbackPhotos?: string[];
  photos: string[];
  testReportUrl: string | null;
  email: string;
  serverTimestamp: string;
  review?: string;
  reviewDate?: string | null;
  reviewPhotos?: string[];
  uniqueid?: string;
}

// Helper to map Firestore data structure to React Transformer interface
function mapFirestoreToTransformer(docId: string, data: any): Transformer {
  const serialNoRaw = data.serial_no || '';
  const serialNo = serialNoRaw.replace(/_/g, '/');

  let serverTimestampStr = new Date().toISOString();
  if (data.serverTimestamp) {
    if (typeof data.serverTimestamp.toDate === 'function') {
      serverTimestampStr = data.serverTimestamp.toDate().toISOString();
    } else if (data.serverTimestamp instanceof Date) {
      serverTimestampStr = data.serverTimestamp.toISOString();
    } else {
      serverTimestampStr = String(data.serverTimestamp);
    }
  }

  return {
    uniqueid: data.uniqueid || docId,
    serialNo: serialNo,
    partNo: data.partNo || '',
    pin: data.pin || '',
    status: data.status || 'Saved',
    dateSubmitted: data.date_submitted || null,
    feedbackDate: data.feedback_date || null,
    feedback: data.feedback || '',
    feedbackPhotos: data.feedback_photos || [],
    photos: data.photos || [],
    testReportUrl: data.test_report_url || null,
    email: data.email || '',
    serverTimestamp: serverTimestampStr,
    review: data.review || '',
    reviewDate: data.review_date || null,
    reviewPhotos: data.review_photos || []
  };
}

// Helper to map React Transformer object (for saving) to Firestore data structure
function mapTransformerToFirestore(transformer: Omit<Transformer, 'serverTimestamp'>, uniqueid: string): any {
  const sanitizedSerialNo = transformer.serialNo.replace(/\//g, '_');
  return {
    serial_no: sanitizedSerialNo,
    partNo: transformer.partNo,
    pin: transformer.pin,
    status: transformer.status,
    date_submitted: transformer.dateSubmitted || null,
    feedback_date: transformer.feedbackDate || null,
    feedback: transformer.feedback || '',
    feedback_photos: transformer.feedbackPhotos || [],
    photos: transformer.photos || [],
    test_report_url: transformer.testReportUrl || null,
    email: transformer.email,
    uniqueid: uniqueid,
    review: transformer.review || '',
    review_date: transformer.reviewDate || null,
    review_photos: transformer.reviewPhotos || [],
    serverTimestamp: serverTimestamp()
  };
}

// Helper to map partial React Transformer updates to Firestore updates
function mapPartialTransformerToFirestore(updates: Partial<Transformer>): any {
  const result: any = {};
  if (updates.serialNo !== undefined) result.serial_no = updates.serialNo.replace(/\//g, '_');
  if (updates.partNo !== undefined) result.partNo = updates.partNo;
  if (updates.pin !== undefined) result.pin = updates.pin;
  if (updates.status !== undefined) result.status = updates.status;
  if (updates.dateSubmitted !== undefined) result.date_submitted = updates.dateSubmitted;
  if (updates.feedbackDate !== undefined) result.feedback_date = updates.feedbackDate;
  if (updates.feedback !== undefined) result.feedback = updates.feedback;
  if (updates.feedbackPhotos !== undefined) result.feedback_photos = updates.feedbackPhotos;
  if (updates.photos !== undefined) result.photos = updates.photos;
  if (updates.testReportUrl !== undefined) result.test_report_url = updates.testReportUrl;
  if (updates.email !== undefined) result.email = updates.email;
  if (updates.review !== undefined) result.review = updates.review;
  if (updates.reviewDate !== undefined) result.review_date = updates.reviewDate;
  if (updates.reviewPhotos !== undefined) result.review_photos = updates.reviewPhotos;
  return result;
}

const STORAGE_KEY_TRANSFORMERS = 'tracker2_transformers';
const STORAGE_KEY_PARTS = 'tracker2_part_numbers';

// Default mock data matching the Stitch design mockups
const DEFAULT_PART_NUMBERS = [
  "AC3-300-6401-DYC",
  "AA3-112-6201-DYC",
  "AC3-030-4201-DYC",
  "AA3-075-6201-DYC",
  "AA3-015-6201-DYC",
  "AA3-150-6201-DYC",
  "AC3-225-6201-DYC",
  "AC3-30-6201-DYC",
  "AC3-45-6201-DYC",
  "AC3-75-6201-DYC"
];

const DEFAULT_TRANSFORMERS: Transformer[] = [
  {
    serialNo: "12345-030-099",
    partNo: "AA3-112-6201-DYC",
    pin: "123456",
    status: "Approved",
    dateSubmitted: "2026-06-05",
    photos: [
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    testReportUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    email: "superadmin@gmail.com",
    serverTimestamp: "2026-06-05T12:00:00Z"
  },
  {
    serialNo: "98765-021-142",
    partNo: "AC3-300-6401-DYC",
    pin: "111111",
    status: "Rejected",
    dateSubmitted: "2026-06-12",
    photos: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    testReportUrl: null,
    email: "john.doe@gmail.com",
    serverTimestamp: "2026-06-12T08:30:00Z"
  },
  {
    serialNo: "44321-088-900",
    partNo: "AC3-030-4201-DYC",
    pin: "222222",
    status: "Saved",
    dateSubmitted: "2026-06-14",
    photos: [],
    testReportUrl: null,
    email: "alex.rivera@gmail.com",
    serverTimestamp: "2026-06-14T09:15:00Z"
  },
  {
    serialNo: "22114-045-312",
    partNo: "AA3-075-6201-DYC",
    pin: "333333",
    status: "Shipping",
    dateSubmitted: "2026-06-18",
    photos: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    testReportUrl: null,
    email: "alex.rivera@gmail.com",
    serverTimestamp: "2026-06-18T14:20:00Z"
  },
  {
    serialNo: "77651-090-445",
    partNo: "AA3-015-6201-DYC",
    pin: "444444",
    status: "Saved",
    dateSubmitted: "2026-06-20",
    photos: [],
    testReportUrl: null,
    email: "superadmin@gmail.com",
    serverTimestamp: "2026-06-20T10:00:00Z"
  }
];

// Helper to load/save mock data from LocalStorage
function getMockTransformers(): Transformer[] {
  const data = localStorage.getItem(STORAGE_KEY_TRANSFORMERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEY_TRANSFORMERS, JSON.stringify(DEFAULT_TRANSFORMERS));
    return DEFAULT_TRANSFORMERS;
  }
  return JSON.parse(data);
}

function saveMockTransformers(transformers: Transformer[]) {
  localStorage.setItem(STORAGE_KEY_TRANSFORMERS, JSON.stringify(transformers));
}

function getMockPartNumbers(): string[] {
  const data = localStorage.getItem(STORAGE_KEY_PARTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEY_PARTS, JSON.stringify(DEFAULT_PART_NUMBERS));
    return DEFAULT_PART_NUMBERS;
  }
  return JSON.parse(data);
}

export class TransformerService {
  /**
   * Fetches the available part numbers dropdown list
   */
  static async getPartNos(): Promise<string[]> {
    if (isMockMode) {
      return getMockPartNumbers();
    }
    
    try {
      const docRef = doc(db, 'constants', 'partsNo');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return Object.values(data) as string[];
      }
      return [];
    } catch (e) {
      console.error("Error fetching part numbers:", e);
      return getMockPartNumbers();
    }
  }

  /**
   * Fetches all transformer records sorted by submission date descending
   */
  static async getAllTransformers(): Promise<Transformer[]> {
    if (isMockMode) {
      return getMockTransformers().sort((a, b) => 
        new Date(b.serverTimestamp).getTime() - new Date(a.serverTimestamp).getTime()
      );
    }

    try {
      const colRef = collection(db, 'transformers');
      const querySnapshot = await getDocs(colRef);
      const list: Transformer[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(mapFirestoreToTransformer(docSnap.id, docSnap.data()));
      });
      return list.sort((a, b) => 
        new Date(b.serverTimestamp).getTime() - new Date(a.serverTimestamp).getTime()
      );
    } catch (e) {
      console.error("Error fetching transformers:", e);
      return getMockTransformers();
    }
  }

  /**
   * Fetches a single transformer record by its serial number
   */
  static async getTransformerBySerialNo(serialNo: string): Promise<Transformer | null> {
    const sanitized = serialNo.replace(/\//g, '_');
    
    if (isMockMode) {
      const list = getMockTransformers();
      const item = list.find(t => t.serialNo.replace(/\//g, '_') === sanitized || t.serialNo === serialNo);
      return item || null;
    }

    try {
      const colRef = collection(db, 'transformers');
      const q = query(colRef, where('serial_no', '==', sanitized));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return mapFirestoreToTransformer(docSnap.id, docSnap.data());
      }
      return null;
    } catch (e) {
      console.error("Error fetching transformer detail:", e);
      const list = getMockTransformers();
      return list.find(t => t.serialNo === serialNo) || null;
    }
  }

  /**
   * Submits a new or updated transformer record
   */
  static async submitTransformer(transformer: Omit<Transformer, 'serverTimestamp'>): Promise<boolean> {
    const fullItem: Transformer = {
      ...transformer,
      serverTimestamp: new Date().toISOString()
    };

    if (isMockMode) {
      const list = getMockTransformers();
      const index = list.findIndex(t => t.serialNo === transformer.serialNo);
      if (index >= 0) {
        list[index] = fullItem;
      } else {
        list.push(fullItem);
      }
      saveMockTransformers(list);
      return true;
    }

    try {
      const existing = await this.getTransformerBySerialNo(transformer.serialNo);
      const colRef = collection(db, 'transformers');
      let docRef;
      let uniqueid;

      if (existing && existing.uniqueid) {
        uniqueid = existing.uniqueid;
        docRef = doc(db, 'transformers', uniqueid);
      } else {
        docRef = doc(colRef);
        uniqueid = docRef.id;
      }

      const firestoreData = mapTransformerToFirestore(transformer, uniqueid);
      await setDoc(docRef, firestoreData);
      return true;
    } catch (e) {
      console.error("Error saving transformer:", e);
      return false;
    }
  }

  /**
   * Updates fields on a transformer (e.g. status, review details, feedback)
   */
  static async updateTransformerFields(serialNo: string, updates: Partial<Transformer>): Promise<boolean> {
    if (isMockMode) {
      const list = getMockTransformers();
      const index = list.findIndex(t => t.serialNo === serialNo);
      if (index >= 0) {
        list[index] = { ...list[index], ...updates };
        saveMockTransformers(list);
        return true;
      }
      return false;
    }

    try {
      const existing = await this.getTransformerBySerialNo(serialNo);
      if (!existing || !existing.uniqueid) {
        console.error("Transformer not found for update:", serialNo);
        return false;
      }

      const docRef = doc(db, 'transformers', existing.uniqueid);
      const firestoreUpdates = mapPartialTransformerToFirestore(updates);
      await updateDoc(docRef, firestoreUpdates);
      return true;
    } catch (e) {
      console.error("Error updating transformer:", e);
      return false;
    }
  }

  /**
   * Simulates file uploads (Test Report PDFs or Device Photos)
   */
  static async uploadFile(file: File, serialNo: string, folder: string): Promise<string> {
    if (isMockMode) {
      // Return a simulated object URL for previewing, or standard placeholder
      return URL.createObjectURL(file);
    }

    try {
      const sanitized = serialNo.replace(/\//g, '_');
      const fileRef = ref(storage, `${sanitized}/${folder}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (e) {
      console.error("Error uploading file to storage:", e);
      return URL.createObjectURL(file);
    }
  }

  /**
   * Listens to transformer records in real-time
   */
  static listenToTransformers(callback: (transformers: Transformer[]) => void): () => void {
    if (isMockMode) {
      const list = getMockTransformers().sort((a, b) => 
        new Date(b.serverTimestamp).getTime() - new Date(a.serverTimestamp).getTime()
      );
      callback(list);
      return () => {};
    }

    const colRef = collection(db, 'transformers');
    return onSnapshot(colRef, (querySnapshot) => {
      const list: Transformer[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(mapFirestoreToTransformer(docSnap.id, docSnap.data()));
      });
      const sorted = list.sort((a, b) => 
        new Date(b.serverTimestamp).getTime() - new Date(a.serverTimestamp).getTime()
      );
      callback(sorted);
    }, (error) => {
      console.error("Error listening to transformers:", error);
    });
  }

  /**
   * Listens to part numbers dropdown list in real-time
   */
  static listenToPartNos(callback: (partNos: string[]) => void): () => void {
    if (isMockMode) {
      callback(getMockPartNumbers());
      return () => {};
    }

    const docRef = doc(db, 'constants', 'partsNo');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback(Object.values(data) as string[]);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error("Error listening to part numbers:", error);
    });
  }
}
