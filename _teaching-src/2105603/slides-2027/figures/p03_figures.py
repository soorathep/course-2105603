"""Session P3 figures: residual properties against NIST and process energy balances (Lab P3)."""
import json, math, subprocess
import numpy as np
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE, MIST
SAGE, PLUM = '#83A462', '#995A90'
setup()
COL = {'ideal': GRAPHITE, 'virial': PLUM, 'vdw': SAGE, 'rk': SKY, 'srk': RUST, 'pr': AMBER}
NAME = {'ideal': 'Ideal gas', 'virial': 'Virial, Pitzer B', 'vdw': 'van der Waals', 'rk': 'Redlich–Kwong', 'srk': 'SRK', 'pr': 'Peng–Robinson'}
# numbers from the lab engine itself, so the figures and Lab P3 agree
js = r"""
import * as r from '%s/teaching/2105603/preview-2027/assets/residual.js';
import fs from 'fs';
const d=JSON.parse(fs.readFileSync('%s/teaching/2105603/labs/assets/p3-residual-nist.json'));
const out={proc:{},hr:{},integ:{}};
for (const k of Object.keys(r.PROCESSES)) { out.proc[k]={nist:r.nistProcess(d,k)}; for (const m of r.MODELS) out.proc[k][m]=r.process(d,k,m,'shomate'); }
const it=d.isotherms.methane['300'], g=d.isobars.methane['0.001'], H0=g.H[g.T.indexOf(300)];
out.hr.P=it.P; out.hr.nist=it.H.map(h=>h-H0); for (const m of ['virial','srk','pr']) out.hr[m]=it.P.map(P=>r.residual(m,d.fluids.methane,300,P).HR);
const lo=d.isotherms.methane['299'], hi=d.isotherms.methane['301'];
out.integ={P:it.P, g:it.P.map((P,i)=>(it.Z[i]-1)/P), h:it.P.map((P,i)=>-300*(hi.Z[i]-lo.Z[i])/2/P)};
console.log(JSON.stringify(out));
""" % (str(HERE.parents[3]), str(HERE.parents[3]))
open('/tmp/p3fig.mjs', 'w').write(js)
D = json.loads(subprocess.run(['node', '/tmp/p3fig.mjs'], capture_output=True, text=True).stdout)

# 1 · why: work of the CO2 compressor
pc = D['proc']['comp_co2']; ref = pc['nist']['W']
fig, ax = plt.subplots(figsize=(7.4, 4.6))
keys = ['ideal', 'virial', 'srk', 'pr']; ys = list(range(len(keys) + 1))[::-1]
ax.barh(ys[0], ref, color=TEAL, height=0.6); ax.text(ref + 40, ys[0], f"{ref:.0f} J/mol  NIST reference, outlet {pc['nist']['T2']:.1f} K", va='center', fontsize=14, color=INK)
for y, k in zip(ys[1:], keys):
    w = pc[k]['W']; ax.barh(y, w, color=COL[k], height=0.6)
    ax.text(w + 40, y, f"{w:.0f}  {NAME[k]} (" + f"{100 * (w - ref) / ref:+.1f}".replace('-', '−') + f"%), {pc[k]['T2']:.1f} K", va='center', fontsize=14, color=INK)
ax.set_yticks([]); ax.set_xlim(0, 6200); ax.set_xlabel('Reversible work of CO$_2$ compression, 300 K, 30 to 100 bar / (J/mol)')
for sp in ['left', 'top', 'right']: ax.spines[sp].set_visible(False)
ax.spines['bottom'].set_color(GRAPHITE)
fig.tight_layout(); fig.savefig(HERE / 'p03-why.svg', transparent=True); plt.close(fig)

# 2 · the path as a waterfall (PR, CO2 compressor)
p = pc['pr']; H1R = -1400.07; H2R = H1R + p['HR1']
steps = [('−H$_1^R$\nreal to ideal', -H1R), (r'$\Delta H^{ig}$' + '\nShomate C$_p^{ig}$', p['dHig']), ('+H$_2^R$\nideal to real', H2R)]
fig, ax = plt.subplots(figsize=(7.4, 4.8)); x = 0; level = 0
for i, (lab, v) in enumerate(steps):
    col = AMBER if i != 1 else TEAL
    ax.bar(i, v, bottom=level, color=col, width=0.6)
    ax.text(i, level + v + (90 if v > 0 else -90), f"{v:+.0f}".replace('-', '−'), ha='center', va='bottom' if v > 0 else 'top', fontsize=14, color=INK)
    if i < 2: ax.plot([i + 0.3, i + 0.7], [level + v, level + v], color=GRAPHITE, lw=1)
    level += v
ax.bar(3, level, color=SAND, width=0.6, edgecolor=GRAPHITE, lw=1); ax.text(3, level + 90, r"$\Delta H$" + f" = {level:.0f}", ha='center', va='bottom', fontsize=14, color=INK)
ax.set_xticks([0, 1, 2, 3]); ax.set_xticklabels([s[0] for s in steps] + ['work\n(PR)'], fontsize=13)
ax.set_ylabel('Enthalpy change / (J/mol)'); ax.set_ylim(0, 6600); ax.axhline(0, color=GRAPHITE, lw=1)
ax.text(3.35, 6300, 'CO$_2$, 300 K, 30 to 100 bar, Peng–Robinson', ha='right', fontsize=13, color=SLATE)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p03-path.svg', transparent=True); plt.close(fig)
print('path', -H1R, p['dHig'], H2R, level)

# 3 · H^R of methane at 300 K against P
h = D['hr']; P = np.array(h['P']); sel = slice(None, None, 6)
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(P[sel], np.array(h['nist'])[sel], 'o', color=TEAL, ms=5, label='NIST reference')
for m in ['virial', 'srk', 'pr']: ax.plot(P, h[m], color=COL[m], lw=2.4, label=NAME[m])
ax.set_xlim(0, 200); ax.set_xlabel(r'Pressure $P$ / bar'); ax.set_ylabel(r'$H^R$ / (J/mol)')
ax.text(195, -150, 'methane, 300 K', ha='right', fontsize=14, color=SLATE)
ax.legend(frameon=False, fontsize=13, loc='lower left')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p03-hr.svg', transparent=True); plt.close(fig)

# 4 · outlet temperature errors for the four processes
labels = {'valve_ch4': 'Methane valve\n100 to 20 bar', 'valve_n2': 'Nitrogen valve\n200 to 1 bar', 'comp_ch4': 'Methane compressor\n20 to 100 bar', 'comp_co2': 'CO$_2$ compressor\n30 to 100 bar'}
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ks = list(labels)[::-1]
for j, k in enumerate(ks):
    for dy, m in zip([0.24, 0.08, -0.08, -0.24], ['ideal', 'virial', 'srk', 'pr']):
        e = D['proc'][k][m]['T2'] - D['proc'][k]['nist']['T2']; ec = max(min(e, 14), -14)
        ax.plot(ec, j + dy, 'o' if abs(e) <= 14 else '>', color=COL[m], ms=9, mec='white', label=NAME[m] if j == 0 else None)
        if abs(e) > 14: ax.text(13.3, j + dy, f'+{e:.0f}', ha='right', va='center', fontsize=12, color=INK)
ax.axvline(0, color=GRAPHITE, lw=1)
ax.set_yticks(range(len(ks))); ax.set_yticklabels([labels[k] for k in ks], fontsize=13)
ax.set_xlim(-14, 14); ax.set_xlabel('Outlet temperature − NIST / K')
ax.legend(frameon=False, fontsize=12, loc='lower center', ncol=4, bbox_to_anchor=(0.4, 1.0), handletextpad=0.2, columnspacing=0.9)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p03-outlets.svg', transparent=True); plt.close(fig)
for k in labels: print(k, {m: round(D['proc'][k][m]['T2'], 2) for m in ['ideal', 'virial', 'srk', 'pr']}, round(D['proc'][k]['nist']['T2'], 2))

# 5 · the integrands of G^R/RT and H^R/RT for methane at 300 K
I = D['integ']; P = np.array(I['P']); g = np.array(I['g']); hh = np.array(I['h'])
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.fill_between(P[P <= 100], 0, hh[P <= 100] * 1000, color=SAND, alpha=0.8, lw=0)
ax.fill_between(P[P <= 100], 0, g[P <= 100] * 1000, color=TEAL, alpha=0.25, lw=0)
ax.plot(P, hh * 1000, color=AMBER, lw=2.6, label=r'$-T(\partial Z/\partial T)_P/P$ gives $H^R/RT$')
ax.plot(P, g * 1000, color=TEAL, lw=2.6, label=r'$(Z-1)/P$ gives $G^R/RT$')
ax.axhline(0, color=GRAPHITE, lw=1); ax.axvline(100, color=MIST, lw=1.2, ls=(0, (4, 3)))
ax.text(50, -4.1, 'area to 100 bar = −0.643', ha='center', fontsize=13, color=INK)
ax.text(50, -1.15, 'area = −0.160', ha='center', fontsize=13, color=INK)
ax.set_xlim(0, 200); ax.set_ylim(-7.5, 0.5)
ax.set_xlabel(r'Pressure $P$ / bar'); ax.set_ylabel(r'Integrand / (10$^{-3}$ bar$^{-1}$)')
ax.legend(frameon=False, fontsize=13, loc='center right', bbox_to_anchor=(1, 0.62)); ax.text(195, 0.15, 'methane, 300 K, NIST isotherms', ha='right', fontsize=13, color=SLATE)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p03-integrand.svg', transparent=True); plt.close(fig)
