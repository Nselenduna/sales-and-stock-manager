## Module: QR Code Scanner

### Objective
Use camera to scan barcodes, validate format, and auto-populate product data.

### Scope
- Request camera permission
- Scan barcodes (EAN-13, UPC)
- Trigger haptic feedback on success
- Validate format before applying
- Handle errors with toast/modal

### Extras
- Button to re-scan
- Screen overlay for accessibility

### Acceptance
- ✅ Valid scans match product
- ✅ Invalid scans show error
- ✅ Works on mobile with permission handling
