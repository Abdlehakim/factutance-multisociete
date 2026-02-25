(function (w) {
  const SEM = (w.SEM = w.SEM || {});
  const registerCoreBootstrapRuntimeSource = SEM.registerCoreBootstrapRuntimeSource;
  if (typeof registerCoreBootstrapRuntimeSource !== "function") {
    console.warn("[core-bootstrap-runtime] registerCoreBootstrapRuntimeSource is unavailable");
    return;
  }

  registerCoreBootstrapRuntimeSource("stock-alerts-prelude", function (ctx) {
          stockAlertTrigger = getEl("clientSavedListHeaderBtn");
          stockAlertPopover = getEl("stockAlertPopover");
          stockAlertList = getEl("stockAlertList");
          stockAlertStatus = getEl("stockAlertStatus");
          stockAlertBadge = getEl("stockAlertBadge");
          stockAlertCloseBtn = getEl("stockAlertClose");
          stockAlertPagination = getEl("stockAlertPagination");
          stockAlertPrev = getEl("stockAlertPrev");
          stockAlertNext = getEl("stockAlertNext");
          stockAlertPageLabel = getEl("stockAlertPageLabel");
  }, { order: 200 });

  registerCoreBootstrapRuntimeSource("stock-alerts-main", function (ctx) {
          STOCK_ALERT_PAGE_SIZE = 4;
          stockAlertState = {
            open: false,
            loading: false,
            items: [],
            message: "",
            requestId: 0,
            page: 1
          };
          stockAlertRestoreFocus = null;
          stockAlertRefreshTimer = null;

          updateStockAlertBadge = (count = 0) => {
            if (!stockAlertBadge) return;
            if (count > 0) {
              stockAlertBadge.hidden = false;
              stockAlertBadge.textContent = count > 99 ? "99+" : String(count);
            } else {
              stockAlertBadge.hidden = true;
              stockAlertBadge.textContent = "";
            }
          };

          formatStockDisplay = (value) => {
            const num = Number(value);
            if (!Number.isFinite(num)) return "-";
            const normalized = normalizeStockQtyValue(num);
            return normalized.toFixed(3).replace(/\.?0+$/, "");
          };
          updateStockAlertPagination = (total = 0, totalPages = 1) => {
            if (!stockAlertPagination || !stockAlertPrev || !stockAlertNext || !stockAlertPageLabel) return;
            const show = total > 0 && !stockAlertState.loading;
            stockAlertPagination.hidden = !show;
            if (!show) return;
            const clampedTotalPages = Math.max(1, totalPages);
            const currentPage = Math.min(Math.max(stockAlertState.page || 1, 1), clampedTotalPages);
            stockAlertPrev.disabled = currentPage <= 1;
            stockAlertNext.disabled = currentPage >= clampedTotalPages;
            stockAlertPageLabel.textContent = `Page ${currentPage} / ${clampedTotalPages}`;
          };

          renderStockAlerts = () => {
            const total = Array.isArray(stockAlertState.items) ? stockAlertState.items.length : 0;
            updateStockAlertBadge(total);
            if (!stockAlertList) return;
            stockAlertList.innerHTML = "";
            if (stockAlertState.loading) {
              updateStockAlertPagination(0, 1);
              if (stockAlertStatus) stockAlertStatus.textContent = "Analyse des stocks...";
              const loading = document.createElement("li");
              loading.className = "stock-alerts__empty";
              loading.setAttribute("role", "listitem");
              loading.textContent = "Analyse des stocks...";
              stockAlertList.appendChild(loading);
              return;
            }
            if (!total) {
              updateStockAlertPagination(0, 1);
              const empty = document.createElement("li");
              empty.className = "stock-alerts__empty";
              empty.setAttribute("role", "listitem");
              const msg = stockAlertState.message || "Aucune alerte de stock.";
              empty.textContent = msg;
              stockAlertList.appendChild(empty);
              if (stockAlertStatus) stockAlertStatus.textContent = msg;
              return;
            }
            const totalPages = Math.max(1, Math.ceil(total / STOCK_ALERT_PAGE_SIZE));
            const currentPage = Math.min(Math.max(stockAlertState.page || 1, 1), totalPages);
            stockAlertState.page = currentPage;
            if (stockAlertStatus) stockAlertStatus.textContent = `${total} article${total > 1 ? "s" : ""} en alerte.`;
            const sliceStart = (currentPage - 1) * STOCK_ALERT_PAGE_SIZE;
            const sliceEnd = currentPage * STOCK_ALERT_PAGE_SIZE;
            stockAlertState.items.slice(sliceStart, sliceEnd).forEach((item) => {
              const row = document.createElement("li");
              row.className = `stock-alerts__item${item.critical ? " is-critical" : ""}`;
              row.setAttribute("role", "link");
              row.tabIndex = 0;
              row.dataset.stockAlertQuery = item.search || "";

              const header = document.createElement("div");
              header.className = "stock-alerts__item-top";

              const title = document.createElement("div");
              title.className = "stock-alerts__title";
              const nameEl = document.createElement("div");
              nameEl.className = "stock-alerts__name";
              const rawName = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Article";
              const nameValue = rawName.replace(/\.article$/i, "");
              nameEl.textContent = `DÉSIGNATION : ${nameValue}`;
              title.appendChild(nameEl);
              const descRaw = typeof item.description === "string" ? item.description.trim() : "";
              const descDisplay =
                descRaw && descRaw.length > 30 ? `${descRaw.slice(0, 30).trimEnd()}...` : descRaw;
              const descEl = document.createElement("div");
              descEl.className = "stock-alerts__description";
              descEl.textContent = `DESCRIPTION : ${descDisplay || "N.R"}`;
              title.appendChild(descEl);
              const refRaw = typeof item.ref === "string" ? item.ref.trim() : "";
              const refEl = document.createElement("div");
              refEl.className = "stock-alerts__ref";
              refEl.textContent = `RÉF : ${refRaw || "N.R"}`;
              title.appendChild(refEl);

              const pill = document.createElement("span");
              pill.className = `stock-alerts__pill${item.critical ? " is-critical" : ""}`;
              pill.textContent = item.critical ? "Critique" : "Stock bas";

              header.appendChild(title);
              header.appendChild(pill);
              row.appendChild(header);

              const meta = document.createElement("div");
              meta.className = "stock-alerts__meta";
              const qtyEl = document.createElement("span");
              qtyEl.className = "stock-alerts__meta-item";
              qtyEl.textContent = `Disponible: ${formatStockDisplay(item.stockQty)}`;
              const minEl = document.createElement("span");
              minEl.className = "stock-alerts__meta-item";
              minEl.textContent = `Stock min.: ${formatStockDisplay(item.stockMin)}`;
              meta.appendChild(qtyEl);
              meta.appendChild(minEl);
              if (item.shortage > 0) {
                const shortageEl = document.createElement("span");
                shortageEl.className = "stock-alerts__meta-item stock-alerts__meta-shortage";
                shortageEl.textContent = `Manque ${formatStockDisplay(item.shortage)}`;
                meta.appendChild(shortageEl);
              }
              row.appendChild(meta);

              stockAlertList.appendChild(row);
            });
            updateStockAlertPagination(total, totalPages);
          };
          changeStockAlertPage = (direction = 0) => {
            const total = Array.isArray(stockAlertState.items) ? stockAlertState.items.length : 0;
            if (!total) return;
            const totalPages = Math.max(1, Math.ceil(total / STOCK_ALERT_PAGE_SIZE));
            const nextPage = Math.min(Math.max((stockAlertState.page || 1) + direction, 1), totalPages);
            if (nextPage === stockAlertState.page) return;
            stockAlertState.page = nextPage;
            renderStockAlerts();
            const firstRow = stockAlertList?.querySelector(".stock-alerts__item");
            if (firstRow) {
              try {
                firstRow.focus({ preventScroll: true });
              } catch {
                firstRow.focus();
              }
            }
          };

          collectStockAlertEntries = (items = []) => {
            if (!Array.isArray(items)) return [];
            const results = [];
            items.forEach((record) => {
              const article = record?.article && typeof record.article === "object" ? record.article : record || {};
              const stockMinRaw =
                record?.stockMin ??
                record?.stock_min ??
                article.stockMin ??
                article.stock_min ??
                article.stockMinValue ??
                article.stock_min_value;
              const stockQtyRaw = record?.stockQty ?? article.stockQty ?? article.qty ?? record?.qty;
              const stockMinNum = Number(stockMinRaw);
              const stockQtyNum = Number(stockQtyRaw);
              const minValid = Number.isFinite(stockMinNum) && stockMinNum >= 0;
              const qtyValid = Number.isFinite(stockQtyNum);
              if (!minValid || !qtyValid) return;
              const alertFlag =
                record?.stockAlert ??
                record?.stockMinAlert ??
                article.stockAlert ??
                article.stockMinAlert ??
                article.stockMinActive ??
                article.stock_min_alert;
              const alertEnabled = alertFlag !== undefined ? !!alertFlag : false;
              if (!alertEnabled) return;
              const stockQty = normalizeStockQtyValue(stockQtyNum);
              const stockMin = Math.max(0, Math.round(stockMinNum * 1000) / 1000);
              if (stockQty > stockMin) return;
              const shortage = Math.max(0, stockMin - stockQty);
              const critical = stockQty <= 0 || stockQty <= stockMin * 0.5;
              const nameSource =
                record?.designation ??
                article.designation ??
                record?.name ??
                article.product ??
                article.name ??
                null;
              const descriptionSource = record?.description ?? article.description ?? article.desc ?? null;
              const name =
                (typeof nameSource === "string" && nameSource.trim()) ||
                (typeof descriptionSource === "string" && descriptionSource.trim()) ||
                article.ref ||
                "Article";
              const description = typeof descriptionSource === "string" ? descriptionSource.trim() : "";
              const ref = record?.ref || article.ref || "";
              const search = ref || name || description;
              results.push({
                name,
                description,
                ref,
                stockQty,
                stockMin,
                shortage,
                critical,
                search
              });
            });
            return results;
          };

          fetchStockAlerts = async () => {
            const requestId = ++stockAlertState.requestId;
            stockAlertState.loading = true;
            stockAlertState.page = 1;
            renderStockAlerts();
            const fallback = collectStockAlertEntries(articleSavedModalState.items || []);

            if (!window.electronAPI?.searchArticles) {
              stockAlertState.loading = false;
              stockAlertState.items = fallback;
              stockAlertState.message = fallback.length ? "" : "Recherche d'articles indisponible.";
              renderStockAlerts();
              return;
            }

            try {
              const res = await window.electronAPI.searchArticles({
                query: ""
              });
              if (requestId !== stockAlertState.requestId) return;
              if (!res?.ok) {
                stockAlertState.items = fallback;
                stockAlertState.message = res?.error || "Chargement des articles impossible.";
              } else {
                stockAlertState.items = collectStockAlertEntries(res.results || []);
                stockAlertState.message = stockAlertState.items.length ? "" : "Aucune alerte de stock.";
              }
            } catch (err) {
              console.error("stock alerts fetch", err);
              if (requestId !== stockAlertState.requestId) return;
              stockAlertState.items = fallback;
              stockAlertState.message = "Chargement des alertes impossible.";
            } finally {
              if (requestId !== stockAlertState.requestId) return;
              stockAlertState.loading = false;
              renderStockAlerts();
            }
          };

          requestStockAlertRefresh = ({ immediate = false } = {}) => {
            if (!stockAlertPopover && !stockAlertBadge) return;
            clearTimeout(stockAlertRefreshTimer);
            const delay = immediate ? 0 : 220;
            stockAlertRefreshTimer = setTimeout(() => {
              stockAlertRefreshTimer = null;
              fetchStockAlerts();
            }, delay);
          };

          setStockAlertVisibility = (open) => {
            if (!stockAlertPopover) return;
            stockAlertState.open = open;
            stockAlertPopover.hidden = !open;
            stockAlertPopover.setAttribute("aria-hidden", open ? "false" : "true");
            if (stockAlertTrigger) {
              stockAlertTrigger.setAttribute("aria-expanded", open ? "true" : "false");
              stockAlertTrigger.classList.toggle("is-open", open);
            }
          };

          onStockAlertDocumentClick = (evt) => {
            if (!stockAlertState.open) return;
            const target = evt.target;
            if (stockAlertPopover?.contains(target) || stockAlertTrigger?.contains(target)) return;
            closeStockAlerts();
          };

          onStockAlertKeydown = (evt) => {
            if (!stockAlertState.open) return;
            if (evt.key === "Escape") {
              evt.preventDefault();
              closeStockAlerts();
            }
          };

          openStockAlerts = () => {
            if (!stockAlertPopover) return;
            stockAlertRestoreFocus =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setStockAlertVisibility(true);
            renderStockAlerts();
            requestStockAlertRefresh({ immediate: true });
            document.addEventListener("click", onStockAlertDocumentClick, true);
            document.addEventListener("keydown", onStockAlertKeydown);
          };

          closeStockAlerts = () => {
            if (!stockAlertPopover) return;
            setStockAlertVisibility(false);
            document.removeEventListener("click", onStockAlertDocumentClick, true);
            document.removeEventListener("keydown", onStockAlertKeydown);
            if (stockAlertRestoreFocus && typeof stockAlertRestoreFocus.focus === "function") {
              try {
                stockAlertRestoreFocus.focus();
              } catch {}
            }
            stockAlertRestoreFocus = null;
          };

          toggleStockAlerts = () => {
            if (!stockAlertPopover) return;
            if (stockAlertState.open) {
              closeStockAlerts();
            } else {
              openStockAlerts();
            }
          };

          navigateToStockAlertArticle = (query = "") => {
            if (articleSavedSearchInput) {
              articleSavedSearchInput.value = query;
              articleSavedModalState.query = (query || "").trim();
            }
            closeStockAlerts();
            openArticleSavedModal();
          };

          if (stockAlertList) {
            stockAlertList.addEventListener("click", (evt) => {
              const row = evt.target.closest("[data-stock-alert-query]");
              if (!row) return;
              navigateToStockAlertArticle(row.dataset.stockAlertQuery || "");
            });
            stockAlertList.addEventListener("keydown", (evt) => {
              if (evt.key === "Enter" || evt.key === " ") {
                const row = evt.target.closest("[data-stock-alert-query]");
                if (!row) return;
                evt.preventDefault();
                navigateToStockAlertArticle(row.dataset.stockAlertQuery || "");
              }
            });
          }
          stockAlertPrev?.addEventListener("click", () => changeStockAlertPage(-1));
          stockAlertNext?.addEventListener("click", () => changeStockAlertPage(1));
          if (stockAlertTrigger && stockAlertPopover) {
            stockAlertTrigger.addEventListener("click", toggleStockAlerts);
          }

          requestStockAlertRefresh({ immediate: false });

  }, { order: 900 });
})(window);
