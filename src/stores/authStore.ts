import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { Gym, GymUser } from '../types/database';

// Custom error for users who need to complete onboarding
export class OnboardingRequiredError extends Error {
  constructor() {
    super('ONBOARDING_REQUIRED');
    this.name = 'OnboardingRequiredError';
  }
}

interface AuthState {
  user: GymUser | null;
  gym: Gym | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  setUser: (user: GymUser | null) => void;
  setGym: (gym: Gym | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshGym: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      gym: null,
      isAuthenticated: false,
      isLoading: false,
      needsOnboarding: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setGym: (gym) => set({ gym }),

      login: async (email: string, password: string) => {
        try {
          // Sign in with Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) throw authError;

          // Get gym user data - use maybeSingle() to handle no record case
          const { data: gymUser, error: userError } = await supabase
            .from('gym_users')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle();

          if (userError) throw userError;

          // If no gym_user record, user needs to complete onboarding
          if (!gymUser) {
            set({ user: null, gym: null, isAuthenticated: false, needsOnboarding: true, isLoading: false });
            throw new OnboardingRequiredError();
          }

          // Get gym data
          const { data: gym, error: gymError } = await supabase
            .from('gym_gyms')
            .select('*')
            .eq('id', gymUser.gym_id)
            .single();

          if (gymError) throw gymError;

          set({ user: gymUser, gym, isAuthenticated: true, needsOnboarding: false, isLoading: false });
        } catch (error) {
          if (error instanceof OnboardingRequiredError) {
            throw error;
          }
          console.error('Login error:', error);
          set({ user: null, gym: null, isAuthenticated: false, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, gym: null, isAuthenticated: false, needsOnboarding: false, isLoading: false });
      },

      checkAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            set({ user: null, gym: null, isAuthenticated: false, isLoading: false });
            return;
          }

          // Get gym user data - use maybeSingle() to handle no record case
          const { data: gymUser, error: userError } = await supabase
            .from('gym_users')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (userError) throw userError;

          // If no gym_user record, user needs to complete onboarding
          if (!gymUser) {
            set({ user: null, gym: null, isAuthenticated: false, needsOnboarding: true, isLoading: false });
            return;
          }

          // Get gym data
          const { data: gym, error: gymError } = await supabase
            .from('gym_gyms')
            .select('*')
            .eq('id', gymUser.gym_id)
            .single();

          if (gymError) throw gymError;

          set({ user: gymUser, gym, isAuthenticated: true, needsOnboarding: false, isLoading: false });
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, gym: null, isAuthenticated: false, isLoading: false });
        }
      },

      refreshGym: async () => {
        const state = useAuthStore.getState();
        if (!state.user?.gym_id) return;
        
        try {
          const { data: gym, error } = await supabase
            .from('gym_gyms')
            .select('*')
            .eq('id', state.user.gym_id)
            .single();

          if (error) throw error;
          set({ gym });
        } catch (error) {
          console.error('Refresh gym error:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        gym: state.gym,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
