/**
 * Commission Cargo - User Permissions
 * Role-based access control utilities
 */

import type { UserRole } from './types';

export interface Permission {
    canViewRates: boolean;
    canEditRates: boolean;
    canViewShipments: boolean;
    canEditShipments: boolean;
    canDeleteShipments: boolean;
    canImportCsv: boolean;
    canExportCsv: boolean;
    canRecalculate: boolean;
    canViewSummary: boolean;
    canViewDashboard: boolean;
    canViewAuditLogs: boolean;
    canManageUsers: boolean;
    canManageSalespeople: boolean;
    canManageCustomers: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
    ADMIN: {
        canViewRates: true,
        canEditRates: true,
        canViewShipments: true,
        canEditShipments: true,
        canDeleteShipments: true,
        canImportCsv: true,
        canExportCsv: true,
        canRecalculate: true,
        canViewSummary: true,
        canViewDashboard: true,
        canViewAuditLogs: true,
        canManageUsers: true,
        canManageSalespeople: true,
        canManageCustomers: true,
    },
    MANAGER: {
        canViewRates: true,
        canEditRates: true,
        canViewShipments: true,
        canEditShipments: true,
        canDeleteShipments: true,
        canImportCsv: true,
        canExportCsv: true,
        canRecalculate: true,
        canViewSummary: true,
        canViewDashboard: true,
        canViewAuditLogs: true,
        canManageUsers: false,
        canManageSalespeople: true,
        canManageCustomers: true,
    },
    STAFF: {
        canViewRates: true,
        canEditRates: false,
        canViewShipments: true,
        canEditShipments: true,
        canDeleteShipments: false,
        canImportCsv: true,
        canExportCsv: true,
        canRecalculate: false,
        canViewSummary: true,
        canViewDashboard: false,
        canViewAuditLogs: false,
        canManageUsers: false,
        canManageSalespeople: false,
        canManageCustomers: true,
    },
    SALE: {
        canViewRates: false,
        canEditRates: false,
        canViewShipments: true,
        canEditShipments: true,
        canDeleteShipments: false,
        canImportCsv: false,
        canExportCsv: true,
        canRecalculate: false,
        canViewSummary: true,
        canViewDashboard: false,
        canViewAuditLogs: false,
        canManageUsers: false,
        canManageSalespeople: false,
        canManageCustomers: false,
    },
};

/**
 * Get permissions for a user role
 */
export function getPermissions(role: UserRole): Permission {
    return ROLE_PERMISSIONS[role];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
    return ROLE_PERMISSIONS[role][permission];
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
    const permissions = getPermissions(role);

    const routePermissions: Record<string, keyof Permission> = {
        '/rates': 'canViewRates',
        '/shipments': 'canViewShipments',
        '/summary': 'canViewSummary',
        '/dashboard': 'canViewDashboard',
        '/logs': 'canViewAuditLogs',
        '/settings': 'canManageUsers',
    };

    const requiredPermission = routePermissions[route];
    if (!requiredPermission) return true; // Default allow for unspecified routes

    return permissions[requiredPermission];
}
