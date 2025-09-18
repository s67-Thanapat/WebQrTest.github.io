// api/admin-reset-password.js
import { setCors, preflight, getUserFromToken, isAdmin, getEnv, readBody } from "./_utils.js";

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  setCors(res);

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = auth.split(" ")[1];

    const requester = await getUserFromToken(token);
    if (!(await isAdmin(requester.id))) return res.status(403).json({ error: "Admins only" });

    const body = await readBody(req);
    const { email, new_password } = body || {};
    if (!email || !new_password) return res.status(400).json({ error: "email & new_password required" });

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();

    // lookup user by email
    const lookup = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY
      }
    });
    const payload = await lookup.json();
    const user = payload.users?.[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    // update password
    const patch = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: new_password })
    });

    if (!patch.ok) {
      const err = await patch.text();
      return res.status(400).json({ error: err });
    }

    res.status(200).json({ ok: true, message: `Password reset for ${email} success` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
