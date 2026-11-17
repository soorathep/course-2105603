// Lab 12 Graduate step E: steam methane reforming with NIST-JANAF data; check code an AI assistant helped write.
// R1 CH4 + H2O = CO + 3H2, R2 CO + H2O = CO2 + H2, ideal gas, standard state 1 bar.
// The lab computes ln K from Shomate H(T) and S(T), solves the two extents by nested bisection, and checks
// the student's outputs. Saved in the study file as "aiCode".
const $ = (id) => document.getElementById(id);
const fmt = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
export const R = 8.314462618;
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const INPUT = ['ai-T', 'ai-P', 'ai-SC', 'ai-k1', 'ai-k2', 'ai-X', 'ai-yh2', 'ai-yco', 'ai-yco2', 'ai-ych4'];
const SP = ['CH4', 'H2O', 'CO', 'CO2', 'H2'];

export function HS(sp, T) {
  const s = data.species[sp], r = s.shomate.find((x) => T >= x[0] && T <= x[1]);
  if (!r) throw new Error(`${sp}: T = ${T} K is outside the Shomate range.`);
  const [, , A, B, C, D, E, F, G, H] = r, t = T / 1000;
  return { H: s.dfH298 + A * t + B * t * t / 2 + C * t ** 3 / 3 + D * t ** 4 / 4 - E / t + F - H, S: A * Math.log(t) + B * t + C * t * t / 2 + D * t ** 3 / 3 - E / (2 * t * t) + G };
}
export function lnK(rx, T) {
  const nu = data.reactions[rx].nu;
  return -Object.entries(nu).reduce((a, [k, v]) => { const h = HS(k, T); return a + v * (h.H * 1000 - T * h.S); }, 0) / (R * T);
}
function lnK298vh(rx, T) {   // constant-ΔH van 't Hoff from 298.15 K data: a diagnosis only
  const nu = data.reactions[rx].nu;
  const dH = Object.entries(nu).reduce((a, [k, v]) => a + v * data.species[k].dfH298, 0) * 1000;
  const dS = Object.entries(nu).reduce((a, [k, v]) => a + v * data.species[k].S298, 0);
  return -(dH - 298.15 * dS) / (R * 298.15) - dH / R * (1 / T - 1 / 298.15);
}
const amounts = (e1, e2, SC) => ({ CH4: 1 - e1, H2O: SC - e1 - e2, CO: e1 - e2, CO2: e2, H2: 3 * e1 + e2 });
function bisect(f, lo, hi) {
  let flo = f(lo);
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m; if (hi - lo < 1e-14) break; }
  return (lo + hi) / 2;
}
export function equilibrium(T, PkPa, SC, k1 = lnK('R1', T), k2 = lnK('R2', T)) {
  const p = PkPa / 100, eps = 1e-13;
  const r1 = (e1, e2) => { const n = amounts(e1, e2, SC), N = 1 + SC + 2 * e1; return Math.log(n.CO) + 3 * Math.log(n.H2) - Math.log(n.CH4) - Math.log(n.H2O) + 2 * Math.log(p / N) - k1; };
  const r2 = (e1, e2) => { const n = amounts(e1, e2, SC); return Math.log(n.CO2) + Math.log(n.H2) - Math.log(n.CO) - Math.log(n.H2O) - k2; };
  const e1of = (e2) => bisect((e1) => r1(e1, e2), e2 + eps, Math.min(1, SC - e2) - eps);
  const hi = 0.95 * Math.min(1, SC / 2);
  const e2 = bisect((x) => r2(e1of(x), x), eps, hi), e1 = e1of(e2);
  const n = amounts(e1, e2, SC), N = 1 + SC + 2 * e1, y = Object.fromEntries(SP.map((k) => [k, n[k] / N]));
  return { e1, e2, y, N };
}
const close = (a, b, rel, abs = 0) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));

function csv() {
  const lines = ['species,dfH298_kJ_per_mol,S298_J_per_mol_K,Tmin_K,Tmax_K,A,B,C,D,E,F,G,H'];
  for (const [k, s] of Object.entries(data.species)) for (const r of s.shomate) lines.push([k, s.dfH298, s.S298, ...r].join(','));
  return lines.join('\n') + '\n';
}
function download() {
  const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'lab12-smr-nist-janaf.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function run() {
  try {
    if (!data) throw new Error('The reference data are not loaded yet.');
    const T = num('ai-T'), P = num('ai-P'), SC = num('ai-SC');
    if (!(T >= 500 && T <= 1200)) throw new Error('Choose T between 500 and 1200 K, the common range of the Shomate set.');
    if (!(P > 0 && P <= 5000)) throw new Error('Enter P in kPa, up to 5000.');
    if (!(SC >= 1.2 && SC <= 6)) throw new Error('Enter a steam-to-carbon ratio between 1.2 and 6.');
    const k1 = lnK('R1', T), k2 = lnK('R2', T), eq = equilibrium(T, P, SC), checks = [];

    for (const [rx, lab, id] of [['R1', k1, 'ai-k1'], ['R2', k2, 'ai-k2']]) {
      const you = num(id); if (!Number.isFinite(you)) continue;
      const ok = Math.abs(you - lab) <= 0.01;
      let why = '';
      if (!ok) {
        if (Math.abs(you - lnK298vh(rx, T)) <= 0.02) why = `Your value equals van 't Hoff with ΔH held at its 298.15 K value. Δ_rH changes with T (ΔC_p ≠ 0); use H(T) and S(T) from the Shomate equations.`;
        else if (Math.abs(you + lab) <= 0.01) why = 'Your value has the opposite sign: ln K = −Δ_rG°/RT, with products positive in ν.';
        else if (Math.abs(you - lab / Math.LN10) <= 0.01) why = 'Your value is log₁₀ K. The check uses ln K.';
        else why = 'Check Δ_rG°(T) = Σν(H − TS) with H in J/mol, and the Shomate range for each species at this T.';
      }
      checks.push({ name: `ln K of ${rx} at ${T} K (${data.reactions[rx].equation})`, lab: fmt(lab), yours: fmt(you), ok, why });
    }

    const ys = { H2: num('ai-yh2'), CO: num('ai-yco'), CO2: num('ai-yco2'), CH4: num('ai-ych4') };
    const given = Object.entries(ys).filter(([, v]) => Number.isFinite(v)), neg = given.some(([, v]) => v < 0);
    const kBad = checks.some((c) => !c.ok);
    const X = num('ai-X');
    if (Number.isFinite(X)) {
      const ok = Math.abs(X - eq.e1) <= 0.002;
      let why = '';
      if (!ok) {
        const vh = equilibrium(T, P, SC, lnK298vh('R1', T), lnK298vh('R2', T)).e1;
        let kpa = NaN; try { kpa = equilibrium(T, P * 100, SC).e1; } catch { /* outside */ }
        let nop = NaN; try { nop = equilibrium(T, 100, SC).e1; } catch { /* outside */ }
        if (neg) why = 'Your mole fractions include a negative value, so this conversion comes from an unphysical or unconverged solution. Fix the solver first.';
        else if (Math.abs(X - vh) <= 0.003) why = `Your conversion follows from constant-ΔH values of K (lab, with those K: ${fmt(vh)}).`;
        else if (Math.abs(X - kpa) <= 0.003) why = 'Your conversion follows from P in kPa where P/P° (P° = 1 bar = 100 kPa) is needed.';
        else if (P !== 100 && Math.abs(X - nop) <= 0.003) why = 'Your conversion is the 1 bar answer: the (P/P°)^Δν factor of R1 (Δν = +2) is missing.';
        else if (X <= 0 || X >= 1) why = 'Outside 0 < X < 1: the solver returned an unphysical or unconverged root. Check convergence and that every amount is positive.';
        else why = 'Check the mole balance (total moles 1 + S/C + 2ξ₁), the two equilibrium equations, and that the solver converged.';
      }
      checks.push({ name: `CH₄ conversion ξ₁ at ${T} K, ${P} kPa, S/C = ${SC}`, lab: fmt(eq.e1), yours: fmt(X), ok, why });
    }

    if (given.length) {
      const bad = given.filter(([k, v]) => Math.abs(v - eq.y[k]) > 0.002);
      checks.push({ name: 'Mole fractions (wet basis)', lab: given.map(([k]) => `${k} ${fmt(eq.y[k])}`).join(', '), yours: given.map(([k, v]) => `${k} ${fmt(v)}`).join(', '), ok: !bad.length && !neg,
        why: neg ? 'A negative mole fraction: the solver left the physical region. Use log residuals, keep every amount positive, and test convergence.' : bad.length && kBad ? 'Fix ln K first; the composition follows from it.' : bad.length ? `Differs for ${bad.map(([k]) => k).join(', ')}. Check whether you reported a dry basis, or divided by the feed moles instead of the total at equilibrium.` : '' });
      // element balances from the student's numbers, if complete
      if (['H2', 'CO', 'CO2', 'CH4'].every((k) => Number.isFinite(ys[k]))) {
        const yH2O = 1 - ys.H2 - ys.CO - ys.CO2 - ys.CH4, C = ys.CH4 + ys.CO + ys.CO2, O = yH2O + ys.CO + 2 * ys.CO2;
        const ratio = O / C, okb = Math.abs(ratio - SC) <= 0.02 * SC;
        checks.push({ name: 'O/C atom ratio of your mixture (water by difference)', lab: fmt(SC, 3), yours: fmt(ratio, 3), ok: okb,
          why: okb ? '' : 'Your mole fractions do not conserve the feed O/C ratio. The amounts were not computed from one pair of extents, or the basis is mixed.' });
      }
    }

    last = { T, P, SC, ref: { lnK1: k1, lnK2: k2, X: eq.e1, y: eq.y }, checks };
    render(last);
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message; }
}

function render(res) {
  $('ai-out').innerHTML = res.checks.map((c) => `<tr><th scope="row">${c.name}</th><td>${c.lab}</td><td>${c.yours}</td><td class="${c.ok ? '' : 'warn'}">${c.ok ? 'agrees' : 'check'}</td><td style="text-align:left">${c.why}</td></tr>`).join('');
  const bad = res.checks.filter((c) => !c.ok).length;
  $('ai-status').textContent = bad ? `${bad} of ${res.checks.length} checks disagree with the lab. Find the cause in the code, fix it, rerun, and enter the new outputs.` : `All ${res.checks.length} checks agree. Now explain what the checks do not establish.`;
  $('ai-results').hidden = false;
}

function state() {
  const s = { result: last };
  for (const id of [...TEXT, ...INPUT]) s[id] = $(id)?.value ?? '';
  return s;
}
function restore(s) {
  if (!s) return;
  for (const id of [...TEXT, ...INPUT]) if (typeof s[id] === 'string' && $(id)) $(id).value = s[id];
  if (s.result) run();
}

async function init() {
  if (!$('ai-run')) return;
  try {
    const response = await fetch(new URL('../../labs/assets/smr-nist.json', import.meta.url));
    data = await response.json();
    $('ai-run').disabled = false; $('ai-csv').disabled = false;
  } catch { $('ai-status').textContent = 'The reference data could not be loaded.'; }
  $('ai-run').addEventListener('click', run);
  $('ai-csv').addEventListener('click', download);
  $('import-study')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const rec = JSON.parse(await file.text()); restore(rec.aiCode); } catch { /* the lab reports invalid files */ }
  });
  window.aiCode = { state, run, csv, equilibrium, lnK };
}
init();
