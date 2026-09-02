#!/usr/bin/env python3
"""Numerical diagnostic for the exact cap crossing remainder/quotient signs."""

from __future__ import annotations

import math
import numpy as np
import sympy as sy

from derive_terminal_q3_m1_forest_j3_exact_u1_root import build as build_c
from derive_terminal_q3_m1_forest_j3_simple_f4_root import build as build_t


def C(n, k):
    return math.comb(n, k) if 0 <= k <= n else 0


def ev(c, x):
    ans = 0.0
    for a in c:
        ans = ans*x+a
    return ans


def extrema_quadratic(c, lo, hi):
    pts=[lo,hi]
    if abs(c[0])>1e-20:
        x=-c[1]/(2*c[0])
        if lo <= x <= hi: pts.append(x)
    return [(ev(c,x),x) for x in pts]


def cubic_bernstein(c,a,b):
    def deriv(x): return (3*c[0]*x+2*c[1])*x+c[2]
    return (ev(c,a), ev(c,a)+(b-a)*deriv(a)/3,
            ev(c,b)-(b-a)*deriv(b)/3, ev(c,b))


def main(limit=60, force_ratio=False):
    n0,_D0,_mn,_md,vs,_b=build_c()
    n1,_D1,vs1,_b1=build_t()
    assert vs==vs1
    N,h,d,R,W,y=vs
    branches=(sy.Poly(-n0,W),sy.Poly(-(N-3)*n1,W))
    fs=tuple(tuple(sy.lambdify((N,h,d,R,y),p.coeff_monomial(W**q),"math")
                   for q in (3,2,1,0)) for p in branches)
    counts={"cross":0,"left":0,"right":0}
    bad_r=[]; bad_qt=[]; bad_qc=[]
    minima={"r":None,"qt":None,"minus_qc":None}
    bern_bad_c=[]; bern_bad_t=[]; bern_min_c=None; bern_min_t=None
    for Nv in range(31,limit+1):
      for hv in range(1,(Nv-1)//2+1):
       budget=Nv-2*hv
       for dv in range(1,budget+1):
        S=Nv-dv
        if S<2: continue
        for Rv in range(budget-dv+1):
          L=budget-dv-Rv
          eH=Nv-hv-dv-Rv
          U3=C(S,3)-eH*(S-2)+C(eH,2)
          B=(dv*C(S-1,2)-Rv*(S-2)+C(dv,2)*S-(dv-1)*Rv+C(dv,3))
          if force_ratio:
            if U3+B <= 0:
              print("NONPOS_DEN",Nv,hv,dv,Rv,U3,B,flush=True); return
            yv=U3/(U3+B)
          else:
            yv=1.0 if B<=0 else U3/(U3+B)
          lo=C(dv,2)+Rv; hi=lo+C(Rv+1,2)+C(L+1,2)
          cs=tuple(tuple(float(f(Nv,hv,dv,Rv,yv)) for f in row) for row in fs)
          h2=C(S,2)-eH
          f4=(dv*C(S-2,3)-Rv*C(S-3,2)+C(dv,2)*C(S-1,2)
              -(dv-1)*Rv*(S-2)+C(dv,3)*S-C(dv-1,2)*Rv+C(dv,4))
          C0=h2+f4
          T=(Nv-7)/4-yv*(Nv-9)/(2*(Nv-3))
          boff=(C(Nv,3)-(Nv-hv-dv)*(Nv-2)-C(dv,2)-Rv)
          W0=C0/T-boff
          if W0 <= lo:
            bc=cubic_bernstein(cs[0],lo,hi)
            rec=(min(bc),Nv,hv,dv,Rv,W0,yv,bc)
            if bern_min_c is None or rec<bern_min_c: bern_min_c=rec
            if rec[0] < -1e-2 and len(bern_bad_c)<5: bern_bad_c.append(rec)
          elif W0 >= hi:
            bt=cubic_bernstein(cs[1],lo,hi)
            rec=(min(bt),Nv,hv,dv,Rv,W0,yv,bt)
            if bern_min_t is None or rec<bern_min_t: bern_min_t=rec
            if rec[0] < -1e-2 and len(bern_bad_t)<5: bern_bad_t.append(rec)
          else:
            bc=cubic_bernstein(cs[0],W0,hi)
            rec=(min(bc),Nv,hv,dv,Rv,W0,yv,bc)
            if bern_min_c is None or rec<bern_min_c: bern_min_c=rec
            if rec[0] < -1e-2 and len(bern_bad_c)<5: bern_bad_c.append(rec)
            bt=cubic_bernstein(cs[1],lo,W0)
            rec=(min(bt),Nv,hv,dv,Rv,W0,yv,bt)
            if bern_min_t is None or rec<bern_min_t: bern_min_t=rec
            if rec[0] < -1e-2 and len(bern_bad_t)<5: bern_bad_t.append(rec)
          if W0<lo: counts["left"]+=1; continue
          if W0>hi: counts["right"]+=1; continue
          counts["cross"]+=1
          # Synthetic division by J=W0-W.  Divide by W-W0, then negate.
          qs=[]; rem=[]
          for c in cs:
            q_std=np.polydiv(np.asarray(c),np.asarray([1.0,-W0]))
            qs.append(tuple(-x for x in q_std[0]))
            rem.append(float(q_std[1][-1]))
          rv=max(rem)
          rec=(rv,Nv,hv,dv,Rv,W0,yv,tuple(rem))
          if minima["r"] is None or rec<minima["r"]: minima["r"]=rec
          if rv < -1e-2 and len(bad_r)<5: bad_r.append(rec)
          # tangent quotient (index 1) over left, coupled (index0) over right.
          for val,x in extrema_quadratic(qs[1],lo,W0):
            rec=(val,Nv,hv,dv,Rv,x,W0,yv)
            if minima["qt"] is None or rec<minima["qt"]: minima["qt"]=rec
            if val < -1e-2 and len(bad_qt)<5: bad_qt.append(rec)
          for val,x in extrema_quadratic(tuple(-z for z in qs[0]),W0,hi):
            rec=(val,Nv,hv,dv,Rv,x,W0,yv)
            if minima["minus_qc"] is None or rec<minima["minus_qc"]: minima["minus_qc"]=rec
            if val < -1e-2 and len(bad_qc)<5: bad_qc.append(rec)
      print(Nv,counts,minima,"bad",len(bad_r),len(bad_qt),len(bad_qc),
            "bern",len(bern_bad_c),len(bern_bad_t),bern_min_c,bern_min_t,flush=True)
    print("FINAL",counts,minima,bad_r,bad_qt,bad_qc,
          "BERN",bern_bad_c,bern_bad_t,bern_min_c,bern_min_t,flush=True)


if __name__=="__main__": main()
