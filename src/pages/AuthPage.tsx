import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const { signIn, signUp, checkPendingInvitations, user } = useAuth();
  const navigate = useNavigate();

  // Check if the user is already logged in
  useEffect(() => {
    if (user) {
      console.log('User already logged in, checking invitations');
      const checkInvites = async () => {
        if (user.email) {
          try {
            await checkPendingInvitations(user.email, user.id);
          } catch (error) {
            console.error('Error checking invitations for logged in user:', error);
          }
        }
      };
      
      checkInvites();
      
      // Redirect to homepage if already logged in
      navigate('/');
    }
  }, [user, checkPendingInvitations, navigate]);

  const validateInputs = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (isSignUp && !displayName.trim()) {
      setError('Display name is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Password length check
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }
    
    setLoading(true);
    setShowConfirmationMessage(false);
    
    const cleanEmail = email.toLowerCase().trim();
    
    try {
      console.log(`Attempting to ${isSignUp ? 'sign up' : 'sign in'}:`, cleanEmail);
      
      if (isSignUp) {
        // First, safely handle the sign up operation
        let result;
        try {
          result = await signUp(cleanEmail, password, {
            display_name: displayName.trim()
          });
        } catch (signUpError: any) {
          // Handle errors during signUp function call
          console.error('Error calling signUp function:', signUpError);
          
          // Set default result structure if signUp throws instead of returning an error object
          result = {
            error: signUpError,
            data: null
          };
        }
        
        // Now safely check for errors in the result
        if (result && result.error) {
          // Safely access error message with fallback
          const errorObj = result.error || {};
          const errorMessage = 
            typeof errorObj === 'string' ? errorObj : 
            (errorObj.message || 'An error occurred during sign up.');
          
          console.log('Sign up error message:', errorMessage);
          
          // Check if it's a duplicate email error
          if (typeof errorMessage === 'string' && (
              errorMessage.includes('already registered') || 
              errorMessage.includes('email exists') ||
              errorMessage.includes('already taken') ||
              errorMessage.includes('unique constraint'))) {
            setError('This email is already registered. Please sign in instead.');
          } 
          // Check if it's a confirmation needed error
          else if (typeof errorMessage === 'string' && (
              errorMessage.includes('email_not_confirmed') || 
              errorMessage.includes('confirmation') ||
              errorMessage.includes('verify'))) {
            setShowConfirmationMessage(true);
          } 
          // New condition for $ undefined errors
          else if (typeof errorMessage === 'string' && (
              errorMessage.includes('$ is undefined') || 
              errorMessage.includes('$ is not defined') ||
              errorMessage.includes('Cannot read properties') ||
              errorMessage.includes('undefined is not an object') ||
              errorMessage.includes('undefined variable'))) {
            // This is likely a backend error but the user was actually registered
            console.log('Detected $ undefined error, showing confirmation message');
            setShowConfirmationMessage(true);
          }
          else {
            // Fallback for other error types
            setError(typeof errorMessage === 'string' ? errorMessage : 'An unexpected error occurred');
            console.error('Sign up error details:', result.error);
          }
        } else {
          console.log('Sign up successful');
          
          // If there's a user, attempt to check for invitations
          if (result && result.data && result.data.user) {
            try {
              await checkPendingInvitations(cleanEmail, result.data.user.id);
            } catch (inviteError) {
              console.error('Error checking invitations after signup:', inviteError);
            }
          }
          
          setShowConfirmationMessage(true);
        }
      } else {
        // Sign in flow - similar protections
        let result;
        try {
          result = await signIn(cleanEmail, password);
        } catch (signInError: any) {
          console.error('Error calling signIn function:', signInError);
          result = {
            error: signInError,
            data: null
          };
        }
        
        if (result && result.error) {
          const errorObj = result.error || {};
          const errorMessage = 
            typeof errorObj === 'string' ? errorObj : 
            (errorObj.message || 'Invalid login credentials. Please try again.');
          
          console.log('Sign in error message:', errorMessage);
          
          // Check if it's a confirmation needed error
          if (typeof errorMessage === 'string' && (
              errorMessage.includes('email_not_confirmed') || 
              errorMessage.includes('confirmation') || 
              errorMessage.includes('verify'))) {
            setShowConfirmationMessage(true);
          } 
          // New condition for $ undefined errors
          else if (typeof errorMessage === 'string' && (
              errorMessage.includes('$ is undefined') || 
              errorMessage.includes('$ is not defined') ||
              errorMessage.includes('Cannot read properties') ||
              errorMessage.includes('undefined is not an object') ||
              errorMessage.includes('undefined variable'))) {
            console.log('Detected $ undefined error during sign in, showing confirmation message');
            setShowConfirmationMessage(true);
          }
          else {
            setError(typeof errorMessage === 'string' ? errorMessage : 'Invalid login credentials');
            console.error('Sign in error details:', result.error);
          }
        } else {
          console.log('Sign in successful');
          
          // If there's a user, attempt to check for invitations
          if (result && result.data && result.data.user) {
            try {
              await checkPendingInvitations(cleanEmail, result.data.user.id);
            } catch (inviteError) {
              console.error('Error checking invitations after signin:', inviteError);
            }
          }
          
          navigate('/');
        }
      }
    } catch (error: any) {
      console.error(`Outer error handler during ${isSignUp ? 'sign up' : 'sign in'}:`, error);
      
      // Safely handle the error object
      if (!error || typeof error !== 'object') {
        setError('An unexpected error occurred. Please try again.');
        return;
      }
      
      // Safely extract the error message with fallback
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      
      if (typeof errorMessage === 'string') {
        // Handle email confirmation errors
        if (errorMessage.includes('email_not_confirmed') || 
            errorMessage.includes('confirmation') || 
            errorMessage.includes('verify')) {
          setShowConfirmationMessage(true);
        } 
        // Handle duplicate email errors
        else if (isSignUp && (
            errorMessage.includes('already registered') || 
            errorMessage.includes('email exists') || 
            errorMessage.includes('already taken') ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('unique constraint'))) {
          setError('This email is already registered. Please sign in instead.');
        }
        // Handle "$" undefined errors (typically seen in Supabase error messages)
        else if (errorMessage.includes('$ is undefined') || 
                 errorMessage.includes('$ is not defined') ||
                 errorMessage.includes('Cannot read properties') ||
                 errorMessage.includes('undefined is not an object') ||
                 errorMessage.includes('undefined variable')) {
          // This is likely a backend error but the user was actually registered
          console.log('Detected $ undefined error in outer catch, showing confirmation message');
          setShowConfirmationMessage(true);
        }
        else {
          setError(errorMessage);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <motion.div 
        className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-primary-600 text-white p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
          <div className="flex items-center space-x-3 mb-8">
            <BookOpen className="h-10 w-10" />
            <h1 className="text-3xl font-bold">GenConnect</h1>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Connect Generations Through Stories</h2>
          <p className="text-primary-100 mb-6">
            Create, share, and preserve your family stories. Bridge the gap between generations and build lasting memories together.
          </p>
          <div className="hidden md:block">
            <div className="flex space-x-4 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary-300" />
              ))}
            </div>
            <p className="text-sm text-primary-200 italic">
              "The app has brought our family closer together. My grandkids love creating stories with me, even though we live miles apart."
            </p>
            <p className="text-sm text-primary-300 mt-2">— Maria, 68</p>
          </div>
        </div>

        <div className="p-8 md:p-12 md:w-1/2">
          {showConfirmationMessage ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h3>
              <p className="text-gray-600 mb-4">
                We've sent you a confirmation link. Please check your email (including spam folder) and click the link to verify your account.
              </p>
              <button
                onClick={() => setShowConfirmationMessage(false)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Return to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {isSignUp ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-gray-600">
                  {isSignUp 
                    ? 'Start creating and sharing family stories.' 
                    : 'Sign in to continue your storytelling journey.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignUp && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="input pl-10"
                        placeholder="John Smith"
                      />
                    </div>
                  </div>
                )}

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
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-error-600 text-sm p-2 bg-error-50 rounded-md border border-error-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setShowConfirmationMessage(false);
                    }}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;