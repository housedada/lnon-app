import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getFicAuthorizationUrl } from '@/lib/fattureincloud';

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !hasPermission(role, 'settings', 'manage_integrations')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const state = randomBytes(24).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('fic_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return NextResponse.redirect(getFicAuthorizationUrl(state));
}
