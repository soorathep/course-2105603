/** Lab P6 engine: excess Gibbs energy from measured VLE, activity-coefficient models, infinite dilution, Henry's law and stability.
 *  Component 1 = 2-propanol, 2 = water. Modified Raoult's law with an ideal vapor: y_i P = x_i γ_i P_i^sat(T). Model parameters are constant in T. */
export const ACT_VERSION = 'p6-activity-engine-1';
export const MODELS = { m1: 'Margules, one parameter', m2: 'Margules, two parameters', vl: 'van Laar', wilson: 'Wilson', nrtl: 'NRTL' };

export function psat(prop, T) { return 100 * 10 ** (prop.A - prop.B / (T + prop.C)); } // kPa
export function inRange(props, T) { return props.every((p) => T >= p.rangeK[0] && T <= p.rangeK[1]); }
/** Experimental activity coefficients and G^E/RT from one isobaric data set. */
export function experimental(ds, props) {
  const out = [];
  for (const r of ds.rows) {
    if (!(r.x > 0 && r.x < 1 && r.y > 0 && r.y < 1) || !inRange(props, r.T)) continue;
    const p1 = psat(props[0], r.T), p2 = psat(props[1], r.T), g1 = r.y * r.PkPa / (r.x * p1), g2 = (1 - r.y) * r.PkPa / ((1 - r.x) * p2);
    out.push({ ...r, p1, p2, g1, g2, gE: r.x * Math.log(g1) + (1 - r.x) * Math.log(g2) });
  }
  return out;
}
export function lnGamma(model, p, x1) {
  const x2 = 1 - x1;
  if (model === 'm1') return [p[0] * x2 * x2, p[0] * x1 * x1];
  if (model === 'm2') { const [A12, A21] = p; return [x2 * x2 * (A12 + 2 * (A21 - A12) * x1), x1 * x1 * (A21 + 2 * (A12 - A21) * x2)]; }
  if (model === 'vl') { const [A12, A21] = p; if (x1 <= 0) return [A12, 0]; if (x2 <= 0) return [0, A21]; return [A12 / (1 + A12 * x1 / (A21 * x2)) ** 2, A21 / (1 + A21 * x2 / (A12 * x1)) ** 2]; }
  if (model === 'wilson') { const [L12, L21] = p, t = L12 / (x1 + L12 * x2) - L21 / (x2 + L21 * x1); return [-Math.log(x1 + L12 * x2) + x2 * t, -Math.log(x2 + L21 * x1) - x1 * t]; }
  if (model === 'nrtl') { const [t12, t21, a] = p, G12 = Math.exp(-a * t12), G21 = Math.exp(-a * t21);
    return [x2 * x2 * (t21 * (G21 / (x1 + x2 * G21)) ** 2 + t12 * G12 / (x2 + x1 * G12) ** 2), x1 * x1 * (t12 * (G12 / (x2 + x1 * G12)) ** 2 + t21 * G21 / (x1 + x2 * G21) ** 2)]; }
  throw new Error('Unknown model.');
}
export const gE = (model, p, x1) => { const l = lnGamma(model, p, x1); return x1 * l[0] + (1 - x1) * l[1]; };
export function infDilution(model, p) {
  if (model === 'm1') return [p[0], p[0]];
  if (model === 'm2' || model === 'vl') return [p[0], p[1]];
  if (model === 'wilson') return [-Math.log(p[0]) + 1 - p[1], -Math.log(p[1]) + 1 - p[0]];
  const [t12, t21, a] = p; return [t21 + t12 * Math.exp(-a * t12), t12 + t21 * Math.exp(-a * t21)];
}
function nelder(f, x0, step = 0.5, iters = 600) {
  const n = x0.length; let S = [x0, ...x0.map((_, i) => x0.map((v, j) => (i === j ? v + step : v)))].map((x) => ({ x, f: f(x) }));
  for (let k = 0; k < iters; k++) {
    S.sort((a, b) => a.f - b.f); const c = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += S[i].x[j] / n;
    const w = S[n], refl = c.map((v, j) => v + (v - w.x[j])), fr = f(refl);
    if (fr < S[0].f) { const e = c.map((v, j) => v + 2 * (v - w.x[j])), fe = f(e); S[n] = fe < fr ? { x: e, f: fe } : { x: refl, f: fr }; }
    else if (fr < S[n - 1].f) S[n] = { x: refl, f: fr };
    else { const ct = c.map((v, j) => v + 0.5 * (w.x[j] - v)), fc = f(ct); if (fc < w.f) S[n] = { x: ct, f: fc }; else S = S.map((s, i) => (i === 0 ? s : { x: s.x.map((v, j) => S[0].x[j] + 0.5 * (v - S[0].x[j])), f: 0 })).map((s, i) => (i === 0 ? s : { x: s.x, f: f(s.x) })); }
    if (Math.abs(S[n].f - S[0].f) < 1e-15) break;
  }
  S.sort((a, b) => a.f - b.f); return S[0];
}
/** Least-squares fit. objective 'gE': residuals of G^E/RT (Margules then linear); 'lng': residuals of ln γ1 and ln γ2.
 *  Nonlinear cases use Nelder–Mead from several starts (Wilson in ln Λ). */
export function fit(model, pts, alpha = 0.3, objective = 'lng') {
  const res = objective === 'gE' ? (p) => pts.reduce((s, q) => s + (gE(model, p, q.x) - q.gE) ** 2, 0)
    : (p) => pts.reduce((s, q) => { const l = lnGamma(model, p, q.x); return s + (l[0] - Math.log(q.g1)) ** 2 + (l[1] - Math.log(q.g2)) ** 2; }, 0);
  let p;
  if (model === 'm1' && objective === 'gE') { let num = 0, den = 0; for (const q of pts) { const w = q.x * (1 - q.x); num += w * q.gE; den += w * w; } p = [num / den]; }
  else if (model === 'm2' && objective === 'gE') { // G^E/RT = x1x2(A21 x1 + A12 x2)
    let a = 0, b = 0, c = 0, d1 = 0, d2 = 0; for (const q of pts) { const w = q.x * (1 - q.x), f1 = w * (1 - q.x), f2 = w * q.x; a += f1 * f1; b += f1 * f2; c += f2 * f2; d1 += f1 * q.gE; d2 += f2 * q.gE; }
    const det = a * c - b * b; p = [(d1 * c - d2 * b) / det, (a * d2 - b * d1) / det];
  } else {
    const starts = model === 'm1' ? [[1], [2]] : model === 'wilson' ? [[0, 0], [-1, -1], [1, -2], [-2, 1]] : model === 'vl' || model === 'm2' ? [[1, 1], [2, 1], [1, 2], [3, 2]] : [[0.5, 1.5], [0, 2], [1, 1], [-0.5, 2.5]];
    const tr = (z) => (model === 'wilson' ? z.map(Math.exp) : model === 'nrtl' ? [z[0], z[1], alpha] : z);
    let best = null; for (const s of starts) { const r = nelder((z) => { const v = res(tr(z)); return Number.isFinite(v) ? v : 1e9; }, s, 0.5); if (!best || r.f < best.f) best = r; }
    p = tr(best.x);
  }
  const r = pts.map((q) => gE(model, p, q.x) - q.gE), rms = Math.sqrt(r.reduce((s, v) => s + v * v, 0) / pts.length);
  const rl = pts.map((q) => { const l = lnGamma(model, p, q.x); return [l[0] - Math.log(q.g1), l[1] - Math.log(q.g2)]; }), rmsLn = Math.sqrt(rl.reduce((s, v) => s + v[0] ** 2 + v[1] ** 2, 0) / (2 * pts.length));
  return { model, p, objective, rms, rmsLn, res: r, inf: infDilution(model, p) };
}
/** Bubble temperature and vapor composition at x1 and P (kPa) with constant parameters. */
export function bubbleT(model, p, props, x1, P) {
  const g = lnGamma(model, p, x1).map(Math.exp), f = (T) => x1 * g[0] * psat(props[0], T) + (1 - x1) * g[1] * psat(props[1], T) - P;
  let lo = Math.max(props[0].rangeK[0], props[1].rangeK[0]), hi = Math.min(props[0].rangeK[1], props[1].rangeK[1]);
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 80; i++) { const m = 0.5 * (lo + hi); if (f(m) * f(lo) > 0) lo = m; else hi = m; }
  const T = 0.5 * (lo + hi); return { T, y1: x1 * g[0] * psat(props[0], T) / P };
}
/** Smallest scaled curvature x1x2 ∂²(Δg_mix/RT)/∂x1² = 1 + x1x2 ∂²(G^E/RT)/∂x1² on a grid: negative means a liquid split. */
export function minCurvature(model, p) {
  let best = { c: Infinity, x: null }, h = 1e-4;
  for (let k = 1; k < 200; k++) { const x = k / 200, d2 = (gE(model, p, x + h) - 2 * gE(model, p, x) + gE(model, p, x - h)) / (h * h), c = 1 + x * (1 - x) * d2; if (c < best.c) best = { c, x }; }
  return best;
}
/** Predict a data set: RMS of y1 and T from bubble calculations at the measured x and P. */
export function predict(model, p, props, ds) {
  const rows = []; for (const r of ds.rows) { if (!(r.x > 0 && r.x < 1) || !inRange(props, r.T)) continue; const b = bubbleT(model, p, props, r.x, r.PkPa); if (b) rows.push({ x: r.x, Texp: r.T, yexp: r.y, T: b.T, y: b.y1 }); }
  const rm = (k, e) => Math.sqrt(rows.reduce((s, q) => s + (q[k] - q[e]) ** 2, 0) / rows.length);
  return { rows, rmsT: rm('T', 'Texp'), rmsY: rm('y', 'yexp') };
}
