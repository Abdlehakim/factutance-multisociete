(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapRuntimeSource = SEM.registerCoreBootstrapRuntimeSource;
  if (typeof registerCoreBootstrapRuntimeSource !== "function") {
    console.warn("[core-bootstrap-runtime] registerCoreBootstrapRuntimeSource is unavailable");
    return;
  }

  registerCoreBootstrapRuntimeSource("imports-exports", function (ctx) {
          clientImportBtnSelector = "#clientImportBtn";
          clientImportModal = getEl("clientImportModal");
          clientImportModalTitle =
            clientImportModal?.querySelector("#clientImportModalTitle") || getEl("clientImportModalTitle");
          clientImportHint =
            clientImportModal?.querySelector("#clientImportHint") || getEl("clientImportHint");
          clientImportModalClose =
            clientImportModal?.querySelector("#clientImportModalClose") || getEl("clientImportModalClose");
          clientImportModalCancel =
            clientImportModal?.querySelector("#clientImportModalCancel") || getEl("clientImportModalCancel");
          clientImportModalSave =
            clientImportModal?.querySelector("#clientImportModalSave") || getEl("clientImportModalSave");
          clientImportFileInput =
            clientImportModal?.querySelector("#clientImportFile") || getEl("clientImportFile");
          clientImportSummary =
            clientImportModal?.querySelector("#clientImportSummary") || getEl("clientImportSummary");
          clientImportErrors =
            clientImportModal?.querySelector("#clientImportErrors") || getEl("clientImportErrors");
          CLIENT_IMPORT_ERROR_LIMIT = 8;
          clientImportModalState = {
            items: [],
            errors: [],
            fileName: "",
            totalRows: 0,
            entityType: "client",
            busy: false
          };
          clientImportModalRestoreFocus = null;
          clientImportFolderFallbackWarned = false;

          articleImportBtnSelector = "#articleImportBtn";
          articleImportModal = getEl("articleImportModal");
          articleImportModalTitle =
            articleImportModal?.querySelector("#articleImportModalTitle") || getEl("articleImportModalTitle");
          articleImportHint =
            articleImportModal?.querySelector("#articleImportHint") || getEl("articleImportHint");
          articleImportModalClose =
            articleImportModal?.querySelector("#articleImportModalClose") || getEl("articleImportModalClose");
          articleImportModalCancel =
            articleImportModal?.querySelector("#articleImportModalCancel") || getEl("articleImportModalCancel");
          articleImportModalSave =
            articleImportModal?.querySelector("#articleImportModalSave") || getEl("articleImportModalSave");
          articleImportFileInput =
            articleImportModal?.querySelector("#articleImportFile") || getEl("articleImportFile");
          articleImportSummary =
            articleImportModal?.querySelector("#articleImportSummary") || getEl("articleImportSummary");
          articleImportErrors =
            articleImportModal?.querySelector("#articleImportErrors") || getEl("articleImportErrors");
          ARTICLE_IMPORT_ERROR_LIMIT = 8;
          articleImportModalState = {
            items: [],
            errors: [],
            fileName: "",
            totalRows: 0,
            busy: false
          };
          articleImportModalRestoreFocus = null;
          articleExportBtnSelector = "#articleExportBtn";
          articleExportModal = getEl("articlesExportModal");
          articleExportModalClose =
            articleExportModal?.querySelector("#articlesExportModalClose") || getEl("articlesExportModalClose");
          articleExportModalCancel =
            articleExportModal?.querySelector("#articlesExportModalCancel") || getEl("articlesExportModalCancel");
          articleExportModalSave =
            articleExportModal?.querySelector("#articlesExportModalSave") || getEl("articlesExportModalSave");
          articleExportModalRestoreFocus = null;

          getClientImportModalLabels = (entityType = clientImportModalState.entityType) => {
            const isVendor = entityType === "vendor";
            return {
              singular: isVendor ? "fournisseur" : "client",
              plural: isVendor ? "fournisseurs" : "clients",
              title: isVendor ? "Importer des fournisseurs" : "Importer des clients"
            };
          };

          applyClientImportModalLabels = (entityType = clientImportModalState.entityType) => {
            const labels = getClientImportModalLabels(entityType);
            if (clientImportModalTitle) {
              clientImportModalTitle.textContent = labels.title;
            }
            if (clientImportHint) {
              const benefitLabel = resolveClientFieldLabel("benefit");
              const accountLabel = resolveClientFieldLabel("account");
              const soldClientLabel = resolveClientFieldLabel("soldClient");
              const stegRefLabel = resolveClientFieldLabel("stegRef");
              const extraHeaders = [benefitLabel, accountLabel, soldClientLabel, stegRefLabel].filter(Boolean);
              const extraHint = extraHeaders.length ? `, ${extraHeaders.join(", ")}` : "";
              clientImportHint.textContent =
                `Selectionnez un fichier Excel (XLSX) ou CSV contenant plusieurs ${labels.plural}. ` +
                "Colonnes acceptees : Nom, Matricule fiscal (ou CIN / passeport pour Particulier), Type (Societe / personne morale (PM), Personne physique (PP), Particulier), Telephone, Email, Adresse" +
                `${extraHint}.`;
            }
          };

          setClientImportBusy = (isBusy) => {
            clientImportModalState.busy = !!isBusy;
            if (clientImportModal) {
              if (isBusy) clientImportModal.setAttribute("aria-busy", "true");
              else clientImportModal.removeAttribute("aria-busy");
            }
            if (clientImportFileInput) clientImportFileInput.disabled = !!isBusy;
            if (clientImportModalClose) clientImportModalClose.disabled = !!isBusy;
            if (clientImportModalCancel) clientImportModalCancel.disabled = !!isBusy;
            if (clientImportModalSave) {
              clientImportModalSave.disabled = !!isBusy || clientImportModalState.items.length === 0;
              if (isBusy) clientImportModalSave.setAttribute("aria-busy", "true");
              else clientImportModalSave.removeAttribute("aria-busy");
            }
          };

          renderClientImportSummary = () => {
            if (!clientImportSummary) return;
            if (!clientImportModalState.fileName) {
              clientImportSummary.textContent = "";
              clientImportSummary.hidden = true;
              return;
            }
            const labels = getClientImportModalLabels();
            const total = clientImportModalState.totalRows;
            const ready = clientImportModalState.items.length;
            const errors = clientImportModalState.errors.length;
            const totalLabel = `${total} ligne${total > 1 ? "s" : ""} detectee${total > 1 ? "s" : ""}`;
            const readyLabel = `${ready} ${labels.plural} pret${ready > 1 ? "s" : ""} a enregistrer`;
            let text = `${clientImportModalState.fileName} - ${totalLabel}. ${readyLabel}.`;
            if (errors) {
              text += ` ${errors} ligne${errors > 1 ? "s" : ""} ignoree${errors > 1 ? "s" : ""}.`;
            }
            clientImportSummary.textContent = text;
            clientImportSummary.hidden = false;
          };

          renderClientImportErrors = () => {
            if (!clientImportErrors) return;
            clientImportErrors.innerHTML = "";
            if (!clientImportModalState.errors.length) {
              clientImportErrors.hidden = true;
              return;
            }
            clientImportErrors.hidden = false;
            const errors = clientImportModalState.errors.slice(0, CLIENT_IMPORT_ERROR_LIMIT);
            errors.forEach((message) => {
              const item = document.createElement("li");
              item.textContent = message;
              clientImportErrors.appendChild(item);
            });
            const remaining = clientImportModalState.errors.length - errors.length;
            if (remaining > 0) {
              const more = document.createElement("li");
              more.textContent = `+ ${remaining} autre${remaining > 1 ? "s" : ""} erreur${remaining > 1 ? "s" : ""}`;
              clientImportErrors.appendChild(more);
            }
          };

          resetClientImportState = () => {
            clientImportModalState.items = [];
            clientImportModalState.errors = [];
            clientImportModalState.fileName = "";
            clientImportModalState.totalRows = 0;
            if (clientImportFileInput) clientImportFileInput.value = "";
            renderClientImportSummary();
            renderClientImportErrors();
            if (clientImportModalSave) clientImportModalSave.disabled = true;
          };

          setArticleImportBusy = (isBusy) => {
            articleImportModalState.busy = !!isBusy;
            if (articleImportModal) {
              if (isBusy) articleImportModal.setAttribute("aria-busy", "true");
              else articleImportModal.removeAttribute("aria-busy");
            }
            if (articleImportFileInput) articleImportFileInput.disabled = !!isBusy;
            if (articleImportModalClose) articleImportModalClose.disabled = !!isBusy;
            if (articleImportModalCancel) articleImportModalCancel.disabled = !!isBusy;
            if (articleImportModalSave) {
              articleImportModalSave.disabled = !!isBusy || articleImportModalState.items.length === 0;
              if (isBusy) articleImportModalSave.setAttribute("aria-busy", "true");
              else articleImportModalSave.removeAttribute("aria-busy");
            }
          };

          renderArticleImportSummary = () => {
            if (!articleImportSummary) return;
            if (!articleImportModalState.fileName) {
              articleImportSummary.textContent = "";
              articleImportSummary.hidden = true;
              return;
            }
            const total = articleImportModalState.totalRows;
            const ready = articleImportModalState.items.length;
            const errors = articleImportModalState.errors.length;
            const totalLabel = `${total} ligne${total > 1 ? "s" : ""} detectee${total > 1 ? "s" : ""}`;
            const readyLabel = `${ready} article${ready > 1 ? "s" : ""} pret${ready > 1 ? "s" : ""} a enregistrer`;
            let text = `${articleImportModalState.fileName} - ${totalLabel}. ${readyLabel}.`;
            if (errors) {
              text += ` ${errors} ligne${errors > 1 ? "s" : ""} ignoree${errors > 1 ? "s" : ""}.`;
            }
            articleImportSummary.textContent = text;
            articleImportSummary.hidden = false;
          };

          renderArticleImportErrors = () => {
            if (!articleImportErrors) return;
            articleImportErrors.innerHTML = "";
            if (!articleImportModalState.errors.length) {
              articleImportErrors.hidden = true;
              return;
            }
            articleImportErrors.hidden = false;
            const errors = articleImportModalState.errors.slice(0, ARTICLE_IMPORT_ERROR_LIMIT);
            errors.forEach((message) => {
              const item = document.createElement("li");
              item.textContent = message;
              articleImportErrors.appendChild(item);
            });
            const remaining = articleImportModalState.errors.length - errors.length;
            if (remaining > 0) {
              const more = document.createElement("li");
              more.textContent = `+ ${remaining} autre${remaining > 1 ? "s" : ""} erreur${remaining > 1 ? "s" : ""}`;
              articleImportErrors.appendChild(more);
            }
          };

          resetArticleImportState = () => {
            articleImportModalState.items = [];
            articleImportModalState.errors = [];
            articleImportModalState.fileName = "";
            articleImportModalState.totalRows = 0;
            if (articleImportFileInput) articleImportFileInput.value = "";
            renderArticleImportSummary();
            renderArticleImportErrors();
            if (articleImportModalSave) articleImportModalSave.disabled = true;
          };
          ARTICLE_IMPORT_PURCHASE_FIELDS = new Set([
            "purchasePrice",
            "purchaseTva",
            "purchaseDiscount",
            "purchaseFodecEnabled",
            "purchaseFodecRate",
            "purchaseFodecTva"
          ]);
          ARTICLE_IMPORT_SALES_FIELDS = new Set([
            "price",
            "tva",
            "discount",
            "fodec",
            "fodecRate",
            "fodecTva"
          ]);
          ARTICLE_IMPORT_PURCHASE_FODEC_FIELDS = new Set([
            "purchaseFodecEnabled",
            "purchaseFodecRate",
            "purchaseFodecTva"
          ]);
          ARTICLE_IMPORT_SALES_FODEC_FIELDS = new Set(["fodec", "fodecRate", "fodecTva"]);
          isArticleImportExportFieldVisible = (field, visibility = articleFieldVisibility) => {
            if (!field) return true;
            const source = visibility || {};
            const purchaseSectionEnabled = source.purchaseSectionEnabled !== false;
            const salesSectionEnabled = source.salesSectionEnabled !== false;
            if (ARTICLE_IMPORT_PURCHASE_FIELDS.has(field) && !purchaseSectionEnabled) return false;
            if (ARTICLE_IMPORT_SALES_FIELDS.has(field) && !salesSectionEnabled) return false;
            if (ARTICLE_IMPORT_PURCHASE_FODEC_FIELDS.has(field)) {
              return true;
            }
            if (ARTICLE_IMPORT_SALES_FODEC_FIELDS.has(field)) {
              if (Object.prototype.hasOwnProperty.call(source, "fodec")) {
                return source.fodec !== false;
              }
              return true;
            }
            if (Object.prototype.hasOwnProperty.call(source, field)) {
              return source[field] !== false;
            }
            return true;
          };
          updateArticleImportCopyHeaders = (visibility = articleFieldVisibility) => {
            if (!articleImportModal) return;
            const headers = Array.from(
              articleImportModal.querySelectorAll("[data-article-import-header]")
            )
              .filter((node) => {
                const field = node.closest("[data-article-import-field]")?.dataset.articleImportField || "";
                return isArticleImportExportFieldVisible(field, visibility);
              })
              .map((node) => node.textContent.trim())
              .filter(Boolean);
            if (!headers.length) return;
            const copyBtn = articleImportModal.querySelector("[data-article-import-copy]");
            if (copyBtn) copyBtn.dataset.docHistoryCopyValue = headers.join("\t");
          };
          updateArticleImportExampleVisibility = (visibility = articleFieldVisibility) => {
            if (!articleImportModal) return;
            articleImportModal.querySelectorAll("[data-article-import-field]").forEach((node) => {
              const field = node.dataset.articleImportField || "";
              if (!field) return;
              const isVisible = isArticleImportExportFieldVisible(field, visibility);
              if (isVisible) {
                node.removeAttribute("hidden");
              } else {
                node.setAttribute("hidden", "");
              }
            });
          };
          updateArticlesExportExampleVisibility = (visibility = articleFieldVisibility) => {
            if (!articleExportModal) return;
            articleExportModal.querySelectorAll("[data-article-export-field]").forEach((node) => {
              const field = node.dataset.articleExportField || "";
              if (!field) return;
              const isVisible = isArticleImportExportFieldVisible(field, visibility);
              if (isVisible) {
                node.removeAttribute("hidden");
              } else {
                node.setAttribute("hidden", "");
              }
            });
          };

          copyTextToClipboard = async (text) => {
            const value = String(text || "").trim();
            if (!value) return false;
            if (navigator?.clipboard?.writeText) {
              try {
                await navigator.clipboard.writeText(value);
                return true;
              } catch {}
            }
            try {
              const textarea = document.createElement("textarea");
              textarea.value = value;
              textarea.setAttribute("readonly", "true");
              textarea.style.position = "absolute";
              textarea.style.left = "-9999px";
              document.body.appendChild(textarea);
              textarea.select();
              const ok = document.execCommand && document.execCommand("copy");
              textarea.remove();
              return !!ok;
            } catch {
              return false;
            }
          };

          handleClientImportCopy = async (evt) => {
            const copyBtn = evt.target?.closest?.("[data-doc-history-copy]");
            const inClientModal = clientImportModal && clientImportModal.contains(copyBtn);
            const inArticleModal = articleImportModal && articleImportModal.contains(copyBtn);
            if (!copyBtn || (!inClientModal && !inArticleModal)) return;
            if (copyBtn.getAttribute("aria-disabled") === "true" || copyBtn.classList.contains("is-disabled")) {
              return;
            }
            evt.preventDefault();
            evt.stopPropagation();
            if (inClientModal) {
              updateClientImportExampleHeaderCopy(clientFieldVisibility, clientFieldLabels);
            }
            const copyValue = copyBtn.dataset.docHistoryCopyValue || "";
            if (copyValue) await copyTextToClipboard(copyValue);
          };

          handleClientImportCopyKeydown = (evt) => {
            if (evt.key !== "Enter" && evt.key !== " ") return;
            handleClientImportCopy(evt);
          };

          normalizeImportValue = (value) => String(value ?? "").trim();
          isPlaceholderValue = (value) => {
            const raw = String(value ?? "").trim();
            if (!raw) return false;
            const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
            return compact === "nr";
          };
          normalizeClientImportValue = (value) => {
            const normalized = normalizeImportValue(value);
            return isPlaceholderValue(normalized) ? "" : normalized;
          };
          normalizeImportHeaderKey = (value) =>
            String(value ?? "")
              .trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "");
          normalizeClientKeyId = (value) => {
            const raw = String(value ?? "").trim();
            if (!raw || isPlaceholderValue(raw)) return "";
            return raw.toLowerCase().replace(/\s+/g, "");
          };
          resolveClientIdentifier = (client = {}) =>
            client.vat ||
            client.identifiantFiscal ||
            client.identifiant ||
            client.tva ||
            client.nif ||
            client.cin ||
            client.passeport ||
            client.passport ||
            "";
          resolveClientFallbackKey = (client = {}) => {
            const nameValue = normalizeClientKeyId(client.name || client.company || "");
            if (nameValue) return nameValue;
            const accountValue = normalizeClientKeyId(client.account || client.accountOf || "");
            return accountValue || "";
          };
          getClientUniqueKey = (client = {}) => {
            const identifier = normalizeClientKeyId(resolveClientIdentifier(client));
            return identifier || resolveClientFallbackKey(client);
          };
          getClientUniqueKeyFromRecord = (record = {}) => {
            const client = record.client || {};
            const identifier = normalizeClientKeyId(
              resolveClientIdentifier(client) ||
                record.identifier ||
                record.vat ||
                record.identifiantFiscal ||
                record.identifiant ||
                record.tva ||
                record.nif ||
                record.cin ||
                record.passeport ||
                record.passport ||
                ""
            );
            if (identifier) return identifier;
            const nameValue = normalizeClientKeyId(client.name || "");
            if (nameValue) return nameValue;
            const accountValue = normalizeClientKeyId(client.account || client.accountOf || "");
            if (accountValue) return accountValue;
            const recordNameValue = normalizeClientKeyId(record.name || "");
            const isGenericRecordName =
              recordNameValue === "client" || recordNameValue === "fournisseur";
            if (recordNameValue && !isGenericRecordName) return recordNameValue;
            return "";
          };
          CLIENT_IMPORT_HEADER_MAP = {
            nom: "name",
            name: "name",
            raisonsociale: "name",
            societe: "name",
            entreprise: "name",
            client: "name",
            fournisseur: "name",
            type: "type",
            typeclient: "type",
            typefournisseur: "type",
            identifiant: "vat",
            identifiantfiscal: "vat",
            identifiantfiscaltva: "vat",
            matriculefiscal: "vat",
            cinpasseport: "vat",
            cinpassport: "vat",
            cinpasseportou: "vat",
            cinoupasseport: "vat",
            cinetpasseport: "vat",
            tva: "vat",
            vat: "vat",
            nif: "vat",
            cin: "cin",
            passeport: "passeport",
            passport: "passeport",
            telephone: "phone",
            tel: "phone",
            phone: "phone",
            gsm: "phone",
            mobile: "phone",
            email: "email",
            mail: "email",
            courriel: "email",
            adresse: "address",
            address: "address",
            beneficiaire: "benefit",
            beneficiaires: "benefit",
            benefit: "benefit",
            auprofitde: "benefit",
            compte: "account",
            compteclient: "account",
            pourlecompte: "account",
            pourlecomptede: "account",
            account: "account",
            accountof: "account",
            soldeclient: "soldClient",
            soldclient: "soldClient",
            stegref: "stegRef",
            refsteg: "stegRef",
            referencesteg: "stegRef",
            steg: "stegRef"
          };
          resolveImportField = (header) => {
            const key = normalizeImportHeaderKey(header);
            if (!key) return "";
            if (CLIENT_IMPORT_HEADER_MAP[key]) return CLIENT_IMPORT_HEADER_MAP[key];
            const labelDefaults = resolveClientFieldLabelDefaults();
            const customLabelCandidates = {
              benefit: [clientFieldLabels?.benefit, labelDefaults.benefit],
              account: [clientFieldLabels?.account, labelDefaults.account],
              soldClient: [clientFieldLabels?.soldClient, labelDefaults.soldClient],
              stegRef: [clientFieldLabels?.stegRef, labelDefaults.stegRef]
            };
            for (const [fieldKey, candidates] of Object.entries(customLabelCandidates)) {
              const match = candidates.some((value) => {
                const normalizedValue = normalizeImportHeaderKey(value);
                return normalizedValue && normalizedValue === key;
              });
              if (match) return fieldKey;
            }
            if (key.includes("email")) return "email";
            if (key.includes("telephone") || key.startsWith("tel") || key.includes("phone") || key.includes("gsm") || key.includes("mobile")) {
              return "phone";
            }
            if (key.includes("adresse") || key.includes("address")) return "address";
            if (key.includes("identifiant") || key.includes("fiscal") || key.includes("tva") || key.includes("vat") || key.includes("nif") || key.includes("matricule")) {
              return "vat";
            }
            if (key.includes("passeport") || key.includes("passport")) return "passeport";
            if (key.includes("cin")) return "cin";
            if (key.includes("type")) return "type";
            if (key.includes("profit") || key.includes("benefic")) return "benefit";
            if (key.includes("compte") || key.includes("account")) return "account";
            if (key.includes("steg")) return "stegRef";
            if (key.includes("nom") || key.includes("raison") || key.includes("client") || key.includes("fournisseur") || key.includes("societe") || key.includes("entreprise")) {
              return "name";
            }
            return "";
          };
          normalizeClientImportType = (value) => {
            const key = normalizeImportHeaderKey(value);
            if (!key) return "societe";
            if (key.includes("particulier")) return "particulier";
            if (key.includes("personnephysique") || key.includes("physique") || key === "pp") {
              return "personne_physique";
            }
            return "societe";
          };
          isLikelyCinValue = (value) => {
            const trimmed = String(value || "").trim();
            if (!trimmed) return false;
            if (/[a-z]/i.test(trimmed)) return false;
            const digits = trimmed.replace(/\D+/g, "");
            if (!digits) return false;
            return digits.length >= 6 && digits.length <= 12;
          };
          ARTICLE_IMPORT_HEADER_MAP = {
            reference: "ref",
            ref: "ref",
            code: "ref",
            sku: "ref",
            designation: "product",
            produit: "product",
            product: "product",
            description: "desc",
            desc: "desc",
            unite: "unit",
            unit: "unit",
            stock: "stockQty",
            stockdisponible: "stockQty",
            quantite: "stockQty",
            qty: "stockQty",
            qte: "stockQty",
            prix: "price",
            price: "price",
            prixunitaire: "price",
            unitprice: "price",
            tva: "tva",
            tax: "tva",
            remise: "discount",
            discount: "discount",
            reduction: "discount",
            remisea: "purchaseDiscount",
            remiseachat: "purchaseDiscount",
            remisepurchase: "purchaseDiscount",
            purchasediscount: "purchaseDiscount",
            discountpurchase: "purchaseDiscount",
            stockallownegative: "stockAllowNegative",
            stocknegatifautorise: "stockAllowNegative",
            stockblockinsufficient: "stockBlockInsufficient",
            blockinsufficient: "stockBlockInsufficient",
            stockalertenabled: "stockAlertEnabled",
            alertestock: "stockAlertEnabled",
            stockmin: "stockMin",
            stockminimum: "stockMin",
            stockmax: "stockMax",
            stockmaximum: "stockMax",
            stockdepotsjson: "stockDepotsJson",
            stockdepots: "stockDepotsJson",
            depotsjson: "stockDepotsJson",
            ajouterfodec: "fodecEnabled",
            ajoutfodec: "fodecEnabled",
            fodecenabled: "fodecEnabled",
            fodecactive: "fodecEnabled",
            fodecactif: "fodecEnabled",
            fodecv: "fodecEnabled",
            fodecvente: "fodecEnabled",
            fodecsale: "fodecEnabled",
            fodec: "fodecEnabled",
            taux: "fodecRate",
            tauxfodec: "fodecRate",
            tauxfodecv: "fodecRate",
            fodecrate: "fodecRate",
            fodectva: "fodecTva",
            tvafodec: "fodecTva",
            tvafodecv: "fodecTva",
            ajouterfodecachat: "purchaseFodecEnabled",
            ajoutfodecachat: "purchaseFodecEnabled",
            fodecachatenabled: "purchaseFodecEnabled",
            fodeca: "purchaseFodecEnabled",
            fodecachat: "purchaseFodecEnabled",
            fodecpurchase: "purchaseFodecEnabled",
            tauxfodeca: "purchaseFodecRate",
            fodecachattaux: "purchaseFodecRate",
            purchasefodecrate: "purchaseFodecRate",
            tvafodeca: "purchaseFodecTva",
            fodecachattva: "purchaseFodecTva",
            tvafodecachat: "purchaseFodecTva",
            purchasefodectva: "purchaseFodecTva"
          };
          resolveArticleImportField = (header) => {
            const key = normalizeImportHeaderKey(header);
            if (!key) return "";
            const labelDefaults = resolveArticleFieldLabelDefaults();
            for (const fieldKey of Object.keys(labelDefaults)) {
              const rawLabel =
                typeof articleFieldLabels?.[fieldKey] === "string" ? articleFieldLabels[fieldKey].trim() : "";
              const candidate = rawLabel || labelDefaults[fieldKey] || "";
              if (!candidate) continue;
              if (normalizeImportHeaderKey(candidate) === key) {
                if (fieldKey === "fodecSale" || fieldKey === "fodec" || fieldKey === "fodecAmount") {
                  return "fodecEnabled";
                }
                if (fieldKey === "fodecPurchase" || fieldKey === "purchaseFodecAmount") {
                  return "purchaseFodecEnabled";
                }
                return fieldKey;
              }
            }
            if (ARTICLE_IMPORT_HEADER_MAP[key]) return ARTICLE_IMPORT_HEADER_MAP[key];
            const hasFodec = key.includes("fodec");
            const isPurchaseFodecKey =
              key.includes("fodeca") ||
              key.includes("fodecachat") ||
              key.includes("fodecpurchase") ||
              (hasFodec && (key.includes("achat") || key.includes("purchase")));
            const isSalesFodecKey =
              key.includes("fodecv") ||
              key.includes("fodecvente") ||
              key.includes("fodecsale") ||
              (hasFodec && (key.includes("vente") || key.includes("sale")));
            if (hasFodec && key.includes("tva")) return isPurchaseFodecKey ? "purchaseFodecTva" : "fodecTva";
            if (key.includes("ajouter") && hasFodec) {
              return isPurchaseFodecKey ? "purchaseFodecEnabled" : "fodecEnabled";
            }
            if (hasFodec && (key.includes("taux") || key.includes("rate"))) {
              return isPurchaseFodecKey ? "purchaseFodecRate" : "fodecRate";
            }
            if (hasFodec) {
              if (isPurchaseFodecKey) return "purchaseFodecEnabled";
              if (isSalesFodecKey) return "fodecEnabled";
              return "fodecEnabled";
            }
            if (key === "taux") return "fodecRate";
            if (key.includes("ref")) return "ref";
            if (key.includes("designation") || key.includes("produit") || key.includes("product")) return "product";
            if (key.includes("desc")) return "desc";
            if (key.includes("unite") || key.includes("unit")) return "unit";
            if ((key.includes("stock") || key.includes("depot")) && key.includes("json")) return "stockDepotsJson";
            if (key.includes("stock") && (key.includes("allow") || key.includes("negatif"))) return "stockAllowNegative";
            if ((key.includes("stock") || key.includes("sortie")) && key.includes("insuff")) return "stockBlockInsufficient";
            if ((key.includes("stock") || key.includes("alert")) && key.includes("alert")) return "stockAlertEnabled";
            if (key.includes("stockmin")) return "stockMin";
            if (key.includes("stockmax")) return "stockMax";
            if (key.includes("stock") || key.includes("quantite") || key.includes("qty") || key.includes("qte")) return "stockQty";
            if (key.includes("achat") || key.includes("purchase")) {
              if (key.includes("remise") || key.includes("discount") || key.includes("reduction")) {
                return "purchaseDiscount";
              }
              if (key.includes("tva") || key.includes("tax")) return "purchaseTva";
              if (key.includes("prix") || key.includes("price") || key.includes("unitaire") || key === "pu") {
                return "purchasePrice";
              }
            }
            if (key.includes("prix") || key.includes("price") || key.includes("unitaire") || key === "pu") return "price";
            if (key.includes("tva") || key.includes("tax")) return "tva";
            if ((key.includes("remise") || key.includes("discount") || key.includes("reduction")) && (key.includes("achat") || key.includes("purchase"))) {
              return "purchaseDiscount";
            }
            if (key.includes("remise") || key.includes("discount") || key.includes("reduction")) return "discount";
            return "";
          };
          findArticleImportHeader = (rows = []) => {
            let headerIndex = -1;
            let headerFields = [];
            let bestScore = 0;
            for (let i = 0; i < rows.length; i += 1) {
              const row = rows[i];
              if (!Array.isArray(row)) continue;
              if (!row.some((cell) => String(cell ?? "").trim().length > 0)) continue;
              const fields = row.map((cell) => resolveArticleImportField(cell));
              const score = fields.filter(Boolean).length;
              if (score > bestScore) {
                bestScore = score;
                headerIndex = i;
                headerFields = fields;
              }
            }
            return { index: headerIndex, fields: headerFields, score: bestScore };
          };
          normalizeArticleImportNumber = (value, fallback = null) => {
            const raw = String(value ?? "").trim();
            if (!raw) return fallback;
            const cleaned = raw.replace(/%/g, "").replace(/\s+/g, "");
            const normalized = cleaned.replace(",", ".");
            const num = Number(normalized);
            return Number.isFinite(num) ? num : fallback;
          };
          normalizeArticleImportBool = (value) => {
            const raw = String(value ?? "").trim().toLowerCase();
            if (!raw) return null;
            if (["1", "true", "vrai", "oui", "yes", "y", "x"].includes(raw)) return true;
            if (["0", "false", "faux", "non", "no", "n"].includes(raw)) return false;
            const numeric = Number(raw.replace(",", "."));
            if (Number.isFinite(numeric)) return numeric > 0;
            return null;
          };
          getArticleImportDedupeKey = (article = {}) => {
            const refKey = normalizeImportHeaderKey(article.ref || "");
            if (refKey) return refKey;
            const productKey = normalizeImportHeaderKey(article.product || "");
            if (productKey) return productKey;
            const descKey = normalizeImportHeaderKey(article.desc || "");
            return descKey;
          };
          getArticleImportDedupeKeyFromRecord = (record = {}) => {
            const source =
              record?.article && typeof record.article === "object"
                ? record.article
                : record || {};
            return getArticleImportDedupeKey(source);
          };
          getArticleImportFieldValue = (article = {}, field = "") => {
            const key = normalizeImportHeaderKey(field);
            if (!key) return "";
            if (key.includes("ref")) return article.ref || "";
            if (key.includes("designation") || key.includes("produit") || key.includes("product") || key.includes("name")) {
              return article.product || "";
            }
            if (key.includes("desc")) return article.desc || "";
            return "";
          };
          detectImportDelimiter = (line = "") => {
            const candidates = [
              { char: ";", count: (line.match(/;/g) || []).length },
              { char: ",", count: (line.match(/,/g) || []).length },
              { char: "\t", count: (line.match(/\t/g) || []).length }
            ];
            candidates.sort((a, b) => b.count - a.count);
            return candidates[0].count > 0 ? candidates[0].char : ";";
          };
          parseImportDelimitedRows = (text, delimiter) => {
            const rows = [];
            let row = [];
            let value = "";
            let inQuotes = false;
            const pushValue = () => {
              row.push(value);
              value = "";
            };
            for (let i = 0; i < text.length; i += 1) {
              const char = text[i];
              if (inQuotes) {
                if (char === "\"") {
                  if (text[i + 1] === "\"") {
                    value += "\"";
                    i += 1;
                  } else {
                    inQuotes = false;
                  }
                } else {
                  value += char;
                }
                continue;
              }
              if (char === "\"") {
                inQuotes = true;
                continue;
              }
              if (char === delimiter) {
                pushValue();
                continue;
              }
              if (char === "\n") {
                pushValue();
                rows.push(row);
                row = [];
                continue;
              }
              if (char === "\r") {
                continue;
              }
              value += char;
            }
            if (value.length || row.length) {
              row.push(value);
              rows.push(row);
            }
            return rows;
          };
          parseImportCsvRows = (text) => {
            const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const firstLine = normalized.split("\n").find((line) => line.trim().length > 0) || "";
            const delimiter = detectImportDelimiter(firstLine);
            return parseImportDelimitedRows(normalized, delimiter).filter((row) =>
              row.some((cell) => String(cell ?? "").trim().length > 0)
            );
          };
          parseClientImportRows = (rows = []) => {
            const result = { items: [], errors: [], totalRows: 0 };
            if (!Array.isArray(rows) || !rows.length) {
              result.errors.push("Fichier vide ou illisible.");
              return result;
            }
            const headerIndex = rows.findIndex((row) =>
              Array.isArray(row) && row.some((cell) => String(cell ?? "").trim().length > 0)
            );
            const headerRow = headerIndex >= 0 ? rows[headerIndex] : [];
            const headerFields = headerRow.map((cell) => resolveImportField(cell));
            if (!headerFields.some(Boolean)) {
              result.errors.push(
                "Colonnes non reconnues. Utilisez: Nom, Matricule fiscal (ou CIN / passeport), Telephone, Email, Adresse, Type, Au profit de, Pour le compte de, Ref STEG."
              );
              return result;
            }
            const seen = new Map();
            for (let i = headerIndex + 1; i < rows.length; i += 1) {
              const row = rows[i] || [];
              if (!Array.isArray(row) || !row.some((cell) => String(cell ?? "").trim().length > 0)) {
                continue;
              }
              result.totalRows += 1;
              const data = {};
              headerFields.forEach((field, idx) => {
                if (!field) return;
                data[field] = normalizeClientImportValue(row[idx]);
              });
              const rawName = data.name || "";
              const rawBenefit = data.benefit || "";
              const rawAccount = data.account || "";
              const name = String(rawName || "").trim();
              const benefit = String(rawBenefit || "").trim();
              const account = String(rawAccount || "").trim();
              const identifier = data.vat || data.cin || data.passeport || "";
              if (!name && !identifier && !account) {
                result.errors.push(`Ligne ${i + 1}: nom ou identifiant ou Pour le compte de manquant.`);
                continue;
              }
              const clientType = normalizeClientImportType(data.type);
              const client = {
                type: clientType,
                name,
                phone: data.phone || "",
                email: data.email || "",
                address: data.address || "",
                benefit,
                account,
                stegRef: data.stegRef || ""
              };
              if (clientType === "particulier") {
                let cinValue = data.cin || "";
                let passeportValue = data.passeport || "";
                if (!cinValue && !passeportValue && data.vat) {
                  const rawIdentifier = String(data.vat || "").trim();
                  if (rawIdentifier) {
                    if (isLikelyCinValue(rawIdentifier)) {
                      cinValue = rawIdentifier;
                    } else {
                      passeportValue = rawIdentifier;
                    }
                  }
                }
                if (cinValue) client.cin = cinValue;
                if (passeportValue) client.passeport = passeportValue;
              } else {
                if (identifier) client.vat = identifier;
                if (data.cin) client.cin = data.cin;
                if (data.passeport) client.passeport = data.passeport;
              }
              const dedupeKey = getClientUniqueKey(client);
              if (dedupeKey && seen.has(dedupeKey)) {
                const existingIndex = seen.get(dedupeKey);
                result.items[existingIndex] = client;
                continue;
              }
              if (dedupeKey) seen.set(dedupeKey, result.items.length);
              result.items.push(client);
            }
            return result;
          };
          parseClientImportFile = async (file) => {
            if (!file) {
              return { items: [], errors: ["Aucun fichier selectionne."], totalRows: 0 };
            }
            const name = String(file.name || "");
            const lowerName = name.toLowerCase();
            if (lowerName.endsWith(".csv") || file.type === "text/csv") {
              const text = await file.text();
              return parseClientImportRows(parseImportCsvRows(text));
            }
            if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
              if (!w.XLSX) {
                return { items: [], errors: ["Lecture XLSX indisponible. Exportez le fichier au format CSV."], totalRows: 0 };
              }
              const buffer = await file.arrayBuffer();
              const workbook = w.XLSX.read(buffer, { type: "array" });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const rows = w.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
              return parseClientImportRows(rows);
            }
            const fallbackText = await file.text();
            return parseClientImportRows(parseImportCsvRows(fallbackText));
          };

          parseArticleImportRows = (rows = []) => {
            const result = { items: [], errors: [], totalRows: 0 };
            if (!Array.isArray(rows) || !rows.length) {
              result.errors.push("Fichier vide ou illisible.");
              return result;
            }
            const headerScan = findArticleImportHeader(rows);
            const headerIndex = headerScan.index;
            const headerFields = headerScan.fields;
            if (headerIndex < 0 || !headerFields.some(Boolean)) {
              result.errors.push(
                "Colonnes non reconnues. Utilisez: Reference, Designation, Description, Unite, Stock, PU A. HT, TVA A., Remise A., P.U. HT, TVA, Remise, options stock (Allow/Block/Alerte/Min/Max), StockDepotsJson, FODEC V., Taux FODEC V., TVA FODEC V., FODEC A., Taux FODEC A., TVA FODEC A."
              );
              return result;
            }
            const seen = new Map();
            for (let i = headerIndex + 1; i < rows.length; i += 1) {
              const row = rows[i] || [];
              if (!Array.isArray(row) || !row.some((cell) => String(cell ?? "").trim().length > 0)) {
                continue;
              }
              result.totalRows += 1;
              const data = {};
              headerFields.forEach((field, idx) => {
                if (!field) return;
                data[field] = normalizeImportValue(row[idx]);
              });
              const ref = data.ref || "";
              const product = data.product || "";
              const desc = data.desc || "";
              if (!ref && !product && !desc) {
                result.errors.push(`Ligne ${i + 1}: reference, designation ou description manquante.`);
                continue;
              }
              const stockQty = normalizeArticleImportNumber(data.stockQty, 0);
              const purchasePrice = normalizeArticleImportNumber(data.purchasePrice, 0);
              const purchaseTva = normalizeArticleImportNumber(data.purchaseTva, 19);
              const purchaseDiscount = normalizeArticleImportNumber(data.purchaseDiscount, null);
              const price = normalizeArticleImportNumber(data.price, 0);
              const tva = normalizeArticleImportNumber(data.tva, 19);
              const discount = normalizeArticleImportNumber(data.discount, 0);
              const stockAllowNegative = normalizeArticleImportBool(data.stockAllowNegative);
              const stockBlockInsufficient = normalizeArticleImportBool(data.stockBlockInsufficient);
              const stockAlertEnabled = normalizeArticleImportBool(data.stockAlertEnabled ?? data.stockAlert);
              const stockMin = normalizeArticleImportNumber(data.stockMin, null);
              const stockMax = normalizeArticleImportNumber(data.stockMax, null);
              const stockDepotsJsonRaw = normalizeImportValue(data.stockDepotsJson);
              let stockDepotsPayload = null;
              if (stockDepotsJsonRaw) {
                try {
                  stockDepotsPayload = JSON.parse(stockDepotsJsonRaw);
                } catch {
                  result.errors.push(`Ligne ${i + 1}: StockDepotsJson invalide (JSON attendu).`);
                  continue;
                }
                const isValidPayload =
                  Array.isArray(stockDepotsPayload) ||
                  (stockDepotsPayload && typeof stockDepotsPayload === "object");
                if (!isValidPayload) {
                  result.errors.push(`Ligne ${i + 1}: StockDepotsJson invalide (objet ou tableau attendu).`);
                  continue;
                }
              }
              const fodecRate = normalizeArticleImportNumber(data.fodecRate, null);
              const fodecTva = normalizeArticleImportNumber(data.fodecTva, null);
              const fodecEnabled = normalizeArticleImportBool(data.fodecEnabled);
              const purchaseFodecRate = normalizeArticleImportNumber(data.purchaseFodecRate, null);
              const purchaseFodecTva = normalizeArticleImportNumber(data.purchaseFodecTva, null);
              const purchaseFodecEnabled = normalizeArticleImportBool(data.purchaseFodecEnabled);
              const article = {
                ref,
                product,
                desc,
                unit: data.unit || "",
                stockQty: Number.isFinite(stockQty) ? stockQty : 0,
                purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
                purchaseTva: Number.isFinite(purchaseTva) ? purchaseTva : 19,
                purchaseDiscount: Number.isFinite(purchaseDiscount)
                  ? purchaseDiscount
                  : Number.isFinite(discount)
                  ? discount
                  : 0,
                price: Number.isFinite(price) ? price : 0,
                tva: Number.isFinite(tva) ? tva : 19,
                discount: Number.isFinite(discount) ? discount : 0
              };
              if (stockAllowNegative !== null || stockBlockInsufficient !== null || stockAlertEnabled !== null) {
                const allowNegative = stockAllowNegative === true;
                const blockInsufficient =
                  allowNegative
                    ? false
                    : stockBlockInsufficient === null
                    ? true
                    : stockBlockInsufficient === true;
                article.stockManagement = {
                  ...(article.stockManagement && typeof article.stockManagement === "object"
                    ? article.stockManagement
                    : {}),
                  allowNegative,
                  blockInsufficient,
                  alertEnabled: stockAlertEnabled === true
                };
              }
              if (Number.isFinite(stockMin)) {
                article.stockMin = stockMin;
                article.stockManagement = {
                  ...(article.stockManagement && typeof article.stockManagement === "object"
                    ? article.stockManagement
                    : {}),
                  min: stockMin
                };
              }
              if (Number.isFinite(stockMax)) {
                article.stockMax = stockMax;
                article.stockManagement = {
                  ...(article.stockManagement && typeof article.stockManagement === "object"
                    ? article.stockManagement
                    : {}),
                  max: stockMax
                };
              }
              if (stockAlertEnabled !== null) {
                article.stockAlert = stockAlertEnabled === true;
              }
              if (stockDepotsPayload) {
                if (Array.isArray(stockDepotsPayload)) {
                  article.depots = stockDepotsPayload;
                } else {
                  const payloadTabs = Array.isArray(stockDepotsPayload.tabs)
                    ? stockDepotsPayload.tabs
                    : Array.isArray(stockDepotsPayload.depots)
                    ? stockDepotsPayload.depots
                    : [];
                  article.depots = payloadTabs;
                  const payloadActiveDepotId =
                    stockDepotsPayload.activeTabId ||
                    stockDepotsPayload.activeDepotId ||
                    stockDepotsPayload.selectedDepotId ||
                    "";
                  if (payloadActiveDepotId) {
                    article.activeDepotId = String(payloadActiveDepotId || "").trim();
                    article.selectedDepotId = String(payloadActiveDepotId || "").trim();
                  }
                  const payloadCustomized =
                    stockDepotsPayload.customized ??
                    stockDepotsPayload.depotStockCustomized ??
                    stockDepotsPayload.stockCustomized;
                  if (payloadCustomized !== undefined) {
                    const customized = !!payloadCustomized;
                    article.depotStockCustomized = customized;
                    article.stockManagement = {
                      ...(article.stockManagement && typeof article.stockManagement === "object"
                        ? article.stockManagement
                        : {}),
                      depotStockCustomized: customized
                    };
                  }
                }
              }
              if (fodecEnabled === true) {
                const resolvedFodecRate = Number.isFinite(fodecRate) ? fodecRate : 0;
                const resolvedFodecTva = Number.isFinite(fodecTva) ? fodecTva : 0;
                article.fodec = {
                  enabled: true,
                  label: "FODEC",
                  rate: resolvedFodecRate,
                  tva: resolvedFodecTva
                };
              }
              if (purchaseFodecEnabled === true) {
                const resolvedPurchaseFodecRate = Number.isFinite(purchaseFodecRate)
                  ? purchaseFodecRate
                  : 0;
                const resolvedPurchaseFodecTva = Number.isFinite(purchaseFodecTva)
                  ? purchaseFodecTva
                  : 0;
                article.purchaseFodec = {
                  enabled: true,
                  label: "FODEC ACHAT",
                  rate: resolvedPurchaseFodecRate,
                  tva: resolvedPurchaseFodecTva
                };
              }
              const dedupeKey = getArticleImportDedupeKey(article);
              if (dedupeKey && seen.has(dedupeKey)) {
                const existingIndex = seen.get(dedupeKey);
                result.items[existingIndex] = article;
                continue;
              }
              if (dedupeKey) seen.set(dedupeKey, result.items.length);
              result.items.push(article);
            }
            return result;
          };

          parseArticleImportFile = async (file) => {
            if (!file) {
              return { items: [], errors: ["Aucun fichier selectionne."], totalRows: 0 };
            }
            const name = String(file.name || "");
            const lowerName = name.toLowerCase();
            if (lowerName.endsWith(".csv") || file.type === "text/csv") {
              const text = await file.text();
              return parseArticleImportRows(parseImportCsvRows(text));
            }
            if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
              if (!w.XLSX) {
                return { items: [], errors: ["Lecture XLSX indisponible. Exportez le fichier au format CSV."], totalRows: 0 };
              }
              const buffer = await file.arrayBuffer();
              const workbook = w.XLSX.read(buffer, { type: "array" });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const rows = w.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
              return parseArticleImportRows(rows);
            }
            const fallbackText = await file.text();
            return parseArticleImportRows(parseImportCsvRows(fallbackText));
          };
          fetchExistingArticlesByKey = async () => {
            const existing = new Map();
            if (!window.electronAPI?.searchArticles) return existing;
            try {
              const res = await window.electronAPI.searchArticles({
                query: ""
              });
              if (!res?.ok) return existing;
              const results = Array.isArray(res.results) ? res.results : [];
              results.forEach((record) => {
                const key = getArticleImportDedupeKeyFromRecord(record);
                if (!key) return;
                const list = existing.get(key) || [];
                list.push(record);
                existing.set(key, list);
              });
            } catch (err) {
              console.warn("article import existing lookup failed", err);
            }
            return existing;
          };
          deleteExistingArticlesByKey = async (dedupeKey, existingByKey, rowIndex, saveErrors, excludePath = "") => {
            if (!dedupeKey || !window.electronAPI?.deleteArticle) return 0;
            const matches = existingByKey.get(dedupeKey) || [];
            if (!matches.length) return 0;
            let deleted = 0;
            const remaining = [];
            for (const match of matches) {
              const path = match?.path || "";
              if (!path) continue;
              if (excludePath && path === excludePath) {
                remaining.push(match);
                continue;
              }
              try {
                const delRes = await window.electronAPI.deleteArticle({ path });
                if (!delRes?.ok) {
                  saveErrors.push(`Ligne ${rowIndex + 1}: suppression de l'ancien article impossible.`);
                  remaining.push(match);
                } else {
                  deleted += 1;
                }
              } catch (err) {
                console.error("article import delete", err);
                saveErrors.push(`Ligne ${rowIndex + 1}: suppression de l'ancien article impossible.`);
                remaining.push(match);
              }
            }
            if (remaining.length) existingByKey.set(dedupeKey, remaining);
            else existingByKey.delete(dedupeKey);
            return deleted;
          };
          deleteExistingArticlesByConflict = async (
            conflictField,
            conflictValue,
            rowIndex,
            saveErrors,
            existingByKey
          ) => {
            const field = String(conflictField || "").trim();
            const value = String(conflictValue || "").trim();
            if (!field || !value) return 0;
            if (!window.electronAPI?.searchArticles || !window.electronAPI?.deleteArticle) return 0;
            let res = null;
            try {
              res = await window.electronAPI.searchArticles({
                query: value
              });
            } catch (err) {
              console.warn("article import conflict search failed", err);
              return 0;
            }
            if (!res?.ok) return 0;
            const expectedKey = normalizeImportHeaderKey(value);
            if (!expectedKey) return 0;
            const results = Array.isArray(res.results) ? res.results : [];
            const matches = results.filter((record) => {
              const article = record?.article && typeof record.article === "object" ? record.article : record || {};
              const fieldValue = getArticleImportFieldValue(article, field);
              const fieldKey = normalizeImportHeaderKey(fieldValue);
              if (fieldKey && fieldKey === expectedKey) return true;
              const refKey = normalizeImportHeaderKey(article.ref || "");
              const productKey = normalizeImportHeaderKey(article.product || "");
              const descKey = normalizeImportHeaderKey(article.desc || "");
              return refKey === expectedKey || productKey === expectedKey || descKey === expectedKey;
            });
            if (!matches.length) return 0;
            let deleted = 0;
            for (const match of matches) {
              const path = match?.path || "";
              if (!path) continue;
              try {
                const delRes = await window.electronAPI.deleteArticle({ path });
                if (!delRes?.ok) {
                  saveErrors.push(`Ligne ${rowIndex + 1}: suppression de l'ancien article impossible.`);
                } else {
                  deleted += 1;
                  if (existingByKey) {
                    const key = getArticleImportDedupeKeyFromRecord(match);
                    if (key) {
                      const list = existingByKey.get(key) || [];
                      const next = list.filter((item) => item?.path && item.path !== path);
                      if (next.length) existingByKey.set(key, next);
                      else existingByKey.delete(key);
                    }
                  }
                }
              } catch (err) {
                console.error("article import delete", err);
                saveErrors.push(`Ligne ${rowIndex + 1}: suppression de l'ancien article impossible.`);
              }
            }
            return deleted;
          };

          onClientImportModalKeyDown = (evt) => {
            if (evt.key === "Escape") {
              evt.preventDefault();
              closeClientImportModal();
            }
          };

          openClientImportModal = () => {
            if (!clientImportModal) return;
            clientImportModalRestoreFocus =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            resetClientImportState();
            applyClientImportModalLabels(clientImportModalState.entityType);
            clientImportModal.hidden = false;
            clientImportModal.removeAttribute("hidden");
            clientImportModal.setAttribute("aria-hidden", "false");
            clientImportModal.classList.add("is-open");
            document.addEventListener("keydown", onClientImportModalKeyDown);
            if (clientImportFileInput && typeof clientImportFileInput.focus === "function") {
              try {
                clientImportFileInput.focus({ preventScroll: true });
              } catch {
                try {
                  clientImportFileInput.focus();
                } catch {}
              }
            }
          };

          closeClientImportModal = () => {
            if (!clientImportModal || clientImportModalState.busy) return;
            clientImportModal.classList.remove("is-open");
            clientImportModal.hidden = true;
            clientImportModal.setAttribute("hidden", "");
            clientImportModal.setAttribute("aria-hidden", "true");
            document.removeEventListener("keydown", onClientImportModalKeyDown);
            if (clientImportModalRestoreFocus && typeof clientImportModalRestoreFocus.focus === "function") {
              try {
                clientImportModalRestoreFocus.focus();
              } catch {}
            }
          };

          handleClientImportFileChange = async (file) => {
            clientImportModalState.items = [];
            clientImportModalState.errors = [];
            clientImportModalState.totalRows = 0;
            clientImportModalState.fileName = file?.name || "";
            renderClientImportSummary();
            renderClientImportErrors();
            if (!file) {
              setClientImportBusy(false);
              return;
            }
            setClientImportBusy(true);
            if (clientImportSummary) {
              clientImportSummary.textContent = "Lecture du fichier...";
              clientImportSummary.hidden = false;
            }
            try {
              const parsed = await parseClientImportFile(file);
              clientImportModalState.items = parsed.items || [];
              clientImportModalState.errors = parsed.errors || [];
              clientImportModalState.totalRows = parsed.totalRows || 0;
            } catch (err) {
              console.error("client import parse", err);
              clientImportModalState.items = [];
              clientImportModalState.errors = ["Impossible de lire ce fichier."];
              clientImportModalState.totalRows = 0;
            } finally {
              renderClientImportSummary();
              renderClientImportErrors();
              setClientImportBusy(false);
            }
          };

          fetchExistingClientsByKey = async (entityType) => {
            const existing = new Map();
            if (!window.electronAPI?.searchClients) return existing;
            const limit = 100;
            let offset = 0;
            let total = null;
            while (true) {
              const res = await window.electronAPI.searchClients({ query: "", limit, offset, entityType });
              if (!res?.ok) break;
              const results = Array.isArray(res.results) ? res.results : [];
              results.forEach((record) => {
                const key = getClientUniqueKeyFromRecord(record);
                if (!key) return;
                const list = existing.get(key) || [];
                list.push(record);
                existing.set(key, list);
              });
              const resTotal = Number(res.total);
              if (Number.isFinite(resTotal)) {
                total = resTotal;
              }
              offset += results.length;
              if (results.length < limit) break;
              if (total !== null && offset >= total) break;
            }
            return existing;
          };

          handleClientImportSave = async () => {
            if (clientImportModalState.busy || !clientImportModalState.items.length) return;
            if (!window.electronAPI?.saveClientDirect) {
              const featureUnavailable = getMessage("FEATURE_UNAVAILABLE");
              await showDialog?.(featureUnavailable.text, { title: featureUnavailable.title });
              return;
            }
            setClientImportBusy(true);
            const entityType = clientImportModalState.entityType || "client";
            let existingClientsByKey = new Map();
            if (window.electronAPI?.deleteClient || window.electronAPI?.updateClientDirect) {
              try {
                existingClientsByKey = await fetchExistingClientsByKey(entityType);
              } catch (err) {
                console.warn("client import existing lookup failed", err);
              }
            }
            if (window.electronAPI?.ensureClientsSystemFolder) {
              try {
                const ensured = await window.electronAPI.ensureClientsSystemFolder({ entityType });
                if (!ensured?.ok) {
                  const folderErrorMessage = getMessage("CLIENT_FOLDER_ADMIN_ERROR");
                  await showDialog?.(ensured?.message || folderErrorMessage.text, { title: folderErrorMessage.title });
                  setClientImportBusy(false);
                  return;
                }
                if (ensured?.fallback && ensured?.message && !clientImportFolderFallbackWarned) {
                  const infoMessage = getMessage("GENERIC_INFO");
                  await showDialog?.(ensured.message, { title: infoMessage.title });
                  clientImportFolderFallbackWarned = true;
                }
              } catch (err) {
                console.error(err);
                const genericFolderError = getMessage("CLIENT_FOLDER_GENERIC_ERROR");
                await showDialog?.(genericFolderError.text, { title: genericFolderError.title });
                setClientImportBusy(false);
                return;
              }
            }
            let savedCount = 0;
            let failedCount = 0;
            const saveErrors = [];
            for (let i = 0; i < clientImportModalState.items.length; i += 1) {
              const client = clientImportModalState.items[i];
              const dedupeKey = getClientUniqueKey(client);
              const suggested =
                SEM.forms?.pickSuggestedClientName?.(client) ||
                client.name ||
                client.vat ||
                client.email ||
                client.phone ||
                "client";
              try {
                const matches = dedupeKey ? existingClientsByKey.get(dedupeKey) || [] : [];
                const primaryMatch = matches.find((match) => match?.path);
                if (primaryMatch?.path && window.electronAPI?.updateClientDirect) {
                  const res = await window.electronAPI.updateClientDirect({
                    client,
                    path: primaryMatch.path,
                    suggestedName: suggested,
                    entityType
                  });
                  if (res?.ok) {
                    savedCount += 1;
                    if (window.electronAPI?.deleteClient && matches.length > 1) {
                      for (const match of matches) {
                        if (!match?.path || match.path === primaryMatch.path) continue;
                        try {
                          const delRes = await window.electronAPI.deleteClient({
                            path: match.path,
                            entityType
                          });
                          if (!delRes?.ok) {
                            saveErrors.push(`Ligne ${i + 1}: suppression de l'ancien client impossible.`);
                          }
                        } catch (err) {
                          console.error("client import delete", err);
                          saveErrors.push(`Ligne ${i + 1}: suppression de l'ancien client impossible.`);
                        }
                      }
                    }
                    existingClientsByKey.set(dedupeKey, [
                      { path: res.path || primaryMatch.path, client }
                    ]);
                    continue;
                  }
                  if (!res?.canceled) {
                    failedCount += 1;
                    const msg = res?.error || res?.message || "Echec de la mise a jour.";
                    saveErrors.push(`Ligne ${i + 1}: ${msg}`);
                  }
                  continue;
                }

                const res = await window.electronAPI.saveClientDirect({
                  client,
                  suggestedName: suggested,
                  entityType
                });
                if (res?.ok) {
                  savedCount += 1;
                  if (dedupeKey && window.electronAPI?.deleteClient) {
                    const matchesAfterSave = existingClientsByKey.get(dedupeKey) || [];
                    if (matchesAfterSave.length) {
                      for (const match of matchesAfterSave) {
                        if (!match?.path) continue;
                        try {
                          const delRes = await window.electronAPI.deleteClient({
                            path: match.path,
                            entityType
                          });
                          if (!delRes?.ok) {
                            saveErrors.push(`Ligne ${i + 1}: suppression de l'ancien client impossible.`);
                          }
                        } catch (err) {
                          console.error("client import delete", err);
                          saveErrors.push(`Ligne ${i + 1}: suppression de l'ancien client impossible.`);
                        }
                      }
                    }
                    existingClientsByKey.set(dedupeKey, [{ path: res.path, client }]);
                  }
                } else if (!res?.canceled) {
                  failedCount += 1;
                  const msg = res?.error || res?.message || "Echec de l'enregistrement.";
                  saveErrors.push(`Ligne ${i + 1}: ${msg}`);
                }
              } catch (err) {
                failedCount += 1;
                saveErrors.push(`Ligne ${i + 1}: erreur inattendue.`);
              }
            }
            if (saveErrors.length) {
              clientImportModalState.errors = [...clientImportModalState.errors, ...saveErrors];
            }
            clientImportModalState.items = [];
            renderClientImportErrors();
            const labels = getClientImportModalLabels(entityType);
            const resultText = `${savedCount} ${labels.plural} enregistre${savedCount > 1 ? "s" : ""}.` +
              (failedCount ? ` ${failedCount} echec${failedCount > 1 ? "s" : ""}.` : "");
            if (clientImportSummary) {
              clientImportSummary.textContent = resultText;
              clientImportSummary.hidden = false;
            }
            if (savedCount > 0 && typeof w.showToast === "function") {
              w.showToast(resultText);
            }
            setClientImportBusy(false);
          };

          document.addEventListener("click", (evt) => {
            const trigger = evt.target?.closest?.(clientImportBtnSelector);
            if (!trigger || !clientImportModal) return;
            const scope = trigger.closest(CLIENT_SCOPE_SELECTOR);
            let entityType = resolveClientEntityType(scope);
            if (!scope && trigger.closest("#fournisseurSavedModal, #fournisseurSavedModalNv, #clientSavedModal, #clientSavedModalNv")) {
              entityType = clientSavedModalEntityType || "client";
            }
            clientImportModalState.entityType = entityType;
            if (clientImportModal.classList.contains("is-open")) {
              applyClientImportModalLabels(clientImportModalState.entityType);
              return;
            }
            openClientImportModal();
          });

          clientImportModalClose?.addEventListener("click", closeClientImportModal);
          clientImportModalCancel?.addEventListener("click", closeClientImportModal);
          clientImportModalSave?.addEventListener("click", handleClientImportSave);
          clientImportFileInput?.addEventListener("change", (evt) => {
            const file = evt.target?.files?.[0] || null;
            handleClientImportFileChange(file);
          });
          if (clientImportModal) {
            clientImportModal.addEventListener("click", handleClientImportCopy);
            clientImportModal.addEventListener("keydown", handleClientImportCopyKeydown);
            clientImportModal.addEventListener("click", (evt) => {
              if (evt.target === clientImportModal) evt.stopPropagation();
            });
          }

          onArticleImportModalKeyDown = (evt) => {
            if (evt.key === "Escape") {
              evt.preventDefault();
              closeArticleImportModal();
            }
          };

          openArticleImportModal = () => {
            if (!articleImportModal) return;
            articleImportModalRestoreFocus =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            resetArticleImportState();
            if (articleImportHint) {
              articleImportHint.textContent =
                "Selectionnez un fichier Excel (XLSX) ou CSV contenant plusieurs articles. " +
                "Colonnes acceptees : Reference, Designation, Description, Unite, Stock, PU A. HT, TVA A., Remise A., P.U. HT, TVA, Remise, Autoriser stock negatif, Bloquer sortie stock insuffisant, Alerte stock, Stock minimum, Stock maximum, Stock Depots JSON, FODEC V., Taux FODEC V., TVA FODEC V., FODEC A., Taux FODEC A., TVA FODEC A.";
            }
            updateArticleImportExampleVisibility(articleFieldVisibility);
            updateArticleImportCopyHeaders(articleFieldVisibility);
            articleImportModal.hidden = false;
            articleImportModal.removeAttribute("hidden");
            articleImportModal.setAttribute("aria-hidden", "false");
            articleImportModal.classList.add("is-open");
            document.addEventListener("keydown", onArticleImportModalKeyDown);
            if (articleImportFileInput && typeof articleImportFileInput.focus === "function") {
              try {
                articleImportFileInput.focus({ preventScroll: true });
              } catch {
                try {
                  articleImportFileInput.focus();
                } catch {}
              }
            }
          };

          closeArticleImportModal = () => {
            if (!articleImportModal || articleImportModalState.busy) return;
            articleImportModal.classList.remove("is-open");
            articleImportModal.hidden = true;
            articleImportModal.setAttribute("hidden", "");
            articleImportModal.setAttribute("aria-hidden", "true");
            document.removeEventListener("keydown", onArticleImportModalKeyDown);
            if (articleImportModalRestoreFocus && typeof articleImportModalRestoreFocus.focus === "function") {
              try {
                articleImportModalRestoreFocus.focus();
              } catch {}
            }
          };
          ARTICLES_EXPORT_LIMIT = 500;
          ARTICLES_EXPORT_FORMAT_LABELS = {
            xlsx: "XLSX",
            csv: "CSV"
          };
          ARTICLES_EXPORT_OPEN_LOCATION_ID = "articlesExportOpenLocation";
          normalizeArticleExportText = (value) => String(value ?? "").trim();
          resolveArticlesExportLabels = () => {
            const defaults = resolveArticleFieldLabelDefaults();
            const labels = {};
            Object.keys(defaults).forEach((key) => {
              const raw = typeof articleFieldLabels?.[key] === "string" ? articleFieldLabels[key].trim() : "";
              labels[key] = raw || defaults[key] || "";
            });
            return labels;
          };
          resolveArticlesExportColumns = (visibility = articleFieldVisibility, labels = resolveArticlesExportLabels()) => {
            const columns = [];
            const resolveLabel = (key) => {
              switch (key) {
                case "fodec":
                  return labels.fodecSale || labels.fodec || "FODEC V.";
                case "purchaseDiscount":
                  return labels.purchaseDiscount || "Remise A.";
                case "stockAllowNegative":
                  return "Autoriser stock negatif";
                case "stockBlockInsufficient":
                  return "Bloquer sortie stock insuffisant";
                case "stockAlertEnabled":
                  return "Alerte stock";
                case "stockMin":
                  return "Stock minimum";
                case "stockMax":
                  return "Stock maximum";
                case "stockDepotsJson":
                  return "Stock Depots JSON";
                case "purchaseFodecEnabled":
                  return labels.fodecPurchase || labels.purchaseFodecAmount || "FODEC A.";
                case "purchaseFodecRate":
                  return labels.purchaseFodecRate || "Taux FODEC A.";
                case "purchaseFodecTva":
                  return labels.purchaseFodecTva || "TVA FODEC A.";
                default:
                  return labels[key] || "";
              }
            };
            const addColumn = (key) => {
              const label = resolveLabel(key);
              if (label) columns.push({ key, label });
            };
            const isVisible = (key) => isArticleImportExportFieldVisible(key, visibility);
            [
              "ref",
              "product",
              "desc",
              "unit",
              "stockQty",
              "purchasePrice",
              "purchaseTva",
              "purchaseDiscount",
              "price",
              "tva",
              "discount",
              "stockAllowNegative",
              "stockBlockInsufficient",
              "stockAlertEnabled",
              "stockMin",
              "stockMax",
              "stockDepotsJson",
              "fodec",
              "fodecRate",
              "fodecTva",
              "purchaseFodecEnabled",
              "purchaseFodecRate",
              "purchaseFodecTva"
            ].forEach((key) => {
              if (isVisible(key)) addColumn(key);
            });
            return columns;
          };
          normalizeDepotTabIdForExport = (value = "", fallback = 1) => {
            const match = String(value || "").trim().match(/^depot[-_\s]?(\d+)$/i);
            const parsed = Number(match?.[1] || fallback);
            const safe = Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : Math.max(1, Math.trunc(Number(fallback) || 1));
            return `depot-${safe}`;
          };
          buildStockDepotsJsonExportValue = (article = {}) => {
            const depots = Array.isArray(article?.depots) ? article.depots : [];
            if (!depots.length) return "";
            const tabs = depots
              .map((entry, index) => {
                const source = entry && typeof entry === "object" ? entry : {};
                const tabId = normalizeDepotTabIdForExport(
                  source.id || source.tabId || source.depotId || "",
                  index + 1
                );
                if (!tabId) return null;
                const row = {
                  id: tabId,
                  stockQty: Number.isFinite(Number(source.stockQty ?? source.stock_qty ?? source.qty))
                    ? Number(source.stockQty ?? source.stock_qty ?? source.qty)
                    : 0
                };
                const linkedDepotId = String(
                  source.linkedDepotId ??
                    source.depotDbId ??
                    source.magasinId ??
                    source.magasin_id ??
                    ""
                )
                  .trim()
                  .replace(/^sqlite:\/\/depots\//i, "");
                if (linkedDepotId) row.linkedDepotId = linkedDepotId;
                const selectedLocationIds = Array.isArray(source.selectedLocationIds)
                  ? source.selectedLocationIds.map((value) => String(value || "").trim()).filter(Boolean)
                  : [];
                const selectedEmplacementIds = Array.isArray(source.selectedEmplacementIds)
                  ? source.selectedEmplacementIds.map((value) => String(value || "").trim()).filter(Boolean)
                  : [];
                if (selectedLocationIds.length) row.selectedLocationIds = selectedLocationIds;
                if (selectedEmplacementIds.length) row.selectedEmplacementIds = selectedEmplacementIds;
                if (source.stockQtyCustomized) row.stockQtyCustomized = true;
                if (source.name) row.name = String(source.name || "").trim();
                if (source.createdAt) row.createdAt = String(source.createdAt || "").trim();
                return row;
              })
              .filter(Boolean);
            if (!tabs.length) return "";
            const activeDepotRaw =
              article?.activeDepotId ??
              article?.selectedDepotId ??
              article?.stockManagement?.activeDepotId ??
              article?.stockManagement?.selectedDepotId ??
              article?.stockManagement?.defaultDepot ??
              tabs[0]?.id ??
              "depot-1";
            const activeTabId = normalizeDepotTabIdForExport(activeDepotRaw, 1);
            const customized = !!(
              article?.depotStockCustomized ??
              article?.stockManagement?.depotStockCustomized ??
              tabs.some((entry) => !!entry.stockQtyCustomized)
            );
            try {
              return JSON.stringify({
                v: 1,
                activeTabId,
                customized,
                tabs
              });
            } catch {
              return "";
            }
          };
          resolveArticleExportValue = (article = {}, key = "") => {
            const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : "");
            const fodec = article?.fodec || {};
            const purchaseFodec = article?.purchaseFodec || {};
            const stockManagement =
              article?.stockManagement && typeof article.stockManagement === "object"
                ? article.stockManagement
                : {};
            const purchaseFodecEnabled =
              purchaseFodec?.enabled ?? article?.purchaseFodecEnabled ?? article?.purchase_fodec_enabled;
            switch (key) {
              case "ref":
                return normalizeArticleExportText(article.ref);
              case "product":
                return normalizeArticleExportText(article.product);
              case "desc":
                return normalizeArticleExportText(article.desc);
              case "unit":
                return normalizeArticleExportText(article.unit);
              case "stockQty":
                return num(article.stockQty);
              case "purchasePrice":
                return num(article.purchasePrice);
              case "purchaseTva":
                return num(article.purchaseTva);
              case "purchaseDiscount":
                return num(article.purchaseDiscount ?? article.discount);
              case "price":
                return num(article.price);
              case "tva":
                return num(article.tva);
              case "discount":
                return num(article.discount);
              case "stockAllowNegative":
                return stockManagement?.allowNegative ?? article?.allowNegative ? 1 : 0;
              case "stockBlockInsufficient":
                return !(stockManagement?.allowNegative ?? article?.allowNegative) &&
                  (stockManagement?.blockInsufficient ?? article?.blockInsufficient)
                  ? 1
                  : 0;
              case "stockAlertEnabled":
                return stockManagement?.alertEnabled ?? article?.stockAlertEnabled ?? article?.stockAlert ? 1 : 0;
              case "stockMin":
                return num(stockManagement?.min ?? article?.stockMin);
              case "stockMax": {
                const value = stockManagement?.max ?? article?.stockMax;
                return Number.isFinite(Number(value)) ? Number(value) : "";
              }
              case "stockDepotsJson":
                return buildStockDepotsJsonExportValue(article);
              case "fodec":
                return fodec?.enabled ? 1 : 0;
              case "fodecRate":
                return fodec?.enabled ? num(fodec.rate) : "";
              case "fodecTva":
                return fodec?.enabled ? num(fodec.tva) : "";
              case "purchaseFodecEnabled":
                return purchaseFodecEnabled ? 1 : 0;
              case "purchaseFodecRate":
                return purchaseFodecEnabled ? num(purchaseFodec.rate ?? article?.purchaseFodecRate) : "";
              case "purchaseFodecTva":
                return purchaseFodecEnabled ? num(purchaseFodec.tva ?? article?.purchaseFodecTva) : "";
              default:
                return "";
            }
          };
          buildArticlesExportRows = (records = [], visibility = articleFieldVisibility, labels = resolveArticlesExportLabels()) => {
            const columns = resolveArticlesExportColumns(visibility, labels);
            const headers = columns.map((column) => column.label);
            const rows = records.map((entry) => {
              const article = entry?.article || {};
              return columns.map((column) => resolveArticleExportValue(article, column.key));
            });
            return { headers, rows };
          };
          buildArticleExportSheet = (headers, rows) => {
            if (!w.XLSX) return null;
            return w.XLSX.utils.aoa_to_sheet([headers, ...rows]);
          };
          buildArticleExportWorkbook = (sheet) => {
            if (!w.XLSX || !sheet) return null;
            const workbook = w.XLSX.utils.book_new();
            w.XLSX.utils.book_append_sheet(workbook, sheet, "Articles");
            return workbook;
          };
          buildArticleExportCsv = (headers, rows) => {
            const escapeCsv = (value) => {
              const text = String(value ?? "");
              if (!text) return "";
              if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
              return text;
            };
            const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(","));
            return `${lines.join("\n")}\n`;
          };
          fetchAllArticlesForExport = async () => {
            if (!w.electronAPI?.searchArticles) return [];
            let offset = 0;
            let total = null;
            const all = [];
            while (true) {
              const res = await w.electronAPI.searchArticles({
                query: "",
                limit: ARTICLES_EXPORT_LIMIT,
                offset
              });
              if (res && res.ok === false) {
                throw new Error(res.error || "Export articles impossible.");
              }
              const results = Array.isArray(res?.results) ? res.results : [];
              if (total === null) total = Number(res?.total ?? results.length);
              all.push(...results);
              offset += results.length;
              if (!results.length || (Number.isFinite(total) && offset >= total)) break;
            }
            return all;
          };
          saveArticlesExportFile = async ({ format, xlsxData, csvData, baseName }) => {
            const ext = format === "csv" ? "csv" : "xlsx";
            if (w.electronAPI?.saveFile) {
              return await w.electronAPI.saveFile({
                title: "Exporter des articles",
                defaultPath: `${baseName}.${ext}`,
                filters: [
                  { name: "Fichier Excel", extensions: ["xlsx"] },
                  { name: "CSV", extensions: ["csv"] }
                ],
                data: { xlsx: xlsxData, csv: csvData }
              });
            }
            const blobData = ext === "csv" ? csvData : xlsxData;
            const fileName = `${baseName}.${ext}`;
            if (!blobData || !w.Blob) {
              throw new Error("Export articles indisponible.");
            }
            const blob =
              typeof blobData === "string"
                ? new Blob([blobData], { type: "text/csv;charset=utf-8" })
                : new Blob([blobData], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            return { ok: true, name: fileName };
          };
          renderArticlesExportSummary = () => {
            if (!articleExportModal) return;
            const summary =
              articleExportModal.querySelector("#articlesExportSummary") || getEl("articlesExportSummary");
            if (!summary) return;
            const locationText = w.electronAPI?.saveFile
              ? "Le fichier sera enregistre a l'emplacement choisi."
              : "Le fichier sera telecharge sur cet appareil.";
            summary.textContent = locationText;
          };
          setArticlesExportBusy = (isBusy) => {
            if (!articleExportModal) return;
            articleExportModal.setAttribute("aria-busy", isBusy ? "true" : "false");
            articleExportModal.querySelectorAll("button, select").forEach((el) => {
              const allowClose =
                el.id === "articlesExportModalCancel" || el.id === "articlesExportModalClose";
              el.disabled = isBusy && !allowClose;
            });
            const menu = articleExportModal.querySelector("#articlesExportFormatMenu");
            if (menu) menu.style.pointerEvents = isBusy ? "none" : "";
          };
          syncArticlesExportFormatUi = (value, { updateSelect = false, closeMenu = false } = {}) => {
            if (!articleExportModal) return "xlsx";
            const select = articleExportModal.querySelector("#articlesExportFormat");
            const display = articleExportModal.querySelector("#articlesExportFormatDisplay");
            const panel = articleExportModal.querySelector("#articlesExportFormatPanel");
            const menu = articleExportModal.querySelector("#articlesExportFormatMenu");
            let nextValue = value !== undefined ? String(value) : String(select?.value || "xlsx");
            if (!ARTICLES_EXPORT_FORMAT_LABELS[nextValue]) nextValue = "xlsx";
            if (updateSelect && select) select.value = nextValue;
            if (display) display.textContent = ARTICLES_EXPORT_FORMAT_LABELS[nextValue] || "XLSX";
            if (panel) {
              panel.querySelectorAll("[data-export-format-option]").forEach((btn) => {
                const isActive = String(btn.dataset.exportFormatOption || "") === nextValue;
                btn.classList.toggle("is-active", isActive);
                btn.setAttribute("aria-selected", isActive ? "true" : "false");
              });
            }
            if (closeMenu && menu) {
              menu.removeAttribute("open");
              menu.open = false;
              const summary = menu.querySelector(".field-toggle-trigger");
              if (summary) summary.setAttribute("aria-expanded", "false");
            }
            return nextValue;
          };
          exportArticles = async (format) => {
            if (!w.electronAPI?.searchArticles) {
              await w.showDialog?.("Export articles indisponible.", { title: "Export" });
              return null;
            }
            const records = await fetchAllArticlesForExport();
            if (!records.length) {
              await w.showDialog?.("Aucun article enregistre.", { title: "Export" });
              return null;
            }
            const visibility = articleFieldVisibility;
            const labels = resolveArticlesExportLabels();
            const { headers, rows } = buildArticlesExportRows(records, visibility, labels);
            if (!headers.length) {
              await w.showDialog?.("Aucune colonne active pour l'export.", { title: "Export" });
              return null;
            }
            if (format === "xlsx" && !w.XLSX) {
              throw new Error("Export XLSX indisponible. Choisissez le format CSV.");
            }
            const sheet = buildArticleExportSheet(headers, rows);
            const workbook = buildArticleExportWorkbook(sheet);
            const xlsxData =
              workbook && w.XLSX ? w.XLSX.write(workbook, { bookType: "xlsx", type: "array" }) : null;
            const csvData =
              sheet && w.XLSX ? w.XLSX.utils.sheet_to_csv(sheet) : buildArticleExportCsv(headers, rows);
            const baseName = "articles";
            return await saveArticlesExportFile({ format, xlsxData, csvData, baseName });
          };
          onArticleExportModalKeyDown = (evt) => {
            if (evt.key !== "Escape") return;
            evt.preventDefault();
            closeArticleExportModal();
          };
          openArticleExportModal = (trigger) => {
            if (!articleExportModal) return;
            articleExportModalRestoreFocus =
              trigger && trigger.focus
                ? trigger
                : document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
            updateArticlesExportExampleVisibility(articleFieldVisibility);
            articleExportModal.hidden = false;
            articleExportModal.removeAttribute("hidden");
            articleExportModal.setAttribute("aria-hidden", "false");
            articleExportModal.classList.add("is-open");
            document.addEventListener("keydown", onArticleExportModalKeyDown);
            const openLocation = articleExportModal.querySelector(`#${ARTICLES_EXPORT_OPEN_LOCATION_ID}`);
            if (openLocation) openLocation.checked = false;
            syncArticlesExportFormatUi("xlsx", { updateSelect: true, closeMenu: true });
            renderArticlesExportSummary();
            setArticlesExportBusy(false);
            if (articleExportModalSave && typeof articleExportModalSave.focus === "function") {
              try {
                articleExportModalSave.focus({ preventScroll: true });
              } catch {}
            }
          };
          closeArticleExportModal = () => {
            if (!articleExportModal) return;
            articleExportModal.classList.remove("is-open");
            articleExportModal.hidden = true;
            articleExportModal.setAttribute("hidden", "");
            articleExportModal.setAttribute("aria-hidden", "true");
            document.removeEventListener("keydown", onArticleExportModalKeyDown);
            if (articleExportModalRestoreFocus && typeof articleExportModalRestoreFocus.focus === "function") {
              try {
                articleExportModalRestoreFocus.focus();
              } catch {}
            }
          };

          handleArticleImportFileChange = async (file) => {
            articleImportModalState.items = [];
            articleImportModalState.errors = [];
            articleImportModalState.totalRows = 0;
            articleImportModalState.fileName = file?.name || "";
            renderArticleImportSummary();
            renderArticleImportErrors();
            if (!file) {
              setArticleImportBusy(false);
              return;
            }
            setArticleImportBusy(true);
            if (articleImportSummary) {
              articleImportSummary.textContent = "Lecture du fichier...";
              articleImportSummary.hidden = false;
            }
            try {
              const parsed = await parseArticleImportFile(file);
              articleImportModalState.items = parsed.items || [];
              articleImportModalState.errors = parsed.errors || [];
              articleImportModalState.totalRows = parsed.totalRows || 0;
            } catch (err) {
              console.error("article import parse", err);
              articleImportModalState.items = [];
              articleImportModalState.errors = ["Impossible de lire ce fichier."];
              articleImportModalState.totalRows = 0;
            } finally {
              renderArticleImportSummary();
              renderArticleImportErrors();
              setArticleImportBusy(false);
            }
          };

          handleArticleImportSave = async () => {
            if (articleImportModalState.busy || !articleImportModalState.items.length) return;
            if (!window.electronAPI?.saveArticleAuto) {
              const featureUnavailable = getMessage("FEATURE_UNAVAILABLE");
              await showDialog?.(featureUnavailable.text, { title: featureUnavailable.title });
              return;
            }
            setArticleImportBusy(true);
            let existingArticlesByKey = new Map();
            if (window.electronAPI?.deleteArticle) {
              existingArticlesByKey = await fetchExistingArticlesByKey();
            }
            let savedCount = 0;
            let failedCount = 0;
            const saveErrors = [];
            for (let i = 0; i < articleImportModalState.items.length; i += 1) {
              const article = articleImportModalState.items[i];
              const dedupeKey = getArticleImportDedupeKey(article);
              const suggested =
                SEM.forms?.pickSuggestedName?.(article) ||
                article.ref ||
                article.product ||
                article.desc ||
                "article";
              try {
                let res = await window.electronAPI.saveArticleAuto({
                  article,
                  suggestedName: suggested
                });
                if (!res?.ok && res?.code === "duplicate_article") {
                  if (dedupeKey && window.electronAPI?.deleteArticle) {
                    const removed = await deleteExistingArticlesByKey(
                      dedupeKey,
                      existingArticlesByKey,
                      i,
                      saveErrors
                    );
                    if (removed > 0) {
                      res = await window.electronAPI.saveArticleAuto({
                        article,
                        suggestedName: suggested
                      });
                    }
                  }
                  if (!res?.ok && res?.code === "duplicate_article") {
                    const conflictField = res?.conflict?.field || res?.field || "";
                    const conflictValue =
                      getArticleImportFieldValue(article, conflictField) ||
                      res?.conflict?.name ||
                      res?.conflict?.value ||
                      res?.name ||
                      "";
                    if (conflictField && conflictValue) {
                      const removedByConflict = await deleteExistingArticlesByConflict(
                        conflictField,
                        conflictValue,
                        i,
                        saveErrors,
                        existingArticlesByKey
                      );
                      if (removedByConflict > 0) {
                        res = await window.electronAPI.saveArticleAuto({
                          article,
                          suggestedName: suggested
                        });
                      }
                    }
                  }
                }
                if (res?.ok) {
                  savedCount += 1;
                  if (dedupeKey && window.electronAPI?.deleteArticle) {
                    await deleteExistingArticlesByKey(
                      dedupeKey,
                      existingArticlesByKey,
                      i,
                      saveErrors,
                      res?.path || ""
                    );
                    if (res?.path) {
                      existingArticlesByKey.set(dedupeKey, [{ path: res.path, article }]);
                    }
                  }
                } else if (!res?.canceled) {
                  failedCount += 1;
                  const msg = res?.message || res?.error || "Echec de l'enregistrement.";
                  saveErrors.push(`Ligne ${i + 1}: ${msg}`);
                }
              } catch (err) {
                failedCount += 1;
                saveErrors.push(`Ligne ${i + 1}: erreur inattendue.`);
              }
            }
            if (saveErrors.length) {
              articleImportModalState.errors = [...articleImportModalState.errors, ...saveErrors];
            }
            articleImportModalState.items = [];
            renderArticleImportErrors();
            const resultText = `${savedCount} article${savedCount > 1 ? "s" : ""} enregistre${savedCount > 1 ? "s" : ""}.` +
              (failedCount ? ` ${failedCount} echec${failedCount > 1 ? "s" : ""}.` : "");
            if (articleImportSummary) {
              articleImportSummary.textContent = resultText;
              articleImportSummary.hidden = false;
            }
            if (savedCount > 0 && typeof SEM.refreshArticleSearchResults === "function") {
              SEM.refreshArticleSearchResults();
            }
            if (savedCount > 0 && typeof w.showToast === "function") {
              w.showToast(resultText);
            }
            setArticleImportBusy(false);
          };

          document.addEventListener("click", (evt) => {
            const trigger = evt.target?.closest?.(articleImportBtnSelector);
            if (!trigger || !articleImportModal) return;
            if (articleImportModal.classList.contains("is-open")) return;
            openArticleImportModal();
          });
          document.addEventListener("click", (evt) => {
            const trigger = evt.target?.closest?.(articleExportBtnSelector);
            if (!trigger || !articleExportModal) return;
            if (articleExportModal.classList.contains("is-open")) return;
            openArticleExportModal(trigger);
          });

          articleImportModalClose?.addEventListener("click", closeArticleImportModal);
          articleImportModalCancel?.addEventListener("click", closeArticleImportModal);
          articleImportModalSave?.addEventListener("click", handleArticleImportSave);
          articleImportFileInput?.addEventListener("change", (evt) => {
            const file = evt.target?.files?.[0] || null;
            handleArticleImportFileChange(file);
          });
          if (articleImportModal) {
            articleImportModal.addEventListener("click", handleClientImportCopy);
            articleImportModal.addEventListener("keydown", handleClientImportCopyKeydown);
            articleImportModal.addEventListener("click", (evt) => {
              if (evt.target === articleImportModal) evt.stopPropagation();
            });
          }
          articleExportModalClose?.addEventListener("click", closeArticleExportModal);
          articleExportModalCancel?.addEventListener("click", closeArticleExportModal);
          articleExportModalSave?.addEventListener("click", async () => {
            const format =
              articleExportModal?.querySelector("#articlesExportFormat")?.value === "csv" ? "csv" : "xlsx";
            const openLocation = !!articleExportModal?.querySelector(`#${ARTICLES_EXPORT_OPEN_LOCATION_ID}`)?.checked;
            const saveBtn = articleExportModal?.querySelector("#articlesExportModalSave");
            try {
              if (saveBtn) saveBtn.disabled = true;
              saveBtn?.setAttribute("aria-busy", "true");
              setArticlesExportBusy(true);
              const res = await exportArticles(format);
              if (!res || res.canceled) return;
              if (openLocation && res?.path && (w.electronAPI?.showInFolder || w.electronAPI?.openPath)) {
                try {
                  if (w.electronAPI?.showInFolder) {
                    await w.electronAPI.showInFolder(res.path);
                  } else {
                    await w.electronAPI.openPath(res.path);
                  }
                } catch {}
              }
              closeArticleExportModal();
            } catch (err) {
              await w.showDialog?.(String(err?.message || err || "Export articles impossible."), { title: "Export" });
            } finally {
              saveBtn?.removeAttribute("aria-busy");
              if (saveBtn) saveBtn.disabled = false;
              setArticlesExportBusy(false);
            }
          });
          if (articleExportModal) {
            const formatMenu = articleExportModal.querySelector("#articlesExportFormatMenu");
            if (formatMenu) {
              formatMenu.addEventListener("toggle", () => {
                const summary = formatMenu.querySelector(".field-toggle-trigger");
                if (summary) summary.setAttribute("aria-expanded", formatMenu.open ? "true" : "false");
              });
            }
            articleExportModal.addEventListener("click", (evt) => {
              const option = evt.target?.closest?.("[data-export-format-option]");
              if (!option) return;
              evt.preventDefault();
              syncArticlesExportFormatUi(option.dataset.exportFormatOption, { updateSelect: true, closeMenu: true });
            });
            articleExportModal.querySelector("#articlesExportFormat")?.addEventListener("change", (evt) => {
              syncArticlesExportFormatUi(evt.target?.value, { updateSelect: false });
            });
            articleExportModal.addEventListener("click", (evt) => {
              if (evt.target === articleExportModal) evt.stopPropagation();
            });
          }

  }, { order: 400 });
})(window);
