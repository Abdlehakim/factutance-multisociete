// src/ui/ItemsView.js
import { html } from "./utils.js";
import { renderArticleFormPopover } from "./templates/article-form-popover.template.js";

export function renderAddItemSection() {
  return html(`

    <div id="articleSavedModal" class="swbDialog article-saved-modal payments-history-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel article-saved-modal__panel payments-history-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="articleSavedModalTitle"
      >
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="articleSavedModalTitle" class="swbDialog__title">Articles enregistrés</div>
            <button
              id="articleSavedModalRefresh"
              type="button"
              class="btn ghost doc-history-modal__refresh"
              aria-label="Rafraichir les articles enregistrés"
            >
              <svg
                class="doc-history-modal__refresh-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4.5 10.5a7 7 0 0 1 12-3.5l1 1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19.5 13.5a7 7 0 0 1-12 3.5l-1-1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18 5v4h-4" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M6 19v-4h4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <button id="articleSavedModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="article-saved-modal__body swbDialog__msg payments-history-modal__body">
          <div class="article-saved-modal__search article-search client-search">
            <div class="client-search__controls">
              <label class="client-search__field">
                <input
                  id="articleSavedSearch"
                  type="search"
                  placeholder="Rechercher un article enregistre"
                  autocomplete="off"
                />
                <button
                  id="articleSavedSearchBtn"
                  type="button"
                  class="client-search__action"
                  aria-label="Rechercher un article enregistre"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
                  </svg>
                </button>
              </label>
            </div>
            ${renderArticleFormPopover()}
          </div>
          <div id="articleSavedModalList" class="article-saved-modal__list" role="list"></div>
          <p id="articleSavedModalStatus" class="article-saved-modal__status" aria-live="polite"></p>
        </div>
        <div class="client-saved-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left">
            <button id="clientSavedModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager">
            <button id="clientSavedModalPrev" type="button" class="client-search__edit" disabled="">Précédent</button>
            <span id="clientSavedModalPage" class="client-saved-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
              Page
              <input id="clientSavedModalPageInput" type="number" inputmode="numeric" min="1" step="1" size="3" aria-label="Aller a la page" class="client-saved-modal__page-input" max="1" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1">
              /
              <span id="clientSavedModalTotalPages">1</span>
            </span>
            <button id="clientSavedModalNext" type="button" class="client-search__add" disabled="">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  `);
}


