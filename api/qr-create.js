// api/qr-create.js
import { setCors, preflight, getEnv, readBody } from "./_utils.js";

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  setCors(res);

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const body = await readBody(req);
    const { uuid, user_agent } = body || {};
    if (!uuid) return res.status(400).json({ error: "uuid required" });

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();

    const r = await fetch(`${SUPABASE_URL}/rest/v1/qrcodes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ code: uuid, user_agent: user_agent || null })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(400).json({ error: err });
    }

    res.status(200).json({ ok: true, uuid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
