import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-terminal-green/20 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-terminal-green" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-mono font-semibold text-gray-100">
            Check your email
          </h3>
          <p className="text-sm text-gray-400 font-mono">
            We've sent a password reset link to <span className="text-terminal-green">{email}</span>
          </p>
          <p className="text-xs text-gray-500 font-mono pt-2">
            The link will expire in 1 hour for security purposes.
          </p>
        </div>

        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="w-full"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-terminal-green transition-colors font-mono"
        >
          <ArrowLeft size={16} />
          <span>Back to sign in</span>
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <h3 className="text-lg font-mono font-semibold text-gray-100">
          Reset your password
        </h3>
        <p className="text-sm text-gray-400 font-mono">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <Input
        id="reset-email"
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoFocus
      />

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm font-mono">
          <span className="text-red-500">! </span>{error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !email}
        loading={loading}
        variant="terminal"
        className="w-full"
      >
        {loading ? 'sending...' : 'send_reset_link'}
      </Button>
    </form>
  );
}
