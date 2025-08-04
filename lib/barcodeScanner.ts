import { Alert, Platform } from 'react-native';

// Conditional imports to prevent crashes during development
let Camera: any;
let BarCodeScanner: any;
let Haptics: any;

try {
  Camera = require('expo-camera');
  BarCodeScanner = require('expo-barcode-scanner');
  Haptics = require('expo-haptics');
} catch (error) {
  console.warn('Native modules not available:', error);
  // Fallback implementations
  Camera = {
    requestCameraPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
    getCameraPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
  };
  BarCodeScanner = {
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
  };
  Haptics = {
    notificationAsync: () => Promise.resolve(),
    NotificationFeedbackType: {
      Success: 'success',
      Error: 'error',
      Warning: 'warning',
    },
  };
}

export interface BarcodeScanResult {
  success: boolean;
  barcode?: string;
  type?: string;
  error?: string;
}

export interface BarcodeValidationResult {
  isValid: boolean;
  type?: 'EAN-13' | 'UPC' | 'CODE-128' | 'CODE-39' | 'QR' | 'UNKNOWN';
  error?: string;
}

export interface ScannerOptions {
  enableHapticFeedback?: boolean;
  enableSound?: boolean;
  autoFocus?: boolean;
  flashMode?: 'off' | 'on' | 'auto' | 'torch';
  cameraType?: 'front' | 'back';
}

/**
 * Barcode Scanner utility for handling camera-based barcode scanning
 */
export class BarcodeScannerUtil {
  private static instance: BarcodeScannerUtil;
  private hasPermission: boolean = false;

  public static getInstance(): BarcodeScannerUtil {
    if (!BarcodeScannerUtil.instance) {
      BarcodeScannerUtil.instance = new BarcodeScannerUtil();
    }
    return BarcodeScannerUtil.instance;
  }

  /**
   * Request camera permissions for barcode scanning
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      this.hasPermission = status === 'granted';

      if (!this.hasPermission) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to scan barcodes. Please enable camera permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => this.openSettings() },
          ]
        );
      }

      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * Check if camera permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  /**
   * Validate barcode format and type
   */
  validateBarcode(barcode: string): BarcodeValidationResult {
    if (!barcode || barcode.trim().length === 0) {
      return {
        isValid: false,
        error: 'Barcode cannot be empty',
      };
    }

    const cleanBarcode = barcode.trim();

    // EAN-13 validation (13 digits)
    if (/^\d{13}$/.test(cleanBarcode)) {
      if (this.validateEAN13(cleanBarcode)) {
        return {
          isValid: true,
          type: 'EAN-13',
        };
      } else {
        return {
          isValid: false,
          type: 'EAN-13',
          error: 'Invalid EAN-13 checksum',
        };
      }
    }

    // UPC validation (12 digits)
    if (/^\d{12}$/.test(cleanBarcode)) {
      if (this.validateUPC(cleanBarcode)) {
        return {
          isValid: true,
          type: 'UPC',
        };
      } else {
        return {
          isValid: false,
          type: 'UPC',
          error: 'Invalid UPC checksum',
        };
      }
    }

    // CODE-128 validation (alphanumeric, 1-48 characters)
    if (/^[A-Za-z0-9]{1,48}$/.test(cleanBarcode)) {
      return {
        isValid: true,
        type: 'CODE-128',
      };
    }

    // CODE-39 validation (alphanumeric + special chars, 1-43 characters)
    if (/^[A-Z0-9\-\.\/\+\s]{1,43}$/.test(cleanBarcode)) {
      return {
        isValid: true,
        type: 'CODE-39',
      };
    }

    // QR Code validation (URLs, text, reasonable length)
    if (cleanBarcode.length > 0 && cleanBarcode.length <= 7089) {
      // Check if it looks like a URL or contains meaningful text
      const urlPattern = /^https?:\/\/.+/i;
      const textPattern = /^[a-zA-Z0-9\s\-_\.\/\?=&%#]+$/i;

      if (urlPattern.test(cleanBarcode) || textPattern.test(cleanBarcode)) {
        return {
          isValid: true,
          type: 'QR',
        };
      }
    }

    return {
      isValid: false,
      type: 'UNKNOWN',
      error: 'Unsupported barcode format',
    };
  }

  /**
   * Validate EAN-13 checksum
   */
  private validateEAN13(barcode: string): boolean {
    if (barcode.length !== 13) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits[12];

    // Calculate checksum (EAN-13 uses 1-3-1-3 pattern)
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheckDigit;
  }

  /**
   * Validate UPC checksum
   */
  private validateUPC(barcode: string): boolean {
    if (barcode.length !== 12) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits[11];

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheckDigit;
  }

  /**
   * Trigger haptic feedback for successful scan
   */
  async triggerHapticFeedback(
    type: 'success' | 'error' | 'warning' = 'success'
  ): Promise<void> {
    try {
      switch (type) {
        case 'success':
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
          break;
        case 'error':
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
          break;
        case 'warning':
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
          break;
      }
    } catch (error) {
      console.error('Error triggering haptic feedback:', error);
    }
  }

  /**
   * Process scanned barcode data
   */
  async processBarcodeScan(
    data: string,
    type: string,
    options: ScannerOptions = {}
  ): Promise<BarcodeScanResult> {
    try {
      // Validate barcode format
      const validation = this.validateBarcode(data);

      if (!validation.isValid) {
        if (options.enableHapticFeedback) {
          await this.triggerHapticFeedback('error');
        }

        return {
          success: false,
          error: validation.error || 'Invalid barcode format',
        };
      }

      // Trigger success haptic feedback
      if (options.enableHapticFeedback) {
        await this.triggerHapticFeedback('success');
      }

      return {
        success: true,
        barcode: data,
        type: validation.type,
      };
    } catch (error) {
      console.error('Error processing barcode scan:', error);

      if (options.enableHapticFeedback) {
        await this.triggerHapticFeedback('error');
      }

      return {
        success: false,
        error: 'Failed to process barcode scan',
      };
    }
  }

  /**
   * Get supported barcode types for scanner
   */
  getSupportedBarcodeTypes(): string[] {
    // Handle case where BarCodeScanner.Constants might be undefined
    if (!BarCodeScanner?.Constants?.BarCodeType) {
      return [
        'ean13',
        'upc_a',
        'code128',
        'code39',
        'qr',
        'codebar',
        'ean8',
        'upc_e',
      ];
    }

    return [
      BarCodeScanner.Constants.BarCodeType.ean13,
      BarCodeScanner.Constants.BarCodeType.upc_a,
      BarCodeScanner.Constants.BarCodeType.code128,
      BarCodeScanner.Constants.BarCodeType.code39,
      BarCodeScanner.Constants.BarCodeType.qr,
      BarCodeScanner.Constants.BarCodeType.codebar,
      BarCodeScanner.Constants.BarCodeType.ean8,
      BarCodeScanner.Constants.BarCodeType.upc_e,
    ];
  }

  /**
   * Get scanner configuration options
   */
  getScannerConfig(options: ScannerOptions = {}): any {
    return {
      barCodeTypes: this.getSupportedBarcodeTypes(),
      autoFocus: options.autoFocus ?? true,
      flashMode: options.flashMode ?? 'auto',
      cameraType: options.cameraType ?? 'back',
      onBarCodeScanned: undefined, // Will be set by the component
    };
  }

  /**
   * Open device settings for camera permissions
   */
  private openSettings(): void {
    if (Platform.OS === 'ios') {
      // iOS doesn't have a direct way to open settings from app
      Alert.alert(
        'Open Settings',
        'Please go to Settings > Privacy & Security > Camera and enable camera access for this app.',
        [{ text: 'OK' }]
      );
    } else {
      // Android - could use Linking.openSettings() if needed
      Alert.alert(
        'Open Settings',
        'Please go to Settings > Apps > [App Name] > Permissions and enable camera access.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Generate a mock barcode for testing
   */
  generateMockBarcode(
    type: 'EAN-13' | 'UPC' | 'CODE-128' | 'CODE-39' | 'QR' = 'EAN-13'
  ): string {
    switch (type) {
      case 'EAN-13':
        // Generate a valid EAN-13 barcode
        const ean13Base = '123456789012';
        const ean13CheckDigit = this.calculateEAN13CheckDigit(ean13Base);
        return ean13Base + ean13CheckDigit;

      case 'UPC':
        // Generate a valid UPC barcode
        const upcBase = '12345678901';
        const upcCheckDigit = this.calculateUPCCheckDigit(upcBase);
        return upcBase + upcCheckDigit;

      case 'CODE-128':
        return 'ABC123456789';

      case 'CODE-39':
        return 'ABC-123';

      case 'QR':
        return 'https://example.com/product/12345';

      default:
        return '1234567890123';
    }
  }

  /**
   * Calculate EAN-13 check digit
   */
  private calculateEAN13CheckDigit(barcode: string): number {
    const digits = barcode.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    return (10 - (sum % 10)) % 10;
  }

  /**
   * Calculate UPC check digit
   */
  private calculateUPCCheckDigit(barcode: string): number {
    const digits = barcode.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 11; i++) {
      sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }

    return (10 - (sum % 10)) % 10;
  }

  /**
   * Check if device supports barcode scanning
   */
  async isDeviceSupported(): Promise<boolean> {
    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        return granted;
      }
      return true;
    } catch (error) {
      console.error('Error checking device support:', error);
      return false;
    }
  }

  /**
   * Get scanner status information
   */
  async getScannerStatus(): Promise<{
    hasPermission: boolean;
    isSupported: boolean;
    cameraAvailable: boolean;
  }> {
    const hasPermission = await this.checkPermissions();
    const isSupported = await this.isDeviceSupported();

    return {
      hasPermission,
      isSupported,
      cameraAvailable: hasPermission && isSupported,
    };
  }
}

// Export singleton instance
export const barcodeScanner = BarcodeScannerUtil.getInstance();
