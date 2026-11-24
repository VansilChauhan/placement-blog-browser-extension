// Toolbar icon click -> start the flow in a new tab.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "https://campus.placements.iitb.ac.in/#autologin" });
});
