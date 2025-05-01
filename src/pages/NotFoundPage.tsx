import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Home } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
            <BookOpen size={48} />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Page Not Found</h1>
        
        <p className="text-gray-600 mb-8">
          We couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
          <Link 
            to="/" 
            className="btn-primary flex items-center justify-center"
          >
            <Home size={18} className="mr-2" />
            Go Home
          </Link>
          
          <Link 
            to="/stories" 
            className="btn-outline flex items-center justify-center"
          >
            <BookOpen size={18} className="mr-2" />
            View Stories
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;