export const renderDepotMagasinExportModal = () => `
  <div id="depotMagasinExportModal" class="swbDialog client-export-modal depot-magasin-export-modal" hidden aria-hidden="true">
    <div
      class="swbDialog__panel client-export-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="depotMagasinExportModalTitle"
    >
      <div class="swbDialog__header">
        <div id="depotMagasinExportModalTitle" class="swbDialog__title">Exporter des depots/magasins</div>
        <button type="button" class="swbDialog__close" id="depotMagasinExportModalClose" aria-label="Fermer">
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div class="client-export-modal__body swbDialog__msg">
        <div class="client-export-modal__preview-title">Exemple d'apercu des depots/magasins qui seront exportes.</div>
        <div class="client-export-modal__preview">
          <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
            <table>
              <thead>
                <tr>
                  <th data-depot-magasin-export-field="name">Nom</th>
                  <th data-depot-magasin-export-field="address">Adresse</th>
                  <th data-depot-magasin-export-field="emplacements">Emplacements</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-depot-magasin-export-field="name">Depot principal</td>
                  <td data-depot-magasin-export-field="address">12 Rue de l'Industrie, Tunis</td>
                  <td data-depot-magasin-export-field="emplacements">A-01-R2; B-02; ZONE-3</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div id="depotMagasinExportSummary" class="client-export-modal__summary"></div>
        <label class="client-export-modal__checkbox">
          <input id="depotMagasinExportOpenLocation" type="checkbox" />
          <span>Ouvrir l'emplacement apres export</span>
        </label>
        <div class="doc-dialog-model-picker client-export-modal__format">
          <label class="doc-dialog-model-picker__label" id="depotMagasinExportFormatLabel" for="depotMagasinExportFormat">
            Format
          </label>
          <div class="doc-dialog-model-picker__field">
            <details
              id="depotMagasinExportFormatMenu"
              class="field-toggle-menu model-select-menu doc-dialog-model-menu client-export-format-menu"
            >
              <summary
                class="btn success field-toggle-trigger"
                role="button"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-labelledby="depotMagasinExportFormatLabel depotMagasinExportFormatDisplay"
              >
                <span id="depotMagasinExportFormatDisplay" class="model-select-display">XLSX</span>
                <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
              </summary>
              <div
                id="depotMagasinExportFormatPanel"
                class="field-toggle-panel model-select-panel client-export-format-panel"
                role="listbox"
                aria-labelledby="depotMagasinExportFormatLabel"
              >
                <button type="button" class="model-select-option is-active" data-export-format-option="xlsx" role="option" aria-selected="true">
                  XLSX
                </button>
                <button type="button" class="model-select-option" data-export-format-option="csv" role="option" aria-selected="false">
                  CSV
                </button>
              </div>
            </details>
            <select id="depotMagasinExportFormat" class="model-select doc-dialog-model-select client-export-format-select" aria-hidden="true" tabindex="-1">
              <option value="xlsx" selected>XLSX</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>
      <div class="swbDialog__actions client-export-modal__actions">
        <div class="swbDialog__group swbDialog__group--left">
          <button id="depotMagasinExportModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
        </div>
        <div class="swbDialog__group swbDialog__group--right">
          <button id="depotMagasinExportModalSave" type="button" class="swbDialog__ok">Exporter</button>
        </div>
      </div>
    </div>
  </div>
`;

if (typeof window !== "undefined") {
  window.DepotMagasinExportModal = { render: renderDepotMagasinExportModal };
}
