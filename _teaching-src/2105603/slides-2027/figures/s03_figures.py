"""Session 3 figures: Margules A = 3 (Lab 04) and cyclohexane + methanol LLE (Lab 05 data, Atik and Kerboub 2008)."""
import json
import numpy as np
from scipy.optimize import fsolve
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SAND, INK, GRAPHITE, SLATE

setup()
A = 3.0
xs = np.linspace(1e-4, 1 - 1e-4, 2000)
g = lambda x: x * np.log(x) + (1 - x) * np.log(1 - x) + A * x * (1 - x)
xa, xb = 0.0707202, 0.9292798
sa, sb = (1 - np.sqrt(1 - 2 / A)) / 2, (1 + np.sqrt(1 - 2 / A)) / 2

# 1. Delta g_mix with the common tangent, binodal and spinodal
fig, ax = plt.subplots(figsize=(7.4, 5.2))
ax.axvspan(xa, sa, color=SAND, alpha=.45, lw=0); ax.axvspan(sb, xb, color=SAND, alpha=.45, lw=0)
ax.axvspan(sa, sb, color=RUST, alpha=.10, lw=0)
ax.plot(xs, g(xs), color=TEAL, lw=2.4)
ax.plot([0, 1], [g(xa)] * 2, color=AMBER, lw=2, ls=(0, (6, 3)))
ax.plot([xa, xb], [g(xa)] * 2, 'o', color=AMBER, ms=9, mec='white', mew=1.2)
ax.plot([sa, sb], [g(sa), g(sb)], 's', color=RUST, ms=8, mec='white', mew=1.2)
ax.plot([0.12], [g(0.12)], 'o', color='white', ms=9, mec=INK, mew=2)
ax.annotate('feed $z_1$ = 0.12\ncurvature > 0', (0.12, g(0.12)), xytext=(0.17, 0.07), fontsize=14, color=INK,
            arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.text(0.5, -0.045, 'common tangent', ha='center', color='#9a5f10', fontsize=15, fontweight=600)
ax.text(0.5, 0.12, 'unstable', ha='center', color=RUST, fontsize=15, fontweight=600)
ax.text(0.5, 0.098, 'curvature < 0', ha='center', color=SLATE, fontsize=13)
ax.text(0.14, -0.12, 'metastable', ha='center', color=SLATE, fontsize=13)
ax.text(0.86, -0.12, 'metastable', ha='center', color=SLATE, fontsize=13)
ax.text(0.02, -0.215, f'binodal (circles) {xa:.4f}, {xb:.4f}   spinodal (squares) {sa:.3f}, {sb:.3f}', color=SLATE, fontsize=12.5)
ax.set_xlim(0, 1); ax.set_ylim(-0.23, 0.17)
ax.set_xlabel(r'$x_1$'); ax.set_ylabel(r'$\Delta g_{\mathrm{mix}}/RT$')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's03-gmix.svg', transparent=True); plt.close(fig)

# 2. Tangent-plane distance for two feeds
def tpd(w, z):
    m = np.log(z / (1 - z)) + A * (1 - 2 * z)
    return g(w) - g(z) - m * (w - z)
fig, ax = plt.subplots(figsize=(7.4, 4.9))
ax.axhline(0, color=GRAPHITE, lw=1)
for z, c, lab in ((0.05, TEAL, r'$z_1$ = 0.05: TPD $\geq$ 0, stable'), (0.12, AMBER, '$z_1$ = 0.12: TPD < 0, splits')):
    ax.plot(xs, tpd(xs, z), color=c, lw=2.3, label=lab)
w0 = xs[np.argmin(tpd(xs, 0.12))]
ax.plot([w0], [tpd(w0, 0.12)], 'o', color=AMBER, ms=9, mec='white', mew=1.2)
ax.annotate(f'minimum {tpd(w0, 0.12):.3f}\nat $w_1$ = {w0:.3f}', (w0, tpd(w0, 0.12)), xytext=(0.55, -0.2), fontsize=14, color=INK,
            arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.plot([0.12], [0], 'o', color='white', ms=8, mec=INK, mew=2)
ax.annotate('trivial point $w = z$\n(TPD = 0, always)', (0.12, 0), xytext=(0.18, 0.2), fontsize=13, color=SLATE,
            arrowprops=dict(arrowstyle='-', color=GRAPHITE, lw=1))
ax.set_xlim(0, 1); ax.set_ylim(-0.3, 0.42)
ax.set_xlabel(r'trial composition  $w_1$'); ax.set_ylabel(r'TPD / $RT$')
ax.legend(frameon=False, loc='upper right', fontsize=13.5)
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's03-tpd.svg', transparent=True); plt.close(fig)
print('tpd min', round(tpd(w0, 0.12), 4), round(w0, 4))

# 3. Cyclohexane + methanol: measured tie lines, constant tau and tau = a + b/T
data = json.loads((HERE.parents[3] / 'teaching/2105603/labs/assets/cyclohexane-methanol-lle.json').read_text())
al = 0.3
def lng(x, t12, t21):
    G12, G21 = np.exp(-al * t12), np.exp(-al * t21); z = 1 - x
    return np.array([z * z * (t21 * (G21 / (x + z * G21)) ** 2 + t12 * G12 / (z + x * G12) ** 2),
                     x * x * (t12 * (G12 / (z + x * G12)) ** 2 + t21 * G21 / (x + z * G21) ** 2)])
def iso(v, t):
    a, b = v; la, lb = lng(a, *t), lng(b, *t)
    return [np.log(a) + la[0] - np.log(b) - lb[0], np.log(1 - a) + la[1] - np.log(1 - b) - lb[1]]
def fit_tau(xa_, xb_):
    return fsolve(lambda t: iso([xa_, xb_], t), [1, 1], xtol=1e-13)
rows = data['rows']
t298 = fit_tau(0.177, 0.876); t313 = fit_tau(0.261, 0.758)
b = (t298 - t313) / (1 / 298.15 - 1 / 313.15); a = t298 - b / 298.15
Ts, gap = np.arange(270, 330, 0.25), []
v = np.array([0.08, 0.96])
ucst = None
for T in Ts:
    t = a + b / T
    s = fsolve(iso, v, args=(t,), xtol=1e-12, full_output=True)
    if s[2] != 1 or abs(s[0][1] - s[0][0]) < 2e-3 or not (0 < s[0][0] < s[0][1] < 1):
        ucst = T; break
    v = s[0]; gap.append((T, *v))
gap = np.array(gap)
print('tau298', t298.round(4), 'tau313', t313.round(4), 'a', a.round(4), 'b', b.round(1), 'gap closes near', ucst, 'last', gap[-1].round(3))
fig, ax = plt.subplots(figsize=(7.4, 5.2))
ax.plot(gap[:, 1], gap[:, 0], color=TEAL, lw=2.2); ax.plot(gap[:, 2], gap[:, 0], color=TEAL, lw=2.2)
ax.plot([0.177, 0.177], [270, 330], color=SLATE, lw=1.6, ls=(0, (5, 3))); ax.plot([0.876, 0.876], [270, 330], color=SLATE, lw=1.6, ls=(0, (5, 3)))
for r in rows:
    cal = r['T'] in (298.15, 313.15)
    for x in (r['xAlpha'], r['xBeta']):
        ax.plot(x, r['T'], 'o' if not cal else 'D', color=AMBER, ms=8 if not cal else 9, mec='white' if not cal else INK, mew=1.2)
ax.text(0.5, 281, 'two liquids', ha='center', color=INK, fontsize=16)
ax.text(0.7, 326.5, 'one liquid', ha='center', color=INK, fontsize=16)
ax.text(0.2, 272.5, r'constant $\tau$ from 298.15 K', color=SLATE, fontsize=13)
ax.text(0.31, 309, r'$\tau = a + b/T$' + '\n(298.15 and 313.15 K)', color=TEAL, fontsize=14, fontweight=600)
ax.text(0.01, 327.5, 'points: measured; diamonds: used to fit', color='#9a5f10', fontsize=13)
ax.set_xlim(0, 1); ax.set_ylim(270, 330)
ax.set_xlabel(r'cyclohexane mole fraction  $x_1$'); ax.set_ylabel(r'$T$ / K')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 's03-lle.svg', transparent=True); plt.close(fig)
