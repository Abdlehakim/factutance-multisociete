(function (w) {
  if (typeof w.registerHelpers !== "function") return;

  const pad2 = (value) => String(value).padStart(2, "0");
  const MATRICULE_EXTRACT_RE = /\d{7}[A-Z]/;
  const MATRICULE_FULL_RE = /^\d{7}[A-Z]$/;
  const DATE_DMY_RE = /^\d{2}\/\d{2}\/\d{4}$/;
  const AMOUNT_INT_RE = /^\d+$/;

  const toDateSafe = (value) => {
    if (!value) return new Date();
    const dt = new Date(value);
    return Number.isFinite(dt.getTime()) ? dt : new Date();
  };

  const formatDateDMY = (value) => {
    const dt = toDateSafe(value);
    return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  };

  const resolveYearMonth = (value) => {
    const dt = toDateSafe(value);
    return { year: String(dt.getFullYear()), month: pad2(dt.getMonth() + 1) };
  };

  const xmlEscape = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const normalizeMatriculeFiscal = (input) => {
    const raw = String(input ?? "").toUpperCase();
    const match = raw.match(MATRICULE_EXTRACT_RE);
    if (match) return match[0];
    const cleaned = raw.replace(/[^0-9A-Z]/g, "");
    const compactMatch = cleaned.match(MATRICULE_EXTRACT_RE);
    return compactMatch ? compactMatch[0] : "";
  };

  const toMillimesInt = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    return String(Math.round(num * 1000));
  };

  const formatRate = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0.00";
    return num.toFixed(2);
  };
  const normalizeBinaryFlag = (value, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num >= 1 ? 1 : 0;
  };

  const parseDateDmy = (value) => {
    const raw = String(value || "").trim();
    if (!DATE_DMY_RE.test(raw)) return null;
    const [day, month, year] = raw.split("/").map((part) => Number(part));
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    const dt = new Date(year, month - 1, day);
    return Number.isFinite(dt.getTime()) ? dt : null;
  };

  const resolveContributorCategory = (entity) => {
    const type = String(entity?.type || "").toLowerCase();
    if (type === "particulier" || type === "personne_physique") return "PP";
    return "PM";
  };

  const resolveDeclarantCategory = (payload) => {
    const companyType = payload?.state?.company?.type;
    if (!companyType) return "";
    return resolveContributorCategory({ type: companyType });
  };

  const resolveIdentifiant = (entity) => {
    const vat = String(entity?.vat || "").trim();
    if (vat) return vat;
    const customs = String(entity?.customsCode || "").trim();
    return customs;
  };

  const resolveResidentFlag = (entity) => {
    const resident = entity?.resident;
    if (typeof resident === "number" || typeof resident === "string") return String(resident);
    return "1";
  };

  const normalizePhoneDigits = (value) => String(value ?? "").replace(/\D/g, "");

  const resolveActeDepot = (payload, meta) => {
    const raw = payload?.acteDepot ?? payload?.codeActe ?? payload?.acte ?? meta?.acteDepot ?? 0;
    const cleaned = String(raw ?? "").trim();
    if (!cleaned) return "0";
    if (/^\d+$/.test(cleaned)) return cleaned;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? String(Math.trunc(numeric)) : "0";
  };

  const resolveYearMonthForFile = (payload, snapshot) => {
    const rawGenerationDate =
      payload?.generationDate ||
      payload?.date ||
      payload?.state?.meta?.date ||
      snapshot?.dateForFolder ||
      "";
    if (rawGenerationDate) return resolveYearMonth(rawGenerationDate);
    const rawPaymentDate =
      payload?.paymentDate || payload?.state?.meta?.paymentDate || snapshot?.paymentDate || "";
    if (rawPaymentDate) return resolveYearMonth(rawPaymentDate);
    const dmyDate = parseDateDmy(snapshot?.datePayement);
    if (dmyDate) {
      return { year: String(dmyDate.getFullYear()), month: pad2(dmyDate.getMonth() + 1) };
    }
    return {
      year: String(snapshot?.year || "").trim(),
      month: String(snapshot?.month || "").trim()
    };
  };

  const resolveWithholdingSnapshot = (payload = {}) => {
    const state = payload.state || {};
    const meta = state.meta || {};
    const totals = payload.totals || {};
    const declarant = payload.declarant || state.client || {};
    const beneficiary = payload.beneficiary || state.company || {};
    const operationTypeInput = payload.operationType || "RS7_000001";
    const depositDate = payload.depositDate || meta.date;
    const paymentDate = payload.paymentDate || meta.paymentDate || meta.date;
    const invoiceDate = meta.date || depositDate;
    const reference = payload.reference ?? meta.number ?? "";
    const rateValueRaw = Number(payload.rate ?? meta.withholding?.rate ?? 0);
    const rateValue = Number.isFinite(rateValueRaw) ? rateValueRaw : 0;
    const thresholdValue = Number(payload.threshold ?? meta.withholding?.threshold ?? 0);
    const cnpc = normalizeBinaryFlag(
      payload.cnpc ?? payload.CNPC ?? meta.cnpc ?? meta.CNPC ?? 0
    );
    const pCharge = normalizeBinaryFlag(
      payload.pCharge ?? payload.p_charge ?? payload.P_Charge ?? meta.pCharge ?? meta.p_charge ?? meta.P_Charge ?? 0
    );
    const acteDepot = resolveActeDepot(payload, meta);
    const operationType = String(operationTypeInput || "").trim() || "RS7_000001";

    const totalHT = Number(totals.totalHT ?? 0);
    const totalTVA = Number(totals.tax ?? 0);
    const totalTTC = totalHT + totalTVA;
    let tvaRate = totalHT ? (totalTVA / totalHT) * 100 : 0;
    if (!Number.isFinite(tvaRate)) tvaRate = 0;
    const baseValue = Number.isFinite(totalTTC) ? totalTTC : 0;
    const meetsThreshold =
      !Number.isFinite(thresholdValue) || thresholdValue <= 0 || baseValue >= thresholdValue;
    const whAmount = meetsThreshold ? Math.max(0, baseValue) * (rateValue / 100) : 0;
    const netAmount = Math.max(0, baseValue - whAmount);

    const dateForFolder = depositDate || invoiceDate;
    const { year, month } = resolveYearMonth(dateForFolder);
    const yearFact = String(toDateSafe(invoiceDate).getFullYear());
    const datePayement = formatDateDMY(paymentDate);
    const declarantIdentifiant = normalizeMatriculeFiscal(resolveIdentifiant(declarant));
    const beneficiaryIdentifiant = normalizeMatriculeFiscal(resolveIdentifiant(beneficiary));
    const beneficiaryActivity = String(beneficiary?.activity || beneficiary?.profession || "").trim();

    const amounts = {
      MontantHT: toMillimesInt(totalHT),
      MontantTVA: toMillimesInt(totalTVA),
      MontantTTC: toMillimesInt(totalTTC),
      MontantRS: toMillimesInt(whAmount),
      MontantNetServi: toMillimesInt(netAmount)
    };
    const totalAmounts = {
      TotalMontantHT: toMillimesInt(totalHT),
      TotalMontantTVA: toMillimesInt(totalTVA),
      TotalMontantTTC: toMillimesInt(totalTTC),
      TotalMontantRS: toMillimesInt(whAmount),
      TotalMontantNetServi: toMillimesInt(netAmount)
    };

    return {
      declarant,
      beneficiary,
      declarantIdentifiant,
      beneficiaryIdentifiant,
      declarantCategory: resolveDeclarantCategory(payload),
      beneficiaryCategory: resolveContributorCategory(beneficiary),
      residentFlag: resolveResidentFlag(beneficiary),
      beneficiaryName: beneficiary.name || "",
      beneficiaryAddress: beneficiary.address || "",
      beneficiaryActivity,
      beneficiaryEmail: beneficiary.email || "",
      beneficiaryPhone: normalizePhoneDigits(beneficiary.phone || ""),
      reference,
      acteDepot,
      year,
      month,
      yearFact,
      datePayement,
      rateValue,
      tvaRate,
      cnpc,
      pCharge,
      operationType,
      amounts,
      totalAmounts,
      dateForFolder
    };
  };

  const resolveDatePayement = (value) => {
    const raw = String(value || "").trim();
    if (DATE_DMY_RE.test(raw)) return raw;
    return formatDateDMY(raw);
  };

  const resolveWithholdingOperation = (payload = {}) => {
    const state = payload.state || {};
    const meta = state.meta || {};
    const totals = payload.totals || {};
    const totalHT = Number(totals.totalHT ?? 0);
    const totalTVA = Number(totals.tax ?? 0);
    const totalTTC = totalHT + totalTVA;
    let tvaRate = totalHT ? (totalTVA / totalHT) * 100 : 0;
    if (!Number.isFinite(tvaRate)) tvaRate = 0;

    const rateValueRaw = Number(payload.rate ?? meta.withholding?.rate ?? 0);
    const rateValue = Number.isFinite(rateValueRaw) ? rateValueRaw : 0;
    const thresholdValue = Number(payload.threshold ?? meta.withholding?.threshold ?? 0);
    const baseValue = Number.isFinite(totalTTC) ? totalTTC : 0;
    const meetsThreshold =
      !Number.isFinite(thresholdValue) || thresholdValue <= 0 || baseValue >= thresholdValue;
    const whAmount = meetsThreshold ? Math.max(0, baseValue) * (rateValue / 100) : 0;
    const netAmount = Math.max(0, baseValue - whAmount);

    const operationType = String(
      payload.operationType ||
        meta.operationType ||
        meta.operation_type ||
        meta.withholding?.operationType ||
        "RS7_000001"
    ).trim() || "RS7_000001";
    const cnpc = normalizeBinaryFlag(payload.cnpc ?? payload.CNPC ?? meta.cnpc ?? meta.CNPC ?? 0);
    const pCharge = normalizeBinaryFlag(
      payload.pCharge ??
        payload.p_charge ??
        payload.P_Charge ??
        meta.pCharge ??
        meta.p_charge ??
        meta.P_Charge ??
        0
    );

    const invoiceDate =
      payload.invoiceDate || meta.date || payload.depositDate || payload.date || "";
    const yearFact = String(toDateSafe(invoiceDate).getFullYear());

    return {
      operationType,
      yearFact,
      cnpc,
      pCharge,
      rateValue,
      tvaRate,
      amounts: {
        MontantHT: toMillimesInt(totalHT),
        MontantTVA: toMillimesInt(totalTVA),
        MontantTTC: toMillimesInt(totalTTC),
        MontantRS: toMillimesInt(whAmount),
        MontantNetServi: toMillimesInt(netAmount)
      }
    };
  };

  const readMillimesInt = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const num = Number(raw);
    if (!Number.isFinite(num)) return 0;
    return Math.trunc(num);
  };

  const sumOperationAmounts = (operations) => {
    const totals = {
      TotalMontantHT: 0,
      TotalMontantTVA: 0,
      TotalMontantTTC: 0,
      TotalMontantRS: 0,
      TotalMontantNetServi: 0
    };
    operations.forEach((operation) => {
      totals.TotalMontantHT += readMillimesInt(operation?.amounts?.MontantHT);
      totals.TotalMontantTVA += readMillimesInt(operation?.amounts?.MontantTVA);
      totals.TotalMontantTTC += readMillimesInt(operation?.amounts?.MontantTTC);
      totals.TotalMontantRS += readMillimesInt(operation?.amounts?.MontantRS);
      totals.TotalMontantNetServi += readMillimesInt(operation?.amounts?.MontantNetServi);
    });
    return {
      TotalMontantHT: String(totals.TotalMontantHT),
      TotalMontantTVA: String(totals.TotalMontantTVA),
      TotalMontantTTC: String(totals.TotalMontantTTC),
      TotalMontantRS: String(totals.TotalMontantRS),
      TotalMontantNetServi: String(totals.TotalMontantNetServi)
    };
  };

  const resolveWithholdingCertificate = (payload = {}, certificate = {}) => {
    const state = payload.state || {};
    const meta = state.meta || {};
    const beneficiary = certificate.beneficiary || payload.beneficiary || state.client || {};
    const beneficiaryIdentifiant = normalizeMatriculeFiscal(resolveIdentifiant(beneficiary));
    const beneficiaryActivity = String(beneficiary?.activity || beneficiary?.profession || "").trim();
    const paymentDate =
      certificate.paymentDate ??
      payload.paymentDate ??
      meta.paymentDate ??
      meta.date ??
      "";
    const reference =
      String(certificate.reference ?? "").trim() ||
      String(payload.reference ?? "").trim() ||
      String(meta.number ?? "").trim() ||
      "";

    const operationsInput = Array.isArray(certificate.operations) ? certificate.operations : [];
    const operations = operationsInput.map((operation) => resolveWithholdingOperation(operation));
    const totalAmounts = sumOperationAmounts(operations);

    return {
      beneficiary,
      beneficiaryIdentifiant,
      beneficiaryCategory: resolveContributorCategory(beneficiary),
      residentFlag: resolveResidentFlag(beneficiary),
      beneficiaryName: beneficiary.name || "",
      beneficiaryAddress: beneficiary.address || "",
      beneficiaryActivity,
      beneficiaryEmail: beneficiary.email || "",
      beneficiaryPhone: normalizePhoneDigits(beneficiary.phone || ""),
      datePayement: resolveDatePayement(paymentDate),
      reference,
      operations,
      totalAmounts
    };
  };

  const resolveWithholdingBatchSnapshot = (payload = {}) => {
    const state = payload.state || {};
    const meta = state.meta || {};
    const declarant = payload.declarant || state.company || state.client || {};
    const declarantIdentifiant = normalizeMatriculeFiscal(resolveIdentifiant(declarant));
    const declarantCategory =
      payload.declarantCategory || resolveDeclarantCategory(payload) || resolveContributorCategory(declarant);
    const acteDepot = resolveActeDepot(payload, meta);
    const declarationDate =
      payload.depositDate || payload.date || payload.generationDate || meta.date || "";
    const { year, month } = resolveYearMonth(declarationDate);
    const certificatesInput = Array.isArray(payload.certificates) ? payload.certificates : [];
    const certificates = certificatesInput.map((cert) => resolveWithholdingCertificate(payload, cert));

    return {
      declarant,
      declarantIdentifiant,
      declarantCategory,
      acteDepot,
      year,
      month,
      certificates,
      dateForFolder: declarationDate || meta.date || new Date().toISOString()
    };
  };

  const buildWithholdingXmlFromSnapshot = (snapshot) => {
    const lines = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<DeclarationsRS VersionSchema="1.0">`,
      `  <Declarant>`,
      `    <TypeIdentifiant>1</TypeIdentifiant>`,
      `    <Identifiant>${xmlEscape(snapshot.declarantIdentifiant)}</Identifiant>`,
      `    <CategorieContribuable>${xmlEscape(snapshot.declarantCategory)}</CategorieContribuable>`,
      `  </Declarant>`,
      `  <ReferenceDeclaration>`,
      `    <ActeDepot>${xmlEscape(snapshot.acteDepot)}</ActeDepot>`,
      `    <AnneeDepot>${xmlEscape(snapshot.year)}</AnneeDepot>`,
      `    <MoisDepot>${xmlEscape(snapshot.month)}</MoisDepot>`,
      `  </ReferenceDeclaration>`,
      `  <AjouterCertificats>`,
      `    <Certificat>`,
      `      <Beneficiaire>`,
      `        <IdTaxpayer>`,
      `          <MatriculeFiscal>`,
      `            <TypeIdentifiant>1</TypeIdentifiant>`,
      `            <Identifiant>${xmlEscape(snapshot.beneficiaryIdentifiant)}</Identifiant>`,
      `            <CategorieContribuable>${xmlEscape(snapshot.beneficiaryCategory)}</CategorieContribuable>`,
      `          </MatriculeFiscal>`,
      `        </IdTaxpayer>`,
      `        <Resident>${xmlEscape(snapshot.residentFlag)}</Resident>`,
      `        <NometprenonOuRaisonsociale>${xmlEscape(snapshot.beneficiaryName)}</NometprenonOuRaisonsociale>`,
      `        <Adresse>${xmlEscape(snapshot.beneficiaryAddress)}</Adresse>`,
      ...(snapshot.beneficiaryActivity
        ? [`        <Activite>${xmlEscape(snapshot.beneficiaryActivity)}</Activite>`]
        : []),
      `        <InfosContact>`,
      `          <AdresseMail>${xmlEscape(snapshot.beneficiaryEmail)}</AdresseMail>`,
      `          <NumTel>${xmlEscape(snapshot.beneficiaryPhone)}</NumTel>`,
      `        </InfosContact>`,
      `      </Beneficiaire>`,
      `      <DatePayement>${xmlEscape(snapshot.datePayement)}</DatePayement>`,
      `      <Ref_certif_chez_declarant>${xmlEscape(snapshot.reference)}</Ref_certif_chez_declarant>`,
      `      <ListeOperations>`,
      `        <Operation IdTypeOperation="${xmlEscape(snapshot.operationType)}">`,
      `          <AnneeFacturation>${xmlEscape(snapshot.yearFact)}</AnneeFacturation>`,
      `          <CNPC>${xmlEscape(String(snapshot.cnpc ?? 0))}</CNPC>`,
      `          <P_Charge>${xmlEscape(String(snapshot.pCharge ?? 0))}</P_Charge>`,
      `          <MontantHT>${snapshot.amounts.MontantHT}</MontantHT>`,
      `          <TauxRS>${formatRate(snapshot.rateValue)}</TauxRS>`,
      `          <TauxTVA>${formatRate(snapshot.tvaRate)}</TauxTVA>`,
      `          <MontantTVA>${snapshot.amounts.MontantTVA}</MontantTVA>`,
      `          <MontantTTC>${snapshot.amounts.MontantTTC}</MontantTTC>`,
      `          <MontantRS>${snapshot.amounts.MontantRS}</MontantRS>`,
      `          <MontantNetServi>${snapshot.amounts.MontantNetServi}</MontantNetServi>`,
      `        </Operation>`,
      `      </ListeOperations>`,
      `      <TotalPayement>`,
      `        <TotalMontantHT>${snapshot.totalAmounts.TotalMontantHT}</TotalMontantHT>`,
      `        <TotalMontantTVA>${snapshot.totalAmounts.TotalMontantTVA}</TotalMontantTVA>`,
      `        <TotalMontantTTC>${snapshot.totalAmounts.TotalMontantTTC}</TotalMontantTTC>`,
      `        <TotalMontantRS>${snapshot.totalAmounts.TotalMontantRS}</TotalMontantRS>`,
      `        <TotalMontantNetServi>${snapshot.totalAmounts.TotalMontantNetServi}</TotalMontantNetServi>`,
      `      </TotalPayement>`,
      `    </Certificat>`,
      `  </AjouterCertificats>`,
      `</DeclarationsRS>`
    ];

    return lines.join("\n");
  };

  const buildWithholdingXmlFromCertificates = (batch) => {
    const lines = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<DeclarationsRS VersionSchema="1.0">`,
      `  <Declarant>`,
      `    <TypeIdentifiant>1</TypeIdentifiant>`,
      `    <Identifiant>${xmlEscape(batch.declarantIdentifiant)}</Identifiant>`,
      `    <CategorieContribuable>${xmlEscape(batch.declarantCategory)}</CategorieContribuable>`,
      `  </Declarant>`,
      `  <ReferenceDeclaration>`,
      `    <ActeDepot>${xmlEscape(batch.acteDepot)}</ActeDepot>`,
      `    <AnneeDepot>${xmlEscape(batch.year)}</AnneeDepot>`,
      `    <MoisDepot>${xmlEscape(batch.month)}</MoisDepot>`,
      `  </ReferenceDeclaration>`,
      `  <AjouterCertificats>`
    ];

    (batch.certificates || []).forEach((cert) => {
      lines.push(`    <Certificat>`);
      lines.push(`      <Beneficiaire>`);
      lines.push(`        <IdTaxpayer>`);
      lines.push(`          <MatriculeFiscal>`);
      lines.push(`            <TypeIdentifiant>1</TypeIdentifiant>`);
      lines.push(`            <Identifiant>${xmlEscape(cert.beneficiaryIdentifiant)}</Identifiant>`);
      lines.push(`            <CategorieContribuable>${xmlEscape(cert.beneficiaryCategory)}</CategorieContribuable>`);
      lines.push(`          </MatriculeFiscal>`);
      lines.push(`        </IdTaxpayer>`);
      lines.push(`        <Resident>${xmlEscape(cert.residentFlag)}</Resident>`);
      lines.push(
        `        <NometprenonOuRaisonsociale>${xmlEscape(cert.beneficiaryName)}</NometprenonOuRaisonsociale>`
      );
      lines.push(`        <Adresse>${xmlEscape(cert.beneficiaryAddress)}</Adresse>`);
      if (cert.beneficiaryActivity) {
        lines.push(`        <Activite>${xmlEscape(cert.beneficiaryActivity)}</Activite>`);
      }
      lines.push(`        <InfosContact>`);
      lines.push(`          <AdresseMail>${xmlEscape(cert.beneficiaryEmail)}</AdresseMail>`);
      lines.push(`          <NumTel>${xmlEscape(cert.beneficiaryPhone)}</NumTel>`);
      lines.push(`        </InfosContact>`);
      lines.push(`      </Beneficiaire>`);
      lines.push(`      <DatePayement>${xmlEscape(cert.datePayement)}</DatePayement>`);
      lines.push(
        `      <Ref_certif_chez_declarant>${xmlEscape(cert.reference)}</Ref_certif_chez_declarant>`
      );
      lines.push(`      <ListeOperations>`);
      (cert.operations || []).forEach((operation) => {
        lines.push(`        <Operation IdTypeOperation="${xmlEscape(operation.operationType)}">`);
        lines.push(`          <AnneeFacturation>${xmlEscape(operation.yearFact)}</AnneeFacturation>`);
        lines.push(`          <CNPC>${xmlEscape(String(operation.cnpc ?? 0))}</CNPC>`);
        lines.push(`          <P_Charge>${xmlEscape(String(operation.pCharge ?? 0))}</P_Charge>`);
        lines.push(`          <MontantHT>${operation.amounts.MontantHT}</MontantHT>`);
        lines.push(`          <TauxRS>${formatRate(operation.rateValue)}</TauxRS>`);
        lines.push(`          <TauxTVA>${formatRate(operation.tvaRate)}</TauxTVA>`);
        lines.push(`          <MontantTVA>${operation.amounts.MontantTVA}</MontantTVA>`);
        lines.push(`          <MontantTTC>${operation.amounts.MontantTTC}</MontantTTC>`);
        lines.push(`          <MontantRS>${operation.amounts.MontantRS}</MontantRS>`);
        lines.push(`          <MontantNetServi>${operation.amounts.MontantNetServi}</MontantNetServi>`);
        lines.push(`        </Operation>`);
      });
      lines.push(`      </ListeOperations>`);
      lines.push(`      <TotalPayement>`);
      lines.push(`        <TotalMontantHT>${cert.totalAmounts.TotalMontantHT}</TotalMontantHT>`);
      lines.push(`        <TotalMontantTVA>${cert.totalAmounts.TotalMontantTVA}</TotalMontantTVA>`);
      lines.push(`        <TotalMontantTTC>${cert.totalAmounts.TotalMontantTTC}</TotalMontantTTC>`);
      lines.push(`        <TotalMontantRS>${cert.totalAmounts.TotalMontantRS}</TotalMontantRS>`);
      lines.push(
        `        <TotalMontantNetServi>${cert.totalAmounts.TotalMontantNetServi}</TotalMontantNetServi>`
      );
      lines.push(`      </TotalPayement>`);
      lines.push(`    </Certificat>`);
    });

    lines.push(`  </AjouterCertificats>`);
    lines.push(`</DeclarationsRS>`);
    return lines.join("\n");
  };

  const buildWithholdingXmlFileBase = (payload = {}) => {
    if (Array.isArray(payload?.certificates)) {
      const state = payload.state || {};
      const meta = state.meta || {};
      const declarant = payload.declarant || state.company || state.client || {};
      const mf =
        payload.declarantIdentifiant || normalizeMatriculeFiscal(resolveIdentifiant(declarant));
      const { year, month } = resolveYearMonthForFile(payload, { dateForFolder: payload.date || "" });
      const acte = String(resolveActeDepot(payload, meta) || "0").trim() || "0";
      if (!mf || !year || !month) return "";
      return `${mf}-${year}-${month}-${acte}`;
    }
    const snapshot = payload?.declarantIdentifiant ? payload : resolveWithholdingSnapshot(payload);
    const mf = snapshot.declarantIdentifiant || normalizeMatriculeFiscal(resolveIdentifiant(snapshot.declarant));
    const { year, month } = resolveYearMonthForFile(payload, snapshot);
    const acte = String(snapshot.acteDepot || "0").trim() || "0";
    if (!mf || !year || !month) return "";
    return `${mf}-${year}-${month}-${acte}`;
  };

  const buildWithholdingXml = (payload = {}) => {
    if (Array.isArray(payload?.certificates)) {
      const batch = resolveWithholdingBatchSnapshot(payload);
      return buildWithholdingXmlFromCertificates(batch);
    }
    const snapshot = resolveWithholdingSnapshot(payload);
    return buildWithholdingXmlFromSnapshot(snapshot);
  };

  const validateWithholdingSnapshot = (snapshot) => {
    const errors = [];
    const missingFields = [];
    if (!snapshot.declarantCategory) missingFields.push("Type de l'entreprise");
    if (!snapshot.declarantIdentifiant) missingFields.push("Matricule fiscal declarant");
    if (!snapshot.beneficiaryIdentifiant) missingFields.push("Matricule fiscal beneficiaire");
    if (missingFields.length > 0) {
      return { ok: false, error: `Champs manquants: ${missingFields.join(", ")}.` };
    }
    if (!MATRICULE_FULL_RE.test(snapshot.declarantIdentifiant)) {
      errors.push("Matricule fiscal declarant invalide.");
    }
    if (!MATRICULE_FULL_RE.test(snapshot.beneficiaryIdentifiant)) {
      errors.push("Matricule fiscal beneficiaire invalide.");
    }
    if (!DATE_DMY_RE.test(snapshot.datePayement)) {
      errors.push("DatePayement invalide (dd/mm/yyyy).");
    }
    const amountEntries = [
      ...Object.entries(snapshot.amounts || {}),
      ...Object.entries(snapshot.totalAmounts || {})
    ];
    amountEntries.forEach(([label, value]) => {
      if (!AMOUNT_INT_RE.test(String(value))) {
        errors.push(`${label} doit etre un entier en millimes.`);
      }
    });
    if (errors.length > 0) {
      return { ok: false, error: errors.join(" ") };
    }
    return { ok: true };
  };

  const validateWithholdingBatch = (batch) => {
    const errors = [];
    const missingFields = [];
    if (!batch.declarantCategory) missingFields.push("Type de l'entreprise");
    if (!batch.declarantIdentifiant) missingFields.push("Matricule fiscal declarant");
    if (missingFields.length > 0) {
      return { ok: false, error: `Champs manquants: ${missingFields.join(", ")}.` };
    }
    if (!MATRICULE_FULL_RE.test(batch.declarantIdentifiant)) {
      errors.push("Matricule fiscal declarant invalide.");
    }
    const certificates = Array.isArray(batch.certificates) ? batch.certificates : [];
    if (!certificates.length) {
      errors.push("Aucun certificat a exporter.");
    }
    certificates.forEach((cert, index) => {
      const prefix = `Certificat ${index + 1}: `;
      if (!cert.beneficiaryIdentifiant) {
        errors.push(`${prefix}Matricule fiscal beneficiaire manquant.`);
      } else if (!MATRICULE_FULL_RE.test(cert.beneficiaryIdentifiant)) {
        errors.push(`${prefix}Matricule fiscal beneficiaire invalide.`);
      }
      if (!DATE_DMY_RE.test(cert.datePayement)) {
        errors.push(`${prefix}DatePayement invalide (dd/mm/yyyy).`);
      }
      const operations = Array.isArray(cert.operations) ? cert.operations : [];
      if (!operations.length) {
        errors.push(`${prefix}Aucune operation declaree.`);
      }
      const totalEntries = Object.entries(cert.totalAmounts || {});
      totalEntries.forEach(([label, value]) => {
        if (!AMOUNT_INT_RE.test(String(value))) {
          errors.push(`${prefix}${label} doit etre un entier en millimes.`);
        }
      });
      operations.forEach((operation, opIndex) => {
        const opPrefix = `${prefix}Operation ${opIndex + 1}: `;
        const amountEntries = Object.entries(operation.amounts || {});
        amountEntries.forEach(([label, value]) => {
          if (!AMOUNT_INT_RE.test(String(value))) {
            errors.push(`${opPrefix}${label} doit etre un entier en millimes.`);
          }
        });
      });
    });
    if (errors.length > 0) {
      return { ok: false, error: errors.join(" ") };
    }
    return { ok: true };
  };

  const validateWithholdingXml = (xml) => {
    const errors = [];
    const xmlText = String(xml || "");
    if (!xmlText.includes("<Ref_certif_chez_declarant>")) {
      errors.push("Balise Ref_certif_chez_declarant manquante.");
    }
    if (xmlText.includes("<Ref_Certif_chez_Declarant>")) {
      errors.push("Balise Ref_Certif_chez_Declarant interdite.");
    }
    const declarantMatch = xmlText.match(/<Declarant>[\s\S]*?<Identifiant>([^<]+)<\/Identifiant>/);
    const beneficiaryMatch = xmlText.match(/<MatriculeFiscal>[\s\S]*?<Identifiant>([^<]+)<\/Identifiant>/);
    const declarantId = declarantMatch ? declarantMatch[1].trim() : "";
    const beneficiaryId = beneficiaryMatch ? beneficiaryMatch[1].trim() : "";
    if (!MATRICULE_FULL_RE.test(declarantId)) {
      errors.push("Identifiant declarant invalide.");
    }
    if (!MATRICULE_FULL_RE.test(beneficiaryId)) {
      errors.push("Identifiant beneficiaire invalide.");
    }
    if (errors.length > 0) {
      return { ok: false, error: errors.join(" ") };
    }
    return { ok: true };
  };

  async function exportWithholdingXml(payload = {}) {
    if (!w.electronAPI?.saveWithholdingXml) {
      return { ok: false, error: "XML export unavailable." };
    }
    const meta = payload.state?.meta || {};
    const docType = payload.docType || meta?.docType || "";
    if (Array.isArray(payload?.certificates)) {
      const batch = resolveWithholdingBatchSnapshot(payload);
      const validation = validateWithholdingBatch(batch);
      if (!validation.ok) return validation;
      const xml = buildWithholdingXmlFromCertificates(batch);
      const xmlValidation = validateWithholdingXml(xml);
      if (!xmlValidation.ok) return xmlValidation;
      const fileName = buildWithholdingXmlFileBase({
        ...payload,
        declarantIdentifiant: batch.declarantIdentifiant,
        acteDepot: batch.acteDepot,
        year: batch.year,
        month: batch.month
      });
      if (!fileName) {
        return { ok: false, error: "Nom de fichier XML invalide (matricule fiscal manquant)." };
      }
      const date =
        batch.dateForFolder || payload.date || payload.generationDate || meta.date || new Date().toISOString();
      return w.electronAPI.saveWithholdingXml({
        xml,
        fileName,
        date,
        docType,
        subDir: payload.subDir
      });
    }
    const snapshot = resolveWithholdingSnapshot(payload);
    const validation = validateWithholdingSnapshot(snapshot);
    if (!validation.ok) return validation;
    const xml = buildWithholdingXmlFromSnapshot(snapshot);
    const xmlValidation = validateWithholdingXml(xml);
    if (!xmlValidation.ok) return xmlValidation;
    const fileName = buildWithholdingXmlFileBase(snapshot);
    if (!fileName) {
      return { ok: false, error: "Nom de fichier XML invalide (matricule fiscal manquant)." };
    }
    const date = snapshot.dateForFolder || payload.date || meta.date || new Date().toISOString();
    return w.electronAPI.saveWithholdingXml({
      xml,
      fileName,
      date,
      docType,
      subDir: payload.subDir
    });
  }

  w.registerHelpers({
    buildWithholdingXml,
    buildWithholdingXmlFileBase,
    normalizeMatriculeFiscal,
    toMillimesInt,
    validateWithholdingXml,
    exportWithholdingXml
  });
})(window);

