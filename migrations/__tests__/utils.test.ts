import { MigrationManager, Migration } from '../scripts/utils';
import { supabase } from '../../lib/supabase';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}));

describe('MigrationManager', () => {
  let manager: MigrationManager;
  let testMigrationsPath: string;

  beforeEach(() => {
    // Create test migrations directory
    testMigrationsPath = join(__dirname, '../../tmp/test-migrations');
    try {
      mkdirSync(testMigrationsPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    manager = new MigrationManager(testMigrationsPath);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testMigrationsPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initializeMigrationTable', () => {
    it('should create migration table successfully', async () => {
      const mockRpc = supabase.rpc as jest.Mock;
      mockRpc.mockResolvedValue({ error: null });

      await manager.initializeMigrationTable();

      expect(mockRpc).toHaveBeenCalledWith('exec_sql', {
        query: expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
      });
    });

    it('should handle migration table creation error', async () => {
      const mockRpc = supabase.rpc as jest.Mock;
      mockRpc.mockResolvedValue({ error: { message: 'Database error' } });

      await expect(manager.initializeMigrationTable()).rejects.toThrow(
        'Failed to initialize migration table: Database error'
      );
    });
  });

  describe('getAvailableMigrations', () => {
    it('should return empty array when no migration files exist', async () => {
      const migrations = await manager.getAvailableMigrations();
      expect(migrations).toEqual([]);
    });

    it('should parse migration files correctly', async () => {
      // Create test migration files
      const migration1Content = 'CREATE TABLE test1 (id INTEGER);';
      const migration2Content = 'CREATE TABLE test2 (id INTEGER);';
      
      writeFileSync(join(testMigrationsPath, '001_create_users.sql'), migration1Content);
      writeFileSync(join(testMigrationsPath, '002_add_products.sql'), migration2Content);

      const migrations = await manager.getAvailableMigrations();

      expect(migrations).toHaveLength(2);
      expect(migrations[0]).toMatchObject({
        version: 1,
        filename: '001_create_users.sql',
        description: 'create users'
      });
      expect(migrations[1]).toMatchObject({
        version: 2,
        filename: '002_add_products.sql',
        description: 'add products'
      });
    });

    it('should ignore non-SQL files', async () => {
      writeFileSync(join(testMigrationsPath, '001_test.sql'), 'CREATE TABLE test (id INTEGER);');
      writeFileSync(join(testMigrationsPath, 'readme.txt'), 'This is not a migration');
      writeFileSync(join(testMigrationsPath, '002_test.js'), 'console.log("not sql");');

      const migrations = await manager.getAvailableMigrations();

      expect(migrations).toHaveLength(1);
      expect(migrations[0].filename).toBe('001_test.sql');
    });

    it('should handle invalid migration filename format', async () => {
      writeFileSync(join(testMigrationsPath, 'invalid_migration.sql'), 'CREATE TABLE test (id INTEGER);');

      await expect(manager.getAvailableMigrations()).rejects.toThrow(
        'Invalid migration filename format: invalid_migration.sql'
      );
    });
  });

  describe('getAppliedMigrations', () => {
    it('should return applied migrations from database', async () => {
      const mockData = [
        {
          id: 1,
          filename: '001_create_users.sql',
          version: 1,
          description: 'create users',
          applied_at: '2025-01-04T10:00:00Z',
          checksum: 'abc123'
        }
      ];

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockData,
            error: null
          })
        })
      });

      const applied = await manager.getAppliedMigrations();

      expect(applied).toHaveLength(1);
      expect(applied[0]).toMatchObject({
        id: '1',
        filename: '001_create_users.sql',
        version: 1,
        description: 'create users',
        applied_at: '2025-01-04T10:00:00Z',
        checksum: 'abc123'
      });
    });

    it('should handle database error when getting applied migrations', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      });

      await expect(manager.getAppliedMigrations()).rejects.toThrow(
        'Failed to get applied migrations: Database connection failed'
      );
    });
  });

  describe('getPendingMigrations', () => {
    it('should return migrations not yet applied', async () => {
      // Create test migration files
      writeFileSync(join(testMigrationsPath, '001_create_users.sql'), 'CREATE TABLE users (id INTEGER);');
      writeFileSync(join(testMigrationsPath, '002_add_products.sql'), 'CREATE TABLE products (id INTEGER);');
      writeFileSync(join(testMigrationsPath, '003_add_sales.sql'), 'CREATE TABLE sales (id INTEGER);');

      // Mock applied migrations (only first two)
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: 1, version: 1, filename: '001_create_users.sql', description: 'create users', checksum: 'abc' },
              { id: 2, version: 2, filename: '002_add_products.sql', description: 'add products', checksum: 'def' }
            ],
            error: null
          })
        })
      });

      const pending = await manager.getPendingMigrations();

      expect(pending).toHaveLength(1);
      expect(pending[0].version).toBe(3);
      expect(pending[0].filename).toBe('003_add_sales.sql');
    });
  });

  describe('runMigration', () => {
    it('should execute migration successfully', async () => {
      const migrationSQL = 'CREATE TABLE test_table (id INTEGER);';
      writeFileSync(join(testMigrationsPath, '001_test_migration.sql'), migrationSQL);

      const migration: Migration = {
        id: '1',
        filename: '001_test_migration.sql',
        version: 1,
        description: 'test migration',
        checksum: require('crypto').createHash('sha256').update(migrationSQL).digest('hex')
      };

      // Mock successful SQL execution
      const mockRpc = supabase.rpc as jest.Mock;
      mockRpc.mockResolvedValue({ error: null });

      // Mock successful migration recording
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      const result = await manager.runMigration(migration);

      expect(result.success).toBe(true);
      expect(result.migration).toBe(migration);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(mockRpc).toHaveBeenCalledWith('exec_sql', {
        query: migrationSQL
      });
    });

    it('should handle checksum mismatch', async () => {
      const migrationSQL = 'CREATE TABLE test_table (id INTEGER);';
      writeFileSync(join(testMigrationsPath, '001_test_migration.sql'), migrationSQL);

      const migration: Migration = {
        id: '1',
        filename: '001_test_migration.sql',
        version: 1,
        description: 'test migration',
        checksum: 'wrong_checksum'
      };

      const result = await manager.runMigration(migration);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Checksum mismatch');
    });

    it('should handle SQL execution error', async () => {
      const migrationSQL = 'CREATE TABLE test_table (id INTEGER);';
      writeFileSync(join(testMigrationsPath, '001_test_migration.sql'), migrationSQL);

      const migration: Migration = {
        id: '1',
        filename: '001_test_migration.sql',
        version: 1,
        description: 'test migration',
        checksum: require('crypto').createHash('sha256').update(migrationSQL).digest('hex')
      };

      // Mock SQL execution error
      const mockRpc = supabase.rpc as jest.Mock;
      mockRpc.mockResolvedValue({ error: { message: 'SQL syntax error' } });

      const result = await manager.runMigration(migration);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration execution failed: SQL syntax error');
    });
  });

  describe('rollbackMigration', () => {
    it('should execute rollback successfully', async () => {
      const migrationSQL = 'CREATE TABLE test_table (id INTEGER);';
      const rollbackSQL = 'DROP TABLE test_table;';
      
      writeFileSync(join(testMigrationsPath, '001_test_migration.sql'), migrationSQL);
      writeFileSync(join(testMigrationsPath, '001_test_migration.rollback.sql'), rollbackSQL);

      const migration: Migration = {
        id: '1',
        filename: '001_test_migration.sql',
        version: 1,
        description: 'test migration',
        checksum: 'abc123'
      };

      // Mock successful rollback execution
      const mockRpc = supabase.rpc as jest.Mock;
      mockRpc.mockResolvedValue({ error: null });

      // Mock successful migration record removal
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      const result = await manager.rollbackMigration(migration);

      expect(result.success).toBe(true);
      expect(result.migration).toBe(migration);
      expect(mockRpc).toHaveBeenCalledWith('exec_sql', {
        query: rollbackSQL
      });
    });

    it('should handle missing rollback file', async () => {
      const migrationSQL = 'CREATE TABLE test_table (id INTEGER);';
      writeFileSync(join(testMigrationsPath, '001_test_migration.sql'), migrationSQL);
      // Note: Not creating rollback file

      const migration: Migration = {
        id: '1',
        filename: '001_test_migration.sql',
        version: 1,
        description: 'test migration',
        checksum: 'abc123'
      };

      const result = await manager.rollbackMigration(migration);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rollback file not found');
    });
  });

  describe('validateMigrations', () => {
    it('should pass validation for valid migrations', async () => {
      // Create sequential migrations
      writeFileSync(join(testMigrationsPath, '001_first.sql'), 'CREATE TABLE first (id INTEGER);');
      writeFileSync(join(testMigrationsPath, '002_second.sql'), 'CREATE TABLE second (id INTEGER);');
      writeFileSync(join(testMigrationsPath, '003_third.sql'), 'CREATE TABLE third (id INTEGER);');

      // Mock applied migrations with matching checksums
      const migrations = await manager.getAvailableMigrations();
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: migrations.map(m => ({
              id: m.version,
              version: m.version,
              filename: m.filename,
              description: m.description,
              checksum: m.checksum
            })),
            error: null
          })
        })
      });

      const validation = await manager.validateMigrations();

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect version gaps', async () => {
      // Create migrations with gaps
      writeFileSync(join(testMigrationsPath, '001_first.sql'), 'CREATE TABLE first (id INTEGER);');
      writeFileSync(join(testMigrationsPath, '003_third.sql'), 'CREATE TABLE third (id INTEGER);'); // Gap: missing 002

      // Mock no applied migrations
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const validation = await manager.validateMigrations();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Gap in migration versions: 1 to 3');
    });

    it('should detect checksum mismatches', async () => {
      writeFileSync(join(testMigrationsPath, '001_test.sql'), 'CREATE TABLE test (id INTEGER);');

      const availableMigrations = await manager.getAvailableMigrations();
      
      // Mock applied migration with different checksum
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [{
              id: 1,
              version: 1,
              filename: '001_test.sql',
              description: 'test',
              checksum: 'wrong_checksum' // Different from actual
            }],
            error: null
          })
        })
      });

      const validation = await manager.validateMigrations();

      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => 
        issue.includes('Checksum mismatch for migration 001_test.sql')
      )).toBe(true);
    });
  });
});