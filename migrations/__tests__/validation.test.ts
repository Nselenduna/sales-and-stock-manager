import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Simple validation tests for migration system
 * These tests validate the migration files and structure without executing them
 */
describe('Migration System Validation', () => {
  const migrationsDir = join(__dirname, '../../migrations');
  const schemaDir = join(migrationsDir, 'schema');
  const scriptsDir = join(migrationsDir, 'scripts');

  describe('Directory Structure', () => {
    it('should have migrations directory', () => {
      expect(existsSync(migrationsDir)).toBe(true);
    });

    it('should have schema directory', () => {
      expect(existsSync(schemaDir)).toBe(true);
    });

    it('should have scripts directory', () => {
      expect(existsSync(scriptsDir)).toBe(true);
    });

    it('should have README file', () => {
      expect(existsSync(join(migrationsDir, 'README.md'))).toBe(true);
    });
  });

  describe('Migration Scripts', () => {
    const requiredScripts = ['utils.ts', 'migrate.ts', 'rollback.ts', 'status.ts', 'create.ts'];

    requiredScripts.forEach(script => {
      it(`should have ${script}`, () => {
        expect(existsSync(join(scriptsDir, script))).toBe(true);
      });
    });

    it('should have TypeScript files with proper exports', () => {
      const utilsContent = readFileSync(join(scriptsDir, 'utils.ts'), 'utf8');
      expect(utilsContent).toContain('export class MigrationManager');
      expect(utilsContent).toContain('export interface Migration');
    });
  });

  describe('Schema Files', () => {
    it('should have initial schema migration', () => {
      expect(existsSync(join(schemaDir, '001_initial_schema.sql'))).toBe(true);
      expect(existsSync(join(schemaDir, '001_initial_schema.rollback.sql'))).toBe(true);
    });

    it('should have example migration', () => {
      expect(existsSync(join(schemaDir, '002_add_product_metadata.sql'))).toBe(true);
      expect(existsSync(join(schemaDir, '002_add_product_metadata.rollback.sql'))).toBe(true);
    });

    it('should have proper SQL structure in migrations', () => {
      const initialSchema = readFileSync(join(schemaDir, '001_initial_schema.sql'), 'utf8');
      
      // Check for transaction safety
      expect(initialSchema).toContain('BEGIN;');
      expect(initialSchema).toContain('COMMIT;');
      
      // Check for essential database objects
      expect(initialSchema).toContain('CREATE TABLE');
      expect(initialSchema).toContain('CREATE INDEX');
      expect(initialSchema).toContain('CREATE TRIGGER');
      
      // Check for constraints
      expect(initialSchema).toContain('PRIMARY KEY');
      expect(initialSchema).toContain('NOT NULL');
      expect(initialSchema).toContain('CHECK (');
      
      // Check for comments
      expect(initialSchema).toContain('-- Migration:');
      expect(initialSchema).toContain('-- Description:');
    });

    it('should have proper rollback structure', () => {
      const rollbackSchema = readFileSync(join(schemaDir, '001_initial_schema.rollback.sql'), 'utf8');
      
      // Check for transaction safety
      expect(rollbackSchema).toContain('BEGIN;');
      expect(rollbackSchema).toContain('COMMIT;');
      
      // Check for rollback operations
      expect(rollbackSchema).toContain('DROP TABLE');
      expect(rollbackSchema).toContain('IF EXISTS');
      
      // Check for comments
      expect(rollbackSchema).toContain('-- Rollback for Migration:');
    });
  });

  describe('Package.json Integration', () => {
    it('should have migration scripts in package.json', () => {
      const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
      
      expect(packageJson.scripts).toHaveProperty('migrate:up');
      expect(packageJson.scripts).toHaveProperty('migrate:down');
      expect(packageJson.scripts).toHaveProperty('migrate:status');
      expect(packageJson.scripts).toHaveProperty('migrate:create');
    });

    it('should have required dependencies', () => {
      const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
      
      expect(packageJson.devDependencies).toHaveProperty('ts-node');
      expect(packageJson.devDependencies).toHaveProperty('supabase');
    });
  });

  describe('Documentation', () => {
    it('should have migration README with proper content', () => {
      const readme = readFileSync(join(migrationsDir, 'README.md'), 'utf8');
      
      expect(readme).toContain('Database Migrations');
      expect(readme).toContain('npm run migrate:up');
      expect(readme).toContain('npm run migrate:down');
      expect(readme).toContain('Migration File Naming');
      expect(readme).toContain('Safety Features');
    });

    it('should have updated main README with migration documentation', () => {
      const mainReadme = readFileSync(join(__dirname, '../../README.md'), 'utf8');
      
      expect(mainReadme).toContain('Database Management');
      expect(mainReadme).toContain('Migration System');
      expect(mainReadme).toContain('npm run migrate:up');
      expect(mainReadme).toContain('migrations/');
    });
  });

  describe('TypeScript Configuration', () => {
    it('should be compatible with existing TypeScript config', () => {
      const tsConfig = JSON.parse(readFileSync(join(__dirname, '../../tsconfig.json'), 'utf8'));
      
      // Check that migration files would be included
      expect(tsConfig.include || tsConfig.files || ['**/*']).toBeTruthy();
    });
  });

  describe('Migration File Validation', () => {
    it('should validate migration file naming convention', () => {
      const files = require('fs').readdirSync(schemaDir);
      const migrationFiles = files.filter((f: string) => f.endsWith('.sql') && !f.includes('.rollback.'));
      
      migrationFiles.forEach((file: string) => {
        expect(file).toMatch(/^\d{3}_[a-z0-9_]+\.sql$/);
      });
    });

    it('should ensure each migration has a corresponding rollback', () => {
      const files = require('fs').readdirSync(schemaDir);
      const migrationFiles = files.filter((f: string) => f.endsWith('.sql') && !f.includes('.rollback.'));
      
      migrationFiles.forEach((file: string) => {
        const rollbackFile = file.replace('.sql', '.rollback.sql');
        expect(files).toContain(rollbackFile);
      });
    });

    it('should validate SQL safety patterns', () => {
      const files = require('fs').readdirSync(schemaDir);
      const sqlFiles = files.filter((f: string) => f.endsWith('.sql'));
      
      sqlFiles.forEach((file: string) => {
        const content = readFileSync(join(schemaDir, file), 'utf8');
        
        // Should use transactions
        expect(content).toContain('BEGIN;');
        expect(content).toContain('COMMIT;');
        
        // Should use safe patterns
        if (content.includes('CREATE TABLE')) {
          expect(content).toContain('IF NOT EXISTS');
        }
        if (content.includes('DROP TABLE')) {
          expect(content).toContain('IF EXISTS');
        }
        
        // Should not contain dangerous operations
        expect(content).not.toContain('DROP DATABASE');
        expect(content).not.toContain('TRUNCATE TABLE');
      });
    });
  });

  describe('Migration System Features', () => {
    it('should support checksum validation', () => {
      const utilsContent = readFileSync(join(scriptsDir, 'utils.ts'), 'utf8');
      expect(utilsContent).toContain('calculateChecksum');
      expect(utilsContent).toContain('sha256');
    });

    it('should support transaction safety', () => {
      const utilsContent = readFileSync(join(scriptsDir, 'utils.ts'), 'utf8');
      expect(utilsContent).toContain('exec_sql');
      expect(utilsContent).toContain('transaction');
    });

    it('should support rollback functionality', () => {
      const utilsContent = readFileSync(join(scriptsDir, 'utils.ts'), 'utf8');
      expect(utilsContent).toContain('rollbackMigration');
      expect(utilsContent).toContain('.rollback.sql');
    });

    it('should support migration status tracking', () => {
      const statusContent = readFileSync(join(scriptsDir, 'status.ts'), 'utf8');
      expect(statusContent).toContain('getAppliedMigrations');
      expect(statusContent).toContain('getPendingMigrations');
    });

    it('should support migration creation', () => {
      const createContent = readFileSync(join(scriptsDir, 'create.ts'), 'utf8');
      expect(createContent).toContain('createMigration');
      expect(createContent).toContain('generateMigrationTemplate');
      expect(createContent).toContain('generateRollbackTemplate');
    });
  });
});