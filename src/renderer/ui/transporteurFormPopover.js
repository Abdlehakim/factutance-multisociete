export const renderTransporteurFormPopover = ({ includeParticulier = false } = {}) => {
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
          <div class="grid three full" data-transporteur-field-group="identity" data-grid-columns="3">
            <label data-transporteur-field="codeTransporteur">
              <span data-transporteur-field-label="codeTransporteur">Code transporteur</span>
              <input
                id="transporteurCode"
                placeholder="TR0032A"
                readonly
                aria-readonly="true"
                data-system-generated-code="true"
                autocomplete="off"
              />
            </label>
            <label data-transporteur-field="name">
              <span data-transporteur-field-label="name">Transporteur / Nom</span>
              <input id="transporteurName" placeholder="Transporteur ou Entreprise" />
            </label>
            <label data-transporteur-field="driverName">
              <span data-transporteur-field-label="driverName">Nom du chauffeur</span>
              <input id="transporteurDriverName" placeholder="Nom du chauffeur" />
            </label>
          </div>
          <div class="grid two full" data-transporteur-field-group="transport" data-grid-columns="2">
            <label data-transporteur-field="vehiclePlate">
              <span data-transporteur-field-label="vehiclePlate">Matricule vehicule</span>
              <input id="transporteurVehiclePlate" placeholder="ex: 197 TUN 2456" />
            </label>
            <label data-transporteur-field="transportMode">
              <span data-transporteur-field-label="transportMode">Mode de transport</span>
              <input id="transporteurTransportMode" placeholder="Camion, Fourgon, etc." />
            </label>
          </div>
          <label data-transporteur-field="phone">
            <span data-transporteur-field-label="phone">Telephone</span>
            <input id="transporteurPhone" placeholder="+216 ..." />
          </label>
          <label data-transporteur-field="email">
            <span data-transporteur-field-label="email">E-mail</span>
            <input id="transporteurEmail" placeholder="transporteur@email.com" />
          </label>
          <label class="full" data-transporteur-field="address">
            <span data-transporteur-field-label="address">Adresse</span>
            <input id="transporteurAddress" placeholder="Rue, Ville, Pays" />
          </label>
        </div>
      </div>
      <div class="client-form-modal__actions swbDialog__actions">
        <input id="transporteurType" type="hidden" value="societe" />
        <input id="transporteurVat" type="hidden" value="" />
        <input id="transporteurSoldClient" type="hidden" value="" />
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
