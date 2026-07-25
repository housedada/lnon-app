import Link from 'next/link';
import type { UserRole } from '@/lib/types';
import { getUserPermissions } from '@/lib/permissions';
import { NAV_ITEMS, shouldShowNavItem } from '@/lib/navItems';

export default function DashboardSections({ role }: { role: UserRole }) {
  const permissions = getUserPermissions(role);
  const items = NAV_ITEMS.filter((item) => shouldShowNavItem(item.resource, permissions[item.resource] ?? []));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.resource}
          href={item.href}
          className="flex items-start gap-3 rounded-lg border border-grid-border p-4 transition hover:bg-row-hover"
        >
          <item.icon size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-primary">{item.label}</p>
            <p className="mt-1 text-xs text-secondary">{item.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
