/**
 * admin-auth.js — utilitário de autenticação admin via Supabase Auth.
 *
 * Páginas admin importam este módulo para:
 *   - inicializar o cliente Supabase (chaves vêm de /js/supabase-config.js)
 *   - obter o JWT atual (para anexar como Bearer nas chamadas /api)
 *   - verificar se o usuário logado é admin (user_metadata.is_admin)
 *   - guard que redireciona pro login quando não autenticado
 *
 * Uso:
 *   <script src="/js/supabase-config.js"></script>
 *   <script type="module">
 *     import { adminAuth } from '/js/admin-auth.js';
 *     await adminAuth.requireAdmin(); // redireciona se não logado
 *     const token = await adminAuth.getToken();
 *     fetch('/api/products', { headers: { Authorization: `Bearer ${token}` }, ... });
 *   </script>
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg = window.SUPABASE_CONFIG || {};
if (!cfg.url || !cfg.anonKey) {
  console.error("[admin-auth] /js/supabase-config.js não carregou — verifique se está antes deste script");
}

export const supabase = createClient(cfg.url, cfg.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // captura tokens de invite/reset que vêm no hash da URL
    storage: window.localStorage,
  },
});

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("[admin-auth] getSession error:", error.message);
    return null;
  }
  return data.session;
}

async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

async function getToken() {
  const session = await getSession();
  return session?.access_token || null;
}

function isAdminUser(user) {
  return !!user && user.user_metadata && user.user_metadata.is_admin === true;
}

/**
 * Guard: garante que há sessão admin válida. Caso contrário, redireciona pra login.
 * Retorna o user quando OK.
 */
async function requireAdmin(loginUrl = "/login.html") {
  const user = await getUser();
  if (!user) {
    window.location.href = `${loginUrl}?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }
  if (!isAdminUser(user)) {
    await supabase.auth.signOut();
    window.location.href = `${loginUrl}?error=not_admin`;
    return null;
  }
  return user;
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login.html";
}

/**
 * Wrapper de fetch que injeta automaticamente o Bearer token.
 * Usa em todas as chamadas a endpoints protegidos.
 */
async function authFetch(url, options = {}) {
  const token = await getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

export const adminAuth = {
  supabase,
  getSession,
  getUser,
  getToken,
  isAdminUser,
  requireAdmin,
  signOut,
  authFetch,
};
