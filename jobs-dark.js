(() => { // own scope: all content scripts share one global namespace
// Dark mode + readability for the jobs list (/applicant/jobs) and single job pages
// (/applicant/job/...) of the Angular placement portal.
// The portal changes pages without reloading, so this checks the URL continuously.
// Dark mode is a colour inversion of just the content parts (images are flipped back).
// The ☀/☾ setting is shared with the blog's reading mode.

const KEY = "pb-reader";
const isJobs = () => /^\/applicant\/jobs?(\/|$)/.test(location.pathname);
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (patch) => { try { localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch })); } catch {} };
const darkPref = () => load().dark ?? true;
const zoomPref = () => load().jobsZoom ?? 1.15;

// Content parts of the jobs pages. "Outermost" = not nested inside another one, so
// the inversion and zoom are applied once (applying them twice would undo / compound).
// div.main-content is the shared parent of everything right of the sidebar, so it is the
// one that normally gets darkened; the others are fallbacks in case it's missing.
const T = `:is(div.main-content, section.pl-5.p-2.pb-5, mat-card, section[class="p-2"])`;
const OUTER = `${T}:not(${T} *)`;

const style = document.createElement("style");
style.textContent = `
  /* ---- Dark ---- */
  html.pj-dark ${OUTER} { filter: invert(0.92) hue-rotate(180deg); background: #fff !important; }
  html.pj-dark ${T} :is(img, video, picture, canvas, [style*="background-image"]) {
    filter: invert(1) hue-rotate(180deg) brightness(0.92);
  }

  /* ---- Readability ---- */
  /* Scale the whole content part (text, icons and spacing together) so the layout stays intact. */
  html.pj-read ${OUTER} { zoom: var(--pj-zoom); }
  /* Comfortable line spacing and line length for running text */
  html.pj-read ${T} :is(p, li, td, th, dd, mat-card-content, .mat-card-content, .mat-body, .mat-body-1) {
    line-height: 1.65 !important;
  }
  html.pj-read ${T} :is(p, li) { max-width: 85ch; margin-bottom: 0.6em; }
  html.pj-read ${T} :is(mat-card-title, .mat-card-title, h1, h2, h3, h4) { line-height: 1.3 !important; }
  /* Light grey "secondary" text is hard to read: bring it closer to normal text */
  html.pj-read ${T} :is(mat-card-subtitle, .mat-card-subtitle, .text-muted, .mat-hint, .mat-caption) {
    color: rgba(0, 0, 0, 0.75) !important;
  }
  html.pj-read ${T} a { text-decoration: underline; text-underline-offset: 3px; }
  /* Table rows easier to follow */
  html.pj-read ${T} :is(td, th) { padding-top: 0.5em !important; padding-bottom: 0.5em !important; }

  /* ---- Controls ---- */
  #pj-controls {
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
    display: flex; gap: 6px; font: 600 15px system-ui, sans-serif;
  }
  #pj-controls button {
    min-width: 40px; height: 40px; border-radius: 8px; cursor: pointer;
    border: 1px solid #888; background: #fff; color: #111;
  }
  #pj-controls button:focus-visible { outline: 3px solid #4a90e2; outline-offset: 2px; }
`;
document.documentElement.append(style);

function button(label, title, onClick) {
  const b = document.createElement("button");
  b.textContent = label; b.title = title; b.setAttribute("aria-label", title);
  b.addEventListener("click", () => { onClick(); update(); });
  return b;
}
const box = document.createElement("div");
box.id = "pj-controls";
const darkBtn = button("", "Toggle dark mode", () => save({ dark: !darkPref() }));
box.append(
  button("A−", "Smaller text", () => save({ jobsZoom: Math.max(0.8, +(zoomPref() - 0.1).toFixed(2)) })),
  button("A+", "Bigger text", () => save({ jobsZoom: Math.min(2, +(zoomPref() + 0.1).toFixed(2)) })),
  darkBtn,
);

function update() {
  const on = isJobs();
  const html = document.documentElement;
  html.classList.toggle("pj-dark", on && darkPref());
  html.classList.toggle("pj-read", on);
  html.style.setProperty("--pj-zoom", zoomPref());
  if (on && document.body && !box.isConnected) document.body.append(box);
  if (!on && box.isConnected) box.remove();
  darkBtn.textContent = darkPref() ? "☀" : "☾";
}
update(); // before first paint when the page is opened directly
setInterval(update, 250);
})();
