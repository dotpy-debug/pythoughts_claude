import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

interface TestProvidersProps {
  children: ReactNode;
}

export function TestProviders({ children }: TestProvidersProps) {
  return (
    <AuthProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthProvider>
  );
}
