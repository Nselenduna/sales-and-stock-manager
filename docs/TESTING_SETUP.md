# Testing Setup & Prompt Compliance

## Module: Testing Infrastructure
## Scope: Jest testing setup and prompt compliance validation
## Constraints:
- Comprehensive test coverage for all modules
- Prompt compliance validation
- Accessibility testing
- Performance testing

## Overview

This document describes the testing infrastructure for the Sales & Stocks Manager application, including Jest configuration, prompt compliance validation, and testing best practices.

## Test Structure

### **Prompt Compliance Tests**
Located in `__tests__/components/InventoryFormScreen.prompt.test.tsx`

These tests validate that components adhere to the specified prompt constraints:

#### **Navigation Logic Constraints**
- ✅ No direct navigation logic in components
- ✅ No useNavigation hook usage
- ✅ No external routing patterns
- ✅ Props-based navigation only

#### **Zustand Context Usage**
- ✅ Only local Zustand context usage
- ✅ No external stores or contexts
- ✅ Props for route parameters
- ✅ Defined inventory context boundaries

#### **Data Fetching Constraints**
- ✅ No unrelated sales data fetching
- ✅ Only inventory-related data
- ✅ No external API calls
- ✅ Supabase-only data access

#### **Side Effects Management**
- ✅ All side effects wrapped in testable functions
- ✅ No direct DOM manipulation
- ✅ Proper cleanup for side effects
- ✅ React Native component usage only

#### **Component Boundaries**
- ✅ No authentication logic
- ✅ No user management logic
- ✅ Focus on inventory form functionality
- ✅ Clear separation of concerns

## Running Tests

### **Install Dependencies**
```bash
npm install
```

### **Run All Tests**
```bash
npm test
```

### **Run Prompt Compliance Tests**
```bash
npm run test:prompt
```

### **Run Tests with Coverage**
```bash
npm run test:coverage
```

### **Watch Mode**
```bash
npm run test:watch
```

## Test Configuration

### **Jest Configuration (`jest.config.js`)**
- React Native preset
- TypeScript support
- Coverage thresholds (80%)
- Transform ignore patterns
- Test file matching

### **Jest Setup (`jest.setup.js`)**
- React Native component mocks
- Supabase client mocks
- Navigation mocks
- AsyncStorage mocks
- Console error suppression

## Test Coverage Requirements

### **Minimum Coverage Thresholds**
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### **Coverage Areas**
- `screens/**/*.{ts,tsx}`
- `components/**/*.{ts,tsx}`
- `store/**/*.{ts,tsx}`
- `lib/**/*.{ts,tsx}`

## Prompt Compliance Validation

### **What We Test**

#### **1. Navigation Logic Constraints**
```typescript
it('should not include direct navigation logic in component', () => {
  expect(screen.queryByTestId('nav-button')).toBeNull();
  expect(screen.queryByTestId('navigation-link')).toBeNull();
  expect(screen.queryByTestId('route-redirect')).toBeNull();
});
```

#### **2. Zustand Context Usage**
```typescript
it('uses only local Zustand context', () => {
  expect(mockUseAuthStore).toHaveBeenCalled();
  expect(mockUseAuthStore).toHaveBeenCalledTimes(1);
});
```

#### **3. Data Fetching Constraints**
```typescript
it('does not fetch unrelated sales data', async () => {
  expect(global.fetch).not.toHaveBeenCalledWith(
    expect.stringContaining('sales')
  );
});
```

#### **4. Component Boundaries**
```typescript
it('does not include authentication logic', () => {
  expect(screen.queryByText(/login/i)).toBeNull();
  expect(screen.queryByText(/sign in/i)).toBeNull();
});
```

### **Test Patterns**

#### **Mocking Strategy**
- **Navigation**: Mock navigation props
- **Zustand**: Mock store hooks
- **Supabase**: Mock client methods
- **External APIs**: Mock fetch calls

#### **Assertion Patterns**
- **Absence Testing**: Verify unwanted elements don't exist
- **Presence Testing**: Verify required elements exist
- **Function Calls**: Verify correct functions are called
- **State Management**: Verify proper state updates

## Accessibility Testing

### **WCAG AA Compliance**
- **Color Contrast**: Test high contrast ratios
- **Touch Targets**: Verify 44px minimum targets
- **Screen Reader**: Test accessibility labels
- **Keyboard Navigation**: Test keyboard accessibility

### **Accessibility Test Examples**
```typescript
it('has proper accessibility labels', () => {
  expect(screen.getByLabelText('Product Name')).toBeTruthy();
  expect(screen.getByLabelText('Save Product')).toBeTruthy();
});

it('has minimum touch target sizes', () => {
  const button = screen.getByTestId('save-button');
  expect(button.props.style.minHeight).toBeGreaterThanOrEqual(44);
});
```

## Performance Testing

### **Render Performance**
- **Component Mount Time**: < 100ms
- **Re-render Performance**: < 50ms
- **Memory Usage**: < 50MB
- **Bundle Size**: < 2MB

### **Performance Test Examples**
```typescript
it('renders within performance budget', () => {
  const startTime = performance.now();
  render(<InventoryFormScreen />);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(100);
});
```

## Continuous Integration

### **GitHub Actions Workflow**
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### **Pre-commit Hooks**
- **Lint Check**: ESLint validation
- **Type Check**: TypeScript compilation
- **Test Run**: Jest test execution
- **Coverage Check**: Coverage threshold validation

## Debugging Tests

### **Common Issues**

#### **1. Mock Not Working**
```typescript
// Ensure mocks are properly set up
jest.mock('../../store/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
```

#### **2. Async Test Failures**
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeTruthy();
});
```

#### **3. Component Not Rendering**
```typescript
// Check for missing dependencies
// Ensure all required props are provided
// Verify component exports are correct
```

### **Debug Commands**
```bash
# Run specific test with verbose output
npm test -- --verbose InventoryFormScreen.prompt.test.tsx

# Run tests with coverage and watch
npm run test:coverage -- --watch

# Debug specific test file
npm test -- --testNamePattern="Navigation Logic Constraints"
```

## Best Practices

### **Test Organization**
- **Group Related Tests**: Use describe blocks
- **Clear Test Names**: Descriptive test names
- **Setup and Teardown**: Use beforeEach/afterEach
- **Mock Isolation**: Reset mocks between tests

### **Assertion Best Practices**
- **Specific Assertions**: Test specific behavior
- **Error Messages**: Clear failure messages
- **Edge Cases**: Test boundary conditions
- **Integration Tests**: Test component interactions

### **Code Quality**
- **DRY Principle**: Avoid test code duplication
- **Test Data**: Use consistent test data
- **Mock Strategy**: Mock at appropriate level
- **Coverage**: Aim for meaningful coverage

## Future Enhancements

### **Planned Testing Features**
- **Visual Regression Testing**: Screenshot comparison
- **E2E Testing**: Detox integration
- **Performance Monitoring**: Real-time metrics
- **Accessibility Auditing**: Automated a11y checks

### **Testing Tools Integration**
- **Storybook**: Component story testing
- **Playwright**: Cross-platform testing
- **Cypress**: E2E testing
- **Lighthouse**: Performance auditing

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Development Team 