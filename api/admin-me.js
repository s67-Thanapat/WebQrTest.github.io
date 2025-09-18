// api/admin-me.js
import { setCors, preflight, getUserFromToken, isAdmin } from "./_utils.js";

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  setCors(res);
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = auth.split(" ")[1];

    const user = await getUserFromToken(token);
    const admin = await isAdmin(user.id);

    res.status(200).json({ user: { id: user.id, email: user.email }, is_admin: admin });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
}
