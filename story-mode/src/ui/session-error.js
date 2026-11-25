/**
 * "Something went wrong" screen shown when a Story Mode session fails to
 * start. The error text can carry save, content-pack or URL strings, so it is
 * always set with textContent, never as markup (H3, bug pass 2026-11-25).
 */
export function renderSessionError(host, err) {
  if (!host) return null;
  host.innerHTML = `
    <div style="padding:32px;max-width:480px;margin:auto;text-align:center;font-family:'DM Sans',sans-serif;color:#f7f2ea">
      <h2 style="color:#e8c84a;font-family:'Fraunces',serif;font-size:1.4rem;margin-bottom:12px">Something went wrong</h2>
      <p style="font-size:0.875rem;line-height:1.5;color:rgba(247,242,234,0.7);margin-bottom:20px">
        The garden couldn't load. This usually resolves with a refresh.
      </p>
      <button onclick="location.reload()" style="padding:10px 20px;border-radius:999px;border:1px solid rgba(232,200,74,0.3);background:rgba(232,200,74,0.1);color:#e8c84a;font-family:'DM Sans',sans-serif;font-size:0.875rem;cursor:pointer">
        Reload
      </button>
      <details style="margin-top:20px;text-align:left;font-size:0.75rem;color:rgba(247,242,234,0.35)">
        <summary style="cursor:pointer">Technical details</summary>
        <pre data-gos-error-detail style="margin-top:8px;white-space:pre-wrap;word-break:break-word"></pre>
      </details>
    </div>`;
  // H3: the stack / message can carry save, pack or URL text. Set it as
  // text, never as markup.
  const detail = host.querySelector('[data-gos-error-detail]');
  if (detail) detail.textContent = String(err?.stack || err?.message || err || '');
  return host;
}
