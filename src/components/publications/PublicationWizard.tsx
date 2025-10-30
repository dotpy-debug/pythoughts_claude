import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../lib/logger';

export type PublicationData = {
  // Basic Info
  slug: string;
  name: string;
  tagline: string;
  description: string;

  // Branding
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor: string;
  accentColor: string;

  // Settings
  isPublic: boolean;
  allowSubmissions: boolean;
  requireApproval: boolean;
  allowCrossPosting: boolean;
  enableNewsletter: boolean;

  // Social Links
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubUrl?: string;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
};

type PublicationWizardProps = {
  onComplete: (publicationId: string) => void;
  onCancel: () => void;
};

export function PublicationWizard({ onComplete, onCancel }: PublicationWizardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PublicationData>({
    slug: '',
    name: '',
    tagline: '',
    description: '',
    primaryColor: '#b94a12',
    accentColor: '#0f1c28',
    isPublic: true,
    allowSubmissions: true,
    requireApproval: true,
    allowCrossPosting: true,
    enableNewsletter: false,
  });

  const handleInputChange = (field: keyof PublicationData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    handleInputChange('name', name);
    if (!formData.slug || formData.slug === generateSlug(formData.name)) {
      handleInputChange('slug', generateSlug(name));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Publication name is required');
      return false;
    }
    if (!formData.slug.trim()) {
      setError('Publication slug is required');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!user) {
      setError('You must be logged in to create a publication');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create publication
      const { data: publication, error: pubError } = await supabase
        .from('publications')
        .insert({
          slug: formData.slug,
          name: formData.name,
          tagline: formData.tagline || null,
          description: formData.description || null,
          logo_url: formData.logoUrl || null,
          cover_image_url: formData.coverImageUrl || null,
          primary_color: formData.primaryColor,
          accent_color: formData.accentColor,
          is_public: formData.isPublic,
          allow_submissions: formData.allowSubmissions,
          require_approval: formData.requireApproval,
          allow_cross_posting: formData.allowCrossPosting,
          enable_newsletter: formData.enableNewsletter,
          website_url: formData.websiteUrl || null,
          twitter_handle: formData.twitterHandle || null,
          linkedin_url: formData.linkedinUrl || null,
          github_url: formData.githubUrl || null,
          meta_title: formData.metaTitle || null,
          meta_description: formData.metaDescription || null,
          creator_id: user.id,
        })
        .select()
        .single();

      if (pubError) {
        throw pubError;
      }

      if (!publication) {
        throw new Error('Failed to create publication');
      }

      // Add creator as owner member
      const { error: memberError } = await supabase
        .from('publication_members')
        .insert({
          publication_id: publication.id,
          user_id: user.id,
          role: 'owner',
          can_publish: true,
          can_edit_others: true,
          can_delete_posts: true,
          can_manage_members: true,
          can_manage_settings: true,
        });

      if (memberError) {
        logger.error('Failed to add creator as member', memberError);
        // Not critical, publication was created
      }

      onComplete(publication.id);
    } catch (err) {
      logger.error('Failed to create publication', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to create publication');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create a Publication</CardTitle>
        <CardDescription>
          Build a collaborative blogging space with custom branding and workflow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="social">Social & SEO</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Publication Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Publication"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">pythoughts.com/pub/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('slug', e.target.value)}
                  placeholder="my-awesome-publication"
                  pattern="[a-z0-9-]+"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('tagline', e.target.value)}
                placeholder="Where great minds share ideas"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                placeholder="Tell readers what your publication is about..."
                rows={4}
                maxLength={1000}
              />
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                type="url"
                value={formData.logoUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 200x200px, transparent background
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover">Cover Image URL</Label>
              <Input
                id="cover"
                type="url"
                value={formData.coverImageUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('coverImageUrl', e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 1600x400px
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('primaryColor', e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('primaryColor', e.target.value)}
                    placeholder="#b94a12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('accentColor', e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('accentColor', e.target.value)}
                    placeholder="#0f1c28"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Publication</Label>
                <p className="text-sm text-muted-foreground">
                  Allow anyone to discover and read your publication
                </p>
              </div>
              <Switch
                checked={formData.isPublic}
                onCheckedChange={(checked: boolean) => handleInputChange('isPublic', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Submissions</Label>
                <p className="text-sm text-muted-foreground">
                  Let writers submit posts for publication
                </p>
              </div>
              <Switch
                checked={formData.allowSubmissions}
                onCheckedChange={(checked: boolean) => handleInputChange('allowSubmissions', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Review and approve submissions before publishing
                </p>
              </div>
              <Switch
                checked={formData.requireApproval}
                onCheckedChange={(checked: boolean) => handleInputChange('requireApproval', checked)}
                disabled={!formData.allowSubmissions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Cross-Posting</Label>
                <p className="text-sm text-muted-foreground">
                  Let authors cross-post from other publications
                </p>
              </div>
              <Switch
                checked={formData.allowCrossPosting}
                onCheckedChange={(checked: boolean) => handleInputChange('allowCrossPosting', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Newsletter</Label>
                <p className="text-sm text-muted-foreground">
                  Send email newsletters to subscribers
                </p>
              </div>
              <Switch
                checked={formData.enableNewsletter}
                onCheckedChange={(checked: boolean) => handleInputChange('enableNewsletter', checked)}
              />
            </div>
          </TabsContent>

          {/* Social & SEO Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={formData.websiteUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('websiteUrl', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter Handle</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">@</span>
                <Input
                  id="twitter"
                  value={formData.twitterHandle || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('twitterHandle', e.target.value)}
                  placeholder="yourpublication"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                type="url"
                value={formData.linkedinUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/company/yourpublication"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github">GitHub URL</Label>
              <Input
                id="github"
                type="url"
                value={formData.githubUrl || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('githubUrl', e.target.value)}
                placeholder="https://github.com/yourpublication"
              />
            </div>

            <hr className="my-6" />

            <div className="space-y-2">
              <Label htmlFor="metaTitle">SEO Title</Label>
              <Input
                id="metaTitle"
                value={formData.metaTitle || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('metaTitle', e.target.value)}
                placeholder="My Awesome Publication - Great Writing"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 50-60 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">SEO Description</Label>
              <Textarea
                id="metaDescription"
                value={formData.metaDescription || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleInputChange('metaDescription', e.target.value)}
                placeholder="Discover amazing content from talented writers..."
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 150-160 characters
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'basic' && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ['basic', 'branding', 'settings', 'social'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
            {activeTab !== 'social' ? (
              <Button
                onClick={() => {
                  const tabs = ['basic', 'branding', 'settings', 'social'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
                disabled={isSubmitting}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Publication'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
