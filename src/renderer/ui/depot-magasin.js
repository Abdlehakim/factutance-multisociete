export const renderDepotMagasinFormPopover = () => `
  <div
    id="depotMagasinFormPopover"
    class="swbDialog client-form-modal depot-magasin-modal"
    hidden
    aria-hidden="true"
    data-depot-form-mode="create"
  >
    <div
      class="swbDialog__panel client-form-modal__panel depot-magasin-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="depotMagasinFormPopoverTitle"
    >
      <div class="swbDialog__header">
        <div id="depotMagasinFormPopoverTitle" class="swbDialog__title">Fiche depot/magasin</div>
        <button
          type="button"
          class="swbDialog__close"
          data-depot-form-close
          aria-label="Fermer"
        >
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div class="client-form-modal__body depot-magasin-modal__body swbDialog__msg">
        <div class="grid two">
          <div class="grid two full depot-magasin-modal__row" data-grid-columns="2">
            <div class="add-item-field">
              <label for="depotMagasinName" class="label-text">Nom du depot/magasin</label>
              <input id="depotMagasinName" placeholder="ex. Depot principal" autocomplete="off" />
            </div>
            <div class="add-item-field">
              <label for="depotMagasinAddress" class="label-text">Adresse (optionnel)</label>
              <input id="depotMagasinAddress" placeholder="Rue, ville, pays" autocomplete="off" />
            </div>
          </div>

          <section class="full depot-magasin-modal__emplacements" aria-labelledby="depotMagasinEmplacementsTitle">
            <div class="depot-magasin-modal__emplacements-head">
              <h4 id="depotMagasinEmplacementsTitle" class="depot-magasin-modal__emplacements-title">Emplacements</h4>
            </div>
            <p class="depot-magasin-modal__emplacements-hint">
              Ajoutez un ou plusieurs emplacements (ex. A-01-R2).
            </p>
            <div class="depot-magasin-modal__emplacement-input-row">
              <label class="depot-magasin-modal__emplacement-field" for="depotMagasinEmplacementInput">
                <span>Code / nom</span>
                <input
                  id="depotMagasinEmplacementInput"
                  class="depot-magasin-modal__emplacement-name"
                  type="text"
                  placeholder="ex. A-01-R2"
                  autocomplete="off"
                />
              </label>
              <button
                type="button"
                id="depotMagasinAddEmplacement"
                class="swbDialog__cancel depot-magasin-modal__emplacement-add"
              >
                Ajouter
              </button>
            </div>
            <div
              id="depotMagasinEmplacementsChips"
              class="depot-magasin-modal__emplacements-chips"
              aria-live="polite"
            ></div>
          </section>
        </div>
      </div>
      <div class="client-form-modal__actions swbDialog__actions">
        <div class="swbDialog__group swbDialog__group--left">
          <button
            id="depotMagasinFormPopoverCancel"
            type="button"
            class="swbDialog__cancel"
            data-depot-form-close
          >
            Annuler
          </button>
        </div>
        <div class="swbDialog__group swbDialog__group--right">
          <button id="btnSaveDepotMagasin" type="button" class="swbDialog__ok" disabled>
            Enregistrer
          </button>
          <button
            id="btnUpdateDepotMagasin"
            type="button"
            class="swbDialog__ok"
            disabled
            hidden
            aria-hidden="true"
          >
            Mettre a jour
          </button>
          <button id="btnNewDepotMagasin" type="button" class="swbDialog__ok" disabled>
            Nouveau
          </button>
        </div>
      </div>
    </div>
  </div>
`;

if (typeof window !== "undefined") {
  window.DepotMagasinFormPopover = { render: renderDepotMagasinFormPopover };
}
