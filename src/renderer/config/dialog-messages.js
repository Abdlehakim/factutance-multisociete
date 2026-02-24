(function (w) {
  const data = w.APP_MESSAGE_DATA || {};
  const defaultDialogText = data.dialogText || {};
  const existingText = w.DialogMessages || {};
  const dialogText = { ...defaultDialogText, ...existingText };

  const defaultStrings = data.dialogStrings || {};
  const existingStrings = w.DialogMessageStrings || {};
  const dialogMessageStrings = { ...defaultStrings, ...existingStrings };

  const appMessages = data.appMessages || {};

  function formatDialogMessageString(key, values = {}) {
    const source = w.DialogMessageStrings || {};
    const template = source[key] ?? dialogMessageStrings[key];
    if (!template) return "";
    return String(template).replace(/\{(\w+)\}/g, (_, prop) => {
      const val = values[prop];
      return val === undefined || val === null ? "" : String(val);
    });
  }

  function getDialogMessageString(key, { values = {}, fallback } = {}) {
    if (!key) return typeof fallback === "string" ? fallback : "";
    const formatted = formatDialogMessageString(key, values);
    if (formatted) return formatted;
    const strings = w.DialogMessageStrings || {};
    if (strings[key]) return strings[key];
    return typeof fallback === "string" ? fallback : key;
  }

  function formatTemplate(template, values = {}) {
    if (!template) return "";
    return String(template).replace(/\{(\w+)\}/g, (_, prop) => {
      const val = values[prop];
      return val === undefined || val === null ? "" : String(val);
    });
  }

  function getAppMessage(key, { values = {}, fallbackText, fallbackTitle } = {}) {
    const entry = appMessages[key];
    let text = "";
    if (entry?.stringKey) {
      text = formatDialogMessageString(entry.stringKey, values);
    } else if (entry?.text) {
      text = formatTemplate(entry.text, values);
    }
    if (!text && fallbackText) {
      text = formatTemplate(fallbackText, values);
    }
    if (!text && typeof key === "string") {
      text = key;
    }
    const title = entry?.title || fallbackTitle || dialogText.defaultTitle || "Information";
    return { text: text || "", title };
  }

  w.DialogMessages = dialogText;
  w.DialogMessageStrings = dialogMessageStrings;
  w.formatDialogMessageString = formatDialogMessageString;
  w.getDialogMessageString = getDialogMessageString;
  w.getAppMessage = getAppMessage;
})(window);

(function (w) {
  const existing = w.DialogMessageTemplates || {};

  const appendFilenameNodes = (target, { article, filename, suffixText } = {}, fallbackText = "") => {
    if (!target) return;
    if (typeof document === "undefined") {
      target.textContent = fallbackText;
      return;
    }
    const safeArticle = (article && String(article).trim()) || "Le";
    const safeFilename = (filename && String(filename).trim()) || "document";
    const suffix = suffixText ? String(suffixText).trim() : "";
    const prefixNode = document.createTextNode(`${safeArticle} `);
    const strong = document.createElement("strong");
    strong.className = "swbDialogMsg__filename";
    strong.textContent = safeFilename;
    target.append(prefixNode, strong);
    if (suffix) target.append(document.createTextNode(` ${suffix}`));
  };

  const templates = {
    filenameStatusMessage({ article = "Le", filename = "document", suffixText = "" } = {}) {
      const safeArticle = String(article || "Le").trim() || "Le";
      const safeFilename = String(filename || "document").trim() || "document";
      const suffix = suffixText ? String(suffixText).trim() : "";
      const formatted =
        typeof w.formatDialogMessageString === "function"
          ? w.formatDialogMessageString("saveSuccess", {
              article: safeArticle,
              filename: safeFilename,
              status: suffix
            })
          : null;
      const text = formatted || `${safeArticle} ${safeFilename}${suffix ? ` ${suffix}` : ""}`.trim();
      return {
        text,
        renderMessage: (container) => {
          if (!container) return;
          if (typeof document === "undefined") {
            container.textContent = text;
            return;
          }
          container.textContent = "";
          appendFilenameNodes(container, { article: safeArticle, filename: safeFilename, suffixText: suffix }, text);
        }
      };
    },
    fileExistsWarning({ article = "Le", filename = "document", noticeText = "", noticeValues = {} } = {}) {
      const safeArticle = String(article || "Le").trim() || "Le";
      const safeFilename = String(filename || "document").trim() || "document";
      const safeNotice = String(noticeText || "").trim();
      const suffix =
        typeof w.formatDialogMessageString === "function"
          ? w.formatDialogMessageString("fileExistsSuffix", {})
          : null;
      const notice =
        typeof w.formatDialogMessageString === "function"
          ? w.formatDialogMessageString("fileExistsNotice", {
              pronoun: noticeValues.pronoun ?? "",
              feminineSuffix: noticeValues.feminineSuffix ?? "",
              notice: safeNotice
            })
          : safeNotice;
      const suffixText = (suffix && suffix.trim()) || "existe deja.";
      const introText = `${safeArticle} ${safeFilename} ${suffixText}`.trim();
      const resolvedNotice = notice || safeNotice;
      const text = resolvedNotice ? `${introText}\n\n${resolvedNotice}` : introText;
      return {
        text,
        renderMessage: (container) => {
          if (!container) return;
          if (typeof document === "undefined") {
            container.textContent = text;
            return;
          }
          container.innerHTML = "";
          const firstLine = document.createElement("p");
          appendFilenameNodes(firstLine, { article: safeArticle, filename: safeFilename, suffixText: suffixText }, text);
          container.appendChild(firstLine);
          if (resolvedNotice) {
            const secondLine = document.createElement("p");
            secondLine.textContent = resolvedNotice;
            container.appendChild(secondLine);
          }
        }
      };
    },
    documentReadySummary({ entries = [] } = {}) {
      const normalized = entries.map((entry) => ({
        prefix: String(entry?.prefix || "").trim(),
        name: String(entry?.name || "").trim(),
        suffix: String(entry?.suffix || "").trim()
      }));
      const text = normalized
        .map((entry) => `${entry.prefix} ${entry.name} ${entry.suffix}`.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n\n");
      return {
        text,
        renderMessage: (container) => {
          if (!container) return;
          if (typeof document === "undefined") {
            container.textContent = text;
            return;
          }
          container.innerHTML = "";
          normalized.forEach((entry) => {
            if (!entry.prefix && !entry.name && !entry.suffix) return;
            const line = document.createElement("p");
            if (entry.prefix) line.append(document.createTextNode(`${entry.prefix} `));
            if (entry.name) {
              const strong = document.createElement("strong");
              strong.className = "swbDialogMsg__filename";
              strong.textContent = entry.name;
              line.appendChild(strong);
            }
            if (entry.suffix) line.append(document.createTextNode(` ${entry.suffix}`));
            container.appendChild(line);
          });
        }
      };
    }
  };

  w.DialogMessageTemplates = { ...templates, ...existing };
})(window);
