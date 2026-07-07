// Cloudflare Pages Function — roda em /api
// Faz proxy das chamadas do front para o Apps Script (servidor-servidor, sem CORS)
// Também cacheia leituras na borda do Cloudflare pra evitar bater no Apps Script toda hora.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUReqzvgXU7KVxayUQGXfW3m_l1LmT2kw9oS8jfk7G2sD5Tdx6eluzp84LtnSr4RXk/exec';
const GET_CACHE_TTL_SECONDS = 15; // tempo que uma leitura (getTasks/getClients) fica em cache na borda

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const target = APPS_SCRIPT_URL + url.search; // repassa ?action=...&token=...
  const resp = await fetch(target, { redirect: 'follow' });
  const body = await resp.text();

  const response = new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${GET_CACHE_TTL_SECONDS}`
    }
  });

  // Só cacheia respostas OK (não guarda erros/token inválido)
  if (resp.status === 200) {
    await cache.put(cacheKey, response.clone());
  }
  return response;
}

export async function onRequestPost({ request }) {
  const bodyText = await request.text();
  const resp = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: bodyText,
    redirect: 'follow'
  });
  const body = await resp.text();

  // Toda escrita muda os dados, então limpa o cache de leitura da borda
  // pra próxima consulta já vir atualizada (em vez de esperar o TTL expirar).
  try {
    const parsed = JSON.parse(bodyText);
    const token = parsed.token;
    if (token) {
      const cache = caches.default;
      const origin = new URL(request.url).origin;
      for (const action of ['getTasks', 'getClients']) {
        const getUrl = `${origin}/api?action=${action}&token=${encodeURIComponent(token)}`;
        await cache.delete(new Request(getUrl));
      }
    }
  } catch (e) {
    // Se não conseguir invalidar, não é grave: o cache expira sozinho em poucos segundos.
  }

  return new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': 'application/json' }
  });
}
