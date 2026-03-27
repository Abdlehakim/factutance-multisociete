"use strict";

const clientsCodeClientBackfillMigration = require("./0010_clients_code_client_backfill");

module.exports = function clientsCodeClientFormatNormalizeMigration(db) {
  clientsCodeClientBackfillMigration(db);
};

