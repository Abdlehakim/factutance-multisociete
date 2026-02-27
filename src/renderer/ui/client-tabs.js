import { renderClientFieldsSettingsModal } from "./clientFieldsSettingsModal.js";
import { renderFournisseurFieldsSettingsModal } from "./fournisseurFieldsSettingsModal.js";
import { renderFournisseurImportModal } from "./fournisseurImportModal.js";
import { renderDepotMagasinImportModal } from "./depotMagasinImportModal.js";
import { renderDepotMagasinExportModal } from "./depotMagasinExportModal.js";
import { renderClientFormPopover } from "./clientFormPopover.js";
import { renderFournisseurFormPopover } from "./fournisseurFormPopover.js";
import { renderDepotMagasinFormPopover } from "./depot-magasin.js";

const CLIENT_TABS_ROOT_SELECTOR = "[data-client-tabs]";
const CLIENT_TAB_SELECTOR = "[data-client-tab]";
const CLIENT_PANEL_SELECTOR = "[data-client-panel]";
const CLIENT_TAB_ACTIVE_CLASS = "is-active";

const CLIENT_TAB_PANEL_IDS = {
  clients: "clientBoxMainscreenClientsPanel",
  fournisseurs: "clientBoxMainscreenFournisseursPanel"
};
const DEPOT_PANEL_ID = "clientBoxMainscreenDepotsPanel";

const CLIENT_TAB_ENTITY_TYPE = {
  clients: "client",
  fournisseurs: "vendor"
};

const renderClientPanel = () => `
  <div class="grid two client-tabs__panel-grid">
    <div class="full client-search">
      <div class="client-search__controls">
        <label class="client-search__field">
          <input
            id="clientSearch"
            type="search"
            placeholder="Nom, identifiant fiscal ou CIN / passeport"
            autocomplete="off"
          />
          <button id="clientSearchBtn" type="button" class="client-search__action" aria-label="Rechercher">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="6" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
            </svg>
          </button>
        </label>
        <button
          id="clientSavedListBtn"
          type="button"
          class="client-search__saved"
          aria-label="Afficher les clients enregistres"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="5" cy="6" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="5" cy="18" r="1.5" />
            <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round" />
            <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round" />
            <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round" />
          </svg>
        </button>
        <button
          id="clientFieldsSettingsBtn"
          type="button"
          class="client-search__saved"
          aria-label="Configurer les champs du client"
          aria-haspopup="dialog"
          aria-controls="clientFieldsSettingsModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </button>
        <button
          id="clientImportBtn"
          type="button"
          class="client-search__saved client-search__saved--import"
          aria-label="Importer des clients"
          aria-haspopup="dialog"
          aria-controls="clientImportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v12" stroke-linecap="round" />
            <path d="M8 7l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          id="clientExportBtn"
          type="button"
          class="client-search__saved client-search__saved--export"
          aria-label="Exporter des clients"
          aria-haspopup="dialog"
          aria-controls="clientExportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21V9" stroke-linecap="round" />
            <path d="M8 17l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div id="clientSearchResults" class="client-search__results" hidden></div>
      ${renderClientFieldsSettingsModal()}
      ${renderClientFormPopover()}
    </div>

    <div class="full client-type-field doc-type-field">
      <button
        id="clientFormToggleBtn"
        type="button"
        class="doc-type-action-btn"
        aria-label="Nouveau client"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="clientFormPopover"
      >
        <span class="doc-type-action-icon" aria-hidden="true">
          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M376 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z"></path>
            <path fill="none" stroke-miterlimit="10" stroke-width="32" d="M288 304c-87 0-175.3 48-191.64 138.6-2 10.92 4.21 21.4 15.65 21.4H464c11.44 0 17.62-10.48 15.65-21.4C463.3 352 375 304 288 304z"></path>
            <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M88 176v112m56-56H32"></path>
          </svg>
        </span>
        <span class="doc-type-action-label">Nouveau client</span>
      </button>
    </div>
  </div>
`;

const renderFournisseurPanel = () => `
  <div class="grid two client-tabs__panel-grid">
    <div class="full client-search">
      <div class="client-search__controls">
        <label class="client-search__field">
          <input
            id="clientSearch"
            type="search"
            placeholder="Nom, identifiant fiscal ou CIN / passeport"
            autocomplete="off"
          />
          <button id="clientSearchBtn" type="button" class="client-search__action" aria-label="Rechercher">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="6" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
            </svg>
          </button>
        </label>
        <button
          id="FournisseurSavedListBtn"
          type="button"
          class="client-search__saved"
          aria-label="Afficher les fournisseurs enregistres"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="5" cy="6" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="5" cy="18" r="1.5" />
            <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round" />
            <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round" />
            <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round" />
          </svg>
        </button>
        <button
          id="fournisseurFieldsSettingsBtn"
          type="button"
          class="client-search__saved"
          aria-label="Configurer les champs du fournisseur"
          aria-haspopup="dialog"
          aria-controls="fournisseurFieldsSettingsModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </button>
        <button
          id="FournisseurImportBtn"
          type="button"
          class="client-search__saved client-search__saved--import"
          aria-label="Importer des fournisseurs"
          aria-haspopup="dialog"
          aria-controls="fournisseurImportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v12" stroke-linecap="round" />
            <path d="M8 7l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          id="FournisseurExportBtn"
          type="button"
          class="client-search__saved client-search__saved--export"
          data-client-export-entity="vendor"
          aria-label="Exporter des fournisseurs"
          aria-haspopup="dialog"
          aria-controls="fournisseurExportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21V9" stroke-linecap="round" />
            <path d="M8 17l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div id="clientSearchResults" class="client-search__results" hidden></div>
      ${renderFournisseurFieldsSettingsModal()}
      ${renderFournisseurFormPopover({ includeParticulier: false })}
    </div>

    <div class="full client-type-field doc-type-field">
      <button
        id="clientFormToggleBtn"
        type="button"
        class="doc-type-action-btn"
        aria-label="Nouveau fournisseur"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="fournisseurFormPopover"
      >
        <span class="doc-type-action-icon" aria-hidden="true">
          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M376 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z"></path>
            <path fill="none" stroke-miterlimit="10" stroke-width="32" d="M288 304c-87 0-175.3 48-191.64 138.6-2 10.92 4.21 21.4 15.65 21.4H464c11.44 0 17.62-10.48 15.65-21.4C463.3 352 375 304 288 304z"></path>
            <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M88 176v112m56-56H32"></path>
          </svg>
        </span>
        <span class="doc-type-action-label">Nouveau fournisseur</span>
      </button>
    </div>
  </div>
`;

const renderDepotMagasinPanelTemplate = () => `
  <div class="grid two client-tabs__panel-grid">
    <div class="full client-search">
      <div class="client-search__controls">
        <label class="client-search__field">
          <input
            id="depotMagasinSearch"
            type="search"
            placeholder="Nom du depot/magasin ou adresse"
            autocomplete="off"
          />
          <button
            id="depotMagasinSearchBtn"
            type="button"
            class="client-search__action"
            aria-label="Rechercher"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="6" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
            </svg>
          </button>
        </label>
        <button
          id="depotMagasinSavedListBtn"
          type="button"
          class="client-search__saved"
          aria-label="Afficher les depots/magasins"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="5" cy="6" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="5" cy="18" r="1.5" />
            <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round" />
            <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round" />
            <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round" />
          </svg>
        </button>
        <button
          id="depotMagasinSettingsBtn"
          type="button"
          class="client-search__saved"
          aria-label="Configurer les depots/magasins"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </button>
        <button
          id="depotMagasinImportBtn"
          type="button"
          class="client-search__saved client-search__saved--import"
          aria-label="Importer des depots/magasins"
          aria-haspopup="dialog"
          aria-controls="depotMagasinImportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v12" stroke-linecap="round" />
            <path d="M8 7l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          id="depotMagasinExportBtn"
          type="button"
          class="client-search__saved client-search__saved--export"
          aria-label="Exporter des depots/magasins"
          aria-haspopup="dialog"
          aria-controls="depotMagasinExportModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21V9" stroke-linecap="round" />
            <path d="M8 17l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div id="depotMagasinSearchResults" class="client-search__results" hidden></div>
      ${renderDepotMagasinFormPopover()}
    </div>

    <div class="full client-type-field doc-type-field">
      <button
        id="depotMagasinFormToggleBtn"
        type="button"
        class="doc-type-action-btn"
        aria-label="Nouveau depot"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="depotMagasinFormPopover"
      >
        <span class="doc-type-action-icon" aria-hidden="true">
          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" d="M0 0h24v24H0z"></path>
            <path d="m12 5.5 6 4.5v1c.7 0 1.37.1 2 .29V9l-8-6-8 6v12h7.68c-.3-.62-.5-1.29-.6-2H6v-9l6-4.5z"></path>
            <path d="M18 13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm3 5.5h-2.5V21h-1v-2.5H15v-1h2.5V15h1v2.5H21v1z"></path>
          </svg>
        </span>
        <span class="doc-type-action-label">Nouveau depot</span>
      </button>
    </div>
  </div>
`;

const setScopeEntity = (root, tabValue) => {
  const entityType = CLIENT_TAB_ENTITY_TYPE[tabValue] || "client";
  root.dataset.activeClientTab = tabValue;
  const parentScope = root.closest("#clientBoxMainscreen");
  if (parentScope) {
    parentScope.dataset.clientEntityType = entityType;
  }
};

const closeInactivePanelUi = (panel) => {
  if (!panel) return;
  const toggleBtn = panel.querySelector("#clientFormToggleBtn, #depotMagasinFormToggleBtn");
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-expanded", "false");
  }
  const popover = panel.querySelector(
    "#clientFormPopover, #fournisseurFormPopover, #depotMagasinFormPopover"
  );
  if (popover && !popover.hidden) {
    popover.classList.remove("is-open");
    popover.hidden = true;
    popover.setAttribute("hidden", "");
    popover.setAttribute("aria-hidden", "true");
  }
  panel.querySelectorAll(".client-search__results").forEach((results) => {
    if (!results.hidden) {
      results.hidden = true;
      results.setAttribute("hidden", "");
    }
  });
};

const applyTabState = (root, nextTab, { focus = false } = {}) => {
  const tabButtons = Array.from(root.querySelectorAll(CLIENT_TAB_SELECTOR));
  const tabPanels = Array.from(root.querySelectorAll(CLIENT_PANEL_SELECTOR));
  if (!tabButtons.length || !tabPanels.length) return;

  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.clientTab === nextTab;
    btn.classList.toggle(CLIENT_TAB_ACTIVE_CLASS, isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.tabIndex = isActive ? 0 : -1;
    if (focus && isActive) {
      try {
        btn.focus();
      } catch {}
    }
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.clientPanel === nextTab;
    panel.classList.toggle(CLIENT_TAB_ACTIVE_CLASS, isActive);
    panel.hidden = !isActive;
    if (isActive) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "");
      closeInactivePanelUi(panel);
    }
  });

  setScopeEntity(root, nextTab);
};

export function wireClientTabs(scope = document) {
  if (!scope) return;
  const roots = [];
  if (scope.matches?.(CLIENT_TABS_ROOT_SELECTOR)) {
    roots.push(scope);
  }
  roots.push(...(scope.querySelectorAll?.(CLIENT_TABS_ROOT_SELECTOR) || []));

  roots.forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.clientTabsWired === "true") return;

    const tabList = root.querySelector('[role="tablist"]');
    const tabButtons = Array.from(root.querySelectorAll(CLIENT_TAB_SELECTOR));
    if (!tabList || !tabButtons.length) return;

    const initialTab =
      tabButtons.find((btn) => btn.getAttribute("aria-selected") === "true")?.dataset.clientTab ||
      tabButtons[0]?.dataset.clientTab ||
      "clients";
    applyTabState(root, initialTab);

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        applyTabState(root, btn.dataset.clientTab, { focus: true });
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

      const nextTab = tabButtons[nextIndex]?.dataset.clientTab;
      if (!nextTab) return;
      applyTabState(root, nextTab, { focus: true });
    });

    root.dataset.clientTabsWired = "true";
  });
}

export function renderDepotTabButton({ tabIndex = "-1", isActive = false } = {}) {
  return `
        <button
          type="button"
          class="client-tab${isActive ? " is-active" : ""}"
          data-client-tab="depots"
          data-add-item-tab="depots"
          role="tab"
          aria-selected="${isActive ? "true" : "false"}"
          aria-controls="${DEPOT_PANEL_ID}"
          id="clientTabDepots"
          tabindex="${tabIndex}"
        >
          Depot/Magasin
        </button>
  `;
}

export function renderClientTabsList({ includeDepots = false } = {}) {
  const tabsLabel = includeDepots ? "Clients, fournisseurs et depots" : "Clients et fournisseurs";
  return `
      <div class="client-tabs__list" role="tablist" aria-label="${tabsLabel}">
        <button
          type="button"
          class="client-tab is-active"
          data-client-tab="clients"
          role="tab"
          aria-selected="true"
          aria-controls="${CLIENT_TAB_PANEL_IDS.clients}"
          id="clientTabClients"
          tabindex="0"
        >
          Clients
        </button>
        <button
          type="button"
          class="client-tab"
          data-client-tab="fournisseurs"
          role="tab"
          aria-selected="false"
          aria-controls="${CLIENT_TAB_PANEL_IDS.fournisseurs}"
          id="clientTabFournisseurs"
          tabindex="-1"
        >
          Fournisseurs
        </button>
        ${includeDepots ? renderDepotTabButton() : ""}
      </div>
  `;
}

export function renderDepotMagasinPanel() {
  return renderDepotMagasinPanelTemplate();
}

export function renderDepotMagasinModals() {
  return `
      ${renderDepotMagasinImportModal()}
      ${renderDepotMagasinExportModal()}
  `;
}

export function renderClientTabs({ includeList = true } = {}) {
  return `
    <div class="client-tabs">
      ${includeList ? renderClientTabsList() : ""}

      <div
        class="client-tab-panel is-active"
        data-client-panel="clients"
        data-client-entity-type="client"
        id="${CLIENT_TAB_PANEL_IDS.clients}"
        role="tabpanel"
        aria-labelledby="clientTabClients"
      >
        ${renderClientPanel()}
      </div>

      <div
        class="client-tab-panel"
        data-client-panel="fournisseurs"
        data-client-entity-type="vendor"
        id="${CLIENT_TAB_PANEL_IDS.fournisseurs}"
        role="tabpanel"
        aria-labelledby="clientTabFournisseurs"
        hidden
      >
        ${renderFournisseurPanel()}
      </div>

      ${renderFournisseurImportModal()}
    </div>
  `;
}
