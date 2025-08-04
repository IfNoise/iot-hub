// RBAC Types
export interface UserContext {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  organizationId?: string;
  groupIds?: string[];
}

export interface AccessRequest {
  userId: string;
  resource: string;
  resourceId: string;
  action: string;
  context?: Record<string, unknown>;
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
}
