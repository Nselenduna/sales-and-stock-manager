#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Create new migration script
 * Usage: npm run migrate:create -- --name="description_of_migration"
 */

interface CreateOptions {
  name?: string;
  template?: string;
}

function parseArgs(): CreateOptions {
  const args = process.argv.slice(2);
  const options: CreateOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--name=')) {
      options.name = arg.split('=')[1].replace(/['"]/g, '');
    } else if (arg.startsWith('--template=')) {
      options.template = arg.split('=')[1];
    }
  }

  return options;
}

function getNextVersion(): string {
  const fs = require('fs');
  const migrationsPath = join(__dirname, '../schema');
  
  try {
    const files = fs.readdirSync(migrationsPath)
      .filter((file: string) => file.endsWith('.sql') && !file.includes('.rollback.'))
      .sort();

    if (files.length === 0) {
      return '001';
    }

    // Extract version from last file
    const lastFile = files[files.length - 1];
    const match = lastFile.match(/^(\d{3})/);
    if (match) {
      const lastVersion = parseInt(match[1], 10);
      return (lastVersion + 1).toString().padStart(3, '0');
    }

    return '001';
  } catch {
    return '001';
  }
}

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function generateMigrationTemplate(version: string, description: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `-- Migration: ${version}_${description}
-- Description: ${description.replace(/_/g, ' ')}
-- Author: Database Migration System
-- Created: ${date}

BEGIN;

-- Add your migration SQL here
-- Example:
-- ALTER TABLE products ADD COLUMN new_field VARCHAR(255);
-- CREATE INDEX IF NOT EXISTS idx_products_new_field ON products(new_field);

-- Remember to update any views or functions that might be affected
-- Add appropriate constraints and validations
-- Consider data migration if needed

COMMIT;`;
}

function generateRollbackTemplate(version: string, description: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `-- Rollback for Migration: ${version}_${description}
-- Description: Rollback changes made in ${version}_${description}
-- Author: Database Migration System
-- Created: ${date}

BEGIN;

-- Add your rollback SQL here (reverse of the migration)
-- Example:
-- DROP INDEX IF EXISTS idx_products_new_field;
-- ALTER TABLE products DROP COLUMN IF EXISTS new_field;

-- Make sure to reverse all changes made in the migration
-- Drop objects in reverse dependency order

COMMIT;`;
}

function generateDataMigrationTemplate(version: string, description: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `-- Migration: ${version}_${description}
-- Description: ${description.replace(/_/g, ' ')} (Data Migration)
-- Author: Database Migration System
-- Created: ${date}

BEGIN;

-- Data migration template
-- This template is for migrations that primarily modify data rather than schema

-- 1. Create temporary tables if needed for complex transformations
-- CREATE TEMP TABLE temp_migration_data AS 
-- SELECT ... FROM existing_table WHERE ...;

-- 2. Perform data transformations
-- UPDATE existing_table SET 
--     new_column = CASE 
--         WHEN condition THEN value1
--         ELSE value2
--     END
-- WHERE criteria;

-- 3. Data validation (optional but recommended)
-- DO $$
-- DECLARE
--     row_count INTEGER;
-- BEGIN
--     SELECT COUNT(*) INTO row_count FROM table_name WHERE validation_condition;
--     IF row_count != expected_count THEN
--         RAISE EXCEPTION 'Data validation failed: expected %, got %', expected_count, row_count;
--     END IF;
-- END $$;

-- 4. Clean up temporary objects
-- DROP TABLE IF EXISTS temp_migration_data;

COMMIT;`;
}

async function createMigration() {
  const options = parseArgs();

  if (!options.name) {
    console.error('❌ Migration name is required');
    console.log('Usage: npm run migrate:create -- --name="description_of_migration"');
    console.log('Example: npm run migrate:create -- --name="add_user_preferences_table"');
    process.exit(1);
  }

  try {
    const version = getNextVersion();
    const sanitizedName = sanitizeName(options.name);
    const filename = `${version}_${sanitizedName}.sql`;
    const rollbackFilename = `${version}_${sanitizedName}.rollback.sql`;
    
    const migrationsPath = join(__dirname, '../schema');
    const migrationPath = join(migrationsPath, filename);
    const rollbackPath = join(migrationsPath, rollbackFilename);

    // Choose template based on options
    let migrationContent: string;
    if (options.template === 'data') {
      migrationContent = generateDataMigrationTemplate(version, sanitizedName);
    } else {
      migrationContent = generateMigrationTemplate(version, sanitizedName);
    }

    const rollbackContent = generateRollbackTemplate(version, sanitizedName);

    // Write files
    writeFileSync(migrationPath, migrationContent);
    writeFileSync(rollbackPath, rollbackContent);

    console.log('✅ Migration files created successfully!');
    console.log();
    console.log('📁 Files created:');
    console.log(`  - Migration: ${filename}`);
    console.log(`  - Rollback:  ${rollbackFilename}`);
    console.log();
    console.log('📝 Next steps:');
    console.log('  1. Edit the migration file to add your SQL changes');
    console.log('  2. Edit the rollback file to reverse those changes');
    console.log('  3. Test your migration: npm run migrate:up -- --dry-run');
    console.log('  4. Apply migration: npm run migrate:up');
    console.log();
    console.log(`💡 Migration path: migrations/schema/${filename}`);

  } catch (error) {
    console.error('💥 Failed to create migration:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run migrate:create -- --name="migration_description" [--template=TYPE]

Creates a new migration file with the next sequential version number.

Options:
  --name=DESCRIPTION    Description of the migration (required)
  --template=TYPE       Template type: "default" or "data" (optional)
  --help, -h           Show this help message

Templates:
  default              Standard schema migration template
  data                 Data migration template for complex data transformations

Examples:
  npm run migrate:create -- --name="add_user_preferences_table"
  npm run migrate:create -- --name="migrate_old_product_data" --template=data
  npm run migrate:create -- --name="add_indexes_for_performance"

The migration name will be sanitized (spaces become underscores, special chars removed).
Both migration and rollback files will be created automatically.
`);
  process.exit(0);
}

// Create migration
createMigration().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});