// Toolbar icon click -> start the flow in a new tab.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "https://campus.placements.iitb.ac.in/#autologin" });
});

// ---- New-post watcher ----
// Every minute, fetch the blog with your logged-in cookies, compare post IDs with
// the ones already seen, and show a desktop notification (+ beep) for each new one.
// Nothing leaves your laptop except the same request you'd make by refreshing.

const BLOG = "https://campus.placements.iitb.ac.in/blog/placement/";
const LOGIN = "https://campus.placements.iitb.ac.in/#autologin";
const PERIOD_MIN = 1;

chrome.runtime.onInstalled.addListener(start);
chrome.runtime.onStartup.addListener(start);
chrome.alarms.onAlarm.addListener(a => { if (a.name === "check") check(); });

function start() {
  chrome.alarms.create("check", { periodInMinutes: PERIOD_MIN });
  check();
}

// Twenty Seventeen markup: <article id="post-123" ...> ... <h2 class="entry-title"><a href="URL" ...>Title</a>
// Service workers have no DOMParser, so a regex over each <article> block.
function parsePosts(html) {
  const posts = [];
  for (const m of html.matchAll(/<article\b[^>]*\bid="post-(\d+)"[\s\S]*?<\/article>/g)) {
    const t = m[0].match(/class="entry-title"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/);
    posts.push({ id: m[1], title: t ? decode(t[1].replace(/<[^>]+>/g, "")).trim() : `Post ${m[1]}` });
  }
  return posts;
}

function decode(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
          .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
          .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}

async function check() {
  const { seen, loggedOut } = await chrome.storage.local.get(["seen", "loggedOut"]);
  let posts;
  try {
    const res = await fetch(BLOG, { credentials: "include", cache: "no-store" });
    posts = res.ok && res.url.startsWith(BLOG) ? parsePosts(await res.text()) : [];
  } catch (e) {
    console.warn("[watcher] fetch failed", e); // offline / network blip: just try next minute
    return;
  }

  // Redirected to SSO, or a page with no posts -> session expired. Warn once per streak.
  if (!posts.length) {
    if (!loggedOut) {
      await chrome.storage.local.set({ loggedOut: true });
      notify("logged-out", "Placement blog: logged out", "Click to log in again — new posts can't be checked until then.");
    }
    return;
  }
  if (loggedOut) {
    await chrome.storage.local.set({ loggedOut: false });
    chrome.notifications.clear("logged-out");
  }

  // First run: remember what's there now, don't flood you with old posts.
  if (!seen) {
    return chrome.storage.local.set({ seen: posts.map(p => p.id) });
  }

  const fresh = posts.filter(p => !seen.includes(p.id));
  if (!fresh.length) return;
  for (const p of fresh) notify(`post-${p.id}`, "New placement blog post", p.title);
  // Keep the list bounded; old IDs never come back to the front page anyway.
  await chrome.storage.local.set({ seen: [...fresh.map(p => p.id), ...seen].slice(0, 500) });
  beep();
}

function notify(id, title, message) {
  chrome.notifications.create(id, {
    type: "basic", iconUrl: "icon.png", title, message,
    requireInteraction: true, // stays until dismissed, so you don't miss it while away
    priority: 2,
  });
}

// Post alerts open the blog front page (newest posts on top), not the single post.
chrome.notifications.onClicked.addListener(async id => {
  chrome.notifications.clear(id);
  const url = id === "logged-out" ? LOGIN : BLOG;
  // With every window closed (Chrome running in the background) there's nowhere to put a
  // tab, so open a new window; otherwise add a tab and bring its window to the front.
  const win = (await chrome.windows.getAll({ windowTypes: ["normal"] }))[0];
  if (!win) return chrome.windows.create({ url, focused: true });
  const tab = await chrome.tabs.create({ windowId: win.id, url });
  chrome.windows.update(tab.windowId, { focused: true });
});

// Service workers can't play audio; an offscreen page does it.
async function beep() {
  try {
    if (!(await chrome.offscreen.hasDocument())) {
      await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["AUDIO_PLAYBACK"], justification: "New-post alert sound" });
    }
    chrome.runtime.sendMessage({ beep: true });
  } catch (e) {
    console.warn("[watcher] sound failed", e);
  }
}
