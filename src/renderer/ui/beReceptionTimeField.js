export const renderBeReceptionTimePanel = ({ panelId = "beReceptionTimePanel" } = {}) => `
  <div
    class="swb-time-picker__panel"
    data-time-picker-panel=""
    role="dialog"
    aria-modal="false"
    aria-label="Choisir une heure"
    tabindex="-1"
    id="${panelId}"
    hidden
  ></div>
`.trim();

export const renderBeReceptionTimeField = ({
  inputId = "beReceptionTimeInput",
  panelId = "beReceptionTimePanel"
} = {}) => `
  <label class="items-be-reception-form__field">
    <span>Heure</span>
    <div class="swb-time-picker" data-time-picker="">
      <input
        id="${inputId}"
        type="text"
        inputmode="numeric"
        placeholder="HH:MM"
        autocomplete="off"
        spellcheck="false"
        aria-haspopup="dialog"
        aria-expanded="false"
        role="combobox"
        aria-controls="${panelId}"
      />
      <button
        type="button"
        class="swb-time-picker__toggle"
        data-time-picker-toggle=""
        aria-label="Choisir une heure de reception"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="${panelId}"
      >
        <svg
          class="swb-time-picker__toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.75v4.5l2.75 1.75" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      ${renderBeReceptionTimePanel({ panelId })}
    </div>
  </label>
`.trim();

if (typeof window !== "undefined") {
  window.BeReceptionTimeField = {
    render: renderBeReceptionTimeField,
    renderPanel: renderBeReceptionTimePanel
  };
}
