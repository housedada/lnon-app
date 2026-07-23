// lib/permissions.ts - Matrice permessi per ruoli

import { UserRole } from './types';

/**
 * Matrice dei permessi per ruolo
 * Ogni ruolo ha accesso a specifiche operazioni su risorse
 */

export const PERMISSION_MATRIX: Record<UserRole, Record<string, string[]>> = {
  superadmin: {
    users: ['read', 'create', 'update', 'delete', 'invite', 'deactivate'],
    clients: ['read', 'create', 'update', 'delete', 'export'],
    products: ['read', 'create', 'update', 'delete', 'export'],
    contracts: ['read', 'create', 'update', 'delete', 'export'],
    projects: ['read', 'create', 'update', 'delete'],
    jobs: ['read', 'create', 'update', 'delete', 'approve', 'assign', 'export'],
    tasks: ['read', 'create', 'update', 'delete', 'reassign'],
    invoices: ['read', 'create', 'update', 'delete', 'send', 'cancel'],
    reports: ['read', 'create', 'export', 'delete'],
    settings: ['read', 'update', 'manage_integrations'],
    audit_logs: ['read', 'export'],
  },
  admin: {
    users: ['read', 'invite'], // Può invitare solo dipendenti
    clients: ['read', 'create', 'update', 'export'],
    products: ['read', 'create', 'update', 'export'],
    contracts: ['read', 'create', 'update', 'export'],
    projects: ['read', 'create', 'update'],
    jobs: ['read', 'create', 'update', 'approve', 'assign', 'export'],
    tasks: ['read', 'create', 'update', 'reassign'],
    invoices: ['read', 'create', 'update', 'send'],
    reports: ['read', 'export'],
    settings: ['read'],
    audit_logs: ['read'],
  },
  dipendente: {
    users: ['read'], // Solo lettura del profilo
    clients: ['read'], // Vede solo clienti dei lavori assegnati
    products: ['read'],
    contracts: ['read'],
    projects: ['read', 'create', 'update'],
    jobs: ['read'], // Vede solo lavori assegnati a lui
    tasks: ['read', 'update'], // Può aggiornare status dei suoi task
    invoices: ['read'], // Lettura sola
    reports: [],
    settings: ['read'], // Solo lettura settings
    audit_logs: [],
  },
};

/**
 * Controlla se un utente ha permesso per un'azione
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  const permissions = PERMISSION_MATRIX[userRole];
  if (!permissions) return false;

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

/**
 * Ritorna tutti i permessi di un utente
 */
export function getUserPermissions(userRole: UserRole): Record<string, string[]> {
  return PERMISSION_MATRIX[userRole] || {};
}

/**
 * Permessi specifici per risorse (helper)
 */
export const canUserCreateClient = (role: UserRole) => hasPermission(role, 'clients', 'create');
export const canUserApproveJob = (role: UserRole) => hasPermission(role, 'jobs', 'approve');
export const canUserInviteUsers = (role: UserRole) => hasPermission(role, 'users', 'invite');
export const canUserViewAuditLogs = (role: UserRole) => hasPermission(role, 'audit_logs', 'read');
export const canUserManageSettings = (role: UserRole) => hasPermission(role, 'settings', 'update');

/**
 * I dipendenti vedono Clienti/Contratti/Lavori/Fatture ma senza cifre economiche
 * (importi, budget, widget di resoconto): vedono solo se un servizio è attivo o meno.
 */
export const canViewAmounts = (role: UserRole) => role !== 'dipendente';

/**
 * Determina se un utente può vedere una risorsa
 * (Logica di visibilità, oltre al permesso 'read')
 */
export function canViewResource(
  userRole: UserRole,
  resourceType: 'client' | 'job' | 'task',
  createdBy: string,
  assignedTo: string | null,
  currentUserId: string
): boolean {
  // Superadmin vede tutto
  if (userRole === 'superadmin') return true;

  // Admin vede tutto
  if (userRole === 'admin') return true;

  // Dipendente vede solo se:
  // - Creato da lui
  // - Assegnato a lui
  if (userRole === 'dipendente') {
    return createdBy === currentUserId || assignedTo === currentUserId;
  }

  return false;
}

/**
 * Determina se un utente può modificare una risorsa
 */
export function canEditResource(
  userRole: UserRole,
  createdBy: string,
  currentUserId: string,
  resource: string
): boolean {
  // Superadmin e admin possono modificare tutto
  if (userRole === 'superadmin' || userRole === 'admin') {
    return hasPermission(userRole, resource, 'update');
  }

  // Dipendente può modificare solo se creato da lui
  if (userRole === 'dipendente') {
    return createdBy === currentUserId && hasPermission(userRole, resource, 'update');
  }

  return false;
}

/**
 * Determina se un utente può eliminare una risorsa
 */
export function canDeleteResource(
  userRole: UserRole,
  createdBy: string,
  currentUserId: string,
  resource: string
): boolean {
  // Solo superadmin può eliminare permanentemente
  if (userRole === 'superadmin') {
    return hasPermission(userRole, resource, 'delete');
  }

  return false;
}

/**
 * Ritorna label leggibile del ruolo
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    superadmin: '👑 Super Admin',
    admin: '👔 Amministratore',
    dipendente: '👤 Dipendente',
  };
  return labels[role] || role;
}

/**
 * Descrizione del ruolo
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    superadmin: 'Accesso completo a tutte le funzionalità del sistema',
    admin: 'Gestione clienti, lavori, task e inviti di dipendenti',
    dipendente: 'Visualizzazione e aggiornamento dei propri task e lavori assegnati',
  };
  return descriptions[role] || '';
}
