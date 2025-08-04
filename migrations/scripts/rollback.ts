#!/usr/bin/env node
import { MigrationManager } from './utils';

/**
 * Migration rollback script
 * Usage: npm run migrate:down [-- --to=VERSION]
 */

interface RollbackOptions {
  to?: number;
  steps?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

function parseArgs(): RollbackOptions {
  const args = process.argv.slice(2);
  const options: RollbackOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--to=')) {
      options.to = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--steps=')) {
      options.steps = parseInt(arg.split('=')[1], 10);
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

async function rollback() {
  const options = parseArgs();
  const manager = new MigrationManager();

  try {
    console.log('🔄 Starting migration rollback...\n');

    // Get applied migrations
    console.log('📊 Checking applied migrations...');
    const appliedMigrations = await manager.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      console.log('ℹ️  No migrations to rollback. Database is at initial state.');
      return;
    }

    // Determine which migrations to rollback
    let migrationsToRollback = [...appliedMigrations].reverse(); // Rollback in reverse order

    if (options.to) {
      // Rollback to specific version (exclusive)
      migrationsToRollback = migrationsToRollback.filter(m => m.version > options.to);
    } else if (options.steps) {
      // Rollback specific number of steps
      migrationsToRollback = migrationsToRollback.slice(0, options.steps);
    } else {
      // Default: rollback only the last migration
      migrationsToRollback = migrationsToRollback.slice(0, 1);
    }

    if (migrationsToRollback.length === 0) {
      console.log('ℹ️  No migrations to rollback based on specified criteria.');
      return;
    }

    console.log(`📝 Found ${migrationsToRollback.length} migration(s) to rollback:`);
    migrationsToRollback.forEach(migration => {
      console.log(`  - ${migration.filename}: ${migration.description}`);
    });
    console.log();

    if (options.dryRun) {
      console.log('🧪 Dry run mode - no rollbacks will be executed');
      return;
    }

    // Confirm rollback for multiple migrations
    if (migrationsToRollback.length > 1) {
      console.log('⚠️  You are about to rollback multiple migrations.');
      console.log('   This will revert your database to an earlier state.');
      console.log('   Make sure you have a backup of your data!\n');
      
      // In a real implementation, you might want to add interactive confirmation
      // For now, we'll proceed with a warning
      console.log('🚨 Proceeding with rollback...\n');
    }

    // Execute rollbacks
    console.log('⚡ Executing rollbacks...\n');
    
    let totalTime = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const migration of migrationsToRollback) {
      const result = await manager.rollbackMigration(migration);
      totalTime += result.executionTime;
      
      if (result.success) {
        successCount++;
        console.log(
          `✅ Rolled back ${result.migration.filename} - ${formatDuration(result.executionTime)}`
        );
        if (options.verbose) {
          console.log(`   ${result.migration.description}`);
        }
      } else {
        failureCount++;
        console.error(
          `❌ Failed to rollback ${result.migration.filename} - ${formatDuration(result.executionTime)}`
        );
        console.error(`   Error: ${result.error}`);
        break; // Stop on first failure
      }
    }

    console.log();
    console.log('📈 Rollback Summary:');
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failureCount}`);
    console.log(`  - Total time: ${formatDuration(totalTime)}`);

    if (failureCount > 0) {
      console.log('\n⚠️  Rollback failed. Please review the error and fix manually.');
      console.log('   The database may be in an inconsistent state.');
      process.exit(1);
    } else {
      console.log('\n🎉 All rollbacks completed successfully!');
      
      // Show current migration status
      const remainingMigrations = await manager.getAppliedMigrations();
      if (remainingMigrations.length === 0) {
        console.log('📊 Database is now at initial state (no migrations applied)');
      } else {
        const latest = remainingMigrations[remainingMigrations.length - 1];
        console.log(`📊 Database is now at migration: ${latest.filename}`);
      }
    }

  } catch (error) {
    console.error('💥 Rollback failed with error:');
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
Usage: npm run migrate:down [options]

Options:
  --to=VERSION    Rollback to specific version (exclusive)
  --steps=N       Rollback N number of migrations
  --dry-run       Show what would be executed without running
  --verbose       Show detailed output
  --help, -h      Show this help message

Examples:
  npm run migrate:down                      # Rollback last migration
  npm run migrate:down -- --steps=2        # Rollback last 2 migrations
  npm run migrate:down -- --to=001         # Rollback to version 001 (rollback all after 001)
  npm run migrate:down -- --dry-run        # Preview what would be rolled back
  npm run migrate:down -- --verbose        # Show detailed output

Note: Rollbacks are executed in reverse order (latest first)
`);
  process.exit(0);
}

// Run rollback
rollback().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});