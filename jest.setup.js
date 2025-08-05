import '@testing-library/jest-native/extend-expect';

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

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    PanGestureHandler: View,
    State: {},
    gestureHandlerRootHOC: jest.fn((Component) => Component),
    GestureHandlerRootView: View,
    RectButton: View,
    BaseButton: View,
    createNativeWrapper: jest.fn((Component) => Component),
  };
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
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
    },
  })),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    View,
    createAnimatedComponent: jest.fn((Component) => Component),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn(),
    withTiming: jest.fn(),
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedGestureHandler: jest.fn(),
    Easing: {
      bezier: jest.fn(),
      linear: jest.fn(),
      ease: jest.fn(),
    },
  };
});

// Mock act for testing
global.act = (callback) => callback();

// Global fetch mock
global.fetch = jest.fn();

// Mock Alert
global.Alert = {
  alert: jest.fn(),
};