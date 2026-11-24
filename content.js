// Flow:
//   1. https://campus.placements.iitb.ac.in/   -> auto-clicks "Student"
//   2. /applicant/home                          -> nothing automatic; you choose. If you click
//                                                  "Blog", the automation picks up again.
//   3. /blog/                                   -> auto-goes to the SSO "Login as <ID>" link
//   4. /blog/placement/                         -> stop

const BLOG_LOGIN = "https://campus.placements.iitb.ac.in/blog/placement/authplacement/";

// ---- Step 1: landing page -> click "Student" ----
if (location.pathname === "/") {
  const started = Date.now();
  const t = setInterval(() => {
    if (location.pathname !== "/" || Date.now() - started > 30000) return clearInterval(t);
    const btn = document.querySelector('a.mat-raised-button:has(i-feather[name="user"])');
    if (btn) {
      clearInterval(t);
      console.log("[autologin] clicking Student");
      btn.click();
    }
  }, 300);
}

// ---- Step 2: applicant pages -> don't click anything, just tag the Blog link ----
// Adding #autologin to the Blog link lets the blog tab know it came from your click,
// while opening /blog/ some other way stays untouched. Re-applied because Angular
// re-renders the page as you navigate.
setInterval(() => {
  if (!location.pathname.startsWith("/applicant")) return;
  for (const a of document.querySelectorAll('a[href*="campus.placements.iitb.ac.in/blog/"]')) {
    if (/\/blog\/?$/.test(a.getAttribute("href"))) {
      a.href = "https://campus.placements.iitb.ac.in/blog/#autologin";
    }
  }
}, 500);

// ---- Step 3: blog opened via that link -> go to the SSO login link ----
// The "Login as <ID>" button sits in an iframe this script can't see, so use its URL directly.
if (/\/blog\/?$/.test(location.pathname) && location.hash === "#autologin") {
  console.log("[autologin] going to SSO login");
  location.replace(BLOG_LOGIN);
}
