# Session 7 audit exercise (2105603, 2027). This script runs without errors.
# Use Lab 10 step E (octane, NIST fusion data, row at 296.6 K) to find what is wrong with its outputs, then fix it.
# Data: press 'Download the measured solubility (CSV)' in Lab 10 step E and save the file in the same folder,
# keeping its name: lab10-naphthalene-solubility.csv
# Run: put this file in a folder, then in a terminal in that folder type  python audit_lab10_sle.py
# Needs Python 3.9 or later with numpy, pandas and scipy (install once: pip install numpy pandas scipy).
import numpy as np, pandas as pd
from scipy.optimize import curve_fit
R = 8.314
Tm, dH = 353.39, 19.0          # K, kJ/mol
d = pd.read_csv('lab10-naphthalene-solubility.csv'); d = d[d.solvent == 'octane']
m, M, T = d.molality_naphthalene_mol_per_kg.values, d.M_solvent_g_per_mol.values, d.T_K.values
x = m / (m + 1000 / M)
xid = lambda T: np.exp(-dH * 1000 / R * (1 / T - 1 / Tm))
gam = xid(T) / x
# fit ln gamma1 = w/(R T) * x2^2
f = lambda X, w: w / (R * X[0]) * X[1] ** 2
w, _ = curve_fit(f, (T, 1 - x), np.log(gam), p0=[1000])
w = w[0]
# predict at 298.15 K
xp = xid(298.15) / np.exp(w / (R * 298.15) * (1 - 0) ** 2)
rm = np.sqrt(np.mean((np.log(xid(T) / np.exp(w / (R * T) * (1 - x) ** 2)) - np.log(x)) ** 2))
i = 2
print(f"xid298 {xid(298.15):.4f} row T {T[i]} x {x[i]:.4f} gamma {gam[i]:.3f} w {w:.1f} rmse {rm:.4f} xp298 {xp:.4f}")
