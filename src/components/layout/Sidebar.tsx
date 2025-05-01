import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Home, BookOpen, Users, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    { name: 'Stories', path: '/stories', icon: <BookOpen size={20} /> },
    { name: 'Family', path: '/family', icon: <Users size={20} /> },
    { name: 'Settings', path: '/profile', icon: <Settings size={20} /> }
  ];

  // If the sidebar is open on mobile, close it when clicking outside
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={handleOverlayClick}
        />
      )}

      {/* Sidebar for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-30 md:hidden overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary-700">Menu</h2>
              <button 
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isActive 
                        ? 'bg-primary-100 text-primary-700 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  onClick={onClose}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar for desktop */}
      <aside className="hidden md:block w-64 bg-white shadow-sm h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isActive 
                    ? 'bg-primary-100 text-primary-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;