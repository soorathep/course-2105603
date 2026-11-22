/** Lab P5 engine: partial molar volumes from measured densities, and component fugacity coefficients in gas mixtures.
 *  Liquid: component 1 = ethanol, 2 = water; x = ethanol mole fraction; V in cm3/mol.
 *  Gas: virial mixture with B_ij in cm3/mol; Peng–Robinson with van der Waals one-fluid mixing rules. */
import { R, params } from './eos.js';
export { R };
export const MIX_VERSION = 'p5-mixture-engine-1';

/* ---------- liquid: excess volume and partial molar volumes ---------- */
export function liquidPoints(liq) {
  const V0 = liq.M.map((m, i) => m / liq.rhoPure[i]);
  return { V0, pts: liq.xWater.map((xw, k) => { const x = 1 - xw, M = x * liq.M[0] + xw * liq.M[1], V = M / liq.rho[k]; return { x, V, VE: V - x * V0[0] - xw * V0[1] }; }) };
}
/** Least squares of V^E = x1 x2 Σ A_k (x1 − x2)^k, k = 0..order−1. */
export function rkFit(pts, order) {
  const n = order, A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
  for (const p of pts) { const x = p.x, w = x * (1 - x), f = Array.from({ length: n }, (_, k) => w * (2 * x - 1) ** k); for (let i = 0; i < n; i++) { b[i] += f[i] * p.VE; for (let j = 0; j < n; j++) A[i][j] += f[i] * f[j]; } }
  for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  const coef = b.map((v, i) => v / A[i][i]);
  const res = pts.map((p) => p.VE - veRK(coef, p.x)), rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / pts.length);
  return { coef, res, rms, dof: pts.length - n };
}
export function veRK(A, x) { const d = 2 * x - 1; return x * (1 - x) * A.reduce((s, a, k) => s + a * d ** k, 0); }
export function dveRK(A, x) {
  const d = 2 * x - 1, S = A.reduce((s, a, k) => s + a * d ** k, 0), dS = A.reduce((s, a, k) => s + (k ? 2 * k * a * d ** (k - 1) : 0), 0);
  return (1 - 2 * x) * S + x * (1 - x) * dS;
}
/** Partial molar volumes by the tangent-intercept rule at ethanol mole fraction x. */
export function partials(A, V0, x) {
  const V = x * V0[0] + (1 - x) * V0[1] + veRK(A, x), dV = V0[0] - V0[1] + dveRK(A, x);
  return { V, dV, V1: V + (1 - x) * dV, V2: V - x * dV };
}
export function infiniteDilution(A, V0) { return { V1: V0[0] + A.reduce((s, a, k) => s + a * (-1) ** k, 0), V2: V0[1] + A.reduce((s, a) => s + a, 0) }; }
/** Gibbs–Duhem check: x1 dV̄1/dx1 + x2 dV̄2/dx1 by central differences. */
export function gibbsDuhem(A, V0, x, h = 1e-5) {
  const a = partials(A, V0, x - h), b = partials(A, V0, x + h);
  return { lhs: x * (b.V1 - a.V1) / (2 * h) + (1 - x) * (b.V2 - a.V2) / (2 * h), dV1: (b.V1 - a.V1) / (2 * h), dV2: (b.V2 - a.V2) / (2 * h) };
}

/* ---------- gas: cross virial coefficients and component fugacity ---------- */
const pitzerB = (Tr, w) => (0.083 - 0.422 / Tr ** 1.6) + w * (0.139 - 0.172 / Tr ** 4.2);
/** B12 from the Prausnitz combining rules for the Pitzer correlation, cm3/mol. */
export function b12Pitzer(f1, f2, T, k12 = 0) {
  const Tc = Math.sqrt(f1.Tc * f2.Tc) * (1 - k12), Vc = ((Math.cbrt(f1.Vc) + Math.cbrt(f2.Vc)) / 2) ** 3, Zc = (f1.Zc + f2.Zc) / 2, w = (f1.omega + f2.omega) / 2;
  const Pc = Zc * R * Tc / (Vc * 1e-6); return { B: pitzerB(T / Tc, w) * R * Tc / Pc * 1e6, Tc, Pc: Pc / 1e5, Vc, Zc, w };
}
/** B12 implied by Peng–Robinson: b12 − a12/RT with a12 = √(a1 a2)(1 − k12), b12 = (b1 + b2)/2. */
export function b12PR(f1, f2, T, k12 = 0) { const p1 = params('pr', f1, T), p2 = params('pr', f2, T); return ((p1.b + p2.b) / 2 - Math.sqrt(p1.a * p2.a) * (1 - k12) / (R * T)) * 1e6; }
export function b12Rule(rule, pair, fl, T, k12 = 0) {
  const f1 = fl[pair.i], f2 = fl[pair.j];
  if (rule === 'measured') return pair.B12;
  if (rule === 'arith') return (f1.B298 + f2.B298) / 2;
  if (rule === 'geom') return -Math.sqrt(f1.B298 * f2.B298);
  if (rule === 'pitzer') return b12Pitzer(f1, f2, T, k12).B;
  if (rule === 'pr') return b12PR(f1, f2, T, k12);
  throw new Error('Unknown rule.');
}
/** Virial mixture at y1 (component i of the pair): Z, ln φ̂1, ln φ̂2 and the Lewis–Randall values ln φ_i(pure). */
export function virialMix(B11, B22, B12, T, P, y1) {
  const y2 = 1 - y1, d = 2 * B12 - B11 - B22, k = P * 1e5 / (R * T) * 1e-6;
  const Bm = y1 * y1 * B11 + 2 * y1 * y2 * B12 + y2 * y2 * B22;
  return { Bm, Z: 1 + Bm * k, lnphi1: k * (B11 + y2 * y2 * d), lnphi2: k * (B22 + y1 * y1 * d), lr1: k * B11, lr2: k * B22, delta: d };
}
/** Peng–Robinson mixture, vdW one-fluid rules: ln φ̂ of both components (vapor root). */
export function prMix(f1, f2, T, P, y1, k12 = 0) {
  const p1 = params('pr', f1, T), p2 = params('pr', f2, T), y = [y1, 1 - y1], a = [[p1.a, Math.sqrt(p1.a * p2.a) * (1 - k12)], [Math.sqrt(p1.a * p2.a) * (1 - k12), p2.a]], b = [p1.b, p2.b];
  let am = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) am += y[i] * y[j] * a[i][j];
  const bm = y[0] * b[0] + y[1] * b[1], A = am * P * 1e5 / (R * T) ** 2, B = bm * P * 1e5 / (R * T);
  // Z³ − (1 − B)Z² + (A − 3B² − 2B)Z − (AB − B² − B³) = 0: take the largest real root by Newton from Z = 1
  let Z = 1; for (let it = 0; it < 100; it++) { const f = Z ** 3 - (1 - B) * Z * Z + (A - 3 * B * B - 2 * B) * Z - (A * B - B * B - B ** 3), df = 3 * Z * Z - 2 * (1 - B) * Z + (A - 3 * B * B - 2 * B); const dz = f / df; Z -= dz; if (Math.abs(dz) < 1e-14) break; }
  const L = Math.log((Z + (1 + Math.SQRT2) * B) / (Z + (1 - Math.SQRT2) * B)), s2 = 2 * Math.SQRT2;
  const lnphi = [0, 1].map((i) => { const sa = y[0] * a[i][0] + y[1] * a[i][1]; return b[i] / bm * (Z - 1) - Math.log(Z - B) - A / (s2 * B) * (2 * sa / am - b[i] / bm) * L; });
  return { Z, lnphi1: lnphi[0], lnphi2: lnphi[1] };
}
