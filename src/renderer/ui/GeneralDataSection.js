import { renderDocMetaBoxMainscreen } from "./docMetaBoxMainscreen.js";
import { renderClientBoxMainscreen } from "./clientBoxMainscreen.js";
import { renderAddItemBoxMainscreen } from "./addItemBoxMainscreen.js";
import { renderSignatureModal } from "./SignatureModalView.js";
import { renderClientFormPopover } from "./clientFormPopover.js";
import { renderFournisseurFormPopover } from "./fournisseurFormPopover.js";
import { html } from "./utils.js";

export function renderGeneralDataSection() {
  return html(`
    <section class="main-screen-grid">
      <fieldset class="section-box" id="companyBox">
        <legend>Informations entreprise :</legend>
        <div class="company-info-grid">
          <div class="company-info-summary">
            <div class="company-info-summary__row company-info-summary__row--header">
              <div class="company-header">
                <div class="company-header__main">
                  <div class="company-header__avatar" id="companyHeaderAvatar" aria-hidden="true">
                    <img id="companyHeaderAvatarImage" alt="Logo entreprise" hidden />
                    <span id="companyHeaderAvatarFallback">FA</span>
                  </div>
                  <div class="company-header__meta">
                    <span class="company-header__eyebrow">Nom de l'entreprise</span>
                    <h3 class="company-header__title" id="companyNameDisplay">-</h3>
                    <p class="company-header__subtitle is-empty" id="companyHeaderSubtitle">
                      Renseignez les coordonnees de l'entreprise.
                    </p>
                  </div>
                </div>
                <div class="company-header__actions">
                  <span class="company-header__switch-label" id="companySwitchLabel">Societe active</span>
                  <span class="company-switch-field company-header__switch">
                    <span class="company-switch-anchor">
                      <details
                        id="companySwitchSelectMenu"
                        class="field-toggle-menu model-select-menu"
                        data-model-select-managed="false"
                        aria-label="Changer de societe"
                      >
                        <summary
                          class="btn success field-toggle-trigger"
                          role="button"
                          aria-haspopup="listbox"
                          aria-expanded="false"
                          aria-labelledby="companySwitchLabel companySwitchSelectDisplay"
                        >
                          <span id="companySwitchSelectDisplay" class="model-select-display">Selectionner une societe</span>
                          <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                        </summary>
                        <div
                          id="companySwitchSelectPanel"
                          class="field-toggle-panel model-select-panel"
                          role="listbox"
                          aria-labelledby="companySwitchLabel"
                        ></div>
                      </details>
                    </span>
                    <select id="companySwitchSelect" class="model-select" aria-hidden="true" tabindex="-1" hidden>
                      <option value="">Selectionner une societe</option>
                    </select>
                  </span>
                </div>
              </div>
            </div>
            <div class="company-info-summary__row" hidden>
              <span class="company-info-summary__label">Code en douane</span>
              <span class="company-info-summary__value is-empty" id="companyCustomsDisplay">—</span>
            </div>
          </div>

          <div class="company-info-hidden" aria-hidden="true">
            <div class="grid two">
              <label>Nom de l'entreprise <input id="companyName" /></label>
              <label>Matricule fiscal <input id="companyVat" /></label>
              <label>Code en douane <input id="companyCustomsCode" /></label>
              <label>IBAN <input id="companyIban" /></label>
              <label class="company-phone-group">
                <span class="label-text">Telephone</span>
                <div class="company-phone-display">
                  <div class="company-phone-display__item is-visible">
                    <input id="companyPhone" />
                  </div>
                  <div class="company-phone-display__item">
                    <input id="companyPhoneAlt1" />
                  </div>
                  <div class="company-phone-display__item">
                    <input id="companyPhoneAlt2" />
                  </div>
                </div>
              </label>
              <label>E-mail <input id="companyEmail" /></label>
              <label class="full">Adresse <input id="companyAddress" /></label>
            </div>
          </div>
          <div class="company-info-grid__footer">
            <button id="btnCompanyContactEdit" type="button" class="btn better-style">Modifier les coordonnees</button>
            <button id="btnCompanySmtpSettings" type="button" class="btn better-style">Options SMTP</button>
            <button id="btnCompanyLanServerSettings" type="button" class="btn better-style">Serveur LAN</button>
          </div>
        </div>

      </fieldset>

      ${renderDocMetaBoxMainscreen()}
      ${renderClientBoxMainscreen()}
      ${renderAddItemBoxMainscreen()}
    </section>

    <div id="companyContactModal" class="swbDialog company-modal" hidden aria-hidden="true">
      <div class="swbDialog__panel company-modal__panel" role="dialog" aria-modal="true" aria-labelledby="companyContactModalTitle">
        <div class="swbDialog__header">
          <div id="companyContactModalTitle" class="swbDialog__title">Coordonnees de l'entreprise <button
            id="companyContactModalVideo"
            type="button"
            class="client-search__edit doc-history__open-view"
            title="Video"
            aria-label="Video"
          >
            <span class="doc-history__view-icon" aria-hidden="true">
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <path fill="none" d="M0 0h24v24H0z"></path>
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"></path>
              </svg>
            </span></div>
          
          </button>
          <button id="companyContactModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <form id="companyContactModalForm" class="company-modal__body swbDialog__msg" novalidate>
          <div class="model-stepper company-modal__stepper" data-company-contact-stepper>
            <div
              class="model-stepper__labels"
              role="tablist"
              aria-label="Navigation des etapes des coordonnees de l'entreprise"
            >
              <button
                type="button"
                class="model-stepper__step is-active"
                data-company-contact-step="1"
                role="tab"
                aria-selected="true"
                aria-controls="companyContactStepPanel1"
                id="companyContactStepLabel1"
                tabindex="0"
              >
                <span class="model-stepper__badge">1</span>
                <span class="model-stepper__title">Type et matricule</span>
              </button>
              <button
                type="button"
                class="model-stepper__step"
                data-company-contact-step="2"
                role="tab"
                aria-selected="false"
                aria-controls="companyContactStepPanel2"
                id="companyContactStepLabel2"
                tabindex="-1"
              >
                <span class="model-stepper__badge">2</span>
                <span class="model-stepper__title">Coordonnees</span>
              </button>
              <button
                type="button"
                class="model-stepper__step"
                data-company-contact-step="3"
                role="tab"
                aria-selected="false"
                aria-controls="companyContactStepPanel3"
                id="companyContactStepLabel3"
                tabindex="-1"
              >
                <span class="model-stepper__badge">3</span>
                <span class="model-stepper__title">Branding</span>
              </button>
            </div>

            <div class="model-stepper__panels">
              <section
                class="model-stepper__panel is-active"
                data-company-contact-step-panel="1"
                id="companyContactStepPanel1"
                role="tabpanel"
                aria-labelledby="companyContactStepLabel1"
              >
                <div class="company-modal__row">
                  <div class="company-modal__field">
                    <label class="full client-type-field doc-type-field">
                      <span id="companyTypeLabel" class="label-text">Type de l'entreprise</span>
                      <div class="client-type-field__controls doc-type-field__controls">
                        <details id="companyTypeMenu" class="field-toggle-menu client-type-menu doc-type-menu">
                          <summary
                            class="btn success field-toggle-trigger"
                            role="button"
                            aria-haspopup="listbox"
                            aria-expanded="false"
                            aria-labelledby="companyTypeLabel companyTypeDisplay"
                          >
                            <span id="companyTypeDisplay">Societe / personne morale (PM)</span>
                            <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                          </summary>
                          <div
                            id="companyTypePanel"
                            class="field-toggle-panel model-select-panel client-type-panel doc-type-panel"
                            role="listbox"
                            aria-labelledby="companyTypeLabel"
                          >
                            <button
                              type="button"
                              class="model-select-option is-active"
                              data-company-type-option="societe"
                              role="option"
                              aria-selected="true"
                            >
                              Societe / personne morale (PM)
                            </button>
                            <button
                              type="button"
                              class="model-select-option"
                              data-company-type-option="personne_physique"
                              role="option"
                              aria-selected="false"
                            >
                            Personne physique (PP)
                            </button>
                          </div>
                        </details>
                        <select id="companyType" class="client-type-select doc-type-select" aria-hidden="true" tabindex="-1">
                          <option value="societe" selected>Societe / personne morale (PM)</option>
                          <option value="personne_physique">Personne physique (PP)</option>
                        </select>
                      </div>
                    </label>
                  </div>
                </div>
                <div class="company-modal__row">
                  <div class="company-modal__field">
                    <span class="label-text">Matricule fiscal</span>
                    <div class="company-modal__mf-grid" role="group" aria-label="Matricule fiscal">
                      <label class="company-modal__mf-item">
                        <span class="company-modal__mf-label">Identifiant unique</span>
                        <input id="companyModalMfIdentifiant" inputmode="numeric" maxlength="7" autocomplete="off" />
                      </label>
                      <label class="company-modal__mf-item">
                        <span class="company-modal__mf-label">Clef controle</span>
                        <input id="companyModalMfKey" maxlength="1" autocomplete="off" />
                      </label>
                      <label class="company-modal__mf-item">
                        <span class="company-modal__mf-label">Code TVA %</span>
                        <input id="companyModalMfCodeTva" maxlength="1" autocomplete="off" />
                      </label>
                      <label class="company-modal__mf-item">
                        <span class="company-modal__mf-label">Code categorie</span>
                        <input id="companyModalMfCategory" maxlength="1" autocomplete="off" />
                      </label>
                      <label class="company-modal__mf-item">
                        <span class="company-modal__mf-label">Etablissement</span>
                        <input id="companyModalMfEstablishment" inputmode="numeric" maxlength="3" autocomplete="off" />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <section
                class="model-stepper__panel"
                data-company-contact-step-panel="2"
                id="companyContactStepPanel2"
                role="tabpanel"
                aria-labelledby="companyContactStepLabel2"
                hidden
              >
                <div class="company-modal__row">
                  <div class="company-modal__field">
                    <label for="companyModalCustomsCode" class="label-text">Code en douane</label>
                    <input id="companyModalCustomsCode" autocomplete="off" />
                  </div>
                  <div class="company-modal__field">
                    <label for="companyModalIban" class="label-text">IBAN</label>
                    <input id="companyModalIban" autocomplete="off" />
                  </div>
                </div>
                <div class="company-modal__field">
                  <div class="company-modal__field-head">
                    <label for="companyModalPhonePrimary" class="label-text">Telephone(s)</label>
                    <button
                      type="button"
                      id="companyModalPhoneAdd"
                      class="btn success tiny model-stepper__nav model-stepper__nav--next better-style"
                    >
                      + Ajouter un numero
                    </button>
                  </div>
                  <div id="companyModalPhones" class="company-phone-list">
                    <div class="company-phone-item" data-phone-index="0">
                      <input id="companyModalPhoneCodePrimary" type="tel" class="company-phone-code" autocomplete="off" value="+216" />
                      <input id="companyModalPhonePrimary" type="tel" class="company-phone-input" autocomplete="off" />
                    </div>
                  </div>
                </div>
                <div class="company-modal__field">
                  <label for="companyModalEmail" class="label-text">E-mail</label>
                  <input id="companyModalEmail" type="email" autocomplete="off" />
                </div>
                <div class="company-modal__field">
                  <span class="label-text">Adresse</span>
                  <div class="company-modal__address-grid">
                    <label class="company-modal__address-item">
                      <span class="company-modal__mf-label">Rue</span>
                      <input id="companyModalAddressStreet" autocomplete="off" />
                    </label>
                    <label class="company-modal__address-item">
                      <span class="company-modal__mf-label">Code postal</span>
                      <input id="companyModalAddressPostal" autocomplete="off" />
                    </label>
                    <label class="company-modal__address-item">
                      <span class="company-modal__mf-label">Ville</span>
                      <input id="companyModalAddressCity" autocomplete="off" />
                    </label>
                  </div>
                </div>
              </section>

              <section
                class="model-stepper__panel"
                data-company-contact-step-panel="3"
                id="companyContactStepPanel3"
                role="tabpanel"
                aria-labelledby="companyContactStepLabel3"
                hidden
              >
                <div class="company-branding-block">
                  <div class="company-modal__field company-branding-column">
                    <span class="label-text">Logo de l'entreprise</span>
                    <div class="company-logo-actions">
                      <div class="company-branding-controls">
                        <button
                          id="btnPickLogo"
                          type="button"
                          class="btn icon-btn"
                          title="Joindre un logo"
                          aria-label="Joindre un logo"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M4 17v-3a4 4 0 0 1 4-4h1v2H8a2 2 0 0 0-2 2v3h12v-3a2 2 0 0 0-2-2h-1v-2h1a4 4 0 0 1 4 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" fill="currentColor"/>
                            <path d="M12 3a1 1 0 0 1 1 1v8h-2V4a1 1 0 0 1 1-1Z" fill="currentColor"/>
                            <path d="m9.5 9.5 2.5-2.5 2.5 2.5-2.5 2.5z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          id="btnDeleteLogo"
                          type="button"
                          class="btn ghost company-logo-delete"
                          title="Supprimer le logo"
                          aria-label="Supprimer le logo"
                        >
                          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="16" height="16">
                            <path d="M16 1.75V3h5.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H8V1.75C8 .784 8.784 0 9.75 0h4.5C15.216 0 16 .784 16 1.75Zm-6.5 0V3h5V1.75a.25.25 0 0 0-.25-.25h-4.5a.25.25 0 0 0-.25.25ZM4.997 6.178a.75.75 0 1 0-1.493.144L4.916 20.92a1.75 1.75 0 0 0 1.742 1.58h10.684a1.75 1.75 0 0 0 1.742-1.581l1.413-14.597a.75.75 0 0 0-1.494-.144l-1.412 14.596a.25.25 0 0 1-.249.226H6.658a.25.25 0 0 1-.249-.226L4.997 6.178Z"></path>
                            <path d="M9.206 7.501a.75.75 0 0 1 .793.705l.5 8.5A.75.75 0 1 1 9 16.794l-.5-8.5a.75.75 0 0 1 .705-.793Zm6.293.793A.75.75 0 1 0 14 8.206l-.5 8.5a.75.75 0 0 0 1.498.088l.5-8.5Z"></path>
                          </svg>
                        </button>
                      </div>
                      <div class="company-logo-preview" id="companyLogoPreview">
                        <span class="company-logo-preview__placeholder">Aucun logo</span>
                      </div>
                    </div>
                  </div>
                  <div class="company-modal__field company-branding-column">
                    <span class="label-text">Cachet de l'entreprise</span>
                      <div class="company-seal-actions">
                      <div class="company-branding-controls">
                        <button
                          id="btnPickSeal"
                          type="button"
                          class="btn icon-btn"
                          title="Joindre un cachet"
                          aria-label="Joindre un cachet"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M5 15.5A3.5 3.5 0 0 1 8.5 12H11V6.5a1 1 0 0 1 2 0V12h2.5A3.5 3.5 0 0 1 19 15.5V17H5Z" fill="currentColor"/>
                            <path d="M5 18h14v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          id="btnRotateSeal"
                          type="button"
                          class="btn ghost company-seal-rotate"
                          title="Pivoter le cachet de 90&deg;"
                          aria-label="Pivoter le cachet de 90 degres"
                          disabled
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 5V3l-4 3 4 3V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          id="btnDeleteSeal"
                          type="button"
                          class="btn ghost company-seal-delete"
                          title="Supprimer le cachet"
                          aria-label="Supprimer le cachet"
                          disabled
                        >
                          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M16 1.75V3h5.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H8V1.75C8 .784 8.784 0 9.75 0h4.5C15.216 0 16 .784 16 1.75Zm-6.5 0V3h5V1.75a.25.25 0 0 0-.25-.25h-4.5a.25.25 0 0 0-.25.25ZM4.997 6.178a.75.75 0 1 0-1.493.144L4.916 20.92a1.75 1.75 0 0 0 1.742 1.58h10.684a1.75 1.75 0 0 0 1.742-1.581l1.413-14.597a.75.75 0 0 0-1.494-.144l-1.412 14.596a.25.25 0 0 1-.249.226H6.658a.25.25 0 0 1-.249-.226L4.997 6.178Z"></path>
                            <path d="M9.206 7.501a.75.75 0 0 1 .793.705l.5 8.5A.75.75 0 1 1 9 16.794l-.5-8.5a.75.75 0 0 1 .705-.793Zm6.293.793A.75.75 0 1 0 14 8.206l-.5 8.5a.75.75 0 0 0 1.498.088l.5-8.5Z"></path>
                          </svg>
                        </button>
                      </div>
                      <div class="company-seal-preview" id="companySealPreview" data-placeholder="Aucun cachet">
                        <span class="company-seal-preview__placeholder">Aucun cachet</span>
                      </div>
                    </div>
                  </div>
                  <div class="company-modal__field company-branding-column">
                    <span class="label-text">Signature</span>
                    <div class="company-signature-actions">
                      <div class="company-branding-controls">
                        <button
                          id="btnPickSignature"
                          type="button"
                          class="btn icon-btn"
                          title="Joindre une signature"
                          aria-label="Joindre une signature"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M4 17.5c2.5-2 4-3.5 5-5 .8-1.1 1.5-1.9 2.3-2.4.7-.5 1.5-.7 2.3-.6 1.4.2 2.6 1.2 4.4 3 .5.5.5 1.3 0 1.8l-.2.2a1.2 1.2 0 0 1-1.6 0l-1.3-1.2c-.4-.3-.9-.3-1.2.1l-1.8 2c-.5.6-1.3.9-2 .9H4Z" fill="currentColor"/>
                            <path d="M4 19h16v1H4Z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          id="btnRotateSignature"
                          type="button"
                          class="btn ghost company-seal-rotate"
                          title="Pivoter la signature de 90&deg;"
                          aria-label="Pivoter la signature de 90 degres"
                          disabled
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 5V3l-4 3 4 3V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          id="btnDeleteSignature"
                          type="button"
                          class="btn ghost company-signature-delete"
                          title="Supprimer la signature"
                          aria-label="Supprimer la signature"
                          disabled
                        >
                          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M16 1.75V3h5.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H8V1.75C8 .784 8.784 0 9.75 0h4.5C15.216 0 16 .784 16 1.75Zm-6.5 0V3h5V1.75a.25.25 0 0 0-.25-.25h-4.5a.25.25 0 0 0-.25.25ZM4.997 6.178a.75.75 0 1 0-1.493.144L4.916 20.92a1.75 1.75 0 0 0 1.742 1.58h10.684a1.75 1.75 0 0 0 1.742-1.581l1.413-14.597a.75.75 0 0 0-1.494-.144l-1.412 14.596a.25.25 0 0 1-.249.226H6.658a.25.25 0 0 0-.249-.226L4.997 6.178Z"></path>
                            <path d="M9.206 7.501a.75.75 0 0 1 .793.705l.5 8.5A.75.75 0 1 1 9 16.794l-.5-8.5a.75.75 0 0 1 .705-.793Zm6.293.793A.75.75 0 1 0 14 8.206l-.5 8.5a.75.75 0 0 0 1.498.088l.5-8.5Z"></path>
                          </svg>
                        </button>
                      </div>
                      <div class="company-seal-preview" id="companySignaturePreview" data-placeholder="Aucune signature">
                        <span class="company-seal-preview__placeholder">Aucune signature</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </form>
        <div class="swbDialog__actions company-modal__actions model-stepper__controls" aria-label="Navigation entre les etapes des coordonnees">
          <div class="swbDialog__group swbDialog__group--left model-stepper__actions-left">
            <button id="companyContactModalCancel" type="button" class="btn ghost tiny model-stepper__nav model-stepper__cancel better-style">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right model-stepper__actions-right">
            <button
              id="companyContactModalPrev"
              type="button"
              class="btn ghost tiny model-stepper__nav model-stepper__nav--prev better-style"
              data-company-contact-step-prev
              aria-label="Aller a l'etape precedente"
              disabled
            >
              Pr&eacute;c&eacute;dent
            </button>
            <button
              id="companyContactModalNext"
              type="button"
              class="btn success tiny model-stepper__nav model-stepper__nav--next better-style"
              data-company-contact-step-next
              aria-label="Aller a l'etape suivante"
            >
              Suivant
            </button>
            <button
              id="companyContactModalSave"
              type="submit"
              form="companyContactModalForm"
              class="btn success tiny model-stepper__nav model-stepper__nav--next better-style"
              data-company-contact-step-save
              aria-hidden="false"
              disabled
            >
              Mettre a jour
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="companySmtpModal" class="swbDialog smtp-modal" hidden aria-hidden="true">
      <div class="swbDialog__panel smtp-modal__panel" role="dialog" aria-modal="true" aria-labelledby="companySmtpModalTitle">
        <div class="swbDialog__header">
          <div id="companySmtpModalTitle" class="swbDialog__title">Options SMTP</div>
          <button id="companySmtpModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <form id="companySmtpModalForm" class="smtp-modal__body swbDialog__msg" novalidate>
          <label class="smtp-modal__toggle">
            <input id="companySmtpEnabled" type="checkbox" />
            <span>Activer l'envoi SMTP</span>
          </label>
          <div class="doc-type-field smtp-preset-picker">
            <label for="companySmtpPresetSelect" id="companySmtpPresetLabel" class="model-save-dot">Preset</label>
            <div class="doc-type-field__controls doc-type-field__controls--inline">
              <details id="companySmtpPresetMenu" class="field-toggle-menu doc-type-menu smtp-preset-menu">
                <summary
                  class="btn success field-toggle-trigger"
                  role="button"
                  aria-haspopup="listbox"
                  aria-expanded="false"
                  aria-labelledby="companySmtpPresetLabel companySmtpPresetDisplay"
                >
                  <span id="companySmtpPresetDisplay" class="model-select-display">Email professionnel</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                </summary>
                <div
                  id="companySmtpPresetPanel"
                  class="field-toggle-panel model-select-panel"
                  role="listbox"
                  aria-labelledby="companySmtpPresetLabel"
                >
                  <button
                    type="button"
                    class="model-select-option is-active"
                    data-value="professional"
                    role="option"
                    aria-selected="true"
                  >
                    Email professionnel
                  </button>
                  <button
                    type="button"
                    class="model-select-option"
                    data-value="gmail"
                    role="option"
                    aria-selected="false"
                  >
                    Gmail
                  </button>
                </div>
              </details>
              <select id="companySmtpPresetSelect" class="model-select doc-type-select" aria-hidden="true" tabindex="-1">
                <option value="professional" selected>Email professionnel</option>
                <option value="gmail">Gmail</option>
              </select>
            </div>
          </div>
          <div class="smtp-modal__row">
            <div class="smtp-modal__field">
              <label for="companySmtpHost" class="label-text">Serveur SMTP</label>
              <input id="companySmtpHost" autocomplete="off" placeholder="smtp.exemple.com" />
            </div>
            <div class="smtp-modal__field smtp-modal__field--port">
              <label for="companySmtpPort" class="label-text">Port</label>
              <input id="companySmtpPort" type="number" inputmode="numeric" min="1" placeholder="587" />
            </div>
          </div>
          <label class="smtp-modal__toggle">
            <input id="companySmtpSecure" type="checkbox" />
            <span>Utiliser SSL/TLS</span>
          </label>
          <div class="smtp-modal__row">
            <div class="smtp-modal__field">
              <label for="companySmtpUser" class="label-text">Utilisateur</label>
              <input id="companySmtpUser" autocomplete="off" />
            </div>
            <div class="smtp-modal__field">
              <label for="companySmtpPass" class="label-text">Mot de passe</label>
              <div class="smtp-modal__password">
                <input id="companySmtpPass" type="password" autocomplete="new-password" />
                <button
                  id="companySmtpPassToggle"
                  type="button"
                  class="smtp-modal__password-toggle"
                  aria-label="Afficher le mot de passe"
                  aria-pressed="false"
                >
                  <span class="smtp-modal__password-icon smtp-modal__password-icon--show" aria-hidden="true">
                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 576 512" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path d="M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z"></path></svg>
                  </span>
                  <span class="smtp-modal__password-icon smtp-modal__password-icon--hide" aria-hidden="true">
                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path d="M634 471L36 3.51A16 16 0 0 0 13.51 6l-10 12.49A16 16 0 0 0 6 41l598 467.49a16 16 0 0 0 22.49-2.49l10-12.49A16 16 0 0 0 634 471zM296.79 146.47l134.79 105.38C429.36 191.91 380.48 144 320 144a112.26 112.26 0 0 0-23.21 2.47zm46.42 219.07L208.42 260.16C210.65 320.09 259.53 368 320 368a113 113 0 0 0 23.21-2.46zM320 112c98.65 0 189.09 55 237.93 144a285.53 285.53 0 0 1-44 60.2l37.74 29.5a333.7 333.7 0 0 0 52.9-75.11 a32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64c-36.7 0-71.71 7-104.63 18.81l46.41 36.29c18.94-4.3 38.34-7.1 58.22-7.1zm0 288c-98.65 0-189.08-55-237.93-144a285.47 285.47 0 0 1 44.05-60.19l-37.74-29.5a333.6 333.6 0 0 0-52.89 75.1 32.35 32.35 0 0 0 0 29.19C89.72 376.41 197.08 448 320 448c36.7 0 71.71-7.05 104.63-18.81l-46.41-36.28C359.28 397.2 339.89 400 320 400z"></path></svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div class="smtp-modal__row">
            <div class="smtp-modal__field">
              <label for="companySmtpFromName" class="label-text">Nom expediteur</label>
              <input id="companySmtpFromName" autocomplete="off" />
            </div>
            <div class="smtp-modal__field">
              <label for="companySmtpFromEmail" class="label-text">E-mail expediteur</label>
              <input id="companySmtpFromEmail" type="email" autocomplete="off" />
            </div>
          </div>
          <p class="smtp-modal__hint">L'adresse expediteur doit correspondre au compte SMTP.</p>
        </form>
        <div class="swbDialog__actions smtp-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="companySmtpModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
            <button id="companySmtpModalTest" type="button" class="swbDialog__cancel">Tester SMTP</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="companySmtpModalSave" type="submit" form="companySmtpModalForm" class="swbDialog__ok">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>

    <div id="companyLanServerModal" class="swbDialog server-modal" hidden aria-hidden="true">
      <div class="swbDialog__panel server-modal__panel" role="dialog" aria-modal="true" aria-labelledby="companyLanServerModalTitle">
        <div class="swbDialog__header">
          <div id="companyLanServerModalTitle" class="swbDialog__title">Options serveur LAN</div>
          <button id="companyLanServerModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <form id="companyLanServerModalForm" class="server-modal__body swbDialog__msg" novalidate>
          <div class="server-modal__toggle-row">
            <label class="server-modal__toggle">
              <input id="companyLanServerEnabled" type="checkbox" />
              <span>Activer le serveur LAN</span>
            </label>
            <label class="server-modal__toggle">
              <input id="companyLanServerRedirectHttp80" type="checkbox" />
              <span>Autoriser l'URL sans port (HTTP :80)</span>
            </label>
          </div>
          <div class="server-modal__row">
            <div class="server-modal__field server-modal__field--port">
              <label for="companyLanServerPort" class="label-text">Port</label>
              <input id="companyLanServerPort" type="number" inputmode="numeric" min="1" max="65535" placeholder="8080" />
            </div>
            <div class="server-modal__field">
              <label class="label-text">Adresse</label>
              <div id="companyLanServerUrlList" class="server-modal__url-list"></div>
            </div>
          </div>
          <p id="companyLanServerAlias" class="server-modal__hint">Alias mDNS: facturance.local</p>
          <p id="companyLanServerStatus" class="server-modal__status"></p>
          <p id="companyLanServerRedirectStatus" class="server-modal__status"></p>
          <p class="server-modal__hint">Ouvrez cette adresse sur les autres PC du meme reseau.</p>
        </form>
        <div class="swbDialog__actions server-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="companyLanServerModalCancel" type="button" class="swbDialog__cancel">Fermer</button>
            <button id="companyLanServerCopyUrl" type="button" class="swbDialog__cancel">Copier URL</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="companyLanServerModalSave" type="submit" form="companyLanServerModalForm" class="swbDialog__ok">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>

    ${renderSignatureModal()}

    <div id="fournisseurSavedModal" class="swbDialog client-saved-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel client-saved-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientSavedModalTitle"
      >
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="clientSavedModalTitle" class="swbDialog__title">Fournisseurs enregistr&eacute;s</div>
            <button
              id="clientSavedModalRefresh"
              type="button"
              class="btn ghost doc-history-modal__refresh"
              aria-label="Rafraichir les clients enregistr├⌐s"
            >
              <svg
                class="doc-history-modal__refresh-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4.5 10.5a7 7 0 0 1 12-3.5l1 1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19.5 13.5a7 7 0 0 1-12 3.5l-1-1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18 5v4h-4" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M6 19v-4h4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <button id="clientSavedModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-saved-modal__body swbDialog__msg">
          <div class="client-saved-modal__search article-saved-modal__search article-search client-search">
            <div class="client-search__controls">
              <label class="client-search__field">
                <input
                  id="clientSavedSearch"
                  type="search"
                  placeholder="Rechercher un client enregistre"
                  autocomplete="off"
                />
                <button
                  id="clientSavedSearchBtn"
                  type="button"
                  class="client-search__action"
                  aria-label="Rechercher un client enregistre"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
                  </svg>
                </button>
              </label>
            </div>
            ${renderClientFormPopover()}
            ${renderFournisseurFormPopover({ includeParticulier: true })}
          </div>
          <div id="clientSavedModalList" class="client-saved-modal__list" role="list"></div>
          <p id="clientSavedModalStatus" class="client-saved-modal__status" aria-live="polite"></p>
        </div>
        <div class="client-saved-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left">
            <button id="clientSavedModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager">
            <button id="clientSavedModalPrev" type="button" class="client-search__edit">Pr&eacute;c&eacute;dent</button>
            <span id="clientSavedModalPage" class="client-saved-modal__page" aria-live="polite">
              Page
              <input
                id="clientSavedModalPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input"
              />
              /
              <span id="clientSavedModalTotalPages">1</span>
            </span>
            <button id="clientSavedModalNext" type="button" class="client-search__add">Suivant</button>
          </div>
        </div>
      </div>
    </div>

    <div id="depotMagasinSavedModal" class="swbDialog client-saved-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel client-saved-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="depotMagasinSavedModalTitle"
      >
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="depotMagasinSavedModalTitle" class="swbDialog__title">D&eacute;p&ocirc;ts/Magasins enregistr&eacute;s</div>
            <button
              id="depotMagasinSavedModalRefresh"
              type="button"
              class="btn ghost doc-history-modal__refresh"
              aria-label="Rafraichir les depots/magasins enregistres"
            >
              <svg
                class="doc-history-modal__refresh-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4.5 10.5a7 7 0 0 1 12-3.5l1 1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19.5 13.5a7 7 0 0 1-12 3.5l-1-1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18 5v4h-4" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M6 19v-4h4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <button id="depotMagasinSavedModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-saved-modal__body swbDialog__msg">
          <div class="client-saved-modal__search article-saved-modal__search article-search client-search">
            <div class="client-search__controls">
              <label class="client-search__field">
                <input
                  id="depotMagasinSavedSearch"
                  type="search"
                  placeholder="Rechercher un depot/magasin enregistre"
                  autocomplete="off"
                />
                <button
                  id="depotMagasinSavedSearchBtn"
                  type="button"
                  class="client-search__action"
                  aria-label="Rechercher un depot/magasin enregistre"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
                  </svg>
                </button>
              </label>
            </div>
          </div>
          <div id="depotMagasinSavedModalList" class="client-saved-modal__list" role="list"></div>
          <p id="depotMagasinSavedModalStatus" class="client-saved-modal__status" aria-live="polite"></p>
        </div>
        <div class="client-saved-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left">
            <button id="depotMagasinSavedModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager">
            <button id="depotMagasinSavedModalPrev" type="button" class="client-search__edit">Pr&eacute;c&eacute;dent</button>
            <span id="depotMagasinSavedModalPage" class="client-saved-modal__page" aria-live="polite">
              Page
              <input
                id="depotMagasinSavedModalPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input"
              />
              /
              <span id="depotMagasinSavedModalTotalPages">1</span>
            </span>
            <button id="depotMagasinSavedModalNext" type="button" class="client-search__add">Suivant</button>
          </div>
        </div>
      </div>
    </div>

    <div id="clientImportModal" class="swbDialog client-import-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel client-import-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientImportModalTitle"
        aria-describedby="clientImportHint"
      >
        <div class="swbDialog__header">
          <div id="clientImportModalTitle" class="swbDialog__title">Importer des clients</div>
          <button id="clientImportModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-import-modal__body swbDialog__msg">
          <p id="clientImportHint" class="client-import-modal__hint">
            Selectionnez un fichier Excel (XLSX) ou CSV contenant plusieurs clients.
            Colonnes acceptees : Nom, Matricule fiscal (ou CIN / passeport), Type (Societe / personne morale (PM), Personne physique (PP), Particulier), Solde client initial, Telephone, Email, Adresse, Au profit de, Pour le compte de, Ref STEG.
          </p>
          <div class="client-import-modal__example" aria-hidden="true">
            <div class="client-import-modal__example-title">Exemple</div>
            <div class="client-import-modal__example-row">
              <div class="client-import-modal__example-actions">
                <span class="client-search__detail-copy" role="button" tabindex="0" aria-label="Copier l'entete" title="Copier l'entete" data-doc-history-copy="document" data-client-import-copy>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"></path>
                  </svg>
                </span>
              </div>
              <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Matricule fiscal (ou CIN / passeport)</th>
                      <th>Type</th>
                      <th data-client-field="soldClient">
                        <span data-client-field-label="soldClient">Solde client initial</span>
                      </th>
                      <th>Telephone</th>
                      <th>Email</th>
                      <th>Adresse</th>
                      <th data-client-field="benefit">
                        <span data-client-field-label="benefit">Au profit de</span>
                      </th>
                      <th data-client-field="account">
                        <span data-client-field-label="account">Pour le compte de</span>
                      </th>
                      <th data-client-field="stegRef">
                        <span data-client-field-label="stegRef">Ref STEG</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sarl Demo</td>
                      <td>IF123456</td>
                      <td>Societe / personne morale (PM)</td>
                      <td data-client-field="soldClient">1000</td>
                      <td>0612345678</td>
                      <td>demo@exemple.com</td>
                      <td>12 Rue Exemple, Casablanca</td>
                      <td data-client-field="benefit">Beneficiaire Demo</td>
                      <td data-client-field="account">Compte Demo</td>
                      <td data-client-field="stegRef">STEG-001</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="client-import-modal__note">
            <div class="client-import-modal__note-title">Note : le type doit etre uniquement :</div>
            <ul class="client-import-modal__note-list">
              <li>
                <span class="client-import-modal__note-item">
                  Societe / personne morale (PM)
                  <span class="client-search__detail-copy" role="button" tabindex="0" aria-label="Copier N&deg; de facture" title="Copier N&deg; de facture" data-doc-history-copy="document" data-doc-history-copy-value="Societe / personne morale (PM)">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"></path>
                    </svg>
                  </span>
                </span>
              </li>
              <li>
                <span class="client-import-modal__note-item">
                  Personne physique (PP)
                  <span class="client-search__detail-copy" role="button" tabindex="0" aria-label="Copier N&deg; de facture" title="Copier N&deg; de facture" data-doc-history-copy="document" data-doc-history-copy-value="Personne physique (PP)">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"></path>
                    </svg>
                  </span>
                </span>
              </li>
              <li>
                <span class="client-import-modal__note-item">
                  Particulier
                  <span class="client-search__detail-copy" role="button" tabindex="0" aria-label="Copier N&deg; de facture" title="Copier N&deg; de facture" data-doc-history-copy="document" data-doc-history-copy-value="Particulier">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"></path>
                    </svg>
                  </span>
                </span>
              </li>
            </ul>
          </div>
          <label class="client-import-modal__file">
            <span class="client-import-modal__label">Fichier</span>
            <input id="clientImportFile" type="file" accept=".xlsx,.xls,.csv" />
          </label>
          <div id="clientImportSummary" class="client-import-modal__summary" aria-live="polite"></div>
          <ul id="clientImportErrors" class="client-import-modal__errors" aria-live="polite"></ul>
        </div>
        <div class="swbDialog__actions client-import-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="clientImportModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="clientImportModalSave" type="button" class="swbDialog__ok" disabled>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>

    <div id="articleImportModal" class="swbDialog client-import-modal article-import-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel client-import-modal__panel article-import-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="articleImportModalTitle"
        aria-describedby="articleImportHint"
      >
        <div class="swbDialog__header">
          <div id="articleImportModalTitle" class="swbDialog__title">Importer des articles</div>
          <button id="articleImportModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-import-modal__body swbDialog__msg">
          <p id="articleImportHint" class="client-import-modal__hint">
            Selectionnez un fichier Excel (XLSX) ou CSV contenant plusieurs articles.
            Colonnes acceptees : Reference, Designation, Description, Unite, Stock, PU A. HT, TVA A., Remise A., P.U. HT, TVA, Remise, Autoriser stock negatif, Bloquer sortie stock insuffisant, Alerte stock, Stock minimum, Stock maximum, Stock Depots JSON, FODEC V., Taux FODEC V., TVA FODEC V., FODEC A., Taux FODEC A., TVA FODEC A.
          </p>
          <div class="client-import-modal__example" aria-hidden="true">
            <div class="client-import-modal__example-title">Exemple</div>
            <div class="client-import-modal__example-row">
              <div class="client-import-modal__example-actions">
                <span class="client-search__detail-copy" role="button" tabindex="0" aria-label="Copier l'entete" title="Copier l'entete" data-doc-history-copy="document" data-article-import-copy data-doc-history-copy-value="Reference&#9;Designation&#9;Desc.&#9;Unite&#9;Stock disp.&#9;PU A. HT&#9;TVA A.&#9;Remise A.&#9;P.U. HT&#9;TVA %&#9;Remise %&#9;Autoriser stock negatif&#9;Bloquer sortie stock insuffisant&#9;Alerte stock&#9;Stock minimum&#9;Stock maximum&#9;Stock Depots JSON&#9;FODEC V.&#9;Taux FODEC V.&#9;TVA FODEC V.&#9;FODEC A.&#9;Taux FODEC A.&#9;TVA FODEC A.">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"></path>
                  </svg>
                </span>
              </div>
              <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
                <table>
                  <thead>
                    <tr>
                      <th data-article-import-field="ref">
                        <span class="article-import-header" data-article-import-header="ref" data-article-field-label="ref">Reference</span>
                      </th>
                      <th data-article-import-field="product">
                        <span class="article-import-header" data-article-import-header="product" data-article-field-label="product">Designation</span>
                      </th>
                      <th data-article-import-field="desc">
                        <span class="article-import-header" data-article-import-header="desc" data-article-field-label="desc">Desc.</span>
                      </th>
                      <th data-article-import-field="unit">
                        <span class="article-import-header" data-article-import-header="unit" data-article-field-label="unit">Unite</span>
                      </th>
                      <th data-article-import-field="stockQty">
                        <span class="article-import-header" data-article-import-header="stockQty" data-article-field-label="stockQty">Stock disp.</span>
                      </th>
                      <th data-article-import-field="purchasePrice">
                        <span class="article-import-header" data-article-import-header="purchasePrice" data-article-field-label="purchasePrice">PU A. HT</span>
                      </th>
                      <th data-article-import-field="purchaseTva">
                        <span class="article-import-header" data-article-import-header="purchaseTva" data-article-field-label="purchaseTva">TVA A.</span>
                      </th>
                      <th data-article-import-field="purchaseDiscount">
                        <span class="article-import-header" data-article-import-header="purchaseDiscount" data-article-field-label="purchaseDiscount">Remise A.</span>
                      </th>
                      <th data-article-import-field="price">
                        <span class="article-import-header" data-article-import-header="price" data-article-field-label="price">P.U. HT</span>
                      </th>
                      <th data-article-import-field="tva">
                        <span class="article-import-header" data-article-import-header="tva" data-article-field-label="tva">TVA %</span>
                      </th>
                      <th data-article-import-field="discount">
                        <span class="article-import-header" data-article-import-header="discount" data-article-field-label="discount">Remise %</span>
                      </th>
                      <th data-article-import-field="stockAllowNegative">
                        <span class="article-import-header" data-article-import-header="stockAllowNegative">Autoriser stock negatif</span>
                      </th>
                      <th data-article-import-field="stockBlockInsufficient">
                        <span class="article-import-header" data-article-import-header="stockBlockInsufficient">Bloquer sortie stock insuffisant</span>
                      </th>
                      <th data-article-import-field="stockAlertEnabled">
                        <span class="article-import-header" data-article-import-header="stockAlertEnabled">Alerte stock</span>
                      </th>
                      <th data-article-import-field="stockMin">
                        <span class="article-import-header" data-article-import-header="stockMin">Stock minimum</span>
                      </th>
                      <th data-article-import-field="stockMax">
                        <span class="article-import-header" data-article-import-header="stockMax">Stock maximum</span>
                      </th>
                      <th data-article-import-field="stockDepotsJson">
                        <span class="article-import-header" data-article-import-header="stockDepotsJson">Stock Depots JSON</span>
                      </th>
                      <th data-article-import-field="fodec">
                        <span class="article-import-header" data-article-import-header="fodec" data-article-field-label="fodecSale">FODEC V.</span>
                      </th>
                      <th data-article-import-field="fodecRate">
                        <span class="article-import-header" data-article-import-header="fodecRate" data-article-field-label="fodecRate">Taux FODEC V.</span>
                      </th>
                      <th data-article-import-field="fodecTva">
                        <span class="article-import-header" data-article-import-header="fodecTva" data-article-field-label="fodecTva">TVA FODEC V.</span>
                      </th>
                      <th data-article-import-field="purchaseFodecEnabled">
                        <span class="article-import-header" data-article-import-header="purchaseFodecEnabled" data-article-field-label="fodecPurchase">FODEC A.</span>
                      </th>
                      <th data-article-import-field="purchaseFodecRate">
                        <span class="article-import-header" data-article-import-header="purchaseFodecRate" data-article-field-label="purchaseFodecRate">Taux FODEC A.</span>
                      </th>
                      <th data-article-import-field="purchaseFodecTva">
                        <span class="article-import-header" data-article-import-header="purchaseFodecTva" data-article-field-label="purchaseFodecTva">TVA FODEC A.</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td data-article-import-field="ref">SRV-001</td>
                      <td data-article-import-field="product">Usinage</td>
                      <td data-article-import-field="desc">Service de tournage</td>
                      <td data-article-import-field="unit">pcs</td>
                      <td data-article-import-field="stockQty">10</td>
                      <td data-article-import-field="purchasePrice">80</td>
                      <td data-article-import-field="purchaseTva">19</td>
                      <td data-article-import-field="purchaseDiscount">2</td>
                      <td data-article-import-field="price">120</td>
                      <td data-article-import-field="tva">19</td>
                      <td data-article-import-field="discount">0</td>
                      <td data-article-import-field="stockAllowNegative">0</td>
                      <td data-article-import-field="stockBlockInsufficient">1</td>
                      <td data-article-import-field="stockAlertEnabled">1</td>
                      <td data-article-import-field="stockMin">2</td>
                      <td data-article-import-field="stockMax">30</td>
                      <td data-article-import-field="stockDepotsJson">{"v":1,"activeTabId":"depot-1","customized":false,"tabs":[{"id":"depot-1","stockQty":10}]}</td>
                      <td data-article-import-field="fodec">1</td>
                      <td data-article-import-field="fodecRate">1</td>
                      <td data-article-import-field="fodecTva">19</td>
                      <td data-article-import-field="purchaseFodecEnabled">1</td>
                      <td data-article-import-field="purchaseFodecRate">1</td>
                      <td data-article-import-field="purchaseFodecTva">19</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <p class="client-import-modal__note">
            Note : si FODEC V. = 1, les valeurs Taux FODEC V. et TVA FODEC V. seront utilisees. Si FODEC A. = 1, les valeurs Taux FODEC A. et TVA FODEC A. seront utilisees.
          </p>
          <p class="client-import-modal__note">
            Note : un article doit avoir Reference, Designation ou Description. Sinon, la ligne sera ignoree. Unicite : Reference prioritaire, sinon Designation.
          </p>
          <label class="client-import-modal__file">
            <span class="client-import-modal__label">Fichier</span>
            <input id="articleImportFile" type="file" accept=".xlsx,.xls,.csv" />
          </label>
          <div id="articleImportSummary" class="client-import-modal__summary" aria-live="polite"></div>
          <ul id="articleImportErrors" class="client-import-modal__errors" aria-live="polite"></ul>
        </div>
        <div class="swbDialog__actions client-import-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="articleImportModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="articleImportModalSave" type="button" class="swbDialog__ok" disabled>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>

    <div id="articlesExportModal" class="swbDialog client-export-modal" hidden aria-hidden="true" aria-busy="false">
      <div
        class="swbDialog__panel client-export-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="articlesExportModalTitle"
      >
        <div class="swbDialog__header">
          <div id="articlesExportModalTitle" class="swbDialog__title">Exporter des articles</div>
          <button type="button" class="swbDialog__close" id="articlesExportModalClose" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="client-export-modal__body swbDialog__msg">
          <div class="client-export-modal__preview">
            <div class="client-export-modal__preview-title">Exemple d&apos;aper&ccedil;u des donn&eacute;es qui seront export&eacute;es.</div>
            <div class="client-import-modal__example-table client-export-modal__preview-table doc-export-wizard__preview-table">
              <table>
                <thead>
                  <tr>
                    <th data-article-export-field="ref"><span data-article-field-label="ref">R&eacute;f&eacute;rence</span></th>
                    <th data-article-export-field="product"><span data-article-field-label="product">D&eacute;signation</span></th>
                    <th data-article-export-field="desc"><span data-article-field-label="desc">Description</span></th>
                    <th data-article-export-field="unit"><span data-article-field-label="unit">Unit&eacute;</span></th>
                    <th data-article-export-field="stockQty"><span data-article-field-label="stockQty">Stock disp.</span></th>
                    <th data-article-export-field="purchasePrice"><span data-article-field-label="purchasePrice">PU A. HT</span></th>
                    <th data-article-export-field="purchaseTva"><span data-article-field-label="purchaseTva">TVA A.</span></th>
                    <th data-article-export-field="purchaseDiscount"><span data-article-field-label="purchaseDiscount">Remise A.</span></th>
                    <th data-article-export-field="price"><span data-article-field-label="price">P.U. HT</span></th>
                    <th data-article-export-field="tva"><span data-article-field-label="tva">TVA %</span></th>
                    <th data-article-export-field="discount"><span data-article-field-label="discount">Remise %</span></th>
                    <th data-article-export-field="stockAllowNegative"><span>Autoriser stock negatif</span></th>
                    <th data-article-export-field="stockBlockInsufficient"><span>Bloquer sortie stock insuffisant</span></th>
                    <th data-article-export-field="stockAlertEnabled"><span>Alerte stock</span></th>
                    <th data-article-export-field="stockMin"><span>Stock minimum</span></th>
                    <th data-article-export-field="stockMax"><span>Stock maximum</span></th>
                    <th data-article-export-field="stockDepotsJson"><span>Stock Depots JSON</span></th>
                    <th data-article-export-field="fodec"><span data-article-field-label="fodecSale">FODEC V.</span></th>
                    <th data-article-export-field="fodecRate"><span data-article-field-label="fodecRate">Taux FODEC V.</span></th>
                    <th data-article-export-field="fodecTva"><span data-article-field-label="fodecTva">TVA FODEC V.</span></th>
                    <th data-article-export-field="purchaseFodecEnabled"><span data-article-field-label="fodecPurchase">FODEC A.</span></th>
                    <th data-article-export-field="purchaseFodecRate"><span data-article-field-label="purchaseFodecRate">Taux FODEC A.</span></th>
                    <th data-article-export-field="purchaseFodecTva"><span data-article-field-label="purchaseFodecTva">TVA FODEC A.</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-article-export-field="ref">SRV-001</td>
                    <td data-article-export-field="product">Usinage</td>
                    <td data-article-export-field="desc">Service de tournage</td>
                    <td data-article-export-field="unit">pcs</td>
                    <td data-article-export-field="stockQty">10</td>
                    <td data-article-export-field="purchasePrice">80</td>
                    <td data-article-export-field="purchaseTva">19</td>
                    <td data-article-export-field="purchaseDiscount">2</td>
                    <td data-article-export-field="price">120</td>
                    <td data-article-export-field="tva">19</td>
                    <td data-article-export-field="discount">0</td>
                    <td data-article-export-field="stockAllowNegative">0</td>
                    <td data-article-export-field="stockBlockInsufficient">1</td>
                    <td data-article-export-field="stockAlertEnabled">1</td>
                    <td data-article-export-field="stockMin">2</td>
                    <td data-article-export-field="stockMax">30</td>
                    <td data-article-export-field="stockDepotsJson">{"v":1,"activeTabId":"depot-1","customized":false,"tabs":[{"id":"depot-1","stockQty":10}]}</td>
                    <td data-article-export-field="fodec">1</td>
                    <td data-article-export-field="fodecRate">1</td>
                    <td data-article-export-field="fodecTva">19</td>
                    <td data-article-export-field="purchaseFodecEnabled">1</td>
                    <td data-article-export-field="purchaseFodecRate">1</td>
                    <td data-article-export-field="purchaseFodecTva">19</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div id="articlesExportSummary" class="client-export-modal__summary">Le fichier sera enregistre dans FacturanceData\\entrepriseN\\exportedData\\articleData.</div>
          <label class="client-export-modal__checkbox">
            <input id="articlesExportOpenLocation" type="checkbox" />
            <span>Ouvrir l&apos;emplacement apres export</span>
          </label>
          <div class="doc-dialog-model-picker client-export-modal__format">
            <label class="doc-dialog-model-picker__label" id="articlesExportFormatLabel" for="articlesExportFormat">
              Format
            </label>
            <div class="doc-dialog-model-picker__field">
              <details id="articlesExportFormatMenu" class="field-toggle-menu model-select-menu doc-dialog-model-menu client-export-format-menu" data-select-source="template">
                <summary class="btn success field-toggle-trigger" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="articlesExportFormatLabel articlesExportFormatDisplay">
                  <span id="articlesExportFormatDisplay" class="model-select-display">XLSX</span>
                  <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                </summary>
                <div id="articlesExportFormatPanel" class="field-toggle-panel model-select-panel client-export-format-panel" role="listbox" aria-labelledby="articlesExportFormatLabel">
                  <button type="button" class="model-select-option is-active" data-export-format-option="xlsx" role="option" aria-selected="true">
                    XLSX
                  </button>
                  <button type="button" class="model-select-option" data-export-format-option="csv" role="option" aria-selected="false">
                    CSV
                  </button>
                </div>
              </details>
              <select id="articlesExportFormat" class="model-select doc-dialog-model-select client-export-format-select" aria-hidden="true" tabindex="-1">
                <option value="xlsx" selected>XLSX</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>
        </div>
        <div class="swbDialog__actions client-export-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="articlesExportModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="articlesExportModalSave" type="button" class="swbDialog__ok">Exporter</button>
          </div>
        </div>
      </div>
    </div>

    <div id="docHistoryModal" class="swbDialog doc-history-modal payments-history-modal" hidden aria-hidden="true">
        <div
          class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="docHistoryModalTitle"
      >
        <div class="swbDialog__header">
          <div class="doc-history-modal__header-row">
            <div id="docHistoryModalTitle" class="swbDialog__title">Documents enregistr├⌐s</div>
            <button
              id="docHistoryModalRefresh"
              type="button"
              class="btn ghost doc-history-modal__refresh"
              aria-label="Rafraichir les fichiers enregistres"
            >
              <svg
                class="doc-history-modal__refresh-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4.5 10.5a7 7 0 0 1 12-3.5l1 1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19.5 13.5a7 7 0 0 1-12 3.5l-1-1" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18 5v4h-4" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M6 19v-4h4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <button id="docHistoryModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
          <div class="swbDialog__msg doc-history-modal__body payments-history-modal__body">
            <div class="doc-history-modal__filters payments-history__filters">
            <label class="doc-history-modal__filter">
              <span>N&deg;</span>
              <input
                id="docHistoryFilterNumber"
                type="text"
                placeholder="Rechercher par num&eacute;ro"
              />
            </label>
            <label class="doc-history-modal__filter">
              <span>Nom du client ou identifiant</span>
              <input
                id="docHistoryFilterQuery"
                type="text"
                placeholder="Rechercher un client ou une r\u00E9f\u00E9rence"
              />
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="docHistoryFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="docHistoryFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="docHistoryFilterYearLabel docHistoryFilterYearDisplay"
                  >
                    <span id="docHistoryFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="docHistoryFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="docHistoryFilterYearLabel"
                  ></div>
                </details>
                <select id="docHistoryFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Du</span>
              <div class="swb-date-picker" data-date-picker>
                <input
                  id="docHistoryFilterStart"
                  type="text"
                  inputmode="numeric"
                  placeholder="JJ-MM"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
                >
                  <svg
                    class="swb-date-picker__toggle-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Au</span>
              <div class="swb-date-picker" data-date-picker>
                <input
                  id="docHistoryFilterEnd"
                  type="text"
                  inputmode="numeric"
                  placeholder="JJ-MM"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
                >
                  <svg
                    class="swb-date-picker__toggle-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
              </div>
            </label>
            <button
              type="button"
              class="btn ghost doc-history-modal__filter-clear"
              id="docHistoryFilterClear"
              disabled
            >
              R\u00E9initialiser
            </button>
          </div>
          <div class="doc-history-modal__content">
            <div id="docHistoryModalList" class="doc-history-modal__list" role="list"></div>
            <div class="doc-history-modal__status-row">
              <p id="docHistoryModalStatus" class="doc-history-modal__status" aria-live="polite"></p>
              <div class="doc-history-modal__recap-tools">
                <button
                  type="button"
                  id="docHistoryRecapInfoBtn"
                  class="swbDialog__close"
                  aria-label="Afficher le r&eacute;capitulatif"
                  aria-haspopup="dialog"
                  aria-expanded="false"
                  aria-controls="docHistoryRecapPopover"
                >
                  <svg class="doc-history-modal__recap-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 11v5" stroke-linecap="round"></path>
                    <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"></circle>
                  </svg>
                </button>
                <div
                  id="docHistoryRecapPopover"
                  class="doc-history-modal__recap-popover"
                  role="dialog"
                  aria-modal="false"
                  hidden
                >
                  <div class="doc-history-modal__recap-popover-header">
                    <span class="doc-history-modal__recap-popover-title">R&eacute;capitulatif</span>
                    <button
                      type="button"
                      id="docHistoryRecapPopoverClose"
                      class="swbDialog__close"
                      aria-label="Fermer le r&eacute;capitulatif"
                    >
                      <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
                      </svg>
                    </button>
                  </div>
                  <ul id="docHistoryModalRecap" class="doc-history-modal__recap"></ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="docHistoryModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="docHistoryModalPrev" type="button" class="client-search__edit" disabled="">Pr&eacute;c&eacute;dent</button>
            <span
              id="docHistoryModalPage"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="docHistoryModalPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="docHistoryModalTotalPages">1</span>
            </span>
            <button id="docHistoryModalNext" type="button" class="client-search__add" disabled="">Suivant</button>
          </div>
        </div>
      </div>
    </div>

    <div id="docHistoryEmailModal" class="swbDialog email-compose-modal" hidden aria-hidden="true">
      <div class="swbDialog__panel email-compose-modal__panel" role="dialog" aria-modal="true" aria-labelledby="docHistoryEmailModalTitle">
        <div class="swbDialog__header">
          <div id="docHistoryEmailModalTitle" class="swbDialog__title">Envoyer par e-mail</div>
          <button id="docHistoryEmailModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <form id="docHistoryEmailForm" class="email-compose-modal__body swbDialog__msg" novalidate>
          <div class="email-compose-modal__field">
            <label for="docHistoryEmailTo" class="label-text">Destinataire</label>
            <input id="docHistoryEmailTo" type="email" autocomplete="off" placeholder="client@email.com" />
          </div>
          <div class="email-compose-modal__field">
            <label for="docHistoryEmailSubject" class="label-text">Objet</label>
            <input id="docHistoryEmailSubject" type="text" autocomplete="off" />
          </div>
          <div class="email-compose-modal__field">
            <label for="docHistoryEmailMessage" class="label-text">Message</label>
            <textarea id="docHistoryEmailMessage" rows="6"></textarea>
          </div>
          <div class="email-compose-modal__attachment-tools">
            <div id="docHistoryEmailAttachment" class="email-compose-modal__attachment"></div>
            <button
              id="docHistoryEmailAttachPdf"
              type="button"
              class="btn better-style email-compose-modal__attach-btn"
              aria-label="Attacher le document PDF"
            >
              Attacher le document (PDF)
            </button>
            <button
              id="docHistoryEmailAttachPurchase"
              type="button"
              class="btn better-style email-compose-modal__attach-btn"
              aria-label="Attacher tant que Facture d'Achat"
            >
              Attacher tant que Facture d'Achat
            </button>
          </div>
          <p id="docHistoryEmailStatus" class="email-compose-modal__status"></p>
        </form>
        <div class="swbDialog__actions email-compose-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="docHistoryEmailModalCancel" type="button" class="swbDialog__cancel">Annuler</button>
          </div>
          <div class="swbDialog__group swbDialog__group--right">
            <button id="docHistoryEmailModalSend" type="submit" form="docHistoryEmailForm" class="swbDialog__ok">Envoyer</button>
          </div>
        </div>
      </div>
    </div>
  `);
}



