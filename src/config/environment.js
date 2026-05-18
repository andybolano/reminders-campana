const dotenv = require("dotenv");
dotenv.config();

class EnvironmentConfig {
  constructor() {
    this.validateRequiredEnvVars();
  }

  // Twilio Configuration
  get twilio() {
    return {
      accountSid: process.env.TW_SID,
      authToken: process.env.TW_TOKEN,
      fromNumber: process.env.TW_FROM,
      useTemplates: process.env.USE_TWILIO_TEMPLATES === "true",
      templates: {
        invitacion: process.env.TWILIO_TEMPLATE_INVITACION,
        recordatorio: process.env.TWILIO_TEMPLATE_RECORDATORIO,
      },
    };
  }

  // Google Sheets Configuration
  get googleSheets() {
    return {
      sheetId: process.env.GOOGLE_SHEET_ID,
      range: process.env.GOOGLE_SHEET_RANGE || "A:E",
    };
  }

  // Campaña Configuration
  get campaign() {
    return {
      startDate: process.env.CAMPAIGN_START_DATE,
    };
  }

  // Business Logic Configuration
  get business() {
    return {
      yesMarker: "sí",
    };
  }

  validateRequiredEnvVars() {
    const required = ["TW_SID", "TW_TOKEN", "GOOGLE_SHEET_ID"];

    const missing = required.filter((envVar) => !process.env[envVar]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }

    const hasGoogleCredentials =
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_CREDENTIALS_BASE64;

    if (!hasGoogleCredentials) {
      throw new Error(
        "Missing Google credentials: Set either GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CREDENTIALS_BASE64"
      );
    }
  }
}

module.exports = new EnvironmentConfig();
