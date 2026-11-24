(() => { // own scope: all content scripts share one global namespace
// Comfortable reading mode for the placement blog: dark theme + adjustable text size.
// Controls: small buttons in the bottom-right corner. Settings are remembered.

const KEY = "pb-reader";
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const state = { dark: saved.dark ?? true, size: saved.size ?? 18 };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

const style = document.createElement("style");
style.textContent = `
  /* ---- Dark theme, written for this WordPress theme (Twenty Seventeen) ---- */
  html.pb-dark, html.pb-dark body { background: #15171a !important; color-scheme: dark; }
  html.pb-dark body * {
    background-color: transparent !important;
    color: #e4e6eb !important;
    border-color: #33373d !important;
    box-shadow: none !important;
  }
  /* The theme keeps a fixed header photo behind the page and covers it with these
     solid panels as you scroll; they must stay opaque or the photo shows through. */
  html.pb-dark :is(.site, .site-content-contain, .site-content, .navigation-top,
                   .site-footer, #secondary, .widget-area, .widget, .site-header,
                   .main-navigation ul, .search-form, input, textarea, select) {
    background-color: #15171a !important;
  }
  html.pb-dark :is(.custom-header-media, .site-branding) { background-color: transparent !important; }
  html.pb-dark :is(svg, .icon) { fill: #9aa0a6 !important; }
  html.pb-dark a { color: #8ab4f8 !important; }
  html.pb-dark a:visited { color: #c58af9 !important; }
  html.pb-dark strong { color: #fff !important; }

  /* ---- Readable layout ---- */
  /* Each post as a separate card */
  html.pb-read article.post {
    padding: 1.25em 1.5em !important;
    margin: 0 0 1.5em !important;
    border: 1px solid #d0d4d9 !important;
    border-radius: 10px;
  }
  html.pb-dark article.post { background-color: #1e2125 !important; border-color: #33373d !important; }

  /* Title */
  html.pb-read .entry-title {
    font-size: calc(var(--pb-size) * 1.45) !important;
    line-height: 1.3 !important;
    font-weight: 700 !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    margin: 0.2em 0 0.6em !important;
  }
  /* Date / author: the theme makes it tiny, grey and UPPERCASE */
  html.pb-read .entry-meta, html.pb-read .entry-meta * {
    font-size: calc(var(--pb-size) * 0.85) !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    font-weight: 500 !important;
  }
  html.pb-dark .entry-meta, html.pb-dark .entry-meta * { color: #aab0b7 !important; }

  /* Body text */
  html.pb-read .entry-content :is(p, li, td, th, blockquote) {
    font-size: var(--pb-size) !important;
    line-height: 1.7 !important;
    max-width: 80ch;
    margin: 0 0 0.6em !important;
  }
  html.pb-read .entry-content .entry-content { margin: 0 !important; padding: 0 !important; }
  html.pb-read .entry-content a { text-decoration: underline !important; text-underline-offset: 3px; box-shadow: none !important; }

  /* "Uncategorized" footer on every post is just noise */
  html.pb-read article.post .entry-footer { display: none !important; }

  /* Controls should keep their own look */
  html.pb-dark #pb-controls button { background-color: #2a2e33 !important; color: #fff !important; border-color: #555 !important; }
  #pb-controls {
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
    display: flex; gap: 6px; font: 600 15px system-ui, sans-serif;
  }
  #pb-controls button {
    min-width: 40px; height: 40px; border-radius: 8px; cursor: pointer;
    border: 1px solid #888; background: #fff; color: #111;
  }
  #pb-controls button:focus-visible { outline: 3px solid #4a90e2; outline-offset: 2px; }
`;
document.documentElement.append(style);

function apply() {
  const html = document.documentElement;
  html.classList.toggle("pb-dark", state.dark);
  html.classList.add("pb-read");
  html.style.setProperty("--pb-size", state.size + "px");
  const darkBtn = document.getElementById("pb-dark");
  if (darkBtn) darkBtn.textContent = state.dark ? "☀" : "☾";
}
apply(); // runs before the page paints, so no bright flash

function button(id, label, title, onClick) {
  const b = document.createElement("button");
  b.id = id; b.textContent = label; b.title = title; b.setAttribute("aria-label", title);
  b.addEventListener("click", () => { onClick(); save(); apply(); });
  return b;
}

document.addEventListener("DOMContentLoaded", () => {
  const box = document.createElement("div");
  box.id = "pb-controls";
  box.append(
    button("pb-smaller", "A−", "Smaller text", () => { state.size = Math.max(12, state.size - 2); }),
    button("pb-bigger", "A+", "Bigger text", () => { state.size = Math.min(32, state.size + 2); }),
    button("pb-dark", "", "Toggle dark mode", () => { state.dark = !state.dark; }),
  );
  document.body.append(box);
  apply();
});
})();
