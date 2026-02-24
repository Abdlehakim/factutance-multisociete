export function renderWhPdfNoteSection(options = {}) {
  const isModal = options.modal === true || options.scope === "modal";
  const suffix = isModal ? "Modal" : "";
  const group = isModal ? "modal" : "main";
  const boxId = isModal ? "whNoteBoxModal" : "whNoteBox";
  const labelId = `whNoteLabel${suffix}`;

  return `
    <fieldset class="section-box wh-note-box wh-pdf-note-box" id="${boxId}">
      <legend><span class="model-save-dot">Note (PDF)</span></legend>
      <div class="full note-field" data-wh-note-group="${group}">
        <div class="note-field-label" id="${labelId}">Message affiche sous le recapitulatif</div>
        <div class="note-toolbar" aria-label="Mise en forme de la note">
          <label class="note-size-control" for="whNoteFontSize${suffix}">
            <span class="note-size-label">Taille</span>
            <select
              id="whNoteFontSize${suffix}"
              class="note-tool note-size-select"
              title="Taille de la police de la note"
              aria-label="Taille de la police"
            >
              <option value="10">10</option>
              <option value="12" selected>12</option>
              <option value="14">14</option>
            </select>
          </label>
          <button type="button" id="whNoteBold${suffix}" class="note-tool" title="Texte en gras">
            <span aria-hidden="true">B</span><span class="sr-only">Gras</span>
          </button>
          <button type="button" id="whNoteItalic${suffix}" class="note-tool" title="Texte en italique">
            <span aria-hidden="true"><em>I</em></span><span class="sr-only">Italique</span>
          </button>
          <button type="button" id="whNoteList${suffix}" class="note-tool" title="Liste a puces">
            <span aria-hidden="true">&bull;</span><span class="sr-only">Liste a puces</span>
          </button>
        </div>
        <div
          id="whNoteEditor${suffix}"
          class="note-editor"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          aria-labelledby="${labelId}"
          data-placeholder="Texte libre pour le PDF"
          data-empty="true"
          tabindex="0"
        ></div>
        <textarea id="whNote${suffix}" hidden></textarea>
      </div>
    </fieldset>
  `;
}
