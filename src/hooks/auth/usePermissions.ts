'use client'

import { useAuth } from './useAuth'
import type { UserRole } from '@/types/auth'

// Maps each role to its platform permissions.
// Kept client-side for UI gating only — server actions / routes enforce
// capabilities independently via src/lib/roles.ts.
const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  admin: new Set([
    'property:create', 'property:edit', 'property:delete', 'property:verify',
    'product:create', 'product:edit', 'product:delete',
    'user:manage', 'user:suspend', 'user:assign_role',
    'report:review', 'announcement:create',
    'escrow:release', 'payment:refund',
    'forum:moderate', 'forum:post', 'forum:comment',
    'service:create', 'service:edit', 'job:post', 'tender:post',
  ]),
  buyer: new Set([
    'property:favorite', 'property:inquire',
    'product:purchase', 'cart:manage',
    'rental:book',
    'review:submit',
    'message:send',
    'forum:post', 'forum:comment',
    'job:apply',
  ]),
  tenant: new Set([
    'property:favorite', 'property:inquire',
    'rental:book',
    'review:submit',
    'message:send',
    'forum:post', 'forum:comment',
  ]),
  seller: new Set([
    'property:create', 'property:edit', 'property:delete',
    'review:submit', 'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
    'job:post',
  ]),
  agent: new Set([
    'property:create', 'property:edit', 'property:delete',
    'property:inquire',
    'review:submit', 'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
    'job:post',
  ]),
  vendor: new Set([
    'product:create', 'product:edit', 'product:delete',
    'order:manage',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
    'tender:bid',
  ]),
  contractor: new Set([
    'service:create', 'service:edit',
    'portfolio:manage',
    'job:apply', 'tender:bid',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
    'rental:book',
  ]),
  engineer: new Set([
    'service:create', 'service:edit',
    'portfolio:manage',
    'job:apply', 'tender:bid',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
  ]),
  architect: new Set([
    'service:create', 'service:edit',
    'portfolio:manage',
    'job:apply', 'tender:bid',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
  ]),
  lawyer: new Set([
    'service:create', 'service:edit',
    'job:apply', 'tender:bid',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
  ]),
  developer: new Set([
    'property:create', 'property:edit', 'property:delete',
    'property:inquire',
    'review:submit', 'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
    'job:post',
  ]),
  property_manager: new Set([
    'property:create', 'property:edit',
    'property:inquire',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
  ]),
  surveyor: new Set([
    'service:create', 'service:edit',
    'portfolio:manage',
    'job:apply', 'tender:bid',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
  ]),
  maintenance: new Set([
    'service:create', 'service:edit',
    'job:apply', 'tender:bid',
    'review:respond',
    'message:send',
    'forum:post', 'forum:comment',
  ]),
}

export function usePermissions() {
  const { role, isAuthenticated } = useAuth()

  function can(permission: string): boolean {
    if (!isAuthenticated || !role) return false
    return ROLE_PERMISSIONS[role]?.has(permission) ?? false
  }

  function canAny(permissions: string[]): boolean {
    return permissions.some(can)
  }

  function canAll(permissions: string[]): boolean {
    return permissions.every(can)
  }

  function hasRole(...roles: UserRole[]): boolean {
    if (!role) return false
    return roles.includes(role)
  }

  return {
    can,
    canAny,
    canAll,
    hasRole,
    permissions: role ? ROLE_PERMISSIONS[role] : new Set<string>(),
  }
}
