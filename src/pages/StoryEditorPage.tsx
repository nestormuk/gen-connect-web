import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Image, Mic, Sparkles, UserPlus, ChevronLeft, Trash2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { generateStoryContent } from '../lib/openai';
import { supabase } from '../lib/supabase';

interface StoryData {
  id?: string;
  title: string;
  content: any;
  cover_image: string | null;
  family_id?: string;
}

const StoryEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [storyData, setStoryData] = useState<StoryData>({
    title: '',
    content: {
      blocks: []
    },
    cover_image: null
  });
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserFamily = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching family:', error);
        return;
      }

      if (data) {
        setFamilyId(data.family_id);
      }
    };

    fetchUserFamily();
  }, [user]);

  useEffect(() => {
    const fetchStory = async () => {
      if (!isEditing || !id) return;

      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching story:', error);
        navigate('/stories');
        return;
      }

      if (data) {
        setStoryData(data);
      }
      setLoading(false);
    };

    fetchStory();
  }, [id, isEditing, navigate]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStoryData(prev => ({ ...prev, title: e.target.value }));
  };

  const handleBlockContentChange = (blockId: string, content: string) => {
    setStoryData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        blocks: prev.content.blocks.map((block: any) => 
          block.id === blockId ? { ...block, content } : block
        )
      }
    }));
  };

  const addTextBlock = () => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type: 'text',
      content: ''
    };
    
    setStoryData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        blocks: [...prev.content.blocks, newBlock]
      }
    }));
  };

  const removeBlock = (blockId: string) => {
    setStoryData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        blocks: prev.content.blocks.filter((block: any) => block.id !== blockId)
      }
    }));
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPrompt.trim()) return;
    
    setAiGenerating(true);
    try {
      const generatedContent = await generateStoryContent(currentPrompt, {
        storyLength: 'short',
        ageGroup: 'all-ages'
      });
      
      if (generatedContent) {
        const newBlock = {
          id: `block-${Date.now()}`,
          type: 'text',
          content: generatedContent
        };
        
        setStoryData(prev => ({
          ...prev,
          content: {
            ...prev.content,
            blocks: [...prev.content.blocks, newBlock]
          }
        }));
        
        setShowAiDialog(false);
        setCurrentPrompt('');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!storyData.title.trim()) {
      alert('Please add a title for your story.');
      return;
    }

    if (!familyId) {
      alert('Please join or create a family group first.');
      return;
    }
    
    setSaving(true);
    try {
      const storyToSave = {
        title: storyData.title,
        content: storyData.content,
        cover_image: storyData.cover_image,
        family_id: familyId,
        created_by: user?.id,
        is_published: true
      };

      let result;
      if (isEditing && id) {
        result = await supabase
          .from('stories')
          .update(storyToSave)
          .eq('id', id);
      } else {
        result = await supabase
          .from('stories')
          .insert([storyToSave]);
      }

      if (result.error) {
        throw result.error;
      }

      navigate('/stories');
    } catch (error) {
      console.error('Error saving story:', error);
      alert('Failed to save story. Please try again.');
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="ml-2">{isEditing ? 'Edit Story' : 'Create New Story'}</h1>
      </div>

      <div className="space-y-6">
        <div className="relative">
          {storyData.cover_image ? (
            <div className="aspect-[3/1] rounded-xl overflow-hidden relative">
              <img 
                src={storyData.cover_image} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <button className="p-2 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all">
                  <Image size={20} className="text-gray-700" />
                </button>
                <button className="p-2 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all">
                  <Trash2 size={20} className="text-error-600" />
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-[3/1] rounded-xl bg-gray-100 flex items-center justify-center">
              <button className="btn-outline flex items-center">
                <Image size={18} className="mr-2" />
                Add Cover Image
              </button>
            </div>
          )}
        </div>

        <div>
          <TextareaAutosize
            placeholder="Story Title"
            value={storyData.title}
            onChange={handleTitleChange}
            className="w-full text-3xl font-bold border-0 focus:outline-none focus:ring-0 resize-none placeholder-gray-400"
          />
        </div>

        <div className="space-y-8">
          {storyData.content.blocks.map((block: any, index: number) => (
            <motion.div 
              key={block.id}
              className="group relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {block.type === 'text' && (
                <div className="relative">
                  <TextareaAutosize
                    placeholder="Start writing your story..."
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    className="w-full text-lg border-0 focus:outline-none focus:ring-0 resize-none"
                  />
                  <button 
                    onClick={() => removeBlock(block.id)}
                    className="absolute -left-10 top-1 p-2 rounded-full opacity-0 group-hover:opacity-100 text-gray-400 hover:text-error-600 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {storyData.content.blocks.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Start Your Story</h3>
              <p className="text-gray-500 mb-4">
                Begin writing or use AI to help generate content.
              </p>
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={addTextBlock}
                  className="btn-outline"
                >
                  Start Writing
                </button>
                <button 
                  onClick={() => setShowAiDialog(true)}
                  className="btn-primary flex items-center"
                >
                  <Sparkles size={18} className="mr-2" />
                  AI Assistance
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="space-x-2">
            <button 
              onClick={addTextBlock}
              className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Add Text
            </button>
            <button className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Image size={18} className="mr-2" />
              Add Image
            </button>
            <button className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Mic size={18} className="mr-2" />
              Add Voice
            </button>
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => setShowAiDialog(true)}
              className="btn bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100"
            >
              <Sparkles size={18} className="mr-2" />
              AI Help
            </button>
            <button
              onClick={handleSave}
              disabled={saving} 
              className="btn-primary"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Story
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Dialog */}
      {showAiDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Sparkles size={20} className="mr-2 text-primary-500" />
              AI Story Assistant
            </h3>
            <form onSubmit={handleAiGenerate}>
              <p className="text-gray-600 mb-4">
                Describe what you want the AI to write about. Be as specific as possible.
              </p>
              <textarea
                className="input min-h-[100px]"
                placeholder="E.g., Write a story about my grandma's famous apple pie recipe and how she taught me to make it."
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                required
              />
              <div className="flex justify-end mt-4 space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAiDialog(false)}
                  className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiGenerating || !currentPrompt.trim()}
                  className="btn-primary"
                >
                  {aiGenerating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Sparkles size={18} className="mr-2" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StoryEditorPage;