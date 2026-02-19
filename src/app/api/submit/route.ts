import { NextResponse } from "next/server";

type SubmitPayload = {
  title?: string;
  links?: string[];
  links_count?: number;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

export async function POST(req: Request) {
  const url = process.env.N8N_WEBHOOK_URL;

  if (!url) {
    return NextResponse.json(
      { ok: false, error: "N8N_WEBHOOK_URL is not set" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as SubmitPayload;

    const title = body.title ?? "Hills-and-partners AI";
    const links = Array.isArray(body.links) ? body.links : [];
    const links_count =
      typeof body.links_count === "number" ? body.links_count : links.length;

    const outgoing = {
      title,
      links,
      links_count,
      ts: new Date().toISOString(),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(outgoing),
    });

    const text = await res.text().catch(() => "");
    let parsed: JsonValue | { raw: string } | null = null;

    if (text) {
      try {
        parsed = JSON.parse(text) as JsonValue;
      } catch {
        parsed = { raw: text };
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `n8n error: ${res.status}`, detail: parsed },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, n8n: parsed }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}