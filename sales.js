// Pane a Tavola · Admin sales API · v0.1.0 · 22/11/2025 07:41 PM BRT

const COOKIE_NAME = 'pane_admin_session';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
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
    return { ok: false, response: jsonResponse({ ok: false, error: 'Sessão não configurada.' }, 500) };
  }
  const token = getSessionTokenFromCookie(request);
  if (!token || token !== expected) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Não autorizado.' }, 401) };
  }
  return { ok: true };
}

function toCents(value) {
  const n = Number(String(value).replace(',', '.'));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export async function onRequest({ env, request }) {
  const db = env.PANE_DB;
  if (!db) {
    return jsonResponse({ ok: false, error: 'D1 não configurado (PANE_DB ausente).' }, 500);
  }

  const auth = requireAuth(env, request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  try {
    if (method === 'GET') {
      // Lista todas as vendas, mais recente primeiro
      const { results } = await db
        .prepare(
          `SELECT id, created_at, customer_name, customer_phone,
                  channel, payment_method,
                  total_value_cents,
                  discount_cents,
                  cost_frete_cents,
                  cost_embalagem_cents,
                  cost_maquininha_cents,
                  cost_outros_cents,
                  notes
           FROM sales
           ORDER BY datetime(created_at) DESC`
        )
        .all();

      return jsonResponse({ ok: true, sales: results || [] });
    }

    if (method === 'POST') {
      let data;
      try {
        data = await request.json();
      } catch {
        data = {};
      }

      const customerName = String(data.customer_name || '').trim();
      const customerPhone = data.customer_phone ? String(data.customer_phone).trim() : null;
      const channel = String(data.channel || '').trim().toLowerCase() || 'whatsapp';
      const paymentMethod = String(data.payment_method || '').trim().toLowerCase() || 'pix';

      if (!customerName) {
        return jsonResponse({ ok: false, error: 'Nome do cliente é obrigatório.' }, 400);
      }

      const totalValueCents = toCents(data.total_value);
      if (totalValueCents <= 0) {
        return jsonResponse({ ok: false, error: 'Valor total deve ser maior que zero.' }, 400);
      }

      const discountCents = toCents(data.discount || 0);
      const costFreteCents = toCents(data.cost_frete || 0);
      const costEmbalagemCents = toCents(data.cost_embalagem || 0);
      const costMaquininhaCents = toCents(data.cost_maquininha || 0);
      const costOutrosCents = toCents(data.cost_outros || 0);
      const notes = data.notes ? String(data.notes).trim() : null;

      const stmt = db.prepare(
        `INSERT INTO sales (
           customer_name,
           customer_phone,
           channel,
           payment_method,
           total_value_cents,
           discount_cents,
           cost_frete_cents,
           cost_embalagem_cents,
           cost_maquininha_cents,
           cost_outros_cents,
           notes
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
      );

      const info = await stmt
        .bind(
          customerName,
          customerPhone,
          channel,
          paymentMethod,
          totalValueCents,
          discountCents,
          costFreteCents,
          costEmbalagemCents,
          costMaquininhaCents,
          costOutrosCents,
          notes
        )
        .run();

      return jsonResponse({
        ok: true,
        id: info.lastRowId,
        message: 'Venda registrada com sucesso.'
      });
    }

    return jsonResponse({ ok: false, error: 'Método não permitido.' }, 405);
  } catch (err) {
    return jsonResponse(
      { ok: false, error: 'Erro ao processar vendas.', detail: String(err) },
      500
    );
  }
}
