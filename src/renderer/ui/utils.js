// Tiny helper to turn HTML strings into DocumentFragments
export function html(template) {
  const t = document.createElement("template");
  t.innerHTML = template.trim();
  return t.content;
}
