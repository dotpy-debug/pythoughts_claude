import { useState, useEffect, useCallback } from 'react';
import { Terminal, Plus, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ReadingList } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/input';

type AddToReadingListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
};

export function AddToReadingListModal({ isOpen, onClose, postId }: AddToReadingListModalProps) {
  const { user } = useAuth();
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [addedLists, setAddedLists] = useState<Set<string>>(new Set());

  const loadReadingLists = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user's reading lists
      const { data: lists, error: listsError } = await supabase
        .from('reading_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Check which lists already contain this post
      const { data: existingItems, error: itemsError } = await supabase
        .from('reading_list_items')
        .select('reading_list_id')
        .eq('post_id', postId);

      if (itemsError) throw itemsError;

      const existingListIds = new Set(existingItems?.map((item) => item.reading_list_id) || []);

      setReadingLists(lists || []);
      setAddedLists(existingListIds);
    } catch (error) {
      console.error('Error loading reading lists:', error);
    } finally {
      setLoading(false);
    }
  }, [user, postId]);

  useEffect(() => {
    if (isOpen && user) {
      loadReadingLists();
    }
  }, [isOpen, user, loadReadingLists]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newListName.trim()) return;

    setSaving(true);
    try {
      const { data: newList, error } = await supabase
        .from('reading_lists')
        .insert({
          user_id: user.id,
          name: newListName.trim(),
          description: newListDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add post to the new list
      await supabase.from('reading_list_items').insert({
        reading_list_id: newList.id,
        post_id: postId,
      });

      setReadingLists([newList, ...readingLists]);
      setAddedLists(new Set([...addedLists, newList.id]));
      setNewListName('');
      setNewListDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating reading list:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleList = async (listId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      const isAdded = addedLists.has(listId);

      if (isAdded) {
        // Remove from list
        await supabase
          .from('reading_list_items')
          .delete()
          .eq('reading_list_id', listId)
          .eq('post_id', postId);

        setAddedLists((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
      } else {
        // Add to list
        await supabase.from('reading_list_items').insert({
          reading_list_id: listId,
          post_id: postId,
        });

        setAddedLists((prev) => new Set([...prev, listId]));
      }
    } catch (error) {
      console.error('Error toggling reading list:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-slide-up">
        {/* Terminal Window Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer" onClick={onClose} />
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer" />
          </div>
          <div className="flex items-center space-x-2">
            <Terminal size={14} className="text-gray-500" />
            <span className="text-gray-100 font-mono text-sm">reading_lists.sh</span>
          </div>
          <div className="w-14" />
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-60px)]">
          <h2 className="text-xl font-bold text-gray-100 mb-4 font-mono">
            $ Save to Reading List
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-terminal-green" size={32} />
            </div>
          ) : (
            <>
              {/* Create New List Button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full mb-4 px-4 py-3 bg-gray-800 border border-dashed border-gray-600 rounded hover:border-terminal-green transition-colors flex items-center justify-center space-x-2 text-gray-400 hover:text-terminal-green font-mono"
                >
                  <Plus size={16} />
                  <span>Create New Reading List</span>
                </button>
              )}

              {/* Create List Form */}
              {showCreateForm && (
                <form onSubmit={handleCreateList} className="mb-4 p-4 bg-gray-800 border border-gray-700 rounded space-y-3">
                  <Input
                    label="List Name"
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Must Read Later"
                    required
                    autoFocus
                  />
                  <div>
                    <label className="block text-sm font-mono text-gray-300 mb-1.5">
                      <span className="text-terminal-green">$ </span>Description (optional)
                    </label>
                    <textarea
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      placeholder="What's this list about?"
                      rows={2}
                      className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-900 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono resize-none placeholder:text-gray-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="submit"
                      variant="terminal"
                      disabled={saving || !newListName.trim()}
                      loading={saving}
                      className="flex-1"
                    >
                      Create & Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewListName('');
                        setNewListDescription('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Existing Lists */}
              {readingLists.length === 0 ? (
                <p className="text-center text-gray-500 py-8 font-mono text-sm">
                  No reading lists yet. Create one to get started!
                </p>
              ) : (
                <div className="space-y-2">
                  {readingLists.map((list) => {
                    const isAdded = addedLists.has(list.id);
                    return (
                      <button
                        key={list.id}
                        onClick={() => handleToggleList(list.id)}
                        disabled={saving}
                        className={`w-full px-4 py-3 rounded border transition-all text-left disabled:opacity-50 ${
                          isAdded
                            ? 'border-terminal-purple bg-terminal-purple/20 text-terminal-purple'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-mono font-semibold text-sm flex items-center space-x-2">
                              <span>{list.name}</span>
                              {isAdded && <Check size={14} />}
                            </div>
                            {list.description && (
                              <p className="text-xs text-gray-500 mt-1 font-mono">
                                {list.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div className="mt-6 pt-4 border-t border-gray-700">
            <Button onClick={onClose} variant="ghost" className="w-full">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
