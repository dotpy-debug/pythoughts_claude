import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './SignInForm';

// Mock the auth context
const mockSignIn = vi.fn();
vi.mock('../../contexts/AuthContext', () => {
  const AuthProvider = ({ children }: { children: React.ReactNode }) => children;
  return {
    AuthProvider,
    useAuth: () => ({
      signIn: mockSignIn,
      user: null,
      profile: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    }),
  };
});

// Mock security utilities to avoid rate limiting in tests
vi.mock('../../utils/security', () => ({
  checkRateLimit: vi.fn(() => ({
    allowed: true,
    remaining: 5,
    resetTime: Date.now() + 60000,
  })),
}));

describe('SignInForm Component', () => {
  const mockOnSuccess = vi.fn();
  const mockOnToggleMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form with email and password inputs', () => {
    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders sign up link', () => {
    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('handles sign up link click', async () => {
    const user = userEvent.setup();
    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    await user.click(screen.getByRole('button', { name: /sign up/i }));
    expect(mockOnToggleMode).toHaveBeenCalledTimes(1);
  });

  it('updates email and password fields on user input', async () => {
    const user = userEvent.setup();
    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('submits form with email and password', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });

    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls onSuccess after successful sign in', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });

    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message on sign in failure', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      error: { message: 'Invalid email or password' },
    });

    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during sign in', async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 100)
        )
    );

    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in\.\.\./i })).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('requires email and password fields', () => {
    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('has correct input types', () => {
    render(<SignInForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />);

    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });
});
