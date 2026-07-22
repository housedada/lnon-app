import { NextRequest, NextResponse } from 'next/server';
import { markClientsOrphanedByFicId } from '@/lib/db';

const CLIENT_DELETE_EVENT = 'it.fattureincloud.webhooks.entities.clients.delete';

// FiC non firma i payload in modo standard; l'endpoint è protetto includendo
// FIC_WEBHOOK_SECRET nella query string del sink URL registrato su FiC
// (unico URL a cui FiC invia richieste, non esposto altrove).
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.FIC_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }

  const events = Array.isArray(payload) ? payload : [payload];

  for (const event of events) {
    if (event?.type !== CLIENT_DELETE_EVENT) continue;

    // La forma esatta del payload data non è documentata pubblicamente in dettaglio:
    // proviamo i percorsi più plausibili per l'id dell'entità cancellata.
    const ficId = event?.data?.id ?? event?.data?.entity?.id ?? event?.entity_id;
    if (typeof ficId === 'number') {
      await markClientsOrphanedByFicId(ficId);
    } else if (typeof ficId === 'string' && !Number.isNaN(Number(ficId))) {
      await markClientsOrphanedByFicId(Number(ficId));
    }
  }

  return NextResponse.json({ ok: true });
}
