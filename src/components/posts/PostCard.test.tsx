import { describe, it, expect, vi } from 'vitest';
import { render } from '../../test/test-utils';
// @ts-nocheck
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard';
import { Post } from '../../lib/supabase';

const mockPost: Post = {
  id: 'post-123',
  title: 'Test Post Title',
  content: 'This is test post content that should be displayed in the card.',
  author_id: 'user-123',
  vote_count: 42,
  comment_count: 5,
  is_published: true,
  is_draft: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: 'python',
  image_url: '',
  post_type: 'news',
  published_at: new Date().toISOString(),
  reading_time_minutes: 5,
  subtitle: 'Test subtitle',
  seo_title: 'Test SEO Title',
  seo_description: 'Test SEO description',
  canonical_url: 'https://example.com/post-123',
  featured: false,
  profiles: {
    id: 'user-123',
    username: 'testuser',
    avatar_url: '',
    bio: 'Test bio',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin: false,
  },
};

describe('PostCard Component', () => {
  it('renders post title with terminal prefix', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.getByText(/Test Post Title/i)).toBeInTheDocument();
    expect(screen.getByText(/\$ Test Post Title/i)).toBeInTheDocument();
  });

  it('renders post content', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.getByText(/This is test post content/i)).toBeInTheDocument();
  });

  it('displays vote count', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays comment count', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays author username', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('displays category badge when category exists', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('does not display category badge when category is empty', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();
    const postWithoutCategory = { ...mockPost, category: '' };

    render(<PostCard post={postWithoutCategory} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.queryByText('python')).not.toBeInTheDocument();
  });

  it('displays "anonymous" when no profile exists', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();
    const postWithoutProfile = { ...mockPost, profiles: undefined };

    render(<PostCard post={postWithoutProfile} onVote={mockOnVote} onClick={mockOnClick} />);

    expect(screen.getByText('anonymous')).toBeInTheDocument();
  });

  it('highlights upvote button when user has upvoted', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} userVote={1} onVote={mockOnVote} onClick={mockOnClick} />);

    const upvoteButton = screen.getAllByRole('button')[0];
    expect(upvoteButton).toHaveClass('text-terminal-green');
  });

  it('highlights downvote button when user has downvoted', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} userVote={-1} onVote={mockOnVote} onClick={mockOnClick} />);

    const downvoteButton = screen.getAllByRole('button')[1];
    expect(downvoteButton).toHaveClass('text-terminal-pink');
  });

  it('calls onVote with correct parameters when upvote clicked', async () => {
    const user = userEvent.setup();
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    const upvoteButton = screen.getAllByRole('button')[0];
    await user.click(upvoteButton);

    expect(mockOnVote).toHaveBeenCalledWith('post-123', 1);
    expect(mockOnVote).toHaveBeenCalledTimes(1);
  });

  it('calls onVote with correct parameters when downvote clicked', async () => {
    const user = userEvent.setup();
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    const downvoteButton = screen.getAllByRole('button')[1];
    await user.click(downvoteButton);

    expect(mockOnVote).toHaveBeenCalledWith('post-123', -1);
    expect(mockOnVote).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    const cardContent = screen.getByText(/Test Post Title/i);
    await user.click(cardContent);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when vote button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    const upvoteButton = screen.getAllByRole('button')[0];
    await user.click(upvoteButton);

    expect(mockOnClick).not.toHaveBeenCalled();
    expect(mockOnVote).toHaveBeenCalledTimes(1);
  });

  it('displays image when image_url is provided', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();
    const postWithImage = {
      ...mockPost,
      image_url: 'https://example.com/image.jpg',
    };

    render(<PostCard post={postWithImage} onVote={mockOnVote} onClick={mockOnClick} />);

    const image = screen.getByAltText('Test Post Title');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('does not display image when image_url is empty', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();
    const postWithoutImage = { ...mockPost, image_url: '' };

    render(<PostCard post={postWithoutImage} onVote={mockOnVote} onClick={mockOnClick} />);

    const image = screen.queryByAltText('Test Post Title');
    expect(image).not.toBeInTheDocument();
  });

  it('displays avatar when profile has avatar_url', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();
    const postWithAvatar = {
      ...mockPost,
      profiles: {
        ...mockPost.profiles!,
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    render(<PostCard post={postWithAvatar} onVote={mockOnVote} onClick={mockOnClick} />);

    const avatar = screen.getByAltText('testuser');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('displays default user icon when no avatar_url', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    // User icon should be displayed (no avatar image)
    expect(screen.queryByAltText('testuser')).not.toBeInTheDocument();
  });

  it('applies hover styles to card', () => {
    const mockOnVote = vi.fn();
    const mockOnClick = vi.fn();

    const { container } = render(<PostCard post={mockPost} onVote={mockOnVote} onClick={mockOnClick} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('hover:border-terminal-green');
    expect(card).toHaveClass('cursor-pointer');
  });
});
