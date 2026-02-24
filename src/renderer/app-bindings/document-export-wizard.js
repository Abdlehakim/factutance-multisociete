
(function (w) {
  const API =
    w.electronAPI ||
    (w.DEFAULT_COMPANY_API_KEY && w[w.DEFAULT_COMPANY_API_KEY]) ||
    null;
  const showDialog = typeof w.showDialog === "function" ? w.showDialog : null;

  const BTN_SELECTOR = "#docMetaBoxMainscreen #docHistoryExportBtn";
  const MODAL_ID = "docHistoryExportModal";
  const EMAIL_MODAL_ID = "docHistoryExportEmailModal";
  const EMAIL_MODAL_TITLE_ID = "docHistoryExportEmailTitle";
  const EMAIL_MODAL_CLOSE_ID = "docHistoryExportEmailClose";
  const EMAIL_MODAL_FORM_ID = "docHistoryExportEmailForm";
  const EMAIL_MODAL_TO_ID = "docHistoryExportEmailTo";
  const EMAIL_MODAL_SUBJECT_ID = "docHistoryExportEmailSubject";
  const EMAIL_MODAL_BODY_ID = "docHistoryExportEmailBody";
  const EMAIL_MODAL_ATTACHMENTS_ID = "docHistoryExportEmailAttachments";
  const EMAIL_MODAL_STATUS_ID = "docHistoryExportEmailStatus";
  const EMAIL_MODAL_CANCEL_ID = "docHistoryExportEmailCancel";
  const EMAIL_MODAL_SEND_ID = "docHistoryExportEmailSend";
  const FETCH_LIMIT = 500;
  const CLIENT_OPTIONS_PAGE_SIZE = 10;
  const canSendEmailApi = typeof API?.sendSmtpEmail === "function";
  const EMAIL_REMOVE_ICON_SVG = `<svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path></svg>`;
  const CLIENT_PAGE_ICON_SVG = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path d="M512 0C229.232 0 0 229.232 0 512c0 282.784 229.232 512 512 512 282.784 0 512-229.216 512-512C1024 229.232 794.784 0 512 0zm0 961.008c-247.024 0-448-201.984-448-449.01 0-247.024 200.976-448 448-448s448 200.977 448 448-200.976 449.01-448 449.01zm20.368-642.368c-12.496 12.496-12.496 32.752 0 45.248l115.76 115.76H287.68c-17.68 0-32 14.336-32 32s14.32 32 32 32h362.464l-117.76 117.744c-12.496 12.496-12.496 32.752 0 45.248 6.256 6.256 14.432 9.376 22.624 9.376s16.368-3.12 22.624-9.376l189.008-194-189.008-194c-12.512-12.496-32.752-12.496-45.264 0z"></path></svg>`;

  const DOC_TYPES = [
    ["facture", "Facture"],
    ["fa", "Facture d'achat"],
    ["avoir", "Facture d'avoir"],
    ["devis", "Devis"],
    ["bl", "Bon de livraison"]
  ];
  const DOC_LABELS = Object.fromEntries(DOC_TYPES);
  const DOC_FILE_SEGMENT = {
    facture: "factures",
    fa: "factures_achat",
    avoir: "factures_avoir",
    devis: "devis",
    bl: "bons_livraison"
  };
  const PRESETS = [
    ["custom", "Par dates"],
    ["today", "Aujourd'hui"],
    ["this-month", "Ce mois"],
    ["last-month", "Mois dernier"],
    ["this-year", "Cette annee"],
    ["last-year", "L'annee derniere"]
  ];
  const PRESET_LABELS = Object.fromEntries(PRESETS);
  const FORMAT_LABELS = { xlsx: "XLSX", csv: "CSV" };
  const CORE_KEYS = new Set([
    "entry.docTypeLabel",
    "entry.number",
    "entry.date",
    "entry.status",
    "client.name",
    "client.vat",
    "client.type",
    "client.identifiantFiscal",
    "company.type",
    "company.name",
    "company.vat",
    "company.phone",
    "totals.tax",
    "totals.totalHT",
    "totals.totalTTC",
    "entry.totalHT",
    "entry.totalTTC"
  ]);
  const LABEL_OVERRIDES = {
    "entry.docType": "Type de document",
    "entry.docTypeLabel": "Document",
    "entry.number": "Numero",
    "entry.date": "Date",
    "entry.status": "Statut",
    "entry.clientName": "Client",
    "entry.clientAccount": "Compte client",
    "entry.totalHT": "Total HT",
    "entry.totalTTC": "Total TTC",
    "entry.totalTTCExclStamp": "Total TTC hors timbre",
    "entry.stampTT": "Timbre",
    "entry.currency": "Devise",
    "entry.paymentMethod": "Mode de paiement",
    "entry.paymentDate": "Date de paiement",
    "entry.paymentReference": "Reference paiement",
    "entry.path": "Chemin document",
    "entry.createdAt": "Cree le",
    "entry.modifiedAt": "Modifie le",
    "client.name": "Nom client",
    "client.vat": "Matricule fiscal",
    "client.identifiantFiscal": "Matricule fiscal",
    "client.email": "Email client",
    "client.phone": "Telephone client",
    "client.address": "Adresse client",
    "company.vat": "Entreprise / Matricule fiscal",
    "totals.tax": "Taxes",
    "totals.totalHT": "Total HT",
    "totals.totalTTC": "Total TTC",
    "totals.tvaRates": "TVA %",
    "totals.tvaBaseHT": "Base HT (TVA)",
    "totals.tvaAmount": "Montant TVA",
    "totals.fodecRates": "FODEC %",
    "totals.fodecBaseHT": "Base HT (FODEC)",
    "totals.fodecAmount": "Montant FODEC",
    "totals.stampTT": "Timbre",
    "totals.currency": "Devise",
    "meta.addForm.purchaseTva": "Meta / Formulaire d'ajout / TVA A.",
    "meta.addForm.purchasePrice": "Meta / Formulaire d'ajout / PU A. HT",
    "meta.addForm.tva": "Meta / Formulaire d'ajout / TVA",
    "meta.addForm.fodec.rate": "Meta / Formulaire d'ajout / FODEC / Taux",
    "meta.addForm.fodec.tva": "Meta / Formulaire d'ajout / FODEC / TVA"
  };
  const FIELD_SEGMENT_OVERRIDES = {
    entry: "Entree",
    meta: "Meta",
    client: "Client",
    company: "Entreprise",
    totals: "Totaux",
    items: "Articles",
    notes: "Notes",
    extras: "Frais",
    addform: "Formulaire d'ajout",
    financing: "Financement",
    reglement: "Reglement",
    withholding: "Retenue",
    shipping: "Livraison",
    dossier: "Dossier",
    deplacement: "Deplacement",
    stamp: "Timbre",
    docType: "Type de document",
    doctype: "Type de document",
    docTypeLabel: "Document",
    doctypelabel: "Document",
    number: "Numero",
    date: "Date",
    due: "Echeance",
    status: "Statut",
    account: "Compte",
    accountof: "Compte",
    name: "Nom",
    address: "Adresse",
    phone: "Telephone",
    email: "Email",
    currency: "Devise",
    total: "Total",
    totalht: "Total HT",
    totalttc: "Total TTC",
    totalttcexclstamp: "Total TTC hors timbre",
    amount: "Montant",
    label: "Libelle",
    enabled: "Active",
    rate: "Taux",
    base: "Base",
    threshold: "Seuil",
    paid: "Paye",
    balance: "Solde",
    balancedue: "Solde du",
    paymentmethod: "Mode de paiement",
    paymentdate: "Date de paiement",
    paymentreference: "Reference paiement",
    paymentref: "Reference paiement",
    purchasetva: "TVA A.",
    purchaseprice: "PU A. HT",
    purchaseunitprice: "PU A. HT",
    tva: "TVA",
    vat: "TVA",
    discount: "Remise",
    qty: "Quantite",
    quantity: "Quantite",
    unit: "Unite",
    product: "Designation",
    description: "Description",
    ref: "Reference",
    stockqty: "Stock",
    stockadjusted: "Stock ajuste",
    createdat: "Cree le",
    modifiedat: "Modifie le",
    path: "Chemin",
    id: "ID",
    fodec: "FODEC",
    reglementdays: "Delai de reglement (jours)"
  };
  const FIELD_WORD_OVERRIDES = {
    add: "ajout",
    form: "formulaire",
    purchase: "achat",
    sale: "vente",
    tax: "taxe",
    vat: "TVA",
    tva: "TVA",
    total: "total",
    amount: "montant",
    number: "numero",
    date: "date",
    due: "echeance",
    status: "statut",
    client: "client",
    company: "entreprise",
    account: "compte",
    name: "nom",
    address: "adresse",
    phone: "telephone",
    email: "email",
    currency: "devise",
    payment: "paiement",
    reference: "reference",
    method: "mode",
    created: "cree",
    modified: "modifie",
    path: "chemin",
    notes: "notes",
    items: "articles",
    item: "article",
    quantity: "quantite",
    qty: "quantite",
    unit: "unite",
    discount: "remise",
    label: "libelle",
    enabled: "active",
    rate: "taux",
    threshold: "seuil",
    shipping: "livraison",
    stamp: "timbre",
    dossier: "dossier",
    deplacement: "deplacement",
    financing: "financement",
    subvention: "subvention",
    bank: "banque",
    withholding: "retenue",
    stock: "stock",
    adjusted: "ajuste",
    ref: "reference",
    product: "designation",
    description: "description",
    fodec: "FODEC"
  };
  const FIELD_GROUP_LABELS = {
    entry: "Document",
    client: "Client",
    company: "Entreprise",
    totals: "Totaux",
    items: "Articles",
    meta: "Meta",
    notes: "Notes",
    extras: "Frais",
    reglement: "Reglement",
    financing: "Financement",
    withholding: "Retenue",
    shipping: "Livraison",
    dossier: "Dossier",
    deplacement: "Deplacement",
    stamp: "Timbre",
    other: "Autres"
  };
  const FIELD_GROUP_ORDER = [
    "entry",
    "client",
    "company",
    "totals",
    "items",
    "meta",
    "notes",
    "extras",
    "reglement",
    "financing",
    "withholding",
    "shipping",
    "dossier",
    "deplacement",
    "stamp",
    "other"
  ];
  const EXCLUDED_EXPORT_FIELD_KEYS = new Set([
    "_schemaVersion",
    "client.__path",
    "meta.id",
    "company.signature.rotateDeg",
    "company.signature.opacity",
    "company.signature.maxWidthMm",
    "company.signature.maxHeightMm",
    "company.signature.image",
    "company.signature.enabled",
    "company.seal.rotateDeg",
    "company.seal.opacity",
    "company.seal.maxWidthMm",
    "company.seal.maxHeightMm",
    "company.seal.image",
    "company.seal.enabled",
    "company.logo",
    "company.logoPath",
    "company.customsCode",
    "client.benefit",
    "entry.stampTT",
    "entry.modifiedAt",
    "entry.id",
    "entry.createdAt",
    "entry.clientAccount",
    "entry.path",
    "totals.tvaBreakdown",
    "totals.acompte.enabled",
    "meta.acompte.enabled",
    "meta.financing.bank.enabled",
    "meta.financing.bank.label",
    "meta.financing.subvention.enabled",
    "meta.financing.subvention.label",
    "meta.withholding.enabled",
    "meta.withholding.label",
    "meta.withholding.note",
    "meta.reglementEnabled",
    "meta.convertedFrom.id",
    "meta.convertedFrom.type",
    "meta.itemsHeaderColor",
    "meta.currency",
    "meta.modelKey",
    "meta.noteInterne",
    "meta.status",
    "meta.stockAdjusted",
    "meta.taxesEnabled",
    "meta.template",
    "meta.docType"
  ]);
  const EXCLUDED_EXPORT_FIELD_KEY_PREFIXES = [
    "totals.financing.",
    "totals.extras.",
    "meta.extras."
  ];
  const META_FIELD_TAB_LABELS = {
    acompte: "Acompte",
    "article-field-labels": "Article Field Labels",
    columns: "Columns",
    "add-form": "Add Form",
    "reglement-payment": "Reglement & Paiement",
    extras: "Extras",
    financing: "Financing",
    withholding: "Withholding",
    numbering: "Numbering",
    general: "General",
    other: "Autres"
  };
  const META_FIELD_TAB_ORDER = [
    "acompte",
    "article-field-labels",
    "columns",
    "add-form",
    "reglement-payment",
    "extras",
    "financing",
    "withholding",
    "numbering",
    "general",
    "other"
  ];
  const EXCLUDED_META_FIELD_TABS = new Set([
    "article-field-labels",
    "columns",
    "add-form",
    "numbering"
  ]);

  const st = {
    step: 1,
    maxStepReached: 1,
    docType: "facture",
    preset: "custom",
    clientMode: "all",
    clientTypeTab: "all",
    clientOptionsPage: 0,
    clientOptions: [],
    clientOptionsContext: "",
    clientOptionsLoading: false,
    clientOptionsError: "",
    startDate: "",
    endDate: "",
    format: "xlsx",
    rows: [],
    fields: [],
    fieldsTab: "",
    metaFieldsTab: "",
    startPicker: null,
    endPicker: null,
    exportPath: "",
    exportName: "",
    emailDraftTo: "",
    emailDraftSubject: "",
    emailDraftBody: "",
    busy: false
  };
  let modal = null;
  let restoreFocus = null;
  let clientOptionsLoadToken = 0;
  let emailModal = null;
  let emailModalRestoreFocus = null;
  let emailModalBusy = false;
  let emailAttachments = [];

  const txt = (v) => String(v ?? "").trim();
  const q = (s) => modal?.querySelector(s) || null;
  const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isoOnly = (v) => {
    const s = txt(v);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? "" : s;
  };
  const parseDate = (v) => {
    const s = txt(v);
    if (!s) return "";
    const direct = isoOnly(s);
    if (direct) return direct;
    const fr = s.match(/^(\d{2})[-\/.](\d{2})[-\/.](\d{4})$/);
    if (fr) return isoOnly(`${fr[3]}-${fr[2]}-${fr[1]}`);
    const shortYear = s.match(/^(\d{2})-(\d{2})-(\d{2})$/);
    if (shortYear) {
      const yy = Number(shortYear[1]);
      return isoOnly(`${yy >= 70 ? 1900 + yy : 2000 + yy}-${shortYear[2]}-${shortYear[3]}`);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "" : toIso(d);
  };
  const normalizeEmailText = (v) => String(v ?? "").trim();
  const normalizeEmailAddress = (v) => normalizeEmailText(v).replace(/\s+/g, "");
  const basenameFromPath = (v) => {
    const raw = txt(v);
    if (!raw) return "";
    const normalized = raw.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    return parts[parts.length - 1] || raw;
  };
  const exportedFilename = () => txt(st.exportName) || basenameFromPath(st.exportPath) || "export";
  const resolveCompanySmtpSettings = () => {
    const company = w.SEM?.state?.company || {};
    const profiles =
      company.smtpProfiles && typeof company.smtpProfiles === "object"
        ? company.smtpProfiles
        : company.smtp && typeof company.smtp === "object"
          ? { professional: company.smtp }
          : {};
    const preset =
      (company.smtpPreset && profiles[company.smtpPreset] && company.smtpPreset) ||
      (profiles.gmail && !profiles.professional ? "gmail" : "professional");
    const smtpRaw =
      profiles[preset] && typeof profiles[preset] === "object" ? profiles[preset] : {};
    const secure = !!smtpRaw.secure;
    const portValue = Number(smtpRaw.port);
    const fallbackPort = preset === "gmail" ? (secure ? 465 : 587) : secure ? 465 : 587;
    const port = Number.isFinite(portValue) && portValue > 0 ? Math.trunc(portValue) : fallbackPort;
    const hostValue = preset === "gmail" ? "smtp.gmail.com" : smtpRaw.host;
    return {
      enabled: !!smtpRaw.enabled,
      host: normalizeEmailText(hostValue),
      port,
      secure,
      user: normalizeEmailText(smtpRaw.user),
      pass: String(smtpRaw.pass ?? ""),
      fromEmail: normalizeEmailAddress(smtpRaw.fromEmail || company.email || smtpRaw.user || ""),
      fromName: normalizeEmailText(smtpRaw.fromName || company.name || "")
    };
  };
  const isSmtpReady = (smtp) =>
    !!(
      smtp &&
      smtp.enabled &&
      smtp.host &&
      smtp.port &&
      smtp.fromEmail &&
      canSendEmailApi
    );
  const findDefaultRecipientEmail = () => {
    const emails = new Set();
    st.rows.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const email = normalizeEmailAddress(row["client.email"] || row["entry.clientEmail"] || "");
      if (email) emails.add(email);
    });
    if (emails.size === 1) return Array.from(emails)[0];
    return "";
  };
  const buildExportEmailSubject = () => {
    const filename = exportedFilename();
    return `Export documents - ${filename}`;
  };
  const buildExportEmailBody = () => {
    const filename = exportedFilename();
    return `Bonjour,\n\nVeuillez trouver en piece jointe le fichier exporte ${filename}.\n\nCordialement.`;
  };
  const qe = (s) => emailModal?.querySelector(s) || null;
  const setEmailModalStatus = (message, variant = "") => {
    const el = qe(`#${EMAIL_MODAL_STATUS_ID}`);
    if (!el) return;
    el.textContent = String(message || "");
    el.classList.toggle("is-warning", variant === "warning");
    el.classList.toggle("is-success", variant === "success");
  };
  const setEmailModalBusy = (busy) => {
    emailModalBusy = !!busy;
    if (!emailModal) return;
    if (emailModalBusy) emailModal.setAttribute("aria-busy", "true");
    else emailModal.removeAttribute("aria-busy");
    qe(`#${EMAIL_MODAL_CLOSE_ID}`)?.toggleAttribute("disabled", emailModalBusy);
    qe(`#${EMAIL_MODAL_CANCEL_ID}`)?.toggleAttribute("disabled", emailModalBusy);
    const sendBtn = qe(`#${EMAIL_MODAL_SEND_ID}`);
    if (sendBtn) sendBtn.disabled = emailModalBusy || emailAttachments.length < 1;
    const toInput = qe(`#${EMAIL_MODAL_TO_ID}`);
    if (toInput) toInput.disabled = emailModalBusy;
    const subjectInput = qe(`#${EMAIL_MODAL_SUBJECT_ID}`);
    if (subjectInput) subjectInput.disabled = emailModalBusy;
    const bodyInput = qe(`#${EMAIL_MODAL_BODY_ID}`);
    if (bodyInput) bodyInput.disabled = emailModalBusy;
  };
  const renderEmailModalAttachments = () => {
    const attachmentsEl = qe(`#${EMAIL_MODAL_ATTACHMENTS_ID}`);
    if (!attachmentsEl) return;
    attachmentsEl.innerHTML = "";
    if (!emailAttachments.length) {
      const empty = document.createElement("div");
      empty.className = "doc-bulk-export-email-modal__attachments-empty";
      empty.textContent = "Aucune piece jointe.";
      attachmentsEl.appendChild(empty);
      return;
    }
    const list = document.createElement("ul");
    list.className = "doc-bulk-export-email-modal__attachments-list";
    emailAttachments.forEach((pathValue, index) => {
      const item = document.createElement("li");
      item.className = "doc-bulk-export-email-modal__attachments-item";
      item.title = pathValue;
      const name = document.createElement("span");
      name.className = "email-compose-modal__attachment-name doc-bulk-export-email-modal__attachment-name";
      name.textContent = basenameFromPath(pathValue);
      name.title = pathValue;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "email-compose-modal__attachment-remove";
      removeBtn.dataset.docHistoryExportEmailAttachmentRemove = String(index);
      removeBtn.setAttribute("aria-label", "Retirer le fichier");
      removeBtn.title = "Retirer le fichier";
      removeBtn.innerHTML = EMAIL_REMOVE_ICON_SVG;
      item.append(name, removeBtn);
      list.appendChild(item);
    });
    attachmentsEl.appendChild(list);
  };
  const closeEmailModal = ({ restoreFocus = true, force = false } = {}) => {
    if (!emailModal || (emailModalBusy && !force)) return;
    emailModal.classList.remove("is-open");
    emailModal.hidden = true;
    emailModal.setAttribute("hidden", "");
    emailModal.setAttribute("aria-hidden", "true");
    emailModal.removeAttribute("aria-busy");
    document.removeEventListener("keydown", onEmailModalKeydown, true);
    const focusTarget = emailModalRestoreFocus;
    emailModalRestoreFocus = null;
    emailModalBusy = false;
    if (restoreFocus && focusTarget && typeof focusTarget.focus === "function") {
      try {
        focusTarget.focus();
      } catch {}
    }
  };
  function onEmailModalKeydown(evt) {
    if (evt.key !== "Escape") return;
    evt.preventDefault();
    evt.stopPropagation();
    closeEmailModal();
  }
  const handleEmailModalSend = async () => {
    if (!emailModal || emailModalBusy) return;
    const toInput = qe(`#${EMAIL_MODAL_TO_ID}`);
    const subjectInput = qe(`#${EMAIL_MODAL_SUBJECT_ID}`);
    const bodyInput = qe(`#${EMAIL_MODAL_BODY_ID}`);
    const to = normalizeEmailAddress(toInput?.value || "");
    if (!to) {
      setEmailModalStatus("Veuillez saisir un destinataire.", "warning");
      toInput?.focus?.();
      return;
    }
    if (!emailAttachments.length) {
      setEmailModalStatus("Aucune piece jointe a envoyer.", "warning");
      return;
    }
    const smtp = resolveCompanySmtpSettings();
    if (!isSmtpReady(smtp)) {
      setEmailModalStatus(
        "SMTP desactive ou incomplet. Configurez SMTP dans Donnees generales.",
        "warning"
      );
      return;
    }
    const subject = txt(subjectInput?.value) || buildExportEmailSubject();
    const body = String(bodyInput?.value || "").trim() || buildExportEmailBody();
    setEmailModalBusy(true);
    setEmailModalStatus("Envoi e-mail en cours...");
    let res = null;
    try {
      res = await API.sendSmtpEmail({
        smtp,
        message: {
          to,
          subject,
          text: body,
          attachments: emailAttachments.map((pathValue) => ({ path: pathValue }))
        }
      });
    } catch (err) {
      res = { ok: false, error: String(err?.message || err || "Envoi SMTP impossible.") };
    }
    if (res?.ok) {
      st.emailDraftTo = to;
      st.emailDraftSubject = subject;
      st.emailDraftBody = body;
      setEmailModalBusy(false);
      setEmailModalStatus("E-mail envoye.", "success");
      if (typeof w.showToast === "function") {
        w.showToast("E-mail envoye.");
      }
      closeEmailModal();
      return;
    }
    setEmailModalBusy(false);
    setEmailModalStatus(String(res?.error || "Envoi SMTP impossible."), "warning");
  };
  const ensureEmailModal = () => {
    if (emailModal) return emailModal;
    const wrapper = document.createElement("div");
    wrapper.id = EMAIL_MODAL_ID;
    wrapper.className = "swbDialog doc-bulk-export-email-modal";
    wrapper.hidden = true;
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="swbDialog__panel doc-bulk-export-email-modal__panel" role="dialog" aria-modal="true" aria-labelledby="${EMAIL_MODAL_TITLE_ID}">
        <div class="swbDialog__header">
          <div id="${EMAIL_MODAL_TITLE_ID}" class="swbDialog__title">Envoyer le fichier exporte par e-mail</div>
          <button id="${EMAIL_MODAL_CLOSE_ID}" type="button" class="swbDialog__close" aria-label="Fermer">
            ${EMAIL_REMOVE_ICON_SVG}
          </button>
        </div>
        <form id="${EMAIL_MODAL_FORM_ID}" class="swbDialog__msg doc-bulk-export-email-modal__body" novalidate>
          <label class="doc-bulk-export-email-modal__field" for="${EMAIL_MODAL_TO_ID}">
            <span>Destinataire</span>
            <input id="${EMAIL_MODAL_TO_ID}" type="email" autocomplete="off" placeholder="client@email.com" />
          </label>
          <label class="doc-bulk-export-email-modal__field" for="${EMAIL_MODAL_SUBJECT_ID}">
            <span>Objet</span>
            <input id="${EMAIL_MODAL_SUBJECT_ID}" type="text" autocomplete="off" />
          </label>
          <label class="doc-bulk-export-email-modal__field" for="${EMAIL_MODAL_BODY_ID}">
            <span>Message</span>
            <textarea id="${EMAIL_MODAL_BODY_ID}" rows="6"></textarea>
          </label>
          <div class="doc-bulk-export-email-modal__attachments-block">
            <span class="doc-bulk-export-email-modal__attachments-title">Pieces jointes</span>
            <div id="${EMAIL_MODAL_ATTACHMENTS_ID}" class="doc-bulk-export-email-modal__attachments"></div>
          </div>
          <p id="${EMAIL_MODAL_STATUS_ID}" class="doc-bulk-export-email-modal__status" aria-live="polite"></p>
        </form>
        <div class="swbDialog__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="${EMAIL_MODAL_CANCEL_ID}" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="${EMAIL_MODAL_SEND_ID}" type="submit" form="${EMAIL_MODAL_FORM_ID}" class="swbDialog__ok">Envoyer</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    emailModal = wrapper;
    if (emailModal.dataset.bound !== "1") {
      emailModal.dataset.bound = "1";
      qe(`#${EMAIL_MODAL_CLOSE_ID}`)?.addEventListener("click", () => closeEmailModal());
      qe(`#${EMAIL_MODAL_CANCEL_ID}`)?.addEventListener("click", () => closeEmailModal());
      qe(`#${EMAIL_MODAL_FORM_ID}`)?.addEventListener("submit", (evt) => {
        evt.preventDefault();
        void handleEmailModalSend();
      });
      qe(`#${EMAIL_MODAL_ATTACHMENTS_ID}`)?.addEventListener("click", (evt) => {
        if (emailModalBusy) return;
        const removeBtn = evt.target?.closest?.("[data-doc-history-export-email-attachment-remove]");
        if (!removeBtn) return;
        evt.preventDefault();
        const idx = Number.parseInt(
          String(removeBtn.dataset.docHistoryExportEmailAttachmentRemove || ""),
          10
        );
        if (!Number.isFinite(idx) || idx < 0 || idx >= emailAttachments.length) return;
        emailAttachments.splice(idx, 1);
        renderEmailModalAttachments();
        setEmailModalBusy(false);
        if (!emailAttachments.length) {
          setEmailModalStatus("Aucune piece jointe a envoyer.", "warning");
        }
      });
      emailModal.addEventListener("click", (evt) => {
        if (evt.target === emailModal) {
          evt.stopPropagation();
        }
      });
    }
    return emailModal;
  };
  const openEmailModal = (trigger = null) => {
    const path = txt(st.exportPath);
    if (!path) return;
    ensureEmailModal();
    emailAttachments = [path];
    emailModalRestoreFocus =
      trigger && typeof trigger.focus === "function"
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    const toInput = qe(`#${EMAIL_MODAL_TO_ID}`);
    const subjectInput = qe(`#${EMAIL_MODAL_SUBJECT_ID}`);
    const bodyInput = qe(`#${EMAIL_MODAL_BODY_ID}`);
    if (toInput) {
      toInput.value = st.emailDraftTo || findDefaultRecipientEmail();
    }
    if (subjectInput) {
      subjectInput.value = st.emailDraftSubject || buildExportEmailSubject();
    }
    if (bodyInput) {
      bodyInput.value = st.emailDraftBody || buildExportEmailBody();
    }
    renderEmailModalAttachments();
    setEmailModalBusy(false);
    const smtpReady = isSmtpReady(resolveCompanySmtpSettings());
    setEmailModalStatus(
      smtpReady
        ? "Verifiez les champs puis cliquez sur Envoyer."
        : "SMTP desactive ou incomplet. Configurez SMTP avant l'envoi.",
      smtpReady ? "" : "warning"
    );
    emailModal.hidden = false;
    emailModal.removeAttribute("hidden");
    emailModal.setAttribute("aria-hidden", "false");
    emailModal.classList.add("is-open");
    document.addEventListener("keydown", onEmailModalKeydown, true);
    toInput?.focus?.();
  };
  const resolveDocType = (v, fb = "facture") => {
    const s = txt(v).toLowerCase();
    if (!s) return fb;
    const alias = {
      factureachat: "fa",
      "facture-achat": "fa",
      "facture_achat": "fa",
      "facture d'achat": "fa",
      factureavoir: "avoir",
      "facture-avoir": "avoir",
      "facture_avoir": "avoir",
      "facture d'avoir": "avoir",
      bonlivraison: "bl",
      "bon-livraison": "bl"
    };
    const n = alias[s] || s;
    return DOC_LABELS[n] ? n : fb;
  };
  const inRange = (v, start, end) => {
    const d = parseDate(v);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };
  const pickEntryDate = (e = {}) => {
    const cands = [e.date, e.savedAt, e.createdAt, e.modifiedAt];
    for (const c of cands) {
      const d = parseDate(c);
      if (d) return d;
    }
    return "";
  };
  const scalar = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (v instanceof Date) return toIso(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };
  const flatten = (val, path, out, depth = 0) => {
    if (depth > 10) {
      if (path) out[path] = scalar(val);
      return;
    }
    if (val === null || val === undefined) {
      if (path) out[path] = "";
      return;
    }
    if (Array.isArray(val)) {
      if (!path) return;
      if (!val.length) {
        out[path] = "";
        return;
      }
      const simple = val.every((x) => x == null || ["string", "number", "boolean"].includes(typeof x));
      out[path] = simple ? val.map((x) => scalar(x)).join(", ") : scalar(val);
      return;
    }
    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (!keys.length) {
        if (path) out[path] = "";
        return;
      }
      keys.forEach((k) => flatten(val[k], path ? `${path}.${k}` : k, out, depth + 1));
      return;
    }
    if (path) out[path] = scalar(val);
  };
  const human = (s) => {
    const n = String(s || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim();
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
  };
  const translateSegment = (segment) => {
    const raw = String(segment || "").trim();
    if (!raw) return "";
    const direct =
      FIELD_SEGMENT_OVERRIDES[raw] ||
      FIELD_SEGMENT_OVERRIDES[raw.toLowerCase()] ||
      null;
    if (direct) return direct;
    const words = human(raw).split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const translated = words.map((word) => {
      const lower = word.toLowerCase();
      return FIELD_WORD_OVERRIDES[lower] || word;
    });
    const joined = translated.join(" ").trim();
    return joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : human(raw);
  };
  const fieldLabel = (k) => {
    if (LABEL_OVERRIDES[k]) return LABEL_OVERRIDES[k];
    const parts = String(k || "").split(".").filter(Boolean).map((p) => translateSegment(p));
    return parts.length ? parts.join(" / ") : k;
  };
  const fieldGroupFromKey = (key) => {
    const root = String(key || "").split(".")[0].trim().toLowerCase();
    if (!root) return "other";
    if (FIELD_GROUP_LABELS[root]) return root;
    if (["entry", "client", "company", "totals", "items", "meta"].includes(root)) return root;
    return "other";
  };
  const fieldGroupLabel = (group) => {
    const g = String(group || "").trim().toLowerCase();
    return FIELD_GROUP_LABELS[g] || translateSegment(g) || FIELD_GROUP_LABELS.other;
  };
  const fieldGroupOrder = (group) => {
    const g = String(group || "").trim().toLowerCase();
    const idx = FIELD_GROUP_ORDER.indexOf(g);
    return idx >= 0 ? idx : FIELD_GROUP_ORDER.length + 100;
  };
  const metaFieldTabFromKey = (key) => {
    const raw = String(key || "").trim();
    if (!raw.startsWith("meta.")) return "other";
    const tail = raw.slice(5);
    const first = String(tail.split(".")[0] || "").trim().toLowerCase();
    if (!first) return "other";
    if (first === "acompte") return "acompte";
    if (first === "articlefieldlabels") return "article-field-labels";
    if (first === "columns" || first === "modelcolumns") return "columns";
    if (first === "addform") return "add-form";
    if (first === "extras") return "extras";
    if (first === "financing") return "financing";
    if (first === "withholding" || first === "whcreated" || first === "whref") return "withholding";
    if (
      first.startsWith("payment") ||
      first.startsWith("reglement")
    ) return "reglement-payment";
    if (
      first === "number" ||
      first === "numberformat" ||
      first === "numberlength" ||
      first === "numberprefix" ||
      first === "numberyear" ||
      first === "previewnumber" ||
      first === "reference"
    ) return "numbering";
    if (
      first === "doctype" ||
      first === "doctypes" ||
      first === "date" ||
      first === "due" ||
      first === "status" ||
      first === "currency" ||
      first === "template" ||
      first === "mode" ||
      first === "documentmodelname" ||
      first === "docdialogmodelname" ||
      first === "modelkey" ||
      first === "modelname" ||
      first === "historydoctype" ||
      first === "historypath" ||
      first === "historystatus" ||
      first === "fiscalyear" ||
      first === "convertedfrom" ||
      first === "taxesenabled" ||
      first === "stockadjusted" ||
      first === "operationtype" ||
      first === "operationcategory" ||
      first === "operation_type" ||
      first === "operation_category" ||
      first === "codeacte" ||
      first === "acte" ||
      first === "actedepot" ||
      first === "cnpc" ||
      first === "pcharge" ||
      first === "p_charge" ||
      first === "itemsheadercolor" ||
      first === "noteinterne" ||
      first === "__pdfpreviewstrict" ||
      first === "xml"
    ) return "general";
    return "other";
  };
  const metaFieldTabLabel = (tab) => {
    const t = String(tab || "").trim().toLowerCase();
    return META_FIELD_TAB_LABELS[t] || META_FIELD_TAB_LABELS.other;
  };
  const metaFieldTabOrder = (tab) => {
    const t = String(tab || "").trim().toLowerCase();
    const idx = META_FIELD_TAB_ORDER.indexOf(t);
    return idx >= 0 ? idx : META_FIELD_TAB_ORDER.length + 100;
  };
  const normFieldLabel = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
  const fieldId = (k) => (String(k || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "field");
  const COMPANY_FIELD_KEY_PRIORITY = [
    "company.type",
    "company.name",
    "company.vat",
    "company.iban",
    "company.phone",
    "company.email",
    "company.address",
    "company.fax"
  ];
  const CLIENT_FIELD_KEY_PRIORITY = [
    "client.name",
    "client.vat",
    "client.type",
    "client.phone",
    "client.address"
  ];
  const COMPANY_FIELD_KEY_PRIORITY_INDEX = new Map(
    COMPANY_FIELD_KEY_PRIORITY.map((key, index) => [key, index])
  );
  const CLIENT_FIELD_KEY_PRIORITY_INDEX = new Map(
    CLIENT_FIELD_KEY_PRIORITY.map((key, index) => [key, index])
  );
  const TOTALS_FIELD_KEY_PRIORITY = [
    "totals.tax",
    "totals.fodecBaseHT",
    "totals.fodecRates",
    "totals.tvaRates",
    "totals.fodecAmount",
    "totals.tvaBaseHT",
    "totals.tvaAmount"
  ];
  const TOTALS_FIELD_KEY_PRIORITY_INDEX = new Map(
    TOTALS_FIELD_KEY_PRIORITY.map((key, index) => [String(key).toLowerCase(), index])
  );
  const DEFAULT_CHECKED_FIELD_KEYS = new Set([
    "totals.fodecBaseHT",
    "totals.tvaBaseHT",
    "totals.fodecRates",
    "totals.tvaRates",
    "totals.fodecAmount",
    "totals.tvaAmount"
  ].map((key) => String(key).toLowerCase()));
  const STEP3_PREVIEW_TOTALS_KEY_ORDER = [
    "totals.fodecBaseHT",
    "totals.fodecRates",
    "totals.fodecAmount",
    "totals.tvaBaseHT",
    "totals.tvaRates",
    "totals.tvaAmount"
  ];
  const STEP3_PREVIEW_TOTALS_KEY_ORDER_INDEX = new Map(
    STEP3_PREVIEW_TOTALS_KEY_ORDER.map((key, index) => [String(key).toLowerCase(), index])
  );
  const TVA_RATES_FIELD_KEY = "totals.tvaRates";
  const TVA_RATES_FIELD_KEY_LOWER = TVA_RATES_FIELD_KEY.toLowerCase();
  const TVA_AMOUNT_FIELD_KEY = "totals.tvaAmount";
  const TVA_BREAKDOWN_FIELD_KEY = "totals.tvaBreakdown";
  const TVA_RATE_COLUMN_KEY_PREFIX = "__docExportTvaRate__";
  const ENTRY_STATUS_FIELD_KEY = "entry.status";
  const ENTRY_STATUS_FIELD_KEY_LOWER = ENTRY_STATUS_FIELD_KEY.toLowerCase();
  const ENTRY_STATUS_LABEL_BY_SLUG = new Map([
    ["payee", "Pay\u00e9e"],
    ["partiellement-payee", "Partiellement pay\u00e9e"],
    ["impayee", "Impay\u00e9e"]
  ]);
  const sortFieldsByLabel = (fields = []) =>
    [...fields].sort((a, b) => {
      const l = String(a?.label || "").localeCompare(String(b?.label || ""), "fr", { sensitivity: "base" });
      if (l !== 0) return l;
      return String(a?.key || "").localeCompare(String(b?.key || ""), "fr", { sensitivity: "base" });
    });
  const sortCompanyFieldsForPanel = (fields = []) =>
    [...fields].sort((a, b) => {
      const keyA = String(a?.key || "").toLowerCase();
      const keyB = String(b?.key || "").toLowerCase();
      const rankA = COMPANY_FIELD_KEY_PRIORITY_INDEX.has(keyA)
        ? COMPANY_FIELD_KEY_PRIORITY_INDEX.get(keyA)
        : Number.MAX_SAFE_INTEGER;
      const rankB = COMPANY_FIELD_KEY_PRIORITY_INDEX.has(keyB)
        ? COMPANY_FIELD_KEY_PRIORITY_INDEX.get(keyB)
        : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      const byLabel = String(a?.label || "").localeCompare(String(b?.label || ""), "fr", { sensitivity: "base" });
      if (byLabel !== 0) return byLabel;
      return String(a?.key || "").localeCompare(String(b?.key || ""), "fr", { sensitivity: "base" });
    });
  const sortClientFieldsForPanel = (fields = []) =>
    [...fields].sort((a, b) => {
      const keyA = String(a?.key || "").toLowerCase();
      const keyB = String(b?.key || "").toLowerCase();
      const rankA = CLIENT_FIELD_KEY_PRIORITY_INDEX.has(keyA)
        ? CLIENT_FIELD_KEY_PRIORITY_INDEX.get(keyA)
        : Number.MAX_SAFE_INTEGER;
      const rankB = CLIENT_FIELD_KEY_PRIORITY_INDEX.has(keyB)
        ? CLIENT_FIELD_KEY_PRIORITY_INDEX.get(keyB)
        : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      const byLabel = String(a?.label || "").localeCompare(String(b?.label || ""), "fr", { sensitivity: "base" });
      if (byLabel !== 0) return byLabel;
      return String(a?.key || "").localeCompare(String(b?.key || ""), "fr", { sensitivity: "base" });
    });
  const sortTotalsFieldsForPanel = (fields = []) =>
    [...fields].sort((a, b) => {
      const keyA = String(a?.key || "").toLowerCase();
      const keyB = String(b?.key || "").toLowerCase();
      const rankA = TOTALS_FIELD_KEY_PRIORITY_INDEX.has(keyA)
        ? TOTALS_FIELD_KEY_PRIORITY_INDEX.get(keyA)
        : Number.MAX_SAFE_INTEGER;
      const rankB = TOTALS_FIELD_KEY_PRIORITY_INDEX.has(keyB)
        ? TOTALS_FIELD_KEY_PRIORITY_INDEX.get(keyB)
        : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      const byLabel = String(a?.label || "").localeCompare(String(b?.label || ""), "fr", { sensitivity: "base" });
      if (byLabel !== 0) return byLabel;
      return String(a?.key || "").localeCompare(String(b?.key || ""), "fr", { sensitivity: "base" });
    });
  const getFieldTabDefs = () => {
    const map = new Map();
    st.fields.forEach((field) => {
      const key = field.group || "other";
      if (key === "meta") {
        const metaTabKey = String(field?.metaTab || metaFieldTabFromKey(field?.key) || "")
          .trim()
          .toLowerCase();
        if (EXCLUDED_META_FIELD_TABS.has(metaTabKey)) return;
      }
      if (!map.has(key)) {
        map.set(key, { key, label: fieldGroupLabel(key), count: 0 });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => {
      const orderDiff = fieldGroupOrder(a.key) - fieldGroupOrder(b.key);
      if (orderDiff !== 0) return orderDiff;
      return a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
    });
  };
  const getActiveFieldTab = () => {
    const tabs = getFieldTabDefs();
    if (!tabs.length) return "";
    if (!tabs.some((tab) => tab.key === st.fieldsTab)) {
      st.fieldsTab = tabs[0].key;
    }
    return st.fieldsTab;
  };
  const getActiveTabFields = () => {
    const active = getActiveFieldTab();
    if (!active) return [];
    return st.fields.filter((field) => {
      const group = field.group || "other";
      if (group !== active) return false;
      if (group !== "meta") return true;
      const metaTabKey = String(field?.metaTab || metaFieldTabFromKey(field?.key) || "")
        .trim()
        .toLowerCase();
      return !EXCLUDED_META_FIELD_TABS.has(metaTabKey);
    });
  };
  const getMetaFieldTabDefs = (fields = []) => {
    const map = new Map();
    fields.forEach((field) => {
      const key = field.metaTab || metaFieldTabFromKey(field.key);
      if (EXCLUDED_META_FIELD_TABS.has(key)) return;
      if (!map.has(key)) map.set(key, { key, label: metaFieldTabLabel(key), count: 0 });
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => {
      const orderDiff = metaFieldTabOrder(a.key) - metaFieldTabOrder(b.key);
      if (orderDiff !== 0) return orderDiff;
      return a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
    });
  };
  const isExcludedExportFieldKey = (key) => {
    const k = String(key || "");
    if (!k) return true;
    if (EXCLUDED_EXPORT_FIELD_KEYS.has(k)) return true;
    return EXCLUDED_EXPORT_FIELD_KEY_PREFIXES.some((prefix) => k.startsWith(prefix));
  };
  const getActiveMetaFieldTab = (fields = []) => {
    const tabs = getMetaFieldTabDefs(fields);
    if (!tabs.length) return "";
    if (!tabs.some((tab) => tab.key === st.metaFieldsTab)) {
      st.metaFieldsTab = tabs[0].key;
    }
    return st.metaFieldsTab;
  };
  const csvEscape = (v) => {
    const t = scalar(v);
    if (!t) return "";
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const setBusy = (busy) => {
    st.busy = !!busy;
    if (!modal) return;
    modal.setAttribute("aria-busy", busy ? "true" : "false");
    modal.querySelectorAll("button, input, select").forEach((el) => {
      const allow =
        el.id === "docHistoryExportModalCancel" ||
        el.classList?.contains("swbDialog__close");
      el.disabled = busy && !allow;
    });
    const presetMenu = q("#docHistoryExportPresetMenu");
    const formatMenu = q("#articlesExportFormatMenu");
    if (presetMenu) presetMenu.style.pointerEvents = busy ? "none" : "";
    if (formatMenu) formatMenu.style.pointerEvents = busy ? "none" : "";
    if (!busy) {
      renderClientSelectionPanel();
      updateResult();
    }
  };

  const closeModal = () => {
    closeEmailModal({ restoreFocus: false, force: true });
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydown);
    if (restoreFocus && typeof restoreFocus.focus === "function") {
      try {
        restoreFocus.focus();
      } catch {}
    }
  };
  const onKeydown = (evt) => {
    if (evt.key !== "Escape") return;
    evt.preventDefault();
    if (emailModal && !emailModal.hidden) {
      closeEmailModal();
      return;
    }
    closeModal();
  };

  const getSelectedFields = () => st.fields.filter((f) => f.checked);
  const isSpecificClientMode = () => st.clientMode === "specific";
  const isSupplierSelectionDocType = () =>
    resolveDocType(st.docType, "facture") === "fa";
  const hasClientSelectionStep = () => true;
  const isSpecificClientSelectionEnabled = () =>
    hasClientSelectionStep() && isSpecificClientMode();
  const currentClientSelectionLabels = () => {
    const suppliers = isSupplierSelectionDocType();
    return {
      singular: suppliers ? "fournisseur" : "client",
      plural: suppliers ? "fournisseurs" : "clients",
      title: suppliers
        ? "Selectionnez les fournisseurs a inclure dans l'export."
        : "Selectionnez les clients a inclure dans l'export.",
      modeGroupAria: suppliers
        ? "Selection des fournisseurs"
        : "Selection des clients",
      panelAria: suppliers
        ? "Fournisseurs a exporter"
        : "Clients a exporter",
      tabsAria: suppliers
        ? "Filtrer les fournisseurs par type"
        : "Filtrer les clients par type",
      allModeLabel: suppliers
        ? "Tous les fournisseurs"
        : "Tous les clients",
      specificModeLabel: suppliers
        ? "Selectionner des fournisseurs"
        : "Selectionner des clients"
    };
  };
  const CLIENT_ENTITY_TYPE_LABELS = {
    client: "Clients",
    fournisseur: "Fournisseurs"
  };
  const CLIENT_PROFILE_TYPE_LABELS = {
    personne_physique: "Personne physique",
    personne_morale: "Personne morale"
  };
  const normalizeClientSelectionValue = (value) =>
    txt(value)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const normalizeClientEntityType = (value, docType = "") => {
    const normalized = normalizeClientSelectionValue(value).replace(/[_-]+/g, "_");
    if (["fournisseur", "fournisseurs", "vendor", "supplier"].includes(normalized)) {
      return "fournisseur";
    }
    if (["client", "clients", "customer"].includes(normalized)) {
      return "client";
    }
    const normalizedDocType = resolveDocType(docType, "").toLowerCase();
    if (normalizedDocType === "fa") return "fournisseur";
    return normalizedDocType ? "client" : "";
  };
  const normalizeClientProfileType = (value) => {
    const normalized = normalizeClientSelectionValue(value).replace(/[_-]+/g, "_");
    if (!normalized) return "";
    if (
      [
        "personne_physique",
        "personnephysique",
        "particulier",
        "individual"
      ].includes(normalized)
    ) {
      return "personne_physique";
    }
    if (
      [
        "personne_morale",
        "personnemorale",
        "societe",
        "entreprise",
        "company"
      ].includes(normalized)
    ) {
      return "personne_morale";
    }
    return normalized;
  };
  const clientEntityTypeLabel = (key) =>
    CLIENT_ENTITY_TYPE_LABELS[key] || human(String(key || "").replace(/_/g, " "));
  const clientProfileTypeLabel = (key) =>
    CLIENT_PROFILE_TYPE_LABELS[key] || human(String(key || "").replace(/_/g, " "));
  const clientSelectionContextKey = () =>
    `${resolveDocType(st.docType, "facture")}|${st.startDate}|${st.endDate}`;
  const clientSelectionMetaFromEntry = (entry = {}) => {
    const name = txt(entry?.clientName);
    const account = txt(entry?.clientAccount);
    const normName = normalizeClientSelectionValue(name);
    const normAccount = normalizeClientSelectionValue(account);
    const key = `${normName}|${normAccount}`;
    let label = "Client non renseigne";
    if (name && account && normName !== normAccount) label = `${name} (${account})`;
    else if (name || account) label = name || account;
    const entityType = normalizeClientEntityType(entry?.clientEntityType, entry?.docType);
    const profileType = normalizeClientProfileType(entry?.clientType);
    return { key, label, entityType, profileType };
  };
  const getClientTypeTabsForPanel = () => {
    const totalCount = st.clientOptions.reduce(
      (sum, option) => sum + Math.max(1, Number(option?.count) || 0),
      0
    );
    const entityCounts = new Map();
    const profileCounts = new Map();
    st.clientOptions.forEach((option) => {
      const count = Math.max(1, Number(option?.count) || 0);
      const entity = txt(option?.entityType);
      const profile = txt(option?.profileType);
      if (entity) entityCounts.set(entity, (entityCounts.get(entity) || 0) + count);
      if (profile) profileCounts.set(profile, (profileCounts.get(profile) || 0) + count);
    });
    const tabs = [{ key: "all", label: "Tous", count: totalCount }];
    let mode = "none";
    if (entityCounts.size > 1) {
      mode = "entity";
      const orderedKeys = [
        ...["client", "fournisseur"].filter((key) => entityCounts.has(key)),
        ...Array.from(entityCounts.keys())
          .filter((key) => !["client", "fournisseur"].includes(key))
          .sort((a, b) => clientEntityTypeLabel(a).localeCompare(clientEntityTypeLabel(b), "fr", { sensitivity: "base" }))
      ];
      orderedKeys.forEach((key) => {
        tabs.push({
          key,
          label: clientEntityTypeLabel(key),
          count: entityCounts.get(key) || 0
        });
      });
    } else if (profileCounts.size > 1) {
      mode = "profile";
      const orderedKeys = [
        ...["personne_physique", "personne_morale"].filter((key) => profileCounts.has(key)),
        ...Array.from(profileCounts.keys())
          .filter((key) => !["personne_physique", "personne_morale"].includes(key))
          .sort((a, b) => clientProfileTypeLabel(a).localeCompare(clientProfileTypeLabel(b), "fr", { sensitivity: "base" }))
      ];
      orderedKeys.forEach((key) => {
        tabs.push({
          key,
          label: clientProfileTypeLabel(key),
          count: profileCounts.get(key) || 0
        });
      });
    }
    return { mode, tabs };
  };
  const getActiveClientTypeTab = (tabs = []) => {
    if (!Array.isArray(tabs) || !tabs.length) {
      st.clientTypeTab = "all";
      return st.clientTypeTab;
    }
    if (!tabs.some((tab) => tab.key === st.clientTypeTab)) st.clientTypeTab = tabs[0].key;
    return st.clientTypeTab;
  };
  const getVisibleClientOptionsForPanel = ({ mode = "none", activeTab = "all" } = {}) => {
    if (activeTab === "all" || mode === "none") return st.clientOptions;
    if (mode === "entity") return st.clientOptions.filter((option) => option.entityType === activeTab);
    if (mode === "profile") return st.clientOptions.filter((option) => option.profileType === activeTab);
    return st.clientOptions;
  };
  const selectedClientKeysFromState = () =>
    st.clientOptions
      .filter((option) => option.checked !== false)
      .map((option) => option.key);
  const setClientTypeTab = (value, { focus = false } = {}) => {
    if (!isSpecificClientSelectionEnabled()) {
      st.clientTypeTab = "all";
      st.clientOptionsPage = 0;
      renderClientSelectionPanel();
      return;
    }
    const tabs = getClientTypeTabsForPanel().tabs;
    if (!tabs.length) {
      st.clientTypeTab = "all";
      st.clientOptionsPage = 0;
      renderClientSelectionPanel();
      return;
    }
    const next = tabs.find((tab) => tab.key === value)?.key || tabs[0].key;
    st.clientTypeTab = next;
    st.clientOptionsPage = 0;
    renderClientSelectionPanel();
    validateStep1(true);
    updateButtons();
    if (focus) q(`#docHistoryExportClientTypeTab-${fieldId(next)}`)?.focus?.();
  };
  const onClientTypeTabsKeydown = (evt) => {
    if (!isSpecificClientSelectionEnabled()) return;
    const key = String(evt.key || "");
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) return;
    const tabs = Array.from(
      modal?.querySelectorAll("[data-doc-export-client-type-tab]") || []
    );
    if (!tabs.length) return;
    const current = evt.target?.closest?.("[data-doc-export-client-type-tab]");
    const index = tabs.indexOf(current);
    if (index < 0) return;
    let nextIndex = index;
    if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = tabs.length - 1;
    evt.preventDefault();
    const target = tabs[nextIndex];
    if (!target) return;
    setClientTypeTab(target.dataset.docExportClientTypeTab || "all", { focus: true });
  };
  const syncClientOptionsFromUi = () => {
    st.clientOptions.forEach((option) => {
      const input = q(`#docExportClient-${fieldId(option.key)}`);
      if (input) option.checked = !!input.checked;
    });
  };
  const renderClientSelectionPanel = () => {
    const labels = currentClientSelectionLabels();
    const selectionGroup = q("#docHistoryExportClientSelectionGroup");
    const title = q("#docHistoryExportClientSelectionTitle");
    const modeGroup = q("#docHistoryExportClientModeGroup");
    const allModeBtn = q('[data-doc-export-client-mode="all"]');
    const specificModeBtn = q('[data-doc-export-client-mode="specific"]');
    const showSelection = hasClientSelectionStep();
    if (title) title.textContent = labels.title;
    if (modeGroup) modeGroup.setAttribute("aria-label", labels.modeGroupAria);
    if (allModeBtn) allModeBtn.textContent = labels.allModeLabel;
    if (specificModeBtn) specificModeBtn.textContent = labels.specificModeLabel;
    modal?.querySelectorAll("[data-doc-export-client-mode]").forEach((btn) => {
      const on = btn.dataset.docExportClientMode === st.clientMode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const panel = q("#docHistoryExportClientPanel");
    const tabsRoot = q("#docHistoryExportClientTypeTabs");
    const options = q("#docHistoryExportClientOptions");
    const clientHint = q("#docHistoryExportClientHint");
    if (selectionGroup) {
      selectionGroup.hidden = !showSelection;
      selectionGroup.setAttribute("aria-hidden", showSelection ? "false" : "true");
    }
    if (panel) panel.setAttribute("aria-label", labels.panelAria);
    if (tabsRoot) tabsRoot.setAttribute("aria-label", labels.tabsAria);
    if (!panel || !options) return;
    options.textContent = "";
    if (clientHint) {
      clientHint.textContent = "";
      clientHint.hidden = true;
    }
    if (tabsRoot) {
      tabsRoot.textContent = "";
      tabsRoot.hidden = true;
      tabsRoot.setAttribute("aria-hidden", "true");
    }
    if (!showSelection) {
      st.clientMode = "all";
      st.clientTypeTab = "all";
      st.clientOptionsPage = 0;
      panel.hidden = true;
      panel.setAttribute("hidden", "");
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("aria-disabled", "true");
      panel.classList.add("is-disabled");
      return;
    }
    const interactive = isSpecificClientMode();
    panel.hidden = false;
    panel.removeAttribute("hidden");
    panel.setAttribute("aria-hidden", "false");
    panel.setAttribute("aria-disabled", interactive ? "false" : "true");
    panel.classList.toggle("is-disabled", !interactive);
    if (st.clientOptionsLoading) {
      const p = document.createElement("p");
      p.className = "doc-export-wizard__empty";
      p.textContent = `Chargement des ${labels.plural}...`;
      options.appendChild(p);
      return;
    }
    if (st.clientOptionsError) {
      const p = document.createElement("p");
      p.className = "doc-export-wizard__empty";
      p.textContent = st.clientOptionsError;
      options.appendChild(p);
      return;
    }
    if (!st.clientOptions.length && interactive && clientHint) {
      clientHint.textContent = `Aucun ${labels.singular} trouve pour la selection courante.`;
      clientHint.hidden = false;
    }
    const tabsMeta = getClientTypeTabsForPanel();
    let activeTypeTab = getActiveClientTypeTab(tabsMeta.tabs);
    if (!interactive) {
      st.clientTypeTab = "all";
      activeTypeTab = "all";
    }
    if (tabsRoot && tabsMeta.tabs.length > 0) {
      tabsRoot.hidden = false;
      tabsRoot.setAttribute("aria-hidden", "false");
      tabsMeta.tabs.forEach((tab) => {
        const isActive = tab.key === activeTypeTab;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = `docHistoryExportClientTypeTab-${fieldId(tab.key)}`;
        btn.className = `doc-export-wizard__client-type-tab${isActive ? " is-active" : ""}`;
        btn.dataset.docExportClientTypeTab = tab.key;
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-controls", "docHistoryExportClientOptions");
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.disabled = !interactive;
        btn.setAttribute("aria-disabled", interactive ? "false" : "true");
        btn.tabIndex = interactive ? (isActive ? 0 : -1) : -1;
        btn.textContent = `${tab.label} (${tab.count})`;
        tabsRoot.appendChild(btn);
      });
    }
    const visibleOptions = interactive
      ? getVisibleClientOptionsForPanel({
        mode: tabsMeta.mode,
        activeTab: activeTypeTab
      })
      : st.clientOptions;
    if (!visibleOptions.length && interactive && clientHint) {
      clientHint.textContent = st.clientOptions.length
        ? `Aucun ${labels.singular} disponible pour ce type.`
        : `Aucun ${labels.singular} trouve pour la selection courante.`;
      clientHint.hidden = false;
    }
    const totalPages = Math.max(
      1,
      Math.ceil(visibleOptions.length / CLIENT_OPTIONS_PAGE_SIZE)
    );
    if (!Number.isFinite(st.clientOptionsPage)) st.clientOptionsPage = 0;
    st.clientOptionsPage = Math.max(
      0,
      Math.min(st.clientOptionsPage, totalPages - 1)
    );
    const pageStart = st.clientOptionsPage * CLIENT_OPTIONS_PAGE_SIZE;
    const pageOptions = visibleOptions.slice(
      pageStart,
      pageStart + CLIENT_OPTIONS_PAGE_SIZE
    );

    const listWrap = document.createElement("div");
    listWrap.className = "doc-export-wizard__client-options-list";
    options.appendChild(listWrap);

    pageOptions.forEach((option) => {
      const label = document.createElement("label");
      label.className = `toggle-option${interactive ? "" : " is-disabled"}`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "col-toggle";
      input.dataset.docExportClientKey = option.key;
      input.id = `docExportClient-${fieldId(option.key)}`;
      const checked = interactive ? option.checked !== false : true;
      input.checked = checked;
      input.defaultChecked = checked;
      input.toggleAttribute("checked", checked);
      input.disabled = !interactive;
      input.setAttribute("aria-disabled", interactive ? "false" : "true");
      input.setAttribute("aria-label", `Inclure le ${labels.singular} ${option.label}`);
      const span = document.createElement("span");
      span.className = "model-save-dot";
      span.textContent = `${option.label} (${option.count})`;
      label.appendChild(input);
      label.appendChild(span);
      listWrap.appendChild(label);
    });

    const pager = document.createElement("div");
    pager.className = "doc-export-wizard__client-pagination";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "doc-export-wizard__client-page-btn doc-export-wizard__client-page-btn--prev";
    prevBtn.dataset.docExportClientPage = "prev";
    prevBtn.setAttribute("aria-label", "Page precedente");
    prevBtn.innerHTML = `<span class="doc-export-wizard__client-page-icon doc-export-wizard__client-page-icon--prev" aria-hidden="true">${CLIENT_PAGE_ICON_SVG}</span>`;
    const prevDisabled = st.clientOptionsPage <= 0;
    prevBtn.disabled = prevDisabled;
    prevBtn.setAttribute("aria-disabled", prevDisabled ? "true" : "false");

    const pageLabel = document.createElement("span");
    pageLabel.className = "doc-export-wizard__client-page-indicator";
    pageLabel.textContent = `${st.clientOptionsPage + 1}/${totalPages}`;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "doc-export-wizard__client-page-btn doc-export-wizard__client-page-btn--next";
    nextBtn.dataset.docExportClientPage = "next";
    nextBtn.setAttribute("aria-label", "Page suivante");
    nextBtn.innerHTML = `<span class="doc-export-wizard__client-page-icon doc-export-wizard__client-page-icon--next" aria-hidden="true">${CLIENT_PAGE_ICON_SVG}</span>`;
    const nextDisabled = st.clientOptionsPage >= totalPages - 1;
    nextBtn.disabled = nextDisabled;
    nextBtn.setAttribute("aria-disabled", nextDisabled ? "true" : "false");

    pager.appendChild(prevBtn);
    pager.appendChild(pageLabel);
    pager.appendChild(nextBtn);
    options.appendChild(pager);
  };
  const setClientMode = (value) => {
    st.clientMode =
      hasClientSelectionStep() && value === "specific" ? "specific" : "all";
    st.clientOptionsPage = 0;
    if (!isSpecificClientMode()) {
      st.clientTypeTab = "all";
      st.clientOptionsLoading = false;
      st.clientOptionsError = "";
    }
    renderClientSelectionPanel();
    validateStep1(true);
    updateButtons();
  };
  const invalidateClientOptions = () => {
    clientOptionsLoadToken += 1;
    st.clientTypeTab = "all";
    st.clientOptionsPage = 0;
    st.clientOptionsContext = "";
    st.clientOptionsLoading = false;
    st.clientOptionsError = "";
    st.clientOptions = [];
    renderClientSelectionPanel();
  };
  const loadClientOptions = async ({ force = false } = {}) => {
    validateStep1(false);
    const labels = currentClientSelectionLabels();
    if (!hasClientSelectionStep()) {
      st.clientOptionsContext = "";
      st.clientOptions = [];
      st.clientOptionsLoading = false;
      st.clientOptionsError = "";
      renderClientSelectionPanel();
      updateButtons();
      return;
    }
    const contextKey = clientSelectionContextKey();
    if (!force && st.clientOptionsContext === contextKey && !st.clientOptionsError) return;
    if (!st.startDate || !st.endDate) {
      st.clientOptionsContext = "";
      st.clientOptions = [];
      st.clientOptionsError = isSpecificClientSelectionEnabled()
        ? `Renseignez d'abord une periode valide pour charger les ${labels.plural}.`
        : "";
      renderClientSelectionPanel();
      return;
    }
    const previousChecked = new Map(
      st.clientOptions.map((option) => [option.key, option.checked !== false])
    );
    const hadPrevious = previousChecked.size > 0;
    const hadAllSelected =
      hadPrevious && Array.from(previousChecked.values()).every((value) => value);
    const requestToken = clientOptionsLoadToken + 1;
    clientOptionsLoadToken = requestToken;
    st.clientOptionsLoading = true;
    st.clientOptionsError = "";
    renderClientSelectionPanel();
    updateButtons();
    try {
      const docType = resolveDocType(st.docType, "facture");
      const entries = await fetchAllDocs(docType);
      if (requestToken !== clientOptionsLoadToken) return;
      const filtered = entries.filter((entry) => {
        const d =
          pickEntryDate(entry) ||
          parseDate(entry?.date) ||
          parseDate(entry?.createdAt) ||
          parseDate(entry?.modifiedAt);
        return inRange(d, st.startDate, st.endDate);
      });
      const grouped = new Map();
      filtered.forEach((entry) => {
        const meta = clientSelectionMetaFromEntry(entry);
        const current = grouped.get(meta.key);
        if (current) {
          current.count += 1;
          if (!current.entityType && meta.entityType) current.entityType = meta.entityType;
          if (!current.profileType && meta.profileType) current.profileType = meta.profileType;
          return;
        }
        grouped.set(meta.key, {
          key: meta.key,
          label: meta.label,
          count: 1,
          entityType: meta.entityType,
          profileType: meta.profileType
        });
      });
      const options = Array.from(grouped.values()).sort((a, b) =>
        a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
      );
      st.clientOptions = options.map((option) => {
        const fromPrevious = previousChecked.get(option.key);
        const checked = hadPrevious
          ? (fromPrevious ?? hadAllSelected)
          : true;
        return { ...option, checked };
      });
      st.clientOptionsPage = 0;
      st.clientOptionsContext = contextKey;
      st.clientOptionsError = "";
    } catch (err) {
      if (requestToken !== clientOptionsLoadToken) return;
      st.clientOptionsContext = "";
      st.clientOptions = [];
      st.clientOptionsError = String(
        err?.message || err || `Chargement des ${labels.plural} impossible.`
      );
    } finally {
      if (requestToken !== clientOptionsLoadToken) return;
      st.clientOptionsLoading = false;
      renderClientSelectionPanel();
      validateStep1(true);
      updateButtons();
    }
  };

  const renderFieldTabs = () => {
    const tabsRoot = q("#docHistoryExportFieldTabs");
    if (!tabsRoot) return;
    tabsRoot.textContent = "";
    const tabs = getFieldTabDefs();
    if (!tabs.length) {
      tabsRoot.hidden = true;
      tabsRoot.setAttribute("aria-hidden", "true");
      return;
    }
    tabsRoot.hidden = false;
    tabsRoot.setAttribute("aria-hidden", "false");
    const active = getActiveFieldTab();
    tabs.forEach((tab) => {
      const btn = document.createElement("button");
      const isActive = tab.key === active;
      btn.type = "button";
      btn.id = `docHistoryExportFieldTab-${fieldId(tab.key)}`;
      btn.className = `doc-export-wizard__field-tab${isActive ? " is-active" : ""}`;
      btn.dataset.docExportFieldTab = tab.key;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", "docHistoryExportFieldPanel");
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
      btn.textContent = `${tab.label} (${tab.count})`;
      tabsRoot.appendChild(btn);
    });
  };

  const setFieldsTab = (value, { focus = false } = {}) => {
    syncFieldsFromUi();
    const tabs = getFieldTabDefs();
    if (!tabs.length) {
      st.fieldsTab = "";
      renderFieldPanel();
      return;
    }
    const next = tabs.find((tab) => tab.key === value)?.key || tabs[0].key;
    st.fieldsTab = next;
    renderFieldPanel();
    validateStep2(true);
    updateButtons();
    if (focus) {
      q(`#docHistoryExportFieldTab-${fieldId(next)}`)?.focus?.();
    }
  };

  const onFieldTabsKeydown = (evt) => {
    const key = String(evt.key || "");
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) return;
    const tabs = Array.from(
      modal?.querySelectorAll("[data-doc-export-field-tab]") || []
    );
    if (!tabs.length) return;
    const current = evt.target?.closest?.("[data-doc-export-field-tab]");
    const index = tabs.indexOf(current);
    if (index < 0) return;
    let nextIndex = index;
    if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = tabs.length - 1;
    evt.preventDefault();
    const target = tabs[nextIndex];
    if (!target) return;
    setFieldsTab(target.dataset.docExportFieldTab || "", { focus: true });
  };

  const setMetaFieldsTab = (value, { focus = false } = {}) => {
    const active = getActiveFieldTab();
    if (active !== "meta") return;
    syncFieldsFromUi();
    const metaFields = getActiveTabFields();
    const tabs = getMetaFieldTabDefs(metaFields);
    if (!tabs.length) {
      st.metaFieldsTab = "";
      renderFieldPanel();
      return;
    }
    const next = tabs.find((tab) => tab.key === value)?.key || tabs[0].key;
    st.metaFieldsTab = next;
    renderFieldPanel();
    validateStep2(true);
    updateButtons();
    if (focus) {
      q(`#docHistoryExportMetaTab-${fieldId(next)}`)?.focus?.();
    }
  };

  const onMetaFieldTabsKeydown = (evt) => {
    const key = String(evt.key || "");
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) return;
    const tabs = Array.from(
      modal?.querySelectorAll("[data-doc-export-meta-tab]") || []
    );
    if (!tabs.length) return;
    const current = evt.target?.closest?.("[data-doc-export-meta-tab]");
    const index = tabs.indexOf(current);
    if (index < 0) return;
    let nextIndex = index;
    if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = tabs.length - 1;
    evt.preventDefault();
    const target = tabs[nextIndex];
    if (!target) return;
    setMetaFieldsTab(target.dataset.docExportMetaTab || "", { focus: true });
  };

  const pickFieldValue = (rows, key) => {
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      const value = scalar(row?.[key]);
      if (txt(value) !== "") return value;
    }
    return scalar(list[0]?.[key]);
  };

  const splitSelectedFields = () => {
    const selected = getSelectedFields();
    const companyFields = sortCompanyFieldsForPanel(
      selected.filter((field) => field.group === "company")
    );
    const tableFields = selected.filter((field) => field.group !== "company");
    return { selected, companyFields, tableFields };
  };
  const fieldSourceKeyLower = (field) =>
    String(field?.sourceKey || field?.key || "").toLowerCase();
  const normalizeRateKey = (value) => {
    const n = toAmountNumber(value);
    if (!Number.isFinite(n) || Math.abs(n) <= 1e-9) return "";
    return Number(n.toFixed(3)).toFixed(3);
  };
  const extractRateNumbers = (value) => {
    const raw = txt(value);
    if (!raw) return [];
    const matches = raw.match(/-?\d+(?:[.,]\d+)?/g) || [];
    return matches
      .map((token) => toAmountNumber(token))
      .filter((rate) => Number.isFinite(rate) && Math.abs(rate) > 1e-9);
  };
  const readTvaRateAmountMap = (rowInput = {}) => {
    const row = rowInput && typeof rowInput === "object" ? rowInput : {};
    const map = new Map();
    const breakdownRows = parseBreakdownRows(row[TVA_BREAKDOWN_FIELD_KEY]);
    breakdownRows.forEach((item) => {
      const src = item && typeof item === "object" ? item : {};
      const rateKey = normalizeRateKey(src.rate);
      if (!rateKey) return;
      const rateNumber = Number(rateKey);
      let amount = toAmountNumber(src.tva ?? src.amount);
      const base = toAmountNumber(src.ht ?? src.base);
      if (
        !Number.isFinite(amount) &&
        Number.isFinite(base) &&
        Number.isFinite(rateNumber)
      ) {
        amount = base * (rateNumber / 100);
      }
      if (!Number.isFinite(amount)) return;
      map.set(rateKey, (map.get(rateKey) || 0) + amount);
    });
    return map;
  };
  const getRowTvaRateKeys = (rowInput = {}) => {
    const row = rowInput && typeof rowInput === "object" ? rowInput : {};
    const keys = new Set();
    extractRateNumbers(row[TVA_RATES_FIELD_KEY]).forEach((rate) => {
      const key = normalizeRateKey(rate);
      if (key) keys.add(key);
    });
    readTvaRateAmountMap(row).forEach((_, rateKey) => {
      if (rateKey) keys.add(rateKey);
    });
    return Array.from(keys).sort((a, b) => Number(a) - Number(b));
  };
  const rowHasTvaRateValue = (rowInput = {}, rateKey = "") => {
    const row = rowInput && typeof rowInput === "object" ? rowInput : {};
    const key = String(rateKey || "").trim();
    if (!key) return false;
    const breakdownMap = readTvaRateAmountMap(row);
    if (breakdownMap.has(key)) return true;
    const rowRateKeys = getRowTvaRateKeys(row);
    if (rowRateKeys.length === 1 && rowRateKeys[0] === key) {
      const totalAmount = toAmountNumber(row[TVA_AMOUNT_FIELD_KEY]);
      return Number.isFinite(totalAmount);
    }
    return false;
  };
  const collectTvaRateKeys = (rows = []) => {
    const keys = new Set();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      getRowTvaRateKeys(row).forEach((rateKey) => {
        if (rowHasTvaRateValue(row, rateKey)) keys.add(rateKey);
      });
    });
    return Array.from(keys).sort((a, b) => Number(a) - Number(b));
  };
  const expandTvaRatesTableFields = (fields = [], rows = []) => {
    const rateKeys = collectTvaRateKeys(rows);
    if (!rateKeys.length) return [...fields];
    return fields.flatMap((field) => {
      if (fieldSourceKeyLower(field) !== TVA_RATES_FIELD_KEY_LOWER) return [field];
      return rateKeys.map((rateKey) => ({
        ...field,
        key: `${TVA_RATE_COLUMN_KEY_PREFIX}${rateKey}`,
        sourceKey: TVA_RATES_FIELD_KEY,
        tvaRateKey: rateKey,
        label: `${field.label} ${formatRateNumber(Number(rateKey))}`
      }));
    });
  };
  const getTableFieldCellValue = (field, rowInput = {}) => {
    const row = rowInput && typeof rowInput === "object" ? rowInput : {};
    const rateKey = field?.tvaRateKey || "";
    if (fieldSourceKeyLower(field) === TVA_RATES_FIELD_KEY_LOWER && rateKey) {
      const breakdownMap = readTvaRateAmountMap(row);
      if (breakdownMap.has(rateKey)) {
        return scalar(Number(breakdownMap.get(rateKey).toFixed(3)));
      }
      const rowRateKeys = getRowTvaRateKeys(row);
      if (rowRateKeys.length === 1 && rowRateKeys[0] === rateKey) {
        const totalAmount = toAmountNumber(row[TVA_AMOUNT_FIELD_KEY]);
        if (Number.isFinite(totalAmount)) {
          return scalar(Number(totalAmount.toFixed(3)));
        }
      }
      return "";
    }
    if (fieldSourceKeyLower(field) === ENTRY_STATUS_FIELD_KEY_LOWER) {
      const rawStatus = txt(row[field?.key]);
      if (!rawStatus) return "";
      const normalizedStatus = rawStatus.toLowerCase().replace(/[_\s]+/g, "-");
      return ENTRY_STATUS_LABEL_BY_SLUG.get(normalizedStatus) || scalar(row[field?.key]);
    }
    return scalar(row[field?.key]);
  };
  const sortStep3PreviewTableFields = (fields = []) => {
    const orderedPriorityFields = fields
      .filter((field) =>
        STEP3_PREVIEW_TOTALS_KEY_ORDER_INDEX.has(fieldSourceKeyLower(field))
      )
      .sort((a, b) => {
        const rankA = STEP3_PREVIEW_TOTALS_KEY_ORDER_INDEX.get(fieldSourceKeyLower(a));
        const rankB = STEP3_PREVIEW_TOTALS_KEY_ORDER_INDEX.get(fieldSourceKeyLower(b));
        return rankA - rankB;
      });
    let priorityCursor = 0;
    return fields.map((field) => {
      const key = fieldSourceKeyLower(field);
      if (!STEP3_PREVIEW_TOTALS_KEY_ORDER_INDEX.has(key)) return field;
      const nextField = orderedPriorityFields[priorityCursor] || field;
      priorityCursor += 1;
      return nextField;
    });
  };

  const PREVIEW_SUMMARY_KEY_CANDIDATES = {
    totalTTC: [
      "entry.totalTTC",
      "totals.totalTTC"
    ],
    totalHT: [
      "entry.totalHT",
      "totals.totalHT"
    ],
    totalTaxe: [
      "entry.totalTax",
      "entry.totalTaxe",
      "entry.totalTVA",
      "totals.totalTax",
      "totals.totalTaxe",
      "totals.totalTVA",
      "totals.tax",
      "totals.taxe",
      "totals.tva"
    ],
    totalTVA: [
      "totals.tvaAmount"
    ],
    totalFODEC: [
      "totals.fodecAmount"
    ]
  };
  const toAmountNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    const raw = txt(value);
    if (!raw) return NaN;
    let s = raw.replace(/\s+/g, "").replace(/[^\d,.\-]/g, "");
    if (!s) return NaN;
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma >= 0 && lastDot >= 0) {
      if (lastComma > lastDot) s = s.replace(/\./g, "").replace(/,/g, ".");
      else s = s.replace(/,/g, "");
    } else if (lastComma >= 0) {
      s = s.replace(/,/g, ".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const parseBreakdownRows = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
    const raw = txt(value);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
      return [];
    } catch {
      return [];
    }
  };
  const formatRateNumber = (value) => {
    if (!Number.isFinite(value)) return "";
    const rounded = Number(value.toFixed(3));
    if (!Number.isFinite(rounded)) return "";
    return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  };
  const distinctRateList = (rates = []) => {
    const map = new Map();
    rates.forEach((rate) => {
      if (!Number.isFinite(rate) || Math.abs(rate) <= 1e-9) return;
      const normalized = Number(rate.toFixed(3));
      const key = normalized.toFixed(3);
      if (!map.has(key)) map.set(key, normalized);
    });
    return Array.from(map.values())
      .sort((a, b) => a - b)
      .map((rate) => formatRateNumber(rate))
      .filter(Boolean)
      .join(",");
  };
  const deriveTotalsBreakdownFields = (totalsInput) => {
    const totals = totalsInput && typeof totalsInput === "object" ? totalsInput : null;
    if (!totals) return {};

    const out = {};
    const tvaRows = parseBreakdownRows(totals.tvaBreakdown);
    if (tvaRows.length) {
      let tvaBase = 0;
      let tvaAmount = 0;
      let hasTvaBase = false;
      let hasTvaAmount = false;
      const tvaRates = [];

      tvaRows.forEach((row) => {
        const src = row && typeof row === "object" ? row : {};
        const rate = toAmountNumber(src.rate);
        const base = toAmountNumber(src.ht ?? src.base);
        const amount = toAmountNumber(src.tva ?? src.amount);

        if (Number.isFinite(rate)) tvaRates.push(rate);
        if (Number.isFinite(base)) {
          tvaBase += base;
          hasTvaBase = true;
        }
        if (Number.isFinite(amount)) {
          tvaAmount += amount;
          hasTvaAmount = true;
        }
      });

      const tvaRatesList = distinctRateList(tvaRates);
      if (tvaRatesList) out.tvaRates = tvaRatesList;
      if (hasTvaBase) out.tvaBaseHT = Number(tvaBase.toFixed(3));
      if (hasTvaAmount) out.tvaAmount = Number(tvaAmount.toFixed(3));
    }

    const extras =
      totals.extras && typeof totals.extras === "object"
        ? totals.extras
        : null;
    const fodecSource = extras || totals;
    const fodecRows = parseBreakdownRows(
      fodecSource?.fodecBreakdown ?? totals.fodecBreakdown
    );
    const fallbackFodecRate = toAmountNumber(fodecSource?.fodecRate);
    const fallbackFodecAmount = toAmountNumber(
      fodecSource?.fodecHT ?? fodecSource?.fodecAmount ?? fodecSource?.fodec
    );
    let fallbackFodecBase = toAmountNumber(fodecSource?.fodecBase);
    if (
      !Number.isFinite(fallbackFodecBase) &&
      Number.isFinite(fallbackFodecAmount) &&
      Number.isFinite(fallbackFodecRate) &&
      Math.abs(fallbackFodecRate) > 1e-9
    ) {
      fallbackFodecBase = fallbackFodecAmount / (fallbackFodecRate / 100);
    }

    let fodecBase = 0;
    let fodecAmount = 0;
    let hasFodecBase = false;
    let hasFodecAmount = false;
    const fodecRates = [];

    if (fodecRows.length) {
      fodecRows.forEach((row) => {
        const src = row && typeof row === "object" ? row : {};
        const rate = toAmountNumber(src.rate ?? fallbackFodecRate);
        let base = toAmountNumber(src.base ?? src.ht);
        const amount = toAmountNumber(src.fodec ?? src.amount ?? src.fodecAmount);

        if (
          !Number.isFinite(base) &&
          Number.isFinite(amount) &&
          Number.isFinite(rate) &&
          Math.abs(rate) > 1e-9
        ) {
          base = amount / (rate / 100);
        }

        if (Number.isFinite(rate)) fodecRates.push(rate);
        if (Number.isFinite(base)) {
          fodecBase += base;
          hasFodecBase = true;
        }
        if (Number.isFinite(amount)) {
          fodecAmount += amount;
          hasFodecAmount = true;
        }
      });
    } else if (Number.isFinite(fallbackFodecAmount) || Number.isFinite(fallbackFodecBase)) {
      if (Number.isFinite(fallbackFodecRate)) fodecRates.push(fallbackFodecRate);
      if (Number.isFinite(fallbackFodecBase)) {
        fodecBase += fallbackFodecBase;
        hasFodecBase = true;
      }
      if (Number.isFinite(fallbackFodecAmount)) {
        fodecAmount += fallbackFodecAmount;
        hasFodecAmount = true;
      }
    }

    if (fodecRates.length || hasFodecBase || hasFodecAmount) {
      const fodecRatesList = distinctRateList(fodecRates);
      if (fodecRatesList) out.fodecRates = fodecRatesList;
      if (hasFodecBase) out.fodecBaseHT = Number(fodecBase.toFixed(3));
      if (hasFodecAmount) out.fodecAmount = Number(fodecAmount.toFixed(3));
    }

    return out;
  };
  const formatPreviewTotal = (value) => {
    if (!Number.isFinite(value)) return "-";
    return value.toLocaleString("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  };
  const getSelectedFieldKey = (candidates = []) => {
    const selectedByLower = new Map(
      st.fields
        .filter((field) => field.checked !== false)
        .map((field) => [String(field.key || "").toLowerCase(), String(field.key || "")])
    );
    for (const key of candidates) {
      const actual = selectedByLower.get(String(key || "").toLowerCase());
      if (actual) return actual;
    }
    return "";
  };
  const sumRowsByFieldKey = (rows, key) => {
    const list = Array.isArray(rows) ? rows : [];
    let total = 0;
    list.forEach((row) => {
      const n = toAmountNumber(row?.[key]);
      if (Number.isFinite(n)) total += n;
    });
    return total;
  };
  const setPreviewSummaryLine = (line, value, visible) => {
    if (!line) return;
    const valueEl = line.querySelector("[data-doc-history-export-summary-value]");
    if (valueEl) valueEl.textContent = visible ? value : "-";
    line.hidden = !visible;
    line.setAttribute("aria-hidden", visible ? "false" : "true");
  };
  const getPreviewSummaryItems = () => {
    const keyHT = getSelectedFieldKey(PREVIEW_SUMMARY_KEY_CANDIDATES.totalHT);
    const keyTTC = getSelectedFieldKey(PREVIEW_SUMMARY_KEY_CANDIDATES.totalTTC);
    const keyTaxe = getSelectedFieldKey(PREVIEW_SUMMARY_KEY_CANDIDATES.totalTaxe);
    const keyTVA = getSelectedFieldKey(PREVIEW_SUMMARY_KEY_CANDIDATES.totalTVA);
    const keyFODEC = getSelectedFieldKey(PREVIEW_SUMMARY_KEY_CANDIDATES.totalFODEC);
    return [
      {
        id: "ht",
        label: "Total G. HT",
        key: keyHT,
        visible: !!keyHT,
        value: keyHT ? formatPreviewTotal(sumRowsByFieldKey(st.rows, keyHT)) : "-"
      },
      {
        id: "ttc",
        label: "Total G. TTC",
        key: keyTTC,
        visible: !!keyTTC,
        value: keyTTC ? formatPreviewTotal(sumRowsByFieldKey(st.rows, keyTTC)) : "-"
      },
      {
        id: "taxe",
        label: "Total G. Taxe",
        key: keyTaxe,
        visible: !!keyTaxe,
        value: keyTaxe ? formatPreviewTotal(sumRowsByFieldKey(st.rows, keyTaxe)) : "-"
      },
      {
        id: "tva",
        label: "Total G. TVA",
        key: keyTVA,
        visible: !!keyTVA,
        value: keyTVA ? formatPreviewTotal(sumRowsByFieldKey(st.rows, keyTVA)) : "-"
      },
      {
        id: "fodec",
        label: "Total G. FODEC",
        key: keyFODEC,
        visible: !!keyFODEC,
        value: keyFODEC ? formatPreviewTotal(sumRowsByFieldKey(st.rows, keyFODEC)) : "-"
      }
    ];
  };
  const updatePreviewSummary = () => {
    const summary = q("#docHistoryExportPreviewSummary");
    if (!summary) return;
    const lineTTC = q("#docHistoryExportPreviewSummaryTTC");
    const lineHT = q("#docHistoryExportPreviewSummaryHT");
    const lineTaxe = q("#docHistoryExportPreviewSummaryTaxe");
    const lineTVA = q("#docHistoryExportPreviewSummaryTVA");
    const lineFODEC = q("#docHistoryExportPreviewSummaryFODEC");
    const summaryItems = getPreviewSummaryItems();
    const itemHT = summaryItems.find((item) => item.id === "ht");
    const itemTTC = summaryItems.find((item) => item.id === "ttc");
    const itemTaxe = summaryItems.find((item) => item.id === "taxe");
    const itemTVA = summaryItems.find((item) => item.id === "tva");
    const itemFODEC = summaryItems.find((item) => item.id === "fodec");

    setPreviewSummaryLine(lineHT, itemHT?.value || "-", !!itemHT?.visible);
    setPreviewSummaryLine(lineTTC, itemTTC?.value || "-", !!itemTTC?.visible);
    setPreviewSummaryLine(lineTaxe, itemTaxe?.value || "-", !!itemTaxe?.visible);
    setPreviewSummaryLine(lineTVA, itemTVA?.value || "-", !!itemTVA?.visible);
    setPreviewSummaryLine(lineFODEC, itemFODEC?.value || "-", !!itemFODEC?.visible);

    const hasVisibleLine = summaryItems.some((item) => !!item.visible);
    summary.hidden = !hasVisibleLine;
    summary.setAttribute("aria-hidden", hasVisibleLine ? "false" : "true");
  };

  const setPreviewVisibility = () => {
    const map = new Map(st.fields.map((f) => [f.key, f.checked !== false]));
    modal?.querySelectorAll("[data-doc-history-export-field]").forEach((node) => {
      const k = node.dataset.docHistoryExportField || "";
      const on = map.get(k) !== false;
      if (on) node.removeAttribute("hidden");
      else node.setAttribute("hidden", "");
    });
    updatePreviewSummary();
  };

  const renderPreview = () => {
    const head = q("#docHistoryExportPreviewHead");
    const row = q("#docHistoryExportPreviewRow");
    const company = q("#docHistoryExportPreviewCompany");
    if (!head || !row) return;
    head.textContent = "";
    row.textContent = "";
    if (company) {
      company.textContent = "";
      company.hidden = true;
      company.setAttribute("aria-hidden", "true");
    }
    if (!st.fields.length) {
      const th = document.createElement("th");
      th.textContent = "Aucune donnee";
      const td = document.createElement("td");
      td.textContent = "-";
      head.appendChild(th);
      row.appendChild(td);
      updatePreviewSummary();
      return;
    }
    const { companyFields, tableFields } = splitSelectedFields();
    if (company && companyFields.length) {
      const table = document.createElement("table");
      table.className = "doc-export-wizard__preview-company-table";
      const tbody = document.createElement("tbody");
      companyFields.forEach((field) => {
        const tr = document.createElement("tr");
        const label = document.createElement("td");
        label.className = "doc-export-wizard__preview-company-key";
        label.textContent = field.label;
        const value = document.createElement("td");
        value.className = "doc-export-wizard__preview-company-value";
        value.textContent = pickFieldValue(st.rows, field.key) || "-";
        tr.appendChild(label);
        tr.appendChild(value);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      company.appendChild(table);
      company.hidden = false;
      company.setAttribute("aria-hidden", "false");
    }
    if (!tableFields.length) {
      updatePreviewSummary();
      return;
    }
    const sample = st.rows[0] || {};
    const previewTableFields = expandTvaRatesTableFields(
      sortStep3PreviewTableFields(tableFields),
      st.rows
    );
    previewTableFields.forEach((f) => {
      const th = document.createElement("th");
      th.dataset.docHistoryExportField = f.key;
      const span = document.createElement("span");
      span.textContent = f.label;
      th.appendChild(span);
      const td = document.createElement("td");
      td.dataset.docHistoryExportField = f.key;
      td.textContent = getTableFieldCellValue(f, sample);
      head.appendChild(th);
      row.appendChild(td);
    });
    setPreviewVisibility();
  };

  const stepIndicators = () => {
    modal?.querySelectorAll("[data-doc-export-step-indicator]").forEach((el) => {
      const n = Number(el.dataset.docExportStepIndicator || 0);
      const isActive = n === st.step;
      const isEnabled = n > 0 && n <= (Number(st.maxStepReached) || 1);
      el.classList.toggle("is-active", isActive);
      el.setAttribute("aria-selected", isActive ? "true" : "false");
      el.setAttribute("aria-disabled", isEnabled ? "false" : "true");
      el.tabIndex = isActive ? 0 : -1;
      if ("disabled" in el) el.disabled = !isEnabled;
    });
  };

  const validateStep1 = (showHint = true) => {
    const s = parseDate(q("#docHistoryExportStartDate")?.value || "");
    const e = parseDate(q("#docHistoryExportEndDate")?.value || "");
    const labels = currentClientSelectionLabels();
    st.startDate = s;
    st.endDate = e;
    let dateMsg = "";
    if (!s || !e) dateMsg = "Renseignez les dates Du et Au au format AAAA-MM-JJ.";
    else if (s > e) dateMsg = "La date Du doit etre inferieure ou egale a la date Au.";
    let clientMsg = "";
    if (!dateMsg && isSpecificClientSelectionEnabled()) {
      const contextKey = clientSelectionContextKey();
      if (st.clientOptionsLoading) {
        clientMsg = `Chargement de la liste des ${labels.plural}...`;
      } else if (st.clientOptionsError) {
        clientMsg = st.clientOptionsError;
      } else if (st.clientOptionsContext !== contextKey) {
        clientMsg = `Mettez a jour la liste des ${labels.plural} pour la periode selectionnee.`;
      } else if (!st.clientOptions.length) {
        clientMsg = `Aucun ${labels.singular} disponible pour cette selection.`;
      } else if (!selectedClientKeysFromState().length) {
        clientMsg = `Selectionnez au moins un ${labels.singular} ou repassez sur ${labels.allModeLabel}.`;
      }
    }
    const dateHint = q("#docHistoryExportDateHint");
    const clientHint = q("#docHistoryExportClientHint");
    if (dateHint && showHint) {
      dateHint.textContent = dateMsg;
      dateHint.hidden = !dateMsg;
    }
    if (clientHint && showHint) {
      clientHint.textContent = clientMsg;
      clientHint.hidden = !clientMsg || !isSpecificClientSelectionEnabled();
    }
    return !dateMsg && !clientMsg;
  };

  const validateStep2 = (showHint = true) => {
    const selected = getSelectedFields().length;
    const labels = currentClientSelectionLabels();
    let msg = "";
    if (!st.rows.length) {
      msg = isSpecificClientSelectionEnabled()
        ? `Aucun document trouve pour cette periode et les ${labels.plural} selectionnes.`
        : "Aucun document trouve pour cette periode.";
    }
    else if (!selected) msg = "Selectionnez au moins un champ a exporter.";
    else msg = `${st.rows.length} document(s) pret(s) a l'export.`;
    const hint = q("#docHistoryExportDataHint");
    if (hint && showHint) {
      hint.textContent = msg;
      hint.hidden = false;
    }
    return st.rows.length > 0 && selected > 0;
  };

  const updateButtons = () => {
    const cancel = q("#docHistoryExportModalCancel");
    const back = q("#docHistoryExportModalBack");
    const next = q("#docHistoryExportModalNext");
    const save = q("#docHistoryExportModalSave");
    const done = q("#docHistoryExportModalDone");
    if (!cancel || !back || !next || !save || !done) return;
    cancel.hidden = st.step === 4;
    back.hidden = st.step <= 1 || st.step === 4;
    next.hidden = st.step >= 3 || st.step === 4;
    save.hidden = st.step !== 3;
    done.hidden = st.step !== 4;
    const valid = st.step === 1 ? validateStep1(false) : st.step === 2 ? validateStep2(false) : true;
    next.disabled = !valid;
    next.setAttribute("aria-disabled", valid ? "false" : "true");
  };

  const goStep = (n) => {
    st.step = Math.max(1, Math.min(4, Number(n) || 1));
    st.maxStepReached = Math.max(1, Math.max(Number(st.maxStepReached) || 1, st.step));
    modal?.querySelectorAll("[data-doc-export-step]").forEach((sec) => {
      const s = Number(sec.dataset.docExportStep || 0);
      const isActive = s === st.step;
      if (isActive) sec.removeAttribute("hidden");
      else sec.setAttribute("hidden", "");
      sec.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
    stepIndicators();
    updateButtons();
  };

  const canActivateStep = (step) => {
    const s = Math.max(1, Math.min(4, Number(step) || 1));
    return s <= (Number(st.maxStepReached) || 1);
  };

  const activateStepFromIndicator = (step, { focus = false } = {}) => {
    const s = Math.max(1, Math.min(4, Number(step) || 1));
    if (!canActivateStep(s)) return false;
    goStep(s);
    if (focus) {
      const tab = q(`#docHistoryExportStepLabel${s}`);
      tab?.focus?.();
    }
    return true;
  };

  const onStepperKeydown = (evt) => {
    const key = String(evt.key || "");
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) return;
    const tabs = Array.from(
      modal?.querySelectorAll("[data-doc-export-step-indicator]") || []
    ).filter((tab) => !tab.disabled);
    if (!tabs.length) return;
    const current = evt.target?.closest?.("[data-doc-export-step-indicator]");
    const index = tabs.indexOf(current);
    if (index < 0) return;
    let nextIndex = index;
    if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = tabs.length - 1;
    evt.preventDefault();
    const target = tabs[nextIndex];
    if (!target) return;
    const targetStep = Number(target.dataset.docExportStepIndicator || 1);
    activateStepFromIndicator(targetStep, { focus: true });
  };

  const setDocType = (value) => {
    st.docType = resolveDocType(value, "facture");
    const sel = q("#docHistoryExportDocType");
    if (sel) sel.value = st.docType;
    modal?.querySelectorAll("[data-doc-export-doc-type]").forEach((btn) => {
      const on = btn.dataset.docExportDocType === st.docType;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    invalidateClientOptions();
    void loadClientOptions();
  };

  const setDateFieldsEnabled = (on) => {
    [q("#docHistoryExportStartDate"), q("#docHistoryExportEndDate")].forEach((input) => {
      if (!input) return;
      input.disabled = !on;
      input.setAttribute("aria-disabled", on ? "false" : "true");
    });
    modal?.querySelectorAll("#docHistoryExportStep1 .swb-date-picker__toggle").forEach((btn) => {
      btn.disabled = !on;
      btn.setAttribute("aria-disabled", on ? "false" : "true");
    });
    if (!on) {
      st.startPicker?.close?.();
      st.endPicker?.close?.();
    }
  };

  const setDateValue = (input, picker, value) => {
    if (picker?.setValue) picker.setValue(value || "", { silent: true });
    else if (input) input.value = value || "";
  };

  const syncPreset = (value, apply = true, close = true) => {
    st.preset = PRESET_LABELS[value] ? value : "custom";
    const sel = q("#docHistoryExportPreset");
    const display = q("#docHistoryExportPresetDisplay");
    const panel = q("#docHistoryExportPresetPanel");
    const menu = q("#docHistoryExportPresetMenu");
    if (sel) sel.value = st.preset;
    if (display) display.textContent = PRESET_LABELS[st.preset] || PRESET_LABELS.custom;
    panel?.querySelectorAll("[data-doc-export-preset-option]").forEach((btn) => {
      const on = btn.dataset.docExportPresetOption === st.preset;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (apply) {
      if (st.preset === "custom") {
        setDateFieldsEnabled(true);
      } else {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        let start = "";
        let end = "";
        if (st.preset === "today") {
          start = toIso(now);
          end = start;
        } else if (st.preset === "this-month") {
          start = toIso(new Date(y, m, 1));
          end = toIso(new Date(y, m + 1, 0));
        } else if (st.preset === "last-month") {
          start = toIso(new Date(y, m - 1, 1));
          end = toIso(new Date(y, m, 0));
        } else if (st.preset === "this-year") {
          start = toIso(new Date(y, 0, 1));
          end = toIso(new Date(y, 11, 31));
        } else if (st.preset === "last-year") {
          start = toIso(new Date(y - 1, 0, 1));
          end = toIso(new Date(y - 1, 11, 31));
        }
        setDateValue(q("#docHistoryExportStartDate"), st.startPicker, start);
        setDateValue(q("#docHistoryExportEndDate"), st.endPicker, end);
        setDateFieldsEnabled(false);
      }
      invalidateClientOptions();
      void loadClientOptions();
      validateStep1(true);
      updateButtons();
    }
    if (close && menu) {
      menu.open = false;
      menu.querySelector(".field-toggle-trigger")?.setAttribute("aria-expanded", "false");
    }
  };

  const syncFormat = (value, close = false) => {
    st.format = value === "csv" ? "csv" : "xlsx";
    const sel = q("#articlesExportFormat");
    const display = q("#articlesExportFormatDisplay");
    const panel = q("#articlesExportFormatPanel");
    const menu = q("#articlesExportFormatMenu");
    if (sel) sel.value = st.format;
    if (display) display.textContent = FORMAT_LABELS[st.format];
    panel?.querySelectorAll("[data-doc-export-format-option]").forEach((btn) => {
      const on = btn.dataset.docExportFormatOption === st.format;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (close && menu) {
      menu.open = false;
      menu.querySelector(".field-toggle-trigger")?.setAttribute("aria-expanded", "false");
    }
  };
  const fetchAllDocs = async (docType) => {
    if (!API?.listInvoiceFiles) throw new Error("Export documents indisponible.");
    let offset = 0;
    let total = null;
    const out = [];
    while (true) {
      const res = await API.listInvoiceFiles({ docType, limit: FETCH_LIMIT, offset });
      if (res?.ok === false) throw new Error(res.error || "Chargement des documents impossible.");
      const items = Array.isArray(res?.items) ? res.items : [];
      if (total === null) total = Number(res?.total ?? items.length);
      out.push(...items);
      offset += items.length;
      if (!items.length || (Number.isFinite(total) && offset >= total)) break;
    }
    return out;
  };

  const buildRows = (docs) =>
    docs.map(({ entry, raw }) => {
      const payload = raw && typeof raw === "object" ? raw : {};
      const data = payload.data && typeof payload.data === "object" ? payload.data : payload;
      const docType = resolveDocType(entry?.docType || data?.meta?.docType || "facture", "facture");
      const root = {
        entry: {
          id: txt(entry?.id),
          path: txt(entry?.path),
          number: txt(entry?.number),
          date: pickEntryDate(entry) || txt(entry?.date),
          docType,
          docTypeLabel: DOC_LABELS[docType] || docType,
          status: txt(entry?.status || data?.meta?.status),
          createdAt: txt(entry?.createdAt),
          modifiedAt: txt(entry?.modifiedAt),
          totalHT: scalar(entry?.totalHT),
          totalTTC: scalar(entry?.totalTTC),
          totalTTCExclStamp: scalar(entry?.totalTTCExclStamp),
          stampTT: scalar(entry?.stampTT),
          currency: txt(entry?.currency),
          clientName: txt(entry?.clientName),
          clientAccount: txt(entry?.clientAccount),
          paymentMethod: txt(entry?.paymentMethod),
          paymentDate: txt(entry?.paymentDate),
          paymentReference: txt(entry?.paymentReference || entry?.paymentRef)
        }
      };
      if (data && typeof data === "object") Object.assign(root, data);
      if (root.totals && typeof root.totals === "object") {
        const derivedTotals = deriveTotalsBreakdownFields(root.totals);
        if (Object.keys(derivedTotals).length) {
          root.totals = { ...root.totals, ...derivedTotals };
        }
      }
      const flat = {};
      flatten(root, "", flat, 0);
      Object.keys(flat).forEach((k) => {
        flat[k] = scalar(flat[k]);
      });
      return flat;
    });

  const buildFieldDefs = (rows) => {
    const map = new Map();
    const coverage = new Map();
    rows.forEach((row) => {
      Object.keys(row || {}).forEach((k) => {
        if (!k || map.has(k) || isExcludedExportFieldKey(k)) return;
        map.set(k, {
          key: k,
          label: fieldLabel(k),
          group: fieldGroupFromKey(k),
          metaTab: metaFieldTabFromKey(k),
          checked: CORE_KEYS.has(k) || DEFAULT_CHECKED_FIELD_KEYS.has(String(k).toLowerCase())
        });
      });
      Object.entries(row || {}).forEach(([k, value]) => {
        if (!k) return;
        const hasValue = txt(value) !== "";
        if (!hasValue) return;
        coverage.set(k, (coverage.get(k) || 0) + 1);
      });
    });
    const dedup = new Map();
    const isBetterField = (next, current) => {
      const nextCore = CORE_KEYS.has(next.key) ? 1 : 0;
      const currCore = CORE_KEYS.has(current.key) ? 1 : 0;
      if (nextCore !== currCore) return nextCore > currCore;
      const nextCoverage = coverage.get(next.key) || 0;
      const currCoverage = coverage.get(current.key) || 0;
      if (nextCoverage !== currCoverage) return nextCoverage > currCoverage;
      const nextEntry = next.key.startsWith("entry.") ? 1 : 0;
      const currEntry = current.key.startsWith("entry.") ? 1 : 0;
      if (nextEntry !== currEntry) return nextEntry > currEntry;
      if (next.key.length !== current.key.length) return next.key.length < current.key.length;
      return next.key.localeCompare(current.key, "fr", { sensitivity: "base" }) < 0;
    };
    Array.from(map.values()).forEach((field) => {
      const bucket = normFieldLabel(field.label) || field.key;
      const current = dedup.get(bucket);
      if (!current || isBetterField(field, current)) dedup.set(bucket, field);
    });
    const defs = Array.from(dedup.values()).sort((a, b) => {
      const ga = fieldGroupOrder(a.group || "other");
      const gb = fieldGroupOrder(b.group || "other");
      if (ga !== gb) return ga - gb;
      const pa = CORE_KEYS.has(a.key) ? 0 : 1;
      const pb = CORE_KEYS.has(b.key) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if ((a.group || "other") === "totals" && (b.group || "other") === "totals") {
        const keyA = String(a.key || "").toLowerCase();
        const keyB = String(b.key || "").toLowerCase();
        const rankA = TOTALS_FIELD_KEY_PRIORITY_INDEX.has(keyA)
          ? TOTALS_FIELD_KEY_PRIORITY_INDEX.get(keyA)
          : Number.MAX_SAFE_INTEGER;
        const rankB = TOTALS_FIELD_KEY_PRIORITY_INDEX.has(keyB)
          ? TOTALS_FIELD_KEY_PRIORITY_INDEX.get(keyB)
          : Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
      }
      return a.label.localeCompare(b.label, "fr", { sensitivity: "base" });
    });
    defs.forEach((field) => {
      if (DEFAULT_CHECKED_FIELD_KEYS.has(String(field?.key || "").toLowerCase())) {
        field.checked = true;
      }
    });
    if (defs.length && defs.every((f) => !f.checked)) {
      defs.slice(0, Math.min(8, defs.length)).forEach((f) => {
        f.checked = true;
      });
    }
    return defs;
  };

  const renderFieldOption = (field, container) => {
    if (!field || !container) return;
    const label = document.createElement("label");
    label.className = "toggle-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "col-toggle";
    input.dataset.columnKey = field.key;
    input.id = `docExportField-${fieldId(field.key)}`;
    const isChecked = field.checked !== false;
    input.checked = isChecked;
    input.defaultChecked = isChecked;
    input.toggleAttribute("checked", isChecked);
    input.setAttribute("aria-label", `Inclure le champ ${field.label}`);
    const span = document.createElement("span");
    span.className = "model-save-dot";
    span.textContent = field.label;
    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  };
  const renderFieldOptionRow = (fields, container) => {
    if (!container || !Array.isArray(fields) || !fields.length) return;
    const row = document.createElement("div");
    row.className = "doc-export-wizard__field-options-row";
    fields.forEach((field) => renderFieldOption(field, row));
    container.appendChild(row);
  };

  const renderMetaFieldPanels = (panel, fields) => {
    const tabs = getMetaFieldTabDefs(fields);
    if (!tabs.length) {
      const p = document.createElement("p");
      p.className = "doc-export-wizard__empty";
      p.textContent = "Aucun champ Meta disponible.";
      panel.appendChild(p);
      return;
    }
    const active = getActiveMetaFieldTab(fields);

    const tabsList = document.createElement("div");
    tabsList.className = "doc-export-wizard__meta-tabs";
    tabsList.setAttribute("role", "tablist");
    tabsList.setAttribute("aria-label", "Sous-categories Meta");

    const panelsWrap = document.createElement("div");
    panelsWrap.className = "doc-export-wizard__meta-panels";

    tabs.forEach((tab) => {
      const isActive = tab.key === active;
      const tabId = `docHistoryExportMetaTab-${fieldId(tab.key)}`;
      const panelId = `docHistoryExportMetaPanel-${fieldId(tab.key)}`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = tabId;
      btn.className = `doc-export-wizard__meta-tab${isActive ? " is-active" : ""}`;
      btn.dataset.docExportMetaTab = tab.key;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.setAttribute("aria-controls", panelId);
      btn.tabIndex = isActive ? 0 : -1;
      btn.textContent = `${tab.label} (${tab.count})`;
      tabsList.appendChild(btn);

      const tabPanel = document.createElement("div");
      tabPanel.id = panelId;
      tabPanel.className = `doc-export-wizard__meta-tabpanel${isActive ? " is-active" : ""}`;
      tabPanel.setAttribute("role", "tabpanel");
      tabPanel.setAttribute("aria-labelledby", tabId);
      tabPanel.hidden = !isActive;
      tabPanel.setAttribute("aria-hidden", isActive ? "false" : "true");

      const tabFields = sortFieldsByLabel(
        fields.filter((field) => (field.metaTab || metaFieldTabFromKey(field.key)) === tab.key)
      );
      if (!tabFields.length) {
        const p = document.createElement("p");
        p.className = "doc-export-wizard__empty";
        p.textContent = "Aucun champ dans cette sous-categorie.";
        tabPanel.appendChild(p);
      } else {
        renderFieldOptionRow(tabFields, tabPanel);
      }
      panelsWrap.appendChild(tabPanel);
    });

    panel.appendChild(tabsList);
    panel.appendChild(panelsWrap);
  };

  const renderFieldPanel = () => {
    const panel = q("#docHistoryExportFieldPanel");
    if (!panel) return;
    renderFieldTabs();
    panel.textContent = "";
    panel.classList.remove("is-meta-panel");
    if (!st.fields.length) {
      panel.removeAttribute("aria-labelledby");
      const p = document.createElement("p");
      p.className = "doc-export-wizard__empty";
      p.textContent = "Aucune donnee disponible sur la selection courante.";
      panel.appendChild(p);
      return;
    }
    const activeTab = getActiveFieldTab();
    const activeFields = getActiveTabFields();
    const activeTabId = `docHistoryExportFieldTab-${fieldId(activeTab)}`;
    panel.setAttribute("aria-labelledby", activeTabId);
    if (!activeFields.length) {
      const p = document.createElement("p");
      p.className = "doc-export-wizard__empty";
      p.textContent = "Aucun champ disponible dans cette categorie.";
      panel.appendChild(p);
      return;
    }
    if (activeTab === "meta") {
      panel.classList.add("is-meta-panel");
      renderMetaFieldPanels(panel, activeFields);
      return;
    }
    const sortedActiveFields =
      activeTab === "company"
        ? sortCompanyFieldsForPanel(activeFields)
        : activeTab === "client"
          ? sortClientFieldsForPanel(activeFields)
          : activeTab === "totals"
            ? sortTotalsFieldsForPanel(activeFields)
        : sortFieldsByLabel(activeFields);
    renderFieldOptionRow(sortedActiveFields, panel);
  };

  const syncFieldsFromUi = () => {
    st.fields.forEach((f) => {
      const input = q(`#docExportField-${fieldId(f.key)}`);
      if (input) f.checked = !!input.checked;
    });
  };

  const loadSelectionRows = async () => {
    if (!API?.listInvoiceFiles || !API?.openInvoiceJSON) {
      throw new Error("Export documents indisponible.");
    }
    const docType = resolveDocType(st.docType, "facture");
    const list = await fetchAllDocs(docType);
    const dateFiltered = list.filter((entry) => {
      const d = pickEntryDate(entry) || parseDate(entry?.date) || parseDate(entry?.createdAt) || parseDate(entry?.modifiedAt);
      return inRange(d, st.startDate, st.endDate);
    });
    const applyClientFilter = isSpecificClientSelectionEnabled();
    if (applyClientFilter) {
      syncClientOptionsFromUi();
    }
    const selectedClientKeys = new Set(selectedClientKeysFromState());
    const filtered = applyClientFilter
      ? dateFiltered.filter((entry) =>
        selectedClientKeys.has(clientSelectionMetaFromEntry(entry).key))
      : dateFiltered;
    const detailed = await Promise.all(
      filtered.map(async (entry) => {
        try {
          const raw = await API.openInvoiceJSON({ path: entry?.path, docType });
          return { entry, raw };
        } catch {
          return { entry, raw: null };
        }
      })
    );
    st.rows = buildRows(detailed);
    st.fields = buildFieldDefs(st.rows);
    st.fieldsTab = "";
    st.metaFieldsTab = "";
    st.exportPath = "";
    st.exportName = "";
    renderFieldPanel();
    renderPreview();
    validateStep2(true);
  };

  const fileBaseName = () => {
    const start = st.startDate || toIso(new Date());
    const end = st.endDate || start;
    const seg = DOC_FILE_SEGMENT[st.docType] || st.docType || "documents";
    return `export_${seg}_${start}_${end}`;
  };

  const saveExportFile = async ({ format, xlsxData, csvData, baseName }) => {
    const ext = format === "csv" ? "csv" : "xlsx";
    if (API?.exportDocumentsFile) {
      const res = await API.exportDocumentsFile({ ext, baseName, data: { xlsx: xlsxData, csv: csvData } });
      if (!res || res.canceled) return null;
      if (res.ok === false) throw new Error(res.error || "Export impossible.");
      return res;
    }
    if (API?.saveFile) {
      const res = await API.saveFile({
        title: "Exporter des documents",
        defaultPath: `${baseName}.${ext}`,
        filters: [
          { name: "Fichier Excel", extensions: ["xlsx"] },
          { name: "CSV", extensions: ["csv"] }
        ],
        data: { xlsx: xlsxData, csv: csvData }
      });
      if (!res || res.canceled) return null;
      if (res.ok === false) throw new Error(res.error || "Export impossible.");
      return res;
    }
    const blobData = ext === "csv" ? csvData : xlsxData;
    if (!blobData || !w.Blob) throw new Error("Export indisponible.");
    const blob = typeof blobData === "string"
      ? new Blob([blobData], { type: "text/csv;charset=utf-8" })
      : new Blob([blobData], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, name: `${baseName}.${ext}` };
  };

  const buildSheetBorder = () => ({
    top: { style: "thin", color: { rgb: "D7E0EE" } },
    right: { style: "thin", color: { rgb: "D7E0EE" } },
    bottom: { style: "thin", color: { rgb: "D7E0EE" } },
    left: { style: "thin", color: { rgb: "D7E0EE" } }
  });

  const buildSheetStyle = ({
    bold = false,
    bg = "",
    color = "1E293B",
    align = "left"
  } = {}) => {
    const style = {
      font: { name: "Calibri", sz: 10, bold, color: { rgb: color } },
      alignment: { horizontal: align, vertical: "center", wrapText: true },
      border: buildSheetBorder()
    };
    if (bg) {
      style.fill = { patternType: "solid", fgColor: { rgb: bg } };
    }
    return style;
  };

  const applyStyledExportSheet = (sheet, { exportRows, layout, tableFields }) => {
    if (!sheet || !w.XLSX?.utils) return;
    const totalCols = Math.max(
      2,
      Number(layout?.maxCols) || 0,
      ...((Array.isArray(exportRows) ? exportRows : []).map((row) => Array.isArray(row) ? row.length : 0))
    );
    const utils = w.XLSX.utils;
    const ensureCell = (r, c) => {
      const addr = utils.encode_cell({ r, c });
      if (!sheet[addr]) sheet[addr] = { t: "s", v: "" };
      return sheet[addr];
    };
    const styleRangeRow = (row, startCol, endCol, style) => {
      for (let c = startCol; c <= endCol; c += 1) {
        ensureCell(row, c).s = style;
      }
    };
    const addRowMerge = (row, startCol, endCol) => {
      if (endCol <= startCol) return;
      if (!sheet["!merges"]) sheet["!merges"] = [];
      sheet["!merges"].push({
        s: { r: row, c: startCol },
        e: { r: row, c: endCol }
      });
    };

    const styleSectionTitle = buildSheetStyle({ bold: true, bg: "F8FBFF" });
    const styleKey = buildSheetStyle({ bold: true, bg: "F8FBFF", color: "475569" });
    const styleValue = buildSheetStyle({ bold: true, color: "1E293B" });
    const styleHeader = buildSheetStyle({ bold: true, bg: "F8FBFF", color: "1E293B" });
    const styleData = buildSheetStyle({ color: "1E293B" });
    const companyKeyCol = Number.isInteger(layout?.companyKeyCol) ? layout.companyKeyCol : 0;
    const companyValueCol = Number.isInteger(layout?.companyValueCol) ? layout.companyValueCol : 1;
    const summaryKeyCol = Number.isInteger(layout?.summaryKeyCol) ? layout.summaryKeyCol : 0;
    const summaryValueCol = Number.isInteger(layout?.summaryValueCol) ? layout.summaryValueCol : 1;

    const colWidths = [];
    for (let c = 0; c < totalCols; c += 1) {
      if (c === companyKeyCol) {
        colWidths.push({ wch: 28 });
        continue;
      }
      if (c === companyValueCol) {
        colWidths.push({ wch: 24 });
        continue;
      }
      if (c === summaryKeyCol) {
        colWidths.push({ wch: 22 });
        continue;
      }
      if (c === summaryValueCol) {
        colWidths.push({ wch: 18 });
        continue;
      }
      const tableField = tableFields?.[c];
      if (tableField) {
        const lbl = txt(tableField.label || tableField.key || "");
        const width = Math.min(40, Math.max(12, lbl.length + 6));
        colWidths.push({ wch: width });
        continue;
      }
      colWidths.push({ wch: 14 });
    }
    sheet["!cols"] = colWidths;

    if (layout.companyTitleRow >= 0) {
      styleRangeRow(layout.companyTitleRow, companyKeyCol, companyValueCol, styleSectionTitle);
      addRowMerge(layout.companyTitleRow, companyKeyCol, companyValueCol);
    }
    if (layout.companyStartRow >= 0 && layout.companyEndRow >= layout.companyStartRow) {
      for (let r = layout.companyStartRow; r <= layout.companyEndRow; r += 1) {
        ensureCell(r, companyKeyCol).s = styleKey;
        ensureCell(r, companyValueCol).s = styleValue;
      }
    }
    if (layout.tableHeaderRow >= 0 && tableFields.length) {
      styleRangeRow(layout.tableHeaderRow, 0, tableFields.length - 1, styleHeader);
    }
    if (layout.tableStartRow >= 0 && layout.tableEndRow >= layout.tableStartRow && tableFields.length) {
      for (let r = layout.tableStartRow; r <= layout.tableEndRow; r += 1) {
        for (let c = 0; c < tableFields.length; c += 1) {
          ensureCell(r, c).s = styleData;
        }
      }
    }
    if (layout.summaryTitleRow >= 0) {
      styleRangeRow(layout.summaryTitleRow, summaryKeyCol, summaryValueCol, styleSectionTitle);
      addRowMerge(layout.summaryTitleRow, summaryKeyCol, summaryValueCol);
    }
    if (layout.summaryStartRow >= 0 && layout.summaryEndRow >= layout.summaryStartRow) {
      for (let r = layout.summaryStartRow; r <= layout.summaryEndRow; r += 1) {
        ensureCell(r, summaryKeyCol).s = styleKey;
        ensureCell(r, summaryValueCol).s = styleValue;
      }
    }
  };

  const doExport = async () => {
    const { selected, companyFields, tableFields } = splitSelectedFields();
    if (!selected.length || !st.rows.length) {
      validateStep2(true);
      return null;
    }
    const exportTableFields = expandTvaRatesTableFields(tableFields, st.rows);
    const format = st.format === "csv" ? "csv" : "xlsx";
    if (format === "xlsx" && !w.XLSX) {
      throw new Error("Export XLSX indisponible. Choisissez le format CSV.");
    }
    const exportRows = [];
    const layout = {
      maxCols: 0,
      companyKeyCol: 0,
      companyValueCol: 1,
      companyTitleRow: -1,
      companyStartRow: -1,
      companyEndRow: -1,
      summaryKeyCol: 0,
      summaryValueCol: 1,
      tableHeaderRow: -1,
      tableStartRow: -1,
      tableEndRow: -1,
      summaryTitleRow: -1,
      summaryStartRow: -1,
      summaryEndRow: -1
    };
    const pushRow = (row = []) => {
      exportRows.push(row);
      const width = Array.isArray(row) ? row.length : 0;
      if (width > layout.maxCols) layout.maxCols = width;
      return exportRows.length - 1;
    };
    const pushSpacer = () => {
      if (!exportRows.length) return;
      const last = exportRows[exportRows.length - 1];
      if (Array.isArray(last) && last.length === 0) return;
      pushRow([]);
    };
    const summaryItems = getPreviewSummaryItems().filter((item) => item.visible);
    const companyItems = companyFields.map((field) => ({
      label: field.label,
      value: pickFieldValue(st.rows, field.key)
    }));
    const hasCompany = companyItems.length > 0;
    const hasSummary = summaryItems.length > 0;
    if (hasCompany || hasSummary) {
      const companyKeyCol = 0;
      const companyValueCol = 1;
      const summaryKeyCol = hasCompany ? 3 : 0;
      const summaryValueCol = summaryKeyCol + 1;
      layout.companyKeyCol = companyKeyCol;
      layout.companyValueCol = companyValueCol;
      layout.summaryKeyCol = summaryKeyCol;
      layout.summaryValueCol = summaryValueCol;

      const titleRow = [];
      if (hasCompany) titleRow[companyKeyCol] = "Entreprise";
      if (hasSummary) titleRow[summaryKeyCol] = "Totaux";
      const titleIdx = pushRow(titleRow);
      if (hasCompany) layout.companyTitleRow = titleIdx;
      if (hasSummary) layout.summaryTitleRow = titleIdx;

      const topRows = Math.max(companyItems.length, summaryItems.length);
      for (let i = 0; i < topRows; i += 1) {
        const row = [];
        const companyItem = companyItems[i];
        const summaryItem = summaryItems[i];
        if (companyItem) {
          row[companyKeyCol] = companyItem.label;
          row[companyValueCol] = companyItem.value;
        }
        if (summaryItem) {
          row[summaryKeyCol] = summaryItem.label;
          row[summaryValueCol] = summaryItem.value;
        }
        const idx = pushRow(row);
        if (companyItem) {
          if (layout.companyStartRow < 0) layout.companyStartRow = idx;
          layout.companyEndRow = idx;
        }
        if (summaryItem) {
          if (layout.summaryStartRow < 0) layout.summaryStartRow = idx;
          layout.summaryEndRow = idx;
        }
      }
      pushSpacer();
    }
    if (exportTableFields.length) {
      layout.tableHeaderRow = pushRow(exportTableFields.map((field) => field.label));
      st.rows.forEach((row) => {
        const idx = pushRow(exportTableFields.map((field) => getTableFieldCellValue(field, row)));
        if (layout.tableStartRow < 0) layout.tableStartRow = idx;
        layout.tableEndRow = idx;
      });
    }
    const sheet = w.XLSX ? w.XLSX.utils.aoa_to_sheet(exportRows) : null;
    if (sheet && format === "xlsx") {
      applyStyledExportSheet(sheet, { exportRows, layout, tableFields: exportTableFields });
    }
    const wb = sheet && w.XLSX ? (() => {
      const book = w.XLSX.utils.book_new();
      w.XLSX.utils.book_append_sheet(book, sheet, "Documents");
      return book;
    })() : null;
    const xlsxData = wb && w.XLSX ? w.XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true
    }) : null;
    const csvData = sheet && w.XLSX
      ? w.XLSX.utils.sheet_to_csv(sheet)
      : `${exportRows.map((r) => r.map((c) => csvEscape(c)).join(",")).join("\n")}\n`;
    return await saveExportFile({ format, xlsxData, csvData, baseName: fileBaseName() });
  };

  const updateResult = () => {
    const nameEl = q("#docHistoryExportGeneratedFileName");
    const openBtn = q("#docHistoryExportOpenFolder");
    const sendBtn = q("#docHistoryExportSendEmail");
    if (nameEl) nameEl.textContent = st.exportName || "-";
    const ok = !!st.exportPath;
    if (openBtn) {
      openBtn.disabled = !ok;
      openBtn.setAttribute("aria-disabled", ok ? "false" : "true");
    }
    if (sendBtn) {
      const emailEnabled = ok && canSendEmailApi;
      sendBtn.disabled = !emailEnabled;
      sendBtn.setAttribute("aria-disabled", emailEnabled ? "false" : "true");
      if (!canSendEmailApi) {
        sendBtn.title = "Envoi e-mail indisponible";
      } else {
        sendBtn.title = "Envoyer le fichier exporte par e-mail";
      }
    }
  };

  const resetWizard = () => {
    clientOptionsLoadToken += 1;
    st.rows = [];
    st.fields = [];
    st.fieldsTab = "";
    st.metaFieldsTab = "";
    st.clientMode = "all";
    st.clientTypeTab = "all";
    st.clientOptionsPage = 0;
    st.clientOptions = [];
    st.clientOptionsContext = "";
    st.clientOptionsLoading = false;
    st.clientOptionsError = "";
    st.maxStepReached = 1;
    st.exportPath = "";
    st.exportName = "";
    emailAttachments = [];
    st.format = "xlsx";
    setDocType(resolveDocType(document.getElementById("docType")?.value || "facture", "facture"));
    syncPreset("custom", false, true);
    setDateFieldsEnabled(true);
    const now = new Date();
    setDateValue(q("#docHistoryExportStartDate"), st.startPicker, toIso(new Date(now.getFullYear(), now.getMonth(), 1)));
    setDateValue(q("#docHistoryExportEndDate"), st.endPicker, toIso(now));
    setClientMode("all");
    validateStep1(true);
    void loadClientOptions({ force: true });
    syncFormat("xlsx", true);
    renderFieldPanel();
    renderPreview();
    updateResult();
    goStep(1);
  };
  const ensureModal = () => {
    if (modal) return modal;
    const wrapper = document.createElement("div");
    wrapper.id = MODAL_ID;
    wrapper.className = "swbDialog client-ledger-modal payments-history-modal doc-export-wizard";
    wrapper.hidden = true;
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.setAttribute("aria-busy", "false");

    const docTypeBtns = DOC_TYPES.map(([v, l]) => `<button type="button" class="btn better-style-v2" data-doc-export-doc-type="${v}" aria-pressed="false">${l}</button>`).join("");
    const docTypeOpts = DOC_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    const presetBtns = PRESETS.map(([v, l], i) => `<button type="button" class="model-select-option${i === 0 ? " is-active" : ""}" data-doc-export-preset-option="${v}" role="option" aria-selected="${i === 0 ? "true" : "false"}">${l}</button>`).join("");
    const presetOpts = PRESETS.map(([v, l], i) => `<option value="${v}"${i === 0 ? " selected" : ""}>${l}</option>`).join("");

    wrapper.innerHTML = `
      <div class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel" role="dialog" aria-modal="true" aria-labelledby="docHistoryExportModalTitle">
        <div class="swbDialog__header">
          <div id="docHistoryExportModalTitle" class="swbDialog__title">Exporter des documents</div>
          <button type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="swbDialog__msg payments-history-modal__body doc-history-modal__body doc-export-wizard__body">
          <div id="docHistoryExportStepper" class="model-stepper__labels" role="tablist" aria-label="Etapes de l'export">
            <button type="button" class="model-stepper__step is-active" data-doc-export-step-indicator="1" role="tab" aria-selected="true" aria-controls="docHistoryExportStep1" id="docHistoryExportStepLabel1" tabindex="0">
              <span class="model-stepper__badge">1</span>
              <span class="model-stepper__title">Type et p&eacute;riode</span>
            </button>
            <button type="button" class="model-stepper__step" data-doc-export-step-indicator="2" role="tab" aria-selected="false" aria-controls="docHistoryExportStep2" id="docHistoryExportStepLabel2" tabindex="-1">
              <span class="model-stepper__badge">2</span>
              <span class="model-stepper__title">Donn&eacute;es</span>
            </button>
            <button type="button" class="model-stepper__step" data-doc-export-step-indicator="3" role="tab" aria-selected="false" aria-controls="docHistoryExportStep3" id="docHistoryExportStepLabel3" tabindex="-1">
              <span class="model-stepper__badge">3</span>
              <span class="model-stepper__title">Format et aper&ccedil;u</span>
            </button>
            <button type="button" class="model-stepper__step" data-doc-export-step-indicator="4" role="tab" aria-selected="false" aria-controls="docHistoryExportStep4" id="docHistoryExportStepLabel4" tabindex="-1">
              <span class="model-stepper__badge">4</span>
              <span class="model-stepper__title">Fichier g&eacute;n&eacute;r&eacute;</span>
            </button>
          </div>

          <section id="docHistoryExportStep1" class="doc-export-wizard__section" data-doc-export-step="1" role="tabpanel" aria-labelledby="docHistoryExportStepLabel1" aria-hidden="false">
            <div class="doc-export-wizard__step-content">
              <div class="doc-export-wizard__step-group doc-export-wizard__step-group--doc-type">
                <div class="field-toggle-menu__title">S&eacute;lectionnez le type de document dont vous souhaitez exporter les donn&eacute;es.</div>
                <div id="docHistoryExportDocTypeOptions" class="swbDialog__options" role="group" aria-label="Type de document">${docTypeBtns}</div>
                <select id="docHistoryExportDocType" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">${docTypeOpts}</select>
              </div>

              <div class="doc-export-wizard__step-group doc-export-wizard__step-group--date-range">
                <p class="report-tax-date-range__intro">S&eacute;lectionnez la p&eacute;riode (dates) que vous souhaitez exporter.</p>
                <div class="report-tax-date-range">
                  <div class="report-tax-date-range__selectors report-tax-date-range__selectors--triple">
                    <label class="report-tax-date-range__selector">
                      <span id="docHistoryExportPresetLabel">Selection</span>
                      <div class="report-tax-date-range__controls">
                        <details id="docHistoryExportPresetMenu" class="field-toggle-menu model-select-menu report-tax-date-range__menu">
                          <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="docHistoryExportPresetLabel docHistoryExportPresetDisplay">
                            <span id="docHistoryExportPresetDisplay">Par dates</span>
                            <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                          </summary>
                          <div id="docHistoryExportPresetPanel" class="field-toggle-panel model-select-panel report-tax-date-range__panel" role="listbox" aria-labelledby="docHistoryExportPresetLabel">${presetBtns}</div>
                        </details>
                        <select id="docHistoryExportPreset" class="report-tax-date-range__select" aria-hidden="true" tabindex="-1">${presetOpts}</select>
                      </div>
                    </label>
                    <label class="report-tax-date-range__selector"><span>Du</span><div class="swb-date-picker" data-date-picker><input id="docHistoryExportStartDate" type="text" inputmode="numeric" placeholder="AAAA-MM-JJ" autocomplete="off" spellcheck="false"><button type="button" class="swb-date-picker__toggle" data-date-picker-toggle aria-label="Choisir une date"><svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-11 8h14M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg></button><div class="swb-date-picker__panel" data-date-picker-panel hidden></div></div></label>
                    <label class="report-tax-date-range__selector"><span>Au</span><div class="swb-date-picker" data-date-picker><input id="docHistoryExportEndDate" type="text" inputmode="numeric" placeholder="AAAA-MM-JJ" autocomplete="off" spellcheck="false"><button type="button" class="swb-date-picker__toggle" data-date-picker-toggle aria-label="Choisir une date"><svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-11 8h14M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg></button><div class="swb-date-picker__panel" data-date-picker-panel hidden></div></div></label>
                  </div>
                  <p id="docHistoryExportDateHint" class="report-tax-date-range__hint" hidden></p>
                </div>
              </div>

              <div id="docHistoryExportClientSelectionGroup" class="doc-export-wizard__step-group doc-export-wizard__step-group--client-selection" hidden aria-hidden="true">
                <div id="docHistoryExportClientSelectionTitle" class="field-toggle-menu__title">S&eacute;lectionnez les fournisseurs &agrave; inclure dans l&apos;export.</div>
                <div id="docHistoryExportClientModeGroup" class="doc-export-wizard__client-mode" role="group" aria-label="Selection des fournisseurs">
                  <button type="button" class="doc-export-wizard__client-mode-btn is-active" data-doc-export-client-mode="all" aria-pressed="true">Tous les fournisseurs</button>
                  <button type="button" class="doc-export-wizard__client-mode-btn" data-doc-export-client-mode="specific" aria-pressed="false">Selectionner des fournisseurs</button>
                </div>
                <div id="docHistoryExportClientPanel" class="field-toggle-panel field-toggle-panel--fields doc-export-wizard__client-panel" role="group" aria-label="Fournisseurs a exporter" hidden aria-hidden="true">
                  <div id="docHistoryExportClientTypeTabs" class="doc-export-wizard__client-type-tabs" role="tablist" aria-label="Filtrer les fournisseurs par type" hidden></div>
                  <div id="docHistoryExportClientOptions" class="doc-export-wizard__field-options-row"></div>
                  <p id="docHistoryExportClientHint" class="client-export-modal__hint" hidden></p>
                </div>
              </div>
            </div>
          </section>

          <section id="docHistoryExportStep2" class="doc-export-wizard__section" data-doc-export-step="2" role="tabpanel" aria-labelledby="docHistoryExportStepLabel2" aria-hidden="true" hidden>
            <div class="doc-export-wizard__step-content">
              <div class="doc-export-wizard__step2-fields">
                <div class="field-toggle-menu__title">S&eacute;lectionnez les donn&eacute;es &agrave; exporter :</div>
                <div id="docHistoryExportFieldTabs" class="doc-export-wizard__field-tabs" role="tablist" aria-label="Categories de donnees a exporter"></div>
                <div id="docHistoryExportFieldPanel" class="field-toggle-panel field-toggle-panel--fields" role="tabpanel" aria-label="Donnees a exporter"></div>
              </div>
              <p id="docHistoryExportDataHint" class="client-export-modal__hint" aria-live="polite"></p>
            </div>
          </section>
          <section id="docHistoryExportStep3" class="doc-export-wizard__section" data-doc-export-step="3" role="tabpanel" aria-labelledby="docHistoryExportStepLabel3" aria-hidden="true" hidden>
            <div class="doc-export-wizard__step-content">
              <div class="doc-dialog-model-picker client-export-modal__format">
                <label class="doc-dialog-model-picker__label" id="articlesExportFormatLabel" for="articlesExportFormat">Format</label>
                <div class="doc-dialog-model-picker__field">
                  <details id="articlesExportFormatMenu" class="field-toggle-menu model-select-menu doc-dialog-model-menu client-export-format-menu" data-select-source="template">
                    <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="articlesExportFormatLabel articlesExportFormatDisplay">
                      <span id="articlesExportFormatDisplay" class="model-select-display">XLSX</span>
                      <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                    </summary>
                    <div id="articlesExportFormatPanel" class="field-toggle-panel model-select-panel client-export-format-panel" role="listbox" aria-labelledby="articlesExportFormatLabel">
                      <button type="button" class="model-select-option is-active" data-doc-export-format-option="xlsx" role="option" aria-selected="true">XLSX</button>
                      <button type="button" class="model-select-option" data-doc-export-format-option="csv" role="option" aria-selected="false">CSV</button>
                    </div>
                  </details>
                  <select id="articlesExportFormat" class="model-select doc-dialog-model-select client-export-format-select" aria-hidden="true" tabindex="-1"><option value="xlsx" selected>XLSX</option><option value="csv">CSV</option></select>
                </div>
              </div>
              <div class="client-export-modal__preview">
                <div class="client-export-modal__preview-title">Exemple d'apercu des donnees qui seront exportees.</div>
                <div class="doc-export-wizard__preview-top">
                  <div id="docHistoryExportPreviewCompany" class="doc-export-wizard__preview-company" hidden aria-hidden="true"></div>
                  <div id="docHistoryExportPreviewSummary" class="doc-export-wizard__preview-company" hidden aria-hidden="true">
                    <table class="doc-export-wizard__preview-company-table">
                      <tbody>
                        <tr id="docHistoryExportPreviewSummaryHT" hidden aria-hidden="true">
                          <td class="doc-export-wizard__preview-company-key">Total G. HT</td>
                          <td class="doc-export-wizard__preview-company-value" data-doc-history-export-summary-value>-</td>
                        </tr>
                        <tr id="docHistoryExportPreviewSummaryTTC" hidden aria-hidden="true">
                          <td class="doc-export-wizard__preview-company-key">Total G. TTC</td>
                          <td class="doc-export-wizard__preview-company-value" data-doc-history-export-summary-value>-</td>
                        </tr>
                        <tr id="docHistoryExportPreviewSummaryTaxe" hidden aria-hidden="true">
                          <td class="doc-export-wizard__preview-company-key">Total G. Taxe</td>
                          <td class="doc-export-wizard__preview-company-value" data-doc-history-export-summary-value>-</td>
                        </tr>
                        <tr id="docHistoryExportPreviewSummaryTVA" hidden aria-hidden="true">
                          <td class="doc-export-wizard__preview-company-key">Total G. TVA</td>
                          <td class="doc-export-wizard__preview-company-value" data-doc-history-export-summary-value>-</td>
                        </tr>
                        <tr id="docHistoryExportPreviewSummaryFODEC" hidden aria-hidden="true">
                          <td class="doc-export-wizard__preview-company-key">Total G. FODEC</td>
                          <td class="doc-export-wizard__preview-company-value" data-doc-history-export-summary-value>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
                  <table><thead><tr id="docHistoryExportPreviewHead"></tr></thead><tbody><tr id="docHistoryExportPreviewRow"></tr></tbody></table>
                </div>
              </div>
            </div>
          </section>

          <section id="docHistoryExportStep4" class="doc-export-wizard__section" data-doc-export-step="4" role="tabpanel" aria-labelledby="docHistoryExportStepLabel4" aria-hidden="true" hidden>
            <div class="doc-export-wizard__step-content">
              <div class="field-toggle-menu__title">Le fichier a &eacute;t&eacute; export&eacute; avec succ&egrave;s. Le nom du fichier est le suivant :</div>
              <div class="client-export-modal__summary doc-export-wizard__result">
                <div id="docHistoryExportGeneratedFileName">-</div>
              </div>
              <div class="doc-export-wizard__step4-actions">
                <button id="docHistoryExportOpenFolder" type="button" class="client-search__edit doc-history__open-folder" aria-label="Ouvrir l'emplacement du fichier exporte" title="Ouvrir l'emplacement du fichier exporte" disabled>
                  <span class="doc-history__folder-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true"><path d="M3.5 6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 18h17a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-8.172a1.5 1.5 0 0 1-1.06-.44L9.5 6H3.5z" fill="currentColor"></path></svg></span>
                </button>
                <button id="docHistoryExportSendEmail" type="button" class="client-search__add" aria-label="Envoyer le fichier exporte par e-mail" disabled>Envoyer par e-mail</button>
              </div>
            </div>
          </section>
        </div>

        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="docHistoryExportModalCancel" type="button" class="btn btn-close client-search__close">Annuler</button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="docHistoryExportModalBack" type="button" class="client-search__edit" hidden>Precedent</button>
            <button id="docHistoryExportModalNext" type="button" class="client-search__add">Suivant</button>
            <button id="docHistoryExportModalSave" type="button" class="client-search__add" hidden>Exporter</button>
            <button id="docHistoryExportModalDone" type="button" class="client-search__add" hidden>Terminer</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(wrapper);
    modal = wrapper;

    const startInput = q("#docHistoryExportStartDate");
    const endInput = q("#docHistoryExportEndDate");
    if (w.AppDatePicker?.create) {
      st.startPicker = w.AppDatePicker.create(startInput, {
        labels: {
          today: "Aujourd'hui",
          clear: "Effacer",
          prevMonth: "Mois precedent",
          nextMonth: "Mois suivant",
          dialog: "Choisir une date"
        },
        allowManualInput: true,
        onChange: () => {
          invalidateClientOptions();
          void loadClientOptions();
          validateStep1(true);
          updateButtons();
        }
      });
      st.endPicker = w.AppDatePicker.create(endInput, {
        labels: {
          today: "Aujourd'hui",
          clear: "Effacer",
          prevMonth: "Mois precedent",
          nextMonth: "Mois suivant",
          dialog: "Choisir une date"
        },
        allowManualInput: true,
        onChange: () => {
          invalidateClientOptions();
          void loadClientOptions();
          validateStep1(true);
          updateButtons();
        }
      });
    }
    startInput?.addEventListener("input", () => {
      invalidateClientOptions();
      validateStep1(true);
      updateButtons();
    });
    endInput?.addEventListener("input", () => {
      invalidateClientOptions();
      validateStep1(true);
      updateButtons();
    });
    startInput?.addEventListener("change", () => {
      void loadClientOptions();
    });
    endInput?.addEventListener("change", () => {
      void loadClientOptions();
    });

    return modal;
  };

  const bindModalEvents = () => {
    if (!modal || modal.dataset.docExportBound === "1") return;
    modal.dataset.docExportBound = "1";

    modal.querySelectorAll("details").forEach((menu) => {
      menu.addEventListener("toggle", () => {
        menu.querySelector(".field-toggle-trigger")?.setAttribute("aria-expanded", menu.open ? "true" : "false");
      });
    });
    q("#docHistoryExportStepper")?.addEventListener("keydown", onStepperKeydown);
    q("#docHistoryExportFieldTabs")?.addEventListener("keydown", onFieldTabsKeydown);
    q("#docHistoryExportFieldPanel")?.addEventListener("keydown", onMetaFieldTabsKeydown);
    q("#docHistoryExportClientTypeTabs")?.addEventListener("keydown", onClientTypeTabsKeydown);

    modal.addEventListener("click", (evt) => {
      const stepBtn = evt.target?.closest?.("[data-doc-export-step-indicator]");
      if (stepBtn) {
        evt.preventDefault();
        const targetStep = Number(stepBtn.dataset.docExportStepIndicator || 1);
        activateStepFromIndicator(targetStep, { focus: true });
        return;
      }
      const fieldTabBtn = evt.target?.closest?.("[data-doc-export-field-tab]");
      if (fieldTabBtn) {
        evt.preventDefault();
        setFieldsTab(fieldTabBtn.dataset.docExportFieldTab || "", { focus: true });
        return;
      }
      const metaFieldTabBtn = evt.target?.closest?.("[data-doc-export-meta-tab]");
      if (metaFieldTabBtn) {
        evt.preventDefault();
        setMetaFieldsTab(metaFieldTabBtn.dataset.docExportMetaTab || "", { focus: true });
        return;
      }
      const closeBtn = evt.target?.closest?.(".swbDialog__close");
      if (closeBtn && modal.contains(closeBtn)) {
        evt.preventDefault();
        closeModal();
        return;
      }
      const typeBtn = evt.target?.closest?.("[data-doc-export-doc-type]");
      if (typeBtn) {
        evt.preventDefault();
        setDocType(typeBtn.dataset.docExportDocType || "facture");
        return;
      }
      const clientModeBtn = evt.target?.closest?.("[data-doc-export-client-mode]");
      if (clientModeBtn) {
        evt.preventDefault();
        const nextMode = clientModeBtn.dataset.docExportClientMode || "all";
        setClientMode(nextMode);
        void loadClientOptions();
        return;
      }
      const clientTypeTabBtn = evt.target?.closest?.("[data-doc-export-client-type-tab]");
      if (clientTypeTabBtn) {
        evt.preventDefault();
        setClientTypeTab(clientTypeTabBtn.dataset.docExportClientTypeTab || "all", { focus: true });
        return;
      }
      const clientPageBtn = evt.target?.closest?.("[data-doc-export-client-page]");
      if (clientPageBtn) {
        evt.preventDefault();
        if (clientPageBtn.disabled) return;
        const dir = clientPageBtn.dataset.docExportClientPage === "prev" ? -1 : 1;
        st.clientOptionsPage = Math.max(0, (Number(st.clientOptionsPage) || 0) + dir);
        renderClientSelectionPanel();
        return;
      }
      const presetBtn = evt.target?.closest?.("[data-doc-export-preset-option]");
      if (presetBtn) {
        evt.preventDefault();
        syncPreset(presetBtn.dataset.docExportPresetOption || "custom", true, true);
        return;
      }
      const formatBtn = evt.target?.closest?.("[data-doc-export-format-option]");
      if (formatBtn) {
        evt.preventDefault();
        syncFormat(formatBtn.dataset.docExportFormatOption || "xlsx", true);
        return;
      }
      if (evt.target === modal) evt.stopPropagation();
    });

    q("#docHistoryExportPreset")?.addEventListener("change", (evt) => syncPreset(evt.target?.value || "custom", true, false));
    q("#articlesExportFormat")?.addEventListener("change", (evt) => syncFormat(evt.target?.value || "xlsx", false));

    q("#docHistoryExportFieldPanel")?.addEventListener("change", (evt) => {
      if (!evt.target?.closest?.(".col-toggle")) return;
      syncFieldsFromUi();
      setPreviewVisibility();
      validateStep2(true);
      updateButtons();
    });
    q("#docHistoryExportClientPanel")?.addEventListener("change", (evt) => {
      if (!evt.target?.closest?.("[data-doc-export-client-key]")) return;
      syncClientOptionsFromUi();
      validateStep1(true);
      updateButtons();
    });

    q("#docHistoryExportModalCancel")?.addEventListener("click", closeModal);
    q("#docHistoryExportModalBack")?.addEventListener("click", () => {
      if (st.step > 1) goStep(st.step - 1);
    });
    q("#docHistoryExportModalNext")?.addEventListener("click", async () => {
      if (st.step === 1) {
        if (isSpecificClientSelectionEnabled()) {
          syncClientOptionsFromUi();
          await loadClientOptions({
            force:
              st.clientOptionsContext !== clientSelectionContextKey() ||
              !!st.clientOptionsError
          });
          syncClientOptionsFromUi();
        }
        const ok = validateStep1(true);
        updateButtons();
        if (!ok) return;
        try {
          setBusy(true);
          await loadSelectionRows();
          goStep(2);
        } catch (err) {
          await showDialog?.(String(err?.message || err || "Export impossible."), { title: "Export" });
        } finally {
          setBusy(false);
          updateButtons();
        }
        return;
      }
      if (st.step === 2) {
        syncFieldsFromUi();
        const ok = validateStep2(true);
        updateButtons();
        if (!ok) return;
        renderPreview();
        goStep(3);
      }
    });
    q("#docHistoryExportModalSave")?.addEventListener("click", async () => {
      try {
        syncFieldsFromUi();
        if (!validateStep2(true)) {
          goStep(2);
          updateButtons();
          return;
        }
        setBusy(true);
        const res = await doExport();
        if (!res) return;
        st.exportPath = txt(res.path);
        st.exportName = txt(res.name) || `${fileBaseName()}.${st.format === "csv" ? "csv" : "xlsx"}`;
        updateResult();
        goStep(4);
      } catch (err) {
        await showDialog?.(String(err?.message || err || "Export impossible."), { title: "Export" });
      } finally {
        setBusy(false);
        updateButtons();
      }
    });
    q("#docHistoryExportModalDone")?.addEventListener("click", closeModal);

    q("#docHistoryExportOpenFolder")?.addEventListener("click", async () => {
      const p = txt(st.exportPath);
      if (!p) return;
      try {
        if (API?.showInFolder) {
          const ok = await API.showInFolder(p);
          if (ok) return;
        }
        if (API?.openPath) await API.openPath(p);
      } catch {}
    });
    q("#docHistoryExportSendEmail")?.addEventListener("click", async (evt) => {
      if (!canSendEmailApi) {
        await showDialog?.("Envoi e-mail indisponible dans ce mode.", { title: "E-mail" });
        return;
      }
      if (!txt(st.exportPath)) {
        await showDialog?.("Aucun fichier exporte disponible.", { title: "E-mail" });
        return;
      }
      openEmailModal(evt?.currentTarget || evt?.target || null);
    });
  };

  const openModal = (trigger) => {
    ensureModal();
    bindModalEvents();
    restoreFocus = trigger && trigger.focus ? trigger : document.activeElement;
    resetWizard();
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.addEventListener("keydown", onKeydown);
    setBusy(false);
    goStep(1);
    q("#docHistoryExportModalNext")?.focus?.();
  };

  document.addEventListener("click", async (evt) => {
    const trigger = evt.target?.closest?.(BTN_SELECTOR);
    if (!trigger || trigger.disabled) return;
    trigger.disabled = true;
    try {
      openModal(trigger);
    } catch (err) {
      await showDialog?.(String(err?.message || err || "Export impossible."), { title: "Export" });
    } finally {
      trigger.disabled = false;
    }
  });
})(window);

