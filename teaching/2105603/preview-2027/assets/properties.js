/** Lab P1 engine: measurable properties from tabulated PVT and Cp (NIST reference equations of state).
 * Pure functions, no DOM. Units: T K, P bar, V L/mol, H kJ/mol, S J/(mol K), Cp J/(mol K), μJT K/bar.
 * 1 L bar = 100 J, so V(∂P) terms in J need a factor 100. */
export const PROPERTIES_VERSION = '1.0.0';
export const R = 8.314462618;            // J/(mol K)

const nearest = (a, v) => a.reduce((best, x, k) => (Math.abs(x - v) < Math.abs(a[best] - v) ? k : best), 0);

/** Central or forward difference of y with respect to x around the middle row, using `step` rows. */
function diff(x, y, step, scheme, i) {
  if (!Number.isInteger(step) || step < 1) throw new Error('The step must be a whole number of table rows.');
  if (i + step >= x.length || i - step < 0) throw new Error('The step is larger than the tabulated range around this state.');
  if (scheme === 'forward') return (y[i + step] - y[i]) / (x[i + step] - x[i]);
  return (y[i + step] - y[i - step]) / (x[i + step] - x[i - step]);
}

export const tableSpacing = (st) => ({ dT: st.isobar.T[1] - st.isobar.T[0], dP: st.isotherm.P[1] - st.isotherm.P[0] });
export const stateIndex = (st) => ({ i: nearest(st.isobar.T, st.T), j: nearest(st.isotherm.P, st.P) });

/** Properties at the state's (T, P) from finite differences with steps given in table rows. */
export function properties(st, { stepT = 5, stepP = 5, scheme = 'central' } = {}) {
  const ib = st.isobar, it = st.isotherm, i = nearest(ib.T, st.T), j = nearest(it.P, st.P);
  const T = ib.T[i], P = it.P[j], V = ib.V[i], Cp = ib.Cp[i], Cv = ib.Cv[i];
  const dVdT = diff(ib.T, ib.V, stepT, scheme, i);       // L/(mol K)
  const dVdP = diff(it.P, it.V, stepP, scheme, j);       // L/(mol bar)
  const dSdP = diff(it.P, it.S, stepP, scheme, j);       // J/(mol K bar)
  const alpha = dVdT / V, kappa = -dVdP / V;             // 1/K, 1/bar
  if (!(kappa > 0)) throw new Error('The isotherm gives a non-positive compressibility at this step: the state is unstable or the step is too large.');
  const cpcv = T * V * alpha * alpha / kappa * 100;      // J/(mol K)
  const mu = (T * dVdT - V) / Cp * 100;                  // K/bar
  const piT = T * alpha / kappa - P;                     // (∂U/∂V)_T in bar
  const dHdP = (V - T * dVdT) * 100;                     // (∂H/∂P)_T in J/(mol bar)
  const maxwell = { dSdP, minusdVdT: -dVdT * 100 };      // both J/(mol K bar)
  const Z = P * V * 100 / (R * T);
  const ref = { cpcv: Cp - Cv, mu: ib.JT[i] };
  const ideal = { alpha: 1 / T, kappa: 1 / P, cpcv: R, mu: 0, piT: 0, dHdP: 0 };
  const sp = tableSpacing(st);
  return { T, P, V, Z, Cp, Cv, alpha, kappa, cpcv, mu, piT, dHdP, maxwell, ref, ideal,
    step: { dT: stepT * sp.dT, dP: stepP * sp.dP, scheme } };
}

const rel = (a, b) => (b === 0 ? null : 100 * (a - b) / Math.abs(b));

/** Step-size study: μJT and Cp − Cv against the reference for several temperature steps, both schemes. */
export function stepStudy(st, rowsT = [1, 2, 5, 10, 20, 50, 100], stepP = 5) {
  const out = [];
  for (const scheme of ['central', 'forward']) for (const k of rowsT) {
    try {
      const p = properties(st, { stepT: k, stepP, scheme });
      out.push({ scheme, dT: p.step.dT, mu: p.mu, muErr: rel(p.mu, p.ref.mu), cpcv: p.cpcv, cpcvErr: rel(p.cpcv, p.ref.cpcv) });
    } catch (e) { out.push({ scheme, dT: k * tableSpacing(st).dT, error: e.message }); }
  }
  return out;
}

const interp = (x, xs, ys) => {
  if (x < xs[0] || x > xs[xs.length - 1]) throw new Error('Outside the tabulated temperature range.');
  let k = 0; while (k < xs.length - 2 && xs[k + 1] < x) k++;
  return ys[k] + (ys[k + 1] - ys[k]) * (x - xs[k]) / (xs[k + 1] - xs[k]);
};
function invert(target, xs, ys) {   // x where y(x) = target, y monotonic increasing in x
  for (let k = 0; k < xs.length - 1; k++) if ((ys[k] - target) * (ys[k + 1] - target) <= 0) return xs[k] + (target - ys[k]) * (xs[k + 1] - xs[k]) / (ys[k + 1] - ys[k]);
  throw new Error('The outlet temperature is outside the tabulated range.');
}

/** Throttling (isenthalpic) predictions: ideal gas, constant inlet μJT, μJT integrated along the path, and the enthalpy balance. */
export function throttle(g, nSteps = null) {
  const iP1 = g.P.indexOf(g.P1), iP2 = g.P.indexOf(g.P2);
  const H1 = interp(g.T1, g.T, g.H[iP1]);
  const T2 = invert(H1, g.T, g.H[iP2]);
  const mu1 = interp(g.T1, g.T, g.JT[iP1]);
  const constant = g.T1 + mu1 * (g.P2 - g.P1);
  // Heun steps along the tabulated isobars from P1 down to P2 (or a coarser subset)
  let idx = g.P.map((_, k) => k).filter((k) => (g.P[k] - g.P2) * (g.P[k] - g.P1) <= 0).sort((a, b) => g.P[b] - g.P[a]);
  if (nSteps && nSteps < idx.length - 1) { const pick = []; for (let s = 0; s <= nSteps; s++) pick.push(idx[Math.round(s * (idx.length - 1) / nSteps)]); idx = pick; }
  let T = g.T1; const path = [{ P: g.P1, T }];
  for (let s = 0; s < idx.length - 1; s++) {
    const a = idx[s], b = idx[s + 1], dP = g.P[b] - g.P[a];
    const m1 = interp(T, g.T, g.JT[a]), Tp = T + m1 * dP, m2 = interp(Tp, g.T, g.JT[b]);
    T += 0.5 * (m1 + m2) * dP; path.push({ P: g.P[b], T });
  }
  return { H1, T2, ideal: g.T1, constant, mu1, integrated: T, steps: idx.length - 1, path };
}

/** Joule–Thomson inversion temperatures from tabulated μJT along isobars, and the van der Waals prediction. */
export function inversion(inv, crit) {
  const rows = inv.isobars.map((b) => {
    const T = [];
    for (let k = 0; k < b.T.length - 1; k++) if (Math.sign(b.JT[k]) !== Math.sign(b.JT[k + 1])) T.push(b.T[k] - b.JT[k] * (b.T[k + 1] - b.T[k]) / (b.JT[k + 1] - b.JT[k]));
    return { P: b.P, T, vdw: vdwInversion(b.P / crit.Pc).map((tr) => tr * crit.Tc) };
  });
  return { rows, vdwLowP: 6.75 * crit.Tc, vdwMaxP: 9 * crit.Pc };
}

/** Van der Waals inversion curve in reduced form: Pr = 24 sqrt(3 Tr) − 12 Tr − 27. Returns the Tr roots at Pr. */
export function vdwInversion(Pr) {
  // with u = sqrt(3 Tr): 4u² − 24u + 27 + Pr = 0
  const disc = 576 - 16 * (27 + Pr);
  if (disc < 0) return [];
  const u = [(24 - Math.sqrt(disc)) / 8, (24 + Math.sqrt(disc)) / 8];
  return u.map((x) => x * x / 3);
}
