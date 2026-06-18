import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransformerService } from '../services/transformerService';
import { ProfileService, type UserProfile } from '../services/profileService';

export const AddTransformer: React.FC = () => {
  const [serialNo, setSerialNo] = useState('');
  const [partNoSearch, setPartNoSearch] = useState('');
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [filteredParts, setFilteredParts] = useState<string[]>([]);
  const [isPartsOpen, setIsPartsOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState('');
  
  const [testReport, setTestReport] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [isValidatingSerial, setIsValidatingSerial] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<UserProfile>(ProfileService.getProfile());
  const navigate = useNavigate();

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(ProfileService.getProfile());
    };
    window.addEventListener('profile_updated', handleUpdate);
    return () => window.removeEventListener('profile_updated', handleUpdate);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tracker2_logged_in');
    window.dispatchEvent(new Event('auth_state_changed'));
    navigate('/login');
  };

  useEffect(() => {
    if (localStorage.getItem('tracker2_logged_in') !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = TransformerService.listenToPartNos((list) => {
      setPartNumbers(list);
    });
    return () => unsubscribe();
  }, []);

  // Filter part numbers as user types
  useEffect(() => {
    if (partNoSearch === '') {
      setFilteredParts(partNumbers);
    } else {
      setFilteredParts(
        partNumbers.filter(p => p.toLowerCase().includes(partNoSearch.toLowerCase()))
      );
    }
  }, [partNoSearch, partNumbers]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPartsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSerialBlur = async () => {
    const cleanSerial = serialNo.trim();
    if (!cleanSerial) {
      setSerialError(null);
      return;
    }
    
    setIsValidatingSerial(true);
    setSerialError(null);
    
    try {
      const existing = await TransformerService.getTransformerBySerialNo(cleanSerial);
      if (existing) {
        setSerialError("This Serial Number is already registered in the database.");
      }
    } catch (e) {
      console.error("Error checking serial number uniqueness:", e);
    } finally {
      setIsValidatingSerial(false);
    }
  };

  const handlePartSelect = (p: string) => {
    setSelectedPart(p);
    setPartNoSearch(p);
    setIsPartsOpen(false);
  };

  const handleGenerateQR = () => {
    if (serialNo.trim()) {
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(serialNo)}`);
    } else {
      alert("Please enter a Serial Number first.");
    }
  };

  // Drag and Drop handlers for PDF
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropPDF = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type === "application/pdf") {
      setTestReport(files[0]);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setTestReport(files[0]);
    }
  };

  // Photo uploads
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      setPhotos(prev => [...prev, ...newPhotos]);
      
      const newUrls = newPhotos.map(file => URL.createObjectURL(file));
      setPhotoUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (status: 'Saved' | 'Submitted') => {
    if (!serialNo.trim()) {
      alert("Please enter a Serial Number.");
      return;
    }
    if (serialError) {
      alert("Please resolve the duplicate serial number error.");
      return;
    }
    if (isValidatingSerial) {
      alert("Please wait for the serial number check to finish.");
      return;
    }
    if (!selectedPart) {
      alert("Please select a Part Number.");
      return;
    }

    setIsLoading(true);

    // Upload files
    let testReportUrl = null;
    if (testReport) {
      testReportUrl = await TransformerService.uploadFile(testReport, serialNo, 'test_report');
    }

    const uploadedPhotoUrls: string[] = [];
    for (const photo of photos) {
      const url = await TransformerService.uploadFile(photo, serialNo, 'photos');
      uploadedPhotoUrls.push(url);
    }

    const email = ProfileService.getProfile().email;
    const pin = ProfileService.getProfile().pin;

    const success = await TransformerService.submitTransformer({
      serialNo,
      partNo: selectedPart,
      pin,
      status,
      dateSubmitted: status === 'Submitted' ? new Date().toISOString().split('T')[0] : null,
      photos: uploadedPhotoUrls,
      testReportUrl,
      email
    });

    setIsLoading(false);

    if (success) {
      navigate('/');
    } else {
      alert("Failed to save transformer. Please try again.");
    }
  };

  return (
    <div className="flex-1 min-h-screen pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white shadow-sm flex justify-between items-center px-6 py-4 w-full">
        <h2 className="font-headline-md text-headline-md text-primary font-semibold">
          Add New Transformer
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="hover:bg-surface-container-high rounded-full p-2 transition-transform active:scale-95 cursor-pointer flex items-center justify-center text-on-surface-variant hover:text-error"
            title="Logout"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>

          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 pl-2 border-l border-outline-variant cursor-pointer hover:opacity-80 transition-opacity"
            title="View Profile"
          >
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-on-surface leading-tight">
                {profile.fname} {profile.lname}
              </p>
              <p className="text-xs text-on-surface-variant">{profile.role}</p>
            </div>
            <img
              alt="User Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary-container shadow-sm"
              src={profile.avatarUrl}
            />
          </div>
        </div>
      </header>

      {/* Form Container */}
      <section className="p-8 flex items-start justify-center max-w-7xl mx-auto">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-ambient overflow-hidden flex flex-col border border-outline-variant/20">
          
          {/* Form Content: Split Screen */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Column: Identifiers */}
            <div className="p-8 space-y-6 border-r border-surface-container">
              <div>
                <h3 className="text-label-bold text-primary mb-4 uppercase tracking-wider font-bold text-xs">
                  Device Identification
                </h3>
                <div className="space-y-5">
                  
                  {/* Serial No Input */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-xs text-on-surface-variant block">
                      Serial No
                    </label>
                    <input 
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary outline-none bg-surface-bright transition-all text-sm ${
                        serialError 
                          ? 'border-error/50 focus:border-error' 
                          : 'border-outline-variant'
                      }`}
                      placeholder="e.g. TR-2023-9981-X" 
                      type="text"
                      value={serialNo}
                      onChange={(e) => {
                        setSerialNo(e.target.value);
                        setSerialError(null);
                      }}
                      onBlur={handleSerialBlur}
                    />
                    {isValidatingSerial && (
                      <p className="text-[11px] text-primary flex items-center gap-1 mt-1 font-medium animate-pulse">
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full"></span>
                        Checking database for duplicates...
                      </p>
                    )}
                    {serialError && (
                      <p className="text-[11px] text-error flex items-center gap-1 mt-1 font-medium">
                        <span className="material-symbols-outlined text-xs">error</span>
                        {serialError}
                      </p>
                    )}
                  </div>

                  {/* Part Number Autocomplete Search Input */}
                  <div className="space-y-1.5 relative" ref={dropdownRef}>
                    <label className="font-semibold text-xs text-on-surface-variant block">
                      Select Part Number
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full p-3 pl-10 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary outline-none bg-surface-bright text-sm" 
                        placeholder="Search components..." 
                        type="text" 
                        value={partNoSearch}
                        onChange={(e) => { 
                          setPartNoSearch(e.target.value); 
                          setIsPartsOpen(true); 
                        }}
                        onFocus={() => setIsPartsOpen(true)}
                      />
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
                        search
                      </span>
                    </div>

                    {isPartsOpen && filteredParts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-outline-variant rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredParts.map((p) => (
                          <div 
                            key={p} 
                            onClick={() => handlePartSelect(p)}
                            className={`px-4 py-2.5 text-sm hover:bg-surface-container-high cursor-pointer transition-colors ${
                              selectedPart === p ? 'bg-surface-container-high font-bold' : ''
                            }`}
                          >
                            {p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* QR Code Action Button */}
                  <div className="pt-4 flex flex-col items-center">
                    <button 
                      onClick={handleGenerateQR}
                      className="w-full bg-primary-container text-on-primary-container py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer text-sm shadow-sm"
                    >
                      <span className="material-symbols-outlined text-lg">qr_code_2</span>
                      Generate QR Code
                    </button>
                    <p className="text-[11px] text-center mt-2 text-on-surface-variant italic">
                      QR code will be linked to this specific serial number.
                    </p>

                    {qrUrl && (
                      <div className="mt-4 p-4 border border-outline-variant rounded-lg bg-surface-container-low flex flex-col items-center">
                        <img src={qrUrl} alt="Generated QR" className="w-40 h-40 object-contain shadow-sm bg-white p-2 rounded" />
                        <span className="text-[11px] font-mono mt-2 text-outline">{serialNo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Media & Documents */}
            <div className="p-8 space-y-6 bg-surface-container-low/30">
              <div>
                <h3 className="text-label-bold text-primary mb-4 uppercase tracking-wider font-bold text-xs">
                  Verification & Media
                </h3>
                <div className="space-y-6">
                  
                  {/* PDF Drop Zone */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-xs text-on-surface-variant block">
                      Upload Test Report (PDF)
                    </label>
                    <div 
                      onDragOver={handleDragOver}
                      onDrop={handleDropPDF}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-outline-variant rounded-xl p-6 bg-white flex flex-col items-center justify-center text-center hover:border-primary transition-colors cursor-pointer group shadow-sm"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePdfChange} 
                        accept="application/pdf" 
                        className="hidden" 
                      />
                      <span className="material-symbols-outlined text-primary text-4xl mb-2 group-hover:scale-110 transition-transform">
                        picture_as_pdf
                      </span>
                      {testReport ? (
                        <div className="space-y-3 w-full flex flex-col items-center">
                          <div>
                            <p className="text-sm font-semibold text-on-surface truncate max-w-xs">{testReport.name}</p>
                            <p className="text-xs text-outline mt-0.5">{(testReport.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = URL.createObjectURL(testReport);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = testReport.name;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Download Test Report
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium">Drag and drop file or <span className="text-primary underline">browse</span></p>
                          <p className="text-xs text-on-surface-variant mt-1">Maximum file size: 10MB</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Photo Image Picker */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-xs text-on-surface-variant block">
                      Upload Transformer Photos
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      
                      {/* Uploaded Preview items */}
                      {photoUrls.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-outline-variant">
                          <img className="w-full h-full object-cover" src={url} alt={`Preview ${index + 1}`} />
                          <button 
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-error text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity shadow-lg flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ))}

                      {/* Add Button */}
                      <button 
                        onClick={() => photoInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-outline hover:text-primary hover:border-primary transition-all cursor-pointer bg-white"
                      >
                        <input 
                          type="file" 
                          ref={photoInputRef} 
                          onChange={handlePhotoChange} 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                        />
                        <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                        <span className="text-[10px] font-bold mt-1">ADD PHOTO</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-surface-container flex justify-end items-center gap-4 border-t border-surface-variant">
            <button 
              onClick={() => handleSave('Saved')}
              disabled={isLoading || !serialNo.trim() || !selectedPart || isValidatingSerial || !!serialError}
              className={`px-6 py-2.5 rounded-lg border font-bold transition-all active:scale-95 text-sm ${
                serialNo.trim() && selectedPart && !isLoading && !isValidatingSerial && !serialError
                  ? 'border-primary text-primary hover:bg-primary/5 cursor-pointer'
                  : 'border-outline-variant text-outline cursor-not-allowed'
              }`}
            >
              Save Draft
            </button>
            <button 
              onClick={() => handleSave('Submitted')}
              disabled={isLoading || !serialNo.trim() || !selectedPart || photos.length === 0 || !testReport || isValidatingSerial || !!serialError}
              className={`px-8 py-2.5 rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm ${
                serialNo.trim() && selectedPart && photos.length > 0 && testReport && !isLoading && !isValidatingSerial && !serialError
                  ? 'bg-primary text-white hover:shadow-primary/20 cursor-pointer'
                  : 'bg-primary-container text-on-primary-container opacity-60 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
