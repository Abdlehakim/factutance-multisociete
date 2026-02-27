import { renderArticleFieldsSettingsModal } from "./articleFieldsSettingsModal.js";
import {
  renderDepotMagasinModals,
  renderDepotMagasinPanel,
  renderDepotTabButton
} from "./client-tabs.js";

const ADD_ITEM_TABS_ROOT_SELECTOR = "[data-add-item-tabs]";
const ADD_ITEM_TAB_SELECTOR = "[data-add-item-tab]";
const ADD_ITEM_PANEL_SELECTOR = "[data-add-item-panel]";
const ADD_ITEM_TAB_ACTIVE_CLASS = "is-active";
const ADD_ITEM_PANEL_IDS = {
  articles: "addItemBoxMainscreenArticlesPanel",
  depots: "clientBoxMainscreenDepotsPanel"
};

const closeInactivePanelUi = (panel) => {
  if (!panel) return;
  panel.querySelectorAll(".client-search__results").forEach((results) => {
    if (!results.hidden) {
      results.hidden = true;
      results.setAttribute("hidden", "");
    }
  });

  if (panel.dataset.addItemPanel === "depots") {
    const toggleBtn = panel.querySelector("#depotMagasinFormToggleBtn");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");

    const popover = document.getElementById("depotMagasinFormPopover");
    if (popover && !popover.hidden) {
      popover.classList.remove("is-open");
      popover.hidden = true;
      popover.setAttribute("hidden", "");
      popover.setAttribute("aria-hidden", "true");
    }
  }
};

const applyTabState = (root, nextTab, { focus = false } = {}) => {
  const tabButtons = Array.from(root.querySelectorAll(ADD_ITEM_TAB_SELECTOR));
  const tabPanels = Array.from(root.querySelectorAll(ADD_ITEM_PANEL_SELECTOR));
  if (!tabButtons.length || !tabPanels.length) return;

  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.addItemTab === nextTab;
    btn.classList.toggle(ADD_ITEM_TAB_ACTIVE_CLASS, isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.tabIndex = isActive ? 0 : -1;
    if (focus && isActive) {
      try {
        btn.focus();
      } catch {}
    }
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.addItemPanel === nextTab;
    panel.classList.toggle(ADD_ITEM_TAB_ACTIVE_CLASS, isActive);
    panel.hidden = !isActive;
    if (isActive) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "");
      closeInactivePanelUi(panel);
    }
  });

  root.dataset.activeAddItemTab = nextTab;
};

export function wireAddItemTabs(scope = document) {
  if (!scope) return;
  const roots = [];
  if (scope.matches?.(ADD_ITEM_TABS_ROOT_SELECTOR)) {
    roots.push(scope);
  }
  roots.push(...(scope.querySelectorAll?.(ADD_ITEM_TABS_ROOT_SELECTOR) || []));

  roots.forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.addItemTabsWired === "true") return;

    const tabList = root.querySelector('[role="tablist"]');
    const tabButtons = Array.from(root.querySelectorAll(ADD_ITEM_TAB_SELECTOR));
    if (!tabList || !tabButtons.length) return;

    const initialTab =
      tabButtons.find((btn) => btn.getAttribute("aria-selected") === "true")?.dataset.addItemTab ||
      tabButtons[0]?.dataset.addItemTab ||
      "articles";

    applyTabState(root, initialTab);

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        applyTabState(root, btn.dataset.addItemTab, { focus: true });
      });
    });

    tabList.addEventListener("keydown", (evt) => {
      const allowedKeys = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);
      if (!allowedKeys.has(evt.key)) return;
      evt.preventDefault();

      const activeIndex = tabButtons.findIndex((btn) => btn.getAttribute("aria-selected") === "true");
      if (activeIndex < 0) return;

      let nextIndex = activeIndex;
      if (evt.key === "ArrowRight") nextIndex = (activeIndex + 1) % tabButtons.length;
      if (evt.key === "ArrowLeft") nextIndex = (activeIndex - 1 + tabButtons.length) % tabButtons.length;
      if (evt.key === "Home") nextIndex = 0;
      if (evt.key === "End") nextIndex = tabButtons.length - 1;

      const nextTab = tabButtons[nextIndex]?.dataset.addItemTab;
      if (!nextTab) return;
      applyTabState(root, nextTab, { focus: true });
    });

    root.dataset.addItemTabsWired = "true";
  });
}

const renderTabsList = () => `
  <div class="client-tabs__list" role="tablist" aria-label="Articles et depots/magasins">
    <button
      type="button"
      class="client-tab is-active"
      data-add-item-tab="articles"
      role="tab"
      aria-selected="true"
      aria-controls="${ADD_ITEM_PANEL_IDS.articles}"
      id="addItemTabArticles"
      tabindex="0"
    >
      Ajouter un article
    </button>
    ${renderDepotTabButton({ tabIndex: "-1" })}
  </div>
`;

const renderArticlePanel = () => `
  <div class="add-toolbar">
    <div class="article-search client-search">
      <div class="client-search__controls">
        <label class="client-search__field">
          <input
            id="articleSearch"
            type="search"
            placeholder="Rechercher un article par r&eacute;f&eacute;rence, d&eacute;signation ou description"
            autocomplete="off"
          />
          <button id="articleSearchBtn" type="button" class="client-search__action" aria-label="Rechercher un article">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="6"></circle>
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round"></line>
            </svg>
          </button>
        </label>
        <button id="articleSavedListBtn" type="button" class="client-search__saved" aria-label="Afficher les articles enregistr&eacute;s">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="5" cy="6" r="1.5"></circle>
            <circle cx="5" cy="12" r="1.5"></circle>
            <circle cx="5" cy="18" r="1.5"></circle>
            <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round"></line>
            <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round"></line>
            <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round"></line>
          </svg>
        </button>
        <button
          id="articleFieldsSettingsBtn"
          type="button"
          class="client-search__saved"
          aria-label="Configurer les champs de l&apos;article"
          aria-haspopup="dialog"
          aria-controls="articleFieldsSettingsModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"></path>
          </svg>
        </button>
        <button
          id="articleImportBtn"
          type="button"
          class="client-search__saved client-search__saved--import"
          aria-label="Importer des articles"
          aria-haspopup="dialog"
          aria-controls="articleImportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v12" stroke-linecap="round" />
            <path d="M8 7l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          id="articleExportBtn"
          type="button"
          class="client-search__saved client-search__saved--export"
          aria-label="Exporter des articles"
          aria-haspopup="dialog"
          aria-controls="articlesExportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21V9" stroke-linecap="round" />
            <path d="M8 17l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div id="articleSearchResults" class="client-search__results" hidden></div>
      ${renderArticleFieldsSettingsModal()}
    </div>
  </div>
  <div class="add-actions">
    <button
      id="articleCreateBtn"
      type="button"
      class="doc-type-action-btn"
      aria-label="Nouvel article"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-controls="articleFormPopover"
    >
      <span class="doc-type-action-icon" aria-hidden="true">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" t="1569683928793" viewBox="0 0 1024 1024" version="1.1" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
          <path d="M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16z m-52 268H212V212h200v200zM864 144H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16z m-52 268H612V212h200v200zM864 544H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16z m-52 268H612V612h200v200zM424 712H296V584c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v128H104c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h128v128c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V776h128c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
        </svg>
      </span>
      <span class="doc-type-action-label">Nouvel article</span>
    </button>
  </div>
`;

export function renderAddItemBoxMainscreen() {
  return `
    <fieldset class="section-box" id="addItemBoxMainscreen" data-add-item-tabs>
      <legend>
        ${renderTabsList()}
      </legend>

      <div
        class="client-tab-panel add-item-tab-panel is-active"
        data-add-item-panel="articles"
        id="${ADD_ITEM_PANEL_IDS.articles}"
        role="tabpanel"
        aria-labelledby="addItemTabArticles"
      >
        ${renderArticlePanel()}
      </div>

      <div
        class="client-tab-panel add-item-tab-panel"
        data-add-item-panel="depots"
        id="${ADD_ITEM_PANEL_IDS.depots}"
        role="tabpanel"
        aria-labelledby="clientTabDepots"
        hidden
      >
        ${renderDepotMagasinPanel()}
      </div>

      ${renderDepotMagasinModals()}
    </fieldset>
  `;
}
