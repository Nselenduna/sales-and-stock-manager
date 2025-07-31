// Mock all expo modules before importing
jest.mock('expo-camera', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
}));

jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: {
    Constants: {
      BarCodeType: {
        ean13: 'ean13',
        upc_a: 'upc_a',
        code128: 'code128',
        code39: 'code39',
        qr: 'qr',
        codebar: 'codebar',
        ean8: 'ean8',
        upc_e: 'upc_e',
      },
    },
  },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Import after mocking
import { BarcodeScannerUtil, BarcodeValidationResult, BarcodeScanResult } from '../../lib/barcodeScanner';
import * as Camera from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

describe('BarcodeScanner', () => {
  let barcodeScanner: BarcodeScannerUtil;

  beforeEach(() => {
    jest.clearAllMocks();
    barcodeScanner = BarcodeScannerUtil.getInstance();
    
    // Reset singleton instance
    (BarcodeScannerUtil as any).instance = undefined;
    
    // Setup default mock implementations
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
      granted: true,
    });
    
    (Camera.getCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
      granted: true,
    });
    
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BarcodeScannerUtil.getInstance();
      const instance2 = BarcodeScannerUtil.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Barcode Validation', () => {
    it('should validate EAN-13 barcode format', () => {
      // Valid EAN-13 barcode (1234567890128) - with correct checksum
      const validEAN13 = '1234567890128';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(validEAN13);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('EAN-13');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid EAN-13 checksum', () => {
      // Invalid EAN-13 barcode (wrong checksum)
      const invalidEAN13 = '1234567890124';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(invalidEAN13);
      
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('EAN-13');
      expect(result.error).toBe('Invalid EAN-13 checksum');
    });

    it('should validate UPC barcode format', () => {
      // Valid UPC barcode (123456789012) - with correct checksum
      const validUPC = '123456789012';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(validUPC);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('UPC');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid UPC checksum', () => {
      // Invalid UPC barcode (wrong checksum)
      const invalidUPC = '123456789013';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(invalidUPC);
      
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('UPC');
      expect(result.error).toBe('Invalid UPC checksum');
    });

    it('should validate CODE-128 format', () => {
      const validCode128 = 'ABC123456789';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(validCode128);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('CODE-128');
      expect(result.error).toBeUndefined();
    });

    it('should validate CODE-39 format', () => {
      const validCode39 = 'ABC-123';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(validCode39);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('CODE-39');
      expect(result.error).toBeUndefined();
    });

    it('should validate QR code format', () => {
      const validQR = 'https://example.com/product/12345';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(validQR);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('QR');
      expect(result.error).toBeUndefined();
    });

    it('should reject empty barcode', () => {
      const emptyBarcode = '';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(emptyBarcode);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Barcode cannot be empty');
    });

    it('should reject unsupported format', () => {
      const unsupportedBarcode = '!@#$%^&*()';
      const result: BarcodeValidationResult = barcodeScanner.validateBarcode(unsupportedBarcode);
      
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('UNKNOWN');
      expect(result.error).toBe('Unsupported barcode format');
    });
  });

  describe('Mock Barcode Generation', () => {
    it('should generate valid EAN-13 mock barcode', () => {
      const mockEAN13 = barcodeScanner.generateMockBarcode('EAN-13');
      const result = barcodeScanner.validateBarcode(mockEAN13);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('EAN-13');
    });

    it('should generate valid UPC mock barcode', () => {
      const mockUPC = barcodeScanner.generateMockBarcode('UPC');
      const result = barcodeScanner.validateBarcode(mockUPC);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('UPC');
    });

    it('should generate valid CODE-128 mock barcode', () => {
      const mockCode128 = barcodeScanner.generateMockBarcode('CODE-128');
      const result = barcodeScanner.validateBarcode(mockCode128);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('CODE-128');
    });

    it('should generate valid CODE-39 mock barcode', () => {
      const mockCode39 = barcodeScanner.generateMockBarcode('CODE-39');
      const result = barcodeScanner.validateBarcode(mockCode39);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('CODE-39');
    });

    it('should generate valid QR mock barcode', () => {
      const mockQR = barcodeScanner.generateMockBarcode('QR');
      const result = barcodeScanner.validateBarcode(mockQR);
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('QR');
    });
  });

  describe('Barcode Processing', () => {
    it('should process valid barcode scan successfully', async () => {
      const validBarcode = '1234567890128'; // Valid EAN-13 with correct checksum
      const result: BarcodeScanResult = await barcodeScanner.processBarcodeScan(
        validBarcode,
        'ean13',
        { enableHapticFeedback: false }
      );
      
      expect(result.success).toBe(true);
      expect(result.barcode).toBe(validBarcode);
      expect(result.type).toBe('EAN-13');
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid barcode scan', async () => {
      const invalidBarcode = '!@#$%^&*()';
      const result: BarcodeScanResult = await barcodeScanner.processBarcodeScan(
        invalidBarcode,
        'unknown',
        { enableHapticFeedback: false }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported barcode format');
    });

    it('should handle processing errors gracefully', async () => {
      const result: BarcodeScanResult = await barcodeScanner.processBarcodeScan(
        '1234567890128', // Valid EAN-13
        'ean13',
        { enableHapticFeedback: false }
      );
      
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
    });

    it('should support QR + EAN fallback', async () => {
      // Test QR code processing
      const qrCode = 'https://example.com/product/12345';
      const qrResult: BarcodeScanResult = await barcodeScanner.processBarcodeScan(
        qrCode,
        'qr',
        { enableHapticFeedback: false }
      );
      
      expect(qrResult.success).toBe(true);
      expect(qrResult.type).toBe('QR');
      
      // Test EAN fallback
      const eanCode = '1234567890128';
      const eanResult: BarcodeScanResult = await barcodeScanner.processBarcodeScan(
        eanCode,
        'ean13',
        { enableHapticFeedback: false }
      );
      
      expect(eanResult.success).toBe(true);
      expect(eanResult.type).toBe('EAN-13');
    });
  });

  describe('Scanner Configuration', () => {
    it('should return supported barcode types', () => {
      const supportedTypes = barcodeScanner.getSupportedBarcodeTypes();
      
      expect(Array.isArray(supportedTypes)).toBe(true);
      expect(supportedTypes.length).toBeGreaterThan(0);
      expect(supportedTypes).toContain('ean13');
      expect(supportedTypes).toContain('qr');
    });

    it('should return scanner configuration', () => {
      const config = barcodeScanner.getScannerConfig({
        enableHapticFeedback: true,
        autoFocus: true,
        flashMode: 'auto',
        cameraType: 'back'
      });
      
      expect(config).toHaveProperty('barCodeTypes');
      expect(config).toHaveProperty('autoFocus');
      expect(config).toHaveProperty('flashMode');
      expect(config).toHaveProperty('cameraType');
    });
  });

  describe('Device Support', () => {
    it('should check device support status', async () => {
      const status = await barcodeScanner.getScannerStatus();
      
      expect(status).toHaveProperty('hasPermission');
      expect(status).toHaveProperty('isSupported');
      expect(status).toHaveProperty('cameraAvailable');
      expect(typeof status.hasPermission).toBe('boolean');
      expect(typeof status.isSupported).toBe('boolean');
      expect(typeof status.cameraAvailable).toBe('boolean');
    });

    it('should check if device is supported', async () => {
      const isSupported = await barcodeScanner.isDeviceSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('Permission Handling', () => {
    it('should check camera permissions', async () => {
      const hasPermission = await barcodeScanner.checkPermissions();
      expect(typeof hasPermission).toBe('boolean');
    });

    it('should request camera permissions', async () => {
      const granted = await barcodeScanner.requestPermissions();
      expect(typeof granted).toBe('boolean');
    });

    it('should handle permission denied', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        granted: false,
      });
      
      const granted = await barcodeScanner.requestPermissions();
      expect(granted).toBe(false);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should handle permission request errors', async () => {
      (Camera.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );
      
      const granted = await barcodeScanner.requestPermissions();
      expect(granted).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      const result = barcodeScanner.validateBarcode('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle processing errors gracefully', async () => {
      const result = await barcodeScanner.processBarcodeScan(
        '!@#$%^&*()',
        'unknown',
        { enableHapticFeedback: false }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle haptic feedback errors', async () => {
      (Haptics.notificationAsync as jest.Mock).mockRejectedValue(
        new Error('Haptic feedback failed')
      );
      
      const result = await barcodeScanner.processBarcodeScan(
        '1234567890128',
        'ean13',
        { enableHapticFeedback: true }
      );
      
      // Should still succeed even if haptic feedback fails
      expect(result.success).toBe(true);
    });
  });

  describe('Basic Functionality', () => {
    it('should be instantiated correctly', () => {
      expect(barcodeScanner).toBeDefined();
      expect(typeof barcodeScanner.validateBarcode).toBe('function');
      expect(typeof barcodeScanner.processBarcodeScan).toBe('function');
      expect(typeof barcodeScanner.requestPermissions).toBe('function');
    });

    it('should handle various barcode formats', () => {
      const testCases = [
        { barcode: '1234567890128', expectedType: 'EAN-13' }, // Valid checksum
        { barcode: '123456789012', expectedType: 'UPC' }, // Valid checksum
        { barcode: 'ABC123456789', expectedType: 'CODE-128' },
        { barcode: 'ABC-123', expectedType: 'CODE-39' },
        { barcode: 'https://example.com', expectedType: 'QR' },
      ];

      testCases.forEach(({ barcode, expectedType }) => {
        const result = barcodeScanner.validateBarcode(barcode);
        expect(result.type).toBe(expectedType);
      });
    });
  });

  describe('Real Barcode Scan and Fallback', () => {
    it('should handle real QR code scan', async () => {
      const realQRCode = 'https://supabase.co/storage/v1/object/public/product-images/12345.jpg';
      const result = await barcodeScanner.processBarcodeScan(
        realQRCode,
        'qr',
        { enableHapticFeedback: true }
      );
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('QR');
      expect(result.barcode).toBe(realQRCode);
    });

    it('should handle real EAN-13 scan with fallback', async () => {
      const realEAN13 = '9780201379624'; // Valid ISBN-13
      const result = await barcodeScanner.processBarcodeScan(
        realEAN13,
        'ean13',
        { enableHapticFeedback: true }
      );
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('EAN-13');
      expect(result.barcode).toBe(realEAN13);
    });

    it('should handle scan with invalid type but valid data', async () => {
      const validData = '1234567890128';
      const result = await barcodeScanner.processBarcodeScan(
        validData,
        'invalid_type',
        { enableHapticFeedback: false }
      );
      
      // Should still validate the data even if type is wrong
      expect(result.success).toBe(true);
      expect(result.type).toBe('EAN-13');
    });
  });
}); 