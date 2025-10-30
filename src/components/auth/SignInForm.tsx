import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/Button';
import { checkRateLimit } from '../../utils/security';

type SignInFormProps = {
  onSuccess: () => void;
  onToggleMode: () => void;
  onForgotPassword: () => void;
};

export function SignInForm({ onSuccess, onToggleMode, onForgotPassword }: SignInFormProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check rate limit (5 attempts per 60 seconds per email)
    const rateLimit = checkRateLimit(`signin:${email}`, 5, 60000);
    if (!rateLimit.allowed) {
      const waitTime = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      setError(`Too many login attempts. Please wait ${waitTime} seconds before trying again.`);
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="email"
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />

      <div>
        <Input
          id="password"
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
        />
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-xs text-terminal-blue hover:text-terminal-green transition-colors font-mono mt-1"
        >
          Forgot password?
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm font-mono">
          <span className="text-red-500">! </span>{error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        variant="terminal"
        className="w-full"
      >
        {loading ? 'signing in...' : 'sign in'}
      </Button>

      <p className="text-center text-sm text-gray-400 font-mono">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-terminal-blue hover:text-terminal-green font-medium transition-colors"
        >
          sign up
        </button>
      </p>
    </form>
  );
}
