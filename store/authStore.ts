import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, UserWithRole } from '../lib/supabase';
import { checkLoginRateLimit, checkRegisterRateLimit, formatRateLimitMessage } from '../lib/security/rateLimiter';
import { securityManager } from '../lib/security/securityManager';

interface AuthState {
  user: UserWithRole | null;
  session: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  userRole: 'admin' | 'staff' | 'viewer' | null;
}

interface AuthActions {
  setUser: (user: UserWithRole | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  checkUser: () => Promise<void>;
  getUserRole: () => Promise<void>;
}

const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      isAuthenticated: false,
      userRole: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      signIn: async (email, password) => {
        try {
          set({ loading: true });

          // Check rate limiting
          const rateLimitResult = await checkLoginRateLimit(email);
          if (!rateLimitResult.allowed) {
            const message = formatRateLimitMessage(rateLimitResult, 'login');
            await securityManager.logSecurityEvent({
              type: 'rate_limit',
              timestamp: Date.now(),
              email,
              details: 'Login rate limit exceeded',
            });
            return { success: false, error: message };
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            // Log failed login attempt
            await securityManager.logSecurityEvent({
              type: 'failed_login',
              timestamp: Date.now(),
              email,
              details: error.message,
            });
            throw error;
          }

          if (data.user) {
            await get().getUserRole();
            
            // Log successful login
            await securityManager.logSecurityEvent({
              type: 'login',
              timestamp: Date.now(),
              userId: data.user.id,
              email: data.user.email,
            });
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        } finally {
          set({ loading: false });
        }
      },

      signUp: async (email, password) => {
        try {
          set({ loading: true });

          // Check rate limiting
          const rateLimitResult = await checkRegisterRateLimit(email);
          if (!rateLimitResult.allowed) {
            const message = formatRateLimitMessage(rateLimitResult, 'registration');
            await securityManager.logSecurityEvent({
              type: 'rate_limit',
              timestamp: Date.now(),
              email,
              details: 'Registration rate limit exceeded',
            });
            return { success: false, error: message };
          }

          // Validate password strength if security manager is available
          const passwordValidation = securityManager.validatePasswordStrength(password);
          if (!passwordValidation.isValid) {
            return { 
              success: false, 
              error: `Password requirements not met: ${passwordValidation.suggestions.join(', ')}` 
            };
          }

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Create default role for new user
            const { error: roleError } = await supabase
              .from('roles')
              .insert({
                user_id: data.user.id,
                role_type: 'staff', // Default role
              });

            if (roleError) throw roleError;

            await get().getUserRole();

            // Log successful registration
            await securityManager.logSecurityEvent({
              type: 'login',
              timestamp: Date.now(),
              userId: data.user.id,
              email: data.user.email,
              details: 'New user registration',
            });
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        try {
          // Log logout event
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await securityManager.logSecurityEvent({
              type: 'logout',
              timestamp: Date.now(),
              userId: user.id,
              email: user.email,
            });
          }

          await supabase.auth.signOut();
          set({ user: null, session: null, isAuthenticated: false, userRole: null });
        } catch (error) {
          console.error('Sign out error:', error);
        }
      },

      checkAuth: async () => {
        try {
          set({ loading: true });
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            set({ session, isAuthenticated: true });
            await get().getUserRole();
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
          const { data: { user } } = await supabase.auth.getUser();
          const { data: { session } } = await supabase.auth.getSession();
          
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
              role: roleData || {
                id: '',
                user_id: user.id,
                role_type: 'staff',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            };
            
            set({ user: userWithRole, session, isAuthenticated: true });
            await get().getUserRole();
          } else {
            set({ user: null, session: null, isAuthenticated: false, userRole: null });
          }
        } catch (error) {
          console.error('User check error:', error);
          set({ user: null, session: null, isAuthenticated: false, userRole: null });
        } finally {
          set({ loading: false });
        }
      },

      getUserRole: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
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
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        user: state.user, 
        session: state.session, 
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole 
      }),
    }
  )
);

export { useAuthStore };
