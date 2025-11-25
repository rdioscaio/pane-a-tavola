// Pane a Tavola · Admin login
// v0.2.0 · 25/11/2025 03:41:27 PM (Horário de Brasília)

const COOKIE_NAME = 'pane_admin_session';

// Resposta JSON padrão
function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });

  return new Response(JSON.stringify(body), { status, headers });
}

// Garante que variáveis de ambiente existem
function ensureEnv(env) {
  const { ADMIN_PASSWORD, ADMIN_SESSION_TOKEN } = env || {};

  if (!ADMIN_PASSWORD || !ADMIN_SESSION_TOKEN) {
    throw new Error(
      'Configuração ausente: defina ADMIN_PASSWORD e ADMIN_SESSION_TOKEN nas variáveis de ambiente.'
    );
  }

  return { ADMIN_PASSWORD, ADMIN_SESSION_TOKEN };
}

// Lê e valida o corpo JSON
async function parseJsonBody(request) {
  let body;

  try {
    body = await request.json();
  } catch (err) {
    throw new Error('JSON inválido. Envie { "password": "..." }.');
  }

  const password = (body?.password || '').toString().trim();

  if (!password) {
    throw new Error('Senha vazia. Informe a senha de administrador.');
  }

  return password;
}

// Monta o cookie de sessão
function buildSessionCookie(sessionToken, requestUrl) {
  const isHttps = requestUrl.startsWith('https://');

  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=604800' // 7 dias
  ];

  if (isHttps) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

// Handler para POST /api/admin/login
async function handlePost(context) {
  const { env, request } = context;

  let envVars;
  try {
    envVars = ensureEnv(env);
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err.message
      },
      500
    );
  }

  let password;
  try {
    password = await parseJsonBody(request);
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err.message
      },
      400
    );
  }

  if (password !== envVars.ADMIN_PASSWORD) {
    return jsonResponse(
      {
        ok: false,
        error: 'Senha incorreta.'
      },
      401
    );
  }

  const cookie = buildSessionCookie(envVars.ADMIN_SESSION_TOKEN, request.url);

  return jsonResponse(
    { ok: true },
    200,
    {
      'Set-Cookie': cookie
    }
  );
}

// Handler para OPTIONS (caso o navegador envie preflight em algum cenário)
export async function onRequestOptions(context) {
  const { request } = context;
  const origin = new URL(request.url).origin;

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Handler principal para POST
export async function onRequestPost(context) {
  return handlePost(context);
}
