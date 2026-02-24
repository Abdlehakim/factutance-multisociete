(function (w) {
  const renderClientBoxNewDoc = () => {
    const template = `
      <fieldset class="section-box" id="clientBoxNewDoc">
        <legend>Client</legend>
        <div class="grid two">
          <div class="full client-search">
            <div class="client-search__controls">
              <label class="client-search__field">
                <input
                  id="clientSearch"
                  type="search"
                  placeholder="Nom, identifiant fiscal ou CIN / passeport"
                  autocomplete="off"
                />
                <button id="clientSearchBtn" type="button" class="client-search__action" aria-label="Rechercher">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
                  </svg>
                </button>
              </label>
              <button
                id="clientSavedListBtn"
                type="button"
                class="client-search__saved"
                aria-label="Afficher les clients enregistrés"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="5" cy="6" r="1.5" />
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="5" cy="18" r="1.5" />
                  <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round" />
                  <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round" />
                  <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round" />
                </svg>
              </button>
              <button
                id="clientFieldsSettingsBtn"
                type="button"
                class="client-search__saved"
                aria-label="Configurer les champs du client"
                aria-haspopup="dialog"
                aria-controls="clientFieldsSettingsModal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                </svg>
              </button>
              <button
                id="clientFormToggleBtn"
                type="button"
                class="client-search__saved client-search__saved--form"
                aria-label="Afficher la fiche client"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="clientFormPopover"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c1.5-4 6.5-6 8-6s6.5 2 8 6" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <div id="clientSearchResults" class="client-search__results" hidden></div>
            ${w.ClientFieldsSettingsModal?.render?.() || ""}
            ${w.ClientFormPopover?.render?.() || ""}
          </div>
        </div>
      </fieldset>
    `;
    const tpl = document.createElement("template");
    tpl.innerHTML = template.trim();
    return tpl.content.firstElementChild;
  };

  w.ClientBoxNewDoc = { render: renderClientBoxNewDoc };
})(window);
