#!/usr/bin/env node
import { MigrationManager } from './utils';

/**
 * Migration status script
 * Usage: npm run migrate:status
 */

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function showStatus() {
  const manager = new MigrationManager();

  try {
    console.log('📊 Database Migration Status\n');

    // Initialize migration table if needed
    await manager.initializeMigrationTable();

    // Get migrations
    const [available, applied, pending] = await Promise.all([
      manager.getAvailableMigrations(),
      manager.getAppliedMigrations(),
      manager.getPendingMigrations()
    ]);

    // Validate migrations
    const validation = await manager.validateMigrations();

    // Display summary
    console.log('📈 Summary:');
    console.log(`  - Available migrations: ${available.length}`);
    console.log(`  - Applied migrations:   ${applied.length}`);
    console.log(`  - Pending migrations:   ${pending.length}`);
    console.log(`  - Validation status:    ${validation.valid ? '✅ Valid' : '❌ Issues found'}`);
    console.log();

    // Show validation issues if any
    if (!validation.valid) {
      console.log('⚠️  Validation Issues:');
      validation.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
      console.log();
    }

    // Show applied migrations
    if (applied.length > 0) {
      console.log('✅ Applied Migrations:');
      console.log('┌─────────┬─────────────────────────────────┬─────────────────────┬──────────────┐');
      console.log('│ Version │ Description                     │ Applied At          │ Exec Time    │');
      console.log('├─────────┼─────────────────────────────────┼─────────────────────┼──────────────┤');
      
      applied.forEach(migration => {
        const version = migration.version.toString().padEnd(7);
        const description = migration.description.length > 31 
          ? migration.description.substring(0, 28) + '...' 
          : migration.description.padEnd(31);
        const appliedAt = migration.applied_at 
          ? formatDate(migration.applied_at).padEnd(19)
          : 'Unknown'.padEnd(19);
        const execTime = 'N/A'.padEnd(12); // We don't store this in the old format
        
        console.log(`│ ${version} │ ${description} │ ${appliedAt} │ ${execTime} │`);
      });
      
      console.log('└─────────┴─────────────────────────────────┴─────────────────────┴──────────────┘');
      console.log();
    }

    // Show pending migrations
    if (pending.length > 0) {
      console.log('⏳ Pending Migrations:');
      console.log('┌─────────┬─────────────────────────────────┬──────────────────────────────────┐');
      console.log('│ Version │ Description                     │ Filename                         │');
      console.log('├─────────┼─────────────────────────────────┼──────────────────────────────────┤');
      
      pending.forEach(migration => {
        const version = migration.version.toString().padEnd(7);
        const description = migration.description.length > 31 
          ? migration.description.substring(0, 28) + '...' 
          : migration.description.padEnd(31);
        const filename = migration.filename.length > 32
          ? migration.filename.substring(0, 29) + '...'
          : migration.filename.padEnd(32);
        
        console.log(`│ ${version} │ ${description} │ ${filename} │`);
      });
      
      console.log('└─────────┴─────────────────────────────────┴──────────────────────────────────┘');
      console.log();
    } else if (applied.length > 0) {
      console.log('🎉 No pending migrations - database is up to date!');
      console.log();
    }

    // Show current schema version
    if (applied.length > 0) {
      const latest = applied[applied.length - 1];
      console.log(`📌 Current Schema Version: ${latest.version} (${latest.description})`);
    } else {
      console.log('📌 Current Schema Version: None (no migrations applied)');
    }

    // Show next actions
    if (pending.length > 0) {
      console.log();
      console.log('💡 Next Actions:');
      console.log('  - Run migrations: npm run migrate:up');
      console.log('  - Preview pending: npm run migrate:up -- --dry-run');
    }

  } catch (error) {
    console.error('💥 Failed to get migration status:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run migrate:status

Shows the current status of database migrations including:
- Summary of available, applied, and pending migrations
- Validation status and any issues
- Detailed list of applied migrations with timestamps
- List of pending migrations
- Current schema version
- Suggested next actions

No options are required for this command.
`);
  process.exit(0);
}

// Show status
showStatus().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});