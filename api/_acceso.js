// Candado de /api/chat: exige una sesión real de Supabase y descuenta una pregunta.
// El guion bajo evita que Vercel publique este archivo como una ruta.
// La clave es la publicable (la misma de js/store.js); los permisos los da la sesión.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xkfoiggivoxiwwkzcpbe.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4v_AY40WLUYn78Bn1dETlQ_PJnc5bEK";

const RECHAZOS = {
  sin_sesion: { status: 401, error: "Necesitas iniciar sesión" },
  limite_minuto: { status: 429, error: "Vas muy rápido. Espera un minuto y vuelve a preguntar." },
  limite_diario: { status: 429, error: "Ya usaste tus preguntas de hoy. Mañana seguimos." },
  limite_global: { status: 429, error: "Lupita ya respondió muchas preguntas hoy. Mañana seguimos." },
};
const NO_DISPONIBLE = { status: 503, codigo: "no_disponible", error: "No pude revisar tu sesión" };
const rechazo = (codigo) => ({ ok: false, codigo, ...RECHAZOS[codigo] });

export async function autorizarPregunta(req, fetchFn = fetch) {
  const header = String(req.headers?.authorization || "");
  const token = header.match(/^Bearer ([A-Za-z0-9._~+/=-]{20,4096})$/)?.[1];
  if (!token) return rechazo("sin_sesion");

  try {
    const res = await fetchFn(`${SUPABASE_URL}/rest/v1/rpc/consumir_pregunta_lupita`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401 || res.status === 403) return rechazo("sin_sesion");
    if (!res.ok) {
      console.error(`Supabase rechazó el control de Lupita: ${res.status}`);
      return { ok: false, ...NO_DISPONIBLE };
    }
    const resultado = await res.json();
    if (resultado === "ok") return { ok: true };
    if (RECHAZOS[resultado]) return rechazo(resultado);
    console.error("Respuesta inesperada del control de Lupita");
  } catch (error) {
    console.error("No se pudo revisar el acceso a Lupita:", error?.name || "error");
  }
  // Si no se puede comprobar, no se llama a la IA: así nunca se gasta sin control.
  return { ok: false, ...NO_DISPONIBLE };
}
