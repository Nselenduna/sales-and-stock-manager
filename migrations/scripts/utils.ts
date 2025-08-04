import { supabase } from '../../lib/supabase';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface Migration {
  id: string;
  filename: string;
  version: number;
  description: string;
  applied_at?: string;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  migration: Migration;
  error?: string;
  executionTime: number;
}

/**
 * Migration utility class for managing database schema changes
 */
export class MigrationManager {
  private migrationsPath: string;

  constructor(migrationsPath: string = join(__dirname, '../schema')) {
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize migration tracking table
   */
  async initializeMigrationTable(): Promise<void> {
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version INTEGER UNIQUE NOT NULL,
          filename VARCHAR(255) NOT NULL,
          description TEXT,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          execution_time INTEGER DEFAULT 0,
          CONSTRAINT unique_version UNIQUE (version)
        );
        
        -- Add index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
        ON schema_migrations (version);
        
        -- Add index for applied_at
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
        ON schema_migrations (applied_at);
      `
    });

    if (error) {
      throw new Error(`Failed to initialize migration table: ${error.message}`);
    }
  }

  /**
   * Get all available migration files
   */
  async getAvailableMigrations(): Promise<Migration[]> {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files.map(file => this.parseMigrationFile(file));
    } catch (error) {
      throw new Error(`Failed to read migration files: ${(error as Error).message}`);
    }
  }

  /**
   * Get applied migrations from database
   */
  async getAppliedMigrations(): Promise<Migration[]> {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: true });

    if (error) {
      throw new Error(`Failed to get applied migrations: ${error.message}`);
    }

    return data.map(row => ({
      id: row.id.toString(),
      filename: row.filename,
      version: row.version,
      description: row.description || '',
      applied_at: row.applied_at,
      checksum: row.checksum
    }));
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const available = await this.getAvailableMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));

    return available.filter(migration => !appliedVersions.has(migration.version));
  }

  /**
   * Run a single migration
   */
  async runMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Read migration file
      const migrationSQL = readFileSync(
        join(this.migrationsPath, migration.filename),
        'utf-8'
      );

      // Validate checksum
      const currentChecksum = this.calculateChecksum(migrationSQL);
      if (currentChecksum !== migration.checksum) {
        throw new Error(`Checksum mismatch for migration ${migration.filename}`);
      }

      // Execute migration in transaction
      const { error } = await supabase.rpc('exec_sql', {
        query: migrationSQL
      });

      if (error) {
        throw new Error(`Migration execution failed: ${error.message}`);
      }

      // Record migration
      const executionTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      await this.recordMigration(migration, executionTime);

      return {
        success: true,
        migration,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        migration,
        error: (error as Error).message,
        executionTime: Math.max(1, Date.now() - startTime) // Ensure at least 1ms
      };
    }
  }

  /**
   * Run multiple migrations
   */
  async runMigrations(migrations: Migration[]): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    for (const migration of migrations) {
      const result = await this.runMigration(migration);
      results.push(result);

      if (!result.success) {
        // Stop on first failure
        break;
      }
    }

    return results;
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Check if rollback file exists
      const rollbackFilename = migration.filename.replace('.sql', '.rollback.sql');
      const rollbackPath = join(this.migrationsPath, rollbackFilename);

      let rollbackSQL: string;
      try {
        rollbackSQL = readFileSync(rollbackPath, 'utf-8');
      } catch {
        throw new Error(`Rollback file not found: ${rollbackFilename}`);
      }

      // Execute rollback
      const { error } = await supabase.rpc('exec_sql', {
        query: rollbackSQL
      });

      if (error) {
        throw new Error(`Rollback execution failed: ${error.message}`);
      }

      // Remove migration record
      await this.removeMigrationRecord(migration);

      return {
        success: true,
        migration,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        migration,
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Parse migration filename and extract metadata
   */
  private parseMigrationFile(filename: string): Migration {
    const match = filename.match(/^(\d{3})_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }

    const [, versionStr, description] = match;
    const version = parseInt(versionStr, 10);

    // Calculate checksum
    const content = readFileSync(join(this.migrationsPath, filename), 'utf-8');
    const checksum = this.calculateChecksum(content);

    return {
      id: `${version}`,
      filename,
      version,
      description: description.replace(/_/g, ' '),
      checksum
    };
  }

  /**
   * Calculate SHA-256 checksum of content
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Record migration in database
   */
  private async recordMigration(migration: Migration, executionTime: number): Promise<void> {
    const { error } = await supabase
      .from('schema_migrations')
      .insert({
        version: migration.version,
        filename: migration.filename,
        description: migration.description,
        checksum: migration.checksum,
        execution_time: executionTime
      });

    if (error) {
      throw new Error(`Failed to record migration: ${error.message}`);
    }
  }

  /**
   * Remove migration record from database
   */
  private async removeMigrationRecord(migration: Migration): Promise<void> {
    const { error } = await supabase
      .from('schema_migrations')
      .delete()
      .eq('version', migration.version);

    if (error) {
      throw new Error(`Failed to remove migration record: ${error.message}`);
    }
  }

  /**
   * Validate migration integrity
   */
  async validateMigrations(): Promise<{valid: boolean; issues: string[]}> {
    const issues: string[] = [];
    
    try {
      const available = await this.getAvailableMigrations();
      const applied = await this.getAppliedMigrations();

      // Check for gaps in version numbers
      const versions = available.map(m => m.version).sort((a, b) => a - b);
      for (let i = 1; i < versions.length; i++) {
        if (versions[i] !== versions[i - 1] + 1) {
          issues.push(`Gap in migration versions: ${versions[i - 1]} to ${versions[i]}`);
        }
      }

      // Check checksum consistency
      for (const appliedMigration of applied) {
        const availableMigration = available.find(m => m.version === appliedMigration.version);
        if (availableMigration && availableMigration.checksum !== appliedMigration.checksum) {
          issues.push(`Checksum mismatch for migration ${appliedMigration.filename}`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Validation error: ${(error as Error).message}`);
      return {
        valid: false,
        issues
      };
    }
  }
}

export default MigrationManager;