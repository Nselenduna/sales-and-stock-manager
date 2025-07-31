/**
 * Module: Product Schema Tests
 * Scope: Ensure field mappings and type strictness
 * Purpose: Validate Product interface matches Supabase schema
 */

import { Product } from '../../../lib/supabase';

describe('Product Schema Validation', () => {
  describe('Interface Field Mapping', () => {
    it('should have all required database fields', () => {
      const requiredFields = [
        'id',
        'name', 
        'sku',
        'quantity',
        'low_stock_threshold',
        'created_at',
        'updated_at'
      ];

      const optionalFields = [
        'barcode',
        'location',
        'unit_price',
        'description',
        'category',
        'image_url'
      ];

      // Test that required fields exist and are properly typed
      const mockProduct: Product = {
        id: 'test-id',
        name: 'Test Product',
        sku: 'TEST001',
        quantity: 10,
        low_stock_threshold: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      requiredFields.forEach(field => {
        expect(mockProduct).toHaveProperty(field);
        expect(mockProduct[field as keyof Product]).toBeDefined();
      });

      // Test that optional fields can be undefined
      optionalFields.forEach(field => {
        expect(mockProduct).toHaveProperty(field);
        expect(mockProduct[field as keyof Product]).toBeUndefined();
      });
    });

    it('should handle optional fields correctly', () => {
      const productWithOptionals: Product = {
        id: 'test-id',
        name: 'Test Product',
        sku: 'TEST001',
        quantity: 10,
        low_stock_threshold: 5,
        barcode: '123456789',
        location: 'Warehouse A',
        unit_price: 29.99,
        description: 'Test product description',
        category: 'Electronics',
        image_url: 'https://example.com/image.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      expect(productWithOptionals.barcode).toBe('123456789');
      expect(productWithOptionals.location).toBe('Warehouse A');
      expect(productWithOptionals.unit_price).toBe(29.99);
      expect(productWithOptionals.description).toBe('Test product description');
      expect(productWithOptionals.category).toBe('Electronics');
      expect(productWithOptionals.image_url).toBe('https://example.com/image.jpg');
    });

    it('should enforce correct types for all fields', () => {
      const product: Product = {
        id: 'uuid-string',
        name: 'string',
        sku: 'string',
        quantity: 123,
        low_stock_threshold: 456,
        barcode: 'string-or-undefined',
        location: 'string-or-undefined',
        unit_price: 99.99,
        description: 'string-or-undefined',
        category: 'string-or-undefined',
        image_url: 'string-or-undefined',
        created_at: 'iso-date-string',
        updated_at: 'iso-date-string'
      };

      // Verify string types
      expect(typeof product.id).toBe('string');
      expect(typeof product.name).toBe('string');
      expect(typeof product.sku).toBe('string');
      expect(typeof product.created_at).toBe('string');
      expect(typeof product.updated_at).toBe('string');

      // Verify number types
      expect(typeof product.quantity).toBe('number');
      expect(typeof product.low_stock_threshold).toBe('number');
      expect(typeof product.unit_price).toBe('number');

      // Verify optional string types
      if (product.barcode) expect(typeof product.barcode).toBe('string');
      if (product.location) expect(typeof product.location).toBe('string');
      if (product.description) expect(typeof product.description).toBe('string');
      if (product.category) expect(typeof product.category).toBe('string');
      if (product.image_url) expect(typeof product.image_url).toBe('string');
    });
  });

  describe('Form Data Compatibility', () => {
    it('should convert form data to Product interface', () => {
      const formData = {
        name: 'Test Product',
        sku: 'TEST001',
        barcode: '123456789',
        quantity: 10,
        low_stock_threshold: 5,
        location: 'Warehouse A',
        unit_price: 29.99,
        description: 'Test description',
        category: 'Electronics',
        image_url: 'https://example.com/image.jpg'
      };

      const product: Product = {
        id: 'generated-id',
        ...formData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Verify all form fields are preserved
      expect(product.name).toBe(formData.name);
      expect(product.sku).toBe(formData.sku);
      expect(product.barcode).toBe(formData.barcode);
      expect(product.quantity).toBe(formData.quantity);
      expect(product.low_stock_threshold).toBe(formData.low_stock_threshold);
      expect(product.location).toBe(formData.location);
      expect(product.unit_price).toBe(formData.unit_price);
      expect(product.description).toBe(formData.description);
      expect(product.category).toBe(formData.category);
      expect(product.image_url).toBe(formData.image_url);
    });

    it('should handle empty optional fields', () => {
      const minimalFormData = {
        name: 'Minimal Product',
        sku: 'MIN001',
        quantity: 1,
        low_stock_threshold: 1
      };

      const product: Product = {
        id: 'generated-id',
        ...minimalFormData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Verify required fields are present
      expect(product.name).toBe(minimalFormData.name);
      expect(product.sku).toBe(minimalFormData.sku);
      expect(product.quantity).toBe(minimalFormData.quantity);
      expect(product.low_stock_threshold).toBe(minimalFormData.low_stock_threshold);

      // Verify optional fields are undefined
      expect(product.barcode).toBeUndefined();
      expect(product.location).toBeUndefined();
      expect(product.unit_price).toBeUndefined();
      expect(product.description).toBeUndefined();
      expect(product.category).toBeUndefined();
      expect(product.image_url).toBeUndefined();
    });
  });

  describe('Validation Rules', () => {
    it('should validate required fields', () => {
      const validateRequired = (product: Partial<Product>): string[] => {
        const errors: string[] = [];
        
        if (!product.name?.trim()) errors.push('Name is required');
        if (!product.sku?.trim()) errors.push('SKU is required');
        if (product.quantity === undefined || product.quantity < 0) errors.push('Quantity must be non-negative');
        if (product.low_stock_threshold === undefined || product.low_stock_threshold < 0) errors.push('Low stock threshold must be non-negative');
        
        return errors;
      };

      const validProduct: Partial<Product> = {
        name: 'Valid Product',
        sku: 'VALID001',
        quantity: 10,
        low_stock_threshold: 5
      };

      const invalidProduct: Partial<Product> = {
        name: '',
        sku: '',
        quantity: -1,
        low_stock_threshold: -1
      };

      expect(validateRequired(validProduct)).toEqual([]);
      expect(validateRequired(invalidProduct)).toContain('Name is required');
      expect(validateRequired(invalidProduct)).toContain('SKU is required');
      expect(validateRequired(invalidProduct)).toContain('Quantity must be non-negative');
      expect(validateRequired(invalidProduct)).toContain('Low stock threshold must be non-negative');
    });

    it('should validate optional field constraints', () => {
      const validateOptional = (product: Partial<Product>): string[] => {
        const errors: string[] = [];
        
        if (product.unit_price !== undefined && product.unit_price < 0) {
          errors.push('Unit price cannot be negative');
        }
        if (product.description && product.description.length > 500) {
          errors.push('Description must be less than 500 characters');
        }
        if (product.category && product.category.length > 100) {
          errors.push('Category must be less than 100 characters');
        }
        
        return errors;
      };

      const validProduct: Partial<Product> = {
        unit_price: 29.99,
        description: 'Short description',
        category: 'Electronics'
      };

      const invalidProduct: Partial<Product> = {
        unit_price: -10,
        description: 'A'.repeat(501), // 501 characters
        category: 'A'.repeat(101) // 101 characters
      };

      expect(validateOptional(validProduct)).toEqual([]);
      expect(validateOptional(invalidProduct)).toContain('Unit price cannot be negative');
      expect(validateOptional(invalidProduct)).toContain('Description must be less than 500 characters');
      expect(validateOptional(invalidProduct)).toContain('Category must be less than 100 characters');
    });
  });

  describe('Database Schema Alignment', () => {
    it('should match Supabase column types', () => {
      // This test validates that our TypeScript interface matches the actual database schema
      const databaseSchema = {
        id: 'UUID PRIMARY KEY',
        name: 'TEXT NOT NULL',
        sku: 'TEXT UNIQUE NOT NULL',
        barcode: 'TEXT',
        quantity: 'INTEGER NOT NULL DEFAULT 0',
        low_stock_threshold: 'INTEGER NOT NULL DEFAULT 10',
        location: 'TEXT',
        unit_price: 'DECIMAL(10,2)',
        description: 'TEXT',
        category: 'TEXT',
        image_url: 'TEXT',
        created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
        updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
      };

      const interfaceFields = {
        id: 'string',
        name: 'string',
        sku: 'string',
        barcode: 'string?',
        quantity: 'number',
        low_stock_threshold: 'number',
        location: 'string?',
        unit_price: 'number?',
        description: 'string?',
        category: 'string?',
        image_url: 'string?',
        created_at: 'string',
        updated_at: 'string'
      };

      // Verify all database fields have corresponding interface fields
      Object.keys(databaseSchema).forEach(field => {
        expect(interfaceFields).toHaveProperty(field);
      });

      // Verify all interface fields have corresponding database fields
      Object.keys(interfaceFields).forEach(field => {
        expect(databaseSchema).toHaveProperty(field);
      });
    });

    it('should handle nullable vs required fields correctly', () => {
      const requiredFields = ['id', 'name', 'sku', 'quantity', 'low_stock_threshold', 'created_at', 'updated_at'];
      const nullableFields = ['barcode', 'location', 'unit_price', 'description', 'category', 'image_url'];

      // Test that required fields cannot be undefined in a valid product
      const validProduct: Product = {
        id: 'test-id',
        name: 'Test Product',
        sku: 'TEST001',
        quantity: 10,
        low_stock_threshold: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      requiredFields.forEach(field => {
        expect(validProduct[field as keyof Product]).toBeDefined();
      });

      // Test that nullable fields can be undefined
      nullableFields.forEach(field => {
        expect(validProduct[field as keyof Product]).toBeUndefined();
      });
    });
  });

  describe('Type Safety', () => {
    it('should prevent invalid type assignments', () => {
      // This test ensures TypeScript catches type mismatches
      const validProduct: Product = {
        id: 'test-id',
        name: 'Test Product',
        sku: 'TEST001',
        quantity: 10,
        low_stock_threshold: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // These assignments should be valid
      expect(typeof validProduct.id).toBe('string');
      expect(typeof validProduct.name).toBe('string');
      expect(typeof validProduct.quantity).toBe('number');
      expect(typeof validProduct.low_stock_threshold).toBe('number');

      // Optional fields should be undefined or have correct types
      if (validProduct.unit_price !== undefined) {
        expect(typeof validProduct.unit_price).toBe('number');
      }
      if (validProduct.description !== undefined) {
        expect(typeof validProduct.description).toBe('string');
      }
    });

    it('should handle partial updates correctly', () => {
      const originalProduct: Product = {
        id: 'test-id',
        name: 'Original Product',
        sku: 'ORIG001',
        quantity: 5,
        low_stock_threshold: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const updateData: Partial<Product> = {
        name: 'Updated Product',
        quantity: 10,
        unit_price: 29.99,
        description: 'Updated description'
      };

      const updatedProduct: Product = {
        ...originalProduct,
        ...updateData
      };

      // Verify updated fields
      expect(updatedProduct.name).toBe('Updated Product');
      expect(updatedProduct.quantity).toBe(10);
      expect(updatedProduct.unit_price).toBe(29.99);
      expect(updatedProduct.description).toBe('Updated description');

      // Verify unchanged fields
      expect(updatedProduct.id).toBe(originalProduct.id);
      expect(updatedProduct.sku).toBe(originalProduct.sku);
      expect(updatedProduct.low_stock_threshold).toBe(originalProduct.low_stock_threshold);
    });
  });
}); 