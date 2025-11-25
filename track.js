// Pane a Tavola · API track events · v0.2.0

const ALLOWED_TYPES = new Set([
  'view',
  'add_to_cart',
  'remove_from_cart',
  'open_whatsapp'
]);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function ensureEventsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL,
      product_slug TEXT,
      page_path TEXT,
      session_id TEXT,
      extra TEXT
    );
  `).run();
}

export async function onRequestPost({ env, request }) {
  try {
    const db = env.PANE_DB;
    if (!db) {
      return jsonResponse(
        { ok: false, error: 'D1 não configurado (PANE_DB ausente).' },
        500
      );
    }

    const bodyText = await request.text();
    let data;
    try {
      data = JSON.parse(bodyText || '{}');
    } catch {
      return jsonResponse({ ok: false, error: 'JSON inválido.' }, 400);
    }

    const type = String(data.type || '').trim();
    const productSlug = data.productSlug ? String(data.productSlug) : null;
    const pagePath = data.pagePath ? String(data.pagePath) : null;
    const sessionId = data.sessionId ? String(data.sessionId) : null;
    const extra = data.extra ? JSON.stringify(data.extra) : null;

    if (!ALLOWED_TYPES.has(type)) {
      return jsonResponse({ ok: false, error: 'Tipo de evento inválido.' }, 400);
    }

    // garante que a tabela exista
    await ensureEventsTable(db);

    await db
      .prepare(
        `INSERT INTO events (type, product_slug, page_path, session_id, extra)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(type, productSlug, pagePath, sessionId, extra)
      .run();

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: 'Falha ao gravar evento.', detail: String(err) },
      500
    );
  }
}
