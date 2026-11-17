# Session 7 audit exercise (2105603, 2027). This script runs without errors.
# Use Lab 05 step E to find what is wrong with its outputs, then fix it.
# No data file is needed.
# First-draft style: fsolve for tau from the tie line, fsolve for binodal from a symmetric guess,
# local minimize of TPD from the feed.
import numpy as np
from scipy.optimize import fsolve, minimize, brentq
alpha, T = 0.3, 298.15
xa, xb = 0.177, 0.876
def lng(x,t12,t21):
    G12,G21=np.exp(-alpha*t12),np.exp(-alpha*t21); z=1-x
    return np.array([z*z*(t21*(G21/(x+z*G21))**2+t12*G12/(z+x*G12)**2), x*x*(t12*(G12/(z+x*G12))**2+t21*G21/(x+z*G21)**2)])
def iso(t, a, b):
    la, lb = lng(a,*t), lng(b,*t)
    return [np.log(a)+la[0]-np.log(b)-lb[0], np.log(1-a)+la[1]-np.log(1-b)-lb[1]]
tau = fsolve(iso,[1,1],args=(xa,xb))
res = max(abs(np.array(iso(tau,xa,xb))))
def bin_eq(v): return iso(tau,v[0],v[1])
binod = fsolve(bin_eq,[0.4,0.6])
def g(x): l=lng(x,*tau); return x*np.log(x)+(1-x)*np.log(1-x)+x*l[0]+(1-x)*l[1]
def curv(x,h=1e-5): return x*(1-x)*(g(x+h)-2*g(x)+g(x-h))/h**2
xs=np.linspace(0.01,0.99,981); c=np.array([curv(x) for x in xs]); sp=[brentq(curv,xs[i],xs[i+1]) for i in range(len(xs)-1) if c[i]*c[i+1]<0]
z=0.25
def tpd(w): w=float(np.clip(w,1e-9,1-1e-9)); lw,lz=lng(w,*tau),lng(z,*tau); return w*(np.log(w)+lw[0]-np.log(z)-lz[0])+(1-w)*(np.log(1-w)+lw[1]-np.log(1-z)-lz[1])
m=minimize(lambda v: tpd(v[0]),[z],bounds=[(1e-6,1-1e-6)])
print(f"tau {tau[0]:.4f} {tau[1]:.4f} isores {res:.2e} binodal {binod[0]:.4f} {binod[1]:.4f} spinodal {sp[0]:.4f} {sp[1]:.4f} tpdmin {m.fun:.5f} w {m.x[0]:.4f}")
