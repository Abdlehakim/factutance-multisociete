let currentJobId = null;

let companies = [];
let companyGroups = [];
let selectedCompanies = [];
let menuOpen = false;
let activeIndex = -1;
let renderedMenuItems = [];
let buildMode = "single";

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

function getModeEls() {
  return {
    modeSingle: document.getElementById("modeSingle"),
    modeGroup: document.getElementById("modeGroup"),
    groupControls: document.getElementById("groupControls"),
    groupSelect: document.getElementById("groupSelect"),
    saveGroupBtn: document.getElementById("saveGroupBtn"),
  };
}

function getSelectedBuildMode() {
  const selected = document.querySelector('input[name="buildMode"]:checked');
  return selected?.value === "group" ? "group" : "single";
}

function setBuildMode(mode) {
  buildMode = mode === "group" ? "group" : "single";
  const { modeSingle, modeGroup, groupControls } = getModeEls();

  if (modeSingle) modeSingle.checked = buildMode === "single";
  if (modeGroup) modeGroup.checked = buildMode === "group";
  if (groupControls) groupControls.hidden = buildMode !== "group";
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

function renderGroupOptions(selectedId = "") {
  const { groupSelect } = getModeEls();
  if (!groupSelect) return;

  const previousValue = selectedId || groupSelect.value || "";
  groupSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a group...";
  groupSelect.appendChild(placeholder);

  for (const group of companyGroups) {
    if (!group?.id) continue;
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name || group.id;
    groupSelect.appendChild(option);
  }

  if (previousValue && companyGroups.some((group) => group.id === previousValue)) {
    groupSelect.value = previousValue;
  } else {
    groupSelect.value = "";
  }
}

function applyGroupCompanies(groupId) {
  const group = companyGroups.find((item) => item.id === groupId);
  if (!group) return;

  selectedCompanies = Array.isArray(group.companies)
    ? group.companies.map((name) => normalizeCompanyName(name)).filter(Boolean)
    : [];

  renderSelectedChips();

  const { input } = getComboEls();
  renderCompanyMenu(filterCompanies(input?.value || ""), input?.value || "");
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

async function loadCompanyGroups(selectedId = "") {
  const res = await fetch("/api/company-groups");

  if (res.status === 401) {
    redirectToLogin();
    return;
  }

  const data = await res.json().catch(() => []);
  companyGroups = Array.isArray(data)
    ? data
      .filter((group) => group && typeof group === "object")
      .map((group) => ({
        id: String(group.id || "").trim(),
        name: normalizeCompanyName(group.name || group.id || ""),
        companies: Array.isArray(group.companies)
          ? group.companies.map((name) => normalizeCompanyName(name)).filter(Boolean)
          : [],
      }))
      .filter((group) => group.id && group.name && group.companies.length)
    : [];

  renderGroupOptions(selectedId);
}

async function saveCurrentSelectionAsGroup() {
  const names = collectCompanyNamesForBuild();
  if (!names.length) {
    alert("Please select at least one company before saving a group.");
    return;
  }

  const defaultName = `Group ${new Date().toISOString().slice(0, 10)}`;
  const typedName = window.prompt("Group name", defaultName);
  if (typedName == null) return;

  const name = normalizeCompanyName(typedName);
  if (!name || name.length < 2) {
    alert("Please enter a valid group name (min 2 characters).");
    return;
  }

  const { saveGroupBtn } = getModeEls();
  if (saveGroupBtn) saveGroupBtn.disabled = true;

  try {
    const res = await fetch("/api/company-groups/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, companies: names }),
    });

    if (res.status === 401) {
      redirectToLogin();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Unable to save group");
    }

    const selectedId = String(data?.group?.id || "").trim();
    await loadCompanyGroups(selectedId);

    if (selectedId) {
      applyGroupCompanies(selectedId);
      const { groupSelect } = getModeEls();
      if (groupSelect) groupSelect.value = selectedId;
    }

    setStatus(`Group saved: ${data?.group?.name || name}`, "status-idle");
  } catch (err) {
    alert(String(err?.message || "Unable to save group"));
  } finally {
    if (saveGroupBtn) saveGroupBtn.disabled = false;
  }
}

function setBuildUiBusy(isBusy) {
  const buildBtn = document.getElementById("buildBtn");
  const variant = document.getElementById("buildVariant");
  const { combo, input, toggle } = getComboEls();
  const { modeSingle, modeGroup, groupSelect, saveGroupBtn } = getModeEls();

  if (buildBtn) buildBtn.disabled = isBusy;
  if (variant) variant.disabled = isBusy;
  if (input) input.disabled = isBusy;
  if (toggle) toggle.disabled = isBusy;
  if (modeSingle) modeSingle.disabled = isBusy;
  if (modeGroup) modeGroup.disabled = isBusy;
  if (groupSelect) groupSelect.disabled = isBusy;
  if (saveGroupBtn) saveGroupBtn.disabled = isBusy;
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
      body: JSON.stringify({ mode: "single", companyName, buildVariant }),
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

async function createGroupBuildJob(groupId, buildVariant, companiesForBuild = []) {
  const companies = Array.isArray(companiesForBuild)
    ? companiesForBuild.map((name) => normalizeCompanyName(name)).filter(Boolean)
    : [];

  let res;
  try {
    res = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "group", groupId, companies, buildVariant }),
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
  if (!res.ok) {
    throw new Error(data.error || "Unable to start group build");
  }

  const jobId = String(data?.jobId || "").trim();
  if (!jobId) {
    throw new Error("No build job was created for this group");
  }

  return {
    jobId,
    groupName: normalizeCompanyName(data.groupName || groupId),
    companies: Array.isArray(data.companies)
      ? data.companies.map((name) => normalizeCompanyName(name)).filter(Boolean)
      : companies,
  };
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
  const mode = getSelectedBuildMode();
  const { groupSelect } = getModeEls();

  const singleCompanies = mode === "single" ? collectCompanyNamesForBuild() : [];
  const selectedGroupId = mode === "group" ? String(groupSelect?.value || "").trim() : "";

  if (mode === "single" && singleCompanies.length !== 1) {
    alert("Single mode requires exactly 1 company.");
    return;
  }

  if (mode === "group" && !selectedGroupId) {
    alert("Please select a group, or save the current selection as a group first.");
    return;
  }

  let jobToMonitor = null;

  setBuildUiBusy(true);
  clearBuildOutputs();

  startFakeProgress();
  setStatus("Starting build(s)...", "status-queued");
  setProgress(8, "Starting build jobs...");

  try {
    if (mode === "single") {
      const companyName = singleCompanies[0];
      setStatus(`Starting single build: ${companyName}`, "status-queued");
      const jobId = await createBuildJob(companyName, buildVariant, 1, 1);
      jobToMonitor = { jobId, label: companyName };
    } else {
      const group = companyGroups.find((item) => item.id === selectedGroupId);
      const groupLabel = group?.name || selectedGroupId;
      const groupCompanies = collectCompanyNamesForBuild();
      setStatus(`Starting group build: ${groupLabel}`, "status-queued");

      const response = await createGroupBuildJob(selectedGroupId, buildVariant, groupCompanies);
      const finalLabel = response.groupName || groupLabel;
      jobToMonitor = { jobId: response.jobId, label: finalLabel };
    }

    await monitorBuildJob(jobToMonitor.jobId, jobToMonitor.label, 1, 1);

    stopFakeProgress();
    setProgress(100, "Completed");
    setStatus("Done (1/1)", "status-done");
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
  const { modeSingle, modeGroup, groupSelect, saveGroupBtn } = getModeEls();

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

  if (modeSingle) {
    modeSingle.addEventListener("change", () => {
      if (modeSingle.checked) setBuildMode("single");
    });
  }

  if (modeGroup) {
    modeGroup.addEventListener("change", () => {
      if (modeGroup.checked) setBuildMode("group");
    });
  }

  if (groupSelect) {
    groupSelect.addEventListener("change", () => {
      const selectedId = String(groupSelect.value || "").trim();
      if (!selectedId) return;
      applyGroupCompanies(selectedId);
    });
  }

  if (saveGroupBtn) {
    saveGroupBtn.addEventListener("click", saveCurrentSelectionAsGroup);
  }

  renderSelectedChips();
  setBuildMode(getSelectedBuildMode());

  Promise.all([loadCompanies(), loadCompanyGroups()]).catch((err) => {
    const message = String(err?.message || err || "Unable to initialize admin panel");
    setStatus("Error", "status-error");
    alert(message);
  });
});
