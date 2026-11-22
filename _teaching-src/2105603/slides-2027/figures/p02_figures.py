"""Session P2 figures: equations of state against NIST reference isotherms (Lab P2)."""
import json, math
import numpy as np
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE, MIST
SAGE, PLUM = '#83A462', '#995A90'
setup()
d = json.loads((HERE.parents[3] / 'teaching/2105603/labs/assets/p2-eos-nist.json').read_text())
R = 8.31446261815324
EPS = {'vdw': (0, 0), 'rk': (0, 1), 'srk': (0, 1), 'pr': (1 - 2**.5, 1 + 2**.5)}
COL = {'ideal': GRAPHITE, 'virial': PLUM, 'vdw': SAGE, 'rk': SKY, 'srk': RUST, 'pr': AMBER}
NAME = {'ideal': 'Ideal gas', 'virial': 'Virial, Pitzer B', 'vdw': 'van der Waals', 'rk': 'Redlich–Kwong', 'srk': 'SRK', 'pr': 'Peng–Robinson'}


def ab(m, f, T):
    Tc, Pc, om = f['Tc'], f['Pc'] * 1e5, f['omega']; Tr = T / Tc
    if m == 'vdw': return 27 / 64 * R**2 * Tc**2 / Pc, R * Tc / (8 * Pc)
    if m == 'rk': return 0.42748 * R**2 * Tc**2 / Pc / Tr**.5, 0.08664 * R * Tc / Pc
    k = 0.480 + 1.574 * om - 0.176 * om**2 if m == 'srk' else 0.37464 + 1.54226 * om - 0.26992 * om**2
    al = (1 + k * (1 - Tr**.5))**2
    return (0.42748 if m == 'srk' else 0.45724) * R**2 * Tc**2 / Pc * al, (0.08664 if m == 'srk' else 0.07780) * R * Tc / Pc


def roots(m, f, T, P):
    a, b = ab(m, f, T); e, s = EPS[m]; A = a * P * 1e5 / (R * T)**2; B = b * P * 1e5 / (R * T)
    p = np.polyadd(np.polysub(np.polymul(np.polymul([1, -B], [1, e * B]), [1, s * B]), np.polymul([1, e * B], [1, s * B])), [A, -A * B])
    return sorted([z.real for z in np.roots(p) if abs(z.imag) < 1e-9 and z.real > B])


def zm(m, f, T, P, ph):
    z = roots(m, f, T, P)
    return z[-1] if ph != 'l' else z[0]


def bpit(f, T):
    Tr = T / f['Tc']; return (0.083 - 0.422 / Tr**1.6 + f['omega'] * (0.139 - 0.172 / Tr**4.2)) * R * f['Tc'] / (f['Pc'] * 1e5) * 1e6


# 1 · why: the CO2 tank, 1 m3 at 280 K and 100 bar
cs, f = d['cases']['co2_280'], d['fluids']['co2']; M = 0.0440098
i = cs['P'].index(100.0); Vref = cs['Z'][i] * R * 280 / 1e7
mass = {'ideal': 1 / (R * 280 / 1e7) * M}
for m in ['vdw', 'rk', 'srk', 'pr']: mass[m] = 1 / (zm(m, f, 280, 100, 'l') * R * 280 / 1e7) * M
ref = 1 / Vref * M
fig, ax = plt.subplots(figsize=(7.4, 4.8))
keys = ['ideal', 'vdw', 'rk', 'srk', 'pr']
ys = list(range(len(keys) + 1))[::-1]
ax.barh(ys[0], ref, color=TEAL, height=0.62)
ax.text(ref + 15, ys[0], f'{ref:.0f} kg  NIST reference', va='center', fontsize=14, color=INK)
for y, k in zip(ys[1:], keys):
    ax.barh(y, mass[k], color=COL[k], height=0.62)
    ax.text(mass[k] + 15, y, f'{mass[k]:.0f} kg  {NAME[k]} (' + f'{100 * (mass[k] - ref) / ref:+.1f}'.replace('-', '−') + '%)', va='center', fontsize=14, color=INK)
ax.set_yticks([]); ax.set_xlim(0, 1500); ax.set_xlabel('Mass of CO$_2$ in a 1 m$^3$ vessel at 280 K and 100 bar / kg')
for sp in ['left', 'top', 'right']: ax.spines[sp].set_visible(False)
ax.spines['bottom'].set_color(GRAPHITE)
fig.tight_layout(); fig.savefig(HERE / 'p02-why.svg', transparent=True); plt.close(fig)
print('why', {k: round(v) for k, v in mass.items()}, round(ref))

# 2 · corresponding states at Tr = 1.05
fig, ax = plt.subplots(figsize=(7.4, 5.0))
for key, col in zip(['ch4_tr105', 'co2_tr105', 'c3_tr105', 'h2o_tr105'], [TEAL, AMBER, RUST, SKY]):
    c, fl = d['cases'][key], d['fluids'][d['cases'][key]['fluid']]
    ax.plot(np.array(c['P']) / fl['Pc'], c['Z'], color=col, lw=2.4, label=f"{fl['name']}, " + r'$\omega$' + f" = {fl['omega']:.3f}")
c0, f0 = d['cases']['ch4_tr105'], d['fluids']['methane']
ax.plot(np.array(c0['P']) / f0['Pc'], [roots('vdw', f0, c0['T'], p)[-1] if len(roots('vdw', f0, c0['T'], p)) == 1 else roots('vdw', f0, c0['T'], p)[-1] for p in c0['P']], color=GRAPHITE, lw=2, ls=(0, (5, 3)), label='van der Waals, every fluid')
ax.set_xlim(0, 3); ax.set_ylim(0.2, 1.02)
ax.set_xlabel(r'Reduced pressure $P_r = P/P_c$'); ax.set_ylabel(r'Compressibility factor $Z$')
ax.text(0.05, 0.24, r'$T_r = 1.05$, NIST reference', ha='left', va='bottom', fontsize=14, color=SLATE)
ax.legend(frameon=False, fontsize=13, loc='upper right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p02-csp.svg', transparent=True); plt.close(fig)

# 3 · the PR isotherm of CO2 at 280 K: three roots at 30 bar
a, b = ab('pr', f, 280); e, s = EPS['pr']
V = np.geomspace(b * 1.06, 3e-3, 3000)
P = (R * 280 / (V - b) - a / ((V + e * b) * (V + s * b))) / 1e5
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(V * 1e6, P, color=AMBER, lw=2.6, label='Peng–Robinson, 280 K')
z30 = roots('pr', f, 280, 30); Vr = [z * R * 280 / 3e6 * 1e6 for z in z30]
ax.axhline(30, color=GRAPHITE, lw=1.2, ls=(0, (4, 3)))
for v, lab, col in zip(Vr, ['liquid', 'unstable', 'vapor'], [INK, RUST, INK]):
    ax.plot(v, 30, 'o', color=col, ms=9, mec='white', mew=1.2)
    ax.annotate(lab, (v, 30), xytext=(v * 1.08, 16 if lab != 'unstable' else 21), fontsize=14, color=INK)
sat = cs['sat']; VL = sat['ZL'] * R * 280 / (sat['P'] * 1e5) * 1e6; VV = sat['ZV'] * R * 280 / (sat['P'] * 1e5) * 1e6
ax.plot([VL, VV], [sat['P'], sat['P']], color=TEAL, lw=2.2)
ax.plot([VL, VV], [sat['P'], sat['P']], 's', color=TEAL, ms=8, mec='white')
ax.text(58, 55, f"NIST saturation, {sat['P']:.1f} bar", ha='left', fontsize=13, color=TEAL)
ax.set_xscale('log'); ax.set_xlim(40, 3000); ax.set_ylim(-20, 90)
ax.set_xlabel(r'Molar volume $V$ / (cm$^3$/mol), log scale'); ax.set_ylabel(r'Pressure $P$ / bar')
ax.axhline(0, color=MIST, lw=1)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p02-cubic.svg', transparent=True); plt.close(fig)
print('roots 30 bar', [round(z, 4) for z in z30], 'V', [round(v, 1) for v in Vr], 'VL VV', round(VL, 2), round(VV, 1))

# 4 · error along the CO2 280 K isotherm
fig, ax = plt.subplots(figsize=(7.4, 5.0))
for m in ['vdw', 'srk', 'pr']:
    for ph in 'vl':
        idx = [j for j, q in enumerate(cs['phase']) if q == ph]
        Pp = [cs['P'][j] for j in idx]; err = [100 * (zm(m, f, 280, cs['P'][j], ph) - cs['Z'][j]) / cs['Z'][j] for j in idx]
        ax.plot(Pp, err, color=COL[m], lw=2.4, label=NAME[m] if ph == 'v' else None)
idx = [j for j, q in enumerate(cs['phase']) if q == 'v']
ax.plot([cs['P'][j] for j in idx], [100 * (1 + bpit(f, 280) * 1e-6 * cs['P'][j] * 1e5 / (R * 280) - cs['Z'][j]) / cs['Z'][j] for j in idx], color=PLUM, lw=2.4, label='Virial, Pitzer B')
ax.axhline(0, color=GRAPHITE, lw=1); ax.axvline(sat['P'], color=MIST, lw=1.2, ls=(0, (4, 3)))
ax.text(sat['P'] - 3, -14, 'vapor', ha='right', fontsize=13, color=SLATE); ax.text(sat['P'] + 3, -14, 'liquid', fontsize=13, color=SLATE)
ax.set_ylim(-20, 70); ax.set_xlim(0, 200)
ax.set_xlabel(r'Pressure $P$ / bar'); ax.set_ylabel(r'Error in $Z$ / %'); ax.text(195, -17, 'CO$_2$, 280 K', ha='right', fontsize=14, color=SLATE)
ax.legend(frameon=False, fontsize=13, loc='center right', bbox_to_anchor=(1, 0.5))
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p02-errors.svg', transparent=True); plt.close(fig)

# 5 · B from the data: (Z − 1)/rho against rho for methane at 300 K
c, fm = d['cases']['ch4_300'], d['fluids']['methane']
rho = np.array([p * 1e5 / (z * R * 300) * 1e-6 for p, z in zip(c['P'], c['Z'])]); y = (np.array(c['Z']) - 1) / rho
mk = rho * 1000 <= 1; C1, B1 = np.polyfit(rho[mk], y[mk], 1)
sel = rho * 1000 <= 4
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(rho[sel] * 1000, y[sel], 'o', color=TEAL, ms=4, label='NIST reference, methane 300 K')
xx = np.linspace(0, 4, 50); ax.plot(xx, B1 + C1 * xx / 1000, color=INK, lw=1.6, label=(f'Fit up to 1 mol/L: B = {B1:.1f}, C = {C1:.0f}').replace('-', '−'))
ax.axhline(bpit(fm, 300), color=PLUM, lw=2, ls=(0, (5, 3)), label=(f'Pitzer B = {bpit(fm, 300):.1f}').replace('-', '−'))
a, b = ab('pr', fm, 300); bp = (b - a / (R * 300)) * 1e6
ax.axhline(bp, color=AMBER, lw=2, ls=(0, (5, 3)), label='Peng–Robinson b − a/RT = ' + f'{bp:.1f}'.replace('-', '−'))
ax.set_xlim(0, 4); ax.set_ylim(-58, -16)
ax.set_xlabel(r'Molar density $\rho$ / (mol/L)'); ax.set_ylabel(r'$(Z-1)/\rho$ / (cm$^3$/mol)')
ax.legend(frameon=False, fontsize=12, loc='upper left')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p02-bfit.svg', transparent=True); plt.close(fig)
print('B fit', round(B1, 2), round(C1), 'pitzer', round(bpit(fm, 300), 2), 'pr', round(bp, 2))
