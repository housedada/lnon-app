import { getRoleDescription, getUserPermissions } from '@/lib/permissions';

const SECTION_LABELS: Record<string, string> = {
  clients: 'Clienti',
  jobs: 'Lavori',
  tasks: 'Task',
  invoices: 'Fatture',
  users: 'Utenti',
  reports: 'Report',
  audit_logs: 'Log Attività',
  settings: 'Impostazioni',
};

export default function SuperadminDashboardPage() {
  const permissions = getUserPermissions('superadmin');
  const sections = Object.entries(permissions)
    .filter(([, actions]) => actions.length > 0)
    .map(([resource]) => SECTION_LABELS[resource] ?? resource);

  return (
    <div>
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard Super Admin</h1>
        <p className="mt-1 text-sm text-neutral-500">{getRoleDescription('superadmin')}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 border-t border-l border-grid-border sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((label) => (
          <div key={label} className="border-r border-b border-grid-border p-5">
            <p className="text-sm font-medium text-neutral-900">{label}</p>
            <p className="mt-1 text-xs text-neutral-400">Prossimamente</p>
          </div>
        ))}
      </div>
    </div>
  );
}
