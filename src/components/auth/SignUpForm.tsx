import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/Button';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { isValidUsername, isValidEmail, checkRateLimit } from '../../utils/security';

type SignUpFormProps = {
  onSuccess: () => void;
  onToggleMode: () => void;
};

export function SignUpForm({ onSuccess, onToggleMode }: SignUpFormProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setLoading(true);

    // Validate username
    if (!isValidUsername(username)) {
      setUsernameError('Username must be 3-20 characters and contain only letters, numbers, underscore, or hyphen');
      setLoading(false);
      return;
    }

    // Validate email
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password strength (minimum requirements)
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setPasswordError('Password must contain uppercase, lowercase, number, and special character');
      setLoading(false);
      return;
    }

    // Check rate limit (5 attempts per 60 seconds per email)
    const rateLimit = checkRateLimit(`signup:${email}`, 5, 60000);
    if (!rateLimit.allowed) {
      const waitTime = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      setError(`Too many signup attempts. Please wait ${waitTime} seconds before trying again.`);
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, username);

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
        id="username"
        label="Username"
        type="text"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Choose a username"
        error={usernameError}
      />

      <Input
        id="email"
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        error={emailError}
      />

      <div>
        <Input
          id="password"
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a strong password"
          error={passwordError}
        />
        <div className="mt-2">
          <PasswordStrengthMeter password={password} showRequirements={true} />
        </div>
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
        {loading ? 'creating account...' : 'sign up'}
      </Button>

      <p className="text-center text-sm text-gray-400 font-mono">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-terminal-blue hover:text-terminal-green font-medium transition-colors"
        >
          sign in
        </button>
      </p>
    </form>
  );
}
