import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Lock, Globe, Trash2, Edit, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ReadingList } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function ReadingListsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadReadingLists();
    }
  }, [user]);

  const loadReadingLists = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reading_lists')
        .select(`
          *,
          items:reading_list_items(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReadingLists(data || []);
    } catch (error) {
      console.error('Error loading reading lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newListName.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('reading_lists')
        .insert({
          user_id: user.id,
          name: newListName.trim(),
          description: newListDescription.trim() || null,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error) throw error;

      setReadingLists([data, ...readingLists]);
      setNewListName('');
      setNewListDescription('');
      setIsPublic(false);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating reading list:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this reading list? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reading_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      setReadingLists(readingLists.filter((list) => list.id !== listId));
    } catch (error) {
      console.error('Error deleting reading list:', error);
    }
  };

  const getItemCount = (list: ReadingList) => {
    if (list.items && Array.isArray(list.items)) {
      return list.items.length;
    }
    if (list.bookmarks && Array.isArray(list.bookmarks)) {
      return list.bookmarks.length;
    }
    return 0;
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-100 mb-2 font-mono">
            Sign in to view your reading lists
          </h2>
          <p className="text-gray-400 font-mono">
            Create collections to organize your saved posts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 font-mono flex items-center space-x-2">
            <BookOpen size={32} className="text-terminal-purple" />
            <span>$ Reading Lists</span>
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            Organize your saved posts into collections
          </p>
        </div>
        {!showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="terminal"
            className="flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New List</span>
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateList}
          className="mb-8 p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg"
        >
          <h3 className="text-lg font-bold text-gray-100 mb-4 font-mono">
            $ Create New Reading List
          </h3>
          <div className="space-y-4">
            <Input
              label="List Name"
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Weekend Reads"
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
                rows={3}
                className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono resize-none placeholder:text-gray-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-terminal-green focus:ring-terminal-green/20"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-300 font-mono">
                Make this list public
              </label>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-6">
            <Button
              type="submit"
              variant="terminal"
              disabled={creating || !newListName.trim()}
              loading={creating}
              className="flex-1"
            >
              Create List
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreateForm(false);
                setNewListName('');
                setNewListDescription('');
                setIsPublic(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Reading Lists Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      ) : readingLists.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-700 rounded-lg">
          <BookOpen size={48} className="mx-auto text-gray-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-100 mb-2 font-mono">
            No reading lists yet
          </h3>
          <p className="text-gray-400 mb-6 font-mono text-sm">
            Create your first reading list to organize your saved posts
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="terminal"
            className="inline-flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Your First List</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {readingLists.map((list) => (
            <div
              key={list.id}
              className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-purple transition-all cursor-pointer shadow-lg hover:shadow-glow-purple"
              onClick={() => navigate(`/reading-lists/${list.slug || list.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <BookOpen size={20} className="text-terminal-purple" />
                  <h3 className="text-lg font-bold text-gray-100 font-mono">
                    {list.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {list.is_public ? (
                    <Globe size={14} className="text-terminal-green" />
                  ) : (
                    <Lock size={14} className="text-gray-500" />
                  )}
                </div>
              </div>
              {list.description && (
                <p className="text-sm text-gray-400 mb-4 font-mono">
                  {list.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-mono">
                  {getItemCount(list)} {getItemCount(list) === 1 ? 'post' : 'posts'}
                </span>
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/reading-lists/${list.slug || list.id}/edit`)}
                    className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-terminal-blue transition-colors"
                    title="Edit list"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors"
                    title="Delete list"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
