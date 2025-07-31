import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, UserWithRole } from '../lib/supabase';

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  userRole: 'admin' | 'staff' | 'viewer' | null;
}

interface AuthActions {
  setUser: (user: any | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkUser: () => Promise<void>;
}

const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      isAuthenticated: false,
      userRole: null,

      setUser: user => set({ user }),
      setSession: session => set({ session }),
      setLoading: loading => set({ loading }),

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Fetch user role
            const { data: roleData, error: roleError } = await supabase
              .from('roles')
              .select('role_type')
              .eq('user_id', data.user.id)
              .single();

            if (roleError) {
              console.error('Error fetching user role:', roleError);
              // Default to viewer if role not found
              set({
                user: data.user,
                session: data.session,
                isAuthenticated: true,
                userRole: 'viewer',
                loading: false,
              });
            } else {
              set({
                user: data.user,
                session: data.session,
                isAuthenticated: true,
                userRole: roleData.role_type,
                loading: false,
              });
            }
            return { success: true };
          }
          return { success: false, error: 'No user data received' };
        } catch (error: any) {
          console.error('Sign in error:', error);
          set({ loading: false });
          return { success: false, error: error.message };
        }
      },

      signUp: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Fetch user role
            const { data: roleData, error: roleError } = await supabase
              .from('roles')
              .select('role_type')
              .eq('user_id', data.user.id)
              .single();

            if (roleError) {
              console.error('Error fetching user role:', roleError);
              // Default to viewer if role not found
              set({
                user: data.user,
                session: data.session,
                isAuthenticated: true,
                userRole: 'viewer',
                loading: false,
              });
            } else {
              set({
                user: data.user,
                session: data.session,
                isAuthenticated: true,
                userRole: roleData.role_type,
                loading: false,
              });
            }
            return { success: true };
          }
          return { success: false, error: 'No user data received' };
        } catch (error: any) {
          console.error('Sign up error:', error);
          set({ loading: false });
          return { success: false, error: error.message };
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            userRole: null,
            loading: false,
          });
        } catch (error) {
          console.error('Sign out error:', error);
        }
      },

      checkUser: async () => {
        try {
          set({ loading: true });
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          if (session?.user) {
            // Fetch user role
            const { data: roleData, error: roleError } = await supabase
              .from('roles')
              .select('role_type')
              .eq('user_id', session.user.id)
              .single();

            if (roleError) {
              console.error('Error fetching user role:', roleError);
              set({
                user: session.user,
                session,
                isAuthenticated: true,
                userRole: 'viewer', // Default role
                loading: false,
              });
            } else {
              set({
                user: session.user,
                session,
                isAuthenticated: true,
                userRole: roleData.role_type,
                loading: false,
              });
            }
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              userRole: null,
              loading: false,
            });
          }
        } catch (error) {
          console.error('Check user error:', error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            userRole: null,
            loading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAuthStore;
