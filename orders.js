// Admin Orders API - v0.1.0
// GET: lista pedidos; POST: atualiza status (com auth via cookie); CSV: ver export endpoint separado.

const COOKIE_NAME = 'pane_admin_session';
const ALLOWED_STATUSES = new Set(['novo', 'em_producao', 'pronto', 'entregue', 'cancelado']);

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  return new Response(JSON.stringify(body), { status, headers });
}

function getSessionTokenFromCookie(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const c of cookies) {
    if (!c.startsWith(COOKIE_NAME + '=')) continue;
    return decodeURIComponent(c.slice(COOKIE_NAME.length + 1));
  }
  return null;
}

function requireAuth(env, request) {
  const expected = env.ADMIN_SESSION_TOKEN;
  if (!expected) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Sessao nao configurada.' }, 500) };
  }
  const token = getSessionTokenFromCookie(request);
  if (!token || token !== expected) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Nao autorizado.' }, 401) };
  }
  return { ok: true };
}

export async function onRequest({ env, request }) {
  const db = env.PANE_DB;
  if (!db) return jsonResponse({ ok: false, error: 'D1 nao configurado (PANE_DB).' }, 500);

  const auth = requireAuth(env, request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    // filtros simples: start, end (iso), status
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const status = url.searchParams.get('status');

    let where = [];
    let binds = [];
    if (start) {
      where.push('datetime(created_at) >= datetime(?' + (binds.length + 1) + ')');
      binds.push(start);
    }
    if (end) {
      where.push('datetime(created_at) <= datetime(?' + (binds.length + 1) + ')');
      binds.push(end);
    }
    if (status && ALLOWED_STATUSES.has(status)) {
      where.push('status = ?' + (binds.length + 1));
      binds.push(status);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const stmt = db.prepare(
      `SELECT id, created_at, delivery_date, delivery_period, customer_name, customer_phone, customer_address,
              notes, origin, status, total_cents, brand_slug
       FROM orders
       ${whereClause}
       ORDER BY datetime(created_at) DESC
       LIMIT 500`
    );
    const { results } = await stmt.bind(...binds).all();
    return jsonResponse({ ok: true, orders: results || [] });
  }

  if (method === 'POST') {
    let data;
    try {
      data = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'JSON invalido.' }, 400);
    }
    const id = Number(data.id || 0);
    const status = data.status ? String(data.status) : '';
    if (!id || !ALLOWED_STATUSES.has(status)) {
      return jsonResponse({ ok: false, error: 'Parametros invalidos.' }, 400);
    }

    const stmt = db.prepare('UPDATE orders SET status = ?1 WHERE id = ?2');
    await stmt.bind(status, id).run();
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: 'Metodo nao permitido.' }, 405, { Allow: 'GET, POST' });
}
