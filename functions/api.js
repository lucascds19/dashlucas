// Cloudflare Pages Function — roda em /api
// Faz proxy das chamadas do front para o Apps Script (servidor-servidor, sem CORS)

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUReqzvgXU7KVxayUQGXfW3m_l1LmT2kw9oS8jfk7G2sD5Tdx6eluzp84LtnSr4RXk/exec';

export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const target = APPS_SCRIPT_URL + url.search; // repassa ?action=...&token=...
  const resp = await fetch(target, { redirect: 'follow' });
    const body = await resp.text();
    return new Response(body, {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
    });
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
    return new Response(body, {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
    });
}
