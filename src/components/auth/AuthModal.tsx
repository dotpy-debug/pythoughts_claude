import { useState } from 'react';
import { X } from 'lucide-react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot-password';
};

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>(initialMode);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  const getTitleAndDescription = () => {
    switch (mode) {
      case 'signin':
        return {
          title: 'Welcome back',
          description: 'Sign in to continue to Pythoughts',
        };
      case 'signup':
        return {
          title: 'Create your account',
          description: 'Join the Pythoughts community',
        };
      case 'forgot-password':
        return {
          title: 'Forgot password',
          description: 'Reset your password',
        };
    }
  };

  const { title, description } = getTitleAndDescription();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <X size={24} />
        </button>

        {mode !== 'forgot-password' && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-100 font-mono">
              {title}
            </h2>
            <p className="text-gray-400 mt-1 font-mono text-sm">
              {description}
            </p>
          </div>
        )}

        {mode === 'signin' && (
          <SignInForm
            onSuccess={handleSuccess}
            onToggleMode={() => setMode('signup')}
            onForgotPassword={() => setMode('forgot-password')}
          />
        )}
        {mode === 'signup' && (
          <SignUpForm onSuccess={handleSuccess} onToggleMode={() => setMode('signin')} />
        )}
        {mode === 'forgot-password' && (
          <ForgotPasswordForm onBack={() => setMode('signin')} />
        )}
      </div>
    </div>
  );
}
