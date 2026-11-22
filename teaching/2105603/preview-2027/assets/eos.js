/** Lab P2 engine: the virial and cubic equations of state against reference PVT data.
 *  Units: T in K, P in bar, V in cm3/mol, a in Pa m6/mol2, b in m3/mol, B and c in cm3/mol.
 *  Generic cubic (Smith, Van Ness and Abbott form): P = RT/(V − b) − a(T)/[(V + εb)(V + σb)]. */
export const EOS_VERSION = 'p2-eos-engine-1';
export const R = 8.31446261815324;
export const MODELS = {
  vdw: { name: 'van der Waals', eps: 0, sig: 0, Omega_a: 27 / 64, Omega_b: 1 / 8, Zc: 3 / 8 },
  rk: { name: 'Redlich–Kwong', eps: 0, sig: 1, Omega_a: 0.42748, Omega_b: 0.08664, Zc: 1 / 3 },
  srk: { name: 'Soave–Redlich–Kwong', eps: 0, sig: 1, Omega_a: 0.42748, Omega_b: 0.08664, Zc: 1 / 3 },
  pr: { name: 'Peng–Robinson', eps: 1 - Math.SQRT2, sig: 1 + Math.SQRT2, Omega_a: 0.45724, Omega_b: 0.07780, Zc: 0.30740 },
};
export const CUBIC = ['vdw', 'rk', 'srk', 'pr'];

/** α(T_r) and the slope parameter m. */
export function alphaFn(model, Tr, omega) {
  if (model === 'vdw') return { alpha: 1, m: null };
  if (model === 'rk') return { alpha: 1 / Math.sqrt(Tr), m: null };
  const m = model === 'srk' ? 0.480 + 1.574 * omega - 0.176 * omega * omega : 0.37464 + 1.54226 * omega - 0.26992 * omega * omega;
  const s = 1 + m * (1 - Math.sqrt(Tr));
  return { alpha: s * s, m };
}
export function params(model, fl, T) {
  const M = MODELS[model]; if (!M) throw new Error('Unknown model.');
  const Pc = fl.Pc * 1e5, Tr = T / fl.Tc, { alpha, m } = alphaFn(model, Tr, fl.omega);
  return { a: M.Omega_a * R * R * fl.Tc * fl.Tc / Pc * alpha, b: M.Omega_b * R * fl.Tc / Pc, alpha, m, Tr, eps: M.eps, sig: M.sig };
}
/** Coefficients of Z³ + c2 Z² + c1 Z + c0 = 0. */
export function cubicCoeffs(p, T, P) {
  const A = p.a * P * 1e5 / (R * T) ** 2, B = p.b * P * 1e5 / (R * T), es = p.eps * p.sig, s = p.eps + p.sig;
  return { A, B, c2: (s - 1) * B - 1, c1: A + es * B * B - s * B * (B + 1), c0: -(A * B + es * B * B * (B + 1)) };
}
/** Real roots of a monic cubic, ascending. */
export function cubicRoots(c2, c1, c0) {
  const q = (3 * c1 - c2 * c2) / 9, r = (9 * c2 * c1 - 27 * c0 - 2 * c2 ** 3) / 54, D = q ** 3 + r * r, sh = -c2 / 3;
  let z;
  if (D > 1e-300) { const s = Math.cbrt(r + Math.sqrt(D)), t = Math.cbrt(r - Math.sqrt(D)); z = [s + t + sh]; }
  else { const th = Math.acos(Math.max(-1, Math.min(1, r / Math.sqrt(-(q ** 3) || 1e-300)))), k = 2 * Math.sqrt(-q); z = [0, 1, 2].map((n) => k * Math.cos((th + 2 * Math.PI * n) / 3) + sh); }
  // one Newton polish per root
  z = z.map((x) => { for (let i = 0; i < 3; i++) { const f = ((x + c2) * x + c1) * x + c0, d = (3 * x + 2 * c2) * x + c1; if (d !== 0) x -= f / d; } return x; });
  return z.sort((a, b) => a - b);
}
/** Residual Gibbs energy G^R/RT of a root; for a pure fluid this is ln φ (derived in P3 and P4). */
export function residualG(Z, A, B, eps, sig) {
  const I = eps === sig ? B / Z : Math.log((Z + sig * B) / (Z + eps * B)) / (sig - eps);
  return Z - 1 - Math.log(Z - B) - (A / B) * I;
}
export function roots(model, fl, T, P) {
  const p = params(model, fl, T), k = cubicCoeffs(p, T, P);
  const z = cubicRoots(k.c2, k.c1, k.c0).filter((x) => x > k.B + 1e-12);
  const uniq = z.filter((x, i) => i === 0 || Math.abs(x - z[i - 1]) > 1e-10);
  return { p, k, roots: uniq.map((Z) => ({ Z, V: Z * R * T / (P * 1e5) * 1e6, gR: residualG(Z, k.A, k.B, p.eps, p.sig) })) };
}
/** Choose a root. rule: label (reference phase), gibbs (lower G), largest, smallest. */
export function choose(rs, rule, phase) {
  if (rs.length === 1) return rs[0];
  if (rule === 'largest' || (rule === 'label' && phase === 'v')) return rs[rs.length - 1];
  if (rule === 'smallest' || (rule === 'label' && phase === 'l')) return rs[0];
  return rs.reduce((m, r) => (r.gR < m.gR ? r : m));
}
export function zModel(model, fl, T, P, rule = 'label', phase = 's') { return choose(roots(model, fl, T, P).roots, rule, phase).Z; }
/** Pitzer correlation for B (Abbott form), cm3/mol. */
export function bPitzer(fl, T) {
  const Tr = T / fl.Tc, B0 = 0.083 - 0.422 / Tr ** 1.6, B1 = 0.139 - 0.172 / Tr ** 4.2;
  return { B0, B1, B: (B0 + fl.omega * B1) * R * fl.Tc / (fl.Pc * 1e5) * 1e6 };
}
/** Second virial coefficient implied by a cubic: B = b − a/RT, cm3/mol. */
export function bCubic(model, fl, T) { const p = params(model, fl, T); return (p.b - p.a / (R * T)) * 1e6; }
/** Pressure of a cubic at V (cm3/mol), bar. */
export function pressure(model, fl, T, V) { const p = params(model, fl, T), v = V * 1e-6; return (R * T / (v - p.b) - p.a / ((v + p.eps * p.b) * (v + p.sig * p.b))) / 1e5; }
/** Spinodal points (dP/dV = 0) of a cubic at T: [{V, P}] for the liquid-side minimum and vapor-side maximum. */
export function spinodals(model, fl, T) {
  const p = params(model, fl, T), out = [];
  const dP = (v) => -R * T / (v - p.b) ** 2 + p.a * (2 * v + (p.eps + p.sig) * p.b) / ((v + p.eps * p.b) * (v + p.sig * p.b)) ** 2;
  let v0 = p.b * 1.0001, d0 = dP(v0);
  for (let i = 1; i <= 4000; i++) {
    const v1 = p.b * (1.0001 + Math.pow(10, i / 1000) - 1), d1 = dP(v1);
    if (Math.sign(d1) !== Math.sign(d0)) { let lo = v0, hi = v1; for (let k = 0; k < 80; k++) { const mid = 0.5 * (lo + hi); if (Math.sign(dP(mid)) === Math.sign(dP(lo))) lo = mid; else hi = mid; } const v = 0.5 * (lo + hi); out.push({ V: v * 1e6, P: pressure(model, fl, T, v * 1e6) }); }
    v0 = v1; d0 = d1;
  }
  return out;
}
/** Saturation pressure of the cubic itself at T < Tc: equal G^R of the liquid and vapor roots (Session P4). */
export function eosPsat(model, fl, T) {
  if (T >= fl.Tc) return null;
  const sp = spinodals(model, fl, T); if (sp.length < 2) return null;
  let hi = sp[1].P * (1 - 1e-9), lo = Math.max(sp[0].P * (1 + 1e-9) + 1e-9, hi * 1e-4);
  const f = (P) => { const rs = roots(model, fl, T, P).roots; return rs.length < 2 ? NaN : rs[0].gR - rs[rs.length - 1].gR; };
  let flo = f(lo), fhi = f(hi);
  if (!(flo * fhi < 0)) return null;
  for (let i = 0; i < 100; i++) { const mid = Math.sqrt(lo * hi), fm = f(mid); if (!Number.isFinite(fm)) break; if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else { hi = mid; fhi = fm; } }
  const P = Math.sqrt(lo * hi), rs = roots(model, fl, T, P).roots;
  return { P, VL: rs[0].V, VV: rs[rs.length - 1].V, spinodal: sp };
}
/** Volume shift from the reference saturated liquid at T: c = V_EOS(liquid, Psat_ref) − V_ref(liquid). */
export function translation(model, fl, cs) {
  if (!cs.sat) return null;
  const T = cs.T, P = cs.sat.P, rs = roots(model, fl, T, P).roots, Vref = cs.sat.ZL * R * T / (P * 1e5) * 1e6;
  return { c: rs[0].V - Vref, Veos: rs[0].V, Vref };
}
/** Compare one model with every reference point of an isotherm. */
export function compare(model, fl, cs, { rule = 'label', shift = 0 } = {}) {
  const T = cs.T, rhoc = fl.rhoc, pts = [];
  for (let i = 0; i < cs.P.length; i++) {
    const P = cs.P[i], Zr = cs.Z[i], ph = cs.phase[i], rho = P * 1e5 / (Zr * R * T) / 1000; // mol/L
    let Z = null;
    if (model === 'ideal') Z = 1;
    else if (model === 'virial') Z = ph === 'l' || rho > rhoc ? null : 1 + bPitzer(fl, T).B * 1e-6 * P * 1e5 / (R * T);
    else Z = zModel(model, fl, T, P, rule, ph) - shift * 1e-6 * P * 1e5 / (R * T);
    pts.push({ P, Zr, Z, phase: ph, rho, err: Z == null ? null : 100 * (Z - Zr) / Zr });
  }
  const pick = (f) => pts.filter((q) => q.err != null && f(q)).map((q) => Math.abs(q.err));
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const lo = pick((q) => q.rho <= rhoc), hi = pick((q) => q.rho > rhoc), all = lo.concat(hi);
  return { pts, aadGas: mean(lo), aadDense: mean(hi), nGas: lo.length, nDense: hi.length, maxErr: all.length ? Math.max(...all) : null };
}
/** B and C from the reference isotherm: least squares of (Z − 1)/ρ on ρ for gas points with ρ ≤ rhoMax (mol/L). */
export function fitB(cs, fl, rhoMax) {
  const x = [], y = [];
  for (let i = 0; i < cs.P.length; i++) {
    if (cs.phase[i] === 'l') continue;
    const rho = cs.P[i] * 1e5 / (cs.Z[i] * R * cs.T) * 1e-6; // mol/cm3
    if (rho * 1000 <= rhoMax) { x.push(rho); y.push((cs.Z[i] - 1) / rho); }
  }
  const n = x.length; if (n < 3) return null;
  const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  const C = sxy / sxx, B = my - C * mx;
  return { B, C, n, rhoTop: Math.max(...x) * 1000 };
}
/** Reference Z interpolated at P along one phase of an isotherm. */
export function zAt(cs, P) {
  let best = 0; for (let i = 1; i < cs.P.length; i++) if (Math.abs(cs.P[i] - P) < Math.abs(cs.P[best] - P)) best = i;
  return { i: best, P: cs.P[best], Z: cs.Z[best], phase: cs.phase[best] };
}
