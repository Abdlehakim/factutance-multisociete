// src/ui/DocOptions.js
import { renderAddItemSection } from "./ItemsView.js";
import { renderExtrasSection } from "./ExtrasSection.js";
import { renderWithholdingSection } from "./WithholdingSection.js";

export function renderDocOptions() {
  const container = document.createElement("div");
  container.className = "section-stack";
  container.id = "DocOptions";

  container.appendChild(renderAddItemSection());
  container.appendChild(renderExtrasSection());
  container.appendChild(renderWithholdingSection());

  return container;
}
