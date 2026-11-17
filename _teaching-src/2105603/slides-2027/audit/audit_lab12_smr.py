# Session 7 audit exercise (2105603, 2027). This script runs without errors.
# Use Lab 12 step E (1100 K, 2000 kPa, S/C = 3) to find what is wrong with its outputs, then fix it.
# No data file is needed.
import numpy as np
from scipy.optimize import fsolve
R = 8.314
T, P, SC = 1100.0, 20.0, 3.0      # K, bar, steam/carbon
dHf = {'CH4': -74.87, 'H2O': -241.826, 'CO': -110.53, 'CO2': -393.51, 'H2': 0.0}
S0 = {'CH4': 188.66, 'H2O': 188.835, 'CO': 197.66, 'CO2': 213.785, 'H2': 130.68}
def K(nu):
    dH = sum(v * dHf[k] for k, v in nu.items()) * 1000
    dS = sum(v * S0[k] for k, v in nu.items())
    lnK298 = -(dH - 298.15 * dS) / (R * 298.15)
    return np.exp(lnK298 - dH / R * (1 / T - 1 / 298.15))
K1 = K({'CH4': -1, 'H2O': -1, 'CO': 1, 'H2': 3}); K2 = K({'CO': -1, 'H2O': -1, 'CO2': 1, 'H2': 1})
def f(e):
    e1, e2 = e
    n = np.array([1 - e1, SC - e1 - e2, e1 - e2, e2, 3 * e1 + e2]); y = n / n.sum()
    return [np.log(y[2] * y[4]**3 * P**2 / (y[0] * y[1]) / K1), np.log(y[3] * y[4] / (y[2] * y[1]) / K2)]
sol, info, ier, msg = fsolve(f, [0.3, 0.1], full_output=True); e1, e2 = sol; print("converged", ier == 1)
n = np.array([1 - e1, SC - e1 - e2, e1 - e2, e2, 3 * e1 + e2]); y = n / n.sum()
print(f"lnK1 {np.log(K1):.4f} lnK2 {np.log(K2):.4f} X {e1:.4f} yCH4 {y[0]:.4f} yH2 {y[4]:.4f} yCO {y[2]:.4f} yCO2 {y[3]:.4f}")
