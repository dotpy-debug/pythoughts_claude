import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { logger } from './lib/logger';

// Register Service Worker for PWA functionality and offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        logger.info('Service Worker registered successfully', { scope: registration.scope });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60_000); // Check every minute
      })
      .catch((error) => {
        logger.error('Service Worker registration failed', { errorMessage: error instanceof Error ? error.message : String(error) });
      });
  });
}

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
