/** Lab P3 engine: residual properties from equations of state and from reference PVT data, and their use in process energy balances.
 *  Units: T in K, P in bar, H and G in J/mol, S in J/(mol K). Residual M^R = M(T, P) − M^ig(T, P). */
import { params, cubicCoeffs, cubicRoots, residualG, choose, bPitzer, R } from './eos.js';
export { R };
export const RES_VERSION = 'p3-residual-engine-1';
export const MODELS = ['ideal', 'virial', 'vdw', 'rk', 'srk', 'pr'];

/** Shomate ideal-gas Cp, H − H(298.15 K) and S° at 1 bar (NIST WebBook form, t = T/1000). */
export function shomate(fl, T) {
  const c = fl.shomate, t = T / 1000;
  const Cp = c.A + c.B * t + c.C * t * t + c.D * t ** 3 + c.E / (t * t);
  const H = (c.A * t + c.B * t * t / 2 + c.C * t ** 3 / 3 + c.D * t ** 4 / 4 - c.E / t + c.F - c.H) * 1000;
  const S = c.A * Math.log(t) + c.B * t + c.C * t * t / 2 + c.D * t ** 3 / 3 - c.E / (2 * t * t) + c.G;
  return { Cp, H, S, inRange: T >= c.Tmin && T <= c.Tmax };
}
/** d ln α / d ln T_r for each cubic. */
export function dlnAlpha(model, p) {
  if (model === 'vdw') return 0;
  if (model === 'rk') return -0.5;
  const s = Math.sqrt(p.Tr); return -p.m * s / (1 + p.m * (1 - s));
}
/** Residual properties of a cubic. Returns the chosen root and the intermediate quantities for a paper check. */
export function cubicResidual(model, fl, T, P, rule = 'gibbs', phase = 's') {
  const p = params(model, fl, T), k = cubicCoeffs(p, T, P);
  const zs = cubicRoots(k.c2, k.c1, k.c0).filter((z) => z > k.B + 1e-12).map((Z) => ({ Z, gR: residualG(Z, k.A, k.B, p.eps, p.sig) }));
  const Z = choose(zs, rule, phase).Z, q = k.A / k.B, d = dlnAlpha(model, p);
  const I = p.eps === p.sig ? k.B / Z : Math.log((Z + p.sig * k.B) / (Z + p.eps * k.B)) / (p.sig - p.eps);
  const gRT = Z - 1 - Math.log(Z - k.B) - q * I, hRT = Z - 1 + (d - 1) * q * I, sR = Math.log(Z - k.B) + d * q * I;
  return { Z, GR: gRT * R * T, HR: hRT * R * T, SR: sR * R, beta: k.B, A: k.A, q, I, dlna: d, p, roots: zs.map((r) => r.Z) };
}
/** Truncated virial equation Z = 1 + BP/RT with the Pitzer B(T). */
export function virialResidual(fl, T, P) {
  const Tr = T / fl.Tc, b = bPitzer(fl, T), k = R * fl.Tc / (fl.Pc * 1e5);
  const dB = (0.675 / Tr ** 2.6 + fl.omega * 0.722 / Tr ** 5.2) * R / (fl.Pc * 1e5), B = b.B * 1e-6, Pa = P * 1e5;
  return { Z: 1 + B * Pa / (R * T), GR: B * Pa, HR: Pa * (B - T * dB), SR: -Pa * dB, B: b.B, dBdT: dB * 1e6, k };
}
export function residual(model, fl, T, P, rule = 'gibbs', phase = 's') {
  if (model === 'ideal') return { Z: 1, GR: 0, HR: 0, SR: 0 };
  if (model === 'virial') return virialResidual(fl, T, P);
  return cubicResidual(model, fl, T, P, rule, phase);
}
/* ---------- reference tables ---------- */
function interp(x, xs, ys) {
  let i = 0; while (i < xs.length - 2 && xs[i + 1] < x) i++;
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]); return ys[i] + t * (ys[i + 1] - ys[i]);
}
export const pressures = (data, f) => Object.keys(data.isobars[f]).filter((p) => p !== '0.001');
/** Ideal-gas H and S from either the Shomate equation or the NIST 0.001 bar isobar. H on the NIST reference scale only for 'nist'. */
export function idealGas(data, f, T, P, source = 'shomate') {
  if (source === 'nist') {
    const b = data.isobars[f]['0.001'];
    return { H: interp(T, b.T, b.H), S: interp(T, b.T, b.S) - R * Math.log(P / 0.001), Cp: interp(T, b.T, b.Cp), inRange: T >= b.T[0] && T <= b.T[b.T.length - 1] };
  }
  const s = shomate(data.fluids[f], T); return { H: s.H, S: s.S - R * Math.log(P), Cp: s.Cp, inRange: s.inRange };
}
/** Reference residuals at T on a tabulated isobar. */
export function nistResidual(data, f, T, Pkey) {
  const b = data.isobars[f][Pkey], g = data.isobars[f]['0.001'], P = Number(Pkey);
  const H = interp(T, b.T, b.H), S = interp(T, b.T, b.S), Z = interp(T, b.T, b.Z);
  const HR = H - interp(T, g.T, g.H), SR = S - interp(T, g.T, g.S) + R * Math.log(P / 0.001);
  let i = 0; for (let j = 1; j < b.T.length; j++) if (Math.abs(b.T[j] - T) < Math.abs(b.T[i] - T)) i = j;
  return { Z, HR, SR, GR: HR - T * SR, H, S, phase: b.phase[i] };
}
/* ---------- processes ---------- */
export const PROCESSES = {
  valve_ch4: { fluid: 'methane', kind: 'valve', T1: 300, P1: '100', P2: '20', label: 'Methane valve · 300 K, 100 → 20 bar' },
  valve_n2: { fluid: 'n2', kind: 'valve', T1: 300, P1: '200', P2: '1', label: 'Nitrogen valve · 300 K, 200 → 1 bar' },
  comp_ch4: { fluid: 'methane', kind: 'compressor', T1: 300, P1: '20', P2: '100', label: 'Methane compressor · 300 K, 20 → 100 bar, isentropic' },
  comp_co2: { fluid: 'co2', kind: 'compressor', T1: 300, P1: '30', P2: '100', label: 'CO₂ compressor · 300 K, 30 → 100 bar, isentropic' },
};
function bisect(f, lo, hi) {
  let flo = f(lo); const fhi = f(hi); if (!(flo * fhi <= 0)) return null;
  for (let i = 0; i < 80; i++) { const m = 0.5 * (lo + hi), fm = f(m); if (Math.sign(fm) === Math.sign(flo)) { lo = m; flo = fm; } else hi = m; }
  return 0.5 * (lo + hi);
}
/** Outlet temperature and ΔH (the work of a compressor) from a model and an ideal-gas source. */
export function process(data, key, model, source = 'shomate') {
  const pr = PROCESSES[key], f = pr.fluid, fl = data.fluids[f], P1 = Number(pr.P1), P2 = Number(pr.P2);
  const tot = (T, P) => { const ig = idealGas(data, f, T, P, source), r = residual(model, fl, T, P); return { H: ig.H + r.HR, S: ig.S + r.SR }; };
  const s1 = tot(pr.T1, P1), prop = pr.kind === 'valve' ? 'H' : 'S';
  const lo = source === 'nist' ? data.isobars[f]['0.001'].T[0] : 150, hi = source === 'nist' ? data.isobars[f]['0.001'].T.at(-1) : 700;
  const T2 = bisect((T) => tot(T, P2)[prop] - s1[prop], lo, hi);
  if (T2 == null) return null;
  const s2 = tot(T2, P2), ig1 = idealGas(data, f, pr.T1, P1, source), ig2 = idealGas(data, f, T2, P2, source);
  return { T2, W: s2.H - s1.H, dHig: ig2.H - ig1.H, HR1: s2.H - ig2.H - (s1.H - ig1.H), outOfRange: !ig2.inRange || !ig1.inRange };
}
export function nistProcess(data, key) {
  const pr = PROCESSES[key], a = data.isobars[pr.fluid][pr.P1], b = data.isobars[pr.fluid][pr.P2];
  const prop = pr.kind === 'valve' ? 'H' : 'S', v1 = interp(pr.T1, a.T, a[prop]), h1 = interp(pr.T1, a.T, a.H);
  let j = 0; while (j < b.T.length - 2 && b[prop][j + 1] < v1) j++;
  const t = (v1 - b[prop][j]) / (b[prop][j + 1] - b[prop][j]), T2 = b.T[j] + t * (b.T[j + 1] - b.T[j]);
  return { T2, W: interp(T2, b.T, b.H) - h1 };
}
/* ---------- residuals from the PVT data alone ---------- */
/** Integrate the reference isotherm at 300 K: G^R/RT = ∫(Z − 1)dP/P and H^R/RT = −T∫(∂Z/∂T)_P dP/P, with (∂Z/∂T)_P from the 299 and 301 K isotherms. every: use every k-th point. */
export function integrate(data, f, every = 1) {
  const it = data.isotherms[f], a = it['300'], lo = it['299'], hi = it['301'], g = data.isobars[f]['0.001'];
  const idx = []; for (let i = 0; i < a.P.length; i += every) if (a.phase[i] !== 'l') idx.push(i);
  const H0 = interp(300, g.T, g.H), S0 = interp(300, g.T, g.S), rows = [];
  // from P = 0 to the first point: the integrands tend to finite limits; take them as constant over [0, P1]
  let G = 0, Hs = 0, P0 = 0, y0 = null, w0 = null;
  for (const i of idx) {
    const P = a.P[i], y = (a.Z[i] - 1) / P, dZdT = (hi.Z[i] - lo.Z[i]) / 2, w = -300 * dZdT / P;
    if (y0 === null) { G += y * P; Hs += w * P; } else { G += 0.5 * (y + y0) * (P - P0); Hs += 0.5 * (w + w0) * (P - P0); }
    rows.push({ P, Z: a.Z[i], gRT: G, hRT: Hs, sR: Hs - G, ref: { hRT: (a.H[i] - H0) / (R * 300), sR: (a.S[i] - S0 + R * Math.log(P / 0.001)) / R } });
    P0 = P; y0 = y; w0 = w;
  }
  return rows;
}
