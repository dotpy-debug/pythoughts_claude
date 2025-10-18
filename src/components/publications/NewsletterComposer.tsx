import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Send, Eye } from 'lucide-react';

type NewsletterStatus = 'draft' | 'scheduled' | 'sent';

type NewsletterComposerProps = {
  publicationId: string;
  publicationName: string;
  onSent?: () => void;
};

export function NewsletterComposer({
  publicationId,
  publicationName,
  onSent,
}: NewsletterComposerProps) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [scheduledFor, setScheduledFor] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<NewsletterStatus>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error: insertError } = await supabase.from('publication_newsletters').insert({
        publication_id: publicationId,
        subject: subject.trim(),
        content: content.trim(),
        preview_text: previewText.trim() || null,
        status: 'draft',
        author_id: user.id,
      });

      if (insertError) {
        throw insertError;
      }

      logger.info('Newsletter draft saved');
      setSubject('');
      setContent('');
      setPreviewText('');
      setScheduledFor(undefined);
      setError(null);
    } catch (err) {
      logger.error('Failed to save draft', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (!scheduledFor) {
      setError('Please select a date and time to schedule');
      return;
    }

    if (scheduledFor <= new Date()) {
      setError('Scheduled date must be in the future');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error: insertError } = await supabase.from('publication_newsletters').insert({
        publication_id: publicationId,
        subject: subject.trim(),
        content: content.trim(),
        preview_text: previewText.trim() || null,
        status: 'scheduled',
        scheduled_for: scheduledFor.toISOString(),
        author_id: user.id,
      });

      if (insertError) {
        throw insertError;
      }

      logger.info('Newsletter scheduled', { scheduledFor });

      // Reset form
      setSubject('');
      setContent('');
      setPreviewText('');
      setScheduledFor(undefined);
      setError(null);
    } catch (err) {
      logger.error('Failed to schedule newsletter', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to schedule newsletter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNow = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    // Confirm before sending
    if (!confirm('Are you sure you want to send this newsletter immediately?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get subscriber count
      const { count, error: countError } = await supabase
        .from('publication_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('publication_id', publicationId)
        .eq('is_active', true);

      if (countError) {
        throw countError;
      }

      // Create newsletter record
      const { data: newsletter, error: insertError } = await supabase
        .from('publication_newsletters')
        .insert({
          publication_id: publicationId,
          subject: subject.trim(),
          content: content.trim(),
          preview_text: previewText.trim() || null,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: count || 0,
          author_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // TODO: Trigger actual email sending via background job/webhook
      // This would integrate with Resend or another email service

      logger.info('Newsletter sent', { newsletterId: newsletter.id, count });

      // Reset form
      setSubject('');
      setContent('');
      setPreviewText('');
      setScheduledFor(undefined);
      setError(null);

      if (onSent) {
        onSent();
      }
    } catch (err) {
      logger.error('Failed to send newsletter', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to send newsletter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Newsletter</CardTitle>
          <CardDescription>
            Send an email to all {publicationName} subscribers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your weekly digest from..."
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview">Preview Text</Label>
            <Input
              id="preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="This appears in the email preview..."
              maxLength={150}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Shows in inbox preview (recommended: 40-90 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your newsletter content here... Supports Markdown!"
              rows={12}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Markdown formatting supported
            </p>
          </div>

          <div className="space-y-2">
            <Label>Schedule for Later (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledFor ? format(scheduledFor, 'PPP p') : 'Pick a date and time'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledFor}
                  onSelect={setScheduledFor}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={
                      scheduledFor
                        ? format(scheduledFor, 'HH:mm')
                        : format(new Date(), 'HH:mm')
                    }
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = scheduledFor || new Date();
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      setScheduledFor(new Date(newDate));
                    }}
                    className="mt-1"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={isSubmitting}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
              Save Draft
            </Button>
            {scheduledFor && (
              <Button onClick={handleSchedule} disabled={isSubmitting}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            )}
            <Button onClick={handleSendNow} disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
            <CardDescription>How your newsletter will look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white text-black">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">{subject || '[Subject]'}</h2>
                {previewText && (
                  <p className="text-sm text-gray-600 mt-1">{previewText}</p>
                )}
              </div>
              <div className="prose prose-sm max-w-none">
                {content ? (
                  <div className="whitespace-pre-wrap">{content}</div>
                ) : (
                  <p className="text-gray-400">[Newsletter content will appear here]</p>
                )}
              </div>
              <div className="mt-8 pt-4 border-t text-xs text-gray-500">
                <p>
                  You're receiving this because you subscribed to {publicationName}.
                </p>
                <p className="mt-1">
                  <a href="#" className="underline">
                    Unsubscribe
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
