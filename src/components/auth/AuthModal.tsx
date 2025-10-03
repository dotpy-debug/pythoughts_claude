import { useState } from 'react';
import { X } from 'lucide-react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
};

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-gray-600 mt-1">
            {mode === 'signin'
              ? 'Sign in to continue to Pythoughts'
              : 'Join the Pythoughts community'}
          </p>
        </div>

        {mode === 'signin' ? (
          <SignInForm onSuccess={handleSuccess} onToggleMode={() => setMode('signup')} />
        ) : (
          <SignUpForm onSuccess={handleSuccess} onToggleMode={() => setMode('signin')} />
        )}
      </div>
    </div>
  );
}
