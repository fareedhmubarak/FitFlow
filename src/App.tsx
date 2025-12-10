import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import DebugErrorBoundary from './components/ErrorBoundary';
import DebugInitializer from './components/DebugInitializer';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppReadyProvider } from './contexts/AppReadyContext';

function App() {
  return (
    <ThemeProvider>
      <AppReadyProvider>
        <DebugErrorBoundary enableDebug={import.meta.env.DEV}>
          <DebugInitializer>
            {/* iOS PWA Safe Area Fill - Ensures notch area has theme gradient color */}
            <div 
              className="fixed inset-x-0 top-0 z-[9999] pointer-events-none"
              style={{
                height: 'env(safe-area-inset-top, 0px)',
                background: 'linear-gradient(135deg, #6EE7B7 0%, #A7F3D0 100%)',
              }}
              aria-hidden="true"
            />
            <RouterProvider router={router} />
            <Toaster
          position="top-center"
          containerStyle={{
            top: 80, // Below mobile notch
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--theme-card-bg, #363636)',
              color: 'var(--theme-text-primary, #fff)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--theme-glass-border, rgba(255,255,255,0.1))',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: 'var(--theme-success, #10b981)',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: 'var(--theme-error, #ef4444)',
                secondary: '#fff',
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
