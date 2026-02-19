import { NextResponse } from "next/server";

export const runtime = "nodejs";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export async function POST(req: Request) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json({ error: "N8N_WEBHOOK_URL is missing" }, { status: 500 });
  }

  try {
    const incoming = await req.formData();

    const fd = new FormData();
    for (const [key, value] of incoming.entries()) {
      // value は string | File
      fd.append(key, value);
    }

    const res = await fetch(url, { method: "POST", body: fd });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      return NextResponse.json(
        { error: `n8n error: ${res.status}`, detail: text },
        { status: 502 }
      );
    }

    // n8nがJSONを返さない/返せないこともあるので、JSONならパース、無理なら raw で返す
    let parsed: JsonValue | { raw: string } | null = null;
    try {
      parsed = text ? (JSON.parse(text) as JsonValue) : null;
    } catch {
      parsed = { raw: text };
    }

    return NextResponse.json({ ok: true, n8n: parsed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}