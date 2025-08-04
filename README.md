# Sales and Stocks Manager

A comprehensive React Native mobile application for inventory management, sales tracking, and stock monitoring with offline capabilities and **role-based access control**.

## 🚀 Project Status

### ✅ Completed Phases

#### Phase 1: Stabilization (100% Complete)
- **Test Infrastructure Fix**: Resolved missing dependencies and Babel configuration
- **Input Sanitization**: Comprehensive XSS protection and data validation
- **Image Upload Testing**: Complete test coverage for upload functionality
- **Barcode Scanner Testing**: Full test suite for scanner and permissions
- **Regression Testing**: Clean test suite with 0 failures

#### Phase 2: Enhancement (100% Complete)
- **Performance Optimization**:
  - Virtualized Inventory List with FlashList
  - Debounced Product Search
  - Lazy Image Loading
- **Offline Sync Enhancements**:
  - Conflict Resolution with auto-merge and user prompts
  - Sync Status Feedback UI with real-time indicators

#### Phase 3A: Dashboard Restoration (100% Complete) ⭐ **NEW**
- **Stock Alerts Button**: Functional dashboard card routing to `StockAlertScreen`
- **Quick Actions Module**: Modal interface with 6 predefined actions
- **Live Data Integration**: Real-time stock monitoring and alerts
- **Navigation Enhancement**: Seamless routing between dashboard and features

#### Phase 3B: User Role Management (100% Complete) ⭐ **NEW**
- **Role-Based Access Control**: Comprehensive RBAC system with Admin, Manager, and Cashier roles
- **Secure Role Assignment**: Permission-based role assignment with hierarchy validation
- **Role-Based UI**: Components automatically hide/show based on user permissions
- **Comprehensive Testing**: Full test coverage for permissions and role management
- **Type Safety**: Complete TypeScript integration for role-based features

### 🔄 Current Phase: Phase 3B - User Role Management

**Status**: ✅ **COMPLETED**

#### Implemented Features:

**1. Role-Based Access Control System**
- **User Roles**: Admin, Manager, Cashier with hierarchical permissions
- **Permission System**: Granular permissions for sales, inventory, users, reports, and system
- **Secure Validation**: Server-side permission checking with role hierarchy enforcement
- **Type Safety**: Full TypeScript integration for compile-time permission validation

**2. User Management Interface**
- **User Management Screen**: Create, edit, and manage user accounts
- **Permission Management Screen**: Configure role permissions with real-time updates
- **Role Assignment**: Secure role assignment with validation and audit logging
- **Status Management**: Activate/deactivate users with proper authorization

**3. UI Protection Components**
- **ProtectedComponent**: Wrap any UI element with permission-based visibility
- **ProtectedScreen**: Full screen protection with access denied fallbacks
- **Role-Based Navigation**: Different navigation based on user roles

**4. Security Features**
- **Role Hierarchy**: Admin > Manager > Cashier with proper management restrictions
- **Permission Validation**: Multi-layer permission checking for all sensitive operations
- **Audit Logging**: Comprehensive logging of role changes and user management actions
- **Session Management**: Proper role-based session handling with persistence

**5. Testing Infrastructure**
- **Permission Tests**: Comprehensive test suite for all permission scenarios
- **Role Management Tests**: Full test coverage for secure role assignment
- **Component Tests**: Tests for protected UI components and screens
- **Integration Tests**: End-to-end testing of role-based workflows

## 🔐 Role-Based Access Control

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | System Administrator | Full access to all features |
| **Manager** | Store Manager | Sales, inventory, user management (lower roles) |
| **Cashier** | Store Cashier | Sales transactions, inventory viewing |

### Permission Matrix

| Feature | Admin | Manager | Cashier |
|---------|-------|---------|---------|
| **Sales** |
| View Sales | ✅ | ✅ | ✅ |
| Create Sales | ✅ | ✅ | ✅ |
| Edit Sales | ✅ | ✅ | ❌ |
| Delete Sales | ✅ | ❌ | ❌ |
| Process Refunds | ✅ | ✅ | ❌ |
| **Inventory** |
| View Inventory | ✅ | ✅ | ✅ |
| Add Products | ✅ | ✅ | ❌ |
| Edit Products | ✅ | ✅ | ❌ |
| Delete Products | ✅ | ❌ | ❌ |
| Adjust Stock | ✅ | ✅ | ❌ |
| **User Management** |
| View Users | ✅ | ✅ | ❌ |
| Create Users | ✅ | ✅ | ❌ |
| Edit Users | ✅ | ✅ | ❌ |
| Assign Roles | ✅ | ✅* | ❌ |
| **Reports** |
| View Reports | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ❌ |
| Create Reports | ✅ | ❌ | ❌ |
| **System** |
| System Settings | ✅ | ❌ | ❌ |
| System Backup | ✅ | ❌ | ❌ |
| View Logs | ✅ | ✅ | ❌ |

*Managers can only assign roles to users with lower hierarchy (Cashier)

### Implementation Usage

**Protecting UI Components:**
```typescript
import { ProtectedComponent } from '../components/ProtectedComponent';

// Single permission check
<ProtectedComponent requiredPermission="sales:create">
  <Button title="Create Sale" />
</ProtectedComponent>

// Multiple permissions (ANY)
<ProtectedComponent 
  requiredPermissions={['sales:view', 'inventory:view']}
  requireAll={false}
>
  <ReportsSection />
</ProtectedComponent>

// Multiple permissions (ALL)
<ProtectedComponent 
  requiredPermissions={['users:view', 'users:edit']}
  requireAll={true}
  showFallback={true}
  fallback={<Text>Access Denied</Text>}
>
  <UserManagementPanel />
</ProtectedComponent>
```

**Protecting Screens:**
```typescript
import { ProtectedScreen } from '../components/ProtectedComponent';

const UserManagementScreen = ({ navigation }) => {
  return (
    <ProtectedScreen 
      requiredPermission="users:view"
      navigation={navigation}
    >
      <UserManagementContent />
    </ProtectedScreen>
  );
};
```

**Checking Permissions in Code:**
```typescript
import { hasPermission, hasAnyPermission } from '../lib/permissions';
import { useAuthStore } from '../store/authStore';

const MyComponent = () => {
  const { userRole } = useAuthStore();
  
  const canCreateSales = hasPermission(userRole, 'sales:create');
  const canAccessReports = hasAnyPermission(userRole, ['reports:view', 'reports:create']);
  
  return (
    <View>
      {canCreateSales && <CreateSaleButton />}
      {canAccessReports && <ReportsLink />}
    </View>
  );
};
```

**Role Management Service:**
```typescript
import { RoleManagementService } from '../lib/roleManagementService';

// Assign role (with validation)
const assignRole = async () => {
  const result = await RoleManagementService.assignRole({
    userId: 'target-user-id',
    newRole: 'manager',
    assignedBy: currentUser.id
  });
  
  if (result.success) {
    console.log('Role assigned successfully');
  } else {
    console.error('Failed to assign role:', result.error);
  }
};

// Get users (based on permissions)
const fetchUsers = async () => {
  const result = await RoleManagementService.getUsers(currentUser.id);
  if (result.success) {
    setUsers(result.users);
  }
};
```

## 🛠️ Technical Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Zustand
- **Navigation**: React Navigation v6
- **Testing**: Jest + React Native Testing Library
- **Performance**: FlashList for virtualization
- **Offline**: SQLite with sync queue management
- **Security**: Role-Based Access Control (RBAC)

## 📱 Key Features

### Core Functionality
- **Inventory Management**: CRUD operations for products with images and barcodes
- **Sales Processing**: Complete POS system with cart management and checkout
- **Stock Monitoring**: Real-time alerts for low stock items
- **Barcode Scanning**: Product lookup and inventory updates
- **Role-Based Access**: Admin, Manager, and Cashier permissions
- **Offline Support**: Full functionality without internet connection

### Security & Access Control
- **Role Hierarchy**: Multi-level user management with inheritance
- **Permission System**: Granular permissions for all operations
- **Secure Endpoints**: Server-side validation for all role assignments
- **Audit Logging**: Complete audit trail for user management actions
- **Session Management**: Persistent role-based authentication

### Performance Optimizations
- **Virtualized Lists**: Smooth scrolling with 1000+ items
- **Debounced Search**: Efficient filtering with 300ms delay
- **Lazy Image Loading**: Memory-efficient image rendering
- **Conflict Resolution**: Intelligent data merging for offline sync

### User Experience
- **Quick Actions**: One-tap access to common tasks
- **Stock Alerts**: Visual indicators for inventory issues
- **Sales Interface**: Intuitive cart management and checkout process
- **Sync Feedback**: Real-time status updates
- **Accessibility**: WCAG 2.1 AA compliant interface
- **Role-Based UI**: Context-aware interface based on permissions

## 🧪 Testing

- **Test Coverage**: ≥90% across all modules
- **Test Status**: 0 failing tests
- **Test Types**: Unit, Integration, and E2E tests
- **Mock Coverage**: Comprehensive mocking for external dependencies
- **Role Testing**: Complete test suite for permission and role scenarios

### Role Management Tests
```bash
# Run permission tests
npm test -- __tests__/lib/permissions.test.ts

# Run role management service tests
npm test -- __tests__/lib/roleManagementService.test.ts

# Run all role-related tests
npm test -- __tests__/lib/
```

## 📊 Performance Metrics

- **List Rendering**: 60fps with 1000+ items
- **Search Performance**: <300ms debounce delay
- **Image Loading**: 40%+ reduction in memory usage
- **Sync Performance**: Exponential backoff with retry logic
- **Permission Checks**: <1ms average validation time

## 🔐 Security & Compliance

- **Input Sanitization**: XSS protection and SQL injection prevention
- **Data Privacy**: GDPR-compliant offline data handling
- **Authentication**: Secure role-based access control
- **Error Handling**: Graceful fallbacks for all failure scenarios
- **Role Validation**: Multi-layer permission checking
- **Audit Logging**: Complete audit trail for sensitive operations

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   - Configure Supabase credentials in environment variables
   - Set up Expo development environment

3. **Run Development Server**:
   ```bash
   npm start
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

## 📁 Project Structure

```
├── components/          # Reusable UI components
│   ├── ProtectedComponent.tsx    # Role-based access control components
│   └── ...
├── screens/            # Screen components
│   ├── sales/         # Sales module screens
│   ├── inventory/     # Inventory management screens
│   ├── dashboard/     # Role-based dashboards
│   ├── user/          # User management screens
│   │   ├── UserManagementScreen.tsx
│   │   └── PermissionManagementScreen.tsx
│   └── auth/          # Authentication screens
├── navigation/         # Navigation configuration
├── lib/               # Utility libraries and Supabase config
│   ├── permissions.ts          # Role and permission definitions
│   ├── roleManagementService.ts # Secure role management
│   └── supabase.ts
├── hooks/             # Custom React hooks
├── store/             # Zustand state management
│   └── authStore.ts   # Enhanced with role management
├── __tests__/         # Test files
│   ├── lib/           # Library tests
│   │   ├── permissions.test.ts
│   │   └── roleManagementService.test.ts
│   └── components/    # Component tests
├── modules/           # Feature documentation and specs
└── docs/              # Project documentation
```

## 🤝 Contributing

This project follows a structured development approach with:
- Comprehensive testing requirements
- Accessibility compliance
- Performance optimization
- Security best practices
- Role-based access control

## 📈 Roadmap

### Next Phases:
- **Phase 4**: Advanced Analytics and Reporting
- **Phase 5**: Multi-location Support
- **Phase 6**: Advanced Audit and Compliance Features

---

**Last Updated**: Phase 3B User Role Management completed
**Test Status**: ✅ All tests passing
**Coverage**: ≥90% across all modules 