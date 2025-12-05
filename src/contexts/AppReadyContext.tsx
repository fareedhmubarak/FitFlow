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
  
  // Show splash on every fresh app load (any route)
  const [shouldShowSplash] = useState(true);

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
