# Receipt Management Documentation

## Overview

The receipt management system provides comprehensive functionality for viewing, searching, and reprinting receipts for past transactions. This system is built with TypeScript for type safety and follows React Native best practices.

## Features

### 1. Receipt Storage and Retrieval
- **Secure Storage**: Receipts are stored both locally (AsyncStorage) and remotely (Supabase)
- **Offline Access**: Receipts can be accessed even when offline using local storage
- **Data Synchronization**: Automatic synchronization between local and remote storage
- **Price Conversion**: Automatic conversion between storage format (pence) and display format (pounds)

### 2. Receipt Viewing (`ReceiptScreen`)
- **Full Receipt Display**: Complete receipt with all transaction details
- **Multiple Formats**: Support for text and HTML receipt formats
- **Loading States**: Proper loading indicators and error handling
- **Navigation**: Easy navigation back to transaction history

### 3. Search and Filtering (`SalesHistoryScreen`)
- **Multi-field Search**: Search by transaction ID, customer name, email, or product name
- **Real-time Filtering**: Instant search results as you type
- **Case-insensitive**: Search works regardless of case
- **Combined Filters**: Search can be combined with status filters
- **Clear Search**: Easy-to-use clear search functionality

### 4. Export and Sharing
- **Text Export**: Plain text receipts for basic sharing
- **HTML Export**: Formatted HTML receipts for professional presentation
- **File Sharing**: Integration with device sharing capabilities
- **Email Support**: Easy sharing via email or messaging apps

## Technical Implementation

### File Structure
```
├── screens/sales/
│   ├── ReceiptScreen.tsx          # Individual receipt viewer
│   └── SalesHistoryScreen.tsx     # Enhanced with search functionality
├── hooks/
│   └── useSales.ts               # Enhanced sales operations
├── lib/
│   └── receiptGenerator.ts       # Receipt formatting (existing)
└── __tests__/
    ├── screens/
    │   ├── ReceiptScreen.test.tsx
    │   └── SalesHistoryScreen.test.tsx
    └── hooks/
        └── useSales.test.tsx
```

### Key Components

#### ReceiptScreen
```typescript
interface ReceiptScreenProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      transactionId: string;
    };
  };
}
```

**Features:**
- Loads transaction data from local storage or Supabase
- Generates formatted receipts using existing receiptGenerator
- Supports text and HTML export formats
- Handles loading states and error conditions
- Provides share functionality via Expo FileSystem and Sharing

#### Enhanced SalesHistoryScreen
```typescript
interface SalesHistoryScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}
```

**New Features:**
- Search input with placeholder text
- Real-time search filtering
- Clear search button
- Combined search and status filtering
- Navigation to ReceiptScreen

#### Enhanced useSales Hook
```typescript
interface UseSalesReturn {
  // ... existing properties
  generateReceipt: (transactionId: string) => Promise<string>;
}
```

**Improvements:**
- Fixed receipt generation integration
- Better error handling
- Proper TypeScript types
- Local storage fallback for offline access

### Data Flow

1. **Transaction Creation**: When a sale is completed, receipt data is stored in both local storage and Supabase
2. **Search**: Users can search for receipts in the SalesHistoryScreen using multiple criteria
3. **Viewing**: Selecting a transaction navigates to ReceiptScreen with the transaction ID
4. **Loading**: ReceiptScreen loads data from local storage first, then falls back to Supabase
5. **Display**: Receipt is generated using the existing receiptGenerator library
6. **Export**: Users can export receipts in text or HTML format and share them

### Security Considerations

- **Data Validation**: All input is sanitized and validated
- **Local Storage**: Sensitive data is stored securely using AsyncStorage
- **Network Security**: All Supabase communications use HTTPS
- **Type Safety**: Full TypeScript coverage prevents runtime errors

## Usage Guide

### Viewing Receipts
1. Navigate to Sales History
2. Browse or search for the desired transaction
3. Tap on a transaction to view its receipt
4. Use the export buttons to share or save the receipt

### Searching for Receipts
1. In Sales History, use the search bar at the top
2. Type any of the following:
   - Transaction ID (partial or full)
   - Customer name
   - Customer email
   - Product name
3. Results filter automatically as you type
4. Use the clear button (X) to reset the search

### Exporting Receipts
1. From the ReceiptScreen, choose export option:
   - **Share Text**: Plain text format for basic sharing
   - **Export HTML**: Formatted HTML for professional presentation
2. Choose sharing method (email, messaging, etc.)
3. Receipt file is automatically generated and shared

### Filtering by Status
1. In Sales History, use the filter buttons below the header
2. Choose from: All, Synced, Queued, Failed
3. Combine with search for more specific results

## Testing

### Test Coverage
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interactions and data flow
- **Error Handling**: Edge cases and error conditions
- **TypeScript**: Compile-time type checking

### Running Tests
```bash
# Run all receipt-related tests
npm test -- __tests__/screens/ReceiptScreen.test.tsx
npm test -- __tests__/screens/SalesHistoryScreen.test.tsx
npm test -- __tests__/hooks/useSales.test.tsx

# Run all tests
npm test
```

### Test Scenarios
- Receipt loading from local storage and Supabase
- Search functionality with various criteria
- Export functionality in different formats
- Error handling for missing transactions
- Navigation between screens
- Loading states and user feedback

## Troubleshooting

### Common Issues

**Receipt not found:**
- Check if transaction exists in local storage
- Verify Supabase connection
- Ensure transaction ID is correct

**Search not working:**
- Verify search input is not empty
- Check if transactions have required fields (customer_name, etc.)
- Ensure case-insensitive search is working

**Export failing:**
- Check device permissions for file access
- Verify sharing capability is available
- Ensure sufficient storage space

**Navigation issues:**
- Verify navigation parameters are correct
- Check if ReceiptScreen route is properly configured
- Ensure navigation prop is passed correctly

### Performance Considerations

- **Large Transaction Lists**: Virtualized lists handle thousands of transactions efficiently
- **Search Performance**: Debounced search input prevents excessive filtering
- **Memory Usage**: Lazy loading and proper cleanup prevent memory leaks
- **Offline Performance**: Local storage provides fast access when offline

## Future Enhancements

### Planned Features
- **PDF Export**: Generate PDF receipts for professional sharing
- **Email Integration**: Direct email sending with receipt attachments
- **Batch Operations**: Select and export multiple receipts at once
- **Receipt Templates**: Customizable receipt formats
- **Print Support**: Direct printing to connected printers

### Technical Improvements
- **Caching**: Intelligent caching for frequently accessed receipts
- **Compression**: Compress receipt data for efficient storage
- **Indexing**: Database indexing for faster search operations
- **Analytics**: Track receipt viewing and sharing patterns

## API Reference

### ReceiptScreen Props
```typescript
interface ReceiptScreenProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      transactionId: string;
    };
  };
}
```

### Search Functions
```typescript
// Search by multiple criteria
const searchTransactions = (
  transactions: SalesTransaction[],
  query: string
) => SalesTransaction[];

// Apply status filter
const filterByStatus = (
  transactions: SalesTransaction[],
  status: string
) => SalesTransaction[];
```

### Export Functions
```typescript
// Generate and share receipt
const shareReceipt = (
  transaction: SalesTransaction,
  format: 'text' | 'html'
) => Promise<void>;

// Generate receipt text
const generateReceiptText = (
  receiptData: ReceiptData
) => string;
```

## Contributing

When contributing to the receipt management system:

1. **Follow TypeScript**: Use proper types and interfaces
2. **Add Tests**: Include tests for all new functionality
3. **Update Documentation**: Keep this documentation current
4. **Performance**: Consider performance impact of changes
5. **Accessibility**: Ensure components are accessible
6. **Error Handling**: Implement proper error handling

## Related Documentation

- [Sales Module Documentation](../sales/README.md)
- [Database Schema](../database/schema.md)
- [API Documentation](../api/README.md)
- [Testing Guidelines](../testing/README.md)