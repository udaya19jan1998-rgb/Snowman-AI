import React, { useEffect, useRef, useState } from "react";
export default function CodeCard({
  code,
  language = ""
}) {
  const [status, setStatus] = useState("Copy code");
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Copied!");
    } catch {
      setStatus("Copy failed — select code");
    }
    timer.current = setTimeout(() => setStatus("Copy code"), 2200);
  }
  return <section className="snow-code-card" aria-label={`${language || "Plain text"} code block`}>
      <div className="snow-code-toolbar">
        <span className="snow-code-language">{language || "Code"}</span>
        <button type="button" className="snow-code-copy" onClick={copy} aria-live="polite">{status}</button>
      </div>
      <pre tabIndex={0}><code>{code}</code></pre>
    </section>;
}
