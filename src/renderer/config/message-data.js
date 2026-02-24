window.APP_MESSAGE_DATA = {
  dialogText: {
    closeButton: "x",
    okButton: "OK",
    cancelButton: "Fermer",
    alertButton: "Fermer",
    defaultTitle: "Information",
    confirmTitle: "Export termine",
    confirmOkButton: "Ouvrir",
    confirmCancelButton: "Fermer",
    optionsTitle: "Choisir",
    optionsCancelButton: "Annuler"
  },
  dialogStrings: {
    fileExistsSuffix: "existe deja.",
    fileExistsNotice: "{pronoun} sera remplace{feminineSuffix} par la nouvelle version si vous continuez.",
    saveSuccess: "{article} {filename} {status}",
    saveSuccessStatusFeminine: "a ete enregistree avec succes.",
    saveSuccessStatusMasculine: "a ete enregistre avec succes.",
    exportReadyFeminine: "a ete exportee et peut maintenant etre ouverte.",
    exportReadyMasculine: "a ete exporte et peut maintenant etre ouvert.",
    clientRequiredFieldsMessage:
      "Veuillez saisir le nom du client, Pour le compte de ou son identifiant fiscal / TVA.",
    clientFolderEnsureFailedMessage:
      "Impossible de preparer le dossier Clients (droits administrateur requis).",
    itemRequiredFieldsMessage: "Veuillez ajouter au moins un article pour continuer.",
    documentClientRequiredFieldsMessage: "Veuillez ajouter un client pour continuer.",
    articleRequiredFieldsMessage:
      "Veuillez saisir au moins une R\u00E9f\u00E9rence, une D\u00E9signation ou une Description."
  },
  appMessages: {
    ITEM_REQUIRED_FIELDS: { stringKey: "itemRequiredFieldsMessage", title: "Article incomplet" },
    DOCUMENT_ITEM_REQUIRED_FIELDS: {
      stringKey: "itemRequiredFieldsMessage",
      title: "Document incomplet"
    },
    ARTICLE_REQUIRED_FIELDS: { stringKey: "articleRequiredFieldsMessage", title: "Article incomplet" },
    DOCUMENT_CLIENT_REQUIRED_FIELDS: {
      stringKey: "documentClientRequiredFieldsMessage",
      title: "Client incomplet"
    },
    ARTICLE_NOT_REGISTERED: { text: "Cet article n'est pas encore enregistre.", title: "Information" },
    ARTICLE_UPDATE_UNAVAILABLE: {
      text: "La mise a jour des articles est indisponible dans cette version.",
      title: "Indisponible"
    },
    ARTICLE_UPDATE_SUCCESS: { text: "Article mis a jour", title: "Article mis a jour" },
    ARTICLE_SAVE_SUCCESS: { text: "Article enregistre", title: "Succes" },
    ARTICLE_DUPLICATE_FOUND: { text: "Un article avec la meme {fieldLabel} existe deja.", title: "Doublon" },
    ARTICLE_SAVE_FAILED: { text: "Echec de l'enregistrement.", title: "Erreur" },
    ARTICLE_SAVE_DUPLICATE: { text: "Echec de l'enregistrement.", title: "Doublon" },
    ARTICLE_UPDATE_FAILED: { text: "Impossible de mettre a jour l'article enregistre.", title: "Erreur" },
    CLIENT_REQUIRED_FIELDS: { stringKey: "clientRequiredFieldsMessage", title: "Client incomplet" },
    CLIENT_FOLDER_ADMIN_ERROR: { stringKey: "clientFolderEnsureFailedMessage", title: "Erreur" },
    CLIENT_FOLDER_GENERIC_ERROR: { text: "Impossible de preparer le dossier Clients.", title: "Erreur" },
    CLIENT_SAVE_SUCCESS: { text: "Client enregistre.", title: "Succes" },
    CLIENT_SAVE_FAILED: { text: "Echec de l'enregistrement du client.", title: "Erreur" },
    CLIENT_DUPLICATE_FOUND: {
      text: "Un client avec les memes informations existe deja ({dupName}).",
      title: "Client deja enregistre"
    },
    FEATURE_UNAVAILABLE: { text: "Fonctionnalite indisponible dans cette version.", title: "Info" },
    TEMPLATE_SAVE_SUCCESS: { text: "Modele \"{savedName}\" enregistre.", title: "Succes" },
    TEMPLATE_SAVE_FAILED: { text: "Enregistrement impossible.", title: "Erreur" },
    TEMPLATE_NOT_FOUND: { text: "Modele introuvable.", title: "Erreur" },
    TEMPLATE_APPLY_FAILED: { text: "Application du modele impossible.", title: "Erreur" },
    TEMPLATE_DELETE_FAILED: { text: "Suppression du modele impossible.", title: "Erreur" },
    TEMPLATE_DEFINE_BEFORE_SAVE: {
      text: "Enregistrez d'abord le modele avant de le definir par defaut.",
      title: "Information"
    },
    TEMPLATE_DEFAULT_UPDATE_FAILED: {
      text: "Impossible de mettre a jour le modele par defaut.",
      title: "Erreur"
    },
    CLIENT_DELETE_UNAVAILABLE: { text: "Suppression de client indisponible.", title: "Indisponible" },
    DELETE_FAILED: { text: "Suppression impossible.", title: "Erreur" },
    ARTICLE_DELETE_UNAVAILABLE: { text: "Suppression d'article indisponible.", title: "Indisponible" },
    DELETE_UNAVAILABLE: { text: "Suppression indisponible.", title: "Indisponible" },
    CLIENT_DELETE_VERSION_UNAVAILABLE: {
      text: "Suppression de client indisponible dans cette version.",
      title: "Indisponible"
    },
    CLIENT_UPDATE_UNAVAILABLE: { text: "La mise a jour du client n'est pas disponible.", title: "Information" },
    CLIENT_LOAD_OR_SAVE_REQUIRED: {
      text: "Veuillez d'abord charger ou enregistrer un client.",
      title: "Information"
    },
    CLIENT_NO_CHANGES: { text: "Aucune modification detectee.", title: "Information" },
    CLIENT_PATH_MISSING: { text: "Chemin du client introuvable.", title: "Erreur" },
    CLIENT_UPDATE_SUCCESS: { text: "Client mis a jour.", title: "Succes" },
    CLIENT_UPDATE_FAILED: { text: "Echec de la mise a jour du client.", title: "Erreur" },
    SEAL_PDFJS_MISSING: {
      text: "Impossible de lire le PDF sans pdf.js. Veuillez l'installer ou le charger localement, ou joignez une image.",
      title: "Cachet PDF"
    },
    SEAL_PDF_LOAD_FAILED: {
      text: "Echec du chargement du PDF. Essayez un autre fichier ou convertissez-le en image.",
      title: "Cachet PDF"
    },
    SEAL_UNSUPPORTED_FILE: { text: "Format de fichier non supporte. Joignez une image ou un PDF.", title: "Cachet" },
    DOCUMENT_SAVE_SUCCESS: { text: "Document enregistre :\n{path}", title: "Enregistrer" },
    DOCUMENT_SAVE_CANCELED: { text: "Enregistrement annule.", title: "Enregistrer" },
    DOCUMENT_DOWNLOAD_SUCCESS: { text: "Fichier telecharge.", title: "Enregistrer" },
    PDF_EXPORT_FAILED: { text: "Impossible d'exporter le PDF.", title: "Erreur" },
    WITHHOLDING_EXPORT_FAILED: { text: "Impossible d'exporter le certificat de retenue.", title: "Avertissement" },
    PDF_DOCUMENT_LOAD_FAILED: { text: "Impossible de charger ce document.", title: "Export PDF" },
    HISTORY_FILE_DELETE_FAILED: { text: "Impossible de supprimer le fichier.", title: "Erreur" },
    HISTORY_FILE_DELETE_WARNING: { text: "Ce fichier sera definitivement supprime.", title: "Confirmation" },
    HISTORY_EXPORT_NOT_FOUND: { text: "Document introuvable pour l'export.", title: "Export PDF" },
    HISTORY_EXPORT_DIRECT_UNAVAILABLE: { text: "Export direct indisponible.", title: "Export PDF" },
    HISTORY_EXPORT_DOC_LOAD_FAILED: {
      text: "Impossible de charger le document selectionne.",
      title: "Export PDF"
    },
    HISTORY_EXPORT_FAILED: { text: "Export impossible.", title: "Export PDF" },
    DOCUMENT_EDIT_LOCKED: {
      text: "Ce document est deja ouvert pour modification sur un autre poste.",
      title: "Modification impossible"
    },
    FOLDER_OPEN_UNAVAILABLE: { text: "Ouverture du dossier impossible dans ce mode.", title: "Indisponible" },
    FOLDER_OPEN_FAILED: { text: "Impossible d'ouvrir le dossier.", title: "Erreur" },
    PDF_OPEN_UNAVAILABLE: { text: "Ouverture du PDF indisponible dans ce mode.", title: "Indisponible" },
    DOCUMENT_OPEN_FAILED: { text: "Impossible d'ouvrir le document.", title: "Erreur" },
    DELETE_UNAVAILABLE_MODE: { text: "Suppression indisponible dans ce mode.", title: "Indisponible" },
    PDF_DISPLAY_UNAVAILABLE: { text: "Affichage des PDF indisponible.", title: "Indisponible" },
    OPEN_FAILED_GENERIC: { text: "Ouverture impossible.", title: "Erreur" },
    FORM_CAPTURE_FAILED: { text: "Impossible de collecter les donnees du formulaire.", title: "Erreur" },
    DOCUMENT_SAVE_FAILED: { text: "Impossible d'enregistrer le document.", title: "Erreur" },
    GENERIC_ERROR: { text: "Une erreur est survenue.", title: "Erreur" },
    GENERIC_INFO: { text: "", title: "Information" }
  },
  articleDuplicateFieldLabels: {
    reference: "reference",
    product: "d\u00e9signation",
    description: "description"
  }
};
