"""Session P6 figures: activity coefficients of 2-propanol + water and the effect of the fitting objective (Lab P6)."""
import json, subprocess
import numpy as np
import matplotlib.pyplot as plt
from style import setup, tidy, HERE, TEAL, AMBER, RUST, SKY, SAND, INK, GRAPHITE, SLATE, MIST
setup(); ROOT = str(HERE.parents[3])
js = """
import * as a from '%s/teaching/2105603/preview-2027/assets/activity.js';
import fs from 'fs';
const d=JSON.parse(fs.readFileSync('%s/teaching/2105603/labs/assets/ipa-water.json')); const E=a.experimental(d.datasets[0],d.properties);
const xs=Array.from({length:399},(_,k)=>(k+1)/400), o={pts:E.map(q=>({x:q.x,g1:q.g1,g2:q.g2,gE:q.gE})),xs};
for (const ob of ['lng','gE']) { const f=a.fit('nrtl',E,0.3,ob); o[ob]={p:f.p,l1:xs.map(x=>a.lnGamma('nrtl',f.p,x)[0]),l2:xs.map(x=>a.lnGamma('nrtl',f.p,x)[1]),dg:xs.map(x=>x*Math.log(x)+(1-x)*Math.log(1-x)+a.gE('nrtl',f.p,x)),c:a.minCurvature('nrtl',f.p)}; }
console.log(JSON.stringify(o));
""" % (ROOT, ROOT)
open('/tmp/p6fig.mjs', 'w').write(js)
D = json.loads(subprocess.run(['node', '/tmp/p6fig.mjs'], capture_output=True, text=True).stdout)
xs = np.array(D['xs']); P = D['pts']
fig, ax = plt.subplots(figsize=(7.4, 5.0))
ax.plot([q['x'] for q in P], [np.log(q['g1']) for q in P], 'o', color=AMBER, ms=7, mec='white', label=r'ln $\gamma_1$ data (2-propanol)')
ax.plot([q['x'] for q in P], [np.log(q['g2']) for q in P], 's', color=TEAL, ms=7, mec='white', label=r'ln $\gamma_2$ data (water)')
ax.plot(xs, D['lng']['l1'], color=AMBER, lw=2.4, label=r'NRTL fitted to ln $\gamma$')
ax.plot(xs, D['lng']['l2'], color=TEAL, lw=2.4)
ax.plot(xs, D['gE']['l1'], color=AMBER, lw=1.6, ls=(0, (5, 3)), label=r'NRTL fitted to $G^E/RT$')
ax.plot(xs, D['gE']['l2'], color=TEAL, lw=1.6, ls=(0, (5, 3)))
ax.set_xlim(0, 1); ax.set_ylim(-0.3, 3.3); ax.set_xlabel('Mole fraction of 2-propanol $x_1$'); ax.set_ylabel(r'ln $\gamma_i$')
ax.text(0.98, 3.1, '60 kPa, Barbieri et al. (2024)', ha='right', fontsize=13, color=SLATE); ax.legend(frameon=False, fontsize=12, loc='upper right', bbox_to_anchor=(1, 0.92))
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p06-lng.svg', transparent=True); plt.close(fig)
fig, ax = plt.subplots(figsize=(7.4, 5.0))
for ob, col, ls, lab in [('lng', TEAL, '-', r'NRTL fitted to ln $\gamma$'), ('gE', AMBER, (0, (5, 3)), r'NRTL fitted to $G^E/RT$')]:
    ax.plot(xs, D[ob]['dg'], color=col, lw=2.4, ls=ls, label=lab + f" (min curvature {D[ob]['c']['c']:+.2f})".replace('-', '−'))
ax.plot(xs, xs * np.log(xs) + (1 - xs) * np.log(1 - xs), color=GRAPHITE, lw=1.4, ls=(0, (2, 2)), label='ideal solution')
ax.set_xlim(0, 1); ax.set_ylim(-0.97, 0.03); ax.set_xlabel('Mole fraction of 2-propanol $x_1$'); ax.set_ylabel(r'$\Delta g_{mix}/RT$')
ax.legend(frameon=False, fontsize=12, loc='lower center')
tidy(ax); fig.tight_layout(); fig.savefig(HERE / 'p06-dgmix.svg', transparent=True); plt.close(fig)
print(D['lng']['p'], D['gE']['p'], D['lng']['c'], D['gE']['c'])
