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

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="badge">
      {label}: <b>{value}</b>
    </div>
  );
}

export default function Page() {
  const [links, setLinks] = useState<string[]>([""]);
  const [bulk, setBulk] = useState("");
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [ctrFiles, setCtrFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

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
    setCtrFiles([]);
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
      for (const f of pdfFiles) fd.append("pdfs", f, f.name);

      fd.append("ctr_count", String(ctrFiles.length));
      for (const f of ctrFiles) fd.append("ctrs", f, f.name);

      const res = await fetch("/api/submit", { method: "POST", body: fd });
      const bodyText = await res.text().catch(() => "");

      if (!res.ok) {
        const m = bodyText ? bodyText.slice(0, 400) : `HTTP ${res.status}`;
        throw new Error(m);
      }

      setMsg(
        `送信OK：LINK ${dedupedLinks.length} / PDF ${pdfFiles.length} / CTR ${ctrFiles.length}`
      );
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "unknown error";
      setMsg(`送信失敗：${m}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cyber-bg">
      <div className="container">
        {/* TOP */}
        <div className="topbar">
          <div className="brand">
            <div className="brandRow">
              <span className="dot" />
              <h1 className="h1">Hills-and-partners AI</h1>
            </div>
            <div className="sub">company registration console · build: alpha</div>
          </div>

          <div className="badges">
            <Badge label="mode" value="scan" />
            <Badge label="links" value={String(dedupedLinks.length)} />
            <Badge label="pdf" value={String(pdfFiles.length)} />
            <Badge label="ctr" value={String(ctrFiles.length)} />
            <Badge label="rows" value={String(links.length)} />
          </div>
        </div>

        {/* CARD */}
        <div className="card">
          <div className="cardHead">
            <div>
              <h2 className="h2">target inputs</h2>
              <p className="desc">
                WebサイトURLとPDF/CTRを登録して、n8nへ送信。URLは自動で正規化・重複排除。
              </p>
            </div>

            <div className="actions">
              <button className="btn" type="button" onClick={addRow}>
                + add
              </button>
              <button className="btn btnPink" type="button" onClick={clearAll}>
                clear
              </button>
            </div>
          </div>

          <div className="grid">
            {/* LEFT */}
            <div className="panel">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div className="smallMono">bulk paste</div>
                  <div className="smallText">改行 / カンマ / スペースOK</div>
                </div>
                <button className="btn" type="button" onClick={applyBulk}>
                  apply
                </button>
              </div>

              <textarea
                className="textarea"
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder="example.com, https://example.org"
              />

              <div style={{ marginTop: 10 }}>
                {links.map((v, idx) => (
                  <div className="row" key={idx}>
                    <div className="idx">#{String(idx + 1).padStart(2, "0")}</div>
                    <input
                      className="input"
                      value={v}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLinks((prev) =>
                          prev.map((x, i) => (i === idx ? val : x))
                        );
                      }}
                      placeholder="https://example.com  or  example.com"
                    />
                    <button
                      className="btnMini"
                      type="button"
                      onClick={() => removeRow(idx)}
                    >
                      del
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT */}
            <div className="panel">
              {/* PDF */}
              <div className="smallMono">pdf upload</div>
              <div className="smallText">複数OK。n8nにそのまま転送。</div>

              <input
                className="file"
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => setPdfFiles(Array.from(e.target.files ?? []))}
              />

              <div className="box">
                <div className="smallMono">selected</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "rgba(255,255,255,.85)",
                    wordBreak: "break-word",
                  }}
                >
                  {pdfFiles.length ? pdfFiles.map((f) => f.name).join(" / ") : "PDF未選択"}
                </div>
              </div>

              {/* CTR */}
              <div style={{ marginTop: 14 }}>
                <div className="smallMono">ctr upload</div>
                <div className="smallText">
                  複数OK。拡張子は .ctr / .csv / .txt など想定。
                </div>

                <input
                  className="file"
                  type="file"
                  multiple
                  accept=".ctr,.csv,.txt,text/plain,text/csv"
                  onChange={(e) => setCtrFiles(Array.from(e.target.files ?? []))}
                />

                <div className="box">
                  <div className="smallMono">ctr selected</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "rgba(255,255,255,.85)",
                      wordBreak: "break-word",
                    }}
                  >
                    {ctrFiles.length ? ctrFiles.map((f) => f.name).join(" / ") : "CTR未選択"}
                  </div>
                </div>
              </div>

              {/* READY */}
              <div className="box">
                <div className="smallMono">ready payload</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "rgba(255,255,255,.85)",
                  }}
                >
                  LINK: {dedupedLinks.length} / PDF: {pdfFiles.length} / CTR: {ctrFiles.length} / AUTO DEDUPE
                </div>
              </div>

              <div className="footerRow">
                <div className="note">
                  送信はNext.js APIで中継（CORS対策 + URL秘匿）
                </div>
                <button className="btn" type="button" disabled={busy} onClick={onSend}>
                  {busy ? "sending..." : "send"}
                </button>
              </div>

              {msg && <div className="toast">{msg}</div>}
            </div>
          </div>

          <div className="footerSmall">build: alpha · Hills-and-partners internal tool UI</div>
        </div>
      </div>
    </div>
  );
}