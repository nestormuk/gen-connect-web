import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Save, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase'; // This is your existing import

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  birth_year: number | null;
  preferences: {
    font_size: 'normal' | 'large' | 'x-large';
    high_contrast: boolean;
    text_to_speech: boolean;
  } | null;
  updated_at: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'x-large'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    async function fetchProfile() {
      try {
        setLoading(true);
        
        // Fetch the user profile from Supabase
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          throw error;
        }
        
        if (data) {
          setProfile(data as UserProfile);
          setDisplayName(data.display_name);
          setBio(data.bio || '');
          setBirthYear(data.birth_year || '');
          setAvatarUrl(data.avatar_url);
          
          // Set preferences if they exist
          if (data.preferences) {
            setFontSize(data.preferences.font_size || 'normal');
            setHighContrast(data.preferences.high_contrast || false);
            setTextToSpeech(data.preferences.text_to_speech || false);
          }
        } else {
          // If no profile exists, we'll create one when the user saves
          setDisplayName(user.email?.split('@')[0] || 'User');
        }
      } catch (err) {
        console.error('Error in fetchProfile:', err);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const updatedProfile = {
        user_id: user.id,
        display_name: displayName,
        bio,
        birth_year: typeof birthYear === 'number' ? birthYear : null,
        preferences: {
          font_size: fontSize,
          high_contrast: highContrast,
          text_to_speech: textToSpeech
        },
        avatar_url: avatarUrl
      };
      
      let result;
      
      if (profile?.id) {
        // Update existing profile
        result = await supabase
          .from('user_profiles')
          .update(updatedProfile)
          .eq('id', profile.id);
      } else {
        // Insert new profile
        result = await supabase
          .from('user_profiles')
          .insert([updatedProfile]);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Refresh profile data
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setProfile(data as UserProfile);
      alert('Profile updated successfully!');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // First, check if the bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      
      const bucketExists = buckets?.some(bucket => bucket.name === 'avatars');
      
      if (!bucketExists) {
        console.log('Bucket does not exist, attempting to create it');
        // Try to create the bucket if it doesn't exist
        const { error: createBucketError } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2 // 2MB
        });
        
        if (createBucketError) {
          console.error('Error creating bucket:', createBucketError);
          setUploadError('Could not create storage bucket. Please contact support.');
          return;
        }
      }
      
      // Upload the file to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')  // Use 'avatars' bucket
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update the avatar URL state
      if (urlData?.publicUrl) {
        setAvatarUrl(urlData.publicUrl);
        console.log('Avatar URL set to:', urlData.publicUrl);
      } else {
        throw new Error('Failed to get public URL for uploaded file');
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setUploadError(err.message || 'Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Profile</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {uploadError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {uploadError}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Information</h2>
          
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="md:w-1/3 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 mb-3 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} />
                )}
              </div>
              <label htmlFor="avatar-upload" className={`cursor-pointer btn-outline text-sm flex items-center ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600 mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-1" />
                    Upload Photo
                  </>
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            
            <div className="md:w-2/3 space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    className="input pl-10 bg-gray-50"
                    disabled
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="birthYear" className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Year
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="birthYear"
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value ? parseInt(e.target.value) : '')}
                    className="input pl-10"
                    placeholder="Optional"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input min-h-[100px]"
              placeholder="Tell us a little about yourself..."
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Accessibility Preferences</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-1">
                Font Size
              </label>
              <select
                id="fontSize"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'normal' | 'large' | 'x-large')}
                className="input"
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="x-large">Extra Large</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                id="highContrast"
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="highContrast" className="ml-2 block text-sm text-gray-700">
                Enable High Contrast Mode
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="textToSpeech"
                type="checkbox"
                checked={textToSpeech}
                onChange={(e) => setTextToSpeech(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="textToSpeech" className="ml-2 block text-sm text-gray-700">
                Enable Text-to-Speech (Read stories aloud)
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;