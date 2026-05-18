const DateFormatter = require("../utils/dateFormatter");
const config = require("../config/environment");

class MessageStrategy {
  constructor(templateConfig) {
    this.templateConfig = templateConfig;
  }

  createMessageOptions(visita, fromNumber) {
    throw new Error("Método createMessageOptions debe ser implementado");
  }

  getMessageType() {
    throw new Error("Método getMessageType debe ser implementado");
  }
}

class InvitacionStrategy extends MessageStrategy {
  createMessageOptions(visita, fromNumber) {
    const campaignStart = DateFormatter.parseToLocalDate(config.campaign.startDate);
    const daysUntil = Math.round(DateFormatter.daysDifference(campaignStart, DateFormatter.today()));

    return {
      from: fromNumber,
      to: `whatsapp:${visita.getFormattedPhone()}`,
      contentSid: this.templateConfig.invitacion,
      contentVariables: JSON.stringify({
        1: visita.nombre,
        2: daysUntil.toString(),
      }),
    };
  }

  getMessageType() {
    return "invitacion";
  }
}

class RecordatorioStrategy extends MessageStrategy {
  createMessageOptions(visita, fromNumber) {
    const topics = require("../config/campaignTopics");
    const campaignStart = DateFormatter.parseToLocalDate(config.campaign.startDate);
    const campaignDay = Math.round(DateFormatter.daysDifference(DateFormatter.today(), campaignStart)) + 1;

    const topic = topics.find((t) => t.dia === campaignDay);

    if (!topic) {
      throw new Error(`No hay tema configurado para el día ${campaignDay} de la campaña`);
    }

    return {
      from: fromNumber,
      to: `whatsapp:${visita.getFormattedPhone()}`,
      contentSid: this.templateConfig.recordatorio,
      contentVariables: JSON.stringify({
        1: campaignDay.toString(),
        2: visita.nombre,
        3: topic.tema,
        4: topic.subtitulo,
      }),
    };
  }

  getMessageType() {
    return "recordatorio";
  }
}

class MessageStrategyFactory {
  constructor(templateConfig) {
    this.templateConfig = templateConfig;
  }

  getStrategy(tipo) {
    switch (tipo) {
      case "invitacion":
        return new InvitacionStrategy(this.templateConfig);
      case "recordatorio":
        return new RecordatorioStrategy(this.templateConfig);
      default:
        throw new Error(`Tipo de mensaje no soportado: ${tipo}`);
    }
  }
}

module.exports = {
  MessageStrategy,
  InvitacionStrategy,
  RecordatorioStrategy,
  MessageStrategyFactory,
};
