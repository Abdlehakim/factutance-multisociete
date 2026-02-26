"use strict";

const DOC_TYPE_TABLES = {
  facture: "documents_factures",
  devis: "documents_devis",
  bl: "documents_bl",
  bc: "documents_bc",
  fa: "documents_fa",
  be: "documents_be",
  bs: "documents_bs",
  avoir: "documents_avoir",
  retenue: "documents_retenue"
};

const DOC_ITEM_TABLES = {
  facture: "document_items_factures",
  devis: "document_items_devis",
  bl: "document_items_bl",
  bc: "document_items_bc",
  fa: "document_items_fa",
  be: "document_items_be",
  bs: "document_items_bs",
  avoir: "document_items_avoir",
  retenue: "document_items_retenue"
};

const DOC_COLUMNS = [
  ["document_id", "TEXT PRIMARY KEY"],
  ["number", "TEXT"],
  ["company_name", "TEXT"],
  ["company_type", "TEXT"],
  ["company_vat", "TEXT"],
  ["company_customs_code", "TEXT"],
  ["company_iban", "TEXT"],
  ["company_phone", "TEXT"],
  ["company_fax", "TEXT"],
  ["company_email", "TEXT"],
  ["company_address", "TEXT"],
  ["company_logo", "TEXT"],
  ["company_logo_path", "TEXT"],
  ["company_seal_enabled", "INTEGER"],
  ["company_seal_image", "TEXT"],
  ["company_seal_max_width_mm", "REAL"],
  ["company_seal_max_height_mm", "REAL"],
  ["company_seal_opacity", "REAL"],
  ["company_seal_rotate_deg", "REAL"],
  ["company_signature_enabled", "INTEGER"],
  ["company_signature_image", "TEXT"],
  ["company_signature_max_width_mm", "REAL"],
  ["company_signature_max_height_mm", "REAL"],
  ["company_signature_opacity", "REAL"],
  ["company_signature_rotate_deg", "REAL"],
  ["client_path", "TEXT"],
  ["client_id", "TEXT"],
  ["client_type", "TEXT"],
  ["client_name", "TEXT"],
  ["client_benefit", "TEXT"],
  ["client_account", "TEXT"],
  ["client_vat", "TEXT"],
  ["client_identifiant_fiscal", "TEXT"],
  ["client_cin", "TEXT"],
  ["client_passport", "TEXT"],
  ["client_steg_ref", "TEXT"],
  ["client_phone", "TEXT"],
  ["client_email", "TEXT"],
  ["client_address", "TEXT"],
  ["meta_number", "TEXT"],
  ["meta_currency", "TEXT"],
  ["meta_date", "TEXT"],
  ["meta_due", "TEXT"],
  ["meta_doc_type", "TEXT"],
  ["meta_stock_adjusted", "INTEGER"],
  ["meta_number_length", "INTEGER"],
  ["meta_number_format", "TEXT"],
  ["meta_number_prefix", "TEXT"],
  ["meta_items_header_color", "TEXT"],
  ["meta_template", "TEXT"],
  ["meta_model_name", "TEXT"],
  ["meta_model_key", "TEXT"],
  ["meta_pdf_show_seal", "INTEGER"],
  ["meta_pdf_show_signature", "INTEGER"],
  ["meta_pdf_show_amount_words", "INTEGER"],
  ["meta_pdf_footer_note", "TEXT"],
  ["meta_pdf_footer_note_size", "REAL"],
  ["meta_taxes_enabled", "INTEGER"],
  ["meta_note_interne", "TEXT"],
  ["meta_reglement_enabled", "INTEGER"],
  ["meta_reglement_type", "TEXT"],
  ["meta_reglement_days", "INTEGER"],
  ["meta_reglement_text", "TEXT"],
  ["meta_reglement_value", "TEXT"],
  ["meta_payment_method", "TEXT"],
  ["meta_payment_reference", "TEXT"],
  ["meta_withholding_enabled", "INTEGER"],
  ["meta_withholding_rate", "REAL"],
  ["meta_withholding_base", "TEXT"],
  ["meta_withholding_label", "TEXT"],
  ["meta_withholding_threshold", "REAL"],
  ["meta_withholding_note", "TEXT"],
  ["meta_acompte_enabled", "INTEGER"],
  ["meta_acompte_paid", "REAL"],
  ["meta_financing_subvention_enabled", "INTEGER"],
  ["meta_financing_subvention_label", "TEXT"],
  ["meta_financing_subvention_amount", "REAL"],
  ["meta_financing_bank_enabled", "INTEGER"],
  ["meta_financing_bank_label", "TEXT"],
  ["meta_financing_bank_amount", "REAL"],
  ["meta_extras_shipping_enabled", "INTEGER"],
  ["meta_extras_shipping_label", "TEXT"],
  ["meta_extras_shipping_amount", "REAL"],
  ["meta_extras_shipping_tva", "REAL"],
  ["meta_extras_stamp_enabled", "INTEGER"],
  ["meta_extras_stamp_label", "TEXT"],
  ["meta_extras_stamp_amount", "REAL"],
  ["meta_extras_dossier_enabled", "INTEGER"],
  ["meta_extras_dossier_label", "TEXT"],
  ["meta_extras_dossier_amount", "REAL"],
  ["meta_extras_dossier_tva", "REAL"],
  ["meta_extras_deplacement_enabled", "INTEGER"],
  ["meta_extras_deplacement_label", "TEXT"],
  ["meta_extras_deplacement_amount", "REAL"],
  ["meta_extras_deplacement_tva", "REAL"],
  ["meta_add_form_fodec_enabled", "INTEGER"],
  ["meta_add_form_fodec_label", "TEXT"],
  ["meta_add_form_fodec_rate", "REAL"],
  ["meta_add_form_fodec_tva", "REAL"],
  ["meta_add_form_purchase_tva", "REAL"],
  ["meta_add_form_tva", "REAL"],
  ["meta_col_ref", "INTEGER"],
  ["meta_col_product", "INTEGER"],
  ["meta_col_desc", "INTEGER"],
  ["meta_col_qty", "INTEGER"],
  ["meta_col_unit", "INTEGER"],
  ["meta_col_stock_qty", "INTEGER"],
  ["meta_col_purchase_price", "INTEGER"],
  ["meta_col_purchase_tva", "INTEGER"],
  ["meta_col_price", "INTEGER"],
  ["meta_col_fodec_sale", "INTEGER"],
  ["meta_col_fodec_purchase", "INTEGER"],
  ["meta_col_fodec", "INTEGER"],
  ["meta_col_add_fodec", "INTEGER"],
  ["meta_col_tva", "INTEGER"],
  ["meta_col_discount", "INTEGER"],
  ["meta_col_total_purchase_ht", "INTEGER"],
  ["meta_col_total_purchase_ttc", "INTEGER"],
  ["meta_col_purchase_dependencies_locked", "INTEGER"],
  ["meta_col_total_ht", "INTEGER"],
  ["meta_col_total_ttc", "INTEGER"],
  ["meta_article_label_ref", "TEXT"],
  ["meta_article_label_product", "TEXT"],
  ["meta_article_label_desc", "TEXT"],
  ["meta_article_label_qty", "TEXT"],
  ["meta_article_label_unit", "TEXT"],
  ["meta_article_label_stock_qty", "TEXT"],
  ["meta_article_label_purchase_price", "TEXT"],
  ["meta_article_label_purchase_tva", "TEXT"],
  ["meta_article_label_price", "TEXT"],
  ["meta_article_label_tva", "TEXT"],
  ["meta_article_label_discount", "TEXT"],
  ["meta_article_label_fodec_sale", "TEXT"],
  ["meta_article_label_fodec_purchase", "TEXT"],
  ["meta_article_label_fodec", "TEXT"],
  ["meta_article_label_fodec_rate", "TEXT"],
  ["meta_article_label_fodec_tva", "TEXT"],
  ["meta_article_label_fodec_amount", "TEXT"],
  ["meta_article_label_total_purchase_ht", "TEXT"],
  ["meta_article_label_total_purchase_ttc", "TEXT"],
  ["meta_article_label_total_ht", "TEXT"],
  ["meta_article_label_total_ttc", "TEXT"],
  ["notes", "TEXT"],
  ["schema_version", "INTEGER"],
  ["totals_currency", "TEXT"],
  ["totals_subtotal", "REAL"],
  ["totals_discount", "REAL"],
  ["totals_tax", "REAL"],
  ["totals_total_ht", "REAL"],
  ["totals_total_ttc", "REAL"],
  ["totals_grand", "REAL"],
  ["totals_wh_amount", "REAL"],
  ["totals_net", "REAL"],
  ["totals_balance_due", "REAL"],
  ["totals_acompte_enabled", "INTEGER"],
  ["totals_acompte_paid", "REAL"],
  ["totals_acompte_base", "REAL"],
  ["totals_acompte_remaining", "REAL"],
  ["totals_financing_subvention_enabled", "INTEGER"],
  ["totals_financing_subvention_label", "TEXT"],
  ["totals_financing_subvention_amount", "REAL"],
  ["totals_financing_bank_enabled", "INTEGER"],
  ["totals_financing_bank_label", "TEXT"],
  ["totals_financing_bank_amount", "REAL"],
  ["totals_financing_total", "REAL"],
  ["totals_financing_net_to_pay", "REAL"],
  ["totals_extras_ship_ht", "REAL"],
  ["totals_extras_ship_ttc", "REAL"],
  ["totals_extras_ship_tva", "REAL"],
  ["totals_extras_dossier_ht", "REAL"],
  ["totals_extras_dossier_ttc", "REAL"],
  ["totals_extras_dossier_tva", "REAL"],
  ["totals_extras_deplacement_ht", "REAL"],
  ["totals_extras_deplacement_ttc", "REAL"],
  ["totals_extras_deplacement_tva", "REAL"],
  ["totals_extras_stamp_ht", "REAL"],
  ["totals_extras_stamp_ttc", "REAL"],
  ["totals_extras_stamp_tva", "REAL"],
  ["totals_extras_fodec_base", "REAL"],
  ["totals_extras_fodec_ht", "REAL"],
  ["totals_extras_fodec_ttc", "REAL"],
  ["totals_extras_fodec_tva", "REAL"],
  ["totals_extras_fodec_enabled", "INTEGER"],
  ["totals_extras_fodec_label", "TEXT"],
  ["totals_extras_fodec_rate", "REAL"],
  ["totals_extras_stamp_enabled", "INTEGER"],
  ["totals_extras_stamp_label", "TEXT"],
  ["totals_extras_dossier_enabled", "INTEGER"],
  ["totals_extras_dossier_label", "TEXT"],
  ["totals_extras_deplacement_enabled", "INTEGER"],
  ["totals_extras_deplacement_label", "TEXT"]
];

const ITEM_COLUMNS = [
  ["document_id", "TEXT NOT NULL"],
  ["position", "INTEGER"],
  ["ref", "TEXT"],
  ["product", "TEXT"],
  ["desc", "TEXT"],
  ["qty", "REAL"],
  ["unit", "TEXT"],
  ["purchase_price", "REAL"],
  ["purchase_tva", "REAL"],
  ["price", "REAL"],
  ["tva", "REAL"],
  ["discount", "REAL"],
  ["fodec_enabled", "INTEGER"],
  ["fodec_label", "TEXT"],
  ["fodec_rate", "REAL"],
  ["fodec_tva", "REAL"],
  ["purchase_fodec_enabled", "INTEGER"],
  ["purchase_fodec_label", "TEXT"],
  ["purchase_fodec_rate", "REAL"],
  ["purchase_fodec_tva", "REAL"],
  ["article_path", "TEXT"],
  ["PRIMARY KEY", "(document_id, position)"]
];

const BASE_TABLE_ORDER = [
  "articles",
  "article_fields",
  "clients",
  "client_fields",
  "depot_magasin",
  "depot_magasin_emplacement",
  "documents",
  "document_fields",
  "models",
  "model_fields",
  "app_settings",
  "app_setting_fields",
  "company_profile",
  "counters",
  "doc_edit_locks",
  "client_ledger",
  "payment_history",
  "smtp_settings"
];

const BASE_TABLE_DEFINITIONS = {
  app_settings: {
    columns: [
      ["key", "TEXT PRIMARY KEY"],
      ["updated_at", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings (updated_at)" }
    ]
  },
  app_setting_fields: {
    columns: [
      ["setting_key", "TEXT NOT NULL"],
      ["path", "TEXT NOT NULL"],
      ["type", "TEXT NOT NULL"],
      ["value", "TEXT"],
      ["PRIMARY KEY", "(setting_key, path)"],
      ["FOREIGN KEY", "(setting_key) REFERENCES app_settings(key) ON DELETE CASCADE"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_app_setting_fields_path ON app_setting_fields (path)" }
    ]
  },
  articles: {
    columns: [
      ["id", "TEXT PRIMARY KEY"],
      ["name", "TEXT"],
      ["ref", "TEXT"],
      ["product", "TEXT"],
      ["desc", "TEXT"],
      ["qty", "REAL"],
      ["stock_qty", "REAL"],
      ["stock_min", "REAL"],
      ["stock_alert", "INTEGER"],
      ["stock_default_depot_id", "TEXT"],
      ["stock_depots_json", "TEXT"],
      ["stock_default_emplacement_id", "TEXT"],
      ["stock_allow_negative", "INTEGER NOT NULL DEFAULT 0"],
      ["stock_block_insufficient", "INTEGER NOT NULL DEFAULT 0"],
      ["stock_alert_enabled", "INTEGER NOT NULL DEFAULT 0"],
      ["stock_min_qty", "INTEGER NOT NULL DEFAULT 0"],
      ["stock_max_qty", "INTEGER"],
      ["unit", "TEXT"],
      ["purchase_price", "REAL"],
      ["purchase_tva", "REAL"],
      ["price", "REAL"],
      ["tva", "REAL"],
      ["discount", "REAL"],
      ["fodec_enabled", "INTEGER"],
      ["fodec_label", "TEXT"],
      ["fodec_rate", "REAL"],
      ["fodec_tva", "REAL"],
      ["purchase_fodec_enabled", "INTEGER"],
      ["purchase_fodec_label", "TEXT"],
      ["purchase_fodec_rate", "REAL"],
      ["purchase_fodec_tva", "REAL"],
      ["use_ref", "INTEGER"],
      ["use_product", "INTEGER"],
      ["use_desc", "INTEGER"],
      ["use_unit", "INTEGER"],
      ["use_price", "INTEGER"],
      ["use_fodec", "INTEGER"],
      ["use_tva", "INTEGER"],
      ["use_discount", "INTEGER"],
      ["use_total_ht", "INTEGER"],
      ["use_total_ttc", "INTEGER"],
      ["search_text", "TEXT"],
      ["ref_normalized", "TEXT"],
      ["product_normalized", "TEXT"],
      ["desc_normalized", "TEXT"],
      ["legacy_path", "TEXT UNIQUE"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_articles_search_text ON articles (search_text)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_articles_ref_normalized ON articles (ref_normalized)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_articles_product_normalized ON articles (product_normalized)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_articles_desc_normalized ON articles (desc_normalized)" }
    ]
  },
  article_fields: {
    columns: [
      ["article_id", "TEXT NOT NULL"],
      ["path", "TEXT NOT NULL"],
      ["type", "TEXT NOT NULL"],
      ["value", "TEXT"],
      ["PRIMARY KEY", "(article_id, path)"],
      ["FOREIGN KEY", "(article_id) REFERENCES articles(id) ON DELETE CASCADE"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_article_fields_path ON article_fields (path)" }
    ]
  },
  clients: {
    columns: [
      ["id", "TEXT PRIMARY KEY"],
      ["type", "TEXT NOT NULL"],
      ["name", "TEXT"],
      ["client_type", "TEXT"],
      ["benefit", "TEXT"],
      ["account", "TEXT"],
      ["account_normalized", "TEXT"],
      ["vat", "TEXT"],
      ["identifiant_fiscal", "TEXT"],
      ["cin", "TEXT"],
      ["passport", "TEXT"],
      ["steg_ref", "TEXT"],
      ["phone", "TEXT"],
      ["email", "TEXT"],
      ["address", "TEXT"],
      ["sold_client", "TEXT"],
      ["search_text", "TEXT"],
      ["legacy_path", "TEXT UNIQUE"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_clients_search_text ON clients (search_text)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_clients_account_normalized ON clients (account_normalized)" }
    ]
  },
  client_fields: {
    columns: [
      ["client_id", "TEXT NOT NULL"],
      ["path", "TEXT NOT NULL"],
      ["type", "TEXT NOT NULL"],
      ["value", "TEXT"],
      ["PRIMARY KEY", "(client_id, path)"],
      ["FOREIGN KEY", "(client_id) REFERENCES clients(id) ON DELETE CASCADE"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_client_fields_path ON client_fields (path)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_client_fields_path_value ON client_fields (path, value)" }
    ]
  },
  depot_magasin: {
    columns: [
      ["id", "TEXT PRIMARY KEY"],
      ["name", "TEXT NOT NULL"],
      ["address", "TEXT"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_depot_magasin_name ON depot_magasin (name)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_depot_magasin_updated_at ON depot_magasin (updated_at)" }
    ]
  },
  depot_magasin_emplacement: {
    columns: [
      ["id", "TEXT PRIMARY KEY"],
      ["depot_id", "TEXT NOT NULL"],
      ["code", "TEXT NOT NULL"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"],
      ["UNIQUE", "(depot_id, code)"],
      ["FOREIGN KEY", "(depot_id) REFERENCES depot_magasin(id) ON DELETE CASCADE"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_depot_magasin_emplacement_depot_id ON depot_magasin_emplacement (depot_id)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_depot_magasin_emplacement_code ON depot_magasin_emplacement (code)" }
    ]
  },
  client_ledger: {
    columns: [
      ["id", "TEXT PRIMARY KEY"],
      ["client_id", "TEXT NOT NULL"],
      ["tax_id", "TEXT"],
      ["created_at", "TEXT"],
      ["effective_date", "TEXT"],
      ["type", "TEXT"],
      ["amount", "REAL"],
      ["source", "TEXT"],
      ["source_id", "TEXT"],
      ["invoice_path", "TEXT"],
      ["invoice_number", "TEXT"],
      ["payment_mode", "TEXT"],
      ["payment_ref", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_client_ledger_client_id ON client_ledger (client_id)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_client_ledger_created_at ON client_ledger (created_at)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_client_ledger_effective_date ON client_ledger (effective_date)" }
    ]
  },
  company_profile: {
    columns: [
      ["id", "INTEGER PRIMARY KEY CHECK (id = 1)"],
      ["name", "TEXT"],
      ["type", "TEXT"],
      ["vat", "TEXT"],
      ["customs_code", "TEXT"],
      ["iban", "TEXT"],
      ["phone", "TEXT"],
      ["phone_code", "TEXT"],
      ["fax", "TEXT"],
      ["email", "TEXT"],
      ["address", "TEXT"],
      ["address_street", "TEXT"],
      ["address_postal", "TEXT"],
      ["address_city", "TEXT"],
      ["logo", "TEXT"],
      ["logo_path", "TEXT"],
      ["seal_enabled", "INTEGER"],
      ["seal_image", "TEXT"],
      ["seal_max_width_mm", "REAL"],
      ["seal_max_height_mm", "REAL"],
      ["seal_opacity", "REAL"],
      ["seal_rotate_deg", "REAL"],
      ["signature_enabled", "INTEGER"],
      ["signature_image", "TEXT"],
      ["signature_rotate_deg", "REAL"],
      ["lan_enabled", "INTEGER"],
      ["lan_port", "INTEGER"],
      ["lan_redirect_http80", "INTEGER"],
      ["updated_at", "TEXT"]
    ],
    indexes: []
  },
  counters: {
    columns: [
      ["doc_type", "TEXT NOT NULL"],
      ["period", "TEXT NOT NULL"],
      ["last_number", "INTEGER NOT NULL"],
      ["updated_at", "TEXT"],
      ["PRIMARY KEY", "(doc_type, period)"]
    ],
    indexes: []
  },
  doc_edit_locks: {
    columns: [
      ["doc_key", "TEXT PRIMARY KEY"],
      ["lock_id", "TEXT NOT NULL"],
      ["instance_id", "TEXT NOT NULL"],
      ["acquired_at", "INTEGER NOT NULL"],
      ["last_seen", "INTEGER NOT NULL"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_doc_edit_locks_last_seen ON doc_edit_locks (last_seen)" }
    ]
  },
  document_fields: {
    columns: [
      ["document_id", "TEXT NOT NULL"],
      ["path", "TEXT NOT NULL"],
      ["type", "TEXT NOT NULL"],
      ["value", "TEXT"],
      ["PRIMARY KEY", "(document_id, path)"],
      ["FOREIGN KEY", "(document_id) REFERENCES documents(id) ON DELETE CASCADE"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_document_fields_path ON document_fields (path)" }
    ]
  },
  documents: {
    columns: [
      ["id", "TEXT PRIMARY KEY"],
      ["doc_type", "TEXT NOT NULL"],
      ["period", "TEXT NOT NULL"],
      ["period_key", "TEXT"],
      ["number", "TEXT NOT NULL UNIQUE"],
      ["idx", "INTEGER"],
      ["custom_number", "TEXT"],
      ["status", "TEXT"],
      ["note_interne", "TEXT"],
      ["converted_from_type", "TEXT"],
      ["converted_from_id", "TEXT"],
      ["converted_from_number", "TEXT"],
      ["pdf_path", "TEXT"],
      ["pdf_exported_at", "TEXT"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents (doc_type)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_documents_period ON documents (period)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_documents_doc_type_period_idx ON documents (doc_type, period, idx)" },
      { sql: "CREATE INDEX IF NOT EXISTS idx_documents_converted_from ON documents (converted_from_type, converted_from_number)" },
      {
        sql: "CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_doc_type_period_key_idx ON documents (doc_type, period_key, idx)",
        ignoreErrors: true
      }
    ]
  },
  model_fields: {
    columns: [
      ["model_name", "TEXT NOT NULL"],
      ["path", "TEXT NOT NULL"],
      ["type", "TEXT NOT NULL"],
      ["value", "TEXT"],
      ["PRIMARY KEY", "(model_name, path)"],
      ["FOREIGN KEY", "(model_name) REFERENCES models(name) ON DELETE CASCADE"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_model_fields_path ON model_fields (path)" }
    ]
  },
  models: {
    columns: [
      ["name", "TEXT PRIMARY KEY"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_models_updated_at ON models (updated_at)" }
    ]
  },
  payment_history: {
    columns: [
      ["id", "TEXT PRIMARY KEY"],
      ["position", "INTEGER NOT NULL"],
      ["paymentNumber", "INTEGER"],
      ["entryType", "TEXT"],
      ["invoiceNumber", "TEXT"],
      ["invoicePath", "TEXT"],
      ["clientName", "TEXT"],
      ["clientAccount", "TEXT"],
      ["clientPath", "TEXT"],
      ["clientId", "TEXT"],
      ["paymentDate", "TEXT"],
      ["paymentRef", "TEXT"],
      ["amount", "REAL"],
      ["balanceDue", "REAL"],
      ["currency", "TEXT"],
      ["mode", "TEXT"],
      ["savedAt", "TEXT"]
    ],
    indexes: [
      { sql: "CREATE INDEX IF NOT EXISTS idx_payment_history_position ON payment_history (position)" }
    ]
  },
  smtp_settings: {
    columns: [
      ["preset", "TEXT PRIMARY KEY"],
      ["enabled", "INTEGER"],
      ["host", "TEXT"],
      ["port", "INTEGER"],
      ["secure", "INTEGER"],
      ["user", "TEXT"],
      ["pass", "TEXT"],
      ["from_email", "TEXT"],
      ["from_name", "TEXT"],
      ["updated_at", "TEXT"]
    ],
    indexes: []
  }
};

const SPECIAL_TABLE_LINES = new Set(["PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK"]);

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;

const isConstraintLine = (name) => {
  const upper = String(name || "").trim().toUpperCase();
  return SPECIAL_TABLE_LINES.has(upper) || upper.startsWith("CONSTRAINT ");
};

const normalizeColumnTypeForAlter = (definition) => {
  const trimmed = String(definition || "").trim();
  if (!trimmed) return "TEXT";
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens[0] || "TEXT";
};

const formatTableLine = ([name, definition]) => {
  if (isConstraintLine(name)) return `${name} ${definition}`;
  return `${quoteIdentifier(name)} ${definition}`;
};

const createTableSql = (tableName, definition) => {
  const lines = (definition?.columns || []).map((columnDef) => `  ${formatTableLine(columnDef)}`);
  return `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(tableName)} (\n${lines.join(",\n")}\n);`;
};

const cloneColumnDefs = (columns = []) => columns.map(([name, definition]) => [name, definition]);

const createDocTableDefinition = () => ({
  columns: cloneColumnDefs(DOC_COLUMNS),
  indexes: []
});

const createItemTableDefinition = (tableName) => ({
  columns: cloneColumnDefs(ITEM_COLUMNS),
  indexes: [
    {
      sql: `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`idx_${tableName}_document_id`)} ON ${quoteIdentifier(tableName)} (${quoteIdentifier("document_id")})`
    }
  ]
});

const createTaxBreakdownDefinition = () => ({
  columns: [
    ["document_id", "TEXT NOT NULL"],
    ["kind", "TEXT NOT NULL"],
    ["position", "INTEGER"],
    ["rate", "REAL"],
    ["tva_rate", "REAL"],
    ["base", "REAL"],
    ["ht", "REAL"],
    ["tva", "REAL"],
    ["fodec", "REAL"],
    ["fodec_tva", "REAL"],
    ["PRIMARY KEY", "(document_id, kind, position)"]
  ],
  indexes: [
    { sql: "CREATE INDEX IF NOT EXISTS idx_doc_tax_breakdown_doc ON document_tax_breakdown (document_id)" }
  ]
});

const getAllTableDefinitions = () => {
  const definitions = {};
  BASE_TABLE_ORDER.forEach((tableName) => {
    const base = BASE_TABLE_DEFINITIONS[tableName];
    definitions[tableName] = {
      columns: cloneColumnDefs(base.columns),
      indexes: (base.indexes || []).map((indexDef) => ({ ...indexDef }))
    };
  });
  Object.values(DOC_TYPE_TABLES).forEach((tableName) => {
    definitions[tableName] = createDocTableDefinition();
  });
  Object.values(DOC_ITEM_TABLES).forEach((tableName) => {
    definitions[tableName] = createItemTableDefinition(tableName);
  });
  definitions.document_tax_breakdown = createTaxBreakdownDefinition();
  return definitions;
};

const getOrderedTableNames = () => {
  const names = [...BASE_TABLE_ORDER];
  names.push(...Object.values(DOC_TYPE_TABLES));
  names.push(...Object.values(DOC_ITEM_TABLES));
  names.push("document_tax_breakdown");
  return names;
};

const alignSchema = (db, options = {}) => {
  if (!db) return;
  db.pragma("foreign_keys = ON");
  const definitions = getAllTableDefinitions();
  const tableFilter =
    Array.isArray(options.tables) && options.tables.length
      ? new Set(options.tables.map((name) => String(name || "").trim()).filter(Boolean))
      : null;
  const orderedNames = getOrderedTableNames();
  const selectedNames = tableFilter
    ? orderedNames.filter((name) => tableFilter.has(name))
    : orderedNames;

  selectedNames.forEach((tableName) => {
    const definition = definitions[tableName];
    if (!definition) return;
    db.exec(createTableSql(tableName, definition));
    const existingColumns = new Set(
      db
        .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
        .all()
        .map((col) => col.name)
    );
    definition.columns.forEach(([name, definitionText]) => {
      if (isConstraintLine(name)) return;
      if (existingColumns.has(name)) return;
      const alterType = normalizeColumnTypeForAlter(definitionText);
      db.exec(
        `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(name)} ${alterType}`
      );
    });
    (definition.indexes || []).forEach((indexDef) => {
      try {
        db.exec(indexDef.sql);
      } catch (error) {
        if (!indexDef.ignoreErrors) throw error;
      }
    });
  });
};

module.exports = {
  DOC_TYPE_TABLES,
  DOC_ITEM_TABLES,
  DOC_COLUMNS,
  ITEM_COLUMNS,
  BASE_TABLE_ORDER,
  BASE_TABLE_DEFINITIONS,
  quoteIdentifier,
  createTableSql,
  getAllTableDefinitions,
  getOrderedTableNames,
  alignSchema
};
