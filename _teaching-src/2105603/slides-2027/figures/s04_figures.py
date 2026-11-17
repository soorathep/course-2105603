"""Session 4 figures: naphthalene solubility (Xu et al. 2019, via NIST ThermoML; Lab 10 E data) and the Lab 11 vessel."""
import json, math
import numpy as np
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE

setup()
R = 8.314462618
d = json.loads((HERE.parents[3] / 'teaching/2105603/labs/assets/naphthalene-sle.json').read_text())
F = d['fusion']

# 1. Measured solubility against two ideal-solubility lines
fig, ax = plt.subplots(figsize=(7.4, 5.3))
T = np.linspace(278, 335, 200)
for key, ls, lab in (('nist', '-', 'ideal · NIST fusion data'), ('paper', (0, (5, 3)), 'ideal · article DSC')):
    ax.plot(T, np.exp(-F[key]['dH'] * 1000 / R * (1 / T - 1 / F[key]['Tm'])), color=GRAPHITE, lw=1.8, ls=ls, label=lab)
show = (('trichloromethane', SKY, 's', 'chloroform'), ('benzene', TEAL, 'o', 'benzene'), ('octane', AMBER, 'D', 'octane'), ('octan-1-ol', RUST, '^', 'octan-1-ol'))
for k, c, mk, lab in show:
    s = d['solvents'][k]; M = s['molarMass']
    xs = [r['molality'] / (r['molality'] + 1000 / M) for r in s['rows']]
    ax.plot([r['T'] for r in s['rows']], xs, mk, color=c, ms=7.5, mec='white', mew=1, label=lab)
ax.set_xlim(278, 333); ax.set_ylim(0, 0.65)
ax.set_xlabel(r'saturation temperature  $T$ / K'); ax.set_ylabel(r'naphthalene mole fraction  $x_1$')
ax.legend(frameon=False, fontsize=13, loc='upper left', ncol=1)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's04-solubility.svg', transparent=True); plt.close(fig)

# 2. Closed vessel: isotherm and material balance (Lab 11 starting case)
V, m, n, Tk, qs, b, K = 1e-3, 0.020, 0.03, 300.0, 2.0, 0.1, 0.2
P = np.linspace(0, 40, 400)
bal = (n - P * 1000 * V / (R * Tk)) / m
lang = qs * b * P / (1 + b * P); hen = K * P
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(P, lang, color=TEAL, lw=2.4, label='Langmuir isotherm')
ax.plot(P, hen, color=TEAL, lw=1.8, ls=(0, (5, 3)), label='Henry, $K_H = q_sK_L$')
ax.plot(P, bal, color=AMBER, lw=2.4, label='vessel balance')
for Pp, qq, t in ((14.987, 1.1996, 'P = 15.0 kPa\nq = 1.20 mol/kg'), (6.817, 1.3634, 'P = 6.8 kPa')):
    ax.plot([Pp], [qq], 'o', color=INK, ms=8, mec='white', mew=1.2)
ax.annotate('P = 15.0 kPa, q = 1.20 mol/kg', (14.987, 1.1996), xytext=(18, 0.62), fontsize=14, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.annotate('Henry: P = 6.8 kPa', (6.817, 1.3634), xytext=(12, 1.78), fontsize=14, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.text(39.5, 0.08, 'no adsorbent: P = 74.8 kPa', ha='right', color=SLATE, fontsize=13)
ax.set_xlim(0, 40); ax.set_ylim(0, 2.2)
ax.set_xlabel(r'$P$ / kPa'); ax.set_ylabel(r'$q$ / (mol kg$^{-1}$)')
ax.legend(frameon=False, fontsize=13, loc='lower right', bbox_to_anchor=(1, 0.08))
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's04-vessel.svg', transparent=True); plt.close(fig)
print('ok')
