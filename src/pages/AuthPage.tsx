import React, { useState } from 'react';
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
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setShowConfirmationMessage(false);

    try {
      if (isSignUp) {
        await signUp(email, password, {
          display_name: displayName
        });
        setShowConfirmationMessage(true);
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (error: any) {
      if (error.message.includes('email_not_confirmed')) {
        setShowConfirmationMessage(true);
      } else {
        setError(error.message || 'An error occurred. Please try again.');
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
            <h1 className="text-3xl font-bold">Family Tales</h1>
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