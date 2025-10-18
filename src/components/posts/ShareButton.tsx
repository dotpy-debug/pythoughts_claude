import { useState, useRef, useEffect } from 'react';
import { Share2, Twitter, Facebook, Linkedin, Link as LinkIcon, Check } from 'lucide-react';
import { Post } from '../../lib/supabase';

type ShareButtonProps = {
  post: Post;
  variant?: 'default' | 'compact';
};

export function ShareButton({ post, variant = 'default' }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const postUrl = `${window.location.origin}/post/${post.id}`;
  const postTitle = post.title || 'Check out this post on Pythoughts';
  const postDescription = post.subtitle || post.content?.substring(0, 200) || '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postTitle)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const handleShareLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center space-x-1 text-gray-400 hover:text-terminal-blue transition-colors ${
          variant === 'compact' ? 'text-sm' : ''
        }`}
        title="Share post"
      >
        <Share2 size={variant === 'compact' ? 16 : 18} />
        {variant === 'default' && <span className="font-mono text-sm">Share</span>}
      </button>

      {showMenu && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 z-50">
          <button
            onClick={handleShareTwitter}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-blue flex items-center space-x-2 font-mono text-sm transition-colors"
          >
            <Twitter size={16} />
            <span>Twitter</span>
          </button>
          <button
            onClick={handleShareFacebook}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-blue flex items-center space-x-2 font-mono text-sm transition-colors"
          >
            <Facebook size={16} />
            <span>Facebook</span>
          </button>
          <button
            onClick={handleShareLinkedIn}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-blue flex items-center space-x-2 font-mono text-sm transition-colors"
          >
            <Linkedin size={16} />
            <span>LinkedIn</span>
          </button>
          <div className="border-t border-gray-800" />
          <button
            onClick={handleCopyLink}
            className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-terminal-green flex items-center space-x-2 font-mono text-sm transition-colors"
          >
            {copied ? (
              <>
                <Check size={16} className="text-terminal-green" />
                <span className="text-terminal-green">Copied!</span>
              </>
            ) : (
              <>
                <LinkIcon size={16} />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
