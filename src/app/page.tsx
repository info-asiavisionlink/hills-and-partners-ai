"use client";

import React, { useMemo, useState } from "react";

function normalizeUrl(input: string) {
  const s = input.trim();
  if (!s) return "";
  // http(s) が無ければ付ける（ざっくり正規化）
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function splitMany(text: string) {
  // 改行 / カンマ / スペース 区切り
  return text
    .split(/[\n,\s]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function Page() {
  const [links, setLinks] = useState<string[]>([""]);
  const [bulk, setBulk] = useState("");
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const dedupedLinks = useMemo(() => {
    const set = new Set<string>();
    for (const raw of links) {
      const u = normalizeUrl(raw);
      if (!u) continue;
      set.add(u);
    }
    return Array.from(set);
  }, [links]);

  const addRow = () => setLinks((prev) => [...prev, ""]);
  const clearAll = () => {
    setLinks([""]);
    setBulk("");
    setPdfFiles([]);
    setMsg("");
  };

  const applyBulk = () => {
    const parts = splitMany(bulk).map(normalizeUrl).filter(Boolean);
    if (!parts.length) return;
    setLinks((prev) => {
      const merged = [...prev.filter((x) => x.trim() !== ""), ...parts];
      // 末尾に空行1つ維持
      return [...merged, ""];
    });
    setBulk("");
  };

  const removeRow = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSend = async () => {
    setMsg("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", "Hills-and-partners AI");
      fd.append("links_json", JSON.stringify(dedupedLinks));
      fd.append("links_count", String(dedupedLinks.length));
      fd.append("pdf_count", String(pdfFiles.length));

      for (const f of pdfFiles) {
        fd.append("pdfs", f, f.name);
      }

      const res = await fetch("/api/submit", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setMsg(`送信OK。links=${dedupedLinks.length}, pdf=${pdfFiles.length}`);
     } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    setMsg(`送信失敗: ${msg}`);
  } finally  {
      setBusy(false);
    }
  };

  return (
    <div className="cyber-bg text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[var(--cyan)] shadow-[0_0_18px_rgba(0,229,255,.7)]" />
              <h1 className="text-4xl font-semibold tracking-wide">Hills-and-partners AI</h1>
            </div>
            <p className="mt-2 text-sm text-white/70 mono-tech">
              COMPANY REGISTRATION CONSOLE · BUILD: ALPHA
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs mono-tech">
              MODE: SCAN
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs mono-tech">
              LINKS: {dedupedLinks.length}
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs mono-tech">
              PDF: {pdfFiles.length}
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="mt-8 glow-card rounded-2xl p-6 neon-line">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold mono-tech">TARGET INPUTS</h2>
              <p className="mt-2 text-sm text-white/70">
                WebサイトURLとPDFを登録して、n8nへ送信する。重複URLは自動で削除。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={addRow}
                className="neon-btn rounded-xl px-4 py-2 text-sm font-medium"
              >
                + ADD
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="neon-btn-pink rounded-xl px-4 py-2 text-sm font-medium"
              >
                CLEAR
              </button>
            </div>
          </div>

          {/* Bulk input */}
          <div className="mt-6">
            <label className="text-xs mono-tech text-white/70">
              BULK PASTE（改行 / カンマ / スペースOK）
            </label>
            <div className="mt-2 flex gap-3">
              <textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder="example.com, https://example.org"
                className="h-20 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-[var(--cyan)]"
              />
              <button
                type="button"
                onClick={applyBulk}
                className="neon-btn rounded-xl px-4 py-2 text-sm font-medium"
              >
                APPLY
              </button>
            </div>
          </div>

          {/* URL rows */}
          <div className="mt-6 space-y-3">
            {links.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-12 text-xs text-white/60 mono-tech">#{String(idx + 1).padStart(2, "0")}</div>
                <input
                  value={v}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLinks((prev) => prev.map((x, i) => (i === idx ? val : x)));
                  }}
                  placeholder="https://example.com  or  example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-[var(--cyan)]"
                />
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:border-[var(--pink)]"
                >
                  DEL
                </button>
              </div>
            ))}
          </div>

          {/* PDF upload */}
          <div className="mt-6">
            <label className="text-xs mono-tech text-white/70">PDF UPLOAD（複数OK）</label>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPdfFiles(files);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70"
              />
              <div className="text-xs text-white/60">
                {pdfFiles.length ? pdfFiles.map((f) => f.name).join(" / ") : "PDF未選択"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="text-xs text-white/60 mono-tech">
              READY PAYLOAD: {dedupedLinks.length} LINK(S) · AUTO DEDUPE · PDF {pdfFiles.length}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={onSend}
                className="neon-btn rounded-2xl px-8 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? "SENDING..." : "SEND"}
              </button>
            </div>
          </div>

          {msg && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              {msg}
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-white/40">
          ※ Webhook送信はNext.js APIで中継（CORS対策＆URL秘匿）。n8n側は FormData を受け取る想定。
        </div>
      </div>
    </div>
  );
}