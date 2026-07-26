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

export interface NavSubItem {
  label: string;
  href: string;
  // Confronto extra oltre al pathname, per sotto-voci che si distinguono
  // via query string (es. Task Team/Personale sulla stessa route).
  matchQuery?: { key: string; value: string; default: string };
}

export interface NavItem {
  resource: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  subItems?: NavSubItem[];
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
    subItems: [
      { label: 'Manutenzioni Web', href: '/dashboard/contracts' },
      { label: 'Conteggio Orario', href: '/dashboard/contracts/hourly' },
    ],
  },
  {
    resource: 'jobs',
    label: 'Lavori',
    href: '/dashboard/jobs',
    icon: Briefcase,
    description: 'Pianificazione e avanzamento dei lavori',
    subItems: [
      { label: 'Lista', href: '/dashboard/jobs' },
      { label: 'Archivio', href: '/dashboard/jobs/archive' },
      { label: 'Cestino', href: '/dashboard/jobs/trash' },
    ],
  },
  {
    resource: 'tasks',
    label: 'Task',
    href: '/dashboard/tasks',
    icon: CheckSquare,
    description: 'Attività e assegnazioni del team',
    subItems: [
      { label: 'Team', href: '/dashboard/tasks?view=team', matchQuery: { key: 'view', value: 'team', default: 'team' } },
      { label: 'Personale', href: '/dashboard/tasks?view=personal', matchQuery: { key: 'view', value: 'personal', default: 'team' } },
    ],
  },
  {
    resource: 'invoices',
    label: 'Fatture',
    href: '/dashboard/invoices',
    icon: FileText,
    description: 'Fatturazione e sincronizzazione con Fatture in Cloud',
    subItems: [
      { label: 'Lista', href: '/dashboard/invoices' },
      { label: 'Archivio', href: '/dashboard/invoices/archive' },
      { label: 'Cestino', href: '/dashboard/invoices/trash' },
    ],
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
    subItems: [
      { label: 'Overview Lavori', href: '/dashboard/reports/lavori' },
      { label: 'Spese Fisse', href: '/dashboard/reports/spese-fisse' },
    ],
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
    subItems: [
      { label: 'Fatture in Cloud', href: '/dashboard/settings/fic' },
      { label: 'Prodotti', href: '/dashboard/settings/products' },
      { label: 'Gestione Accessi', href: '/dashboard/settings/access' },
    ],
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
