import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AppReadyContextType {
  isDataReady: boolean;
  setDataReady: () => void;
  isSplashComplete: boolean;
  setSplashComplete: () => void;
  shouldShowSplash: boolean;
}

const AppReadyContext = createContext<AppReadyContextType | null>(null);

export function AppReadyProvider({ children }: { children: ReactNode }) {
  const [isDataReady, setIsDataReady] = useState(false);
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  
  // Only show splash on dashboard route (root path)
  const [shouldShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      return path === '/' || path === '';
    }
    return false;
  });

  const setDataReady = useCallback(() => {
    setIsDataReady(true);
  }, []);

  const setSplashComplete = useCallback(() => {
    setIsSplashComplete(true);
  }, []);

  return (
    <AppReadyContext.Provider value={{ 
      isDataReady, 
      setDataReady, 
      isSplashComplete, 
      setSplashComplete,
      shouldShowSplash 
    }}>
      {children}
    </AppReadyContext.Provider>
  );
}

export function useAppReady() {
  const context = useContext(AppReadyContext);
  if (!context) {
    throw new Error('useAppReady must be used within AppReadyProvider');
  }
  return context;
}
