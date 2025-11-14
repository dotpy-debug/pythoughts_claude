import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

interface TestProvidersProperties {
  children: ReactNode;
}

export function TestProviders({ children }: TestProvidersProperties) {
  return (
    <AuthProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthProvider>
  );
}
