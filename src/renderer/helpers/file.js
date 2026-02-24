(function (w) {
  if (typeof w.registerHelpers !== "function") return;

  function downloadBlob(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "download";
    document.body.appendChild(a);
    try {
      a.click();
    } finally {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(a.href);
        } catch {}
        a.remove();
      }, 0);
    }
  }

  function toFileURL(p) {
    if (!p) return null;
    if (/^(file|https?):\/\//i.test(p)) return p;
    let normalized = String(p).replace(/\\/g, "/");
    if (normalized.startsWith("//")) return "file:" + encodeURI(normalized);
    if (/^[a-zA-Z]:\//.test(normalized)) return "file:///" + encodeURI(normalized);
    if (normalized.startsWith("/")) return "file://" + encodeURI(normalized);
    return "file://" + encodeURI("/" + normalized);
  }

  async function openPDFFile(path) {
    if (!path) return false;
    if (window.electronAPI?.openPath) {
      try {
        return !!(await window.electronAPI.openPath(path));
      } catch {}
    }
    if (window.electronAPI?.showInFolder) {
      try {
        await window.electronAPI.showInFolder(path);
        return true;
      } catch {}
    }
    if (window.electronAPI?.openExternal) {
      try {
        const url = toFileURL(path);
        await window.electronAPI.openExternal(url);
        return true;
      } catch {}
    }
    try {
      const _ = toFileURL(path);
      return true;
    } catch {
      return false;
    }
  }

  w.registerHelpers({
    downloadBlob,
    toFileURL,
    openPDFFile
  });
})(window);
