// src/utils/storyCleanup.ts

import { supabase } from '../lib/supabase';

/**
 * Utility to help diagnose and fix story deletion issues
 */
export const StoryCleanupUtil = {
  /**
   * Check if a story exists in the database
   */
  async checkStoryExists(storyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id')
        .eq('id', storyId)
        .maybeSingle();
        
      if (error) {
        console.error("Error checking story existence:", error);
        return false;
      }
      
      return !!data;
    } catch (err) {
      console.error("Exception checking story existence:", err);
      return false;
    }
  },
  
  /**
   * Find all related records for a story
   */
  async findRelatedRecords(storyId: string): Promise<Record<string, number>> {
    const relatedTables = [
      'story_media',
      'story_collaborators',
      'story_comments',
      'story_likes',
      'story_views',
      'story_tags'
    ];
    
    const results: Record<string, number> = {};
    
    for (const table of relatedTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .eq('story_id', storyId);
          
        if (error) {
          if (error.code === 'PGRST116') { // "relation does not exist"
            results[table] = -1; // Mark as non-existent table
          } else {
            console.error(`Error checking ${table}:`, error);
            results[table] = -2; // Mark as error
          }
        } else {
          results[table] = data ? data.length : 0;
        }
      } catch (err) {
        console.error(`Exception checking ${table}:`, err);
        results[table] = -2; // Mark as error
      }
    }
    
    return results;
  },
  
  /**
   * Force delete all related records and the story itself
   */
  async forceDelete(storyId: string): Promise<{success: boolean, errors: string[]}> {
    const errors: string[] = [];
    
    // 1. Check if story exists
    const exists = await this.checkStoryExists(storyId);
    if (!exists) {
      return { success: false, errors: ["Story does not exist"] };
    }
    
    // 2. Get related records
    const relatedRecords = await this.findRelatedRecords(storyId);
    console.log("Related records:", relatedRecords);
    
    // 3. Delete related records
    const relatedTables = Object.keys(relatedRecords).filter(
      table => relatedRecords[table] > 0
    );
    
    for (const table of relatedTables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('story_id', storyId);
          
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          errors.push(`Failed to delete from ${table}: ${error.message}`);
        }
      } catch (err: any) {
        console.error(`Exception deleting from ${table}:`, err);
        errors.push(`Exception deleting from ${table}: ${err.message}`);
      }
    }
    
    // 4. Delete the story
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);
        
      if (error) {
        console.error("Error deleting story:", error);
        errors.push(`Failed to delete story: ${error.message}`);
        return { success: false, errors };
      }
    } catch (err: any) {
      console.error("Exception deleting story:", err);
      errors.push(`Exception deleting story: ${err.message}`);
      return { success: false, errors };
    }
    
    // 5. Verify deletion
    const stillExists = await this.checkStoryExists(storyId);
    if (stillExists) {
      errors.push("Story still exists after deletion attempt");
      return { success: false, errors };
    }
    
    return { 
      success: true, 
      errors: errors.length > 0 ? errors : [] 
    };
  },
  
  /**
   * List all stories for a specific user
   */
  async listUserStories(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, created_at, updated_at, is_published')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error("Error listing user stories:", error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error("Exception listing user stories:", err);
      return [];
    }
  },
  
  /**
   * Refresh story list in UI by forcing a re-fetch
   */
  refreshStoryList() {
    // Dispatch a custom event that your components can listen for
    window.dispatchEvent(new CustomEvent('stories-changed'));
    
    // Or, if using React context for state management:
    // yourStoryContext.refreshStories();
  }
};

// Example of how to use this utility
/*
// In a component or admin page:
import { StoryCleanupUtil } from '../utils/storyCleanup';

// Check if a story exists
const exists = await StoryCleanupUtil.checkStoryExists('story-id-here');
console.log("Story exists:", exists);

// Find related records
const related = await StoryCleanupUtil.findRelatedRecords('story-id-here');
console.log("Related records:", related);

// Force delete a problematic story
const { success, errors } = await StoryCleanupUtil.forceDelete('story-id-here');
if (success) {
  console.log("Story deleted successfully");
} else {
  console.error("Failed to delete story:", errors);
}

// List all stories for current user
const userStories = await StoryCleanupUtil.listUserStories(user.id);
console.log("User stories:", userStories);
*/