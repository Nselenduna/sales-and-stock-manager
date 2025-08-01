# Sales Screen Header Buttons

## Overview
The Sales screen header contains two action buttons on the right side:

## Button 1: Barcode Scanner (📱)
- **Purpose**: Scan product barcodes to quickly add items to cart
- **Icon**: Mobile phone emoji (📱) - represents barcode scanning
- **Function**: 
  - Checks camera permissions first
  - If granted: Opens barcode scanner screen
  - If denied: Shows permission request dialog with option to open device settings
- **Accessibility**: "Scan barcode to add product"

## Button 2: Sales History (🕐)
- **Purpose**: View past sales transactions and export data
- **Icon**: Clock emoji (🕐) - represents history/time
- **Function**: Navigates to SalesHistoryScreen
- **Accessibility**: "View sales history"

## Navigation Flow
```
Sales Screen
├── Back Button (←) → Returns to previous screen
├── Barcode Scanner (📱) → BarcodeScannerScreen (with permission check)
└── Sales History (🕐) → SalesHistoryScreen
```

## Camera Permission Handling
The barcode scanner button now includes proper permission handling:
1. Requests camera permission when tapped
2. If granted: Opens scanner
3. If denied: Shows helpful dialog with option to open device settings
4. Prevents the confusing "No access to camera" error screen 