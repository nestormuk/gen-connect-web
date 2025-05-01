import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, BookOpen, Users, Sparkles, Mic, Camera, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const FeatureCard: React.FC<{ 
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => {
  return (
    <motion.div 
      className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="rounded-full bg-primary-100 w-12 h-12 flex items-center justify-center text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.email?.split('@')[0] || 'there';

  const features = [
    {
      icon: <BookOpen size={24} />,
      title: "Create Stories Together",
      description: "Work with family members across generations to create beautiful, meaningful stories."
    },
    {
      icon: <Sparkles size={24} />,
      title: "AI-Powered Creativity",
      description: "Let our AI help you craft engaging stories with beautiful illustrations and animations."
    },
    {
      icon: <Mic size={24} />,
      title: "Voice Recordings",
      description: "Capture the authentic voices of family members to bring your stories to life."
    },
    {
      icon: <Camera size={24} />,
      title: "Photo Integration",
      description: "Add family photos to your stories to create a rich, visual family history."
    },
    {
      icon: <Users size={24} />,
      title: "Family Groups",
      description: "Create secure family groups where only invited members can access your stories."
    },
    {
      icon: <Share2 size={24} />,
      title: "Easy Sharing",
      description: "Share your stories with family members near and far with just a few clicks."
    }
  ];

  return (
    <div className="space-y-8">
      <motion.section 
        className="bg-gradient-to-br from-primary-100 to-secondary-50 rounded-2xl p-8 md:p-12 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-800 mb-4">
            Welcome back, {firstName}!
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-8">
            Connect with your family through the power of storytelling. Create, share, and preserve your family's unique stories for generations to come.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link 
              to="/stories/new" 
              className="btn-primary flex items-center justify-center space-x-2"
            >
              <PlusCircle size={20} />
              <span>Create New Story</span>
            </Link>
            <Link 
              to="/stories" 
              className="btn-outline flex items-center justify-center space-x-2"
            >
              <BookOpen size={20} />
              <span>Browse Stories</span>
            </Link>
          </div>
        </div>
      </motion.section>

      <section className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">What You Can Do</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>
      </section>

      <motion.section 
        className="bg-accent-50 rounded-2xl p-8 border border-accent-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0 md:mr-8">
            <h2 className="text-2xl font-bold text-accent-800 mb-2">Ready to Start a New Story?</h2>
            <p className="text-accent-700">
              Create a story from scratch or let our AI help you get started with creative suggestions.
            </p>
          </div>
          <Link 
            to="/stories/new" 
            className="btn bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-400 flex items-center space-x-2"
          >
            <PlusCircle size={20} />
            <span>Start Creating</span>
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;