import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { exchangeCodeForTokens, getFicCompanies } from '@/lib/fattureincloud';
import { saveFicConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'settings', 'manage_integrations')) {
    return NextResponse.redirect(new URL('/dashboard/settings/fic?error=forbidden', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get('fic_oauth_state')?.value;
  cookieStore.delete('fic_oauth_state');

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/dashboard/settings/fic?error=invalid_state', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const companies = await getFicCompanies(tokens.accessToken);
    const company = companies[0];

    if (!company?.id) {
      return NextResponse.redirect(new URL('/dashboard/settings/fic?error=no_company', request.url));
    }

    await saveFicConnection({
      ficCompanyId: company.id,
      ficCompanyName: company.name ?? undefined,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      connectedBy: userId,
    });

    return NextResponse.redirect(new URL('/dashboard/settings/fic?connected=1', request.url));
  } catch (error) {
    console.error('Errore durante il collegamento a Fatture in Cloud:', error);
    return NextResponse.redirect(new URL('/dashboard/settings/fic?error=exchange_failed', request.url));
  }
}
