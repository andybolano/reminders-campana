// Railway-optimized version - no node-cron needed
const NotificationService = require("./services/notificationService");
const config = require("./config/environment");
const logger = require("./utils/logger");
const DateFormatter = require("./utils/dateFormatter");

class ReminderApp {
  constructor() {
    this.notificationService = new NotificationService();
  }

  async main() {
    try {
      this._showStartupInfo();

      const { mode, tipo } = this._parseArguments();

      switch (mode) {
        case "once":
          await this._runOnce(tipo);
          break;
        case "test":
          await this._runTests();
          break;
        case "notifications":
          await this._runNotificationsOnly(tipo);
          break;
        case "reminders":
          await this._runRemindersOnly(tipo);
          break;
        case "diagnostic":
          await this._runDiagnostic();
          break;
        default:
          await this._runOnce(tipo);
      }

      process.exit(0);
    } catch (error) {
      logger.error("Error en aplicación principal:", error.message);
      process.exit(1);
    }
  }

  async _runOnce(tipo) {
    logger.info(`🎯 Ejecutando proceso - Tipo: ${tipo}`);

    const stats = await this.notificationService.executeNotificationProcess(tipo);

    logger.success("✅ Ejecución completada exitosamente");
    logger.info(`📊 Resumen: ${stats.sent} mensajes enviados a ${stats.uniqueUsers} visitas`);

    return stats;
  }

  async _runNotificationsOnly(tipo) {
    logger.info(`📮 Ejecutando mensajes - Tipo: ${tipo}`);

    const stats = await this.notificationService.executeRemindersOnly(tipo);

    logger.success(`✅ Completado: ${stats.sent} enviados`);
    return stats;
  }

  async _runRemindersOnly(tipo) {
    return this._runNotificationsOnly(tipo);
  }

  async _runTests() {
    logger.info("🧪 Probando conectividad...");

    const results = await this.notificationService.testConnectivity();

    if (results.googleSheets.success) {
      logger.success(`Google Sheets: ✅ Conectado (${results.googleSheets.recordCount} registros)`);
    } else {
      logger.error(`Google Sheets: ❌ ${results.googleSheets.error}`);
    }

    if (results.twilio.success) {
      logger.success(`Twilio: ✅ Conectado`);
    } else {
      logger.error(`Twilio: ❌ ${results.twilio.error}`);
    }

    return results;
  }

  async _runDiagnostic() {
    logger.info("🔍 Obteniendo información de diagnóstico...");

    const info = await this.notificationService.getDiagnosticInfo();

    console.log("\n📋 INFORMACIÓN DE DIAGNÓSTICO:");
    console.log("==============================");
    console.log(JSON.stringify(info, null, 2));

    return info;
  }

  _parseArguments() {
    const args = process.argv.slice(2);

    const tipoArg = args.find((a) => a.startsWith("--tipo="));
    const tipo = tipoArg ? tipoArg.split("=")[1] : this._detectTipo();

    if (args.includes("--test")) return { mode: "test", tipo };
    if (args.includes("--notifications")) return { mode: "notifications", tipo };
    if (args.includes("--reminders")) return { mode: "reminders", tipo };
    if (args.includes("--diagnostic")) return { mode: "diagnostic", tipo };

    return { mode: "once", tipo };
  }

  _detectTipo() {
    const campaignStart = DateFormatter.parseToLocalDate(config.campaign.startDate);
    const daysUntil = Math.round(DateFormatter.daysDifference(campaignStart, DateFormatter.today()));
    return daysUntil > 0 ? "invitacion" : "recordatorio";
  }

  _showStartupInfo() {
    console.log("🎤 Sistema de Recordatorios Diarios - Campaña Evangelística");
    logger.info(`📅 ${DateFormatter.todayFormatted()}`);
    logger.info(`🌐 ${process.env.NODE_ENV || "development"}`);
  }
}

if (require.main === module) {
  const app = new ReminderApp();
  app.main().catch((error) => {
    logger.error("Error crítico:", error.message);
    process.exit(1);
  });
}

module.exports = ReminderApp;
