export const renderClientFormPopover = () => `
  <div id="clientFormPopover" class="swbDialog client-form-modal" hidden aria-hidden="true">
    <div
      class="swbDialog__panel client-form-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clientFormPopoverTitle"
    >
      <div class="swbDialog__header">
        <div id="clientFormPopoverTitle" class="swbDialog__title">Fiche client</div>
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
          <label class="full client-type-field doc-type-field">
            <span id="clientTypeLabel">Type de client</span>
            <div class="client-type-field__controls doc-type-field__controls">
              <details id="clientTypeMenu" class="field-toggle-menu client-type-menu doc-type-menu">
                <summary
                  class="btn success field-toggle-trigger"
                  role="button"
                  aria-haspopup="listbox"
                  aria-expanded="false"
                  aria-labelledby="clientTypeLabel clientTypeDisplay"
                >
                  <span id="clientTypeDisplay">Societe / personne morale</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                </summary>
                <div
                  id="clientTypePanel"
                  class="field-toggle-panel model-select-panel client-type-panel doc-type-panel"
                  role="listbox"
                  aria-labelledby="clientTypeLabel"
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
                  <button
                    type="button"
                    class="model-select-option"
                    data-client-type-option="particulier"
                    role="option"
                    aria-selected="false"
                  >
                    Particulier
                  </button>
                </div>
              </details>
              <select id="clientType" class="client-type-select doc-type-select" aria-hidden="true" tabindex="-1">
                <option value="societe" selected>Societe / personne morale</option>
                <option value="personne_physique">Personne physique</option>
                <option value="particulier">Particulier</option>
              </select>
            </div>
          </label>

          <div class="grid three full client-fields-row" data-grid-columns="4">
            <label data-client-field="benefit"><span data-client-field-label="benefit">Au profit de</span> <input id="clientBeneficiary" placeholder="Beneficiaire" /></label>
            <label data-client-field="account"><span data-client-field-label="account">Pour le compte de</span> <input id="clientAccount" placeholder="Pour le compte de" /></label>
            <label data-client-field="name"><span data-client-field-label="name">Nom du client</span> <input id="clientName" placeholder="Client ou Entreprise" /></label>
            <label data-client-field="taxId"><span id="clientIdLabel" data-client-field-label="taxId">Matricule fiscal</span> <input id="clientVat" placeholder="ex: 1284118/W/A/M/000" /></label>
          </div>
          <div class="grid three full" data-grid-columns="4">
            <label data-client-field="stegRef"><span data-client-field-label="stegRef">Ref STEG</span> <input id="clientStegRef" placeholder="Ref STEG" /></label>
            <label data-client-field="soldClient"><span data-client-field-label="soldClient">Solde client initial</span> <input id="clientSoldClient" type="number" inputmode="decimal" step="0.01" min="-999999999" placeholder="-4000" value="0" /></label>
            <label data-client-field="phone"><span data-client-field-label="phone">Telephone du client</span> <input id="clientPhone" placeholder="+216 ..." /></label>
            <label data-client-field="email"><span data-client-field-label="email">E-mail du client</span> <input id="clientEmail" placeholder="client@email.com" /></label>
          </div>
          <label class="full" data-client-field="address"><span data-client-field-label="address">Adresse du client</span> <input id="clientAddress" placeholder="Rue, Ville, Pays" /></label>
        </div>
      </div>
      <div class="client-form-modal__actions swbDialog__actions">
        <div class="swbDialog__group swbDialog__group--left">
          <button
            id="clientFormPopoverCancel"
            type="button"
            class="swbDialog__cancel"
            data-client-form-close
          >
            Annuler
          </button>
        </div>
        <div class="swbDialog__group swbDialog__group--right">
          <button id="btnSaveClient" type="button" class="swbDialog__ok" disabled>Enregistrer</button>
          <button
            id="btnUpdateClient"
            type="button"
            class="swbDialog__ok"
            disabled
            hidden
            aria-hidden="true"
          >
            Mettre a jour
          </button>
          <button id="btnNewClient" type="button" class="swbDialog__ok" disabled>Nouveau</button>
        </div>
      </div>
    </div>
  </div>
`;

if (typeof window !== "undefined") {
  window.ClientFormPopover = { render: renderClientFormPopover };
}

