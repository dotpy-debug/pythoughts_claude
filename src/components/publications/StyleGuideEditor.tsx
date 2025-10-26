import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Plus, X } from 'lucide-react';

type StyleGuide = {
  toneAndVoice: string;
  formattingRules: string;
  contentGuidelines: string;
  wordCountMin: number | null;
  wordCountMax: number | null;
  requiredSections: string[];
  prohibitedTopics: string[];
  seoGuidelines: string;
  keywordStrategy: string;
  resources: Array<{ title: string; url: string }>;
};

type StyleGuideEditorProps = {
  publicationId: string;
  onSaved?: () => void;
};

export function StyleGuideEditor({ publicationId, onSaved }: StyleGuideEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [styleGuide, setStyleGuide] = useState<StyleGuide>({
    toneAndVoice: '',
    formattingRules: '',
    contentGuidelines: '',
    wordCountMin: null,
    wordCountMax: null,
    requiredSections: [],
    prohibitedTopics: [],
    seoGuidelines: '',
    keywordStrategy: '',
    resources: [],
  });

  const [newSection, setNewSection] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');

  useEffect(() => {
    loadStyleGuide();
  }, [publicationId]);

  const loadStyleGuide = async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('publication_style_guides')
        .select('*')
        .eq('publication_id', publicationId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows
        throw fetchError;
      }

      if (data) {
        setStyleGuide({
          toneAndVoice: data.tone_and_voice || '',
          formattingRules: data.formatting_rules || '',
          contentGuidelines: data.content_guidelines || '',
          wordCountMin: data.word_count_min,
          wordCountMax: data.word_count_max,
          requiredSections: data.required_sections || [],
          prohibitedTopics: data.prohibited_topics || [],
          seoGuidelines: data.seo_guidelines || '',
          keywordStrategy: data.keyword_strategy || '',
          resources: data.resources || [],
        });
      }
    } catch (err) {
      logger.error('Failed to load style guide', err as Error);
      setError('Failed to load style guide');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const { error: upsertError } = await supabase.from('publication_style_guides').upsert({
        publication_id: publicationId,
        tone_and_voice: styleGuide.toneAndVoice.trim() || null,
        formatting_rules: styleGuide.formattingRules.trim() || null,
        content_guidelines: styleGuide.contentGuidelines.trim() || null,
        word_count_min: styleGuide.wordCountMin,
        word_count_max: styleGuide.wordCountMax,
        required_sections: styleGuide.requiredSections,
        prohibited_topics: styleGuide.prohibitedTopics,
        seo_guidelines: styleGuide.seoGuidelines.trim() || null,
        keyword_strategy: styleGuide.keywordStrategy.trim() || null,
        resources: styleGuide.resources,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        throw upsertError;
      }

      logger.info('Style guide saved');

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      logger.error('Failed to save style guide', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to save style guide');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSection = () => {
    if (newSection.trim()) {
      setStyleGuide((prev) => ({
        ...prev,
        requiredSections: [...prev.requiredSections, newSection.trim()],
      }));
      setNewSection('');
    }
  };

  const handleRemoveSection = (index: number) => {
    setStyleGuide((prev) => ({
      ...prev,
      requiredSections: prev.requiredSections.filter((_, i) => i !== index),
    }));
  };

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setStyleGuide((prev) => ({
        ...prev,
        prohibitedTopics: [...prev.prohibitedTopics, newTopic.trim()],
      }));
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (index: number) => {
    setStyleGuide((prev) => ({
      ...prev,
      prohibitedTopics: prev.prohibitedTopics.filter((_, i) => i !== index),
    }));
  };

  const handleAddResource = () => {
    if (newResourceTitle.trim() && newResourceUrl.trim()) {
      setStyleGuide((prev) => ({
        ...prev,
        resources: [
          ...prev.resources,
          { title: newResourceTitle.trim(), url: newResourceUrl.trim() },
        ],
      }));
      setNewResourceTitle('');
      setNewResourceUrl('');
    }
  };

  const handleRemoveResource = (index: number) => {
    setStyleGuide((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading style guide...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Publication Style Guide</CardTitle>
          <CardDescription>
            Define writing standards and editorial guidelines for your publication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tone and Voice */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tone and Voice</Label>
            <Textarea
              id="tone"
              value={styleGuide.toneAndVoice}
              onChange={(e) =>
                setStyleGuide((prev) => ({ ...prev, toneAndVoice: e.target.value }))
              }
              placeholder="Describe the desired tone and voice for articles (e.g., professional yet approachable, conversational, authoritative)..."
              rows={4}
              disabled={isSaving}
            />
          </div>

          {/* Formatting Rules */}
          <div className="space-y-2">
            <Label htmlFor="formatting">Formatting Rules</Label>
            <Textarea
              id="formatting"
              value={styleGuide.formattingRules}
              onChange={(e) =>
                setStyleGuide((prev) => ({ ...prev, formattingRules: e.target.value }))
              }
              placeholder="Specify formatting preferences (e.g., headings style, list formatting, code blocks, image captions)..."
              rows={4}
              disabled={isSaving}
            />
          </div>

          {/* Content Guidelines */}
          <div className="space-y-2">
            <Label htmlFor="content">Content Guidelines</Label>
            <Textarea
              id="content"
              value={styleGuide.contentGuidelines}
              onChange={(e) =>
                setStyleGuide((prev) => ({ ...prev, contentGuidelines: e.target.value }))
              }
              placeholder="General content expectations (e.g., originality requirements, citation standards, fact-checking)..."
              rows={4}
              disabled={isSaving}
            />
          </div>

          {/* Word Count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minWords">Minimum Word Count</Label>
              <Input
                id="minWords"
                type="number"
                min={0}
                value={styleGuide.wordCountMin || ''}
                onChange={(e) =>
                  setStyleGuide((prev) => ({
                    ...prev,
                    wordCountMin: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder="e.g., 500"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxWords">Maximum Word Count</Label>
              <Input
                id="maxWords"
                type="number"
                min={0}
                value={styleGuide.wordCountMax || ''}
                onChange={(e) =>
                  setStyleGuide((prev) => ({
                    ...prev,
                    wordCountMax: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder="e.g., 3000"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Required Sections */}
          <div className="space-y-2">
            <Label>Required Sections</Label>
            <div className="flex gap-2">
              <Input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="e.g., Introduction, Key Takeaways, Conclusion"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
                disabled={isSaving}
              />
              <Button onClick={handleAddSection} size="icon" variant="outline" disabled={isSaving}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {styleGuide.requiredSections.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {styleGuide.requiredSections.map((section, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {section}
                    <button
                      onClick={() => handleRemoveSection(index)}
                      className="ml-1 hover:text-destructive"
                      disabled={isSaving}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Prohibited Topics */}
          <div className="space-y-2">
            <Label>Prohibited Topics</Label>
            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g., Politics, Religious debates"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                disabled={isSaving}
              />
              <Button onClick={handleAddTopic} size="icon" variant="outline" disabled={isSaving}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {styleGuide.prohibitedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {styleGuide.prohibitedTopics.map((topic, index) => (
                  <Badge key={index} variant="destructive" className="gap-1">
                    {topic}
                    <button
                      onClick={() => handleRemoveTopic(index)}
                      className="ml-1 hover:text-white"
                      disabled={isSaving}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* SEO Guidelines */}
          <div className="space-y-2">
            <Label htmlFor="seo">SEO Guidelines</Label>
            <Textarea
              id="seo"
              value={styleGuide.seoGuidelines}
              onChange={(e) =>
                setStyleGuide((prev) => ({ ...prev, seoGuidelines: e.target.value }))
              }
              placeholder="SEO best practices for your publication (e.g., meta descriptions, heading structure, internal linking)..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Keyword Strategy */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Keyword Strategy</Label>
            <Textarea
              id="keywords"
              value={styleGuide.keywordStrategy}
              onChange={(e) =>
                setStyleGuide((prev) => ({ ...prev, keywordStrategy: e.target.value }))
              }
              placeholder="How to approach keyword research and usage..."
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Resources */}
          <div className="space-y-2">
            <Label>Helpful Resources</Label>
            <div className="flex gap-2">
              <Input
                value={newResourceTitle}
                onChange={(e) => setNewResourceTitle(e.target.value)}
                placeholder="Resource title"
                disabled={isSaving}
              />
              <Input
                value={newResourceUrl}
                onChange={(e) => setNewResourceUrl(e.target.value)}
                placeholder="https://..."
                disabled={isSaving}
              />
              <Button
                onClick={handleAddResource}
                size="icon"
                variant="outline"
                disabled={isSaving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {styleGuide.resources.length > 0 && (
              <div className="mt-2 space-y-2">
                {styleGuide.resources.map((resource, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {resource.title}
                      </a>
                      <p className="text-xs text-muted-foreground truncate">{resource.url}</p>
                    </div>
                    <Button
                      onClick={() => handleRemoveResource(index)}
                      size="icon"
                      variant="ghost"
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Style Guide'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
