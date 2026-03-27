/**
 * Role-Based Access Control (RBAC) System
 * Manages user roles and permissions for different modules
 */

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface Permission {
  module: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'print' | 'export')[];
}

export interface RolePermissions {
  admin: Permission[];
  staff: Permission[];
  viewer: Permission[];
}

// Define role-based permissions
export const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    {
      module: 'accountability',
      actions: ['view', 'create', 'edit', 'delete', 'print', 'export']
    },
    {
      module: 'asset-inventory',
      actions: ['view', 'create', 'edit', 'delete', 'print', 'export']
    },
    {
      module: 'software-inventory',
      actions: ['view', 'create', 'edit', 'delete', 'print', 'export']
    },
    {
      module: 'license-maintenance',
      actions: ['view', 'create', 'edit', 'delete', 'print', 'export']
    },
    {
      module: 'disposal',
      actions: ['view', 'create', 'edit', 'delete', 'print', 'export']
    },
    {
      module: 'returned-assets',
      actions: ['view', 'create', 'edit', 'delete', 'print', 'export']
    },
    {
      module: 'ipad-inventory',
      actions: ['view', 'create', 'edit', 'delete', 'print', 'export']
    }
  ],
  staff: [
    {
      module: 'accountability',
      actions: ['view', 'create', 'print']
    },
    {
      module: 'asset-inventory',
      actions: ['view', 'print']
    },
    {
      module: 'software-inventory',
      actions: ['view', 'create', 'print']
    },
    {
      module: 'license-maintenance',
      actions: ['view', 'print']
    },
    {
      module: 'disposal',
      actions: ['view', 'create', 'print']
    },
    {
      module: 'returned-assets',
      actions: ['view', 'create', 'print']
    },
    {
      module: 'ipad-inventory',
      actions: ['view', 'print']
    }
  ],
  viewer: [
    {
      module: 'accountability',
      actions: ['view', 'print']
    },
    {
      module: 'asset-inventory',
      actions: ['view', 'print']
    },
    {
      module: 'software-inventory',
      actions: ['view', 'print']
    },
    {
      module: 'license-maintenance',
      actions: ['view', 'print']
    },
    {
      module: 'disposal',
      actions: ['view', 'print']
    },
    {
      module: 'returned-assets',
      actions: ['view', 'print']
    },
    {
      module: 'ipad-inventory',
      actions: ['view', 'print']
    }
  ]
};

/**
 * Check if a user role has permission for a specific action on a module
 */
export function hasPermission(
  userRole: UserRole,
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'print' | 'export'
): boolean {
  const permission = ROLE_PERMISSIONS[userRole as keyof RolePermissions];
  const modulePermission = permission?.find((p: Permission) => p.module === module);
  return modulePermission?.actions.includes(action) ?? false;
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole as keyof RolePermissions] || [];
}

/**
 * Check if user can access a module
 */
export function canAccessModule(userRole: UserRole, module: string): boolean {
  const permission = ROLE_PERMISSIONS[userRole as keyof RolePermissions];
  return permission.some((p: Permission) => p.module === module);
}

/**
 * Get allowed modules for a role
 */
export function getAllowedModules(userRole: UserRole): string[] {
  const permission = ROLE_PERMISSIONS[userRole as keyof RolePermissions];
  return permission.map((p: Permission) => p.module);
}
