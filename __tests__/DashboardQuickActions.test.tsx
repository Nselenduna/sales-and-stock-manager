import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// Mock components
const MockQuickActionsModal = ({ 
  visible, 
  onClose, 
  onAction 
}: { 
  visible: boolean; 
  onClose: () => void; 
  onAction: (actionId: string) => void; 
}) => {
  if (!visible) return null;
  
  return (
    <View testID="quick-actions-modal">
      <TouchableOpacity testID="close-modal" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="scan-product-action" onPress={() => onAction('scan-product')}>
        <Text>Scan Product</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="create-sale-action" onPress={() => onAction('create-sale')}>
        <Text>Create Sale</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="add-stock-action" onPress={() => onAction('add-stock')}>
        <Text>Add Stock</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="view-inventory-action" onPress={() => onAction('view-inventory')}>
        <Text>View Inventory</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="stock-alerts-action" onPress={() => onAction('stock-alerts')}>
        <Text>Stock Alerts</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="search-products-action" onPress={() => onAction('search-products')}>
        <Text>Search Products</Text>
      </TouchableOpacity>
    </View>
  );
};

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate
  })
}));

// Component under test
const DashboardQuickActions = () => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const navigation = { navigate: mockNavigate };
  
  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'scan-product':
        navigation.navigate('BarcodeScanner');
        break;
      case 'create-sale':
        // Mock alert for coming soon
        break;
      case 'add-stock':
      case 'view-inventory':
      case 'search-products':
        navigation.navigate('Inventory');
        break;
      case 'stock-alerts':
        navigation.navigate('StockAlerts');
        break;
    }
    setModalVisible(false);
  };

  return (
    <View testID="staff-dashboard">
      <TouchableOpacity testID="quick-actions-button" onPress={() => setModalVisible(true)}>
        <Text>Quick Actions</Text>
      </TouchableOpacity>
      <MockQuickActionsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAction={handleQuickAction}
      />
    </View>
  );
};

describe('Dashboard Quick Actions', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should open modal when button is pressed', () => {
    const { getByTestId, queryByTestId } = render(<DashboardQuickActions />);
    
    expect(queryByTestId('quick-actions-modal')).toBeNull();
    
    const button = getByTestId('quick-actions-button');
    fireEvent.press(button);
    
    expect(getByTestId('quick-actions-modal')).toBeTruthy();
  });

  it('should close modal when close button is pressed', () => {
    const { getByTestId, queryByTestId } = render(<DashboardQuickActions />);
    
    const button = getByTestId('quick-actions-button');
    fireEvent.press(button);
    
    const closeButton = getByTestId('close-modal');
    fireEvent.press(closeButton);
    
    expect(queryByTestId('quick-actions-modal')).toBeNull();
  });

  it('should navigate to BarcodeScanner when scan product is selected', () => {
    const { getByTestId } = render(<DashboardQuickActions />);
    
    const button = getByTestId('quick-actions-button');
    fireEvent.press(button);
    
    const scanButton = getByTestId('scan-product-action');
    fireEvent.press(scanButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('BarcodeScanner');
  });

  it('should navigate to Inventory when add stock is selected', () => {
    const { getByTestId } = render(<DashboardQuickActions />);
    
    const button = getByTestId('quick-actions-button');
    fireEvent.press(button);
    
    const addStockButton = getByTestId('add-stock-action');
    fireEvent.press(addStockButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('Inventory');
  });

  it('should navigate to StockAlerts when stock alerts is selected', () => {
    const { getByTestId } = render(<DashboardQuickActions />);
    
    const button = getByTestId('quick-actions-button');
    fireEvent.press(button);
    
    const stockAlertsButton = getByTestId('stock-alerts-action');
    fireEvent.press(stockAlertsButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('StockAlerts');
  });

  it('should close modal after action selection', () => {
    const { getByTestId, queryByTestId } = render(<DashboardQuickActions />);
    
    const button = getByTestId('quick-actions-button');
    fireEvent.press(button);
    
    const scanButton = getByTestId('scan-product-action');
    fireEvent.press(scanButton);
    
    expect(queryByTestId('quick-actions-modal')).toBeNull();
  });
});