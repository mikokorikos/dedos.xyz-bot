// services/fxRateService.js
// Mantiene tasa MXN -> USD actualizada
import fetch from "node-fetch";
import { config } from "../constants/config.js";

let usdRate = 0.055; // fallback aproximado (1 MXN ~ $0.055 USD)

/**
 * getUsdRate()
 * Devuelve cuántos USD vale 1 MXN.
 */
export function getUsdRate() {
  return usdRate;
}

async function refreshRate() {
  try {
    const res = await fetch(config.CURRENCY_API_URL);
    const json = await res.json();
    if (json && json.rates && json.rates.USD) {
      usdRate = Number(json.rates.USD);
      console.log(
        `💱 FX actualizado: 1 MXN = $${usdRate.toFixed(4)} USD`
      );
    }
  } catch (err) {
    console.warn("⚠ No se pudo actualizar tasa USD/MXN:", err.message);
  }
}

/**
 * startFxRateService()
 * Arranca el intervalo que actualiza la tasa.
 */
export function startFxRateService() {
  refreshRate();
  const everyMs = config.USD_FETCH_INTERVAL_MINUTES * 60 * 1000;
  setInterval(refreshRate, everyMs);
}
