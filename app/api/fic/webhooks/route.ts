import { NextRequest, NextResponse } from 'next/server';
import { markClientsOrphanedByFicId } from '@/lib/db';

const CLIENT_DELETE_EVENT = 'it.fattureincloud.webhooks.entities.clients.delete';

function isAuthorized(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  return Boolean(secret) && secret === process.env.FIC_WEBHOOK_SECRET;
}

// Handshake di verifica della subscription: FiC invia una GET con un valore
// casuale (header x-fic-verification-challenge, dato che usiamo il metodo
// 'header'), che va rispedito indietro in { verification: <valore> } per
// completare la verifica. Finché non risponde correttamente, FiC non
// considera la subscription verificata e non invia notifiche reali.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const challenge = request.headers.get('x-fic-verification-challenge');
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge mancante' }, { status: 400 });
  }

  return NextResponse.json({ verification: challenge });
}

// Notifica evento: in modalità "binary" (default FiC) il tipo evento arriva
// nell'header ce-type, e il body contiene solo { data: { ids: [...] } } —
// nessun dato sensibile sull'entità, solo gli id delle risorse coinvolte.
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const eventType = request.headers.get('ce-type');
  if (eventType !== CLIENT_DELETE_EVENT) {
    return NextResponse.json({ ok: true });
  }

  const payload = await request.json().catch(() => null);
  const ids: unknown[] = payload?.data?.ids ?? [];

  for (const id of ids) {
    const ficId = typeof id === 'number' ? id : Number(id);
    if (!Number.isNaN(ficId)) {
      await markClientsOrphanedByFicId(ficId);
    }
  }

  return NextResponse.json({ ok: true });
}
