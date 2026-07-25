import {
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  FileSignature,
  UserCog,
  BarChart2,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  resource: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    resource: 'clients',
    label: 'Clienti',
    href: '/dashboard/clients',
    icon: Users,
    description: 'Anagrafica clienti e sincronizzazione con Fatture in Cloud',
  },
  {
    resource: 'contracts',
    label: 'Contratti',
    href: '/dashboard/contracts',
    icon: FileSignature,
    description: 'Gestione contratti e scadenze',
  },
  {
    resource: 'jobs',
    label: 'Lavori',
    href: '/dashboard/jobs',
    icon: Briefcase,
    description: 'Pianificazione e avanzamento dei lavori',
  },
  {
    resource: 'tasks',
    label: 'Task',
    href: '/dashboard/tasks',
    icon: CheckSquare,
    description: 'Attività e assegnazioni del team',
  },
  {
    resource: 'invoices',
    label: 'Fatture',
    href: '/dashboard/invoices',
    icon: FileText,
    description: 'Fatturazione e sincronizzazione con Fatture in Cloud',
  },
  {
    resource: 'users',
    label: 'Utenti',
    href: '/dashboard/users',
    icon: UserCog,
    description: 'Gestione utenti e permessi',
  },
  {
    resource: 'reports',
    label: 'Report',
    href: '/dashboard/reports',
    icon: BarChart2,
    description: 'Statistiche e reportistica',
  },
  {
    resource: 'audit_logs',
    label: 'Log Attività',
    href: '/dashboard/audit-logs',
    icon: History,
    description: 'Cronologia delle attività sul gestionale',
  },
  {
    resource: 'settings',
    label: 'Impostazioni',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Integrazioni, catalogo prodotti e gestione accessi',
  },
];

// 'users' e 'settings' concedono sempre almeno 'read' a tutti i ruoli
// (vedi PERMISSION_MATRIX in lib/permissions.ts) ma non devono comparire
// come sezioni di navigazione complete per i ruoli con permessi minimi:
// mostriamo 'Utenti' solo a chi può fare più di un semplice 'read' del
// proprio profilo (cioè chi ha anche 'invite' o superiore).
export function shouldShowNavItem(resource: string, permissions: string[]): boolean {
  if (permissions.length === 0) return false;
  if (resource === 'users') return permissions.includes('invite') || permissions.includes('create');
  return true;
}
