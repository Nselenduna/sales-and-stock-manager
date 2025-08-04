import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, UserWithRole } from '../lib/supabase';
import { RateLimiter } from '../lib/security/rateLimiting';
import { PasswordSecurity } from '../lib/security/passwordSecurity';
import { HttpsEnforcement } from '../lib/security/httpsEnforcement';
import { Platform } from 'react-native';

interface AuthState {
  user: UserWithRole | null;
  session: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  loading: boolean;
  isAuthenticated: boolean;
  userRole: 'admin' | 'staff' | 'viewer' | null;
  lastPasswordCheck: number;
}

/* eslint-disable no-unused-vars */
interface AuthActions {
  setUser: (user: UserWithRole | null) => void;
  setSession: (session: any | null) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  checkAuth: () => Promise<void>;
  checkUser: () => Promise<void>;
  getUserRole: () => Promise<void>;
  checkPasswordSecurity: () => Promise<{
    needsUpdate: boolean;
    reason?: string;
  }>;
}
/* eslint-enable no-unused-vars */

const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      isAuthenticated: false,
      userRole: null,
      lastPasswordCheck: 0,

      setUser: user => set({ user, isAuthenticated: !!user }),
      setSession: session => set({ session }),
      setLoading: loading => set({ loading }),

      signIn: async (email, password) => {
        try {
          set({ loading: true });

          // Enforce HTTPS in web production environment
          if (Platform.OS === 'web') {
            HttpsEnforcement.redirectToHttps();
          }

          // Check rate limiting
          const isAllowed = await RateLimiter.isLoginAllowed(email);
          if (!isAllowed) {
            throw new Error('Too many login attempts. Please try again later.');
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          // Record successful login attempt
          await RateLimiter.recordLoginAttempt(email, true);

          if (data.user) {
            await get().getUserRole();

            // Schedule password security check
            set({ lastPasswordCheck: Date.now() });
            const { needsUpdate, reason } = await get().checkPasswordSecurity();
            if (needsUpdate) {
              console.warn('Password security update needed:', reason);
            }
          }

          return { success: true };
        } catch (error: any) {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          // Record failed login attempt
          await RateLimiter.recordLoginAttempt(email, false);
          return { success: false, error: error.message };
        } finally {
          set({ loading: false });
        }
      },

      signUp: async (email, password) => {
        try {
          set({ loading: true });

          // Enforce HTTPS in web production environment
          if (Platform.OS === 'web') {
            HttpsEnforcement.redirectToHttps();
          }

          // Validate password strength
          const { isValid, errors } =
            PasswordSecurity.validatePassword(password);
          if (!isValid) {
            throw new Error(errors.join('\n'));
          }

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Add password to history for future checks
            await PasswordSecurity.addToPasswordHistory(data.user.id, password);

            // Create default role for new user
            const { error: roleError } = await supabase.from('roles').insert({
              user_id: data.user.id,
              role_type: 'staff', // Default role
            });

            if (roleError) throw roleError;

            await get().getUserRole();
            set({ lastPasswordCheck: Date.now() });
          }

          return { success: true };
        } catch (error: any) {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          return { success: false, error: error.message };
        } finally {
          set({ loading: false });
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
          });
        } catch (error) {
          console.error('Sign out error:', error);
        }
      },

      checkAuth: async () => {
        try {
          set({ loading: true });

          // Enforce HTTPS in web production environment
          if (Platform.OS === 'web') {
            HttpsEnforcement.redirectToHttps();
          }

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            set({ session, isAuthenticated: true });
            await get().getUserRole();

            // Check password security if enough time has passed
            const lastCheck = get().lastPasswordCheck;
            if (Date.now() - lastCheck > 24 * 60 * 60 * 1000) {
              // Check once per day
              const { needsUpdate, reason } =
                await get().checkPasswordSecurity();
              if (needsUpdate) {
                console.warn('Password security update needed:', reason);
              }
              set({ lastPasswordCheck: Date.now() });
            }
          } else {
            set({ session: null, isAuthenticated: false, userRole: null });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ session: null, isAuthenticated: false, userRole: null });
        } finally {
          set({ loading: false });
        }
      },

      checkUser: async () => {
        try {
          set({ loading: true });
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (user && session) {
            // Create a UserWithRole object by fetching the role
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('user_id', user.id)
              .single();

            const userWithRole: UserWithRole = {
              ...user,
              email: user.email || '',
              created_at: user.created_at || new Date().toISOString(),
              updated_at: user.updated_at || new Date().toISOString(),
              role: roleData || {
                id: '',
                user_id: user.id,
                role_type: 'staff',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            };

            set({ user: userWithRole, session, isAuthenticated: true });
            await get().getUserRole();
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              userRole: null,
            });
          }
        } catch (error) {
          console.error('User check error:', error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            userRole: null,
          });
        } finally {
          set({ loading: false });
        }
      },

      getUserRole: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { data: roleData, error } = await supabase
            .from('roles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error) throw error;

          set({ userRole: roleData?.role_type || null });
        } catch (error) {
          console.error('Get user role error:', error);
          set({ userRole: null });
        }
      },

      checkPasswordSecurity: async () => {
        const { user } = get();
        if (!user) return { needsUpdate: false };

        try {
          const isExpired = await PasswordSecurity.isPasswordExpired(user.id);
          if (isExpired) {
            return {
              needsUpdate: true,
              reason: 'Password has expired. Please update your password.',
            };
          }

          return { needsUpdate: false };
        } catch (error) {
          console.error('Password security check error:', error);
          return { needsUpdate: false };
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
        lastPasswordCheck: state.lastPasswordCheck,
      }),
    }
  )
);

export { useAuthStore };
