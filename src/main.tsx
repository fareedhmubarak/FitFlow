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
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Register Service Worker for PWA with safe auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Check for updates every 60 seconds
        setInterval(() => registration.update(), 60_000);

        // When a new SW installs, reload ONCE (guard prevents loop)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller &&
              !sessionStorage.getItem('sw-reloaded')
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
