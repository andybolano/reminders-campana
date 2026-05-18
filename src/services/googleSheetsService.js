const { google } = require("googleapis");
const config = require("../config/environment");
const logger = require("../utils/logger");

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
  }

  async _setupAuth() {
    try {
      let credentials;

      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      } else if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        const decoded = Buffer.from(
          process.env.GOOGLE_CREDENTIALS_BASE64,
          "base64"
        ).toString();
        credentials = JSON.parse(decoded);
      } else {
        throw new Error(
          "No se encontraron credenciales de Google en variables de entorno. Configura GOOGLE_SERVICE_ACCOUNT_KEY o GOOGLE_CREDENTIALS_BASE64"
        );
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const authClient = await this.auth.getClient();
      this.sheets = google.sheets({ version: "v4", auth: authClient });
    } catch (error) {
      logger.error("❌ Error configurando autenticación Google Sheets:", error.message);
      throw new Error(`Error de autenticación: ${error.message}`);
    }
  }

  async _ensureAuth() {
    if (!this.sheets) {
      await this._setupAuth();
    }
  }

  async readSheetData() {
    await this._ensureAuth();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSheets.sheetId,
        range: config.googleSheets.range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        logger.warn("No se encontraron datos en el Google Sheet");
        return [];
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const data = dataRows.map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });

      logger.info(`✅ Datos leídos: ${data.length} registros`);

      return data;
    } catch (error) {
      logger.error("Error leyendo Google Sheet:", error.message);
      throw new Error(`Error leyendo datos: ${error.message}`);
    }
  }

  async updateCell(rowIndex, columnName, value) {
    await this._ensureAuth();

    try {
      const headers = await this._getHeaders();
      const columnIndex = this._findColumnIndex(headers, columnName);

      if (columnIndex === -1) {
        throw new Error(`Columna "${columnName}" no encontrada`);
      }

      const columnLetter = this._getColumnLetter(columnIndex);
      const cellRange = `${columnLetter}${rowIndex + 2}`;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.googleSheets.sheetId,
        range: cellRange,
        valueInputOption: "RAW",
        requestBody: {
          values: [[value]],
        },
      });

      return true;
    } catch (error) {
      logger.error(
        `Error actualizando celda (fila ${rowIndex + 2}, columna ${columnName}):`,
        error.message
      );
      throw new Error(`Error actualizando celda: ${error.message}`);
    }
  }

  async _getHeaders() {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: "A1:Z1",
    });

    return response.data.values ? response.data.values[0] : [];
  }

  _findColumnIndex(headers, columnName) {
    const searchName = columnName.toLowerCase();

    let index = headers.findIndex(
      (header) => header.toLowerCase() === searchName
    );

    if (index === -1) {
      index = headers.findIndex(
        (header) =>
          header.toLowerCase().includes(searchName) ||
          searchName.includes(header.toLowerCase())
      );
    }

    return index;
  }

  _getColumnLetter(index) {
    let letter = "";
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  async markAsNotified(rowIndex, value = config.business.yesMarker) {
    return this.updateCell(rowIndex, "notificado", value);
  }

  validateConfiguration() {
    if (!config.googleSheets.sheetId) {
      throw new Error("Configuración inválida: GOOGLE_SHEET_ID no configurado");
    }
    return true;
  }

  async getDiagnosticInfo() {
    try {
      await this._ensureAuth();
      const headers = await this._getHeaders();

      return {
        configured: true,
        sheetId: config.googleSheets.sheetId,
        range: config.googleSheets.range,
        headers: headers,
        columnsCount: headers.length,
        credentialsMethod: process.env.GOOGLE_CREDENTIALS_BASE64
          ? "Environment (Base64)"
          : "Environment (JSON)",
      };
    } catch (error) {
      return {
        configured: false,
        error: error.message,
      };
    }
  }
}

module.exports = GoogleSheetsService;
