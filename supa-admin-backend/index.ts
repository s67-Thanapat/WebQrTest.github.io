// Deno Deploy / Supabase Edge Functions
// deno.json: add "imports": {"pg":"https://deno.land/x/postgres@v0.17.2/mod.ts"}
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.2/mod.ts";

const DATABASE_URL = Deno.env.get("https://yowjvmiosrclqstoeqat.supabase.co"); // ได้จาก Project Settings -> Database
const ALLOWED_ORIGINS = (Deno.env.get("https://web-qr-admin-github-io-xr1a.vercel.app/") ?? "").split(",").map(s=>s.trim()).filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length === 0) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

// ควบคุมคำสั่งที่อนุญาต (กัน DROP DATABASE/SCHEMA ฯลฯ)
function isAllowedSQL(sql: string): boolean {
  const s = sql.trim().toLowerCase();
  // ตัวอย่าง whitelist แบบง่าย (ปรับเพิ่มเองได้)
  return (
    s.startsWith("create table") ||
    s.startsWith("alter table") ||
    s.startsWith("drop table")  ||
    s.startsWith("create index")||
    s.startsWith("drop index")  ||
    s.startsWith("comment on")  ||
    s.startsWith("grant")       ||
    s.startsWith("revoke")
  );
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({error:"CORS blocked"}), {
      status: 403, headers: {"content-type":"application/json"}
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { sql, is_admin } = await req.json();

    if (!is_admin) {
      return new Response(JSON.stringify({error:"forbidden"}), { status: 403, headers: cors(origin) });
    }
    if (!sql || typeof sql !== "string") {
      return new Response(JSON.stringify({error:"sql required"}), { status: 400, headers: cors(origin) });
    }
    if (!isAllowedSQL(sql)) {
      return new Response(JSON.stringify({error:"SQL not allowed"}), { status: 400, headers: cors(origin) });
    }
    if (!DATABASE_URL) {
      return new Response(JSON.stringify({error:"DATABASE_URL not set"}), { status: 500, headers: cors(origin) });
    }

    const client = new Client(DATABASE_URL);
    await client.connect();
    try {
      const result = await client.queryObject(sql);
      await client.end();
      return new Response(JSON.stringify({ok:true, rows: result.rows ?? null}), {
        status: 200, headers: cors(origin)
      });
    } catch (e) {
      await client.end();
      return new Response(JSON.stringify({error:String(e?.message ?? e)}), {
        status: 400, headers: cors(origin)
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({error:String(e?.message ?? e)}), {
      status: 400, headers: {"content-type":"application/json"}
    });
  }
});

function cors(origin: string | null) {
  return {
    "content-type":"application/json",
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-headers":"authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods":"POST, OPTIONS",
  };
}
