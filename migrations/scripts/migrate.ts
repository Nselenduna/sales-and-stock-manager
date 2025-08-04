#!/usr/bin/env node
import { MigrationManager } from './utils';

/**
 * Migration runner script
 * Usage: npm run migrate:up [-- --to=VERSION]
 */

interface MigrateOptions {
  to?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

function parseArgs(): MigrateOptions {
  const args = process.argv.slice(2);
  const options: MigrateOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--to=')) {
      options.to = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function migrate() {
  const options = parseArgs();
  const manager = new MigrationManager();

  try {
    console.log('🚀 Starting database migration...\n');

    // Initialize migration table
    if (options.verbose) {
      console.log('📋 Initializing migration tracking table...');
    }
    await manager.initializeMigrationTable();

    // Validate existing migrations
    console.log('🔍 Validating migration integrity...');
    const validation = await manager.validateMigrations();
    if (!validation.valid) {
      console.error('❌ Migration validation failed:');
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      process.exit(1);
    }
    console.log('✅ Migration integrity verified\n');

    // Get pending migrations
    console.log('📊 Checking for pending migrations...');
    let pendingMigrations = await manager.getPendingMigrations();

    if (options.to) {
      pendingMigrations = pendingMigrations.filter(m => m.version <= options.to);
    }

    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations found. Database is up to date!');
      return;
    }

    console.log(`📝 Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach(migration => {
      console.log(`  - ${migration.filename}: ${migration.description}`);
    });
    console.log();

    if (options.dryRun) {
      console.log('🧪 Dry run mode - no migrations will be executed');
      return;
    }

    // Execute migrations
    console.log('⚡ Executing migrations...\n');
    const results = await manager.runMigrations(pendingMigrations);

    let totalTime = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const result of results) {
      totalTime += result.executionTime;
      
      if (result.success) {
        successCount++;
        console.log(
          `✅ ${result.migration.filename} - ${formatDuration(result.executionTime)}`
        );
        if (options.verbose) {
          console.log(`   ${result.migration.description}`);
        }
      } else {
        failureCount++;
        console.error(
          `❌ ${result.migration.filename} - Failed after ${formatDuration(result.executionTime)}`
        );
        console.error(`   Error: ${result.error}`);
        break; // Stop on first failure
      }
    }

    console.log();
    console.log('📈 Migration Summary:');
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failureCount}`);
    console.log(`  - Total time: ${formatDuration(totalTime)}`);

    if (failureCount > 0) {
      console.log('\n⚠️  Migration failed. Please review the error and fix before retrying.');
      process.exit(1);
    } else {
      console.log('\n🎉 All migrations completed successfully!');
    }

  } catch (error) {
    console.error('💥 Migration failed with error:');
    console.error((error as Error).message);
    if (options.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run migrate:up [options]

Options:
  --to=VERSION    Run migrations up to specific version
  --dry-run       Show what would be executed without running
  --verbose       Show detailed output
  --help, -h      Show this help message

Examples:
  npm run migrate:up                    # Run all pending migrations
  npm run migrate:up -- --to=003       # Run migrations up to version 003
  npm run migrate:up -- --dry-run      # Preview pending migrations
  npm run migrate:up -- --verbose      # Show detailed output
`);
  process.exit(0);
}

// Run migrations
migrate().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});