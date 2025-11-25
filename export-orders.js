// Admin Export Orders CSV - v0.1.0

const COOKIE_NAME = 'pane_admin_session';

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

function toCsv(rows) {
  if (!rows || !rows.length) return '';
  const cols = Object.keys(rows[0]);
  const header = cols.join(',');
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        const v = r[c];
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export async function onRequestGet({ env, request }) {
  const db = env.PANE_DB;
  if (!db) return jsonResponse({ ok: false, error: 'D1 nao configurado (PANE_DB).' }, 500);

  const auth = requireAuth(env, request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

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
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const { results } = await db
    .prepare(
      `SELECT id, created_at, delivery_date, delivery_period, customer_name, customer_phone,
              customer_address, notes, origin, status, total_cents, brand_slug
       FROM orders
       ${whereClause}
       ORDER BY datetime(created_at) DESC
       LIMIT 2000`
    )
    .bind(...binds)
    .all();

  const csv = toCsv(results || []);
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=\"orders.csv\"'
    }
  });
}
