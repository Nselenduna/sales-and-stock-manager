# API Documentation

This directory contains the comprehensive API documentation for the Sales and Stock Manager application.

## Overview

The Sales and Stock Manager is a React Native mobile application that uses Supabase as its backend. The API documentation represents the Supabase database operations that the mobile app performs.

## Documentation Files

- `openapi.yaml` - OpenAPI 3.0.3 specification with complete API documentation
- `index.html` - Swagger UI interface for interactive API exploration
- `README.md` - This documentation file

## API Structure

The API is organized into the following main sections:

### 1. Authentication (`/auth/v1/`)
- **POST** `/auth/v1/token` - Sign in user
- **POST** `/auth/v1/signup` - Register new user
- **POST** `/auth/v1/logout` - Sign out user

### 2. Products (`/rest/v1/products`)
- **GET** `/rest/v1/products` - List products with filtering and pagination
- **POST** `/rest/v1/products` - Create new product
- **GET** `/rest/v1/products/{productId}` - Get product by ID
- **PATCH** `/rest/v1/products/{productId}` - Update product
- **DELETE** `/rest/v1/products/{productId}` - Delete product

### 3. Sales (`/rest/v1/sales`)
- **GET** `/rest/v1/sales` - List sales transactions
- **POST** `/rest/v1/sales` - Create new sale transaction
- **GET** `/rest/v1/sales/{saleId}` - Get sale by ID

### 4. Users & Roles (`/rest/v1/roles`)
- **GET** `/rest/v1/roles` - List user roles (Admin only)
- **POST** `/rest/v1/roles` - Create user role (Admin only)
- **PATCH** `/rest/v1/roles/{roleId}` - Update user role (Admin only)

### 5. Stock Alerts (`/rest/v1/low-stock`)
- **GET** `/rest/v1/low-stock` - Get low stock products

## Authorization & Permissions

The API uses Supabase Auth with JWT tokens and implements role-based access control:

### Roles
- **Admin**: Full access to all operations including user management
- **Staff**: Can manage inventory and process sales
- **Viewer**: Read-only access to data

### Authentication
All endpoints (except sign-up and sign-in) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Data Models

### Core Entities

#### Product
```json
{
  "id": "uuid",
  "name": "string",
  "sku": "string", 
  "barcode": "string",
  "quantity": "integer",
  "low_stock_threshold": "integer",
  "location": "string",
  "unit_price": "number",
  "description": "string",
  "category": "string",
  "image_url": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### Sales Transaction
```json
{
  "id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": "integer",
      "unit_price": "integer (pence)",
      "total_price": "integer (pence)",
      "product_name": "string"
    }
  ],
  "total": "integer (pence)",
  "status": "queued|synced|failed|completed",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "payment_method": "string",
  "notes": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `422` - Validation Error (invalid data format)

## Offline Support

The mobile application supports offline operations with automatic synchronization:

- Operations are queued locally when offline
- Automatic sync when connection is restored
- Conflict resolution for concurrent modifications
- Exponential backoff for failed sync attempts

## Viewing the Documentation

### Local Development

1. **Start the documentation server:**
   ```bash
   npm run docs:serve
   ```

2. **Open in browser:**
   Navigate to `http://localhost:8080` to view the Swagger UI interface.

### Alternative Methods

1. **Static HTML file:**
   Open `docs/api/index.html` directly in your browser

2. **VS Code extension:**
   Install the "OpenAPI (Swagger) Editor" extension and open `openapi.yaml`

3. **Online validators:**
   Upload `openapi.yaml` to [Swagger Editor](https://editor.swagger.io/)

## Validation

Validate the OpenAPI specification:
```bash
npm run docs:validate
```

Bundle the specification (resolves all $ref references):
```bash
npm run docs:bundle
```

## Development

### Adding New Endpoints

1. Update the `openapi.yaml` file with the new endpoint
2. Add request/response schemas to the `components/schemas` section
3. Include appropriate error responses
4. Document required permissions and role access
5. Validate the specification with `npm run docs:validate`

### Schema Updates

When updating data models:
1. Update the corresponding schema in `components/schemas`
2. Update any endpoints that use the schema
3. Ensure examples are accurate
4. Test with real data from the application

## Best Practices

1. **Keep schemas in sync** - Ensure OpenAPI schemas match TypeScript interfaces
2. **Include examples** - Provide realistic examples for all request/response bodies
3. **Document permissions** - Clearly specify role requirements for each endpoint
4. **Error documentation** - Include all possible error responses
5. **Version control** - Update version numbers when making breaking changes

## Related Files

- [`lib/supabase.ts`](../../lib/supabase.ts) - TypeScript interfaces and Supabase client
- [`store/authStore.ts`](../../store/authStore.ts) - Authentication logic
- [`hooks/useSales.ts`](../../hooks/useSales.ts) - Sales operations
- [Main README](../../README.md) - Project overview and setup instructions