import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router';
import DebugErrorBoundary from './components/ErrorBoundary';
import DebugInitializer from './components/DebugInitializer';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AppReadyProvider } from './contexts/AppReadyContext';
import { useEffect, useRef } from 'react';

// Component to handle safe area fillers with theme updates
function SafeAreaFillers() {
  const { theme } = useTheme();
  const topFillerRef = useRef<HTMLDivElement>(null);
  const bottomFillerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const bgColor = theme.preview.bg;
    if (topFillerRef.current) {
      topFillerRef.current.style.backgroundColor = bgColor;
    }
    if (bottomFillerRef.current) {
      bottomFillerRef.current.style.backgroundColor = bgColor;
    }
  }, [theme]);
  
  return (
    <>
      {/* Fixed element to fill notch area with theme background - iOS PWA */}
      <div 
        ref={topFillerRef}
        data-safe-area-top
        className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
        style={{ 
          height: 'env(safe-area-inset-top, 0px)',
          backgroundColor: theme.preview.bg,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0
        }}
      />
      {/* Fixed element to fill bottom safe area with theme background */}
      <div 
        ref={bottomFillerRef}
        data-safe-area-bottom
        className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none"
        style={{ 
          height: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: theme.preview.bg,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0
        }}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppReadyProvider>
        <DebugErrorBoundary enableDebug={import.meta.env.DEV}>
          <DebugInitializer>
            <SafeAreaFillers />
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
