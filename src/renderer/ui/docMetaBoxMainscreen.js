export function renderDocMetaBoxMainscreen() {
  return `
      <fieldset class="section-box" id="docMetaBoxMainscreen">
        <legend id="docTypeLegend">Document</legend>

        <div class="doc-meta-grid">
          <div class="doc-meta-grid__item">
            <div class="doc-history-row">
              <button
                id="docHistoryImportBtn"
                type="button"
                class="client-search__saved client-search__saved--import"
                aria-label="Importer une facture d'achat"
                aria-haspopup="dialog"
                aria-controls="docHistoryPurchaseImportModal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 3v12" stroke-linecap="round" />
                  <path d="M8 7l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button
                id="docHistoryExportBtn"
                type="button"
                class="client-search__saved client-search__saved--export"
                aria-label="Exporter des documents"
                aria-haspopup="dialog"
                aria-controls="docHistoryExportModal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 21V9" stroke-linecap="round" />
                  <path d="M8 17l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div class="doc-type-action-row" role="group" aria-label="Actions du type de document">
            <button
              id="docTypeActionNew"
              type="button"
              class="doc-type-action-btn"
              data-doc-type-action="new"
              aria-disabled="false"
            >
              <span class="doc-type-action-icon" aria-hidden="true">
                <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"></path>
                </svg>
              </span>
              <span class="doc-type-action-label">Nouveau document</span>
            </button>
            <button
              id="docTypeActionOpen"
              type="button"
              class="doc-type-action-btn"
              data-doc-type-action="open"
            >
              <span class="doc-type-action-icon" aria-hidden="true">
                <svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"></path>
                </svg>
              </span>
              <span class="doc-type-action-label">Ouvrir document</span>
            </button>
            <button
              id="docTypeActionExport"
              type="button"
              class="doc-type-action-btn"
              data-doc-type-action="export"
            >
              <span class="doc-type-action-icon" aria-hidden="true">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                  <path d="M11.5 21h-4.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v5m-5 6h7m-3 -3l3 3l-3 3"></path>
                </svg>
              </span>
              <span class="doc-type-action-label">Exporter document</span>
            </button>
            <button
              id="docTypeActionDelete"
              type="button"
              class="doc-type-action-btn"
              data-doc-type-action="delete"
              aria-haspopup="dialog"
              aria-controls="docBulkDeleteModal"
            >
              <span class="doc-type-action-icon" aria-hidden="true">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                  <path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z"></path>
                </svg>
              </span>
              <span class="doc-type-action-label">Supprimer documents</span>
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset class="section-box" id="docModeleBoxMainscreen">
        <legend>Mod&egrave;le</legend>
        <div class="doc-meta-grid">
          <div class="doc-meta-grid__item">
            <div class="doc-history-row">
              <button
                id="docModeleImportBtn"
                type="button"
                class="client-search__saved client-search__saved--import"
                aria-label="Importer des modeles"
                aria-haspopup="dialog"
                aria-controls="modelImportModal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 3v12" stroke-linecap="round" />
                  <path d="M8 7l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button
                id="docModeleExportBtn"
                type="button"
                class="client-search__saved client-search__saved--export"
                aria-label="Exporter des modeles"
                aria-haspopup="dialog"
                aria-controls="modelExportModal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 21V9" stroke-linecap="round" />
                  <path d="M8 17l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div class="doc-type-action-row" role="group" aria-label="Actions du modèle">
            <button
              id="modelActionNew"
              type="button"
              class="doc-type-action-btn"
              aria-controls="modelActionsModal"
            >
              <span class="doc-type-action-icon" aria-hidden="true">
                <svg
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4 4m0 1a1 1 0 0 1 1 -1h14a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-14a1 1 0 0 1 -1 -1z"></path>
                  <path d="M4 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"></path>
                  <path d="M14 12l6 0"></path>
                  <path d="M14 16l6 0"></path>
                  <path d="M14 20l6 0"></path>
                </svg>
              </span>
              <span class="doc-type-action-label">Nouveau mod&egrave;le</span>
            </button>
            <button
              id="modelActionsToggle"
              type="button"
              class="doc-type-action-btn"
              aria-expanded="false"
              aria-controls="modelActionsRow"
              title="Afficher/Masquer les actions du mod&egrave;le"
            >
              <span class="doc-type-action-icon" aria-hidden="true">
                <svg
                  stroke="currentColor"
                  fill="none"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.72 1.72 0 0 0 2.573 1.066c1.52-.878 3.31.912 2.432 2.431a1.72 1.72 0 0 0 1.065 2.574c1.756.426 1.756 2.924 0 3.35a1.72 1.72 0 0 0-1.066 2.573c.878 1.52-.912 3.31-2.431 2.432a1.72 1.72 0 0 0-2.574 1.065c-.426 1.756-2.924 1.756-3.35 0a1.72 1.72 0 0 0-2.573-1.066c-1.52.878-3.31-.912-2.432-2.431a1.72 1.72 0 0 0-1.065-2.574c-1.756-.426-1.756-2.924 0-3.35a1.72 1.72 0 0 0 1.066-2.573c-.878-1.52.912-3.31 2.431-2.432.997.576 2.296.109 2.574-1.065Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <span class="doc-type-action-label">Option Mod&egrave;le</span>
            </button>
          </div>
        </div>
      </fieldset>

  `;
}


