import {
  Users,
  Briefcase,
  CheckSquare,
  FileSignature,
  UserCog,
  BarChart2,
  History,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavSubItem {
  label: string;
  href: string;
  // Confronto extra oltre al pathname, per sotto-voci che si distinguono
  // via query string (es. Task Team/Personale sulla stessa route).
  matchQuery?: { key: string; value: string; default: string };
  // Valore scritto/letto in localStorage (item.viewStorageKey) quando questa
  // sotto-voce è quella attiva: la Sidebar lo usa per far puntare il link di
  // primo livello già alla sotto-vista giusta, invece di affidarsi a un
  // redirect lato pagina — che landing sulla route della prima sotto-voce
  // (indistinguibile da "nessuna scelta esplicita") applicava sempre, anche
  // quando l'utente aveva appena cliccato proprio quella sotto-voce.
  storageValue?: string;
}

export interface NavItem {
  resource: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  subItems?: NavSubItem[];
  viewStorageKey?: string;
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
    viewStorageKey: 'contracts-tab',
    subItems: [
      { label: 'Web', href: '/dashboard/contracts', storageValue: 'manutenzioni' },
      { label: 'Conteggio Orario', href: '/dashboard/contracts/hourly', storageValue: 'orario' },
    ],
  },
  {
    resource: 'jobs',
    label: 'Lavori',
    href: '/dashboard/jobs',
    icon: Briefcase,
    description: 'Pianificazione e avanzamento dei lavori',
    viewStorageKey: 'jobs-tab',
    subItems: [
      { label: 'Standard', href: '/dashboard/jobs', storageValue: 'standard' },
      { label: 'Contratti Web', href: '/dashboard/jobs/web', storageValue: 'web' },
      { label: 'Conteggio Orario', href: '/dashboard/jobs/hourly', storageValue: 'hourly' },
    ],
  },
  {
    resource: 'tasks',
    label: 'Task',
    href: '/dashboard/tasks',
    icon: CheckSquare,
    description: 'Attività e assegnazioni del team',
    viewStorageKey: 'taskBoardView',
    subItems: [
      { label: 'Team', href: '/dashboard/tasks?view=team', matchQuery: { key: 'view', value: 'team', default: 'team' }, storageValue: 'team' },
      { label: 'Personale', href: '/dashboard/tasks?view=personal', matchQuery: { key: 'view', value: 'personal', default: 'team' }, storageValue: 'personal' },
    ],
  },
  {
    resource: 'fixed_expenses',
    label: 'Spese Fisse',
    href: '/dashboard/spese-fisse',
    icon: Wallet,
    description: 'Costi fissi aziendali per anno (Commercialista, Attrezzatura, ecc.)',
  },
  {
    resource: 'users',
    label: 'Utenti',
    href: '/dashboard/users',
    icon: UserCog,
    description: 'Gestione utenti e permessi',
    subItems: [
      { label: 'Tutti', href: '/dashboard/users' },
      { label: 'Gestione Accessi', href: '/dashboard/users/access' },
    ],
  },
  {
    resource: 'reports',
    label: 'Report',
    href: '/dashboard/reports',
    icon: BarChart2,
    description: 'Overview economica di contratti e lavori',
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
    description: 'Integrazioni e catalogo prodotti',
    subItems: [
      { label: 'Fatture in Cloud', href: '/dashboard/settings/fic' },
      { label: 'Prodotti', href: '/dashboard/settings/products' },
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
