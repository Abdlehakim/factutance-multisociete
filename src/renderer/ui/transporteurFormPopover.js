export const renderTransporteurFormPopover = ({ includeParticulier = false } = {}) => {
  const particulierOption = includeParticulier
    ? `
                  <button
                    type="button"
                    class="model-select-option"
                    data-client-type-option="particulier"
                    role="option"
                    aria-selected="false"
                  >
                    Particulier
                  </button>`
    : "";
  const particulierSelectOption = includeParticulier
    ? '\n                <option value="particulier">Particulier</option>'
    : "";
  return `
  <div
    id="transporteurFormPopover"
    class="swbDialog client-form-modal"
    hidden
    aria-hidden="true"
    data-client-form-mode="create"
    data-transporteur-form-mode="create"
  >
    <div
      class="swbDialog__panel client-form-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transporteurFormPopoverTitle"
    >
      <div class="swbDialog__header">
        <div id="transporteurFormPopoverTitle" class="swbDialog__title">Fiche transporteur</div>
        <button
          type="button"
          class="swbDialog__close"
          data-client-form-close
          aria-label="Fermer"
        >
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div class="client-form-modal__body swbDialog__msg">
        <div class="grid two">
          <label class="full client-type-field doc-type-field" data-transporteur-field="type">
            <span id="transporteurTypeLabel" data-transporteur-field-label="type">Type de transporteur</span>
            <div class="client-type-field__controls doc-type-field__controls">
              <details id="transporteurTypeMenu" class="field-toggle-menu client-type-menu doc-type-menu">
                <summary
                  class="btn success field-toggle-trigger"
                  role="button"
                  aria-haspopup="listbox"
                  aria-expanded="false"
                  aria-labelledby="transporteurTypeLabel transporteurTypeDisplay"
                >
                  <span id="transporteurTypeDisplay">Societe / personne morale</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                </summary>
                <div
                  id="transporteurTypePanel"
                  class="field-toggle-panel model-select-panel client-type-panel doc-type-panel"
                  role="listbox"
                  aria-labelledby="transporteurTypeLabel"
                >
                  <button
                    type="button"
                    class="model-select-option is-active"
                    data-client-type-option="societe"
                    role="option"
                    aria-selected="true"
                  >
                    Societe / personne morale
                  </button>
                  <button
                    type="button"
                    class="model-select-option"
                    data-client-type-option="personne_physique"
                    role="option"
                    aria-selected="false"
                  >
                    Personne physique
                  </button>
${particulierOption}
                </div>
              </details>
              <select id="transporteurType" class="client-type-select doc-type-select" aria-hidden="true" tabindex="-1">
                <option value="societe" selected>Societe / personne morale</option>
                <option value="personne_physique">Personne physique</option>
${particulierSelectOption}
              </select>
            </div>
          </label>

          <div class="grid two full" data-transporteur-field-group="identity" data-grid-columns="2">
            <label data-transporteur-field="name">
              <span data-transporteur-field-label="name">Nom du transporteur</span>
              <input id="transporteurName" placeholder="Transporteur ou Entreprise" />
            </label>
            <label data-transporteur-field="taxId">
              <span id="transporteurIdLabel" data-transporteur-field-label="taxId">Matricule fiscal</span>
              <input id="transporteurVat" placeholder="ex: 1284118/W/A/M/000" />
            </label>
          </div>
          <label data-transporteur-field="phone">
            <span data-transporteur-field-label="phone">Telephone du transporteur</span>
            <input id="transporteurPhone" placeholder="+216 ..." />
          </label>
          <label data-transporteur-field="email">
            <span data-transporteur-field-label="email">E-mail du transporteur</span>
            <input id="transporteurEmail" placeholder="transporteur@email.com" />
          </label>
          <label class="full" data-transporteur-field="address">
            <span data-transporteur-field-label="address">Adresse du transporteur</span>
            <input id="transporteurAddress" placeholder="Rue, Ville, Pays" />
          </label>
        </div>
      </div>
      <div class="client-form-modal__actions swbDialog__actions">
        <input id="transporteurBeneficiary" type="hidden" value="" />
        <input id="transporteurAccount" type="hidden" value="" />
        <input id="transporteurSoldClient" type="hidden" value="" />
        <input id="transporteurStegRef" type="hidden" value="" />
        <div class="swbDialog__group swbDialog__group--left">
          <button
            id="transporteurFormPopoverCancel"
            type="button"
            class="swbDialog__cancel"
            data-client-form-close
          >
            Annuler
          </button>
        </div>
        <div class="swbDialog__group swbDialog__group--right">
          <button id="btnSaveTransporteur" type="button" class="swbDialog__ok" disabled>Enregistrer</button>
          <button
            id="btnUpdateTransporteur"
            type="button"
            class="swbDialog__ok"
            disabled
            hidden
            aria-hidden="true"
          >
            Mettre a jour
          </button>
          <button id="btnNewTransporteur" type="button" class="swbDialog__ok" disabled>Nouveau</button>
        </div>
      </div>
    </div>
  </div>
`;
};

if (typeof window !== "undefined") {
  window.TransporteurFormPopover = { render: renderTransporteurFormPopover };
}
