import { renderClientTabs, renderClientTabsList } from "./client-tabs.js";

export function renderClientBoxMainscreen() {
  return `
      <fieldset class="section-box" id="clientBoxMainscreen" data-client-tabs data-client-entity-type="client">
        <legend>
          ${renderClientTabsList()}
        </legend>
        ${renderClientTabs({ includeList: false })}
      </fieldset>
  `;
}
