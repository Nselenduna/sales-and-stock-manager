// Jest setup file for React Native testing

// Set up the global environment
global.window = {}; 
global.window.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0);
};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
    key: 'test-route',
    name: 'TestScreen',
  }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }) => children,
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      signInWithPassword: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signUp: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  })),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Global fetch mock
global.fetch = jest.fn();

// Mock Alert
global.Alert = {
  alert: jest.fn(),
};

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

// Console error suppression for expected warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: Animated: `useNativeDriver`') ||
        args[0].includes('The current testing environment is not configured to support act') ||
        args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
