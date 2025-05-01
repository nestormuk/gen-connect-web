import React from 'react';
import { BookOpen, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary-700" />
            <span className="text-lg font-bold text-primary-700">GenConnect</span>
          </div>

          <div className="flex items-center space-x-1 text-gray-500 text-sm">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-accent-500 fill-accent-500" />
            <span>for families everywhere</span>
          </div>

          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-gray-600 hover:text-primary-700">About</a>
            <a href="#" className="text-gray-600 hover:text-primary-700">Privacy</a>
            <a href="#" className="text-gray-600 hover:text-primary-700">Terms</a>
            <a href="#" className="text-gray-600 hover:text-primary-700">Help</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;