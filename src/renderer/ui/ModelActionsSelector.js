export const ModelActionsSelector = `
  <div class="model-actions-wrapper">
    <h1 class="model-actions-title">
      S&eacute;lectionnez votre mod&egrave;le, cr&eacute;ez-en un nouveau ou choisissez un mod&egrave;le existant pour le mettre &agrave; jour ou le supprimer.
    </h1>

    <div class="model-actions-row">
      <label for="modelActionsSelect" class="label-text" id="modelActionsSelectLabel">Mod&egrave;le</label>

      <details
        id="modelActionsSelectMenu"
        class="field-toggle-menu model-select-menu"
        aria-label="S&eacute;lectionner un mod&egrave;le"
      >
        <summary
          class="btn success field-toggle-trigger"
          role="button"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-labelledby="modelActionsSelectLabel modelActionsSelectDisplay"
        >
          <span id="modelActionsSelectDisplay" class="model-select-display">S&eacute;lectionner un mod&egrave;le</span>
          <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
        </summary>

        <div
          id="modelActionsSelectPanel"
          class="field-toggle-panel model-select-panel"
          role="listbox"
          aria-labelledby="modelActionsSelectLabel"
        ></div>
      </details>

      <select id="modelActionsSelect" class="model-select" aria-hidden="true" tabindex="-1">
        <option value="">S&eacute;lectionner un mod&egrave;le</option>
      </select>
    </div>

    <div class="model-actions-buttons" role="group" aria-label="Actions du mod&egrave;le">
      <button id="modelCreateFlowBtn" type="button" class="btn success model-create-btn better-style">
        Cr&eacute;er un mod&egrave;le
      </button>
      <button id="btnModelUpdate" type="button" class="btn model-update-btn better-style" disabled>
        Mettre &agrave; jour
      </button>
      <button id="btnModelDelete" type="button" class="btn model-delete-btn better-style" disabled>
        Supprimer
      </button>
    </div>
  </div>
`;
