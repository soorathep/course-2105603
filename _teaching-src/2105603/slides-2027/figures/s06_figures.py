"""Session 6 figures: KCl mean ionic activity coefficients (Nasiri-Lohehsara and Ghalami-Choobar 2018, via
NIST ThermoML; Lab 13 E data), Debye-Hueckel forms, and the KCl concentration-cell EMF."""
import json, math
import numpy as np
from scipy.optimize import least_squares
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SAND, INK, GRAPHITE, SLATE

setup()
d = json.loads((HERE.parents[3] / 'teaching/2105603/labs/assets/kcl-activity.json').read_text())
A = d['debyeHuckel']['A10'] * math.log(10)
r = d['rows']; r298 = [x for x in r if x['T'] == 298.2]; r308 = [x for x in r if x['T'] == 308.2]
m = np.array([x['m'] for x in r298]); g = np.array([x['g'] for x in r298])
model = lambda p, m: -A * np.sqrt(m) / (1 + p[0] * np.sqrt(m)) + p[1] * m
p = least_squares(lambda p: model(p, m) - np.log(g), [1, 0]).x
s = np.linspace(0.001, 1.6, 300)
fig, ax = plt.subplots(figsize=(7.4, 5.1))
ax.errorbar([math.sqrt(x['m']) for x in r298], [x['g'] for x in r298], yerr=[x['U'] for x in r298], fmt='o', color=AMBER, ms=7, mec='white', mew=1, ecolor=SAND, elinewidth=2, capsize=0, label='measured, 298.2 K (± U)')
ax.plot([math.sqrt(x['m']) for x in r308], [x['g'] for x in r308], 'o', color='white', ms=7, mec=AMBER, mew=1.6, label='measured, 308.2 K')
ax.plot(s, np.exp(model(p, s**2)), color=TEAL, lw=2.4, label=f'extended, b = {p[0]:.3f}, c = {p[1]:.3f}')
ax.plot(s[s < 0.75], np.exp(-A * s[s < 0.75]), color=GRAPHITE, lw=1.8, ls=(0, (5, 3)), label='Debye–Hückel limiting law')
ax.set_xlim(0, 1.6); ax.set_ylim(0.3, 1.02)
ax.set_xlabel(r'$\sqrt{m}$ / (mol kg$^{-1}$)$^{1/2}$'); ax.set_ylabel(r'$\gamma_\pm$ of KCl')
ax.legend(frameon=False, fontsize=12.5, loc='upper right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's06-gamma.svg', transparent=True); plt.close(fig)

R, F, T = 8.314462618, 96485.33212, 298.15
m2 = np.logspace(-1.7, math.log10(2.25), 200); m1 = 0.01
g1 = math.exp(model(p, m1))
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(m2, 1000 * 2 * R * T / F * np.log(m2 / m1), color=GRAPHITE, lw=1.8, ls=(0, (5, 3)), label=r'ideal, $\gamma_\pm = 1$')
ax.plot(m2, 1000 * 2 * R * T / F * np.log(m2 * np.exp(model(p, m2)) / (m1 * g1)), color=TEAL, lw=2.4, label=r'fitted $\gamma_\pm$')
ax.plot(m2, 1000 * R * T / F * np.log(m2 * np.exp(model(p, m2)) / (m1 * g1)), color=RUST, lw=1.8, ls=(0, (2, 2)), label='RT/F in place of 2RT/F')
E1 = 1000 * 2 * R * T / F * math.log(1.0 * math.exp(model(p, 1.0)) / (m1 * g1))
ax.plot([1.0], [E1], 'o', color=INK, ms=8, mec='white', mew=1.2)
ax.annotate(f'1.0 mol/kg: {E1:.1f} mV\n(ideal 236.6 mV)', (1.0, E1), xytext=(0.07, 215), fontsize=13.5, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xscale('log'); ax.set_xlim(0.02, 2.25); ax.set_ylim(0, 280)
ax.set_xlabel(r'$m_2$ / (mol kg$^{-1}$),  $m_1$ = 0.01 mol kg$^{-1}$'); ax.set_ylabel(r'$E$ / mV')
ax.legend(frameon=False, fontsize=13, loc='lower right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's06-cell.svg', transparent=True); plt.close(fig)
print(p, E1)
