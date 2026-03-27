export function renderBsRemarksNoteSection(options = {}) {
  const isModal = options.modal === true || options.scope === "modal";
  const suffix = isModal ? "Modal" : "";
  const fieldsetId = isModal ? "bsRemarksNoteBoxModal" : "bsRemarksNoteBox";
  const groupName = isModal ? "bsRemarks" : "bsRemarksMain";

  return `
    <fieldset
      class="section-box wh-note-box wh-pdf-note-box bs-remarks-note-box"
      id="${fieldsetId}"
      data-model-bs-only-section="bs-remarks"
      hidden
      aria-hidden="true"
    >
      <legend><span class="model-save-dot">Observation / Remarques</span></legend>
      <div class="full note-field" data-wh-note-group="${groupName}">
        <div class="note-field-label" id="bsRemarksLabel${suffix}">Texte affich&eacute; dans le bloc Observation / Remarques du Bon de sortie</div>
        <div class="note-toolbar" aria-label="Mise en forme de l'observation / remarques">
          <label class="note-size-control" for="bsRemarksFontSize${suffix}">
            <span class="note-size-label">Taille</span>
            <select
              id="bsRemarksFontSize${suffix}"
              class="note-tool note-size-select"
              title="Taille de la police de l'observation / remarques"
              aria-label="Taille de la police de l'observation / remarques"
            >
              <option value="10">10</option>
              <option value="12" selected>12</option>
              <option value="14">14</option>
            </select>
          </label>
          <button type="button" id="bsRemarksBold${suffix}" class="note-tool" title="Texte en gras">
            <span aria-hidden="true">B</span><span class="sr-only">Gras</span>
          </button>
          <button type="button" id="bsRemarksItalic${suffix}" class="note-tool" title="Texte en italique">
            <span aria-hidden="true"><em>I</em></span><span class="sr-only">Italique</span>
          </button>
          <button type="button" id="bsRemarksList${suffix}" class="note-tool" title="Liste a puces">
            <span aria-hidden="true">&bull;</span><span class="sr-only">Liste a puces</span>
          </button>
        </div>
        <div
          id="bsRemarksEditor${suffix}"
          class="note-editor"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          aria-labelledby="bsRemarksLabel${suffix}"
          data-placeholder="Texte libre pour les observations / remarques"
          data-empty="true"
          tabindex="0"
        ></div>
        <textarea id="bsRemarks${suffix}" hidden></textarea>
      </div>
    </fieldset>
  `;
}
