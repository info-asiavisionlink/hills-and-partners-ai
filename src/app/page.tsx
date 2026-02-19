"use client";

import React, { useMemo, useState } from "react";

function normalizeUrl(input: string) {
  const s = input.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function splitMany(text: string) {
  return text
    .split(/[\n,\s]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

type BadgeProps = { label: string; value: string };

function Badge({ label, value }: BadgeProps) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs mono-tech text-white/75">
      {label}: <span className="text-white/95">{value}</span>
    </div>
  );
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

      // any禁止のため、エラー本文は text で取る
      const bodyText = await res.text().catch(() => "");

      if (!res.ok) {
        const m = bodyText ? bodyText.slice(0, 400) : `HTTP ${res.status}`;
        throw new Error(m);
      }

      setMsg(`送信OK：LINK ${dedupedLinks.length} / PDF ${pdfFiles.length}`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "unknown error";
      setMsg(`送信失敗：${m}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cyber-bg text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Top Bar */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--cyan)] shadow-[0_0_18px_rgba(0,229,255,.8)]" />
              <h1 className="text-4xl font-semibold tracking-wide">Hills-and-partners AI</h1>
            </div>
            <p className="mt-2 text-sm text-white/70 mono-tech">
              company registration console · build: alpha
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge label="mode" value="scan" />
            <Badge label="links" value={String(dedupedLinks.length)} />
            <Badge label="pdf" value={String(pdfFiles.length)} />
            <Badge label="rows" value={String(links.length)} />
          </div>
        </div>

        {/* Main Card */}
        <div className="mt-8 glow-card rounded-3xl p-6 md:p-8 neon-line">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold mono-tech">target inputs</h2>
              <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl">
                WebサイトURLとPDFを登録して、n8nへ送信。URLは自動で正規化・重複排除。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={addRow}
                className="neon-btn rounded-2xl px-5 py-2.5 text-sm font-semibold"
              >
                + add
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="neon-btn-pink rounded-2xl px-5 py-2.5 text-sm font-semibold"
              >
                clear
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Left: URLs */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs mono-tech text-white/60">bulk paste</div>
                  <div className="text-sm text-white/80">改行 / カンマ / スペースOK</div>
                </div>
                <button
                  type="button"
                  onClick={applyBulk}
                  className="neon-btn rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  apply
                </button>
              </div>

              <textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder="example.com, https://example.org"
                className="cyber-input mt-3 h-24 w-full resize-none rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/35"
              />

              <div className="mt-5 space-y-3">
                {links.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-12 text-xs text-white/55 mono-tech">
                      #{String(idx + 1).padStart(2, "0")}
                    </div>
                    <input
                      value={v}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLinks((prev) => prev.map((x, i) => (i === idx ? val : x)));
                      }}
                      placeholder="https://example.com  or  example.com"
                      className="cyber-input w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/35"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:border-[var(--pink)]"
                    >
                      del
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: PDF */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs mono-tech text-white/60">pdf upload</div>
              <div className="mt-1 text-sm text-white/80">複数OK。n8nにそのまま転送。</div>

              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => setPdfFiles(Array.from(e.target.files ?? []))}
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white/80 hover:file:bg-white/15"
              />

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs mono-tech text-white/60">selected</div>
                <div className="mt-2 text-sm text-white/85 break-words">
                  {pdfFiles.length ? pdfFiles.map((f) => f.name).join(" / ") : "PDF未選択"}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs mono-tech text-white/60">ready payload</div>
                <div className="mt-2 text-sm text-white/85">
                  LINK: {dedupedLinks.length} / PDF: {pdfFiles.length} / AUTO DEDUPE
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="text-xs text-white/45">送信はNext.js APIで中継（CORS対策 + URL秘匿）</div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={onSend}
                  className="neon-btn rounded-2xl px-7 py-3 text-sm font-bold disabled:opacity-60"
                >
                  {busy ? "sending..." : "send"}
                </button>
              </div>

              {msg && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85">
                  {msg}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-white/35">build: alpha · Hills-and-partners internal tool UI</div>
      </div>
    </div>
  );
}