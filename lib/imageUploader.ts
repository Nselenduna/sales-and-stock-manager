import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  localUri?: string;
}

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
}

/**
 * Image Uploader utility for handling image selection, compression, and upload
 */
export class ImageUploader {
  private static instance: ImageUploader;
  private offlineQueue: Array<{ uri: string; timestamp: number }> = [];

  public static getInstance(): ImageUploader {
    if (!ImageUploader.instance) {
      ImageUploader.instance = new ImageUploader();
    }
    return ImageUploader.instance;
  }

  /**
   * Request necessary permissions for image picker
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();

      // Request media library permissions
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();

      if (!cameraPermission.granted || !mediaPermission.granted) {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library access is required to upload images.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Launch image picker with specified options
   */
  async pickImage(
    source: 'camera' | 'gallery' = 'gallery',
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return { success: false, error: 'Permissions not granted' };
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.8,
        maxWidth: options.maxWidth ?? 1024,
        maxHeight: options.maxHeight ?? 1024,
      };

      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          success: true,
          localUri: asset.uri,
        };
      }

      return { success: false, error: 'No image selected' };
    } catch (error) {
      console.error('Error picking image:', error);
      return { success: false, error: 'Failed to pick image' };
    }
  }

  /**
   * Compress image to reduce file size
   */
  async compressImage(
    uri: string,
    options: ImageUploadOptions = {}
  ): Promise<string> {
    try {
      const compressedResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: options.quality ?? 0.7,
        maxWidth: options.maxWidth ?? 800,
        maxHeight: options.maxHeight ?? 800,
      });

      if (
        !compressedResult.canceled &&
        compressedResult.assets &&
        compressedResult.assets[0]
      ) {
        return compressedResult.assets[0].uri;
      }

      return uri; // Return original if compression fails
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  }

  /**
   * Upload image to Supabase storage
   */
  async uploadToSupabase(
    uri: string,
    fileName?: string
  ): Promise<ImageUploadResult> {
    try {
      // Generate unique filename if not provided
      const uniqueFileName =
        fileName ||
        `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(uniqueFileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(uniqueFileName);

      return {
        success: true,
        url: urlData.publicUrl,
        localUri: uri,
      };
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      return { success: false, error: 'Failed to upload image' };
    }
  }

  /**
   * Complete image upload flow with compression and upload
   */
  async uploadImage(
    source: 'camera' | 'gallery' = 'gallery',
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    try {
      // Pick image
      const pickResult = await this.pickImage(source, options);
      if (!pickResult.success || !pickResult.localUri) {
        return pickResult;
      }

      // Compress image
      const compressedUri = await this.compressImage(
        pickResult.localUri,
        options
      );

      // Try to upload immediately
      const uploadResult = await this.uploadToSupabase(compressedUri);

      if (uploadResult.success) {
        return uploadResult;
      }

      // If upload fails, cache for offline sync
      await this.cacheForOfflineSync(compressedUri);

      return {
        success: true,
        localUri: compressedUri,
        error: 'Image cached for offline sync',
      };
    } catch (error) {
      console.error('Error in upload flow:', error);
      return { success: false, error: 'Upload failed' };
    }
  }

  /**
   * Cache image for offline sync
   */
  private async cacheForOfflineSync(uri: string): Promise<void> {
    try {
      this.offlineQueue.push({
        uri,
        timestamp: Date.now(),
      });

      // Store in AsyncStorage
      await AsyncStorage.setItem(
        'offline_image_queue',
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.error('Error caching image for offline sync:', error);
    }
  }

  /**
   * Process offline image queue when back online
   */
  async processOfflineQueue(): Promise<ImageUploadResult[]> {
    try {
      const queueData = await AsyncStorage.getItem('offline_image_queue');
      if (!queueData) {
        return [];
      }

      this.offlineQueue = JSON.parse(queueData);
      const results: ImageUploadResult[] = [];

      for (const item of this.offlineQueue) {
        const result = await this.uploadToSupabase(item.uri);
        results.push(result);

        if (result.success) {
          // Remove from queue if successful
          this.offlineQueue = this.offlineQueue.filter(q => q.uri !== item.uri);
        }
      }

      // Update stored queue
      await AsyncStorage.setItem(
        'offline_image_queue',
        JSON.stringify(this.offlineQueue)
      );

      return results;
    } catch (error) {
      console.error('Error processing offline queue:', error);
      return [];
    }
  }

  /**
   * Get offline queue status
   */
  async getOfflineQueueStatus(): Promise<{
    count: number;
    items: Array<{ uri: string; timestamp: number }>;
  }> {
    try {
      const queueData = await AsyncStorage.getItem('offline_image_queue');
      if (!queueData) {
        return { count: 0, items: [] };
      }

      const items = JSON.parse(queueData);
      return { count: items.length, items };
    } catch (error) {
      console.error('Error getting offline queue status:', error);
      return { count: 0, items: [] };
    }
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    try {
      this.offlineQueue = [];
      await AsyncStorage.removeItem('offline_image_queue');
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }
}

// Export singleton instance
export const imageUploader = ImageUploader.getInstance();
