#!/usr/bin/env python3
"""Probe the anchor/FQ32-eliminated all-forest m1 cone."""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import build, C


def main():
    num,den,mnum,mden,variables=build()
    j,r,h,d,R,W,y=variables
    print("den",den,"mden",mden,"terms",len(sp.Poly(num,*variables).terms()),flush=True)
    wpoly=sp.Poly(num,W)
    print("W degree",wpoly.degree(),"W2",sp.factor(wpoly.coeff_monomial(W**2)),flush=True)
    w2=sp.expand(wpoly.coeff_monomial(W**2))
    linear=sp.expand(num-w2*W**2)
    N=j+r
    rmax=N-2*h-d
    endpoints={}
    for yv in (0,1):
        for wn,wv in (("low",C(d,2)+R),("high",C(N-2*h,2))):
            boundary=sp.expand(linear.subs({y:yv,W:wv}))
            rp=sp.Poly(boundary,R)
            print("boundary",yv,wn,"Rdegree",rp.degree(),
                  "R2",sp.factor(rp.coeff_monomial(R**2)),flush=True)
            for rn,rv in (("zero",0),("max",rmax)):
                endpoints[f"y{yv}_{wn}_{rn}"]=sp.expand(boundary.subs(R,rv))

    tests={"W2":w2,"M0":mnum.subs(y,0),"M1":mnum.subs(y,1),**endpoints}
    funcs={name:sp.lambdify((j,r,h,d),expr,"math") for name,expr in tests.items()}
    minima={name:None for name in tests}; witnesses={name:None for name in tests}
    cells=0
    for N in range(7,61):
        for jv in range(4,N):
            rv=N-jv
            for hv in range(1,(N-1)//2+1):
                for dv in range(1,N-2*hv+1):
                    cells+=1
                    for name,fun in funcs.items():
                        value=fun(jv,rv,hv,dv)
                        if minima[name] is None or value<minima[name]:
                            minima[name]=value;witnesses[name]=(N,jv,rv,hv,dv)
    for name in tests:
        print(name,"min",minima[name],"at",witnesses[name],flush=True)
    print("cells",cells,flush=True)


if __name__=="__main__":
    main()
