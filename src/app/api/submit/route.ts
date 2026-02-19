import { NextResponse } from "next/server";

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
    // ブラウザから来た multipart/form-data を受け取る
    const incoming = await req.formData();

    // n8nへ投げる multipart/form-data を組み立て直す
    // （重要：FormDataはストリーム/環境差があるので“丸投げ”より詰め替えが安全）
    const outgoing = new FormData();

    // 文字フィールド
    const passthroughTextKeys = [
      "title",
      "links_json",
      "links_count",
      "pdf_count",
      "ctr_count",
    ] as const;

    for (const k of passthroughTextKeys) {
      const v = incoming.get(k);
      if (typeof v === "string") outgoing.append(k, v);
    }

    // PDF（複数）
    const pdfs = incoming.getAll("pdfs");
    for (const item of pdfs) {
      if (item instanceof File) {
        outgoing.append("pdfs", item, item.name);
      }
    }

    // CTR（複数）
    const ctrs = incoming.getAll("ctrs");
    for (const item of ctrs) {
      if (item instanceof File) {
        outgoing.append("ctrs", item, item.name);
      }
    }

    // n8nへ転送
    const res = await fetch(url, {
      method: "POST",
      body: outgoing,
      // headersは付けない（fetchがmultipart boundaryを自動で付ける）
    });

    // n8nがJSON/テキストどちらで返しても拾う
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
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}