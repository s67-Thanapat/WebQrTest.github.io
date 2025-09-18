// api/_utils.js

// ตั้ง CORS header
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOW_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
}

export function preflight(req, res) {
  if (req.method === "OPTIONS") {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}

// อ่าน ENV สำคัญ
export function getEnv() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing env: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  }
  return { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY };
}

// เรียก /auth/v1/user เพื่อตรวจ token
export async function getUserFromToken(token) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
  });
  if (!r.ok) throw new Error("token invalid");
  return await r.json();
}

// ตรวจว่า user เป็น admin หรือไม่ (ดูจากตาราง public.admins)
export async function isAdmin(user_id) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/admins?user_id=eq.${user_id}&select=user_id`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!r.ok) throw new Error("admins check failed");
  const rows = await r.json();
  return rows.length > 0;
}

// ตัวช่วยอ่าน body (กรณี Vercel ยังไม่ได้ parse)
export async function readBody(req) {
  if (req.body && typeof req.body !== "string") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}
