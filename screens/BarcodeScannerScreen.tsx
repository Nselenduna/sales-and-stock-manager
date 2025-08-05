import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { barcodeScanner, BarcodeScanResult } from '../lib/barcodeScanner';
import Icon from '../components/Icon';

// Conditional imports to prevent crashes during development
let BarCodeScanner: {
  Constants: {
    BarCodeType: Record<string, string>;
  };
};
let Camera: {
  requestCameraPermissionsAsync: () => Promise<{ status: string }>;
  openSettingsAsync?: () => Promise<void>;
};

try {
  BarCodeScanner = require('expo-barcode-scanner');
  Camera = require('expo-camera');
} catch (error) {
  console.warn('Native modules not available for scanner screen:', error);
  // Fallback implementations
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
  Camera = {
    requestCameraPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
  };
}

const { width, height } = Dimensions.get('window');

interface BarcodeScannerScreenProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      onBarcodeScanned: (result: BarcodeScanResult) => void;
    };
  };
}

const BarcodeScannerScreen: React.FC<BarcodeScannerScreenProps> = ({
  navigation,
  route,
}) => {
  const { onBarcodeScanned } = route.params || {};
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto' | 'torch'>(
    'auto'
  );
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const scannerRef = useRef<unknown>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        
        if (status === 'denied') {
          console.warn('Camera permission denied by user');
        } else if (status === 'undetermined') {
          console.warn('Camera permission is undetermined');
        }
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return; // Prevent multiple scans

    setScanned(true);
    setScanning(true);

    try {
      // Process the scanned barcode
      const result = await barcodeScanner.processBarcodeScan(data, type, {
        enableHapticFeedback: true,
        autoFocus: true,
      });

      // Call the callback with the result if provided
      if (onBarcodeScanned) {
        onBarcodeScanned(result);
      }

      // Navigate back after a short delay to show the result
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error processing barcode scan:', error);
      Alert.alert('Scan Error', 'Failed to process barcode scan');
      setScanned(false);
    } finally {
      setScanning(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
  };

  const toggleFlash = () => {
    setFlashMode(prev => {
      switch (prev) {
        case 'off':
          return 'on';
        case 'on':
          return 'auto';
        case 'auto':
          return 'torch';
        case 'torch':
          return 'off';
        default:
          return 'auto';
      }
    });
  };

  const toggleCamera = () => {
    setCameraType(prev => (prev === 'back' ? 'front' : 'back'));
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'off':
        return 'flash-off';
      case 'on':
        return 'flash-on';
      case 'auto':
        return 'flash-auto';
      case 'torch':
        return 'flash-on';
      default:
        return 'flash-auto';
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size='large' color='#007AFF' />
          <Text style={styles.loadingText}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Icon name='camera-off' size={64} color='#FF3B30' />
          <Text style={styles.errorText}>Camera Access Required</Text>
          <Text style={styles.errorSubtext}>
            This app needs camera access to scan barcodes. Please enable camera permissions in your device settings.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                try {
                  await Camera.openSettingsAsync();
                } catch (error) {
                  console.error('Failed to open settings:', error);
                  Alert.alert(
                    'Settings Unavailable',
                    'Please manually enable camera permissions in your device settings.'
                  );
                }
              }}
            >
              <Text style={styles.buttonText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Check if native modules are available
  if (!BarCodeScanner || !Camera) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Icon name='alert-circle' size={64} color='#FF9500' />
          <Text style={styles.errorText}>Scanner Not Available</Text>
          <Text style={styles.errorSubtext}>
            Barcode scanner requires native modules that are not currently
            available. Please try restarting the development server.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BarCodeScanner
        ref={scannerRef}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.scanner}
        flashMode={flashMode}
        cameraType={cameraType}
        barCodeTypes={barcodeScanner.getSupportedBarcodeTypes()}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name='close' size={24} color='white' />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Scan Barcode</Text>

          <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
            <Icon name={getFlashIcon()} size={24} color='white' />
          </TouchableOpacity>
        </View>

        {/* Scanning Area */}
        <View style={styles.scanningArea}>
          <View style={styles.scanFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <Text style={styles.scanText}>Position barcode within the frame</Text>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
            <Icon name='camera-switch' size={24} color='white' />
            <Text style={styles.controlText}>Flip</Text>
          </TouchableOpacity>

          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={resetScanner}
            >
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name='close' size={24} color='white' />
            <Text style={styles.controlText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Overlay */}
        {scanning && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size='large' color='white' />
            <Text style={styles.loadingOverlayText}>Processing...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#007AFF',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  scanner: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderTopWidth: 3,
    borderLeftWidth: 3,
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    top: 'auto',
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    top: 'auto',
    bottom: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  scanText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
  },
  controlText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  scanAgainButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanAgainText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
});

export default BarcodeScannerScreen;
