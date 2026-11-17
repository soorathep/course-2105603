"""Session 5 figures: steam methane reforming from NIST-JANAF Shomate data (Lab 12 E)."""
import json, math
import numpy as np
from scipy.optimize import brentq
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE

setup()
R = 8.314462618
d = json.loads((HERE.parents[3] / 'teaching/2105603/labs/assets/smr-nist.json').read_text())
def HS(sp, T):
    s = d['species'][sp]; r = [x for x in s['shomate'] if x[0] <= T <= x[1]][0]
    _, _, A, B, C, D, E, F, G, H = r; t = T / 1000
    return s['dfH298'] + A*t + B*t*t/2 + C*t**3/3 + D*t**4/4 - E/t + F - H, A*math.log(t) + B*t + C*t*t/2 + D*t**3/3 - E/(2*t*t) + G
def lnK(rx, T):
    return -sum(v * (HS(k, T)[0]*1000 - T*HS(k, T)[1]) for k, v in d['reactions'][rx]['nu'].items()) / (R*T)
def lnKvh(rx, T):
    nu = d['reactions'][rx]['nu']
    dH = sum(v*d['species'][k]['dfH298'] for k, v in nu.items())*1000; dS = sum(v*d['species'][k]['S298'] for k, v in nu.items())
    return -(dH - 298.15*dS)/(R*298.15) - dH/R*(1/T - 1/298.15)
def eq(T, P, SC):
    k1, k2, p = lnK('R1', T), lnK('R2', T), P/100
    def r1(e1, e2):
        n = [1-e1, SC-e1-e2, e1-e2, e2, 3*e1+e2]; N = 1+SC+2*e1
        return math.log(n[2]) + 3*math.log(n[4]) - math.log(n[0]) - math.log(n[1]) + 2*math.log(p/N) - k1
    def r2(e1, e2):
        n = [1-e1, SC-e1-e2, e1-e2, e2, 3*e1+e2]
        return math.log(n[3]) + math.log(n[4]) - math.log(n[2]) - math.log(n[1]) - k2
    e1of = lambda e2: brentq(lambda e1: r1(e1, e2), e2+1e-12, min(1, SC-e2)-1e-12, xtol=1e-14)
    e2 = brentq(lambda x: r2(e1of(x), x), 1e-12, 0.95*min(1, SC/2), xtol=1e-14)
    return e1of(e2)

T = np.linspace(600, 1200, 121)
fig, ax = plt.subplots(figsize=(7.4, 5.1))
ax.axhline(0, color=GRAPHITE, lw=1)
ax.plot(T, [lnK('R1', t) for t in T], color=TEAL, lw=2.4, label=r'R1 CH$_4$ + H$_2$O, H(T) and S(T)')
ax.plot(T, [lnKvh('R1', t) for t in T], color=TEAL, lw=1.8, ls=(0, (5, 3)), label=r'R1, $\Delta_rH^\circ$ fixed at 298 K')
ax.plot(T, [lnK('R2', t) for t in T], color=AMBER, lw=2.4, label='R2 water-gas shift, H(T) and S(T)')
ax.plot(T, [lnKvh('R2', t) for t in T], color=AMBER, lw=1.8, ls=(0, (5, 3)), label=r'R2, $\Delta_rH^\circ$ fixed at 298 K')
ax.annotate(f'1100 K: 5.74 vs {lnKvh("R1",1100):.2f}', (1100, lnK('R1', 1100)), xytext=(760, 6.2), fontsize=13.5, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xlim(600, 1200); ax.set_ylim(-14, 10)
ax.set_xlabel(r'$T$ / K'); ax.set_ylabel(r'ln $K$  (standard state 1 bar)')
ax.legend(frameon=False, fontsize=12.5, loc='lower right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's05-lnk.svg', transparent=True); plt.close(fig)

T2 = np.linspace(800, 1200, 81)
fig, ax = plt.subplots(figsize=(7.4, 5.1))
for P, SC, c, ls, lab in ((101.325, 3, TEAL, '-', '1 atm, S/C = 3'), (2000, 3, AMBER, '-', '2000 kPa, S/C = 3'), (2000, 2, AMBER, (0, (5, 3)), '2000 kPa, S/C = 2'), (2000, 4, RUST, (0, (2, 2)), '2000 kPa, S/C = 4')):
    ax.plot(T2, [eq(t, P, SC) for t in T2], color=c, lw=2.3, ls=ls, label=lab)
ax.plot([1100], [eq(1100, 2000, 3)], 'o', color=INK, ms=8, mec='white', mew=1.2)
ax.annotate('1100 K, 2000 kPa, S/C = 3:\nconversion 0.795', (1100, eq(1100, 2000, 3)), xytext=(960, 0.08), fontsize=13.5, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xlim(800, 1200); ax.set_ylim(0, 1.02)
ax.set_xlabel(r'$T$ / K'); ax.set_ylabel(r'CH$_4$ conversion at equilibrium')
ax.legend(frameon=False, fontsize=13, loc='lower right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's05-conv.svg', transparent=True); plt.close(fig)
print(round(eq(1100, 2000, 3), 4), round(lnKvh('R1', 1100), 3))
