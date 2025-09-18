// api/health.js
import { setCors, preflight } from "./_utils.js";

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  setCors(res);
  res.status(200).json({ ok: true, time: new Date().toISOString() });
}
