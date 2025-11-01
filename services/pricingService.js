// services/pricingService.js
// Cálculos de precios Robux <-> MXN <-> USD
import { config } from "../constants/config.js";
import { getUsdRate } from "./fxRateService.js";

/**
 * Cuánto cuesta X Robux
 */
export function getPriceForRobux(robux) {
  const mxn = (Number(robux) / 1000) * config.PRICE_PER_1000_MXN;
  const usd = mxn * getUsdRate();
  return { mxn, usd };
}

/**
 * Con X MXN, cuántos Robux puedo comprar
 */
export function getRobuxFromMxn(mxnInput) {
  const mxn = Number(mxnInput);
  const usd = mxn * getUsdRate();
  const robux = Math.floor((mxn / config.PRICE_PER_1000_MXN) * 1000);
  return { robux, mxn, usd };
}

/**
 * Con X USD, cuántos Robux puedo comprar
 */
export function getRobuxFromUsd(usdInput) {
  const usd = Number(usdInput);
  const rate = getUsdRate(); // USD por MXN
  const mxn = usd / rate;
  const robux = Math.floor((mxn / config.PRICE_PER_1000_MXN) * 1000);
  return { robux, mxn, usd };
}

/**
 * Muestra "110.00 MXN (~$6.12 USD)"
 */
export function formatPrice(mxn) {
  const usd = Number(mxn) * getUsdRate();
  return `${Number(mxn).toFixed(2)} MXN (~$${usd.toFixed(2)} USD)`;
}
