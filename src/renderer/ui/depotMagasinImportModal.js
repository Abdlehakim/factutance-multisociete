export const renderDepotMagasinImportModal = () => `
  <div id="depotMagasinImportModal" class="swbDialog client-import-modal depot-magasin-import-modal" hidden aria-hidden="true">
    <div
      class="swbDialog__panel client-import-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="depotMagasinImportModalTitle"
      aria-describedby="depotMagasinImportHint"
    >
      <div class="swbDialog__header">
        <div id="depotMagasinImportModalTitle" class="swbDialog__title">Importer des depots/magasins</div>
        <button id="depotMagasinImportModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div class="client-import-modal__body swbDialog__msg">
        <p id="depotMagasinImportHint" class="client-import-modal__hint">
          Selectionnez un fichier Excel (XLSX) ou CSV contenant plusieurs depots/magasins.
          Colonnes acceptees : Nom (ou Nom depot/magasin), Adresse, Emplacements.
        </p>
        <div class="client-import-modal__example" aria-hidden="true">
          <div class="client-import-modal__example-title">Exemple</div>
          <div class="client-import-modal__example-row">
            <div class="client-import-modal__example-actions">
              <span
                class="client-search__detail-copy"
                role="button"
                tabindex="0"
                aria-label="Copier l'entete depot/magasin"
                title="Copier l'entete depot/magasin"
                data-doc-history-copy="document"
                data-depot-magasin-import-copy
                data-doc-history-copy-value="Nom&#9;Adresse&#9;Emplacements"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"></path>
                </svg>
              </span>
            </div>
            <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
              <table>
                <thead>
                  <tr>
                    <th data-depot-magasin-import-field="name">Nom</th>
                    <th data-depot-magasin-import-field="address">Adresse</th>
                    <th data-depot-magasin-import-field="emplacements">Emplacements</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-depot-magasin-import-field="name">Depot principal</td>
                    <td data-depot-magasin-import-field="address">12 Rue de l'Industrie, Tunis</td>
                    <td data-depot-magasin-import-field="emplacements">A-01-R2; B-02; ZONE-3</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <p class="client-import-modal__note">
          Emplacements : separez les codes par <strong>;</strong> ou <strong>,</strong>.
        </p>
        <label class="client-import-modal__file">
          <span class="client-import-modal__label">Fichier</span>
          <input id="depotMagasinImportFile" type="file" accept=".xlsx,.xls,.csv" />
        </label>
        <div id="depotMagasinImportSummary" class="client-import-modal__summary" aria-live="polite"></div>
        <ul id="depotMagasinImportErrors" class="client-import-modal__errors" aria-live="polite"></ul>
      </div>
      <div class="swbDialog__actions client-import-modal__actions">
        <div class="swbDialog__group swbDialog__group--left">
          <button id="depotMagasinImportModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
        </div>
        <div class="swbDialog__group swbDialog__group--right">
          <button id="depotMagasinImportModalSave" type="button" class="swbDialog__ok" disabled>Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
`;

if (typeof window !== "undefined") {
  window.DepotMagasinImportModal = { render: renderDepotMagasinImportModal };
}
