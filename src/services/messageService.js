const twilio = require("twilio");
const config = require("../config/environment");
const logger = require("../utils/logger");
const { MessageStrategyFactory } = require("../strategies/messageStrategies");

class MessageService {
  constructor() {
    this.client = null;
    this.strategyFactory = null;
    this._initializeClient();
    this._initializeStrategies();
  }

  _initializeClient() {
    try {
      const { accountSid, authToken } = config.twilio;

      if (!accountSid || !authToken) {
        throw new Error("Credenciales de Twilio no configuradas");
      }

      this.client = twilio(accountSid, authToken);
      logger.debug("Cliente Twilio inicializado exitosamente");
    } catch (error) {
      logger.error("Error inicializando cliente Twilio:", error.message);
      throw new Error(`Error configurando Twilio: ${error.message}`);
    }
  }

  _initializeStrategies() {
    this.strategyFactory = new MessageStrategyFactory(config.twilio.templates);
    logger.debug("Estrategias de mensaje inicializadas");
  }

  /**
   * Envía un mensaje a una visita según el tipo especificado
   * @param {Visita} visita
   * @param {"invitacion"|"recordatorio"} tipo
   */
  async sendMessage(visita, tipo) {
    try {
      if (!visita || !visita.telefono) {
        throw new Error("Visita y teléfono son requeridos");
      }

      const strategy = this.strategyFactory.getStrategy(tipo);
      const messageOptions = strategy.createMessageOptions(visita, config.twilio.fromNumber);
      const response = await this.client.messages.create(messageOptions);

      logger.logMessageSent(tipo, visita.nombre, response.sid);

      return {
        success: true,
        sid: response.sid,
        messageType: tipo,
        to: visita.getFormattedPhone(),
      };
    } catch (error) {
      logger.error(`Error enviando ${tipo} a ${visita.nombre}:`, error.message);

      return {
        success: false,
        error: error.message,
        messageType: tipo,
        to: visita.getFormattedPhone(),
      };
    }
  }

  validateConfiguration(tipo) {
    const errors = [];
    const { accountSid, authToken, templates } = config.twilio;

    if (!accountSid) errors.push("TW_SID no configurado");
    if (!authToken) errors.push("TW_TOKEN no configurado");

    if (tipo === "invitacion" && !templates.invitacion) {
      errors.push("TWILIO_TEMPLATE_INVITACION no configurado");
    }
    if (tipo === "recordatorio" && !templates.recordatorio) {
      errors.push("TWILIO_TEMPLATE_RECORDATORIO no configurado");
    }

    if (errors.length > 0) {
      throw new Error(`Configuración inválida: ${errors.join(", ")}`);
    }

    return true;
  }

  getDiagnosticInfo() {
    const { accountSid, fromNumber, templates } = config.twilio;

    return {
      configured: !!accountSid,
      fromNumber,
      templates,
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : "No configurado",
    };
  }

  async testConnection() {
    try {
      const account = await this.client.api
        .accounts(config.twilio.accountSid)
        .fetch();
      return {
        success: true,
        accountName: account.friendlyName,
        status: account.status,
      };
    } catch (error) {
      logger.error("Error probando conexión Twilio:", error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MessageService;
