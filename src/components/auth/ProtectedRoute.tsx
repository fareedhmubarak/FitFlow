import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user, checkAuth, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // Check if there's a valid Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No valid session - clear auth state and redirect will happen
        if (isAuthenticated) {
          await logout();
        }
        setIsChecking(false);
        return;
      }
      
      // Session exists - verify it matches persisted user
      if (user && user.auth_user_id !== session.user.id) {
        // MISMATCH! Persisted user doesn't match session user
        // This is a bug - clear everything
        console.warn('Auth mismatch: persisted user does not match session. Clearing state.');
        await logout();
        setIsChecking(false);
        return;
      }
      
      if (session && !isAuthenticated) {
        // Session exists but store not updated - refresh auth state
        await checkAuth();
      }
      
      setIsChecking(false);
    };

    verifyAuth();
  }, [isAuthenticated, checkAuth, logout, user]);

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#E0F2FE]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
