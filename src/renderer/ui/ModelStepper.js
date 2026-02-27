import { renderFooterNoteSection } from "./footerNoteSection.js";
import { renderWhPdfNoteSection } from "./whPdfNoteSection.js";

export const ModelStepper = `
              <div class="model-stepper-shell is-collapsed" id="modelStepperShell">
                <div class="model-stepper" data-model-stepper>
                  <div
                    class="model-stepper__labels"
                    role="tablist"
                    aria-label="Navigation des &eacute;tapes du mod&egrave;le"
                  >
                    <button
                      type="button"
                      class="model-stepper__step is-active"
                      data-model-step="1"
                      role="tab"
                      aria-selected="true"
                      aria-controls="modelStepPanel1"
                      id="modelStepLabel1"
                    >
                      <span class="model-stepper__badge">1</span>
                      <span class="model-stepper__title">D&eacute;tails</span>
                    </button>
                    <button
                      type="button"
                      class="model-stepper__step"
                      data-model-step="2"
                      role="tab"
                      aria-selected="false"
                      aria-controls="modelStepPanel2"
                      id="modelStepLabel2"
                    >
                      <span class="model-stepper__badge">2</span>
                      <span class="model-stepper__title">Param&egrave;tres</span>
                    </button>
                    <button
                      type="button"
                      class="model-stepper__step"
                      data-model-step="3"
                      role="tab"
                      aria-selected="false"
                      aria-controls="modelStepPanel3"
                      id="modelStepLabel3"
                    >
                      <span class="model-stepper__badge">3</span>
                      <span class="model-stepper__title">Frais &amp; taxes</span>
                    </button>
                    <button
                      type="button"
                      class="model-stepper__step"
                      data-model-step="4"
                      role="tab"
                      aria-selected="false"
                      aria-controls="modelStepPanel4"
                      id="modelStepLabel4"
                    >
                      <span class="model-stepper__badge">4</span>
                      <span class="model-stepper__title">Personnalisation</span>
                    </button>
                  </div>

                  <div class="model-stepper__panels">
                    <div
                      class="model-stepper__panel is-active"
                      data-model-step-panel="1"
                      id="modelStepPanel1"
                      role="tabpanel"
                      aria-labelledby="modelStepLabel1"
                    >
                      <label class="model-name-field" for="modelName">
                        <span class="model-name-field__label">Nom du mod&egrave;le</span>
                        <input
                          id="modelName"
                          type="text"
                          placeholder="Ex : Mod&egrave;le facture standard"
                          autocomplete="off"
                        />
                        <span class="model-name-field__hint">Ce nom sera utilis&eacute; pour enregistrer votre mod&egrave;le.</span>
                      </label>
                      <label class="model-name-field" for="modelTemplate" id="modelTemplateLabel">
                        <span class="model-name-field__label">Template</span>
                        <div class="doc-dialog-model-picker__field">
                          <details
                            id="modelTemplateMenu"
                            class="field-toggle-menu model-select-menu doc-type-menu"
                            data-select-source="template"
                          >
                            <summary
                              class="btn success field-toggle-trigger"
                              role="button"
                              aria-haspopup="listbox"
                              aria-expanded="false"
                              aria-labelledby="modelTemplateLabel modelTemplateDisplay"
                            >
                              <span id="modelTemplateDisplay" class="model-select-display">Facturence</span>
                              <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                            </summary>
                            <div
                              id="modelTemplatePanel"
                              class="field-toggle-panel model-select-panel"
                              role="listbox"
                              aria-labelledby="modelTemplateLabel"
                            ></div>
                          </details>
                          <select id="modelTemplate" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                            <option value="template1" selected>Facturence</option>
                            <option value="template2">wellcom</option>
                          </select>
                        </div>
                      </label>
                      <label class="model-name-field" for="modelNumberFormat" id="modelNumberFormatLabel">
                        <span id="modelNumberFormatLabelText" class="model-name-field__label">Num&eacute;rotation</span>
                        <div class="currency-field__controls">
                          <div
                            id="modelNumberFormatPanel"
                            class="currency-panel currency-panel--inline"
                            role="radiogroup"
                            aria-labelledby="modelNumberFormatLabelText"
                          >
                            <label
                              class="toggle-option currency-toggle is-active"
                              data-number-format-option="prefix_date_counter"
                              aria-selected="true"
                            >
                              <input
                                type="radio"
                                name="modelNumberFormatChoice"
                                value="prefix_date_counter"
                                class="col-toggle"
                                checked
                                aria-checked="true"
                              />
                              <span class="model-save-dot">PR&Eacute;FIXE_Ann&eacute;e-Mois-Num&eacute;ro (Fact_26-01-1)</span>
                            </label>
                            <label
                              class="toggle-option currency-toggle"
                              data-number-format-option="prefix_counter"
                              aria-selected="false"
                            >
                              <input
                                type="radio"
                                name="modelNumberFormatChoice"
                                value="prefix_counter"
                                class="col-toggle"
                                aria-checked="false"
                              />
                              <span class="model-save-dot">PR&Eacute;FIXE_Num&eacute;ro sur 4 chiffres (Fact_0001)</span>
                            </label>
                            <label
                              class="toggle-option currency-toggle"
                              data-number-format-option="counter"
                              aria-selected="false"
                            >
                              <input
                                type="radio"
                                name="modelNumberFormatChoice"
                                value="counter"
                                class="col-toggle"
                                aria-checked="false"
                              />
                              <span class="model-save-dot">Num&eacute;ro sur 4 chiffres uniquement (0001)</span>
                            </label>
                          </div>
                          <select id="modelNumberFormat" class="currency-select" aria-hidden="true" tabindex="-1">
                            <option value="prefix_date_counter" selected>PR&Eacute;FIXE_Ann&eacute;e-Mois-Num&eacute;ro (Fact_26-01-1)</option>
                            <option value="prefix_counter">PR&Eacute;FIXE_Num&eacute;ro sur 4 chiffres (Fact_0001)</option>
                            <option value="counter">Num&eacute;ro sur 4 chiffres uniquement (0001)</option>
                          </select>
                        </div>
                      </label>
                    </div>

                    <div
                      class="model-stepper__panel"
                      data-model-step-panel="2"
                      id="modelStepPanel2"
                      role="tabpanel"
                      aria-labelledby="modelStepLabel2"
                      hidden
                    >
                      <div class="doc-meta-grid model-actions-modal__meta-grid">
                        <div class="doc-meta-grid__item">
                          <label class="doc-type-field">
                            <span id="modelDocTypeLabelText" class="model-save-dot">Type de document</span>
                            <div class="doc-type-field__controls">
                              <div
                                id="modelDocTypePanel"
                                class="doc-type-panel doc-type-panel--inline"
                                role="listbox"
                                aria-multiselectable="true"
                                aria-labelledby="modelDocTypeLabelText"
                              >
                                  <label
                                    class="toggle-option doc-type-toggle is-active"
                                    data-doc-type-option="facture"
                                    aria-selected="true"
                                  >
                                    <input type="checkbox" name="modelDocTypeChoice" value="facture" class="col-toggle" checked aria-checked="true" />
                                    <span class="model-save-dot">Facture</span>
                                  </label>
                                <label
                                  class="toggle-option doc-type-toggle"
                                  data-doc-type-option="fa"
                                  aria-selected="false"
                                >
                                  <input type="checkbox" name="modelDocTypeChoice" value="fa" class="col-toggle" />
                                  <span class="model-save-dot">Facture d'achat</span>
                                </label>
                                <label
                                  class="toggle-option doc-type-toggle"
                                  data-doc-type-option="avoir"
                                  aria-selected="false"
                                >
                                  <input type="checkbox" name="modelDocTypeChoice" value="avoir" class="col-toggle" />
                                  <span class="model-save-dot">Facture d'avoir</span>
                                </label>
                                <label
                                  class="toggle-option doc-type-toggle"
                                  data-doc-type-option="devis"
                                  aria-selected="false"
                                >
                                  <input type="checkbox" name="modelDocTypeChoice" value="devis" class="col-toggle" />
                                  <span class="model-save-dot">Devis</span>
                                </label>
                                <label
                                  class="toggle-option doc-type-toggle"
                                  data-doc-type-option="bl"
                                  aria-selected="false"
                                >
                                  <input type="checkbox" name="modelDocTypeChoice" value="bl" class="col-toggle" />
                                  <span class="model-save-dot">Bon de livraison</span>
                                </label>
                              </div>
                                <select id="modelDocType" class="doc-type-select" aria-hidden="true" tabindex="-1" multiple>
                                  <option value="facture" selected>Facture</option>
                                <option value="fa">Facture d'achat</option>
                                <option value="avoir">Facture d'avoir</option>
                                <option value="devis">Devis</option>
                                <option value="bl">Bon de livraison</option>
                              </select>
                            </div>
                          </label>
                        </div>


                              <label class="currency-field__column">
                                <span id="modelCurrencyLabelText" class="model-save-dot">Devise</span>
                                <div class="currency-field__controls">
                                  <div
                                    id="modelCurrencyPanel"
                                    class="currency-panel currency-panel--inline"
                                    role="radiogroup"
                                    aria-labelledby="modelCurrencyLabelText"
                                  >
                                    <label
                                      class="toggle-option currency-toggle is-active"
                                      data-currency-option="DT"
                                      aria-selected="true"
                                    >
                                      <input type="radio" name="modelCurrencyChoice" value="DT" class="col-toggle" checked />
                                      <span class="model-save-dot">DT (dinar)</span>
                                    </label>
                                    <label class="toggle-option currency-toggle" data-currency-option="EUR" aria-selected="false">
                                      <input type="radio" name="modelCurrencyChoice" value="EUR" class="col-toggle" />
                                      <span class="model-save-dot">EUR (euro)</span>
                                    </label>
                                    <label class="toggle-option currency-toggle" data-currency-option="USD" aria-selected="false">
                                      <input type="radio" name="modelCurrencyChoice" value="USD" class="col-toggle" />
                                      <span class="model-save-dot">USD (dollar)</span>
                                    </label>
                                  </div>
                                  <select id="modelCurrency" class="currency-select" aria-hidden="true" tabindex="-1">
                                    <option value="DT" selected>DT</option>
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                  </select>
                                </div>
                              </label>

                              <label class="currency-field__column">
                                <span id="modelTaxModeLabelText" class="model-save-dot">Mode taxe</span>
                                <div class="currency-field__controls">
                                  <div
                                    id="modelTaxPanel"
                                    class="currency-panel currency-panel--inline"
                                    role="radiogroup"
                                    aria-labelledby="modelTaxModeLabelText"
                                  >
                                    <label
                                      class="toggle-option currency-toggle is-active"
                                      data-tax-option="with"
                                      aria-selected="true"
                                    >
                                      <input type="radio" name="modelTaxModeChoice" value="with" class="col-toggle" checked />
                                      <span class="model-save-dot">Avec taxe</span>
                                    </label>
                                    <label class="toggle-option currency-toggle" data-tax-option="without" aria-selected="false">
                                      <input type="radio" name="modelTaxModeChoice" value="without" class="col-toggle" />
                                      <span class="model-save-dot">Sans taxe</span>
                                    </label>
                                  </div>
                                  <select id="modelTaxMode" class="currency-select" aria-hidden="true" tabindex="-1">
                                    <option value="with" selected>Avec taxe</option>
                                    <option value="without">Sans taxe</option>
                                  </select>
                                </div>
                              </label>
                        <div class="doc-meta-grid__item">
                          <div class="model-field-toggles">
                            <div class="field-toggle-menu__title">Colonnes du tableau</div>
                            <div class="field-toggle-panel field-toggle-panel--grouped">
                              <div class="field-toggle-section">
                                <div class="field-toggle-section__title">G&eacute;n&eacute;ral</div>
                                <div class="field-toggle-section__grid">
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleRefModal"
                                      data-column-key="ref"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne Ref"
                                      checked
                                    />
                                    <span class="model-save-dot">R&eacute;f.</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleProductModal"
                                      data-column-key="product"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne Designation(s)"
                                      checked
                                    />
                                    <span class="model-save-dot">D&eacute;signation(s)</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleDescModal"
                                      data-column-key="desc"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne Description(s)"
                                    />
                                    <span class="model-save-dot">Description(s)</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleQtyModal"
                                      data-column-key="qty"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne Quantite"
                                      checked
                                    />
                                    <span class="model-save-dot">Qt&eacute;</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleUnitModal"
                                      data-column-key="unit"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne Unite"
                                      checked
                                    />
                                    <span class="model-save-dot">Unit&eacute;</span>
                                  </label>
                                </div>
                              </div>

                              <div class="field-toggle-section">
                                <div class="field-toggle-section__title">Vente</div>
                                <div class="field-toggle-section__grid">
                                  <label class="toggle-option">
                                    <input
                                      id="colTogglePriceModal"
                                      data-column-key="price"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne P.U. HT"
                                      checked
                                    />
                                    <span id="togglePriceLabelModal" class="model-save-dot">P.U. HT</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleTvaModal"
                                      data-column-key="tva"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne TVA"
                                      checked
                                    />
                                    <span class="model-save-dot">TVA %</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleDiscountModal"
                                      data-column-key="discount"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne Remise"
                                      checked
                                    />
                                    <span class="model-save-dot">Remise %</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleFodecModal"
                                      data-column-key="fodec"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne FODEC"
                                      checked
                                    />
                                    <span id="toggleFodecLabelModal" class="model-save-dot">FODEC</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleTotalHtModal"
                                      data-column-key="totalHt"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer Total HT"
                                      checked
                                    />
                                    <span id="toggleTotalHtLabelModal" class="model-save-dot">Total HT</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleTotalTtcModal"
                                      data-column-key="totalTtc"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer Total TTC"
                                      checked
                                    />
                                    <span class="model-save-dot">Total TTC</span>
                                  </label>
                                </div>
                              </div>

                              <div class="field-toggle-section">
                                <div class="field-toggle-section__title">Achat</div>
                                <div class="field-toggle-section__grid">
                                  <label class="toggle-option">
                                    <input
                                      id="colTogglePurchasePriceModal"
                                      data-column-key="purchasePrice"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne PU A. HT"
                                    />
                                    <span class="model-save-dot">PU A. HT</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colTogglePurchaseTvaModal"
                                      data-column-key="purchaseTva"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne TVA A."
                                    />
                                    <span class="model-save-dot">TVA A.</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colTogglePurchaseDiscountModal"
                                      data-column-key="purchaseDiscount"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne Remise A."
                                      aria-checked="true"
                                      checked
                                    />
                                    <span class="model-save-dot">Remise A.</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colTogglePurchaseFodecModal"
                                      data-column-key="fodecPurchase"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer colonne FODEC A."
                                      checked
                                    />
                                    <span class="model-save-dot">FODEC A.</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleTotalPurchaseHtModal"
                                      data-column-key="totalPurchaseHt"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer Total A. HT"
                                    />
                                    <span class="model-save-dot">Total A. HT</span>
                                  </label>
                                  <label class="toggle-option">
                                    <input
                                      id="colToggleTotalPurchaseTtcModal"
                                      data-column-key="totalPurchaseTtc"
                                      type="checkbox"
                                      class="col-toggle"
                                      aria-label="Masquer Total A. TTC"
                                    />
                                    <span class="model-save-dot">Total A. TTC</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      class="model-stepper__panel"
                      data-model-step-panel="3"
                      id="modelStepPanel3"
                      role="tabpanel"
                      aria-labelledby="modelStepLabel3"
                      hidden
                    >
                      <label class="doc-type-field model-field-toggles fees-taxes-options">
                        <span id="feesTaxesTitle" class="model-save-dot">Afficher les options Frais &amp; taxes</span>
                        <div class="doc-type-field__controls">
                          <div
                            id="feesTaxesOptionsPanel"
                            class="field-toggle-section__grid"
                            role="listbox"
                            aria-multiselectable="true"
                            aria-labelledby="feesTaxesTitle"
                          >
                            <label
                              class="toggle-option"
                              data-fees-option="shipping"
                              data-fees-target="#shipFieldsModal"
                              data-fees-source="#shipEnabledModal"
                              aria-selected="true"
                            >
                              <input id="shipOptToggleModal" type="checkbox" class="col-toggle" checked aria-checked="true" />
                              <span class="model-save-dot">Ajouter les frais de livraison</span>
                            </label>
                            <label
                              class="toggle-option"
                              data-fees-option="stamp"
                              data-fees-target="#stampFieldsModal"
                              data-fees-source="#stampEnabledModal"
                              aria-selected="true"
                            >
                              <input id="stampOptToggleModal" type="checkbox" class="col-toggle" checked aria-checked="true" />
                              <span class="model-save-dot">Ajouter timbre fiscal</span>
                            </label>
                            <label
                              class="toggle-option"
                              data-fees-option="dossier"
                              data-fees-target="#dossierFieldsModal"
                              data-fees-source="#dossierEnabledModal"
                              aria-selected="false"
                            >
                              <input id="dossierOptToggleModal" type="checkbox" class="col-toggle" aria-checked="false" />
                              <span class="model-save-dot">Ajouter les frais du dossier</span>
                            </label>
                            <label
                              class="toggle-option"
                              data-fees-option="deplacement"
                              data-fees-target="#deplacementFieldsModal"
                              data-fees-source="#deplacementEnabledModal"
                              aria-selected="false"
                            >
                              <input id="deplacementOptToggleModal" type="checkbox" class="col-toggle" aria-checked="false" />
                              <span class="model-save-dot">Ajouter les frais de deplacement</span>
                            </label>
                            <label
                              class="toggle-option"
                              data-fees-option="financing"
                              data-fees-target="#financingBox"
                              aria-selected="false"
                            >
                              <input id="financingOptToggleModal" type="checkbox" class="col-toggle" aria-checked="false" />
                              <span class="model-save-dot">Source de financement</span>
                            </label>
                          </div>
                        </div>
                      </label>
                      <div class="shipping-flex-row">
                        <div class="shipping-flex-group">
                          <div class="full">
                            <div class="label-inline">
                              <span class="label-text">Ajouter les frais de livraison</span>
                              <input id="shipEnabledModal" type="checkbox" class="col-toggle" aria-label="Ajouter les frais de livraison" />
                            </div>
                          </div>

                          <div id="shipFieldsModal" class="full shipping-flex-group__fields">
                            
                            <label>Montant HT
                              <input id="shipAmountModal" type="number" min="0" step="0.01" value="7" />
                            </label>
                            <label>TVA %
                              <input id="shipTvaModal" type="number" min="0" step="0.01" value="7" />
                            </label>
                            <label>Libelle
                              <input id="shipLabelModal" placeholder="Frais de livraison" />
                            </label>
                          </div>
                        </div>    

                        <div class="shipping-flex-group">
                          <div class="full">
                            <div class="label-inline">
                              <span class="label-text">Ajouter timbre fiscal</span>
                              <input id="stampEnabledModal" type="checkbox" class="col-toggle" aria-label="Ajouter timbre fiscal" />
                            </div>
                          </div>

                          <div id="stampFieldsModal" class="full shipping-flex-group__fields">
                            
                            <label>Montant HT
                              <input id="stampAmountModal" type="number" min="0" step="0.001" value="1" />
                            </label>
                            <label>Libelle
                              <input id="stampLabelModal" placeholder="Timbre fiscal" />
                            </label>
                          </div>
                        </div>

                        <div class="shipping-flex-group">
                          <div class="full">
                            <div class="label-inline">
                              <span class="label-text">Ajouter les frais du dossier</span>
                              <input id="dossierEnabledModal" type="checkbox" class="col-toggle" aria-label="Ajouter les frais du dossier" />
                            </div>
                          </div>

                          <div id="dossierFieldsModal" class="full shipping-flex-group__fields">
                            
                            <label>Montant HT
                              <input id="dossierAmountModal" type="number" min="0" step="0.01" value="0" />
                            </label>
                            <label>TVA %
                              <input id="dossierTvaModal" type="number" min="0" step="0.01" value="0" />
                            </label>
                            <label>Libelle
                              <input id="dossierLabelModal" placeholder="Frais du dossier" />
                            </label>
                          </div>
                        </div>

                        <div class="shipping-flex-group">
                          <div class="full">
                            <div class="label-inline">
                              <span class="label-text">Ajouter les frais de deplacement</span>
                              <input id="deplacementEnabledModal" type="checkbox" class="col-toggle" aria-label="Ajouter les frais de deplacement" />
                            </div>
                          </div>

                          <div id="deplacementFieldsModal" class="full shipping-flex-group__fields">
                            
                            <label>Montant HT
                              <input id="deplacementAmountModal" type="number" min="0" step="0.01" value="0" />
                            </label>
                            <label>TVA %
                              <input id="deplacementTvaModal" type="number" min="0" step="0.01" value="0" />
                            </label>
                            <label>Libelle
                              <input id="deplacementLabelModal" placeholder="Frais de deplacement" />
                            </label>
                          </div>
                        </div>

                      </div>

                      <fieldset class="section-box" id="financingBox" hidden style="display:none;">
                        <legend><span class="model-save-dot">Source de financement</span></legend>

                        <div class="full" style="margin-top:0.5rem">
                          <div class="label-inline">
                            <span class="label-text">Subvention</span>
                            <input id="subventionEnabled" type="checkbox" class="col-toggle" aria-label="Subvention" />
                          </div>
                        </div>

                        <div id="subventionFields" class="full grid two" style="display:none;">
                          <label>Libelle <input id="subventionLabel" placeholder="ANME" /></label>
                          <label>Montant <input id="subventionAmount" type="number" min="0" step="0.01" value="0" /></label>
                        </div>

                        <div class="full" style="margin-top:0.5rem">
                          <div class="label-inline">
                            <span class="label-text">Financement bancaire</span>
                            <input id="finBankEnabled" type="checkbox" class="col-toggle" aria-label="Financement bancaire" />
                          </div>
                        </div>

                        <div id="finBankFields" class="full grid two" style="display:none;">
                          <label>Libelle <input id="finBankLabel" placeholder="Bank Zitouna" /></label>
                          <label>Montant <input id="finBankAmount" type="number" min="0" step="0.01" value="0" /></label>
                        </div>

                        <div id="financingNetRow" class="full" style="display:none;">
                          <label>Montant net a payer <input id="financingNet" readonly /></label>
                        </div>
                      </fieldset>
                    </div>

                    <div
                      class="model-stepper__panel"
                      data-model-step-panel="4"
                      id="modelStepPanel4"
                      role="tabpanel"
                      aria-labelledby="modelStepLabel4"
                      hidden
                    >
                      <fieldset class="items-color-field">
                        <legend>Couleur du tableau</legend>
                        <div class="items-color-dropdown" id="modelItemsColorDropdown">
                          <div class="items-color-row">
                            <button
                              type="button"
                              class="items-color-trigger"
                              id="modelItemsColorTrigger"
                              aria-haspopup="true"
                              aria-expanded="false"
                              aria-label="Couleur du tableau"
                            >
                              <input
                                id="modelItemsHeaderColor"
                                name="modelItemsHeaderColor"
                                type="color"
                                value="#15335e"
                                aria-label="Choisir la couleur de l'ent&ecirc;te du tableau"
                                class="items-color-native"
                              />
                              <div class="items-color-preview" aria-hidden="true">
                                <div class="items-color-preview__square" id="modelItemsPickerArea" style="--picker-hue: hsl(215.34246575342468, 100%, 50%);">
                                  <span class="items-picker-thumb" id="modelItemsPickerThumb" style="left: 77.6596%; top: 63.1373%;"></span>
                                </div>
                                <div class="items-color-preview__hue" id="modelItemsPickerHueBar" style="--hue-x: 59.817351598173516%;"></div>
                              </div>
                            </button>
                            <div class="items-color-quick">
                              <div class="items-color-swatches" role="group" aria-label="Couleurs rapides">
                                <button
                                  type="button"
                                  class="items-color-swatch is-active"
                                  data-model-items-color-swatch="#15335e"
                                  style="--swatch-color: #15335e"
                                  aria-label="Bleu fonce"
                                ></button>
                                <button
                                  type="button"
                                  class="items-color-swatch"
                                  data-model-items-color-swatch="#0ea5e9"
                                  style="--swatch-color: #0ea5e9"
                                  aria-label="Bleu clair"
                                ></button>
                                <button
                                  type="button"
                                  class="items-color-swatch"
                                  data-model-items-color-swatch="#10b981"
                                  style="--swatch-color: #10b981"
                                  aria-label="Vert"
                                ></button>
                                <button
                                  type="button"
                                  class="items-color-swatch"
                                  data-model-items-color-swatch="#eab308"
                                  style="--swatch-color: #eab308"
                                  aria-label="Jaune"
                                ></button>
                                <button
                                  type="button"
                                  class="items-color-swatch"
                                  data-model-items-color-swatch="#ef4444"
                                  style="--swatch-color: #ef4444"
                                  aria-label="Rouge"
                                ></button>
                                <button
                                  type="button"
                                  class="items-color-swatch"
                                  data-model-items-color-swatch="#6b7280"
                                  style="--swatch-color: #6b7280"
                                  aria-label="Gris"
                                ></button>
                              </div>
                              <div class="items-color-hex-row">
                                <label class="items-color-hex" for="modelItemsHeaderHex">
                                  <span class="items-color-hex__label">HEX</span>
                                  <input
                                    id="modelItemsHeaderHex"
                                    name="modelItemsHeaderHex"
                                    type="text"
                                    value="#15335e"
                                    inputmode="text"
                                    autocomplete="off"
                                    autocapitalize="off"
                                    spellcheck="false"
                                    maxlength="7"
                                    aria-label="Saisir un code couleur hexadecimal"
                                    class="items-color-hex__input"
                                    placeholder="#15335e"
                                  />
                                </label>
                                <button type="button" class="items-color-reset" id="modelItemsColorReset" disabled>R&eacute;initialiser</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      ${renderWhPdfNoteSection({ modal: true })}

                      ${renderFooterNoteSection({ modal: true })}

                      <fieldset class="section-box" id="pdfOptionsBoxModal">
                        <legend><span class="model-save-dot">Autres Options</span></legend>
                        <div class="model-field-toggles">
                          <div class="field-toggle-panel">
                            <label class="toggle-option">
                              <input
                                id="pdfShowAmountWordsModal"
                                type="checkbox"
                                class="col-toggle"
                                aria-label="Afficher le total en lettres"
                                checked
                              />
                              <span class="model-save-dot">Afficher le total en lettres</span>
                            </label>
                            <label class="toggle-option">
                              <input
                                id="pdfShowSealModal"
                                type="checkbox"
                                class="col-toggle"
                                aria-label="Afficher le Cachet"
                                checked
                              />
                              <span class="model-save-dot">Afficher le Cachet</span>
                            </label>
                            <label class="toggle-option">
                              <input
                                id="pdfShowSignatureModal"
                                type="checkbox"
                                class="col-toggle"
                                aria-label="Afficher la signature"
                                checked
                              />
                              <span class="model-save-dot">Afficher la signature</span>
                            </label>
                          </div>
                        </div>
                      </fieldset>
                    </div>

                  </div>

                  <div class="model-stepper__controls" aria-label="Navigation entre les &eacute;tapes du mod&egrave;le">
                      <div class="model-stepper__actions-left">
                        <button
                          type="button"
                          class="btn ghost tiny model-stepper__nav model-stepper__nav--prev better-style"
                          id="modelCancelFlowBtn"
                        >
                          Annuler
                        </button>
                    </div>
                    <div class="model-stepper__actions-right">
                      <button
                        type="button"

                        class="btn ghost tiny model-stepper__nav model-stepper__nav--prev better-style"
                        data-model-step-prev
                        aria-label="Aller &agrave; l'&eacute;tape pr&eacute;c&eacute;dente"
                      >
                        Pr&eacute;c&eacute;dent
                      </button>
                      <button
                        type="button"
                        class="btn success tiny model-stepper__nav model-stepper__nav--next better-style"
                        data-model-step-next
                        aria-label="Aller &agrave; l'&eacute;tape suivante"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                </div>

              </div>
`;

