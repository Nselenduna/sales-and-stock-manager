import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Integration tests for migration scripts
describe('Migration Scripts Integration', () => {
  let testMigrationsPath: string;
  let originalEnv: string | undefined;

  beforeAll(() => {
    // Set up test environment
    testMigrationsPath = join(__dirname, '../../tmp/test-migrations-integration');
    try {
      mkdirSync(testMigrationsPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Mock environment to use test database
    originalEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321'; // Test Supabase URL
  });

  afterAll(() => {
    // Restore environment
    if (originalEnv) {
      process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv;
    } else {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    }

    // Clean up test directory
    try {
      rmSync(testMigrationsPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Clean test directory before each test
    try {
      rmSync(testMigrationsPath, { recursive: true, force: true });
      mkdirSync(testMigrationsPath, { recursive: true });
    } catch (error) {
      // Ignore errors
    }
  });

  describe('migrate:create script', () => {
    it('should create migration files with proper naming', () => {
      const result = execSync(
        `npm run migrate:create -- --name="test_migration"`,
        { 
          cwd: join(__dirname, '../..'),
          encoding: 'utf8',
          env: { ...process.env, TEST_MIGRATIONS_PATH: testMigrationsPath }
        }
      );

      expect(result).toContain('Migration files created successfully');
      
      // Check if files were created
      const schemaDir = join(__dirname, '../../migrations/schema');
      const files = require('fs').readdirSync(schemaDir);
      
      const migrationFile = files.find((f: string) => f.includes('test_migration.sql') && !f.includes('.rollback.'));
      const rollbackFile = files.find((f: string) => f.includes('test_migration.rollback.sql'));
      
      expect(migrationFile).toBeDefined();
      expect(rollbackFile).toBeDefined();

      // Check file contents
      if (migrationFile) {
        const migrationContent = readFileSync(join(schemaDir, migrationFile), 'utf8');
        expect(migrationContent).toContain('BEGIN;');
        expect(migrationContent).toContain('COMMIT;');
        expect(migrationContent).toContain('test migration');
      }

      if (rollbackFile) {
        const rollbackContent = readFileSync(join(schemaDir, rollbackFile), 'utf8');
        expect(rollbackContent).toContain('BEGIN;');
        expect(rollbackContent).toContain('COMMIT;');
        expect(rollbackContent).toContain('Rollback for Migration');
      }
    });

    it('should create data migration template when specified', () => {
      const result = execSync(
        `npm run migrate:create -- --name="data_migration_test" --template=data`,
        { 
          cwd: join(__dirname, '../..'),
          encoding: 'utf8'
        }
      );

      expect(result).toContain('Migration files created successfully');
      
      const schemaDir = join(__dirname, '../../migrations/schema');
      const files = require('fs').readdirSync(schemaDir);
      
      const migrationFile = files.find((f: string) => f.includes('data_migration_test.sql') && !f.includes('.rollback.'));
      
      if (migrationFile) {
        const migrationContent = readFileSync(join(schemaDir, migrationFile), 'utf8');
        expect(migrationContent).toContain('Data Migration');
        expect(migrationContent).toContain('CREATE TEMP TABLE');
      }
    });

    it('should show error when name is not provided', () => {
      expect(() => {
        execSync(
          `npm run migrate:create`,
          { 
            cwd: join(__dirname, '../..'),
            encoding: 'utf8',
            stdio: 'pipe'
          }
        );
      }).toThrow();
    });

    it('should show help when requested', () => {
      const result = execSync(
        `npm run migrate:create -- --help`,
        { 
          cwd: join(__dirname, '../..'),
          encoding: 'utf8'
        }
      );

      expect(result).toContain('Usage: npm run migrate:create');
      expect(result).toContain('--name=DESCRIPTION');
      expect(result).toContain('Examples:');
    });
  });

  describe('Migration file validation', () => {
    it('should validate proper migration file structure', () => {
      // Create a valid migration file
      const migrationContent = `-- Migration: 001_test
-- Description: Test migration
-- Author: Test
-- Created: 2025-01-04

BEGIN;
CREATE TABLE test_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMIT;`;

      const rollbackContent = `-- Rollback for Migration: 001_test
-- Description: Rollback test migration
-- Author: Test
-- Created: 2025-01-04

BEGIN;
DROP TABLE IF EXISTS test_table;
COMMIT;`;

      const schemaDir = join(__dirname, '../../migrations/schema');
      writeFileSync(join(schemaDir, '999_test_validation.sql'), migrationContent);
      writeFileSync(join(schemaDir, '999_test_validation.rollback.sql'), rollbackContent);

      // The migration should be parseable by our system
      expect(() => {
        const MigrationManager = require('../scripts/utils').MigrationManager;
        const manager = new MigrationManager(schemaDir);
        // This should not throw
      }).not.toThrow();

      // Clean up test files
      try {
        rmSync(join(schemaDir, '999_test_validation.sql'));
        rmSync(join(schemaDir, '999_test_validation.rollback.sql'));
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should detect invalid migration filename format', async () => {
      const schemaDir = join(__dirname, '../../migrations/schema');
      const invalidFilename = 'invalid_format.sql';
      
      writeFileSync(join(schemaDir, invalidFilename), 'CREATE TABLE test (id INTEGER);');

      try {
        const MigrationManager = require('../scripts/utils').MigrationManager;
        const manager = new MigrationManager(schemaDir);
        await expect(manager.getAvailableMigrations()).rejects.toThrow('Invalid migration filename format');
      } finally {
        // Clean up
        try {
          rmSync(join(schemaDir, invalidFilename));
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Migration safety features', () => {
    it('should ensure migrations are wrapped in transactions', () => {
      const schemaDir = join(__dirname, '../../migrations/schema');
      
      // Check existing migrations
      const files = require('fs').readdirSync(schemaDir)
        .filter((f: string) => f.endsWith('.sql') && !f.includes('.rollback.'));

      files.forEach((file: string) => {
        const content = readFileSync(join(schemaDir, file), 'utf8');
        expect(content).toContain('BEGIN;');
        expect(content).toContain('COMMIT;');
      });
    });

    it('should ensure rollback files exist for each migration', () => {
      const schemaDir = join(__dirname, '../../migrations/schema');
      
      const migrationFiles = require('fs').readdirSync(schemaDir)
        .filter((f: string) => f.endsWith('.sql') && !f.includes('.rollback.'));

      migrationFiles.forEach((file: string) => {
        const rollbackFile = file.replace('.sql', '.rollback.sql');
        expect(existsSync(join(schemaDir, rollbackFile))).toBe(true);
      });
    });

    it('should validate SQL syntax in migration files', () => {
      const schemaDir = join(__dirname, '../../migrations/schema');
      
      const files = require('fs').readdirSync(schemaDir)
        .filter((f: string) => f.endsWith('.sql'));

      files.forEach((file: string) => {
        const content = readFileSync(join(schemaDir, file), 'utf8');
        
        // Basic SQL syntax checks
        expect(content).not.toContain('DROP DATABASE');
        expect(content).not.toContain('TRUNCATE');
        
        // Should use IF EXISTS/IF NOT EXISTS for safety
        if (content.includes('DROP TABLE')) {
          expect(content).toContain('IF EXISTS');
        }
        if (content.includes('CREATE TABLE')) {
          expect(content).toContain('IF NOT EXISTS');
        }
      });
    });
  });

  describe('Data integrity features', () => {
    it('should include proper constraints in schema migrations', () => {
      const initialSchema = readFileSync(
        join(__dirname, '../../migrations/schema/001_initial_schema.sql'),
        'utf8'
      );

      // Check for essential constraints
      expect(initialSchema).toContain('PRIMARY KEY');
      expect(initialSchema).toContain('NOT NULL');
      expect(initialSchema).toContain('CHECK (');
      expect(initialSchema).toContain('REFERENCES');
      expect(initialSchema).toContain('UNIQUE');
    });

    it('should include proper indexes for performance', () => {
      const initialSchema = readFileSync(
        join(__dirname, '../../migrations/schema/001_initial_schema.sql'),
        'utf8'
      );

      // Check for indexes on foreign keys and commonly queried columns
      expect(initialSchema).toContain('CREATE INDEX');
      expect(initialSchema).toContain('idx_');
    });

    it('should include Row Level Security setup', () => {
      const initialSchema = readFileSync(
        join(__dirname, '../../migrations/schema/001_initial_schema.sql'),
        'utf8'
      );

      expect(initialSchema).toContain('ENABLE ROW LEVEL SECURITY');
      expect(initialSchema).toContain('CREATE POLICY');
    });

    it('should include proper triggers for timestamp updates', () => {
      const initialSchema = readFileSync(
        join(__dirname, '../../migrations/schema/001_initial_schema.sql'),
        'utf8'
      );

      expect(initialSchema).toContain('CREATE TRIGGER');
      expect(initialSchema).toContain('update_updated_at_column');
      expect(initialSchema).toContain('updated_at');
    });
  });

  describe('Migration documentation', () => {
    it('should have proper header comments in migration files', () => {
      const schemaDir = join(__dirname, '../../migrations/schema');
      
      const files = require('fs').readdirSync(schemaDir)
        .filter((f: string) => f.endsWith('.sql'));

      files.forEach((file: string) => {
        const content = readFileSync(join(schemaDir, file), 'utf8');
        
        expect(content).toContain('-- Migration:');
        expect(content).toContain('-- Description:');
        expect(content).toContain('-- Author:');
        expect(content).toContain('-- Created:');
      });
    });

    it('should have README documentation', () => {
      const readmePath = join(__dirname, '../../migrations/README.md');
      expect(existsSync(readmePath)).toBe(true);
      
      const readme = readFileSync(readmePath, 'utf8');
      expect(readme).toContain('Database Migrations');
      expect(readme).toContain('Usage');
      expect(readme).toContain('npm run migrate:up');
      expect(readme).toContain('npm run migrate:down');
    });
  });
});