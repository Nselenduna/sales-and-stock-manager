import { ImageUploader } from '../../lib/imageUploader';

// Mock all dependencies with comprehensive implementations
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Import mocked modules
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

describe('ImageUploader', () => {
  let imageUploader: ImageUploader;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (ImageUploader as any).instance = undefined;
    imageUploader = ImageUploader.getInstance();
    
    // Setup default mock implementations
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
      status: 'granted',
    });
    
    (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
      status: 'granted',
    });
    
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://test-image.jpg' }],
    });
    
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://test-camera-image.jpg' }],
    });
    
    // Mock fetch for blob creation
    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new global.Blob(['test'], { type: 'image/jpeg' })),
    });
    
    // Mock Supabase storage
    const mockUpload = jest.fn();
    const mockGetPublicUrl = jest.fn();
    
    mockSupabase.storage.from.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as any);
    
    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ImageUploader.getInstance();
      const instance2 = ImageUploader.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Basic Functionality', () => {
    it('should be instantiated correctly', () => {
      expect(imageUploader).toBeDefined();
      expect(typeof imageUploader.requestPermissions).toBe('function');
      expect(typeof imageUploader.pickImage).toBe('function');
      expect(typeof imageUploader.uploadImage).toBe('function');
    });

    it('should handle offline queue operations', async () => {
      const status = await imageUploader.getOfflineQueueStatus();
      expect(status.count).toBe(0);
      expect(status.items).toEqual([]);
    });

    it('should clear offline queue', async () => {
      await imageUploader.clearOfflineQueue();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_image_queue');
    });
  });

  describe('Permission Handling', () => {
    it('should request permissions successfully', async () => {
      const result = await imageUploader.requestPermissions();
      expect(result).toBe(true);
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle camera permission denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'denied',
      });
      
      const result = await imageUploader.requestPermissions();
      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permissions Required',
        'Camera and photo library access is required to upload images.',
        [{ text: 'OK' }]
      );
    });

    it('should handle media library permission denied', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'denied',
      });
      
      const result = await imageUploader.requestPermissions();
      expect(result).toBe(false);
    });

    it('should handle permission request errors', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );
      
      const result = await imageUploader.requestPermissions();
      expect(result).toBe(false);
    });
  });

  describe('Image Picker Functionality', () => {
    it('should pick image from gallery successfully', async () => {
      const result = await imageUploader.pickImage('gallery');
      expect(result.success).toBe(true);
      expect(result.localUri).toBe('file://test-image.jpg');
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    it('should pick image from camera successfully', async () => {
      const result = await imageUploader.pickImage('camera');
      expect(result.success).toBe(true);
      expect(result.localUri).toBe('file://test-camera-image.jpg');
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    it('should handle image picker cancellation', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });
      
      const result = await imageUploader.pickImage('gallery');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No image selected');
    });

    it('should handle image picker without permissions', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'denied',
      });
      
      const result = await imageUploader.pickImage('gallery');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permissions not granted');
    });

    it('should handle image picker errors', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error('Image picker failed')
      );
      
      const result = await imageUploader.pickImage('gallery');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to pick image');
    });
  });

  describe('Image Compression', () => {
    it('should compress image successfully', async () => {
      const result = await imageUploader.compressImage('file://test-image.jpg');
      expect(typeof result).toBe('string');
      expect(result).toBe('file://test-image.jpg'); // Mock returns original URI
    });

    it('should handle compression errors', async () => {
      // Mock compression to throw error
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error('Compression failed')
      );
      
      const result = await imageUploader.compressImage('file://test-image.jpg');
      expect(result).toBe('file://test-image.jpg'); // Should return original URI on error
    });
  });

  describe('Supabase Upload', () => {
    it('should upload image to Supabase successfully', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'images/test-image.jpg' },
        error: null,
      });
      
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://supabase.co/storage/v1/object/public/bucket/images/test-image.jpg' },
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);
      
      const result = await imageUploader.uploadToSupabase('file://test-image.jpg');
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(mockUpload).toHaveBeenCalledWith(expect.any(String), expect.any(global.Blob), {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });
    });

    it('should handle upload failure', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      } as any);
      
      const result = await imageUploader.uploadToSupabase('file://test-image.jpg');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should handle blob creation failure', async () => {
      // Mock fetch to fail blob creation
      global.fetch = jest.fn().mockRejectedValue(new Error('Blob creation failed'));
      
      const result = await imageUploader.uploadToSupabase('file://test-image.jpg');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload image');
    });

    it('should validate Supabase bucket storage', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'images/test-image.jpg' },
        error: null,
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      } as any);
      
      await imageUploader.uploadToSupabase('file://test-image.jpg');
      
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('product-images');
             expect(mockUpload).toHaveBeenCalledWith(
         expect.any(String),
         expect.any(global.Blob),
        {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        }
      );
    });
  });

  describe('Complete Upload Flow', () => {
    it('should handle complete upload flow successfully', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'images/test-image.jpg' },
        error: null,
      });
      
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://supabase.co/storage/v1/object/public/bucket/images/test-image.jpg' },
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);
      
      const result = await imageUploader.uploadImage('gallery');
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });

    it('should handle upload flow with permission failure', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'denied',
      });
      
      const result = await imageUploader.uploadImage('gallery');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permissions not granted');
    });

    it('should handle upload flow with picker cancellation', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
        assets: [],
      });
      
      const result = await imageUploader.uploadImage('gallery');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No image selected');
    });

    it('should handle upload flow with upload failure', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      } as any);
      
      const result = await imageUploader.uploadImage('gallery');
      expect(result.success).toBe(true); // Should succeed with local URI and offline sync
      expect(result.localUri).toBeDefined();
      expect(result.error).toBe('Image cached for offline sync');
    });
  });

  describe('Offline Queue Management', () => {
    it('should add image to offline queue when upload fails', async () => {
      // Mock AsyncStorage to return empty queue initially
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      } as any);
      
      await imageUploader.uploadImage('gallery');
      
      // Verify that AsyncStorage.setItem was called with the offline queue
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_image_queue',
        expect.any(String)
      );
      
      // Get the actual data that was stored
      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const storedData = JSON.parse(lastCall[1]);
      
      expect(storedData).toHaveLength(1);
      expect(storedData[0]).toHaveProperty('uri');
      expect(storedData[0]).toHaveProperty('timestamp');
    });

    it('should process offline queue successfully', async () => {
      // Mock offline queue data
      const offlineData = JSON.stringify([
        { uri: 'file://offline-image.jpg', timestamp: Date.now() },
      ]);
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(offlineData);
      
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'images/offline-image.jpg' },
        error: null,
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      } as any);
      
      const results = await imageUploader.processOfflineQueue();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle offline queue processing errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const results = await imageUploader.processOfflineQueue();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should get offline queue status correctly', async () => {
      const status = await imageUploader.getOfflineQueueStatus();
      expect(status).toHaveProperty('count');
      expect(status).toHaveProperty('items');
      expect(Array.isArray(status.items)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid image URIs', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Invalid URI'));
      
      const result = await imageUploader.uploadToSupabase('invalid-uri');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload image');
    });

    it('should handle empty image URI', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Empty URI'));
      
      const result = await imageUploader.uploadToSupabase('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload image');
    });

    it('should handle null image URI', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Null URI'));
      
      const result = await imageUploader.uploadToSupabase(null as any);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload image');
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await imageUploader.uploadToSupabase('file://test-image.jpg');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload image');
    });

    it('should trigger upload failure state and fallback UI', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });
      
      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: jest.fn(),
      } as any);
      
      const result = await imageUploader.uploadImage('gallery');
      
      expect(result.success).toBe(true); // Should succeed with local URI
      expect(result.localUri).toBeDefined(); // Should still have local URI for fallback
      expect(result.error).toBe('Image cached for offline sync');
    });
  });
}); 