"""Session P4 figures: fugacity, the vapor pressure of a cubic and the enthalpy of vaporization (Lab P4)."""
import json, subprocess
import numpy as np
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE, MIST
SAGE, PLUM = '#83A462', '#995A90'
setup()
COL = {'vdw': SAGE, 'srk': RUST, 'pr': AMBER}
NAME = {'vdw': 'van der Waals', 'srk': 'SRK', 'pr': 'Peng–Robinson'}
ROOT = str(HERE.parents[3])
js = """
import * as g from '%s/teaching/2105603/preview-2027/assets/fugacity.js';
import * as e from '%s/teaching/2105603/preview-2027/assets/eos.js';
import fs from 'fs';
const d=JSON.parse(fs.readFileSync('%s/teaching/2105603/labs/assets/p4-fugacity-nist.json'));
const out={};
const s=d.sat.propane, fl=d.fluids.propane; out.curve={T:s.T,P:s.P};
for (const m of ['vdw','srk','pr']) { const Ts=s.T.filter((t,k)=>k%%3===0&&t<fl.Tc-0.3); out.curve[m]=Ts.map(t=>{const q=g.satEos(m,fl,t); return q?[t,q.P]:null}).filter(Boolean); }
out.tank=['vdw','srk','pr'].map(m=>g.satEos(m,fl,300).P); out.tankRef=g.satRef(d,'propane',300).P;
const c=d.isotherms.co2_280; out.fug={P:c.P, f:c.P.map((P,j)=>Math.exp(c.lnphi[j])*P), phase:c.phase, pr:c.P.map(P=>g.fugacityRow(d,'co2_280',P,'pr').fEos), sat:c.sat.P};
const lj=c.P.map((_,j)=>j).filter(j=>c.phase[j]==='l'), ps=c.sat.P, VL=c.sat.ZL*g.R*280/(ps*1e5), lns=c.lnphi[c.phase.indexOf('l')];
out.fug.poyP=lj.map(j=>c.P[j]); out.fug.poy=lj.map(j=>Math.exp(lns)*ps*Math.exp(VL*(c.P[j]-ps)*1e5/(g.R*280)));
const co2=d.fluids.co2, sp=e.spinodals('pr',co2,280); const Ps=[]; for(let P=1;P<sp[1].P;P+=0.25) Ps.push(P);
out.gib={P:Ps, L:Ps.map(P=>{const r=e.roots('pr',co2,280,P).roots; return r.length>1?r[0].gR:null}), V:Ps.map(P=>{const r=e.roots('pr',co2,280,P).roots; return r[r.length-1].gR}), sp:sp.map(x=>x.P), psat:g.satEos('pr',co2,280).P};
const dh=[]; for (let k=2;k<s.T.length-2;k+=3) { const T=s.T[k]; if (T>fl.Tc-1) break; const q=g.clapeyron(d,'propane',T), p=g.satEos('pr',fl,T); dh.push([T,q.ref,q.cc,p?p.dH:null]); } out.dh=dh;
console.log(JSON.stringify(out));
""" % (ROOT, ROOT, ROOT)
open('/tmp/p4fig.mjs', 'w').write(js)
D = json.loads(subprocess.run(['node', '/tmp/p4fig.mjs'], capture_output=True, text=True).stdout)

# 1 · why: the vapor pressure of propane, a storage tank at 300 K
c = D['curve']; fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(c['T'], c['P'], 'o', color=TEAL, ms=3.5, label='NIST reference')
for m in ['vdw', 'srk', 'pr']:
    a = np.array(c[m]); ax.plot(a[:, 0], a[:, 1], color=COL[m], lw=2.4, label=NAME[m])
ax.axvline(300, color=MIST, lw=1.2, ls=(0, (4, 3)))
ax.annotate(f"300 K: NIST {D['tankRef']:.2f} bar\nvdW {D['tank'][0]:.1f}, SRK {D['tank'][1]:.2f}, PR {D['tank'][2]:.2f}", (300, D['tank'][0]), xytext=(195, 36), fontsize=13, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xlim(180, 375); ax.set_ylim(0, 46); ax.set_xlabel(r'Temperature $T$ / K'); ax.set_ylabel(r'Vapor pressure $P^{sat}$ / bar')
ax.legend(frameon=False, fontsize=13, loc='upper left', bbox_to_anchor=(0, 0.72)); ax.text(372, 1.5, 'propane', ha='right', fontsize=14, color=SLATE)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p04-why.svg', transparent=True); plt.close(fig)
print('tank', D['tank'], D['tankRef'])

# 2 · ln phi of the two Peng–Robinson roots: the crossing is the vapor pressure
gb = D['gib']; P = np.array(gb['P']); L = np.array([np.nan if v is None else v for v in gb['L']]); V = np.array(gb['V']); ps = gb['psat']
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(P[P <= ps], V[P <= ps], color=AMBER, lw=2.8, label='vapor root, stable')
ax.plot(P[P >= ps], V[P >= ps], color=AMBER, lw=1.8, ls=(0, (5, 3)), label='vapor root, metastable')
ax.plot(P[P >= ps], L[P >= ps], color=TEAL, lw=2.8, label='liquid root, stable')
ax.plot(P[P <= ps], L[P <= ps], color=TEAL, lw=1.8, ls=(0, (5, 3)), label='liquid root, metastable')
ax.plot(ps, np.interp(ps, P, V), 'o', color=INK, ms=9, mec='white', mew=1.2)
ax.annotate(r'equal $\ln\varphi$' + f' at {ps:.2f} bar\n(NIST 41.61 bar)', (ps, np.interp(ps, P, V)), xytext=(10, -0.45), fontsize=13, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xlim(0, 52); ax.set_ylim(-0.55, 1.0); ax.set_xlabel(r'Pressure $P$ / bar'); ax.set_ylabel(r'$\ln\varphi = G^R/RT$')
ax.legend(frameon=False, fontsize=12, loc='upper right'); ax.text(51, -0.53, 'CO$_2$, 280 K, Peng–Robinson', ha='right', va='bottom', fontsize=13, color=SLATE)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p04-gibbs.svg', transparent=True); plt.close(fig)

# 3 · fugacity along the CO2 isotherm at 280 K
F = D['fug']; P = np.array(F['P']); f = np.array(F['f']); ph = np.array(list(F['phase'])); pr = np.array(F['pr'])
fig, ax = plt.subplots(figsize=(7.4, 5.0)); sel = np.arange(len(P)) % 3 == 0
ax.plot([0, 200], [0, 200], color=MIST, lw=1.4, ls=(0, (2, 2)), label='ideal gas, f = P')
ax.plot(P[sel], f[sel], 'o', color=TEAL, ms=4.5, label='NIST reference')
for p_ in 'vl': m = ph == p_; ax.plot(P[m], pr[m], color=AMBER, lw=2.4, label='Peng–Robinson' if p_ == 'v' else None)
ax.plot(F['poyP'], F['poy'], color=GRAPHITE, lw=1.6, ls=(0, (5, 3)), label='Poynting from saturation')
ax.axvline(F['sat'], color=MIST, lw=1.2, ls=(0, (4, 3))); ax.text(F['sat'] + 3, 4, 'P$^{sat}$ = 41.6 bar', fontsize=13, color=SLATE)
ax.set_xlim(0, 200); ax.set_ylim(0, 60); ax.set_xlabel(r'Pressure $P$ / bar'); ax.set_ylabel(r'Fugacity $f$ / bar')
ax.legend(frameon=False, fontsize=12, loc='upper left'); ax.text(196, 56, 'CO$_2$, 280 K', ha='right', fontsize=14, color=SLATE)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p04-fug.svg', transparent=True); plt.close(fig)

# 4 · enthalpy of vaporization of propane
a = np.array([[r[0], r[1], r[2], np.nan if r[3] is None else r[3]] for r in D['dh']])
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(a[:, 0], a[:, 1] / 1000, 'o', color=TEAL, ms=4, label=r'NIST, H$^V$ − H$^L$ (Clapeyron with $\Delta V$ agrees)')
ax.plot(a[:, 0], a[:, 2] / 1000, color=GRAPHITE, lw=2, ls=(0, (5, 3)), label='Clausius–Clapeyron, ideal vapor')
ax.plot(a[:, 0], a[:, 3] / 1000, color=AMBER, lw=2.4, label='Peng–Robinson, H$^R$(V) − H$^R$(L)')
ax.set_xlim(180, 372); ax.set_ylim(0, 24); ax.set_xlabel(r'Temperature $T$ / K'); ax.set_ylabel(r'$\Delta H_{vap}$ / (kJ/mol)')
ax.legend(frameon=False, fontsize=12, loc='lower left'); ax.text(368, 22.5, 'propane', ha='right', fontsize=14, color=SLATE)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p04-dh.svg', transparent=True); plt.close(fig)
