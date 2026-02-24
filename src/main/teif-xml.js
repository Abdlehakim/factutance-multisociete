"use strict";

const DEFAULT_TEIF_NAMESPACE = "urn:teif:1.8.7";
const DEFAULT_TEIF_SCHEMA_LOCATION = "urn:teif:1.8.7 TEIF-1.8.7.xsd";
const DEFAULT_DOC_TYPE_CODE = "I-11";
const DEFAULT_DTM_FUNCTION_CODE = "I-31";
const DEFAULT_DTM_FORMAT = "DDMMYY";
const PARTNER_ROLE_SELLER = "I-62";
const PARTNER_ROLE_BUYER = "I-61";
const DEFAULT_PARTNER_ID_TYPE = "I-01";
const DEFAULT_PARTNER_NAME_TYPE = "I-72";
const DEFAULT_ITEM_ID_TYPE = "I-01";
const DEFAULT_CURRENCY_CODE_LIST = "ISO_4217";
const DEFAULT_CURRENCY_IDENTIFIER = "TND";
const DEFAULT_LINE_QTY_TYPE_CODE = "I-01";
const DEFAULT_LINE_AMOUNT_TYPE_CODE = "I-171";
const DEFAULT_INVOICE_AMOUNT_TYPE_CODES = {
  net: "I-176",
  tax: "I-181",
  gross: "I-180"
};
const DEFAULT_TAX_AMOUNT_TYPE_CODES = {
  base: "I-177",
  tax: "I-178"
};
const DEFAULT_TAX_TYPE_CODES = {
  tva: "I-1602",
  fodec: "I-162",
  stamp: "I-1601",
  withholding: "I-1604"
};
const DEFAULT_TAX_TYPE_LABELS = {
  "I-161": "Droit de consommation",
  "I-162": "Taxe professionnelle de competitivite FODEC",
  "I-163": "Taxe sur les emballages metalliques",
  "I-164": "Taxe pour la protection de l'environnement TPE",
  "I-165": "Taxe au profit du fonds de developpement de la competitivite dans le secteur du tourisme (FODET)",
  "I-166": "Taxe sur les climatiseurs",
  "I-167": "Taxes sur les lampes et les tubes",
  "I-168": "Taxes sur fruit et legumes (TFL) non soumis a la TVA",
  "I-169": "Taxes sur les produits de la peche (non soumis a la TVA)",
  "I-160": "Taxes RB (non soumis a la TVA)",
  "I-1601": "Droit de timbre",
  "I-1602": "TVA",
  "I-1603": "Autre",
  "I-1604": "Retenu a la source"
};

const DOC_TYPE_LABELS = {
  facture: "Facture",
  fa: "Facture d'achat",
  devis: "Devis",
  bl: "Bon de livraison",
  bc: "Bon de commande",
  be: "Bon d'entree",
  bs: "Bon de sortie",
  avoir: "Facture d'avoir",
  retenue: "Retenue"
};

const normalizeDocType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "facture";
  if (normalized === "fact" || normalized === "facture") return "facture";
  if (normalized === "fa" || normalized === "factureachat" || normalized === "facture-achat") return "fa";
  if (
    ["be", "bonentree", "bon_entree", "bon-entree", "bon entree", "bon d'entree", "bon d'entr\u00e9e"].includes(
      normalized
    )
  ) {
    return "be";
  }
  if (["bs", "bonsortie", "bon_sortie", "bon-sortie", "bon sortie", "bon de sortie"].includes(normalized)) return "bs";
  if (
    [
      "avoir",
      "factureavoir",
      "facture_avoir",
      "facture-avoir",
      "facture avoir",
      "facture d'avoir",
      "facture davoir"
    ].includes(normalized)
  ) {
    return "avoir";
  }
  if (normalized === "devis" || normalized === "dev") return "devis";
  if (normalized === "bl" || normalized === "bonlivraison" || normalized === "bon-livraison") return "bl";
  if (normalized === "bc" || normalized === "boncommande" || normalized === "bon-commande") return "bc";
  if (normalized === "retenue" || normalized === "wh" || normalized === "rt") return "retenue";
  return normalized;
};

const resolveDocTypeLabel = (docType) => {
  const normalized = normalizeDocType(docType);
  return DOC_TYPE_LABELS[normalized] || DOC_TYPE_LABELS.facture;
};

const sanitizeText = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

const fmtDateYYYYMMDD = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.replace(/-/g, "");
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "";
  const yyyy = String(dt.getFullYear()).padStart(4, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const fmtDateDDMMYY = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const ymd = fmtDateYYYYMMDD(raw);
  if (!ymd) return "";
  return `${ymd.slice(6, 8)}${ymd.slice(4, 6)}${ymd.slice(2, 4)}`;
};

const toMoneyString = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0,00";
  return num.toFixed(2).replace(".", ",");
};

const normalizeFactureData = (factureData = {}) => {
  if (factureData && typeof factureData === "object") {
    if (factureData.data && typeof factureData.data === "object") {
      return factureData.data;
    }
    return factureData;
  }
  return {};
};

const parseAddress = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) return {};
  const parts = text.split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean);
  return {
    street: parts[0] || "",
    city: parts[1] || "",
    postal: parts[2] || "",
    country: parts[3] || ""
  };
};

const buildAddressLines = (addr) => {
  if (!addr) return [];
  const lines = [];
  if (addr.street) lines.push(`          <Street>${sanitizeText(addr.street)}</Street>`);
  if (addr.city) lines.push(`          <City>${sanitizeText(addr.city)}</City>`);
  if (addr.postal) lines.push(`          <PostalCode>${sanitizeText(addr.postal)}</PostalCode>`);
  if (addr.country) lines.push(`          <Country>${sanitizeText(addr.country)}</Country>`);
  return lines;
};

const requireNonEmpty = (label, value) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`${label} is required for TEIF export.`);
  }
  return text;
};

const resolveCurrency = (currency, codeList) => {
  const raw = String(currency || "").trim().toUpperCase();
  const listName = String(codeList || "").trim() || DEFAULT_CURRENCY_CODE_LIST;
  if (!raw) {
    return { codeList: listName, identifier: DEFAULT_CURRENCY_IDENTIFIER };
  }
  if (raw === "DT") {
    return { codeList: listName, identifier: "TND" };
  }
  return { codeList: listName, identifier: raw };
};

const getTeifConfig = (meta = {}) => {
  const teif = meta.teif || {};
  return {
    namespace: teif.namespace || DEFAULT_TEIF_NAMESPACE,
    schemaLocation: teif.schemaLocation || DEFAULT_TEIF_SCHEMA_LOCATION,
    messageSenderType: teif.messageSenderType || DEFAULT_PARTNER_ID_TYPE,
    messageReceiverIdentifier: teif.messageReceiverIdentifier || meta.messageReceiverIdentifier || "",
    messageReceiverType: teif.messageReceiverType || DEFAULT_PARTNER_ID_TYPE,
    partnerIdType: teif.partnerIdType || DEFAULT_PARTNER_ID_TYPE,
    partnerNameType: teif.partnerNameType || DEFAULT_PARTNER_NAME_TYPE,
    itemIdType: teif.itemIdType || DEFAULT_ITEM_ID_TYPE,
    docTypeCode: teif.docTypeCode || DEFAULT_DOC_TYPE_CODE,
    dtmFunctionCode: teif.dtmFunctionCode || DEFAULT_DTM_FUNCTION_CODE,
    lineQtyTypeCode: teif.lineQtyTypeCode || DEFAULT_LINE_QTY_TYPE_CODE,
    lineAmountTypeCode: teif.lineAmountTypeCode || DEFAULT_LINE_AMOUNT_TYPE_CODE,
    currencyCodeList: teif.currencyCodeList || DEFAULT_CURRENCY_CODE_LIST,
    invoiceAmountTypeCodes: {
      ...DEFAULT_INVOICE_AMOUNT_TYPE_CODES,
      ...(teif.invoiceAmountTypeCodes || {})
    },
    taxAmountTypeCodes: {
      ...DEFAULT_TAX_AMOUNT_TYPE_CODES,
      ...(teif.taxAmountTypeCodes || {})
    },
    taxTypeCodes: {
      ...DEFAULT_TAX_TYPE_CODES,
      ...(teif.taxTypeCodes || {})
    }
  };
};

const resolveTaxTypeName = (typeCode, fallbackName) =>
  DEFAULT_TAX_TYPE_LABELS[String(typeCode || "").trim()] || fallbackName || "";

function buildUnsignedTeifXml(factureData) {
  const data = normalizeFactureData(factureData);
  const company = data.company || {};
  const client = data.client || {};
  const meta = data.meta || {};
  const teif = getTeifConfig(meta);
  const currency = resolveCurrency(meta.currency, teif.currencyCodeList);
  const totals = data.totals || {};
  const items = Array.isArray(data.items) ? data.items : [];

  const invoiceNumber = String(meta.number || meta.invNumber || data.number || "").trim();
  const invoiceDate = meta.date || data.date || "";
  const formattedDtm = fmtDateDDMMYY(invoiceDate);

  const sellerId = requireNonEmpty(
    "MessageSenderIdentifier",
    company.vat || company.taxId || company.id || ""
  );
  const sellerName = String(company.name || "").trim();
  const buyerId = requireNonEmpty(
    "Buyer PartnerIdentifier",
    client.vat || client.taxId || client.id || ""
  );
  const buyerName = String(client.name || "").trim();

  const sellerAddr = parseAddress(company.address);
  const buyerAddr = parseAddress(client.address);

  const totalHT = totals.totalHT ?? totals.totalHt ?? totals.subtotal ?? 0;
  const totalTTC = totals.totalTTC ?? totals.grand ?? totals.total ?? 0;
  const totalTax = totals.tax ?? totals.tva ?? totals.totalTax ?? 0;

  const tvaBreakdown = Array.isArray(totals.tvaBreakdown) ? totals.tvaBreakdown : [];
  const extras = totals.extras || {};
  const taxEntries = [];
  tvaBreakdown.forEach((entry) => {
    taxEntries.push({
      typeCode: teif.taxTypeCodes.tva,
      typeName: resolveTaxTypeName(teif.taxTypeCodes.tva, "TVA"),
      rate: entry?.rate ?? 0,
      base: entry?.ht ?? 0,
      amount: entry?.tva ?? 0
    });
  });
  if (extras.fodecEnabled && Number.isFinite(Number(extras.fodecHT))) {
    taxEntries.push({
      typeCode: teif.taxTypeCodes.fodec,
      typeName: resolveTaxTypeName(teif.taxTypeCodes.fodec, String(extras.fodecLabel || "FODEC")),
      rate: extras.fodecRate ?? 0,
      base: extras.fodecBase ?? 0,
      amount: extras.fodecHT ?? 0
    });
  }
  if (Number.isFinite(Number(totals.whAmount)) && Number(totals.whAmount) > 0) {
    taxEntries.push({
      typeCode: teif.taxTypeCodes.withholding,
      typeName: resolveTaxTypeName(teif.taxTypeCodes.withholding, "Retenue"),
      rate: meta?.withholding?.rate ?? 0,
      base: meta?.withholding?.base ?? "",
      amount: totals.whAmount
    });
  }
  const stampEnabled = !!extras.stampEnabled;
  const stampBase = Number(extras.stampHT ?? extras.stampTT ?? 0);
  const stampAmount = Number(extras.stampTT ?? extras.stampHT ?? 0);
  if (stampEnabled && (Math.abs(stampAmount) > 1e-9 || Math.abs(stampBase) > 1e-9)) {
    taxEntries.push({
      typeCode: teif.taxTypeCodes.stamp,
      typeName: resolveTaxTypeName(teif.taxTypeCodes.stamp, String(extras.stampLabel || "Droit de timbre")),
      rate: 0,
      base: 0,
      amount: stampAmount
    });
  }

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<TEIF version="1.8.7" controlingAgency="TTN" xmlns="${sanitizeText(teif.namespace)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${sanitizeText(teif.schemaLocation)}">`
  );
  lines.push(`  <InvoiceHeader>`);
  lines.push(
    `    <MessageSenderIdentifier type="${sanitizeText(teif.messageSenderType)}">${sanitizeText(sellerId)}</MessageSenderIdentifier>`
  );
  const receiverId = buyerId;
  lines.push(
    `    <MessageRecieverIdentifier type="${sanitizeText(teif.messageReceiverType)}">${sanitizeText(receiverId)}</MessageRecieverIdentifier>`
  );
  lines.push(`  </InvoiceHeader>`);
  lines.push(`  <InvoiceBody>`);
  lines.push(`    <Bgm>`);
  lines.push(`      <DocumentIdentifier>${sanitizeText(invoiceNumber)}</DocumentIdentifier>`);
  const docTypeLabel = resolveDocTypeLabel(meta.docType);
  lines.push(
    `      <DocumentType code="${sanitizeText(teif.docTypeCode)}">${sanitizeText(docTypeLabel)}</DocumentType>`
  );
  lines.push(`    </Bgm>`);
  lines.push(`    <Dtm>`);
  lines.push(
    `      <DateText functionCode="${sanitizeText(teif.dtmFunctionCode)}" format="${DEFAULT_DTM_FORMAT}">${sanitizeText(formattedDtm)}</DateText>`
  );
  lines.push(`    </Dtm>`);
  lines.push(`    <PartnerSection>`);
  lines.push(`      <PartnerDetails functionCode="${PARTNER_ROLE_SELLER}">`);
  lines.push(`        <Nad>`);
  lines.push(
    `          <PartnerIdentifier type="${sanitizeText(teif.partnerIdType)}">${sanitizeText(sellerId)}</PartnerIdentifier>`
  );
  lines.push(
    `          <PartnerNom NameType="${sanitizeText(teif.partnerNameType)}">${sanitizeText(sellerName)}</PartnerNom>`
  );
  const sellerAddrLines = buildAddressLines(sellerAddr);
  if (sellerAddrLines.length) {
    lines.push(`          <PartnerAdresses>`);
    lines.push(...sellerAddrLines);
    lines.push(`          </PartnerAdresses>`);
  }
  lines.push(`        </Nad>`);
  lines.push(`      </PartnerDetails>`);
  lines.push(`      <PartnerDetails functionCode="${PARTNER_ROLE_BUYER}">`);
  lines.push(`        <Nad>`);
  lines.push(
    `          <PartnerIdentifier type="${sanitizeText(teif.partnerIdType)}">${sanitizeText(buyerId)}</PartnerIdentifier>`
  );
  lines.push(
    `          <PartnerNom NameType="${sanitizeText(teif.partnerNameType)}">${sanitizeText(buyerName)}</PartnerNom>`
  );
  const buyerAddrLines = buildAddressLines(buyerAddr);
  if (buyerAddrLines.length) {
    lines.push(`          <PartnerAdresses>`);
    lines.push(...buyerAddrLines);
    lines.push(`          </PartnerAdresses>`);
  }
  lines.push(`        </Nad>`);
  lines.push(`      </PartnerDetails>`);
  lines.push(`    </PartnerSection>`);
  lines.push(`    <LinSection>`);
  items.forEach((item, index) => {
    const qty = Number(item?.qty ?? 0);
    const unitPrice = Number(item?.price ?? 0);
    const discountPct = Number(item?.discount ?? 0);
    const base = qty * unitPrice;
    const discountAmt = base * (discountPct / 100);
    const lineAmount = Math.max(0, base - discountAmt);
    const designation =
      item?.desc || item?.product || item?.ref || item?.label || `Ligne ${index + 1}`;
    const itemIdentifier = String(item?.ref || item?.code || item?.sku || index + 1).trim();
    lines.push(`      <Lin>`);
    lines.push(
      `        <ItemIdentifier type="${sanitizeText(teif.itemIdType)}">${sanitizeText(itemIdentifier)}</ItemIdentifier>`
    );
    lines.push(`        <LinImd>`);
    lines.push(`          <ItemDescription>${sanitizeText(designation)}</ItemDescription>`);
    lines.push(`        </LinImd>`);
    lines.push(
      `        <LinQty quantityTypeCode="${sanitizeText(teif.lineQtyTypeCode)}">${sanitizeText(qty)}</LinQty>`
    );
    lines.push(`        <LinMoa>`);
    lines.push(`          <AmountDetails>`);
    lines.push(
      `            <Moa amountTypeCode="${sanitizeText(teif.lineAmountTypeCode)}" currencyCodeList="${sanitizeText(currency.codeList)}">`
    );
    lines.push(
      `              <Amount currencyIdentifier="${sanitizeText(currency.identifier)}">${toMoneyString(lineAmount)}</Amount>`
    );
    lines.push(`            </Moa>`);
    lines.push(`          </AmountDetails>`);
    lines.push(`        </LinMoa>`);
    lines.push(`      </Lin>`);
  });
  lines.push(`    </LinSection>`);
  lines.push(`    <InvoiceMoa>`);
  lines.push(`      <AmountDetails>`);
  lines.push(
    `        <Moa amountTypeCode="${sanitizeText(teif.invoiceAmountTypeCodes.net)}" currencyCodeList="${sanitizeText(currency.codeList)}">`
  );
  lines.push(
    `          <Amount currencyIdentifier="${sanitizeText(currency.identifier)}">${toMoneyString(totalHT)}</Amount>`
  );
  lines.push(`        </Moa>`);
  lines.push(`      </AmountDetails>`);
  lines.push(`      <AmountDetails>`);
  lines.push(
    `        <Moa amountTypeCode="${sanitizeText(teif.invoiceAmountTypeCodes.tax)}" currencyCodeList="${sanitizeText(currency.codeList)}">`
  );
  lines.push(
    `          <Amount currencyIdentifier="${sanitizeText(currency.identifier)}">${toMoneyString(totalTax)}</Amount>`
  );
  lines.push(`        </Moa>`);
  lines.push(`      </AmountDetails>`);
  lines.push(`      <AmountDetails>`);
  lines.push(
    `        <Moa amountTypeCode="${sanitizeText(teif.invoiceAmountTypeCodes.gross)}" currencyCodeList="${sanitizeText(currency.codeList)}">`
  );
  lines.push(
    `          <Amount currencyIdentifier="${sanitizeText(currency.identifier)}">${toMoneyString(totalTTC)}</Amount>`
  );
  lines.push(`        </Moa>`);
  lines.push(`      </AmountDetails>`);
  lines.push(`    </InvoiceMoa>`);
  lines.push(`    <InvoiceTax>`);
  taxEntries.forEach((tax) => {
    lines.push(`      <InvoiceTaxDetails>`);
    lines.push(`        <Tax>`);
    lines.push(
      `          <TaxTypeName code="${sanitizeText(tax.typeCode)}">${sanitizeText(tax.typeName)}</TaxTypeName>`
    );
    lines.push(`          <TaxDetails>`);
    lines.push(`            <TaxRate>${sanitizeText(tax.rate)}</TaxRate>`);
    lines.push(`          </TaxDetails>`);
    lines.push(`        </Tax>`);
    if (Math.abs(Number(tax.base)) > 1e-9) {
      lines.push(`        <AmountDetails>`);
      lines.push(
        `          <Moa amountTypeCode="${sanitizeText(teif.taxAmountTypeCodes.base)}" currencyCodeList="${sanitizeText(currency.codeList)}">`
      );
      lines.push(
        `            <Amount currencyIdentifier="${sanitizeText(currency.identifier)}">${toMoneyString(tax.base)}</Amount>`
      );
      lines.push(`          </Moa>`);
      lines.push(`        </AmountDetails>`);
    }
    lines.push(`        <AmountDetails>`);
    lines.push(
      `          <Moa amountTypeCode="${sanitizeText(teif.taxAmountTypeCodes.tax)}" currencyCodeList="${sanitizeText(currency.codeList)}">`
    );
    lines.push(
      `            <Amount currencyIdentifier="${sanitizeText(currency.identifier)}">${toMoneyString(tax.amount)}</Amount>`
    );
    lines.push(`          </Moa>`);
    lines.push(`        </AmountDetails>`);
    lines.push(`      </InvoiceTaxDetails>`);
  });
  lines.push(`    </InvoiceTax>`);
  lines.push(`  </InvoiceBody>`);
  lines.push(`</TEIF>`);
  return lines.join("\n");
}

module.exports = {
  buildUnsignedTeifXml,
  fmtDateYYYYMMDD,
  fmtDateDDMMYY,
  sanitizeText,
  toMoneyString
};
