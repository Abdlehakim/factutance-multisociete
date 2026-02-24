let currentJobId = null;

let companies = [];
let selectedCompanies = [];
let menuOpen = false;
let activeIndex = -1;
let renderedMenuItems = [];

let progressTimer = null;
let fakeProgress = 0;

const POLL_INTERVAL_MS = 1200;

function setStatus(text, stateClass = "status-idle") {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text;
  el.className = `status ${stateClass}`;
}

function showProgress() {
  const wrap = document.getElementById("progressWrap");
  if (!wrap) return;
  wrap.classList.remove("hidden");
  wrap.setAttribute("aria-hidden", "false");
}

function hideProgress() {
  const wrap = document.getElementById("progressWrap");
  if (!wrap) return;
  wrap.classList.add("hidden");
  wrap.setAttribute("aria-hidden", "true");
}

function setProgress(pct, hint = "") {
  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressText");
  const h = document.getElementById("progressHint");

  const v = Math.max(0, Math.min(100, Math.round(pct)));
  if (fill) fill.style.width = `${v}%`;
  if (text) text.textContent = `${v}%`;
  if (h && hint) h.textContent = hint;
}

function startFakeProgress() {
  stopFakeProgress();
  fakeProgress = 6;
  showProgress();
  setProgress(fakeProgress, "Queued...");

  progressTimer = setInterval(() => {
    // Slowly move up, never reach 100 until done.
    const cap = 92;
    const step = fakeProgress < 35 ? 6 : fakeProgress < 70 ? 3 : 1;
    fakeProgress = Math.min(cap, fakeProgress + step);
    setProgress(fakeProgress);
  }, 900);
}

function stopFakeProgress() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
}

function resetProgress() {
  stopFakeProgress();
  fakeProgress = 0;
  setProgress(0, "Preparing...");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redirectToLogin() {
  window.location.href = "/";
}

async function logout() {
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
  redirectToLogin();
}

function getComboEls() {
  return {
    combo: document.getElementById("companyCombo"),
    field: document.querySelector("#companyCombo .comboField"),
    chips: document.getElementById("companyChips"),
    input: document.getElementById("companyName"),
    menu: document.getElementById("companyMenu"),
    toggle: document.getElementById("companyToggle"),
  };
}

function normalizeCompanyName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sameCompanyName(a, b) {
  return normalizeCompanyName(a).toLowerCase() === normalizeCompanyName(b).toLowerCase();
}

function hasSelectedCompany(name) {
  return selectedCompanies.some((item) => sameCompanyName(item, name));
}

function updateCompanyPlaceholder() {
  const { input } = getComboEls();
  if (!input) return;
  input.placeholder = selectedCompanies.length
    ? "Search and add more companies..."
    : "Type or select companies...";
}

function openCompanyMenu() {
  const { combo, input } = getComboEls();
  if (!combo || !input) return;
  combo.classList.add("open");
  input.setAttribute("aria-expanded", "true");
  menuOpen = true;
}

function closeCompanyMenu() {
  const { combo, input } = getComboEls();
  if (!combo || !input) return;
  combo.classList.remove("open");
  input.setAttribute("aria-expanded", "false");
  menuOpen = false;
  activeIndex = -1;
  updateActiveItem();
}

function filterCompanies(query) {
  const q = normalizeCompanyName(query).toLowerCase();
  const uniqueCompanies = [];

  for (const company of companies) {
    const normalized = normalizeCompanyName(company);
    if (!normalized) continue;
    if (uniqueCompanies.some((item) => sameCompanyName(item, normalized))) continue;
    uniqueCompanies.push(normalized);
  }

  if (!q) return uniqueCompanies;
  return uniqueCompanies.filter((name) => name.toLowerCase().includes(q));
}

function updateActiveItem() {
  const { menu } = getComboEls();
  if (!menu) return;
  const items = [...menu.querySelectorAll(".comboItem[data-index]")];

  items.forEach((el, idx) => {
    el.classList.toggle("active", idx === activeIndex);
    if (idx === activeIndex) el.scrollIntoView({ block: "nearest" });
  });
}

function renderCompanyMenu(list, query = "") {
  const { menu } = getComboEls();
  if (!menu) return;

  menu.innerHTML = "";

  const shown = Array.isArray(list) ? list.slice(0, 80) : [];
  const queryName = normalizeCompanyName(query);

  if (queryName) {
    const alreadyInShown = shown.some((name) => sameCompanyName(name, queryName));
    if (!alreadyInShown) shown.unshift(queryName);
  }

  renderedMenuItems = shown;

  if (!shown.length) {
    const li = document.createElement("li");
    li.className = "comboItem empty";

    const text = document.createElement("span");
    text.className = "comboItemText";
    text.textContent = "No matches";

    li.appendChild(text);
    menu.appendChild(li);
    activeIndex = -1;
    return;
  }

  for (let i = 0; i < shown.length; i++) {
    const name = shown[i];
    const selected = hasSelectedCompany(name);

    const li = document.createElement("li");
    li.className = `comboItem${selected ? " selected" : ""}`;
    li.dataset.index = String(i);
    li.dataset.name = name;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", selected ? "true" : "false");

    const label = document.createElement("span");
    label.className = "comboItemText";
    label.textContent = name;

    const state = document.createElement("span");
    state.className = "comboItemState";
    state.textContent = selected ? "Selected" : "Add";

    li.appendChild(label);
    li.appendChild(state);

    // Use mousedown so toggle happens before input blur closes the menu.
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      toggleSelectedCompany(name);
    });

    menu.appendChild(li);
  }

  activeIndex = -1;
  updateActiveItem();
}

function renderSelectedChips() {
  const { chips } = getComboEls();
  if (!chips) return;

  chips.innerHTML = "";

  for (const name of selectedCompanies) {
    const chip = document.createElement("span");
    chip.className = "comboChip";

    const label = document.createElement("span");
    label.className = "comboChipLabel";
    label.textContent = name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "comboChipRemove";
    removeBtn.setAttribute("aria-label", `Remove ${name}`);
    removeBtn.textContent = "x";

    removeBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    removeBtn.addEventListener("click", () => {
      removeSelectedCompany(name);
    });

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    chips.appendChild(chip);
  }

  updateCompanyPlaceholder();
}

function addSelectedCompany(name) {
  const normalized = normalizeCompanyName(name);
  if (!normalized) return false;
  if (hasSelectedCompany(normalized)) return false;

  selectedCompanies.push(normalized);
  renderSelectedChips();
  return true;
}

function removeSelectedCompany(name) {
  selectedCompanies = selectedCompanies.filter((item) => !sameCompanyName(item, name));
  renderSelectedChips();

  const { input } = getComboEls();
  renderCompanyMenu(filterCompanies(input?.value || ""), input?.value || "");
}

function toggleSelectedCompany(name) {
  if (hasSelectedCompany(name)) removeSelectedCompany(name);
  else addSelectedCompany(name);

  const { input } = getComboEls();
  if (input) input.focus();
  renderCompanyMenu(filterCompanies(input?.value || ""), input?.value || "");
  openCompanyMenu();
}

function tryAddCurrentInputCompany() {
  const { input } = getComboEls();
  if (!input) return false;

  const typed = normalizeCompanyName(input.value);
  if (!typed) return false;

  const added = addSelectedCompany(typed);
  input.value = "";
  renderCompanyMenu(filterCompanies(""), "");
  openCompanyMenu();
  return added;
}

async function loadCompanies() {
  const res = await fetch("/api/companies");

  if (res.status === 401) {
    redirectToLogin();
    return;
  }

  const list = await res.json().catch(() => []);
  companies = Array.isArray(list)
    ? list.filter((x) => typeof x === "string").map((s) => normalizeCompanyName(s)).filter(Boolean)
    : [];

  renderSelectedChips();
  renderCompanyMenu(filterCompanies(""), "");
}

function setBuildUiBusy(isBusy) {
  const buildBtn = document.getElementById("buildBtn");
  const variant = document.getElementById("buildVariant");
  const { combo, input, toggle } = getComboEls();

  if (buildBtn) buildBtn.disabled = isBusy;
  if (variant) variant.disabled = isBusy;
  if (input) input.disabled = isBusy;
  if (toggle) toggle.disabled = isBusy;
  if (combo) combo.classList.toggle("is-disabled", isBusy);

  if (isBusy) closeCompanyMenu();
}

function clearBuildOutputs() {
  const downloads = document.getElementById("downloads");
  if (downloads) downloads.innerHTML = "";

  const logs = document.getElementById("logs");
  if (logs) logs.textContent = "";

  const emptyNote = document.querySelector(".emptyNote");
  if (emptyNote) emptyNote.style.display = "block";
}

function appendDownloads(jobId, companyName, files) {
  const ul = document.getElementById("downloads");
  if (!ul) return;

  const title = document.createElement("li");
  title.className = "downloadGroup";
  title.textContent = companyName;
  ul.appendChild(title);

  for (const file of files || []) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `/download/${jobId}/${encodeURIComponent(file)}`;
    a.textContent = `Download ${file}`;
    li.appendChild(a);
    ul.appendChild(li);
  }

  const emptyNote = document.querySelector(".emptyNote");
  if (emptyNote) emptyNote.style.display = (files && files.length) ? "none" : "block";
}

function collectCompanyNamesForBuild() {
  const { input } = getComboEls();
  const typed = normalizeCompanyName(input?.value || "");

  if (typed) addSelectedCompany(typed);

  if (input) input.value = "";
  renderCompanyMenu(filterCompanies(""), "");

  return selectedCompanies.slice();
}

async function createBuildJob(companyName, buildVariant, index, total) {
  setStatus(`Creating job ${index}/${total}: ${companyName}`, "status-queued");

  let res;
  try {
    res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, buildVariant }),
    });
  } catch {
    throw new Error("Cannot reach build server. Is server.js running?");
  }

  if (res.status === 401) {
    const unauthorized = new Error("Unauthorized");
    unauthorized.code = "UNAUTHORIZED";
    throw unauthorized;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.jobId) {
    throw new Error(data.error || `Build start failed for ${companyName}`);
  }

  return data.jobId;
}

function setProgressForState(state, companyName, index, total) {
  const segmentStart = Math.floor(((index - 1) / total) * 100);
  const segmentEnd = Math.floor((index / total) * 100);
  const segmentSize = Math.max(1, segmentEnd - segmentStart);

  if (state === "queued") {
    const target = Math.min(99, segmentStart + Math.floor(segmentSize * 0.18));
    setProgress(Math.max(fakeProgress, target), `Queued: ${companyName}`);
    return;
  }

  if (state === "building") {
    const target = Math.min(99, segmentStart + Math.floor(segmentSize * 0.75));
    setProgress(Math.max(fakeProgress, target), `Building: ${companyName}`);
    return;
  }

  if (state === "done") {
    const target = index === total ? 100 : Math.min(99, segmentEnd);
    setProgress(Math.max(fakeProgress, target), `Completed: ${companyName}`);
  }
}

async function monitorBuildJob(jobId, companyName, index, total) {
  currentJobId = jobId;

  for (;;) {
    const [statusRes, logsRes] = await Promise.all([
      fetch(`/api/status/${jobId}`),
      fetch(`/api/logs/${jobId}`),
    ]);

    if (statusRes.status === 401 || logsRes.status === 401) {
      const unauthorized = new Error("Unauthorized");
      unauthorized.code = "UNAUTHORIZED";
      throw unauthorized;
    }

    const statusData = await statusRes.json().catch(() => ({}));
    if (!statusRes.ok) {
      throw new Error(statusData.error || `Status error for ${companyName}`);
    }

    if (logsRes.ok) {
      const logsText = await logsRes.text();
      const logs = document.getElementById("logs");
      if (logs) logs.textContent = logsText;
    }

    if (statusData.state === "queued") {
      setStatus(`Queued ${index}/${total}: ${companyName}`, "status-queued");
      setProgressForState("queued", companyName, index, total);
    } else if (statusData.state === "building") {
      setStatus(`Building ${index}/${total}: ${companyName}`, "status-building");
      setProgressForState("building", companyName, index, total);
    } else if (statusData.state === "done") {
      setStatus(`Done ${index}/${total}: ${companyName}`, "status-done");
      appendDownloads(jobId, companyName, statusData.files || []);
      setProgressForState("done", companyName, index, total);
      return;
    } else if (statusData.state === "error") {
      throw new Error(`Build failed for ${companyName}. Check logs.`);
    } else {
      setStatus(`State: ${statusData.state || "unknown"}`, "status-idle");
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

async function startBuild() {
  const buildVariant = document.getElementById("buildVariant")?.value || "both";
  const companyNames = collectCompanyNamesForBuild();

  if (!companyNames.length) {
    alert("Please select at least one company.");
    return;
  }

  setBuildUiBusy(true);
  clearBuildOutputs();

  startFakeProgress();
  setStatus(`Starting ${companyNames.length} build(s)...`, "status-queued");
  setProgress(8, "Starting build jobs...");

  try {
    for (let i = 0; i < companyNames.length; i++) {
      const companyName = companyNames[i];
      const index = i + 1;

      const jobId = await createBuildJob(companyName, buildVariant, index, companyNames.length);
      await monitorBuildJob(jobId, companyName, index, companyNames.length);
    }

    stopFakeProgress();
    setProgress(100, "Completed");
    setStatus(`Done (${companyNames.length}/${companyNames.length})`, "status-done");
  } catch (err) {
    stopFakeProgress();

    if (err?.code === "UNAUTHORIZED") {
      resetProgress();
      redirectToLogin();
      return;
    }

    setStatus("Error", "status-error");
    setProgress(100, "Failed. Check logs");
    alert(String(err?.message || "Build failed"));
  } finally {
    setBuildUiBusy(false);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  const buildBtn = document.getElementById("buildBtn");
  if (buildBtn) buildBtn.addEventListener("click", startBuild);

  const { combo, field, input, menu, toggle } = getComboEls();

  if (field && input) {
    field.addEventListener("mousedown", (e) => {
      if (e.target === field) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      const query = input?.value || "";
      renderCompanyMenu(filterCompanies(query), query);
      if (!menuOpen) openCompanyMenu();
      else closeCompanyMenu();
    });
  }

  if (input) {
    input.addEventListener("input", () => {
      const query = input.value;
      renderCompanyMenu(filterCompanies(query), query);
      openCompanyMenu();
    });

    input.addEventListener("focus", () => {
      const query = input.value;
      renderCompanyMenu(filterCompanies(query), query);
      openCompanyMenu();
    });

    input.addEventListener("keydown", (e) => {
      if (!menu) return;

      if (e.key === "Escape") {
        closeCompanyMenu();
        return;
      }

      if (!menuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        openCompanyMenu();
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, renderedMenuItems.length - 1);
        updateActiveItem();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveItem();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();

        if (menuOpen && activeIndex >= 0 && renderedMenuItems[activeIndex]) {
          toggleSelectedCompany(renderedMenuItems[activeIndex]);
          return;
        }

        tryAddCurrentInputCompany();
        return;
      }

      if (e.key === "Backspace" && !normalizeCompanyName(input.value) && selectedCompanies.length) {
        e.preventDefault();
        removeSelectedCompany(selectedCompanies[selectedCompanies.length - 1]);
      }
    });
  }

  document.addEventListener("mousedown", (e) => {
    if (!combo) return;
    if (!combo.contains(e.target)) closeCompanyMenu();
  });

  renderSelectedChips();
  loadCompanies();
});
