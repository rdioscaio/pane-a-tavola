// Pane a Tavola · Admin login · v0.1.7

const COOKIE_NAME = 'pane_admin_session';

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });

  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

export async function onRequest(context) {
  const { env, request } = context;

  // Responde preflight (se algum dia bater OPTIONS aqui)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // Garante só POST
  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        error: 'Método não permitido. Use POST em /api/admin/login.'
      },
      405,
      { Allow: 'POST' }
    );
  }

  const { ADMIN_PASSWORD, ADMIN_SESSION_TOKEN } = env || {};

  if (!ADMIN_PASSWORD || !ADMIN_SESSION_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error:
          'Configuração de login ausente no servidor. Verifique ADMIN_PASSWORD e ADMIN_SESSION_TOKEN nas variáveis de ambiente.'
      },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: 'Formato de dados inválido. Envie JSON com { "password": "..." }.'
      },
      400
    );
  }

  const password = (body?.password || '').toString().trim();

  if (!password) {
    return jsonResponse(
      { ok: false, error: 'Senha vazia. Digite a senha do painel.' },
      400
    );
  }

  if (password !== ADMIN_PASSWORD) {
    return jsonResponse(
      { ok: false, error: 'Senha incorreta.' },
      401
    );
  }

  // Se estiver em HTTPS, marca Secure; em dev (http) não.
  const isHttps = request.url.startsWith('https:');
  const secureAttribute = isHttps ? 'Secure; ' : '';

  const cookieValue =
    `${COOKIE_NAME}=` +
    `${encodeURIComponent(ADMIN_SESSION_TOKEN)}; ` +
    'HttpOnly; ' +
    secureAttribute +
    'SameSite=Lax; Path=/; Max-Age=604800'; // 7 dias

  return jsonResponse(
    { ok: true },
    200,
    {
      'Set-Cookie': cookieValue
    }
  );
}
