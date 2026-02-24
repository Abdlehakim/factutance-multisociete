export const renderFournisseurFieldsSettingsModal = () => `
  <div id="fournisseurFieldsSettingsModal" class="swbDialog fournisseur-fields-modal" hidden aria-hidden="true">
    <div
      class="swbDialog__panel fournisseur-fields-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fournisseurFieldsSettingsModalTitle"
    >
      <div class="swbDialog__header">
        <div id="fournisseurFieldsSettingsModalTitle" class="swbDialog__title">Champs du fournisseur</div>
        <button
          type="button"
          class="swbDialog__close"
          data-fournisseur-fields-modal-close
          aria-label="Fermer"
        >
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div class="fournisseur-fields-modal__body swbDialog__msg">
        <div class="model-field-toggles">
          <div class="field-toggle-menu__title">Champs du fournisseur</div>
          <div class="field-toggle-panel">
            <label class="toggle-option">
              <input id="fournisseurFieldToggleType" data-fournisseur-field-key="type" type="checkbox" class="col-toggle" aria-label="Masquer champ Type de fournisseur" checked />
              <span class="model-save-dot">Type</span>
            </label>
            <label class="toggle-option">
              <input id="fournisseurFieldToggleName" data-fournisseur-field-key="name" type="checkbox" class="col-toggle" aria-label="Masquer champ Nom du fournisseur" checked />
              <span class="model-save-dot">Nom</span>
            </label>
            <label class="toggle-option">
              <input id="fournisseurFieldToggleTaxId" data-fournisseur-field-key="taxId" type="checkbox" class="col-toggle" aria-label="Masquer champ Matricule fiscal" checked />
              <span class="model-save-dot">Matricule fiscal</span>
            </label>
            <label class="toggle-option">
              <input id="fournisseurFieldTogglePhone" data-fournisseur-field-key="phone" type="checkbox" class="col-toggle" aria-label="Masquer champ Telephone du fournisseur" checked />
              <span class="model-save-dot">Telephone</span>
            </label>
            <label class="toggle-option">
              <input id="fournisseurFieldToggleEmail" data-fournisseur-field-key="email" type="checkbox" class="col-toggle" aria-label="Masquer champ E-mail du fournisseur" checked />
              <span class="model-save-dot">E-mail</span>
            </label>
            <label class="toggle-option">
              <input id="fournisseurFieldToggleAddress" data-fournisseur-field-key="address" type="checkbox" class="col-toggle" aria-label="Masquer champ Adresse du fournisseur" checked />
              <span class="model-save-dot">Adresse</span>
            </label>
          </div>
          <div class="field-toggle-menu__subtitle">Personnaliser les libelles</div>
          <div class="field-toggle-panel field-toggle-panel--labels">
            <div class="fournisseur-field-label-option">
              <div class="fournisseur-field-label-header">
                <span class="fournisseur-field-label-default" data-fournisseur-field-label="type">Type de fournisseur</span>
              </div>
              <div class="fournisseur-field-label-input-wrap">
                <input type="text" class="fournisseur-field-label-input" data-fournisseur-field-label-input="type" aria-label="Modifier libelle Type de fournisseur" />
                <button type="button" class="fournisseur-field-label-reset" data-fournisseur-field-label-reset="type" aria-label="Reinitialiser libelle Type de fournisseur">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round" />
                    <path d="M3 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="fournisseur-field-label-option">
              <div class="fournisseur-field-label-header">
                <span class="fournisseur-field-label-default" data-fournisseur-field-label="name">Nom du fournisseur</span>
              </div>
              <div class="fournisseur-field-label-input-wrap">
                <input type="text" class="fournisseur-field-label-input" data-fournisseur-field-label-input="name" aria-label="Modifier libelle Nom du fournisseur" />
                <button type="button" class="fournisseur-field-label-reset" data-fournisseur-field-label-reset="name" aria-label="Reinitialiser libelle Nom du fournisseur">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round" />
                    <path d="M3 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="fournisseur-field-label-option">
              <div class="fournisseur-field-label-header">
                <span class="fournisseur-field-label-default" data-fournisseur-field-label="taxId">Matricule fiscal</span>
              </div>
              <div class="fournisseur-field-label-input-wrap">
                <input type="text" class="fournisseur-field-label-input" data-fournisseur-field-label-input="taxId" aria-label="Modifier libelle Matricule fiscal" />
                <button type="button" class="fournisseur-field-label-reset" data-fournisseur-field-label-reset="taxId" aria-label="Reinitialiser libelle Matricule fiscal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round" />
                    <path d="M3 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="fournisseur-field-label-option">
              <div class="fournisseur-field-label-header">
                <span class="fournisseur-field-label-default" data-fournisseur-field-label="phone">Telephone du fournisseur</span>
              </div>
              <div class="fournisseur-field-label-input-wrap">
                <input type="text" class="fournisseur-field-label-input" data-fournisseur-field-label-input="phone" aria-label="Modifier libelle Telephone du fournisseur" />
                <button type="button" class="fournisseur-field-label-reset" data-fournisseur-field-label-reset="phone" aria-label="Reinitialiser libelle Telephone du fournisseur">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round" />
                    <path d="M3 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="fournisseur-field-label-option">
              <div class="fournisseur-field-label-header">
                <span class="fournisseur-field-label-default" data-fournisseur-field-label="email">E-mail du fournisseur</span>
              </div>
              <div class="fournisseur-field-label-input-wrap">
                <input type="text" class="fournisseur-field-label-input" data-fournisseur-field-label-input="email" aria-label="Modifier libelle E-mail du fournisseur" />
                <button type="button" class="fournisseur-field-label-reset" data-fournisseur-field-label-reset="email" aria-label="Reinitialiser libelle E-mail du fournisseur">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round" />
                    <path d="M3 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="fournisseur-field-label-option">
              <div class="fournisseur-field-label-header">
                <span class="fournisseur-field-label-default" data-fournisseur-field-label="address">Adresse du fournisseur</span>
              </div>
              <div class="fournisseur-field-label-input-wrap">
                <input type="text" class="fournisseur-field-label-input" data-fournisseur-field-label-input="address" aria-label="Modifier libelle Adresse du fournisseur" />
                <button type="button" class="fournisseur-field-label-reset" data-fournisseur-field-label-reset="address" aria-label="Reinitialiser libelle Adresse du fournisseur">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round" />
                    <path d="M3 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="fournisseur-fields-modal__actions swbDialog__actions">
        <div class="swbDialog__group swbDialog__group--left">
          <button type="button" class="swbDialog__cancel" data-fournisseur-fields-modal-close>Annuler</button>
        </div>
        <div class="swbDialog__group swbDialog__group--right">
          <button type="button" class="swbDialog__ok" data-fournisseur-fields-modal-save>Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
`;

if (typeof window !== "undefined") {
  window.FournisseurFieldsSettingsModal = { render: renderFournisseurFieldsSettingsModal };
}
