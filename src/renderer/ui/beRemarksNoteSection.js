export function renderBeRemarksNoteSection(options = {}) {
  const isModal = options.modal === true || options.scope === "modal";
  const suffix = isModal ? "Modal" : "";
  const fieldsetId = isModal ? "beRemarksNoteBoxModal" : "beRemarksNoteBox";

  return `
    <fieldset
      class="section-box wh-note-box footer-note-box be-remarks-note-box"
      id="${fieldsetId}"
      data-model-be-only-section="be-remarks"
      hidden
      aria-hidden="true"
    >
      <legend><span class="model-save-dot">Observation / Remarques</span></legend>
      <div class="full note-field footer-note-field">
        <div class="note-field-label" id="beRemarksLabel${suffix}">Texte affich&eacute; dans le bloc Observation / Remarques du Bon d'entr&eacute;e</div>
        <div class="note-toolbar" aria-label="Mise en forme de l'observation / remarques">
          <label class="note-size-control" for="beRemarksFontSize${suffix}">
            <span class="note-size-label">Taille</span>
            <select
              id="beRemarksFontSize${suffix}"
              class="note-tool note-size-select"
              title="Taille de la police de l'observation / remarques"
              aria-label="Taille de la police de l'observation / remarques"
            >
              <option value="7">7</option>
              <option value="8" selected>8</option>
              <option value="9">9</option>
            </select>
          </label>
          <button type="button" id="beRemarksBold${suffix}" class="note-tool" title="Texte en gras">
            <span aria-hidden="true">B</span><span class="sr-only">Gras</span>
          </button>
          <button type="button" id="beRemarksItalic${suffix}" class="note-tool" title="Texte en italique">
            <span aria-hidden="true"><em>I</em></span><span class="sr-only">Italique</span>
          </button>
          <button type="button" id="beRemarksList${suffix}" class="note-tool" title="Liste a puces">
            <span aria-hidden="true">&bull;</span><span class="sr-only">Liste a puces</span>
          </button>
        </div>
        <div
          id="beRemarksEditor${suffix}"
          class="note-editor note-editor--footer"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          aria-labelledby="beRemarksLabel${suffix}"
          data-placeholder="Texte libre pour les observations / remarques"
          data-empty="true"
          tabindex="0"
        ></div>
        <textarea id="beRemarks${suffix}" hidden></textarea>
      </div>
    </fieldset>
  `;
}
