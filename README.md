# Placement Blog

Makes the IIT Bombay placement portal easier to use: one-click login to the placement blog, a comfortable reading mode, a summary card on job pages, and **desktop alerts for new blog posts** so you don't have to keep refreshing. Everything stays on your computer.

## Setup

1. Put this folder somewhere permanent.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select this folder.
3. Click the extension once and log in, so it can start checking the blog.
4. Optional: set your department and program at the top of `job-summary.js` (`ME`), then reload the extension.

## Usage

- **Open the blog**: click the extension. It clicks *Student*, and once you open *Blog* it goes through the SSO login for you. Clicking *Blog* yourself from the portal does the same.
- **Reading mode** (blog): dark theme and larger text. Use the **A−** / **A+** / **☀☾** buttons in the bottom-right corner. Settings are remembered.
- **Jobs pages** (`/applicant/jobs`, `/applicant/job/...`): dark mode and zoom with the same corner buttons; the ☀☾ setting is shared with the blog.
- **Job summary card**: on a single job page, a card at the top shows status, whether you're eligible, pay for your program, location, bond and the selection process. Long sections are trimmed, with a button to show all.

## New-post alerts

Every minute the extension checks the blog with your logged-in session. When a new post appears you get a desktop notification with its title and three beeps. It stays until you dismiss it; clicking it opens the blog.

- The first check only records the existing posts, so you aren't flooded with old ones.
- If your session expires you get one **"logged out"** notification. Click it to log in again; checks resume on their own.

### Keep it running

Alerts only work while Chrome runs, but no window needs to be open.

1. Chrome **Settings → System** → turn on **Continue running background apps when Google Chrome is closed**. Closing all windows then keeps Chrome checking in the background.
2. To start it at login without opening a window, run once:

   ```bash
   mkdir -p ~/.config/autostart && cat > ~/.config/autostart/chrome-background.desktop <<'EOF'
   [Desktop Entry]
   Type=Application
   Name=Chrome (background)
   Exec=google-chrome --no-startup-window
   X-GNOME-Autostart-enabled=true
   EOF
   ```

Check it's running with `pgrep -a chrome`; stop it fully with `pkill chrome`. A full quit (Menu → Exit, shutdown) stops the checks until Chrome starts again. Nothing is checked while the laptop sleeps.

## Troubleshooting

- **No alerts**: open `chrome://extensions` → the extension's **service worker** link → Console, and run `chrome.storage.local.get("seen").then(console.log)`. A list of post IDs means checking works. An empty `{}` means no check has succeeded yet; make sure you're logged in and wait a minute.
- **Test an alert**: in the same console run `chrome.storage.local.get("seen").then(({seen}) => chrome.storage.local.set({seen: seen.slice(1)}))`. The newest post alerts again within a minute.
- **"Logged out" while logged in**: the blog's page layout may have changed. The service worker console shows any errors.
- **Notification but no banner**: GNOME's Do Not Disturb is on, or Chrome notifications are off in GNOME Settings → Notifications.
- **No sound**: check Chrome isn't muted in GNOME's sound settings.
- **"service worker" link missing**: turn on **Developer mode**. "(Inactive)" is normal; clicking it wakes the worker.

## Privacy

The only network requests are to `campus.placements.iitb.ac.in`, the same ones you'd make by refreshing, sent with your existing login. The list of seen post IDs is kept in Chrome's local extension storage, which isn't synced. Reading-mode settings are kept in the site's own local storage. Your password is never stored or read; login goes through IITB SSO as usual. Removing the extension deletes the stored data.

## License

MIT.
