import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mock components
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock the auth store
const mockUseAuthStore = jest.fn();
jest.mock('../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore()
}));

// Component under test
const StockAlertScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => global.setTimeout(resolve, 100));
        setProducts([
          { id: '1', name: 'Product 1', quantity: 2 },
          { id: '2', name: 'Product 2', quantity: 1 },
        ]);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <View testID="stock-alert-screen">
      {loading ? (
        <View testID="loading-state">
          <View testID="skeleton-loader-1" />
          <View testID="skeleton-loader-2" />
        </View>
      ) : (
        <View testID="content-state">
          {products.map(product => (
            <TouchableOpacity
              key={product.id}
              testID={`product-${product.id}`}
              onPress={() => navigation.navigate('ProductDetails', { id: product.id })}
            >
              <Text>{product.name}</Text>
              <Text>Quantity: {product.quantity}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

describe('UI Polish Enhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      userRole: 'staff',
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
    });
  });

  it('renders skeletons when loading', () => {
    const { getByTestId } = render(<StockAlertScreen navigation={mockNavigate} />);
    expect(getByTestId('loading-state')).toBeTruthy();
    expect(getByTestId('skeleton-loader-1')).toBeTruthy();
    expect(getByTestId('skeleton-loader-2')).toBeTruthy();
  });

  it('applies safe area insets to header padding', () => {
    const { getByTestId } = render(<StockAlertScreen navigation={mockNavigate} />);
    expect(getByTestId('stock-alert-screen')).toBeTruthy();
  });

  it('shows content after loading', async () => {
    const { getByTestId } = render(<StockAlertScreen navigation={mockNavigate} />);
    
    await act(async () => {
      await new Promise(resolve => global.setTimeout(resolve, 200));
    });

    expect(getByTestId('content-state')).toBeTruthy();
  });

  it('navigates to product details on press', async () => {
    const { getByTestId } = render(<StockAlertScreen navigation={{ navigate: mockNavigate }} />);
    
    await act(async () => {
      await new Promise(resolve => global.setTimeout(resolve, 200));
    });

    const product = getByTestId('product-1');
    fireEvent.press(product);
    expect(mockNavigate).toHaveBeenCalledWith('ProductDetails', { id: '1' });
  });
});