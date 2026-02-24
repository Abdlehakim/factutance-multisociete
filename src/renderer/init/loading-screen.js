(function () {
  const body = document.body;
  if (!body) return;
  const loader = document.getElementById("app-loader");

  const MIN_VISIBLE_MS = 2000;
  const startTime = performance.now();
  let hideRequested = false;
  let notifiedReady = false;

  function notifyAppReady() {
    if (notifiedReady) return;
    notifiedReady = true;
    try {
      window.electronAPI?.notifyAppReady?.();
    } catch {
      // ignore if bridge unavailable
    }
  }

  function finalizeHide() {
    if (!body.classList.contains("app-loaded")) {
      body.classList.add("app-loaded");
    }
    notifyAppReady();
    if (loader) {
      const cleanup = () => loader.remove();
      loader.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, 1500);
    }
  }

  function requestHide() {
    if (hideRequested) return;
    hideRequested = true;
    const elapsed = performance.now() - startTime;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);
    setTimeout(finalizeHide, delay);
  }

  window.addEventListener("load", requestHide);

  // Fallback in case the load event never fires.
  setTimeout(requestHide, 7000);
})();
