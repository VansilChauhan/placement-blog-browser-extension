(() => { // own scope: all content scripts share one global namespace
// Summary card for single job pages (/applicant/job/...): puts the facts that matter at the top
// and trims the long parts of the page.
//
// ===== Your profile: change these if needed =====
const ME = {
  dept: "Computer Science",   // part of the department name as shown in the eligibility table
  program: "M.Tech.",         // program exactly as in the table header / pay table
};
// =================================================

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
const isMyProgram = (p) => norm(p) === norm(ME.program);
const isMyDept = (d) => norm(d).includes(norm(ME.dept));

function panel(root, title) {
  return [...root.querySelectorAll(".panel")]
    .find((p) => norm(txt(p.querySelector(".panel-title-2"))) === norm(title));
}

// Simple <table> with a header row -> [{header: value}]
function rowsOf(table) {
  const trs = [...table.querySelectorAll("tr")];
  const head = [...(trs[0]?.querySelectorAll("th") || [])].map(txt);
  return trs.slice(1).filter((tr) => tr.querySelector("td")).map((tr) => {
    const cells = [...tr.querySelectorAll("td")].map(txt);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}
const pick = (obj, start) => {
  const k = Object.keys(obj || {}).find((k) => norm(k).startsWith(norm(start)));
  return k ? obj[k] : "";
};

// Eligibility tick-box tables -> rows with the programs ticked for each department
function parseMatrix(table) {
  const colName = {};
  table.querySelectorAll("thead th").forEach((th) => {
    const c = [...th.classList].find((c) => c.startsWith("mat-column-"));
    colName[c] = txt(th.querySelector("p")) || txt(th);
  });
  return [...table.querySelectorAll("tbody tr")].map((tr) => {
    const tds = [...tr.querySelectorAll("td")];
    const dept = txt(tds[0]?.querySelector("a, p")) || txt(tds[0]);
    const ticked = tds.slice(1).filter((td) => td.querySelector(".mat-checkbox-checked"));
    const progs = ticked.map((td) => colName[[...td.classList].find((c) => c.startsWith("mat-column-"))]);
    return { tr, tds, ticked, dept, progs };
  });
}

function duration(s) {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.join(", ") : s; } catch { return s; }
}

// "1,199,999" -> "11,99,999" (Indian lakh/crore grouping); non-numbers are left as they are.
const inr = (s) => {
  const t = String(s ?? "").trim();
  return /^[\d,]+(\.\d+)?$/.test(t) ? Number(t.replace(/,/g, "")).toLocaleString("en-IN") : t;
};
// "1199999" -> "₹11.99 L"; crore/lakh/thousand for INR, K/M otherwise. Non-numbers unchanged.
const short = (s, cur = "INR") => {
  const t = String(s ?? "").trim();
  if (!/^[\d,]+(\.\d+)?$/.test(t)) return t;
  const n = Number(t.replace(/,/g, ""));
  const fmt = (v, unit) => `${Math.floor(v * 100 + 1e-9) / 100} ${unit}`; // cut, never round up
  if (/^inr$/i.test(cur)) {
    const v = n >= 1e7 ? fmt(n / 1e7, "Cr") : n >= 1e5 ? fmt(n / 1e5, "L") : n >= 1e3 ? fmt(n / 1e3, "K") : String(n);
    return "₹" + v;
  }
  const v = n >= 1e6 ? fmt(n / 1e6, "M") : n >= 1e3 ? fmt(n / 1e3, "K") : String(n);
  return `${cur} ${v}`;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function build(view) {
  const container = view.querySelector("section.p-2 > .container") || view.querySelector("section.p-2");
  if (!container) return false;

  // ---- Status ----
  const status = txt(view.querySelector("mat-card [class*='indicator']")) || "Unknown";
  const statusOpen = !/closed|expired|over/i.test(status);

  // ---- Eligibility ----
  const elig = panel(view, "Eligibility criteria");
  let eligible = false, deptListed = false;
  const matrixRows = [];
  elig?.querySelectorAll("table.mat-table").forEach((t) => matrixRows.push(...parseMatrix(t)));
  for (const r of matrixRows) {
    if (isMyDept(r.dept)) {
      deptListed = true;
      if (r.progs.some(isMyProgram)) eligible = true;
    }
  }
  const h4s = [...(elig?.querySelectorAll("h4") || [])].map(txt);
  const after = (label) => (h4s.find((h) => norm(h).startsWith(norm(label))) || "").split(":").slice(1).join(":").trim();
  const cpi = after("CPI Cutoff") || "—";
  const bonus = after("Allow bonus applications") || "—";

  // ---- Pay for my program ----
  const comp = panel(view, "Compensation details");
  const payRows = comp?.querySelector("table") ? rowsOf(comp.querySelector("table")) : [];
  const mine = payRows.find((r) => isMyProgram(pick(r, "Program")));

  // ---- Location / bond (small tables in Job Details) ----
  const details = panel(view, "Job Details");
  const facts = {};
  details?.querySelectorAll(":scope > table").forEach((t) => Object.assign(facts, rowsOf(t)[0] || {}));

  // ---- Selection process ----
  const sel = panel(view, "Selection process");
  const steps = sel?.querySelector("table") ? rowsOf(sel.querySelector("table")) : [];
  const stepsHtml = steps.map((st) => {
    const d = duration(pick(st, "Duration"));
    return `<li><span class="pj-step-name">${esc(pick(st, "Name"))}</span>${d ? `<span class="pj-step-time">${esc(d)}</span>` : ""}</li>`;
  }).join("");

  // ---- Card ----
  const eligBadge = eligible
    ? `<span class="pj-badge pj-yes">✓ Eligible for ${esc(ME.program)}</span>`
    : `<span class="pj-badge pj-no">✗ Not eligible for ${esc(ME.program)}${deptListed ? "" : " (department not listed)"}</span>`;
  const statusBadge = `<span class="pj-badge ${statusOpen ? "pj-yes" : "pj-neutral"}">${esc(status)}</span>`;

  // One labelled box per fact. `tone` colours the value when it needs attention.
  const field = (label, value, tone = "", sub = "") =>
    `<div class="pj-field"><div class="pj-label">${esc(label)}</div><div class="pj-value ${tone}">${esc(value || "—")}</div>${sub ? `<div class="pj-sub">${esc(sub)}</div>` : ""}</div>`;
  // Pay: short form (₹11.99 L) big, exact amount (₹11,99,999) small underneath.
  const cur = (txt(comp?.querySelector("p")).match(/currency:\s*(\w+)/i) || [])[1] || "INR";
  const sym = /^inr$/i.test(cur) ? "₹" : cur + " ";
  const money = (label, raw, tone = "") =>
    field(label, short(raw, cur), tone, /^[\d,.]+$/.test(String(raw).trim()) ? sym + inr(raw) : "");
  const group = (title, inner) =>
    `<section class="pj-group"><h3 class="pj-group-title">${esc(title)}</h3>${inner}</section>`;

  const bond = pick(facts, "Bond");
  const payGroup = mine
    ? `<div class="pj-grid">${money("Base (per year)", pick(mine, "Gross"), "pj-big")}${money("CTC (per year)", pick(mine, "CTC"))}${field("Category", pick(mine, "Category"))}</div>`
    : `<div class="pj-grid">${field("Pay", `Not listed for ${ME.program}`, "pj-warn")}</div>` +
      (payRows.length ? `<ul class="pj-other">${payRows.map((r) => `<li><b>${esc(pick(r, "Program"))}</b>: ${esc(short(pick(r, "CTC") || pick(r, "Gross"), cur) || "—")}</li>`).join("")}</ul>` : "");

  const card = document.createElement("div");
  card.id = "pj-summary";
  // Header facts come from the page's top card: company, role title, job type.
  const top = view.querySelector("mat-card");
  const company = txt(top?.querySelector("p.panel-title")) || txt(view.querySelector("mat-toolbar")).split("|")[0].trim();
  const role = txt(top?.querySelector("h2.panel-title"));
  const type = txt(top?.querySelector(".job-designation"));
  card.innerHTML = `
    <div class="pj-head">
      <div class="pj-company">${esc(company || "—")}</div>
      <div class="pj-role">${esc(role || "—")}</div>
      ${type ? `<span class="pj-type">${esc(type)}</span>` : ""}
    </div>
    <div class="pj-badges">${statusBadge}${eligBadge}</div>
    ${group(`Your pay (${ME.program})`, payGroup)}
    ${group("Requirements", `<div class="pj-grid">${field("CPI cutoff", cpi)}${field("Bonus applications", bonus)}</div>`)}
    ${group("Job terms", `<div class="pj-grid">${field("Location", pick(facts, "Place"))}${field("Accommodation", pick(facts, "Accom"))}${field("Bond", bond, /^\s*no\s*$/i.test(bond) || !bond ? "" : "pj-warn")}</div>`)}
    ${group("Selection process", stepsHtml ? `<ol class="pj-steps">${stepsHtml}</ol>` : `<div class="pj-value">—</div>`)}`;
  container.prepend(card);

  // ---- Trim: eligibility tables show only ticked rows ----
  elig?.querySelectorAll("table.mat-table").forEach((t) => {
    const rows = parseMatrix(t);
    let hidden = 0;
    for (const r of rows) {
      if (isMyDept(r.dept)) {
        r.tr.classList.add("pj-mine");
        r.tds.slice(1).forEach((td) => {
          const c = [...td.classList].find((c) => c.startsWith("mat-column-"));
          const head = t.querySelector(`thead th.${c}`);
          if (isMyProgram(txt(head?.querySelector("p")) || txt(head))) td.classList.add("pj-mycell");
        });
      } else if (!r.progs.length) {
        r.tr.classList.add("pj-empty"); hidden++;
      }
    }
    if (hidden) {
      const wrap = t.parentElement;
      const btn = document.createElement("button");
      btn.className = "pj-toggle";
      const label = () => (t.classList.contains("pj-showall")
        ? "Hide departments with no eligible programs"
        : `Show all departments (${hidden} hidden, none eligible)`);
      btn.textContent = label();
      btn.addEventListener("click", () => { t.classList.toggle("pj-showall"); btn.textContent = label(); });
      wrap.before(btn);
    }
  });

  // ---- Trim: long description collapsed, duplicate paragraphs removed ----
  const desc = details?.querySelector(":scope > div > span")?.parentElement;
  if (desc) {
    const seen = new Set();
    desc.querySelectorAll("p, li").forEach((p) => {
      const k = norm(txt(p));
      if (k.length > 40 && seen.has(k)) p.classList.add("pj-dup");
      seen.add(k);
    });
    if (desc.scrollHeight > 400) {
      desc.classList.add("pj-clamp");
      const btn = document.createElement("button");
      btn.className = "pj-toggle";
      btn.textContent = "Show full description";
      btn.addEventListener("click", () => {
        const open = desc.classList.toggle("pj-clamp") === false;
        btn.textContent = open ? "Collapse description" : "Show full description";
      });
      desc.after(btn);
    }
  }
  return true;
}

const style = document.createElement("style");
style.textContent = `
  #pj-summary {
    margin: 0 0 1.5em; padding: 1.25em 1.5em; border-radius: 12px;
    border: 1px solid #d0d7de; background: #f6f8fa; color: #1f2328;
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  #pj-summary .pj-head { margin-bottom: 0.9em; padding-bottom: 0.9em; border-bottom: 1px solid #d0d7de; }
  #pj-summary .pj-company { font-size: 0.95em; font-weight: 600; color: #57606a; }
  #pj-summary .pj-role { font-size: 1.5em; font-weight: 700; line-height: 1.25; margin: 2px 0 8px; }
  #pj-summary .pj-type {
    display: inline-block; font-size: 0.85em; font-weight: 600; padding: 3px 10px; border-radius: 6px;
    background: #ddf4ff; color: #0969da; border: 1px solid #54aeff;
  }
  #pj-summary .pj-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1.1em; }
  .pj-badge { padding: 5px 12px; border-radius: 999px; font-weight: 600; font-size: 0.95em; }
  .pj-yes { background: #dafbe1; color: #116329; border: 1px solid #4ac26b; }
  .pj-no { background: #ffebe9; color: #a40e26; border: 1px solid #ff8182; }
  .pj-neutral { background: #eaeef2; color: #424a53; border: 1px solid #afb8c1; }

  #pj-summary .pj-group { margin: 0 0 1.1em; }
  #pj-summary .pj-group:last-child { margin-bottom: 0; }
  #pj-summary .pj-group-title {
    margin: 0 0 0.5em; font-size: 0.8em; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #57606a; line-height: 1.3 !important;
  }
  #pj-summary .pj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  #pj-summary .pj-field {
    background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 0.6em 0.85em;
  }
  #pj-summary .pj-label { font-size: 0.8em; color: #57606a; margin-bottom: 2px; }
  #pj-summary .pj-value { font-size: 1.1em; font-weight: 600; overflow-wrap: anywhere; }
  #pj-summary .pj-sub { font-size: 0.8em; color: #57606a; margin-top: 1px; }
  #pj-summary .pj-big { font-size: 1.35em; }
  #pj-summary .pj-warn { color: #9a6700; }
  #pj-summary .pj-other { margin: 0.6em 0 0; padding-left: 1.2em; }

  #pj-summary .pj-steps { margin: 0; padding: 0; list-style: none; counter-reset: pjstep; display: grid; gap: 6px; }
  #pj-summary .pj-steps li {
    counter-increment: pjstep; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 0.5em 0.85em;
    max-width: none; margin: 0;
  }
  #pj-summary .pj-steps li::before {
    content: counter(pjstep); flex: none; width: 1.7em; height: 1.7em; border-radius: 50%;
    display: grid; place-items: center; background: #ddf4ff; color: #0969da; font-weight: 700; font-size: 0.85em;
  }
  #pj-summary .pj-step-name { font-weight: 600; }
  #pj-summary .pj-step-time {
    margin-left: auto; font-size: 0.85em; color: #57606a;
    background: #eaeef2; border-radius: 999px; padding: 2px 10px;
  }
  .pj-dim { color: #57606a; }

  table.mat-table:not(.pj-showall) tr.pj-empty { display: none; }
  tr.pj-mine td { background: #fff8c5 !important; }
  td.pj-mycell { outline: 3px solid #bf8700; outline-offset: -3px; }
  .pj-toggle {
    align-self: flex-start; margin: 8px 0; padding: 6px 12px; border-radius: 6px; cursor: pointer;
    border: 1px solid #8c959f; background: #fff; color: #1f2328; font: 500 14px system-ui, sans-serif;
  }
  .pj-toggle:focus-visible { outline: 3px solid #4a90e2; outline-offset: 2px; }
  .pj-dup { display: none; }
  .pj-clamp {
    max-height: 22em; overflow: hidden;
    -webkit-mask-image: linear-gradient(#000 75%, transparent);
            mask-image: linear-gradient(#000 75%, transparent);
  }
`;
document.documentElement.append(style);

// The portal loads job data after the page appears and swaps pages without reloading,
// so keep checking for a job view that hasn't been summarised yet. The title bar
// ("Airbus | Job - 10") identifies the job, so moving to another job rebuilds the card.
setInterval(() => {
  if (!/^\/applicant\/job\//.test(location.pathname)) return;
  const view = document.querySelector("app-view-job");
  if (!view) return;
  const key = txt(view.querySelector("mat-toolbar")) || location.pathname;
  if (view.dataset.pjDone === key) return;
  if (!panel(view, "Compensation details")) return; // data not loaded yet
  view.querySelectorAll("#pj-summary, .pj-toggle").forEach((el) => el.remove());
  view.querySelectorAll(".pj-empty, .pj-mine, .pj-mycell, .pj-dup, .pj-clamp, .pj-showall")
    .forEach((el) => el.classList.remove("pj-empty", "pj-mine", "pj-mycell", "pj-dup", "pj-clamp", "pj-showall"));
  if (build(view)) view.dataset.pjDone = key;
}, 500);
})();
