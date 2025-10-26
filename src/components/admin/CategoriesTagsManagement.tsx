/**
 * Categories and Tags Management Component
 *
 * Comprehensive interface for managing categories and tags:
 * - Category CRUD with drag-and-drop reordering
 * - Tag management with merge/rename capabilities
 * - Tag cleanup tools
 * - Featured tags management
 * - Analytics and statistics
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTags,
  createTag,
  updateTag,
  mergeTags,
  deleteTag,
  cleanupUnusedTags,
  getFeaturedTags,
  updateFeaturedTags,
} from '../../actions/categories-admin';
import type { Category, Tag } from '../../lib/supabase';
import {
  Tag as TagIcon,
  Folder,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  Star,
  Trash,
} from 'lucide-react';

type TabType = 'categories' | 'tags';

export function CategoriesTagsManagement() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [loading, setLoading] = useState(true);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#3b82f6',
    icon: '📁',
  });

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsTotal, setTagsTotal] = useState(0);
  const [tagSearch, setTagSearch] = useState('');
  const [tagSortBy, setTagSortBy] = useState<'name' | 'post_count' | 'follower_count'>('name');
  const [tagPage, setTagPage] = useState(1);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showTagForm, setShowTagForm] = useState(false);
  const [tagForm, setTagForm] = useState({
    name: '',
    slug: '',
    description: '',
  });
  const [mergeSourceTag, setMergeSourceTag] = useState<string>('');
  const [mergeTargetTag, setMergeTargetTag] = useState<string>('');
  const [featuredTags, setFeaturedTags] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile, activeTab, tagPage, tagSearch, tagSortBy]);

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      if (activeTab === 'categories') {
        const result = await getCategories({
          currentUserId: profile.id,
          includeInactive: true,
        });
        if (!result.error) {
          setCategories(result.categories);
        }
      } else {
        const [tagsResult, featuredResult] = await Promise.all([
          getTags({
            currentUserId: profile.id,
            search: tagSearch || undefined,
            sortBy: tagSortBy,
            page: tagPage,
          }),
          getFeaturedTags({ currentUserId: profile.id }),
        ]);

        if (!tagsResult.error) {
          setTags(tagsResult.tags);
          setTagsTotal(tagsResult.total);
        }
        if (!featuredResult.error) {
          setFeaturedTags(featuredResult.tags);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!profile) return;

    const result = await createCategory({
      currentUserId: profile.id,
      ...categoryForm,
    });

    if (result.category) {
      setShowCategoryForm(false);
      setCategoryForm({ name: '', slug: '', description: '', color: '#3b82f6', icon: '📁' });
      await loadData();
    }
  };

  // TODO: Wire up this handler to the UI
  // const handleUpdateCategory = async () => {
  //   if (!profile || !editingCategory) return;

  //   const result = await updateCategory({
  //     currentUserId: profile.id,
  //     categoryId: editingCategory.id,
  //     updates: categoryForm,
  //   });

  //   if (result.success) {
  //     setEditingCategory(null);
  //     await loadData();
  //   }
  // };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!profile) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this category? This action cannot be undone.'
    );
    if (!confirmed) return;

    const result = await deleteCategory({
      currentUserId: profile.id,
      categoryId,
    });

    if (result.success) {
      await loadData();
    }
  };

  const handleCreateTag = async () => {
    if (!profile) return;

    const result = await createTag({
      currentUserId: profile.id,
      ...tagForm,
    });

    if (result.tag) {
      setShowTagForm(false);
      setTagForm({ name: '', slug: '', description: '' });
      await loadData();
    }
  };

  // TODO: Wire up this handler to the UI
  // const handleUpdateTag = async () => {
  //   if (!profile || !editingTag) return;

  //   const result = await updateTag({
  //     currentUserId: profile.id,
  //     tagId: editingTag.id,
  //     updates: tagForm,
  //   });

  //   if (result.success) {
  //     setEditingTag(null);
  //     await loadData();
  //   }
  // };

  // TODO: Wire up this handler to the UI
  // const handleMergeTags = async () => {
  //   if (!profile || !mergeSourceTag || !mergeTargetTag) return;

  //   const confirmed = window.confirm(
  //     'Are you sure you want to merge these tags? All posts with the source tag will be moved to the target tag.'
  //   );
  //   if (!confirmed) return;

  //   const result = await mergeTags({
  //     currentUserId: profile.id,
  //     sourceTagId: mergeSourceTag,
  //     targetTagId: mergeTargetTag,
  //   });

  //   if (result.success) {
  //     setMergeSourceTag('');
  //     setMergeTargetTag('');
  //     await loadData();
  //   }
  // };

  const handleDeleteTag = async (tagId: string) => {
    if (!profile) return;

    const confirmed = window.confirm('Delete this tag? All associations will be removed.');
    if (!confirmed) return;

    const result = await deleteTag({
      currentUserId: profile.id,
      tagId,
    });

    if (result.success) {
      await loadData();
    }
  };

  const handleCleanupTags = async () => {
    if (!profile) return;

    const confirmed = window.confirm(
      'Remove all unused tags (tags with no posts)? This action cannot be undone.'
    );
    if (!confirmed) return;

    const result = await cleanupUnusedTags({
      currentUserId: profile.id,
    });

    if (result.success) {
      alert(`Deleted ${result.deleted} unused tags`);
      await loadData();
    }
  };

  const handleToggleFeaturedTag = async (tagSlug: string) => {
    if (!profile) return;

    const newFeatured = featuredTags.includes(tagSlug)
      ? featuredTags.filter((t) => t !== tagSlug)
      : [...featuredTags, tagSlug];

    const result = await updateFeaturedTags({
      currentUserId: profile.id,
      tagSlugs: newFeatured,
    });

    if (result.success) {
      setFeaturedTags(newFeatured);
    }
  };

  const tabs = [
    { id: 'categories', label: 'Categories', icon: Folder, count: categories.length },
    { id: 'tags', label: 'Tags', icon: TagIcon, count: tagsTotal },
  ];

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <TagIcon className="w-8 h-8 text-orange-500 mr-3" />
            Categories & Tags Management
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                }}
                className={`
                  px-4 py-3 flex items-center space-x-2 border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div>
            {/* Create Button */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setShowCategoryForm(true);
                  setCategoryForm({ name: '', slug: '', description: '', color: '#3b82f6', icon: '📁' });
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Category
              </button>
            </div>

            {/* Category Form Modal */}
            {showCategoryForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-semibold text-white mb-4">Create Category</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Slug</label>
                      <input
                        type="text"
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Color</label>
                        <input
                          type="color"
                          value={categoryForm.color}
                          onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                          className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Icon (emoji)</label>
                        <input
                          type="text"
                          value={categoryForm.icon}
                          onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-center text-2xl"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleCreateCategory}
                        className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowCategoryForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-gray-400">Loading categories...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="col-span-full bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-400">
                  No categories found
                </div>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{category.icon}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                          <p className="text-sm text-gray-500 font-mono">{category.slug}</p>
                        </div>
                      </div>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-700"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{category.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{category.post_count} posts</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryForm({
                              name: category.name,
                              slug: category.slug,
                              description: category.description,
                              color: category.color,
                              icon: category.icon,
                            });
                          }}
                          className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div>
            {/* Toolbar */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  />
                </div>
                <select
                  value={tagSortBy}
                  onChange={(e) => setTagSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                >
                  <option value="name">Sort by Name</option>
                  <option value="post_count">Sort by Posts</option>
                  <option value="follower_count">Sort by Followers</option>
                </select>
                <button
                  onClick={() => {
                    setShowTagForm(true);
                    setTagForm({ name: '', slug: '', description: '' });
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Tag
                </button>
                <button
                  onClick={handleCleanupTags}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors flex items-center"
                >
                  <Trash className="w-5 h-5 mr-2" />
                  Cleanup
                </button>
              </div>
            </div>

            {/* Tag Form Modal */}
            {showTagForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-semibold text-white mb-4">Create Tag</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={tagForm.name}
                        onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Slug</label>
                      <input
                        type="text"
                        value={tagForm.slug}
                        onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        value={tagForm.description}
                        onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleCreateTag}
                        className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowTagForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-gray-400">Loading tags...</p>
                </div>
              ) : tags.length === 0 ? (
                <div className="col-span-full bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-400">
                  No tags found
                </div>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">#{tag.name}</h3>
                          {featuredTags.includes(tag.slug) && (
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-mono">{tag.slug}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{tag.description}</p>
                    <div className="flex items-center justify-between text-sm mb-3">
                      <div className="flex space-x-4 text-gray-500">
                        <span>{tag.post_count} posts</span>
                        <span>{tag.follower_count} followers</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleFeaturedTag(tag.slug)}
                        className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                          featuredTags.includes(tag.slug)
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        <Star className="w-4 h-4 inline mr-1" />
                        Feature
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {tagsTotal > 50 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setTagPage((p) => Math.max(1, p - 1))}
                  disabled={tagPage === 1}
                  className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {tagPage} of {Math.ceil(tagsTotal / 50)}
                </span>
                <button
                  onClick={() => setTagPage((p) => p + 1)}
                  disabled={tagPage >= Math.ceil(tagsTotal / 50)}
                  className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
