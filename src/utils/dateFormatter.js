class DateFormatter {
  static DIAS_SEMANA = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  static MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  /**
   * Formatea fecha a formato legible en español: "Miércoles 8 de Junio"
   * @param {Date} fecha - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  static toReadableSpanish(fecha) {
    if (!(fecha instanceof Date) || isNaN(fecha)) {
      throw new Error("Se requiere una fecha válida");
    }

    const diaSemana = this.DIAS_SEMANA[fecha.getDay()];
    const dia = fecha.getDate();
    const mes = this.MESES[fecha.getMonth()];

    return `${diaSemana} ${dia} de ${mes}`;
  }

  /**
   * Convierte fecha serial de Excel a Date JavaScript
   * @param {number} serial - Número serial de Excel
   * @returns {Date} Fecha convertida
   */
  static fromExcelSerial(serial) {
    if (typeof serial !== "number") {
      throw new Error("Se requiere un número serial válido");
    }

    const excelEpoch = new Date(1900, 0, 1);
    // Excel cuenta desde 1900-01-01, pero tiene bug del año bisiesto 1900
    const daysSinceEpoch = serial - 2; // Ajuste por el bug de Excel
    return new Date(
      excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000
    );
  }

  /**
   * Convierte cualquier entrada a Date en zona horaria local
   * @param {string|number|Date} fechaRaw - Fecha en formato raw
   * @param {string} contexto - Contexto para logging
   * @returns {Date|null} Fecha convertida o null si inválida
   */
  static parseToLocalDate(fechaRaw, contexto = "Unknown") {
    if (!fechaRaw) return null;

    try {
      let fecha;

      if (typeof fechaRaw === "number") {
        // Es un número serial de Excel
        fecha = this.fromExcelSerial(fechaRaw);
      } else if (
        typeof fechaRaw === "string" &&
        fechaRaw.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        // Formato YYYY-MM-DD - crear en zona horaria local
        const [year, month, day] = fechaRaw.split("-").map(Number);
        fecha = new Date(year, month - 1, day); // month-1 porque Date usa 0-indexed
      } else {
        fecha = new Date(fechaRaw);
      }

      if (isNaN(fecha)) {
        console.warn(`⚠️  ${contexto} - Fecha inválida: ${fechaRaw}`);
        return null;
      }

      return fecha;
    } catch (error) {
      console.error(
        `❌ ${contexto} - Error procesando fecha: ${fechaRaw}`,
        error.message
      );
      return null;
    }
  }

  /**
   * Calcula diferencia en días entre dos fechas
   * @param {Date} fecha1 - Primera fecha
   * @param {Date} fecha2 - Segunda fecha
   * @returns {number} Diferencia en días
   */
  static daysDifference(fecha1, fecha2) {
    if (!(fecha1 instanceof Date) || !(fecha2 instanceof Date)) {
      throw new Error("Se requieren dos fechas válidas");
    }

    return (fecha1 - fecha2) / (24 * 60 * 60 * 1000);
  }

  /**
   * Normaliza fecha a medianoche (00:00:00.000)
   * @param {Date} fecha - Fecha a normalizar
   * @returns {Date} Fecha normalizada
   */
  static normalize(fecha) {
    if (!(fecha instanceof Date)) {
      throw new Error("Se requiere una fecha válida");
    }

    const normalized = new Date(fecha);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Obtiene fecha actual normalizada
   * @returns {Date} Fecha de hoy a medianoche
   */
  static today() {
    return this.normalize(new Date());
  }

  /**
   * Formatea la fecha actual en formato: "Lunes, 22 de Septiembre"
   * @returns {string} Fecha de hoy formateada
   */
  static todayFormatted() {
    const hoy = new Date();
    const diaSemana = this.DIAS_SEMANA[hoy.getDay()];
    const dia = hoy.getDate();
    const mes = this.MESES[hoy.getMonth()];

    return `${diaSemana}, ${dia} de ${mes}`;
  }

  /**
   * Obtiene el número del día de la semana (1=Domingo, 2=Lunes, etc.)
   * @returns {number} Número del día de la semana
   */
  static getDayOfWeekNumber() {
    const hoy = new Date();
    return hoy.getDay() + 1; // getDay() devuelve 0-6, necesitamos 1-7
  }

  /**
   * Formatea fecha para almacenamiento (YYYY-MM-DD)
   * @param {Date} fecha - Fecha a formatear
   * @returns {string} Fecha en formato ISO
   */
  static toStorageFormat(fecha) {
    if (!(fecha instanceof Date)) {
      throw new Error("Se requiere una fecha válida");
    }

    return fecha.toISOString().split("T")[0];
  }
}

module.exports = DateFormatter;
