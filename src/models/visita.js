const DateFormatter = require("../utils/dateFormatter");
const config = require("../config/environment");

class Visita {
  constructor(data, rowIndex) {
    this.rowIndex = rowIndex;
    this.nombre = this._extractField(data, ["Nombre", "nombre", "NOMBRE"]);
    this.telefono = this._extractField(data, [
      "Teléfono",
      "Telefono",
      "teléfono",
      "telefono",
      "TELEFONO",
    ]);
    this.notificado = this._extractField(data, [
      "Notificado",
      "notificado",
      "NOTIFICADO",
    ]);

    this.errors = this._validate();
  }

  /**
   * Extrae campo de datos usando múltiples posibles nombres
   * @private
   */
  _extractField(data, possibleNames) {
    for (const name of possibleNames) {
      if (data[name] !== undefined && data[name] !== null) {
        return data[name];
      }
    }
    return "";
  }

  /**
   * Valida los datos de la visita
   * @private
   */
  _validate() {
    const errors = [];

    if (!this.nombre) {
      errors.push("Nombre requerido");
    }

    if (!this.telefono) {
      errors.push("Teléfono requerido");
    }

    return errors;
  }

  /**
   * Verifica si la visita es válida
   */
  isValid() {
    return this.errors.length === 0;
  }

  /**
   * Obtiene número de teléfono formateado para Colombia
   */
  getFormattedPhone() {
    return `+57${this.telefono}`;
  }

  /**
   * Verifica si ya fue notificado
   */
  hasBeenNotified() {
    return (
      this.notificado &&
      this.notificado.toLowerCase() === config.business.yesMarker
    );
  }

  /**
   * Obtiene información para logging
   */
  getLoggingInfo() {
    return {
      nombre: this.nombre,
      telefono: this.telefono,
      notificado: this.notificado,
    };
  }

  /**
   * Crea resumen del estado de la visita
   */
  getStatusSummary() {
    const info = this.getLoggingInfo();
    return {
      ...info,
      hasBeenNotified: this.hasBeenNotified(),
    };
  }

  /**
   * Convierte el objeto a representación string para debugging
   */
  toString() {
    return `Visita(${this.nombre}, ${this.telefono})`;
  }

  /**
   * Crea una visita desde datos raw validando la entrada
   * @static
   */
  static fromRawData(data, rowIndex) {
    return new Visita(data, rowIndex);
  }

  /**
   * Crea múltiples visitas desde array de datos
   * @static
   */
  static fromRawDataArray(dataArray) {
    return dataArray
      .map((data, index) => Visita.fromRawData(data, index))
      .filter((visita) => visita.isValid());
  }
}

module.exports = Visita;