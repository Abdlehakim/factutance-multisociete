export function renderFooterNoteSection(options = {}) {
  const isModal = options.modal === true || options.scope === "modal";
  const suffix = isModal ? "Modal" : "";
  const fieldsetId = isModal ? "NoteBasDePageModal" : "NoteBasDePage";
  const sectionScope = isModal ? "modal" : "main";

  return `
    <fieldset
      class="section-box wh-note-box footer-note-box"
      id="${fieldsetId}"
      data-footer-note-section="${sectionScope}"
    >
      <legend><span class="model-save-dot">Note bas de page</span></legend>
      <div class="full note-field footer-note-field">
        <div class="note-field-label" id="footerNoteLabel${suffix}">Texte affiche en bas du document</div>
        <div class="note-toolbar" aria-label="Mise en forme de la note bas de page">
          <label class="note-size-control" for="footerNoteFontSize${suffix}">
            <span class="note-size-label">Taille</span>
            <select
              id="footerNoteFontSize${suffix}"
              class="note-tool note-size-select"
              title="Taille de la police de la note bas de page"
              aria-label="Taille de la police"
            >
              <option value="7">7</option>
              <option value="8" selected>8</option>
              <option value="9">9</option>
            </select>
          </label>
          <button type="button" id="footerNoteBold${suffix}" class="note-tool" title="Texte en gras">
            <span aria-hidden="true">B</span><span class="sr-only">Gras</span>
          </button>
          <button type="button" id="footerNoteItalic${suffix}" class="note-tool" title="Texte en italique">
            <span aria-hidden="true"><em>I</em></span><span class="sr-only">Italique</span>
          </button>
          <button type="button" id="footerNoteList${suffix}" class="note-tool" title="Liste a puces">
            <span aria-hidden="true">&bull;</span><span class="sr-only">Liste a puces</span>
          </button>
        </div>
        <div
          id="footerNoteEditor${suffix}"
          class="note-editor note-editor--footer"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          aria-labelledby="footerNoteLabel${suffix}"
          data-placeholder="Texte libre pour le bas de page"
          data-empty="true"
          tabindex="0"
        ></div>
        <textarea id="footerNote${suffix}" hidden></textarea>
      </div>
    </fieldset>
  `;
}
