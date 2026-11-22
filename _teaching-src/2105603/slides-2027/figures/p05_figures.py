"""Session P5 figures: partial molar volumes of ethanol + water and component fugacity in gas mixtures (Lab P5)."""
import json, subprocess
import numpy as np
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE, MIST
SAGE, PLUM = '#83A462', '#995A90'
setup(); ROOT = str(HERE.parents[3])
js = """
import * as m from '%s/teaching/2105603/preview-2027/assets/mixture.js';
import fs from 'fs';
const d=JSON.parse(fs.readFileSync('%s/teaching/2105603/labs/assets/p5-mixtures.json'));
const L=m.liquidPoints(d.liquid), xs=Array.from({length:199},(_,k)=>(k+1)/200), out={pts:L.pts,V0:L.V0,fits:{}};
for (const n of [2,3,5]) { const f=m.rkFit(L.pts,n); out.fits[n]={A:f.coef, ve:xs.map(x=>m.veRK(f.coef,x)), v1:xs.map(x=>m.partials(f.coef,L.V0,x).V1-L.V0[0]), v2:xs.map(x=>m.partials(f.coef,L.V0,x).V2-L.V0[1])}; }
out.xs=xs; const A3=m.rkFit(L.pts,3).coef; out.tan={x:0.3, v:m.veRK(A3,0.3), s:m.dveRK(A3,0.3)};
const T=298.15, fl=d.gas.fluids; out.b12={};
for (const [k,pr] of Object.entries(d.gas.pairs)) out.b12[k]={meas:pr.B12,u:pr.u,arith:m.b12Rule('arith',pr,fl,T),geom:m.b12Rule('geom',pr,fl,T),pitzer:m.b12Pitzer(fl[pr.i],fl[pr.j],T,0).B,pr:m.b12PR(fl[pr.i],fl[pr.j],T,0)};
const ys=Array.from({length:51},(_,k)=>k/50), f1=fl.co2, f2=fl.methane, pr=d.gas.pairs['co2-methane'];
out.phi={y:ys, meas:ys.map(y=>Math.exp(m.virialMix(f1.B298,f2.B298,pr.B12,T,30,y).lnphi1)), lr:ys.map(y=>Math.exp(m.virialMix(f1.B298,f2.B298,pr.B12,T,30,y).lr1)), pit:ys.map(y=>Math.exp(m.virialMix(f1.B298,f2.B298,m.b12Pitzer(f1,f2,T,0).B,T,30,y).lnphi1)), pr0:ys.map(y=>Math.exp(m.prMix(f1,f2,T,30,y,0).lnphi1))};
console.log(JSON.stringify(out));
""" % (ROOT, ROOT)
open('/tmp/p5fig.mjs', 'w').write(js)
D = json.loads(subprocess.run(['node', '/tmp/p5fig.mjs'], capture_output=True, text=True).stdout)
xs = np.array(D['xs']); px = [p['x'] for p in D['pts']]; pv = [p['VE'] for p in D['pts']]

# 1 · V^E with the fit and the tangent at x = 0.3
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(xs, D['fits']['3']['ve'], color=AMBER, lw=2.6, label='3-term Redlich–Kister fit')
ax.plot(px, pv, 'o', color=TEAL, ms=8, mec='white', mew=1, label='Measured, 298.15 K (Pires et al., 2007)')
t = D['tan']; ax.plot([0, 1], [t['v'] - t['s'] * t['x'], t['v'] + t['s'] * (1 - t['x'])], color=GRAPHITE, lw=1.5, ls=(0, (5, 3)), label='Tangent at x = 0.3')
ax.plot(t['x'], t['v'], 'o', color=INK, ms=8)
ax.annotate(r'$\bar V_{water}-V^*_{water}$', (0, t['v'] - t['s'] * t['x']), xytext=(0.06, -1.5), fontsize=13, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.annotate(r'$\bar V_{ethanol}-V^*_{ethanol}$', (1, t['v'] + t['s'] * (1 - t['x'])), xytext=(0.66, -1.78), fontsize=13, color=INK)
ax.set_xlim(0, 1); ax.set_ylim(-1.9, 0.45); ax.axhline(0, color=GRAPHITE, lw=1)
ax.set_xlabel('Ethanol mole fraction $x$'); ax.set_ylabel(r'Excess volume $V^E$ / (cm$^3$/mol)')
ax.legend(frameon=False, fontsize=12, loc='upper center')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p05-ve.svg', transparent=True); plt.close(fig)
print('tangent', t, 'ends', t['v'] - t['s'] * t['x'], t['v'] + t['s'] * (1 - t['x']))

# 2 · partial molar volumes for 2, 3 and 5 terms
fig, ax = plt.subplots(figsize=(7.4, 5.0))
for n, ls in [('2', (0, (2, 2))), ('3', '-'), ('5', (0, (6, 3)))]:
    ax.plot(xs, D['fits'][n]['v1'], color=AMBER, lw=2.4 if n == '3' else 1.6, ls=ls, label=f'ethanol, {n} terms')
    ax.plot(xs, D['fits'][n]['v2'], color=TEAL, lw=2.4 if n == '3' else 1.6, ls=ls, label=f'water, {n} terms')
ax.axvspan(0, min(px), color=SAND, alpha=0.5, lw=0); ax.axvspan(max(px), 1, color=SAND, alpha=0.5, lw=0)
ax.text(0.045, -1.0, 'no data', rotation=90, ha='center', fontsize=12, color=SLATE); ax.text(0.952, -1.0, 'no data', rotation=90, ha='center', fontsize=12, color=SLATE)
ax.set_xlim(0, 1); ax.set_ylim(-8, 1); ax.axhline(0, color=GRAPHITE, lw=1)
ax.set_xlabel('Ethanol mole fraction $x$'); ax.set_ylabel(r'$\bar V_i - V_i^*$ / (cm$^3$/mol)')
ax.legend(frameon=False, fontsize=11.5, loc='lower center', ncol=3)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p05-vbar.svg', transparent=True); plt.close(fig)

# 3 · cross virial coefficients against rules
fig, ax = plt.subplots(figsize=(7.4, 4.8)); labs = {'co2-methane': 'CO$_2$ + methane', 'co2-ethane': 'CO$_2$ + ethane', 'methane-ethane': 'methane + ethane'}
marks = [('arith', 'Arithmetic mean (Lewis–Randall)', GRAPHITE, 's'), ('geom', 'Geometric mean', SKY, 'D'), ('pitzer', 'Pitzer–Prausnitz, k$_{12}$ = 0', RUST, '^'), ('pr', 'Peng–Robinson, k$_{12}$ = 0', AMBER, 'v')]
for j, (k, b) in enumerate(D['b12'].items()):
    y = 2 - j; ax.errorbar(b['meas'], y, xerr=b['u'], fmt='o', color=TEAL, ms=11, mec='white', label='Measured (Katayama et al., 1980)' if j == 0 else None)
    for dy, (key, name, col, mk) in zip([0.22, 0.11, -0.11, -0.22], marks): ax.plot(b[key], y + dy, mk, color=col, ms=8, label=name if j == 0 else None)
ax.set_yticks([2, 1, 0]); ax.set_yticklabels(list(labs.values()), fontsize=13); ax.set_ylim(-0.6, 3.9)
ax.set_xlabel(r'$B_{12}$ at 298.15 K / (cm$^3$/mol)'); ax.set_xlim(-180, -40)
ax.legend(frameon=False, fontsize=11.5, loc='upper left', ncol=2)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p05-b12.svg', transparent=True); plt.close(fig)

# 4 · phi-hat of CO2 in methane at 30 bar
P = D['phi']; y = np.array(P['y'])
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(y, P['meas'], color=TEAL, lw=2.8, label='Virial, measured B$_{12}$')
ax.plot(y, P['lr'], color=GRAPHITE, lw=1.8, ls=(0, (5, 3)), label='Lewis–Randall (pure CO$_2$)')
ax.plot(y, P['pit'], color=RUST, lw=2, label='Virial, Pitzer–Prausnitz B$_{12}$')
ax.plot(y, P['pr0'], color=AMBER, lw=2, label='Peng–Robinson, k$_{12}$ = 0')
ax.set_xlim(0, 1); ax.set_ylim(0.84, 0.91); ax.set_xlabel('Mole fraction of CO$_2$, $y_1$'); ax.set_ylabel(r'$\hat\varphi_{CO_2}$')
ax.text(0.02, 0.8415, 'CO$_2$ + methane, 298.15 K, 30 bar', ha='left', fontsize=13, color=SLATE)
ax.legend(frameon=False, fontsize=12, loc='upper right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p05-phi.svg', transparent=True); plt.close(fig)
