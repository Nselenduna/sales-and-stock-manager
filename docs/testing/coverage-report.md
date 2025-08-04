# Test Coverage Report and Guidelines

## Current Coverage Status

### Global Coverage Metrics
```
Statements   : 80.2% (Target: 80%)  ✅
Branches     : 72.1% (Target: 70%)  ✅
Functions    : 76.3% (Target: 75%)  ✅
Lines        : 81.5% (Target: 80%)  ✅
```

### Coverage by Module

#### 🟢 Well Covered (>85%)
- **Hooks** (`hooks/`)
  - `useSalesCart.ts`: 98.2%
  - `useDebounce.ts`: 95.4%
  - `useSyncFeedback.ts`: 87.1%

- **Utilities** (`lib/`)
  - `sanitize.ts`: 96.8%
  - `SyncQueueManager.ts`: 89.7%
  - `imageUploader.ts`: 86.8%

#### 🟡 Moderate Coverage (60-85%)
- **Components** (`components/`)
  - `ProductCard.tsx`: 78.3%
  - `SearchBar.tsx`: 72.1%
  - `PaymentSelector.tsx`: 68.9%

- **Libraries** (`lib/`)
  - `barcodeScanner.ts`: 77.8%

#### 🔴 Needs Improvement (<60%)
- **Screens** (`screens/`)
  - Most screens: 0-15% (newly added tests should improve this)
  - Priority: `SalesScreen.tsx`, `LoginScreen.tsx`, `InventoryListScreen.tsx`

- **Store** (`store/`)
  - `authStore.ts`: 0% (needs comprehensive testing)

### Test Type Distribution

| Test Type | Count | Coverage | Status |
|-----------|-------|----------|--------|
| Unit Tests | 145 | 82% | ✅ Good |
| Integration Tests | 25 | 78% | 🟡 Improving |
| Security Tests | 32 | 95% | ✅ Excellent |
| Performance Tests | 18 | 85% | ✅ Good |
| E2E Tests | 12 | 70% | 🟡 Improving |

## Coverage Improvement Plan

### Priority 1: Critical Components (Week 1-2)
1. **Authentication Store** (`store/authStore.ts`)
   - Target: 90% coverage
   - Focus: Sign in/out, session management, role handling

2. **Sales Screen** (`screens/sales/SalesScreen.tsx`)
   - Target: 85% coverage
   - Focus: Cart operations, checkout flow, payment processing

3. **Inventory Management** (`screens/inventory/`)
   - Target: 80% coverage
   - Focus: CRUD operations, stock updates, validation

### Priority 2: User Interface Components (Week 3-4)
1. **Navigation Components**
   - Dashboard screens (Admin, Staff, Viewer)
   - Navigation between screens

2. **Form Components**
   - Input validation
   - Error handling
   - Data submission

### Priority 3: Edge Cases and Error Scenarios (Week 5-6)
1. **Network Error Handling**
2. **Offline Functionality**
3. **Data Corruption Recovery**
4. **Permission Boundary Testing**

## Coverage Reporting

### Generating Reports
```bash
# Generate full coverage report
npm run test:coverage

# Generate coverage for specific directory
npm run test:coverage -- __tests__/screens/

# Generate HTML report
npm run test:coverage -- --coverageReporters=html

# Generate JSON report for CI
npm run test:coverage -- --coverageReporters=json
```

### Reading Coverage Reports

#### Console Output
```
=============================== Coverage summary ===============================
Statements   : 80.25% ( 1205/1502 )
Branches     : 72.15% ( 387/536 )
Functions    : 76.32% ( 145/190 )
Lines        : 81.50% ( 1156/1418 )
==================================================================================
```

#### HTML Report
- Location: `coverage/lcov-report/index.html`
- Provides detailed line-by-line coverage
- Interactive navigation through files
- Highlights uncovered code segments

#### JSON Report
- Location: `coverage/coverage-final.json`
- Machine-readable format for CI/CD
- Detailed metrics per file

### Coverage Badges
```markdown
![Coverage](https://img.shields.io/badge/coverage-80.2%25-brightgreen)
![Statements](https://img.shields.io/badge/statements-80.2%25-brightgreen)
![Branches](https://img.shields.io/badge/branches-72.1%25-green)
![Functions](https://img.shields.io/badge/functions-76.3%25-green)
![Lines](https://img.shields.io/badge/lines-81.5%25-brightgreen)
```

## File-Level Coverage Analysis

### High Priority Files (Business Critical)

#### Authentication (`store/authStore.ts`)
```
Current: 0% | Target: 90% | Priority: 🔴 Critical
```
**Missing Coverage:**
- Sign in/out methods
- Session validation
- Role-based access control
- Token refresh logic

**Recommended Tests:**
```typescript
describe('AuthStore', () => {
  describe('Authentication', () => {
    it('should sign in user with valid credentials');
    it('should handle sign in errors gracefully');
    it('should validate session tokens');
  });
  
  describe('Authorization', () => {
    it('should enforce role-based access');
    it('should prevent privilege escalation');
  });
});
```

#### Sales Processing (`screens/sales/SalesScreen.tsx`)
```
Current: 15% | Target: 85% | Priority: 🔴 Critical
```
**Missing Coverage:**
- Cart management operations
- Checkout process validation
- Payment method selection
- Receipt generation

#### Inventory Management (`screens/inventory/InventoryListScreen.tsx`)
```
Current: 8% | Target: 80% | Priority: 🔴 Critical
```
**Missing Coverage:**
- Product CRUD operations
- Stock level validations
- Search and filtering
- Bulk operations

### Medium Priority Files

#### Component Libraries (`components/`)
```
Average: 65% | Target: 80% | Priority: 🟡 Medium
```
**Focus Areas:**
- User interaction handling
- Props validation
- Error state rendering
- Accessibility features

#### Utility Functions (`lib/`)
```
Average: 75% | Target: 85% | Priority: 🟡 Medium
```
**Well Covered:**
- `sanitize.ts`: 96.8% ✅
- `SyncQueueManager.ts`: 89.7% ✅

**Needs Improvement:**
- `receiptGenerator.ts`: 0%
- `errorHandler.ts`: 0%
- `utils.ts`: 0%

## Coverage Quality Guidelines

### What Makes Good Coverage

#### ✅ Good Coverage Example
```typescript
describe('calculateTotal', () => {
  it('calculates total for single item', () => {
    expect(calculateTotal([{price: 10, quantity: 2}])).toBe(20);
  });
  
  it('calculates total for multiple items', () => {
    const items = [
      {price: 10, quantity: 2},
      {price: 5, quantity: 3}
    ];
    expect(calculateTotal(items)).toBe(35);
  });
  
  it('handles empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
  
  it('handles invalid data gracefully', () => {
    expect(calculateTotal([{price: null, quantity: 2}])).toBe(0);
  });
});
```

#### ❌ Poor Coverage Example
```typescript
describe('calculateTotal', () => {
  it('works', () => {
    expect(calculateTotal([{price: 10, quantity: 2}])).toBe(20);
  });
});
```

### Coverage Anti-Patterns to Avoid

1. **Testing Implementation Details**
   ```typescript
   // Bad - testing internal state
   expect(component.state.internalValue).toBe(5);
   
   // Good - testing behavior
   expect(screen.getByText('Total: $5.00')).toBeVisible();
   ```

2. **Shallow Testing for Coverage**
   ```typescript
   // Bad - just calling functions for coverage
   it('calls function', () => {
     myFunction();
   });
   
   // Good - testing behavior and outcomes
   it('should update inventory when function called', () => {
     myFunction(productId, newQuantity);
     expect(mockUpdateInventory).toHaveBeenCalledWith(productId, newQuantity);
   });
   ```

3. **Ignoring Error Paths**
   ```typescript
   // Bad - only testing happy path
   it('should create user', () => {
     createUser(validData);
     expect(mockApi).toHaveBeenCalled();
   });
   
   // Good - testing both success and failure
   it('should create user successfully', () => { /* happy path */ });
   it('should handle creation errors', () => { /* error path */ });
   ```

## Coverage Monitoring and CI Integration

### GitHub Actions Configuration
```yaml
name: Test Coverage
on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests with coverage
        run: npm run test:coverage
        
      - name: Check coverage thresholds
        run: |
          if ! npm run test:coverage -- --passWithNoTests; then
            echo "Coverage below threshold"
            exit 1
          fi
          
      - name: Upload to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Coverage Trend Monitoring
Track coverage trends over time:
- Weekly coverage reports
- Alert on coverage decreases >2%
- Celebrate coverage improvements
- Include coverage in PR reviews

### Team Coverage Goals
- **Q1 2024**: Achieve 80% overall coverage ✅
- **Q2 2024**: Achieve 85% overall coverage (In Progress)
- **Q3 2024**: Achieve 90% critical path coverage
- **Q4 2024**: Maintain >85% with new features

## Troubleshooting Coverage Issues

### Common Coverage Problems

1. **Files Not Being Counted**
   ```javascript
   // Add to jest.config.js collectCoverageFrom
   collectCoverageFrom: [
     'src/**/*.{ts,tsx}',
     '!src/**/*.d.ts',
     '!src/**/index.ts'
   ]
   ```

2. **False Negatives in Coverage**
   ```typescript
   // Use istanbul ignore comments sparingly
   /* istanbul ignore next */
   if (process.env.NODE_ENV === 'development') {
     debugLog('Development mode');
   }
   ```

3. **Async Code Not Covered**
   ```typescript
   // Ensure async operations complete
   await waitFor(() => {
     expect(asyncResult).toBeDefined();
   });
   ```

---

**Report Generated**: [Current Date]  
**Next Update**: Weekly (Automated)  
**Full Review**: Monthly