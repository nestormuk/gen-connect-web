import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Save, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  birth_year: number | null;
  accessibility_preferences: {
    font_size: 'normal' | 'large' | 'x-large';
    high_contrast: boolean;
    text_to_speech: boolean;
  };
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'x-large'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [textToSpeech, setTextToSpeech] = useState(false);

  useEffect(() => {
    // In a real app, we would fetch the user profile from Supabase
    // For demo purposes, let's simulate fetching a user profile
    setTimeout(() => {
      const demoProfile: UserProfile = {
        id: '1',
        display_name: user?.email?.split('@')[0] || 'User',
        email: user?.email || 'user@example.com',
        avatar_url: null,
        bio: 'I love sharing family stories with my grandchildren.',
        birth_year: 1955,
        accessibility_preferences: {
          font_size: 'normal',
          high_contrast: false,
          text_to_speech: true
        }
      };
      
      setProfile(demoProfile);
      setDisplayName(demoProfile.display_name);
      setBio(demoProfile.bio || '');
      setBirthYear(demoProfile.birth_year || '');
      setFontSize(demoProfile.accessibility_preferences.font_size);
      setHighContrast(demoProfile.accessibility_preferences.high_contrast);
      setTextToSpeech(demoProfile.accessibility_preferences.text_to_speech);
      
      setLoading(false);
    }, 800);
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // In a real app, we would update the profile in Supabase
    // For demo purposes, let's simulate updating the profile
    setTimeout(() => {
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          display_name: displayName,
          bio,
          birth_year: typeof birthYear === 'number' ? birthYear : null,
          accessibility_preferences: {
            font_size: fontSize,
            high_contrast: highContrast,
            text_to_speech: textToSpeech
          }
        };
      });
      setSaving(false);
      alert('Profile updated successfully!');
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Profile</h1>

      <form onSubmit={handleSaveProfile} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Information</h2>
          
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="md:w-1/3 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 mb-3 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} />
                )}
              </div>
              <button type="button" className="btn-outline text-sm flex items-center">
                <Upload size={16} className="mr-1" />
                Upload Photo
              </button>
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
                    value={profile?.email || ''}
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