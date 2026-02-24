// pdfWH.js — Certificat de Retenue (pixel-close to the provided photos)
(function (global) {
  const PDFWH_CSS_HREF = "./styles/pdf-wh.css";
  const PDFWH_CSS_LINK_ID = "pdf-wh-css";
  const electronAssets = global?.electronAPI?.assets || {};
  let pdfWhCssText = typeof electronAssets.pdfWhCss === "string" ? electronAssets.pdfWhCss : "";
  let cssFetchStarted = false;

  function ensurePdfWhStylesheet() {
    let link = document.getElementById(PDFWH_CSS_LINK_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = PDFWH_CSS_LINK_ID;
      link.rel = "stylesheet";
      link.href = PDFWH_CSS_HREF;
      document.head.appendChild(link);
    }
    if (!link.dataset.pdfWhCss) {
      link.dataset.pdfWhCss = "ready";
      link.addEventListener("load", capturePdfWhCssFromStylesheet);
      link.addEventListener("error", requestPdfWhCssFallback);
    }
  }

  function capturePdfWhCssFromStylesheet() {
    if (pdfWhCssText) return;
    try {
      const sheets = Array.from(document.styleSheets || []);
      const sheet = sheets.find((s) => s.ownerNode && s.ownerNode.id === PDFWH_CSS_LINK_ID);
      if (!sheet || !sheet.cssRules) return;
      pdfWhCssText = Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
    } catch {
      requestPdfWhCssFallback();
    }
  }

  function requestPdfWhCssFallback() {
    if (pdfWhCssText || cssFetchStarted || typeof fetch !== "function") return;
    cssFetchStarted = true;
    fetch(PDFWH_CSS_HREF)
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => { if (text) pdfWhCssText = text; })
      .catch(() => {});
  }

  function ensurePdfWhCssReady() {
    ensurePdfWhStylesheet();
    if (pdfWhCssText) return;
    if (document.readyState === "complete" || document.readyState === "interactive") {
      capturePdfWhCssFromStylesheet();
    } else {
      document.addEventListener("DOMContentLoaded", capturePdfWhCssFromStylesheet, { once: true });
    }
    requestPdfWhCssFallback();
  }

  ensurePdfWhCssReady();



  // helpers
  const esc = (s = "") => String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");

  const fmt3 = (n) =>
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(Number(n || 0));

  // Calculate totals from items + extras (shipping/stamp/fodec)
  function totalsForWH(state) {
    const items = Array.isArray(state?.items) ? state.items : [];
    // extras can come from meta.extras or a top-level extras block; prefer meta when present
    const ex    = state?.meta?.extras || state?.extras || {};
    const taxesEnabled = state?.meta?.taxesEnabled !== false;

    // items: HT & TVA
    let subtotal=0, totalDiscount=0, totalTax=0, fodecHT=0, fodecTVA=0;
    for (const it of items) {
      const base = Number(it.qty||0)*Number(it.price||0);
      const disc = base*(Number(it.discount||0)/100);
      const after= Math.max(0, base-disc);
      const taxRate = taxesEnabled ? Number(it.tva||0) : 0;
      const tax  = after*(taxRate/100);
      const fCfg = it && typeof it.fodec === "object" ? it.fodec : {};
      const fEnabled = !!fCfg.enabled && Number.isFinite(Number(fCfg.rate));
      const fRate = Number(fCfg.rate || 0);
      const fTvaRate = Number(fCfg.tva || 0);
      const fHt = fEnabled ? after * (fRate / 100) : 0;
      const fTva = fEnabled && taxesEnabled ? fHt * (fTvaRate / 100) : 0;
      subtotal+=base; totalDiscount+=disc; totalTax+=tax;
      fodecHT += fHt; fodecTVA += fTva;
    }
    const totalHT_items  = subtotal - totalDiscount;
    const totalTTC_items = totalHT_items + totalTax;

    // shipping
    const shipHT  = ex?.shipping?.enabled ? Number(ex.shipping.amount||0) : 0;
    const shipTVA = shipHT * (Number(ex?.shipping?.tva||0)/100);
    const shipTT  = shipHT + shipTVA;

    // dossier
    const dossierHT  = ex?.dossier?.enabled ? Number(ex.dossier.amount||0) : 0;
    const dossierTVA = dossierHT * (Number(ex?.dossier?.tva||0)/100);
    const dossierTT  = dossierHT + dossierTVA;

    // deplacement
    const deplacementHT  = ex?.deplacement?.enabled ? Number(ex.deplacement.amount||0) : 0;
    const deplacementTVA = deplacementHT * (Number(ex?.deplacement?.tva||0)/100);
    const deplacementTT  = deplacementHT + deplacementTVA;

    // stamp
    const stampHT  = ex?.stamp?.enabled ? Number(ex.stamp.amount||0) : 0;
    const stampTT  = stampHT;

    // totals (keep HT excluding stamp, TTC including stamp)
    const totalHT_all    = totalHT_items + shipHT + dossierHT + deplacementHT; // timbre exclu en HT
    const totalTVA_all   = totalTax + shipTVA + dossierTVA + deplacementTVA + fodecTVA;
    const totalTTC_all   = totalHT_all + fodecHT + totalTVA_all + stampTT;
    return { totalHT_all, totalTTC_all, stampTT, totalTVA_all, fodecHT };
  }

  // Build rows to mimic the sheet exactly; if meta.withholding.rows exists it is used.
  function computeTableRows(state) {
    const meta = state?.meta || {};
    const wh   = meta.withholding || {};
    const rate = Number(wh.rate || 0);
    const { totalHT_all, totalTTC_all, stampTT, totalTVA_all, fodecHT } = totalsForWH(state);
    // TVA due column should show TVA (and related) but not stamp or FODEC base
    const tvaDue = Math.max(0, totalTVA_all);

    if (Array.isArray(wh.rows) && wh.rows.length) {
      return wh.rows.map(r => ({
        label: r.label || "",
        ht: Number(r.ht || 0),
        tva: Number(r.tva || 0),
        ttc: Number(r.ttc || 0),
        tvrs: Number(r.tvrs || 0),
        taux: Number(r.rate ?? r.taux ?? rate),
        retenue: Number(r.retenue || 0),
        servi: Number(r.servi || 0),
      }));
    }

    // Default: single filled row using calculated totals (base includes timbre fiscal)
    const retenueBase = Math.max(0, totalTTC_all);
    const retenue = retenueBase * (rate/100);
    const servi   = Math.max(0, totalTTC_all - retenue);
    const labelText =
      "Montants égaux ou supérieurs à 1.000 D y compris la TVA au titre des acquisitions des marchandises, matériel équipements et de services, auprès des personnes physiques et des personnes morales soumises à l’IS au taux autres que 15% et 10%";

    return [
      { label: labelText, ht: totalHT_all, tva: tvaDue, ttc: totalTTC_all, tvrs: 0, taux: rate, retenue, servi }
    ];
  }

  function build(state, assets) {
    const company = state?.company || {};
    const client  = state?.client  || {};
    const meta    = state?.meta    || {};
    const docType = String(meta.docType || "").toLowerCase();
    const isPurchase = docType === "fa";
    const payeur = isPurchase ? company : client;
    const beneficiaire = isPurchase ? client : company;
    const logoURL = (assets && (assets.ministere || assets.ministereFinanceLogo)) || "./assets/ministerefinancelogo.png";
    const qrURL   = assets && assets.qr;

    const date = meta.date || new Date().toISOString().slice(0,10);
    const createdStr   = meta.whCreated || date;
    const declarantNum = meta.number || "";
    const exercice     = String(meta.fiscalYear || (date || "").slice(0,4));
    const paymentDate  = meta.paymentDate || date;
    const reference    = meta.whRef || meta.reference || "";

    const rows = computeTableRows(state);
    const sumTTC  = rows.reduce((a,r)=>a+Number(r.ttc||0),0);
    const sumRet  = rows.reduce((a,r)=>a+Number(r.retenue||0),0);
    const sumServ = rows.reduce((a,r)=>a+Number(r.servi||0),0);

    return `
      <div class="wh-page">

        <div class="center-titles">
          <div class="l1">DUPLICATA DU CERTIFICAT DE RETENUE À LA SOURCE AU TITRE DE LA TVA ET DE L’IMPÔT SUR LE REVENU OU DE L’IMPÔT SUR LES SOCIÉTÉS
        </div>

        <div class="ref-wrap">
          <table class="ref-table"><thead><tr>
            <th>Référence</th><th style="text-align:left">${esc(reference)}</th>
          </tr></thead></table>
          <table class="ref-grid"><tbody>
            <tr>
              <th>Créé le</th>
              <th>Numéro chez le déclarant</th>
              <th>Exercice de facturation</th>
              <th>Date de paiement</th>
            </tr>
            <tr>
              <td>${esc(createdStr)}</td>
              <td>${esc(declarantNum)}</td>
              <td>${esc(exercice)}</td>
              <td>${esc(paymentDate)}</td>
            </tr>
          </tbody></table>
        </div>

        <section class="section" style="margin-top:8.8mm">
          <div class="band">Personne ou organisme Payeur</div>
          <table class="kv-table"><tbody>
            <tr><th>Type identifiant</th><td>Matricule fiscal</td></tr>
            <tr><th>Identifiant</th><td>${esc(payeur.vat || "")}</td></tr>
            <tr><th>Nom et prénom ou raison sociale</th><td style="text-transform:uppercase">${esc(payeur.name || "")}</td></tr>
            <tr><th>Adresse</th><td>${esc(payeur.address || "")}</td></tr>
            <tr><th>Activité/Profession</th><td>${esc(payeur.activity || payeur.profession || "")}</td></tr>
          </tbody></table>
        </section>

        <section class="section" style="margin-top:8mm">
          <div class="band">Bénéficiaire</div>
          <table class="kv-table"><tbody>
            <tr><th>Type identifiant</th><td>Matricule fiscal</td></tr>
            <tr><th>Identifiant</th><td>${esc(beneficiaire.vat || "")}</td></tr>
            <tr><th>Nom et prénom ou raison sociale</th><td style="text-transform:uppercase">${esc(beneficiaire.name || "")}</td></tr>
            <tr><th>Adresse</th><td>${esc(beneficiaire.address || "")}</td></tr>
            <tr><th>Activité/Profession</th><td>${esc(beneficiaire.activity || beneficiaire.profession || "")}</td></tr>
          </tbody></table>
        </section>

        <section class="retenues">
          <div class="band">RETENUES EFFECTUÉES</div>
          <table class="wh-table">
            <colgroup>
              <col class="c1"/><col class="c2"/><col class="c3"/><col class="c4"/>
              <col class="c5"/><col class="c6"/><col class="c7"/><col class="c8"/>
            </colgroup>
            <thead><tr>
              <th>Nature de l’opération</th>
              <th class="num">Montants<br/>Hors TVA</th>
              <th class="num">TVA due</th>
              <th class="num">Montant total<br/>TVA comprise</th>
              <th class="num">TVA retenue<br/>à la source</th>
              <th class="num">Taux de la<br/>retenue</th>
              <th class="num">Montant de<br/>la retenue</th>
              <th class="num">Montant<br/>servi</th>
            </tr></thead>
            <tbody>
              ${computeTableRows(state).map(r => `
                <tr>
                  <td class="label">${esc(r.label)}</td>
                  <td class="num">${r.ht ? fmt3(r.ht) : ""}</td>
                  <td class="num">${r.tva ? fmt3(r.tva) : ""}</td>
                  <td class="num">${r.ttc ? fmt3(r.ttc) : ""}</td>
                  <td class="num">${r.tvrs ? fmt3(r.tvrs) : (r.tvrs===0 ? "0" : "")}</td>
                  <td class="num">${(r.taux||r.taux===0) ? String(r.taux).replace(".", ",") : ""}</td>
                  <td class="num">${r.retenue ? fmt3(r.retenue) : (r.retenue===0 ? "0" : "")}</td>
                  <td class="num">${r.servi ? fmt3(r.servi) : (r.servi===0 ? "0" : "")}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr>
                <th style="text-align:left">Total</th>
                <th></th><th></th>
                <th class="num">${sumTTC ? fmt3(sumTTC) : ""}</th>
                <th></th><th></th>
                <th class="num">${sumRet ? fmt3(sumRet) : ""}</th>
                <th class="num">${sumServ ? fmt3(sumServ) : ""}</th>
              </tr>
            </tfoot>
          </table>
        </section>
      </div>
    `;
  }

  function ensureRoot() {
    let root = document.getElementById("pdfRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "pdfRoot";
      document.body.appendChild(root);
    }
    return root;
  }

  function render(state, assets) {
    ensurePdfWhStylesheet();
    const root = ensureRoot();
    root.innerHTML = build(state, assets);
  }

  const PDFWH_API = { build, render };
  Object.defineProperty(PDFWH_API, "css", {
    enumerable: true,
    get() { return pdfWhCssText || ""; },
  });
  global.PDFWH = PDFWH_API;
})(window);
