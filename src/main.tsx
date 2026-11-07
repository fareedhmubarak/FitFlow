import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n/config';
import './index.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// If a page's code file fails to load (e.g. the app was updated while it was
// open and an old file no longer exists), reload once to pick up the new version.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const last = Number(sessionStorage.getItem('chunk-reload-at') || 0);
  if (Date.now() - last > 15_000) {
    sessionStorage.setItem('chunk-reload-at', String(Date.now()));
    window.location.reload();
  }
});

// Register Service Worker for PWA with safe auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Check periodically without creating constant background traffic.
        setInterval(() => registration.update(), 30 * 60_000);

        // When a new SW installs, reload ONCE (guard prevents loop)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller &&
              !sessionStorage.getItem('sw-reloaded') &&
              !document.getElementById('pre-splash') // Don't reload during initial splash
            ) {
              sessionStorage.setItem('sw-reloaded', '1');
              console.log('New service worker available — reloading');
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => console.log('SW registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
