"""Session P1 figures: measurable properties from NIST reference equations of state (Lab P1)."""
import json
import numpy as np
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE

setup()
d = json.loads((HERE.parents[3] / 'teaching/2105603/labs/assets/p1-properties-nist.json').read_text())


def interp(x, xs, ys):
    return float(np.interp(x, xs, ys))


# 1 · the methane valve: outlet temperature along the pressure drop
g = d['throttle']['methane']
Ps = sorted(g['P'], reverse=True)
H1 = interp(300, g['T'], g['H'][g['P'].index(100)])
Tiso = []
for P in Ps:
    H = np.array(g['H'][g['P'].index(P)]); T = np.array(g['T'])
    Tiso.append(float(np.interp(H1, H, T)))
mu1 = interp(300, g['T'], g['JT'][g['P'].index(100)])
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot([100, 20], [300, 300], color=GRAPHITE, lw=1.8, ls=(0, (5, 3)), label='Ideal gas: T does not change')
ax.plot([100, 20], [300, 300 + mu1 * (20 - 100)], color=AMBER, lw=1.8, ls=(0, (2, 2)), label=r'Constant inlet $\mu_{JT}$ = %.3f K/bar' % mu1)
ax.plot(Ps, Tiso, color=TEAL, lw=2.6, label='Enthalpy balance, NIST tables')
ax.plot([20], [Tiso[-1]], 'o', color=INK, ms=8, mec='white', mew=1.2)
ax.annotate(f'{Tiso[-1]:.1f} K at 20 bar', (20, Tiso[-1]), xytext=(42, 262), fontsize=14, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.annotate(f'{300 + mu1 * (20 - 100):.1f} K', (20, 300 + mu1 * (20 - 100)), xytext=(30, 281), fontsize=14, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xlim(102, 18); ax.set_ylim(258, 305)
ax.set_xlabel(r'Pressure $P$ / bar  (the gas flows from left to right)'); ax.set_ylabel(r'Temperature $T$ / K')
ax.legend(frameon=False, fontsize=13, loc='lower left')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p01-throttle.svg', transparent=True); plt.close(fig)
print('methane outlet', round(Tiso[-1], 2), 'constant', round(300 + mu1 * (20 - 100), 2))

# 2 · nitrogen inversion curve against van der Waals
Tc, Pc = d['fluids']['n2']['Tc'], d['fluids']['n2']['Pc']
pts = []
for b in d['inversion']['isobars']:
    T, J = np.array(b['T']), np.array(b['JT'])
    for k in np.where(np.diff(np.sign(J)))[0]:
        pts.append((T[k] - J[k] * (T[k + 1] - T[k]) / (J[k + 1] - J[k]), b['P']))
Tr = np.linspace(0.75, 6.75, 400)
Pr = 24 * np.sqrt(3 * Tr) - 12 * Tr - 27
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot(Tr * Tc, Pr * Pc, color=GRAPHITE, lw=1.8, ls=(0, (5, 3)), label='van der Waals, from $T_c$ and $P_c$')
up = sorted([p for p in pts if p[0] > 300]); lo = sorted([p for p in pts if p[0] < 300])
dome = sorted(lo, key=lambda p: p[1]) + sorted(up, key=lambda p: -p[1])
ax.plot([p[0] for p in dome], [p[1] for p in dome], 'o-', color=TEAL, lw=2.4, ms=7, label=r'NIST: $\mu_{JT}$ = 0')
ax.text(330, 120, r'$\mu_{JT}$ > 0' + '\nthrottling cools', fontsize=14, color=INK, ha='center')
ax.text(800, 235, r'$\mu_{JT}$ < 0' + '\nthrottling warms', fontsize=14, color=INK, ha='center')
ax.annotate('607 K at 1 bar', (607, 1), xytext=(640, 70), fontsize=13.5, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.annotate('852 K = 6.75 $T_c$', (6.75 * Tc, 0), xytext=(690, 120), fontsize=13.5, color=INK, arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xlim(80, 900); ax.set_ylim(0, 420)
ax.set_xlabel(r'Temperature $T$ / K'); ax.set_ylabel(r'Pressure $P$ / bar')
ax.legend(frameon=False, fontsize=13, loc='upper right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p01-inversion.svg', transparent=True); plt.close(fig)
print('inversion points', [(round(a, 1), b) for a, b in pts])

# 3 · finite-difference error against step size
def mu_fd(key, dT, scheme):
    s = d['states'][key]; ib = s['isobar']; T = np.array(ib['T']); V = np.array(ib['V'])
    i = int(np.argmin(abs(T - s['T']))); k = int(round(dT / (T[1] - T[0])))
    dv = (V[i + k] - V[i - k]) / (T[i + k] - T[i - k]) if scheme == 'c' else (V[i + k] - V[i]) / (T[i + k] - T[i])
    return (s['T'] * dv - V[i]) * 100 / ib['Cp'][i], ib['JT'][i]
steps = [0.2, 0.4, 1, 2, 4, 10, 20]
fig, ax = plt.subplots(figsize=(7.4, 5.0))
for key, col, name in (('ch4_300_100', TEAL, 'methane, 300 K, 100 bar'), ('co2_310_80', AMBER, r'CO$_2$, 310 K, 80 bar')):
    for sch, ls, mk in (('c', '-', 'o'), ('f', (0, (4, 2)), 's')):
        e = [abs(mu_fd(key, h, sch)[0] / mu_fd(key, h, sch)[1] - 1) * 100 for h in steps]
        ax.plot(steps, e, ls=ls, marker=mk, color=col, lw=2.2, ms=6, label=f'{name}, {"central" if sch == "c" else "forward"}')
ax.axhline(1, color=GRAPHITE, lw=1, ls=':')
ax.text(0.21, 1.25, '1%', fontsize=13, color=GRAPHITE)
ax.set_xscale('log'); ax.set_yscale('log'); ax.set_ylim(1e-4, 200)
from matplotlib.ticker import FixedLocator, FixedFormatter
ax.xaxis.set_major_locator(FixedLocator(steps)); ax.xaxis.set_major_formatter(FixedFormatter([str(s) for s in steps])); ax.xaxis.set_minor_locator(FixedLocator([]))
ax.yaxis.set_major_locator(FixedLocator([1e-4, 1e-3, 1e-2, 0.1, 1, 10, 100])); ax.yaxis.set_major_formatter(FixedFormatter(['0.0001', '0.001', '0.01', '0.1', '1', '10', '100']))
ax.set_xlabel(r'Temperature step $\delta T$ / K'); ax.set_ylabel(r'|error in $\mu_{JT}$| / %')
ax.legend(frameon=False, fontsize=12, loc='lower right')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p01-step.svg', transparent=True); plt.close(fig)
