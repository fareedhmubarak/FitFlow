import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import DebugErrorBoundary from './components/ErrorBoundary';
import DebugInitializer from './components/DebugInitializer';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppReadyProvider } from './contexts/AppReadyContext';
import PWAInstallBanner from './components/pwa/PWAInstallBanner';

function App() {
  return (
    <ThemeProvider>
      <AppReadyProvider>
        <DebugErrorBoundary enableDebug={import.meta.env.DEV}>
          <DebugInitializer>
            <RouterProvider router={router} />
            <PWAInstallBanner />
            <Toaster
          position="top-center"
          containerStyle={{
            top: 80, // Below mobile notch
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--theme-card-bg, rgba(30, 30, 30, 0.95))',
              color: 'var(--theme-text-primary, #fff)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--theme-glass-border, rgba(255,255,255,0.12))',
              borderRadius: '16px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'Urbanist, sans-serif',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              maxWidth: '360px',
            },
            success: {
              duration: 2500,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              style: {
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.08))',
                border: '1px solid rgba(16,185,129,0.3)',
                color: 'var(--theme-text-primary, #065f46)',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              style: {
                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                border: '1px solid rgba(239,68,68,0.3)',
                color: 'var(--theme-text-primary, #991b1b)',
              },
            },
          }}
        />
        </DebugInitializer>
      </DebugErrorBoundary>
      </AppReadyProvider>
    </ThemeProvider>
  );
}

export default App;
