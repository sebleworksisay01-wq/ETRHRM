import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Palette,
  Calendar,
  Check,
  RefreshCw,
  Upload,
  Trash2,
  Plus,
  Edit2,
  AlertCircle,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Cloud,
  Database,
  Radio,
  ShieldAlert,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHRMS } from '../context/HRMSContext';
import { PublicHoliday, CompanyProfile } from '../types/hrms';
import { INITIAL_COMPANY_PROFILE } from '../data/seedData';
import { AccessDenied } from '../components/AccessDenied';
import { EthioReLogo } from '../components/EthioReLogo';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { firebaseConfig } from '../firebase';

export interface SettingsViewProps {
  initialTab?: 'profile' | 'branding' | 'holidays' | 'leavetypes' | 'firebase';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'profile' }) => {
  const { isAdmin } = useAuth();
  const {
    companyProfile,
    branding,
    publicHolidays,
    leaveTypes,
    updateCompanyProfile,
    updateBranding,
    resetBrandingToDefault,
    uploadCompanyLogo,
    removeCompanyLogo,
    addPublicHoliday,
    updatePublicHoliday,
    deletePublicHoliday,
    updateLeaveTypeDays,
    firebaseStatus,
    refreshFirebaseStatus,
    syncAllToFirebase,
    firestoreRulesRequired,
    setIsRulesModalOpen,
  } = useHRMS();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'branding' | 'holidays' | 'leavetypes' | 'firebase'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseFeedback, setFirebaseFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Helper to ensure all profile fields are defined strings or numbers (never undefined)
  const normalizeProfileData = (p?: Partial<CompanyProfile>): CompanyProfile => ({
    displayName: p?.displayName ?? INITIAL_COMPANY_PROFILE.displayName,
    legalName: p?.legalName ?? INITIAL_COMPANY_PROFILE.legalName,
    shortName: p?.shortName ?? INITIAL_COMPANY_PROFILE.shortName,
    logo: p?.logo ?? '',
    email: p?.email ?? INITIAL_COMPANY_PROFILE.email,
    phoneNumber: p?.phoneNumber ?? INITIAL_COMPANY_PROFILE.phoneNumber,
    website: p?.website ?? INITIAL_COMPANY_PROFILE.website,
    address: p?.address ?? INITIAL_COMPANY_PROFILE.address,
    city: p?.city ?? INITIAL_COMPANY_PROFILE.city,
    country: p?.country ?? INITIAL_COMPANY_PROFILE.country,
    postalCode: p?.postalCode ?? INITIAL_COMPANY_PROFILE.postalCode,
    taxId: p?.taxId ?? INITIAL_COMPANY_PROFILE.taxId,
    description: p?.description ?? INITIAL_COMPANY_PROFILE.description,
    industry: p?.industry ?? 'Financial Services & Reinsurance',
    registrationNumber: p?.registrationNumber ?? 'NBR/001/2016',
    establishedYear: p?.establishedYear ? Number(p.establishedYear) : 2016,
    officialEmail: p?.officialEmail ?? p?.email ?? 'info@ethiore.com',
    officialPhone: p?.officialPhone ?? p?.phoneNumber ?? '+251 11 557 5757',
  });

  // Company Profile Form State & Logo Management
  const [profileData, setProfileData] = useState<CompanyProfile>(() => normalizeProfileData(companyProfile));
  const [profileSaved, setProfileSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logoFeedback, setLogoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);

  // Computed helper: True if a custom corporate logo is actively set
  const hasCustomLogo = Boolean((profileData.logo && profileData.logo.trim() !== '') || (companyProfile?.logo && companyProfile.logo.trim() !== ''));
  const currentActiveLogo = profileData.logo || companyProfile?.logo || '';

  // Branding Form State
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || '#002855');
  const [secondaryColor, setSecondaryColor] = useState(branding.secondaryColor || '#004080');
  const [accentColor, setAccentColor] = useState(branding.accentColor || '#D4AF37');
  const [companyDisplayName, setCompanyDisplayName] = useState(branding.companyDisplayName || 'Ethiopian Reinsurance S.C. (Ethio-Re)');
  const [brandingSaved, setBrandingSaved] = useState(false);

  // Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('2026-09-11');
  const [holidayDesc, setHolidayDesc] = useState('');

  // Sync profile data when companyProfile updates from Firestore or on tab reload
  useEffect(() => {
    setProfileData(normalizeProfileData(companyProfile));
  }, [companyProfile]);

  // Ensure non-admins are kept on the profile sub-tab
  useEffect(() => {
    if (!isAdmin && activeSubTab !== 'profile') {
      setActiveSubTab('profile');
    }
  }, [isAdmin, activeSubTab]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  // Handle logo file selection, immediate preview, and upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again if needed
    e.target.value = '';

    // 1. Supported formats: PNG, JPG/JPEG, WEBP
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

    const isValidFormat = validMimeTypes.includes(file.type.toLowerCase()) || validExtensions.includes(ext);

    if (!isValidFormat) {
      setLogoFeedback({
        type: 'error',
        message: 'Unsupported format. Supported formats are PNG, JPG/JPEG, and WEBP.',
      });
      return;
    }

    // 2. Recommended maximum file size: 2 MB
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      setLogoFeedback({
        type: 'error',
        message: `File size exceeds the recommended maximum of 2 MB (${sizeInMB} MB). Please choose a smaller image.`,
      });
      return;
    }

    // 3. Show selected image preview immediately
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setLogoPreviewUrl(preview);
    setLogoFile(file);
    setIsUploadingLogo(true);
    setUploadProgress(25);

    try {
      setUploadProgress(55);
      const res = await uploadCompanyLogo(file);
      setUploadProgress(90);

      if (res.success && res.url) {
        setUploadProgress(100);
        setProfileData((prev) => ({ ...prev, logo: res.url! }));
        setLogoFile(null);
        setLogoFeedback({
          type: 'success',
          message: 'Company logo updated successfully.',
        });
        setTimeout(() => setLogoFeedback(null), 6000);
      } else {
        setLogoPreviewUrl(null);
        setLogoFeedback({
          type: 'error',
          message: res.error || 'Failed to upload company logo.',
        });
      }
    } catch (err: any) {
      setLogoPreviewUrl(null);
      setLogoFeedback({
        type: 'error',
        message: err?.message || 'Unexpected error uploading logo.',
      });
    } finally {
      setIsUploadingLogo(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  // Open confirmation dialog for removing logo
  const handleOpenRemoveDialog = () => {
    setIsConfirmRemoveOpen(true);
  };

  // Execute logo removal upon user confirmation
  const handleConfirmRemoveLogo = async () => {
    setIsConfirmRemoveOpen(false);
    setIsRemovingLogo(true);
    setLogoFeedback(null);
    try {
      const res = await removeCompanyLogo();
      if (res.success) {
        setProfileData((prev) => ({ ...prev, logo: '' }));
        if (logoPreviewUrl) {
          URL.revokeObjectURL(logoPreviewUrl);
          setLogoPreviewUrl(null);
        }
        setLogoFile(null);
        setLogoFeedback({
          type: 'success',
          message: 'Company logo removed successfully.',
        });
        setTimeout(() => setLogoFeedback(null), 6000);
      } else {
        setLogoFeedback({
          type: 'error',
          message: res.error || 'Failed to remove company logo.',
        });
      }
    } catch (err: any) {
      setLogoFeedback({
        type: 'error',
        message: err?.message || 'Unexpected error removing logo.',
      });
    } finally {
      setIsRemovingLogo(false);
    }
  };

  // Save profile credentials
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploadingLogo(true);
    try {
      await updateCompanyProfile(profileData);
      setProfileSaved(true);
      setLogoFeedback({
        type: 'success',
        message: 'Data configuration details updated successfully!',
      });
      setTimeout(() => {
        setProfileSaved(false);
        setLogoFeedback(null);
      }, 4000);
    } catch (err: any) {
      setLogoFeedback({
        type: 'error',
        message: err?.message || 'Failed to save data configuration.',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Save branding
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding({
      primaryColor,
      secondaryColor,
      accentColor,
      companyDisplayName,
    });
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 3000);
  };

  // Apply preset color themes
  const applyThemePreset = (p: string, s: string, a: string) => {
    setPrimaryColor(p);
    setSecondaryColor(s);
    setAccentColor(a);
    updateBranding({
      primaryColor: p,
      secondaryColor: s,
      accentColor: a,
    });
  };

  // Holiday handlers
  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;

    if (editingHoliday) {
      updatePublicHoliday(editingHoliday.id, {
        name: holidayName.trim(),
        date: holidayDate,
        description: holidayDesc.trim(),
      });
    } else {
      addPublicHoliday({
        name: holidayName.trim(),
        date: holidayDate,
        description: holidayDesc.trim(),
        status: 'Active',
      });
    }
    setIsHolidayModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Settings Navigation Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {isAdmin ? 'Corporate System Settings' : 'Data Configuration'}
              </h1>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                isAdmin ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
              }`}>
                {isAdmin ? 'Administrator Privileged' : 'View Only · Read Access'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Configure corporate entity identity, real-time dynamic CSS theme colors, and statutory holidays.'
                : 'Official legal registry credentials and corporate branding identity of Ethiopian Reinsurance S.C.'}
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              id="tab-settings-profile"
              onClick={() => setActiveSubTab('profile')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeSubTab === 'profile'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Configuration
            </button>
            {isAdmin && (
              <>
                <button
                  id="tab-settings-branding"
                  onClick={() => setActiveSubTab('branding')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeSubTab === 'branding'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Branding &amp; Colors
                </button>
                <button
                  id="tab-settings-holidays"
                  onClick={() => setActiveSubTab('holidays')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeSubTab === 'holidays'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Public Holidays
                </button>
                <button
                  id="tab-settings-leavetypes"
                  onClick={() => setActiveSubTab('leavetypes')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeSubTab === 'leavetypes'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Statutory Leave Types
                </button>
                <button
                  id="tab-settings-firebase"
                  onClick={() => setActiveSubTab('firebase')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'firebase'
                      ? 'bg-white text-[#002855] shadow-2xs font-bold border border-amber-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 text-amber-500" />
                  <span>Firebase Cloud</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: COMPANY PROFILE */}
      {activeSubTab === 'profile' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Corporate Legal Profile</h2>
              <p className="text-xs text-slate-500">Official legal and registry credentials of the reinsurance enterprise.</p>
            </div>
            {profileSaved && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Profile updated successfully!</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
            {/* 1. COMPANY LOGO FIELD & CENTRALIZED MANAGEMENT */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-[#002855] rounded-lg">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="company-logo-file-input" className="font-bold text-sm text-slate-900 cursor-pointer">
                        Company Logo
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Single Global Source
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      The single centralized logo for the entire HRMS. Automatically propagated across Login, Dashboard, Header, Sidebar, Employees, Attendance, and Reports.
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 shrink-0">
                  <div>Formats: <span className="font-semibold text-slate-700">PNG, JPG/JPEG, WEBP</span></div>
                  <div className="text-[10px] text-slate-400">Max size: <strong className="text-slate-600">2 MB</strong></div>
                </div>
              </div>

              {/* Status/Feedback Notification */}
              {logoFeedback && (
                <div
                  className={`p-3 rounded-lg flex items-center justify-between gap-2 text-xs font-semibold ${
                    logoFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {logoFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{logoFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogoFeedback(null)}
                    className="p-1 rounded hover:bg-black/5 cursor-pointer text-slate-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Upload Progress Bar */}
              {isUploadingLogo && (
                <div className="space-y-1.5 p-3.5 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                      <span>Uploading to Firebase Storage &amp; updating system-wide profile...</span>
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#002855] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Logo Preview and Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                {/* Preview Box & Meta */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-xl border-2 border-slate-300 bg-white p-1.5 flex items-center justify-center shadow-xs overflow-hidden">
                      {logoPreviewUrl ? (
                        <img
                          src={logoPreviewUrl}
                          alt="Company Logo Preview"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : hasCustomLogo ? (
                        <img
                          src={currentActiveLogo}
                          alt={profileData.displayName || companyProfile?.displayName || 'Company Logo'}
                          className="w-full h-full object-contain rounded-lg"
                          onError={() => {
                            setProfileData((prev) => ({ ...prev, logo: '' }));
                          }}
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-lg flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, var(--primary-color, #002855) 0%, var(--secondary-color, #004080) 100%)`,
                          }}
                        >
                          <svg
                            viewBox="0 0 40 40"
                            fill="none"
                            className="w-3/4 h-3/4"
                            style={{ color: 'var(--accent-color, #D4AF37)' }}
                          >
                            <path d="M20 3L36 12V24L20 37L4 24V12L20 3Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                            <path d="M20 9L29 15V23L20 31L11 23V15L20 9Z" fill="rgba(255, 255, 255, 0.18)" stroke="white" strokeWidth="1.6" />
                            <circle cx="20" cy="20" r="3.5" fill="currentColor" />
                            <path d="M14 20H26M20 14V26" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="absolute -bottom-2 -right-1">
                      {logoPreviewUrl ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white shadow-xs">
                          PREVIEW
                        </span>
                      ) : hasCustomLogo ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-xs">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-600 text-white shadow-xs">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-slate-800 text-xs">
                      {logoPreviewUrl
                        ? 'New Logo Selected (Preview Mode)'
                        : hasCustomLogo
                        ? 'Custom Corporate Logo Configured'
                        : 'Default Ethiopian Reinsurance Shield Emblem'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {logoFile ? (
                        <span className="font-mono text-slate-700">
                          {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                        </span>
                      ) : hasCustomLogo ? (
                        <span className="text-slate-600">
                          Stored securely in Firebase Storage &amp; cached for immediate access
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          No custom logo uploaded yet. System displays default vector emblem.
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {logoPreviewUrl
                        ? 'Preview ready. Click "Save Logo Now" or "Save Data Configuration" below to apply.'
                        : 'Admin changes take effect immediately across all active pages without reload.'}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="company-logo-file-input"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    disabled={isUploadingLogo || isRemovingLogo}
                  />

                  {isAdmin ? (
                    <>
                      {hasCustomLogo ? (
                        <>
                          {/* Active Change Logo Button */}
                          <button
                            type="button"
                            id="btn-change-logo-profile"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingLogo || isRemovingLogo}
                            className="px-4 py-2 rounded-lg bg-[#002855] text-white font-bold text-xs shadow-xs hover:bg-[#004080] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            title="Replace the company logo"
                          >
                            {isUploadingLogo ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                            ) : (
                              <Upload className="w-4 h-4 text-amber-300" />
                            )}
                            <span>Change Logo</span>
                          </button>

                          {/* Active Remove Logo Button */}
                          <button
                            type="button"
                            id="btn-remove-logo-profile"
                            onClick={handleOpenRemoveDialog}
                            disabled={isRemovingLogo || isUploadingLogo}
                            className="px-3.5 py-2 rounded-lg text-rose-700 bg-rose-50 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Remove company logo and restore default"
                          >
                            {isRemovingLogo ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>Remove Logo</span>
                          </button>
                        </>
                      ) : (
                        /* Upload Logo Button when no custom logo is uploaded */
                        <button
                          type="button"
                          id="btn-upload-logo-profile"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="px-4 py-2 rounded-lg bg-[#002855] text-white font-bold text-xs shadow-xs hover:bg-[#004080] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                          ) : (
                            <Upload className="w-4 h-4 text-amber-300" />
                          )}
                          <span>Upload Logo</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium italic bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      Logo management is restricted to Administrators
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={profileData.legalName ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, legalName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Display Name</label>
                <input
                  type="text"
                  required
                  value={profileData.displayName ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Short Name / Acronym</label>
                <input
                  type="text"
                  required
                  value={profileData.shortName ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, shortName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Industry Sector</label>
                <input
                  type="text"
                  value={profileData.industry ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">National Bank License Number</label>
                <input
                  type="text"
                  value={profileData.registrationNumber ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, registrationNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Identification Number (TIN)</label>
                <input
                  type="text"
                  value={profileData.taxId ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, taxId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={profileData.officialEmail ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, officialEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Telephone</label>
                <input
                  type="text"
                  value={profileData.officialPhone ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, officialPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Web Address</label>
                <input
                  type="text"
                  value={profileData.website ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Established Year</label>
                <input
                  type="number"
                  value={profileData.establishedYear ?? 2016}
                  onChange={(e) => setProfileData({ ...profileData, establishedYear: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Head Office Address</label>
                <input
                  type="text"
                  value={profileData.address ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Company Description</label>
                <textarea
                  rows={3}
                  value={profileData.description ?? ''}
                  onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            {isAdmin ? (
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="btn-save-company-profile"
                  disabled={isUploadingLogo || isRemovingLogo}
                  className="px-6 py-2.5 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                >
                  <Save className="w-4 h-4" />
                  <span>Save Data Configuration</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="italic">Viewing data configuration in read-only mode. Only system administrators can update legal entity credentials.</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* SUB-TAB 2: BRANDING & PRIMARY COLOR */}
      {activeSubTab === 'branding' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Brand Identity &amp; Dynamic Theme</h2>
                <p className="text-xs text-slate-500">
                  Update CSS variables in real time. Changes take effect instantly across the layout and headers.
                </p>
              </div>
              {brandingSaved && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Branding saved &amp; applied!</span>
                </div>
              )}
            </div>

            {/* Presets Row */}
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Preset Color Themes
                </span>
                <button
                  type="button"
                  onClick={resetBrandingToDefault}
                  className="text-[11px] font-semibold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restore Official Ethio-Re Colors</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => applyThemePreset('#002855', '#004080', '#D4AF37')}
                  className="p-3 rounded-lg bg-white border border-[#D4AF37] hover:border-[#002855] text-left transition-all cursor-pointer flex items-center gap-3 shadow-xs"
                >
                  <div className="flex -space-x-2">
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#002855' }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#004080' }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#D4AF37' }} />
                  </div>
                  <div>
                    <div className="font-bold text-[#002855] flex items-center gap-1.5">
                      <span>Geometric Balance</span>
                      <span className="text-[9px] px-1 rounded bg-amber-100 text-[#002855] font-black">ACTIVE</span>
                    </div>
                    <div className="text-[10px] text-gray-500">Corporate Navy, Royal Blue &amp; Gold</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => applyThemePreset('#064e3b', '#047857', '#fbbf24')}
                  className="p-3 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 text-left transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="flex -space-x-2">
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#064e3b' }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#047857' }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#fbbf24' }} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Emerald Forest</div>
                    <div className="text-[10px] text-slate-500">Deep Pine &amp; Amber Gold</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => applyThemePreset('#1e1b4b', '#312e81', '#f59e0b')}
                  className="p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 text-left transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="flex -space-x-2">
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#1e1b4b' }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#312e81' }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white shadow-xs" style={{ background: '#f59e0b' }} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Midnight Indigo</div>
                    <div className="text-[10px] text-slate-500">Dark Indigo &amp; Sunburst</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Color Pickers */}
            <form onSubmit={handleSaveBranding} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primary */}
                <div className="p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Primary Color</label>
                    <span className="font-mono text-[11px] text-slate-500">{primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Used for navigation bars, primary CTAs, active cards.</p>
                </div>

                {/* Secondary */}
                <div className="p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Secondary Color</label>
                    <span className="font-mono text-[11px] text-slate-500">{secondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Used for gradients, sub-headers, and borders.</p>
                </div>

                {/* Accent */}
                <div className="p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Accent Color</label>
                    <span className="font-mono text-[11px] text-slate-500">{accentColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Used for active tags, notification badges, and stars.</p>
                </div>
              </div>

              {/* Centralized Company Logo Reference */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm">Company Logo (Centralized Source)</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Data Configuration SOT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      The official corporate logo is managed centrally in <strong>Data Configuration</strong> to guarantee a single global source of truth across all modules.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab('profile')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#002855] text-white font-bold text-xs hover:bg-[#004080] transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Manage Logo in Data Configuration &rarr;</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-slate-200/60">
                  <div className="p-2.5 border border-slate-200 rounded-lg bg-white shadow-2xs">
                    <EthioReLogo size="md" />
                  </div>
                  <div className="text-xs text-slate-600">
                    <div>
                      Current Global Logo:{' '}
                      <strong className="text-slate-800">
                        {companyProfile.logo ? 'Custom Corporate Logo Configured' : 'Default System Vector Shield Emblem'}
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Any updates made in Data Configuration automatically reflect here and across all system pages.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  id="btn-apply-branding"
                  className="px-6 py-2.5 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                >
                  <Save className="w-4 h-4" />
                  <span>Apply Branding Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PUBLIC HOLIDAYS */}
      {activeSubTab === 'holidays' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Configured Ethiopian Public Holidays</h2>
              <p className="text-xs text-slate-500">
                Official statutory public holidays. These dates are automatically excluded during leave day calculations.
              </p>
            </div>
            <button
              id="btn-add-holiday"
              onClick={() => {
                setEditingHoliday(null);
                setHolidayName('');
                setHolidayDate('2026-09-11');
                setHolidayDesc('');
                setIsHolidayModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-xs shadow-xs hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Public Holiday</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3">Holiday Name</th>
                  <th className="px-4 py-3">Date (Gregorian)</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {publicHolidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{h.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{h.date}</td>
                    <td className="px-4 py-3 text-slate-500">{h.description || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingHoliday(h);
                            setHolidayName(h.name);
                            setHolidayDate(h.date);
                            setHolidayDesc(h.description || '');
                            setIsHolidayModalOpen(true);
                          }}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePublicHoliday(h.id)}
                          className="p-1.5 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: STATUTORY LEAVE TYPES */}
      {activeSubTab === 'leavetypes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Statutory Leave Entitlements</h2>
            <p className="text-xs text-slate-500">
              Default allocated days per employment cycle according to Ethiopian Labor Proclamation and Ethio-Re policy.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Allocated Days / Year</th>
                  <th className="px-4 py-3">Compensation</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Adjust Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{lt.name}</td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-900 text-sm">{lt.defaultDays} days</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lt.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lt.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{lt.description}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={180}
                        defaultValue={lt.defaultDays}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            updateLeaveTypeDays(lt.id, val);
                          }
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-right font-mono text-xs focus:bg-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: FIREBASE CLOUD INTEGRATION */}
      {activeSubTab === 'firebase' && (
        <div className="space-y-6">
          {/* Overview & Credentials Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Firebase Cloud SDK Integration</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    SDK Connected
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Production Firebase environment configuration for Ethiopian Reinsurance S.C. HRMS.
                </p>
              </div>

              {/* Real-time Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Project: {firebaseConfig.projectId}</span>
              </div>
            </div>

            {/* Feedback Alert */}
            {firebaseFeedback && (
              <div
                className={`mb-5 p-3.5 rounded-lg text-xs flex items-center gap-2.5 border ${
                  firebaseFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : firebaseFeedback.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">{firebaseFeedback.message}</span>
              </div>
            )}

            {/* Firebase Config Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-6">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Project ID</div>
                <div className="font-mono font-bold text-slate-900 text-sm">{firebaseConfig.projectId}</div>
                <div className="text-[11px] text-slate-500">Target Google Cloud &amp; Firebase project</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Auth Domain</div>
                <div className="font-mono font-bold text-slate-900 text-sm">{firebaseConfig.authDomain}</div>
                <div className="text-[11px] text-slate-500">Authentication &amp; Identity service endpoint</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Storage Bucket</div>
                <div className="font-mono font-bold text-slate-900 text-sm">{firebaseConfig.storageBucket}</div>
                <div className="text-[11px] text-slate-500">Cloud Storage for company assets &amp; employee files</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Web App ID</div>
                <div className="font-mono font-bold text-slate-900 text-xs break-all">
                  {firebaseConfig.appId}
                </div>
                <div className="text-[11px] text-slate-500">SDK Client Application Registration</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Messaging Sender ID</div>
                <div className="font-mono font-bold text-slate-900 text-sm">{firebaseConfig.messagingSenderId}</div>
                <div className="text-[11px] text-slate-500">FCM Push Notification Sender ID</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Deployment Status</div>
                <div className="font-semibold text-emerald-700 text-xs flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rules Deployed &amp; Active</span>
                </div>
                <div className="text-[11px] text-slate-500">Cloud security rules deployed</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <span>Last verified status: </span>
                <span className="font-mono font-semibold text-slate-800">
                  {firebaseStatus?.lastChecked || 'System boot'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(true)}
                  className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all"
                  title="Configure and deploy Firestore security rules"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Firestore Rules {firestoreRulesRequired && '(!)'}</span>
                </button>

                <button
                  type="button"
                  disabled={isTestingFirebase}
                  onClick={async () => {
                    setIsTestingFirebase(true);
                    setFirebaseFeedback(null);
                    try {
                      const res = await refreshFirebaseStatus();
                      setFirebaseFeedback({
                        type: 'success',
                        message: res.message || 'Firebase connection verified successfully.',
                      });
                    } catch (err: any) {
                      setFirebaseFeedback({
                        type: 'error',
                        message: `Connection check notice: ${err?.message || 'Check network'}`,
                      });
                    } finally {
                      setIsTestingFirebase(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin' : ''}`} />
                  <span>{isTestingFirebase ? 'Pinging Firebase...' : 'Test Connection'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncingFirebase}
                  onClick={async () => {
                    setIsSyncingFirebase(true);
                    setFirebaseFeedback(null);
                    try {
                      const res = await syncAllToFirebase();
                      setFirebaseFeedback({
                        type: res.success ? 'success' : 'info',
                        message: res.message,
                      });
                    } catch (err: any) {
                      setFirebaseFeedback({
                        type: 'error',
                        message: `Sync notice: ${err?.message || 'Check configuration'}`,
                      });
                    } finally {
                      setIsSyncingFirebase(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:opacity-90 cursor-pointer transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#002855' }}
                >
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSyncingFirebase ? 'Syncing to Cloud...' : 'Sync HRMS Summary to Firestore'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Firestore Security Rules Card */}
          <div className="bg-white rounded-xl border border-amber-200/80 shadow-2xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Firestore Security Rules Status</h3>
                  {firestoreRulesRequired ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Publication Recommended
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Resilient Mode Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 max-w-2xl">
                  Firestore security rules protect employee, attendance, and leave records in Google Cloud. If the Firebase backend reports missing permissions, you can easily copy and publish the rules in the Firebase Console.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-colors shrink-0"
              >
                <span>View &amp; Deploy Rules</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Database Architecture Blueprint */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Firestore Collections Blueprint</h3>
            <p className="text-xs text-slate-500 mb-4">
              The following collections and intermediate schema entities are configured according to enterprise security standards:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-[#002855] font-mono">/employees/{'{id}'}</div>
                <div className="text-[11px] text-slate-500 mt-1">Employee Directory, Titles &amp; Departmental Affiliation</div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-[#002855] font-mono">/attendance/{'{id}'}</div>
                <div className="text-[11px] text-slate-500 mt-1">Daily Check-ins, Overtime, Absenteeism &amp; Shift Logs</div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-[#002855] font-mono">/leave/{'{id}'}</div>
                <div className="text-[11px] text-slate-500 mt-1">Statutory Entitlements, Annual &amp; Medical Leaves</div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-[#002855] font-mono">/departments/{'{id}'}</div>
                <div className="text-[11px] text-slate-500 mt-1">Organizational Structure, Codes &amp; Department Heads</div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-[#002855] font-mono">/activity_logs/{'{id}'}</div>
                <div className="text-[11px] text-slate-500 mt-1">Immutable Audit Trail for Executive Operations</div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-[#002855] font-mono">/settings/{'{id}'}</div>
                <div className="text-[11px] text-slate-500 mt-1">Data Configuration, Corporate Branding &amp; Policy Rules</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-200 text-white"
              style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
            >
              <h3 className="text-base font-bold">
                {editingHoliday ? 'Edit Public Holiday' : 'Add Public Holiday'}
              </h3>
            </div>

            <form onSubmit={handleSaveHoliday} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g. Enkutatash (Ethiopian New Year)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Date</label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  placeholder="Official observance notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-white font-bold shadow-xs hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--primary-color, #0B2A5E)' }}
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Logo Confirmation Modal Dialog */}
      {isConfirmRemoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-logo-dialog-title"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 id="remove-logo-dialog-title" className="text-base font-bold text-slate-900">
                    Are you sure you want to remove the company logo?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This will delete the custom uploaded company logo and remove its reference from Data Configuration. The entire HRMS, including navigation, dashboards, employee master data, leave and attendance modules, and reports, will immediately fall back to the default company logo.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                id="btn-cancel-remove-logo"
                onClick={() => setIsConfirmRemoveOpen(false)}
                disabled={isRemovingLogo}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-remove-logo"
                onClick={handleConfirmRemoveLogo}
                disabled={isRemovingLogo}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRemovingLogo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Logo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
