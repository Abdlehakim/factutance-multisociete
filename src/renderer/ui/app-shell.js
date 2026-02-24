
// app-shell.js

import { renderHeader } from "./Header.js";
import { renderFooter } from "./Footer.js";
import { renderModelSection } from "./ModelSection.js";
import { renderGeneralDataSection } from "./GeneralDataSection.js";
import { renderItemsSectionPreview } from "./itemsSectionPreview.js";
import { renderDocOptions } from "./DocOptions.js";
import { renderNotesView } from "./NotesView.js";
import { wireClientTabs } from "./client-tabs.js";
import { html } from "./utils.js";

function setupStickyActionsShadow() {
  const stickyActions = document.querySelector(".actions--sticky");
  if (!stickyActions) return;

  const toggleShadow = () => {
    stickyActions.classList.toggle("actions--scrolled", window.scrollY > 0);
  };

  toggleShadow();
  window.addEventListener("scroll", toggleShadow, { passive: true });
}

(function mount() {
  const app = document.getElementById("app");
  if (!app) return;

  // Header
  app.appendChild(renderHeader());

  // Main paper
  const main = document.createElement("main");
  main.id = "invoice-content";
  main.className = "paper";
  app.appendChild(main);

  // Sections in order
  main.appendChild(renderModelSection());
  main.appendChild(renderGeneralDataSection());
  wireClientTabs(main);

  main.appendChild(renderNotesView());

  const docOptionsHost = document.createElement("div");
  docOptionsHost.id = "docOptionsHost";
  docOptionsHost.hidden = true;
  docOptionsHost.style.display = "none";

  docOptionsHost.appendChild(renderDocOptions());
  app.appendChild(docOptionsHost);

  // Lift the saved-articles modal out of the hidden host so the mainscreen trigger can open it
  const articleSavedModal = docOptionsHost.querySelector("#articleSavedModal");
  if (articleSavedModal) {
    app.appendChild(articleSavedModal);
  }
  const articleFormPopover = articleSavedModal?.querySelector("#articleFormPopover");
  if (articleFormPopover) {
    app.appendChild(articleFormPopover);
  }

  const itemsSectionHost = document.createElement("div");
  itemsSectionHost.id = "itemsSectionHost";
  itemsSectionHost.hidden = true;
  itemsSectionHost.style.display = "none";
  itemsSectionHost.appendChild(renderItemsSectionPreview());
  app.appendChild(itemsSectionHost);

  const itemsModal = html(`
    <div
      id="itemsDocOptionsModal"
      class="swbDialog items-options-modal"
      hidden
      aria-hidden="true"
      tabindex="-1"
    >
      <div
        class="swbDialog__panel items-options-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="itemsDocOptionsModalTitle"
      >
        <div class="swbDialog__header">
          <div id="itemsDocOptionsModalTitle" class="swbDialog__title">D&eacute;tails du document</div>
          <button
            id="itemsDocOptionsModalClose"
            type="button"
            class="swbDialog__close"
            aria-label="Fermer"
          >
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="items-options-modal__body swbDialog__msg">
          <div id="itemsDocOptionsModalContent" class="items-options-modal__content"></div>
        </div>
        <div class="client-saved-modal__actions items-options-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left">
            <button
              id="itemsDocOptionsModalCloseFooter"
              type="button"
              class="btn btn-close client-search__close"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  `);
  app.appendChild(itemsModal);

  // Footer
  app.appendChild(renderFooter());

  setupStickyActionsShadow();
})();
