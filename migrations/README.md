# Database Migrations

This directory contains database migration scripts for the Sales and Stock Manager application.

## Structure

```
migrations/
├── README.md                    # This file
├── schema/                      # SQL schema files
│   ├── 001_initial_schema.sql   # Initial database schema
│   └── 002_add_new_columns.sql  # Example migration
├── scripts/                     # TypeScript migration utilities
│   ├── migrate.ts              # Main migration runner
│   ├── rollback.ts             # Rollback utility
│   └── utils.ts                # Migration utilities
└── __tests__/                  # Migration tests
    ├── migrate.test.ts
    └── rollback.test.ts
```

## Usage

### Running Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Run specific migration
npm run migrate:up -- --to=002

# Check migration status
npm run migrate:status
```

### Rolling Back

```bash
# Rollback last migration
npm run migrate:down

# Rollback to specific migration
npm run migrate:down -- --to=001
```

## Migration File Naming

Migration files should follow this naming convention:
- `XXX_description.sql` where XXX is a 3-digit number
- Example: `001_initial_schema.sql`, `002_add_user_roles.sql`

## Safety Features

- Each migration runs in a transaction
- Rollback scripts are required for each migration
- Migration state is tracked in `schema_migrations` table
- Data integrity checks before and after migrations