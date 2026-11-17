// Lab 13 Graduate step E: measured mean activity coefficients of KCl and a concentration-cell EMF;
// check code that an AI assistant helped write. Data: Nasiri-Lohehsara and Ghalami-Choobar (2018) via
// NIST ThermoML. Model: ln γ± = −A√m/(1 + b√m) + c m, A = 0.509 ln 10, fitted by least squares in ln γ±.
// Cell pair Ag|AgCl|KCl(m)|K-ISE at m1 and m2 in opposition: E = (2RT/F) ln(m2γ2/(m1γ1)). Saved as "aiCode".
const $ = (id) => document.getElementById(id);
const fmt = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const num = (id) => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
export const R = 8.314462618, F = 96485.33212;
let data = null, last = null;
const TEXT = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext', 'ai-found', 'ai-own'];
const INPUT = ['ai-set', 'ai-lim', 'ai-b', 'ai-c', 'ai-rmse', 'ai-g1', 'ai-m1', 'ai-m2', 'ai-eid', 'ai-e'];

const Aln = () => data.debyeHuckel.A10 * Math.LN10;
export const lnG = (m, b, c) => -Aln() * Math.sqrt(m) / (1 + b * Math.sqrt(m)) + c * m;
function rowsFor(set) { return data.rows.filter((r) => set === 'all' || r.T === Number(set)); }

// Least squares in ln γ for (b, c): c is linear given b, so scan b and solve c exactly, then refine.
export function fit(rs) {
  const sse = (b) => {
    const u = rs.map((r) => Math.log(r.g) + Aln() * Math.sqrt(r.m) / (1 + b * Math.sqrt(r.m)));
    const c = rs.reduce((a, r, i) => a + r.m * u[i], 0) / rs.reduce((a, r) => a + r.m * r.m, 0);
    return { c, s: rs.reduce((a, r, i) => a + (u[i] - c * r.m) ** 2, 0) };
  };
  let lo = 0, hi = 10; const gr = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - gr * (hi - lo), x2 = lo + gr * (hi - lo), f1 = sse(x1).s, f2 = sse(x2).s;
  for (let i = 0; i < 150; i++) { if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - gr * (hi - lo); f1 = sse(x1).s; } else { lo = x1; x1 = x2; f1 = f2; x2 = lo + gr * (hi - lo); f2 = sse(x2).s; } }
  const b = (lo + hi) / 2, { c, s } = sse(b);
  return { b, c, rmse: Math.sqrt(s / rs.length) };
}
export const cellE = (T, m1, g1, m2, g2) => 2 * R * T / F * Math.log((m2 * g2) / (m1 * g1));
const close = (a, b, rel, abs = 0) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));

function csv() {
  return 'molality_mol_per_kg,T_K,gamma_pm,U_gamma_95pct\n' + data.rows.map((r) => [r.m, r.T, r.g, r.U].join(',')).join('\n') + '\n';
}
function download() {
  const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'lab13-kcl-activity.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function run() {
  try {
    if (!data) throw new Error('The measured data are not loaded yet.');
    const set = $('ai-set').value, rs = rowsFor(set), ft = fit(rs), checks = [];
    const T = 298.15, m1 = num('ai-m1'), m2 = num('ai-m2');
    if (!(m1 > 0 && m2 > 0 && m1 <= 3 && m2 <= 3)) throw new Error('Enter the two molalities of the cell, between 0 and 3 mol/kg.');

    const lim = num('ai-lim'), limLab = Math.exp(-Aln() * Math.sqrt(0.0124));
    if (Number.isFinite(lim)) {
      const ok = close(lim, limLab, 0.001);
      checks.push({ name: 'Debye–Hückel limiting law, γ± at 0.0124 mol/kg', lab: fmt(limLab), yours: fmt(lim), ok,
        why: ok ? '' : close(lim, Math.exp(-data.debyeHuckel.A10 * Math.sqrt(0.0124)), 0.001) ? 'A = 0.509 is on the log₁₀ basis. Used with ln it gives this value; use 10^(−A√m) or multiply A by ln 10.' : 'Check γ± = 10^(−A|z₊z₋|√I) with I = m for a 1:1 salt.' });
    }

    const b = num('ai-b'), c = num('ai-c');
    if (!Number.isFinite(b) || !Number.isFinite(c)) throw new Error('Enter the fitted b and c from your code.');
    const okB = Math.abs(b - ft.b) <= Math.max(0.01, 0.01 * ft.b);
    const okC = Math.abs(c - ft.c) <= 0.002;
    let whyP = '';
    if (!(okB && okC)) {
      if (okB && Math.abs(c * Math.LN10 - ft.c) <= 0.002) whyP = 'Your c is on the log₁₀ basis (c_ln = c × ln 10). Same fit, different units: say which you report.';
      else if (set !== 'all') { const fa = fit(rowsFor('all')); if (Math.abs(b - fa.b) <= 0.02) whyP = 'Your parameters match a fit to both temperatures. The specification uses the 298.2 K rows only.'; }
      if (!whyP) whyP = 'Check the model form, the basis (ln), the rows used and that the least squares converged.';
    }
    checks.push({ name: `Fitted b and c in ln γ± = −A√m/(1 + b√m) + c·m (${rs.length} rows)`, lab: `b = ${fmt(ft.b, 4)}, c = ${fmt(ft.c, 4)}`, yours: `b = ${fmt(b, 4)}, c = ${fmt(c, 4)}`, ok: okB && okC, why: whyP });

    const rm = num('ai-rmse');
    if (Number.isFinite(rm)) {
      const own = Math.sqrt(rs.reduce((a, r) => a + (lnG(r.m, b, okC ? c : c * Math.LN10) - Math.log(r.g)) ** 2, 0) / rs.length);
      const ok = close(rm, own, 0.03, 3e-4);
      checks.push({ name: 'RMSE in ln γ± at your parameters', lab: fmt(own), yours: fmt(rm), ok,
        why: ok ? '' : close(rm, own / Math.LN10, 0.03) ? 'This is the RMSE in log₁₀ γ±. The check uses ln γ±.' : 'Check that the error is in ln γ± over the same rows as the fit.' });
    }

    const g1 = num('ai-g1'), cLn = okC ? c : (okB && Math.abs(c * Math.LN10 - ft.c) <= 0.002 ? c * Math.LN10 : c);
    if (Number.isFinite(g1)) {
      const lab = Math.exp(lnG(1.0, b, cLn)), ok = close(g1, lab, 0.003);
      checks.push({ name: 'γ± at 1.0 mol/kg from your parameters', lab: fmt(lab), yours: fmt(g1), ok, why: ok ? '' : 'Evaluate your fitted model at m = 1.0 mol/kg, on the same basis you fitted.' });
    }

    const eid = num('ai-eid'), eLab = cellE(T, m1, 1, m2, 1);
    if (Number.isFinite(eid)) {
      const ok = close(eid, eLab, 0.002);
      checks.push({ name: `Ideal cell EMF, γ± = 1, ${m1} vs ${m2} mol/kg at ${T} K`, lab: `${fmt(eLab, 5)} V`, yours: `${fmt(eid, 5)} V`, ok,
        why: ok ? '' : close(eid, eLab / 2, 0.002) ? 'Half the lab value: the activity of KCl is (mγ±)², two ions per formula unit. E = (2RT/F) ln(m₂γ₂/m₁γ₁), or RT/F with the squared activities.' : close(eid, -eLab, 0.002) ? 'The sign is reversed: which molality is at which electrode?' : 'Check E = (2RT/F) ln(m₂/m₁) with R in J/(mol K) and F in C/mol.' });
    }
    const eYou = num('ai-e');
    if (Number.isFinite(eYou)) {
      const lab = cellE(T, m1, Math.exp(lnG(m1, b, cLn)), m2, Math.exp(lnG(m2, b, cLn))), ok = close(eYou, lab, 0.002);
      checks.push({ name: 'Cell EMF with your fitted γ±', lab: `${fmt(lab, 5)} V`, yours: `${fmt(eYou, 5)} V`, ok,
        why: ok ? '' : close(eYou, lab / 2, 0.003) ? 'Half the lab value: the factor 2 for the two ions is missing.' : 'Use γ± from your fit at each molality, not γ = 1 on one side.' });
    }

    const lab308 = fit(rowsFor('308.2'));
    checks.push({ name: 'Same model fitted to the 308.2 K rows (for the discussion)', lab: `b = ${fmt(lab308.b, 3)}, c = ${fmt(lab308.c, 4)}, RMSE ${fmt(lab308.rmse, 4)}`, yours: '—', ok: true, kind: 'info',
      why: 'Compare γ± at 1 mol/kg at the two temperatures with the stated uncertainty, about ±0.03. Can these data give d ln γ±/dT, and so the partial molar enthalpy?' });

    last = { set, m1, m2, ref: { b: ft.b, c: ft.c, rmse: ft.rmse, Eideal: eLab }, checks };
    render(last);
  } catch (e) { last = null; $('ai-results').hidden = true; $('ai-status').textContent = e.message; }
}

function render(res) {
  $('ai-out').innerHTML = res.checks.map((c) => `<tr><th scope="row">${c.name}</th><td>${c.lab}</td><td>${c.yours}</td><td class="${c.ok ? '' : 'warn'}">${c.kind === 'info' ? 'compare' : c.ok ? 'agrees' : 'check'}</td><td style="text-align:left">${c.why}</td></tr>`).join('');
  const code = res.checks.filter((c) => !c.kind), bad = code.filter((c) => !c.ok).length;
  $('ai-status').textContent = bad ? `${bad} of ${code.length} code checks disagree with the lab. Find the cause in the code, fix it, rerun, and enter the new outputs.` : `All ${code.length} code checks agree. Now explain what the checks do not establish.`;
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
    const response = await fetch(new URL('../../labs/assets/kcl-activity.json', import.meta.url));
    data = await response.json();
    $('ai-run').disabled = false; $('ai-csv').disabled = false;
  } catch { $('ai-status').textContent = 'The measured data could not be loaded.'; }
  $('ai-run').addEventListener('click', run);
  $('ai-csv').addEventListener('click', download);
  $('import-study')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const rec = JSON.parse(await file.text()); restore(rec.aiCode); } catch { /* the lab reports invalid files */ }
  });
  window.aiCode = { state, run, csv, fit: (s) => fit(rowsFor(s)) };
}
init();
