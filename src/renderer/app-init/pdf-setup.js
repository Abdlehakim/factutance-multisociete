(function (w) {
  const AppInit = (w.AppInit = w.AppInit || {});

  function configurePdfJs() {
    const lib = w.pdfjsLib;
    if (!lib || !lib.GlobalWorkerOptions) return false;
    const base = document.baseURI || location.href;
    const workerUrl = new URL("./lib/pdfs/pdf.worker.min.js", base).href;
    if (lib.GlobalWorkerOptions.workerSrc !== workerUrl) {
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      lib.GlobalWorkerOptions.cMapUrl = new URL("./lib/pdfs/cmaps/", base).href;
      lib.GlobalWorkerOptions.standardFontDataUrl = new URL("./lib/pdfs/standard_fonts/", base).href;
      console.debug("[PDF.js] workerSrc ->", workerUrl);
    }
    try {
      const probe = new Worker(workerUrl, { type: "classic" });
      probe.terminate();
    } catch (e) {
      console.error("[PDF.js] Worker failed to spawn from:", workerUrl, e);
    }
    return true;
  }

  function ensurePdfWorker() {
    if (configurePdfJs()) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      if (configurePdfJs() || Date.now() - t0 > 5000) clearInterval(id);
    }, 50);
  }

  AppInit.ensurePdfWorker = ensurePdfWorker;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePdfWorker, { once: true });
  } else {
    ensurePdfWorker();
  }
})(window);
