(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const POPOVER_SELECTOR = "#articleFormPopover";
  const TAB_SELECTOR = "[data-article-tab]";
  const PANEL_SELECTOR = "[data-article-modal-panel]";
  const TAB_ADD_BUTTON_SELECTOR = "#articleDepotAddBtn";
  const DEFAULT_TAB = "article";

  const getTabName = (tab) => String(tab?.dataset?.articleTab || "").toLowerCase();

  const toPopover = (node) => {
    if (!(node instanceof HTMLElement)) return null;
    if (node.matches?.(POPOVER_SELECTOR)) return node;
    return typeof node.closest === "function" ? node.closest(POPOVER_SELECTOR) : null;
  };

  const getPopover = (hint = null) => {
    const scoped = toPopover(hint);
    if (scoped) return scoped;
    if (typeof document === "undefined") return null;
    return document.getElementById("articleFormPopover");
  };

  const getTabs = (popover) => Array.from(popover?.querySelectorAll?.(TAB_SELECTOR) || []);
  const getPanels = (popover) => Array.from(popover?.querySelectorAll?.(PANEL_SELECTOR) || []);

  const activateTab = (hint = null, tabName = DEFAULT_TAB, { focus = false } = {}) => {
    const popover = getPopover(hint);
    if (!popover) return null;
    const tabs = getTabs(popover);
    const panels = getPanels(popover);
    if (!tabs.length || !panels.length) return null;
    const target = String(tabName || DEFAULT_TAB).trim().toLowerCase();

    tabs.forEach((tab) => {
      const isActive = getTabName(tab) === target;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      if (isActive && focus && typeof tab.focus === "function") {
        try {
          tab.focus({ preventScroll: true });
        } catch {
          try {
            tab.focus();
          } catch {}
        }
      }
    });

    panels.forEach((panel) => {
      const isActive = String(panel.dataset.articleModalPanel || "").toLowerCase() === target;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      if (isActive) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });

    // Keep stock/depot secondary tab visuals in sync with the active main section tab.
    if (typeof SEM.stockWindow?.syncUi === "function") {
      try {
        SEM.stockWindow.syncUi(popover);
      } catch {}
    }

    return target;
  };

  const activateAdjacentTab = (tab, direction = 1) => {
    const popover = toPopover(tab);
    if (!popover) return;
    const tabs = getTabs(popover);
    if (tabs.length < 2) return;
    const index = tabs.indexOf(tab);
    if (index < 0) return;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    const target = getTabName(nextTab);
    if (!target) return;
    activateTab(popover, target, { focus: true });
  };

  const bindEvents = () => {
    if (SEM.__articleModalTabsBound || typeof document === "undefined") return;
    SEM.__articleModalTabsBound = true;

    document.addEventListener("click", (evt) => {
      if (evt?.target?.closest?.(TAB_ADD_BUTTON_SELECTOR)) return;
      const tab = evt?.target?.closest?.(TAB_SELECTOR);
      if (!(tab instanceof HTMLElement)) return;
      const popover = toPopover(tab);
      if (!popover) return;
      evt.preventDefault();
      activateTab(popover, getTabName(tab) || DEFAULT_TAB, { focus: false });
    });

    document.addEventListener("keydown", (evt) => {
      if (evt?.target?.closest?.(TAB_ADD_BUTTON_SELECTOR)) return;
      const tab = evt?.target?.closest?.(TAB_SELECTOR);
      if (!(tab instanceof HTMLElement)) return;
      const popover = toPopover(tab);
      if (!popover) return;
      if (evt.key === "ArrowRight") {
        evt.preventDefault();
        activateAdjacentTab(tab, 1);
        return;
      }
      if (evt.key === "ArrowLeft") {
        evt.preventDefault();
        activateAdjacentTab(tab, -1);
        return;
      }
      if (evt.key === "Home") {
        evt.preventDefault();
        activateTab(popover, DEFAULT_TAB, { focus: true });
        return;
      }
      if (evt.key === "End") {
        evt.preventDefault();
        const tabs = getTabs(popover);
        const lastTabName = getTabName(tabs[tabs.length - 1]) || DEFAULT_TAB;
        activateTab(popover, lastTabName, { focus: true });
      }
    });
  };

  const observePopoverOpenState = (popover) => {
    if (!(popover instanceof HTMLElement)) return;
    if (popover.dataset.articleModalTabsObserved === "true") return;
    popover.dataset.articleModalTabsObserved = "true";
    const observer = new MutationObserver(() => {
      const isOpen = !popover.hidden && popover.getAttribute("aria-hidden") !== "true";
      if (isOpen) activateTab(popover, DEFAULT_TAB);
    });
    observer.observe(popover, {
      attributes: true,
      attributeFilter: ["hidden", "aria-hidden"]
    });
  };

  const bindOpenReset = () => {
    if (SEM.__articleModalTabsObserverBound || typeof MutationObserver === "undefined") return;
    if (typeof document === "undefined") return;
    SEM.__articleModalTabsObserverBound = true;
    const attach = () => {
      const popover = getPopover();
      if (popover) observePopoverOpenState(popover);
    };
    attach();
    const rootObserver = new MutationObserver(() => attach());
    rootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  };

  const init = () => {
    bindEvents();
    bindOpenReset();
    activateTab(null, DEFAULT_TAB);
  };

  SEM.articleModalTabs = {
    activateTab,
    init
  };

  if (typeof w.onReady === "function") {
    w.onReady(init);
  } else if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
