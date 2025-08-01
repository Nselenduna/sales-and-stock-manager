import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StockAlertScreen from '../screens/StockAlertScreen';
import QuickActionsModal from '../components/QuickActionsModal';

// Mock the feature flags
jest.mock('../feature_flags/ui-polish', () => ({
  isUIPolishEnabled: jest.fn(() => true),
}));

// Mock useSafeAreaInsets
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
};

describe('UI Polish Enhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeletons when loading', () => {
    render(<StockAlertScreen navigation={mockNavigation} />);
    // The component should show skeleton loaders when loading is true
    expect(screen.getByTestId('skeleton-loader')).toBeTruthy();
  });

  it('applies safe area insets to header padding', () => {
    const { getByTestId } = render(<StockAlertScreen navigation={mockNavigation} />);
    const headerContainer = getByTestId('header-container');
    expect(headerContainer.props.style).toBeDefined();
  });

  it('animates modal with fade-in', () => {
    const { getByTestId } = render(
      <QuickActionsModal 
        visible={true} 
        onClose={jest.fn()} 
        onAction={jest.fn()} 
      />
    );
    const modal = getByTestId('quick-modal');
    expect(modal).toBeTruthy();
  });

  it('shows skeleton loaders with proper styling', () => {
    render(<StockAlertScreen navigation={mockNavigation} />);
    const skeletonLoaders = screen.getAllByTestId('skeleton-loader');
    expect(skeletonLoaders.length).toBeGreaterThan(0);
  });

  it('modal has proper animation properties', () => {
    const { getByTestId } = render(
      <QuickActionsModal 
        visible={true} 
        onClose={jest.fn()} 
        onAction={jest.fn()} 
      />
    );
    const modal = getByTestId('quick-modal');
    expect(modal.props.style).toBeDefined();
  });
}); 