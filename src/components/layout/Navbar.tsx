import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Menu, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button 
              className="p-2 rounded-md text-gray-500 md:hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={onMenuClick}
            >
              <Menu size={24} />
            </button>
            
            <Link to="/" className="flex items-center">
              <motion.div 
                className="flex items-center space-x-2 text-primary-700"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <BookOpen className="h-8 w-8" />
                <span className="text-xl font-bold">GenConnect</span>
              </motion.div>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <Bell size={20} />
            </button>
            
            <div className="relative">
              <button 
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                  <User size={18} />
                </div>
                <span className="hidden md:block font-medium text-gray-700">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
              </button>
              
              {showUserMenu && (
                <motion.div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Link 
                    to="/profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Your Profile
                  </Link>
                  <button 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={handleSignOut}
                  >
                    <div className="flex items-center space-x-2">
                      <LogOut size={16} />
                      <span>Sign out</span>
                    </div>
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;