const Visita = require("../models/visita");
const GoogleSheetsService = require("./googleSheetsService");
const MessageService = require("./messageService");
const DateFormatter = require("../utils/dateFormatter");
const config = require("../config/environment");
const logger = require("../utils/logger");

class NotificationService {
  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
    this.messageService = new MessageService();
    this.sentMessagesToday = new Set();
  }

  /**
   * Ejecuta el proceso de mensajes según el tipo indicado
   * @param {"invitacion"|"recordatorio"} tipo
   */
  async executeNotificationProcess(tipo = "invitacion") {
    logger.info(`📧 Iniciando proceso - Tipo: ${tipo}`);

    const stats = { processed: 0, sent: 0, errors: 0, uniqueUsers: 0 };

    try {
      this._validateConfiguration(tipo);

      const rawData = await this.googleSheetsService.readSheetData();

      if (rawData.length === 0) {
        logger.warn("📭 No hay datos para procesar");
        return stats;
      }

      const visitas = Visita.fromRawDataArray(rawData);
      stats.processed = visitas.length;

      logger.info(`📝 Visitas válidas: ${visitas.length}`);
      logger.info(`📅 Fecha de hoy: ${DateFormatter.todayFormatted()}`);

      await this._sendMessages(visitas, tipo, stats);

      stats.uniqueUsers = this.sentMessagesToday.size;
      logger.logFinalSummary(stats);

      return stats;
    } catch (error) {
      logger.error("Error ejecutando proceso:", error.message);
      stats.errors++;
      throw error;
    }
  }

  async _sendMessages(visitas, tipo, stats) {
    logger.info(`📮 Enviando ${tipo}s...`);

    for (const visita of visitas) {
      try {
        if (this.sentMessagesToday.has(visita.telefono)) {
          logger.skip(`${visita.nombre} - Ya recibió mensaje en esta ejecución`);
          continue;
        }

        if (visita.hasBeenNotified()) {
          logger.skip(`${visita.nombre} - Ya fue notificado hoy`);
          continue;
        }

        const result = await this.messageService.sendMessage(visita, tipo);

        if (result.success) {
          await this.googleSheetsService.markAsNotified(visita.rowIndex);
          this.sentMessagesToday.add(visita.telefono);
          stats.sent++;
          logger.info(`✅ ${tipo} enviado a ${visita.nombre}`);
        } else {
          logger.error(`Error enviando ${tipo} a ${visita.nombre}:`, result.error);
          stats.errors++;
        }
      } catch (error) {
        logger.error(`Error procesando ${visita.nombre}:`, error.message);
        stats.errors++;
      }
    }
  }

  _validateConfiguration(tipo) {
    try {
      this.googleSheetsService.validateConfiguration();
      this.messageService.validateConfiguration(tipo);
      config.validateRequiredEnvVars();
      logger.debug("✅ Configuración validada exitosamente");
    } catch (error) {
      logger.error("❌ Error en configuración:", error.message);
      throw error;
    }
  }

  async getDiagnosticInfo() {
    return {
      config: {
        business: config.business,
        environment: process.env.NODE_ENV || "development",
      },
      googleSheets: await this.googleSheetsService.getDiagnosticInfo(),
      messaging: this.messageService.getDiagnosticInfo(),
      currentDate: DateFormatter.todayFormatted(),
    };
  }

  async testConnectivity() {
    logger.info("🔧 Probando conectividad de servicios...");

    const results = {
      googleSheets: { success: false },
      twilio: { success: false },
    };

    try {
      const sheetData = await this.googleSheetsService.readSheetData();
      results.googleSheets = { success: true, recordCount: sheetData.length };
      logger.success("Google Sheets: Conectado");
    } catch (error) {
      results.googleSheets = { success: false, error: error.message };
      logger.error("Google Sheets: Error de conexión");
    }

    try {
      const twilioTest = await this.messageService.testConnection();
      results.twilio = twilioTest;

      if (twilioTest.success) {
        logger.success("Twilio: Conectado");
      } else {
        logger.error("Twilio: Error de conexión");
      }
    } catch (error) {
      results.twilio = { success: false, error: error.message };
      logger.error("Twilio: Error de conexión");
    }

    return results;
  }

  async executeRemindersOnly(tipo = "invitacion") {
    return this.executeNotificationProcess(tipo);
  }
}

module.exports = NotificationService;
