/** Lab P4 engine: fugacity of a pure fluid, the vapor pressure of an equation of state, the enthalpy of vaporization and the liquid fugacity.
 *  Units: T in K, P in bar, V in cm3/mol, H in J/mol. For a pure fluid ln φ = G^R/RT. */
import { roots, eosPsat, R } from './eos.js';
import { cubicResidual } from './residual.js';
export { R };
export const FUG_VERSION = 'p4-fugacity-engine-1';

function interpLog(T, s) { // ln P linear in T between table rows
  let i = 0; while (i < s.T.length - 2 && s.T[i + 1] < T) i++;
  const t = (T - s.T[i]) / (s.T[i + 1] - s.T[i]);
  const lin = (k) => s[k][i] + t * (s[k][i + 1] - s[k][i]);
  return { P: Math.exp(Math.log(s.P[i]) + t * (Math.log(s.P[i + 1]) - Math.log(s.P[i]))), VL: lin('VL'), VV: lin('VV'), dH: lin('HV') - lin('HL'), i };
}
/** Reference saturation state at T from the NIST table. */
export function satRef(data, f, T) { return interpLog(T, data.sat[f]); }
/** The equation's own saturation state at T: equal ln φ in the two phases, with Δ_vap H = H^R(vapor) − H^R(liquid). */
export function satEos(model, fl, T) {
  const s = eosPsat(model, fl, T); if (!s) return null;
  const rs = roots(model, fl, T, s.P).roots, L = rs[0], V = rs[rs.length - 1];
  const hL = cubicResidual(model, fl, T, s.P, 'smallest').HR, hV = cubicResidual(model, fl, T, s.P, 'largest').HR;
  return { P: s.P, VL: L.V, VV: V.V, ZL: L.Z, ZV: V.Z, lnphiL: L.gR, lnphiV: V.gR, phi: Math.exp(V.gR), dH: hV - hL, spinodal: s.spinodal };
}
/** Δ_vap H from the reference vapor-pressure curve: Clapeyron with the reference ΔV, and Clausius–Clapeyron (ideal vapor, V^L neglected). */
export function clapeyron(data, f, T) {
  const s = data.sat[f];
  let j = 1; for (let k = 1; k < s.T.length - 1; k++) if (Math.abs(s.T[k] - T) < Math.abs(s.T[j] - T)) j = k;
  // ln P is close to linear in x = 1/T: differentiate the quadratic through three rows at x = 1/T, then d ln P/dT = −x² d ln P/dx
  const [x0, x1, x2] = [1 / s.T[j - 1], 1 / s.T[j], 1 / s.T[j + 1]], [y0, y1, y2] = [Math.log(s.P[j - 1]), Math.log(s.P[j]), Math.log(s.P[j + 1])], x = 1 / T;
  const dydx = y0 * (2 * x - x1 - x2) / ((x0 - x1) * (x0 - x2)) + y1 * (2 * x - x0 - x2) / ((x1 - x0) * (x1 - x2)) + y2 * (2 * x - x0 - x1) / ((x2 - x0) * (x2 - x1));
  const dlnP = -x * x * dydx;
  const r = interpLog(T, s), dPdT = r.P * dlnP;
  return { clap: T * (r.VV - r.VL) * 1e-6 * dPdT * 1e5, cc: R * T * T * dlnP, ref: r.dH, P: r.P };
}
/** Fugacity at P on a reference isotherm: the NIST value, the cubic, and the Poynting estimate from the reference saturated liquid. */
export function fugacityRow(data, key, P, model = 'pr') {
  const c = data.isotherms[key], fl = data.fluids[c.fluid], T = c.T, ps = c.sat.P;
  let i = 0; for (let j = 1; j < c.P.length; j++) if (Math.abs(c.P[j] - P) < Math.abs(c.P[i] - P)) i = j;
  const ph = c.phase[i], fRef = Math.exp(c.lnphi[i]) * c.P[i];
  const rs = roots(model, fl, T, c.P[i]).roots, r = ph === 'l' ? rs[0] : rs[rs.length - 1];
  const iL = c.phase.indexOf('l'), lnphiSat = c.lnphi[iL], VL = c.sat.ZL * R * T / (ps * 1e5);
  const poy = ph === 'l' ? Math.exp(VL * (c.P[i] - ps) * 1e5 / (R * T)) : null;
  return { P: c.P[i], phase: ph, fRef, fEos: Math.exp(r.gR) * c.P[i], fPoy: ph === 'l' ? Math.exp(lnphiSat) * ps * poy : null, fSat: ph === 'l' ? Math.exp(lnphiSat) * ps : null, poy, ideal: c.P[i], phiRef: Math.exp(c.lnphi[i]) };
}
export function isothermCurve(data, key, model = 'pr') {
  const c = data.isotherms[key]; return c.P.map((P) => fugacityRow(data, key, P, model));
}
/** Vapor pressures of ice and supercooled liquid water (Murphy and Koop, 2005), Pa. */
export function iceWater(T) {
  const ice = Math.exp(9.550426 - 5723.265 / T + 3.53068 * Math.log(T) - 0.00728332 * T);
  const liq = Math.exp(54.842763 - 6763.22 / T - 4.210 * Math.log(T) + 0.000367 * T + Math.tanh(0.0415 * (T - 218.8)) * (53.878 - 1331.22 / T - 9.44523 * Math.log(T) + 0.014025 * T));
  return { ice, liq, ratio: ice / liq };
}
/** Solid over subcooled liquid fugacity from the enthalpy of fusion, neglecting ΔC_p: ln(f^s/f^l) = −(Δ_fus H/R)(1/T − 1/T_m). */
export function solidRatio(T, dHfus, Tm) { return Math.exp(-dHfus / R * (1 / T - 1 / Tm)); }
