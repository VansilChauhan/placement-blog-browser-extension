// Plays the new-post alert: three short beeps.
chrome.runtime.onMessage.addListener(msg => {
  if (!msg.beep) return;
  const ctx = new AudioContext();
  [0, 0.25, 0.5].forEach(t => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.3, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + t);
    o.stop(ctx.currentTime + t + 0.2);
  });
  setTimeout(() => ctx.close(), 1000);
});
