# InventoryFormScreen Module

## Module: InventoryFormScreen
## Scope: Add/edit product entries
## Constraints:
- DO NOT include auth logic, routing, or external navigation
- ONLY use props and Zustand state defined in inventory context
- All side effects must be wrapped and testable

## Overview

The `InventoryFormScreen` is a comprehensive form component for adding and editing product entries in the Sales & Stocks Manager application. It provides a multi-step form interface with role-based access control, offline support, and robust input validation.

## Key Features

### 🔐 **Role-Based Access Control**
- **Admin/Staff**: Full edit capabilities (add, edit, delete)
- **Viewer**: Read-only access to form data
- **Field Visibility**: Dynamic field rendering based on user permissions

### 📱 **Mobile-First Design**
- **Responsive Layout**: Optimized for mobile devices
- **Touch-Friendly**: Large touch targets and accessible controls
- **Keyboard Handling**: Proper keyboard avoidance and input management

### 🔄 **Offline-First Architecture**
- **Draft Saving**: Automatic local storage of form data
- **Network Status**: Real-time connectivity monitoring
- **Sync Indicators**: Visual feedback for data synchronization status

### 🎯 **Input Validation & Handling**
- **Decimal Input**: Robust handling of comma/period decimal separators
- **Numeric Validation**: Type-safe number input processing
- **Form Validation**: Comprehensive error checking and user feedback
- **SKU Generation**: Automatic SKU creation with duplicate checking

## Technical Implementation

### **Props Interface**
```typescript
interface InventoryFormScreenProps {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      productId?: string;
      initialData?: Partial<Product>;
    };
  };
}
```

### **State Management**
```typescript
interface FormData {
  name: string;
  sku: string;
  barcode?: string;
  quantity: number;
  low_stock_threshold: number;
  location?: string;
  unit_price?: number;
  description?: string;
  category?: string;
}
```

### **Key Functions**

#### **Input Handling**
- `handleNumericInput()`: Processes integer inputs with validation
- `handleDecimalInput()`: Handles decimal numbers with comma/period support
- `generateSKU()`: Creates unique SKU codes with duplicate checking

#### **Data Operations**
- `fetchProduct()`: Retrieves existing product data for editing
- `handleSave()`: Saves form data with validation and error handling
- `saveDraft()`: Stores form data locally for offline access

#### **Validation**
- `validateForm()`: Comprehensive form validation with error messages
- `checkNetworkStatus()`: Monitors connectivity for offline functionality

## Accessibility Features

### **WCAG AA Compliance**
- **Color Contrast**: High-contrast text and interactive elements
- **Touch Targets**: Minimum 44px touch targets for all interactive elements
- **Screen Reader**: Proper accessibility labels and descriptions
- **Keyboard Navigation**: Full keyboard accessibility support

### **Visual Indicators**
- **Error States**: Clear visual feedback for validation errors
- **Loading States**: Activity indicators for async operations
- **Success Feedback**: Confirmation messages for completed actions

## Testing Strategy

### **Unit Tests**
- **Input Validation**: Test all input handling functions
- **Form Submission**: Verify save operations and error handling
- **Role Access**: Test role-based field visibility and permissions

### **Integration Tests**
- **Navigation Flow**: Test form navigation and parameter passing
- **State Management**: Verify Zustand state updates and persistence
- **API Integration**: Test Supabase operations and error handling

### **E2E Tests**
- **User Workflows**: Complete add/edit product scenarios
- **Offline Behavior**: Test draft saving and network recovery
- **Accessibility**: Verify screen reader compatibility

## Error Handling

### **Input Errors**
- **Validation Errors**: Real-time form validation with user feedback
- **Network Errors**: Graceful handling of API failures
- **Permission Errors**: Clear messaging for unauthorized actions

### **Recovery Mechanisms**
- **Auto-Save**: Automatic draft saving to prevent data loss
- **Retry Logic**: Automatic retry for failed network operations
- **Fallback UI**: Graceful degradation for offline scenarios

## Performance Considerations

### **Optimization Techniques**
- **Debounced Input**: Prevents excessive state updates during typing
- **Lazy Loading**: Load form sections on demand
- **Memory Management**: Proper cleanup of event listeners and timers

### **Bundle Size**
- **Tree Shaking**: Only import required dependencies
- **Code Splitting**: Separate form logic from navigation
- **Asset Optimization**: Compressed images and optimized icons

## Future Enhancements

### **Planned Features**
- **Image Upload**: Real file picker integration
- **QR Scanning**: Camera-based barcode scanning
- **Auto-Complete**: Smart suggestions for product names and categories
- **Bulk Operations**: Multi-product editing capabilities

### **Technical Improvements**
- **TypeScript Strict Mode**: Enhanced type safety
- **Performance Monitoring**: Real-time performance metrics
- **A/B Testing**: Feature flag support for gradual rollouts

## Dependencies

### **Core Dependencies**
- `react-native`: Core mobile framework
- `@react-navigation/native`: Navigation integration
- `zustand`: State management
- `@supabase/supabase-js`: Backend API client

### **UI Dependencies**
- `react-native-safe-area-context`: Safe area handling
- `react-native-vector-icons`: Icon library (if needed)

## Development Guidelines

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting standards
- **Jest**: Unit and integration testing

### **Git Workflow**
- **Feature Branches**: Separate branches for new features
- **Pull Requests**: Code review required for all changes
- **Commit Messages**: Conventional commit format
- **Version Tags**: Semantic versioning for releases

## Troubleshooting

### **Common Issues**
1. **Decimal Input Problems**: Check `handleDecimalInput` function
2. **Navigation Errors**: Verify route parameter structure
3. **Permission Denied**: Check user role and RLS policies
4. **Network Timeouts**: Implement retry logic and offline fallback

### **Debug Tools**
- **React Native Debugger**: For state inspection
- **Flipper**: For network and performance monitoring
- **Console Logs**: Debug logging for input handling
- **Error Boundaries**: Graceful error handling and reporting

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Development Team 