# Session 7 audit exercise (2105603, 2027). This script runs without errors.
# Use Lab 13 step E (298.2 K rows, cells at 0.01 and 1.0 mol/kg) to find what is wrong with its outputs, then fix it.
# Data: press 'Download the measured γ± (CSV)' in Lab 13 step E and save the file in the same folder,
# keeping its name: lab13-kcl-activity.csv
# Run: put this file in a folder, then in a terminal in that folder type  python audit_lab13_kcl.py
# Needs Python 3.9 or later with numpy, pandas and scipy (install once: pip install numpy pandas scipy).
import numpy as np, pandas as pd
from scipy.optimize import curve_fit
d = pd.read_csv('lab13-kcl-activity.csv'); d = d[d.T_K == 298.2]
m, g = d.molality_mol_per_kg.values, d.gamma_pm.values
A = 0.509
lim = 10 ** (-A * np.sqrt(0.0124))
f = lambda m, b, c: -A * np.sqrt(m) / (1 + b * np.sqrt(m)) + c * m      # log10 gamma
(b, c), _ = curve_fit(f, m, np.log10(g), p0=[1, 0])
rmse = np.sqrt(np.mean((f(m, b, c) * np.log(10) - np.log(g)) ** 2))
gam = lambda x: 10 ** f(x, b, c)
R, F, T, n = 8.314, 96485, 298.15, 1
E_id = R * T / (n * F) * np.log(1.0 / 0.01)
E = R * T / (n * F) * np.log(1.0 * gam(1.0) / (0.01 * gam(0.01)))
print(f"lim {lim:.4f} b {b:.4f} c {c:.4f} rmse {rmse:.4f} g1 {gam(1.0):.4f} Eid {E_id:.5f} E {E:.5f}")
