#!/usr/bin/env python3
"""Probe exact large-order cones for the remaining fixed ranks j=4..7."""

from __future__ import annotations

import sympy as sp

from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def main():
    _num,_den,_mnum,_mden,variables,tests,_dens=certificate_expressions()
    j,r,h,d,_R,_W,_y=variables
    S,u,v=sp.symbols("S u v",nonnegative=True)
    for jvalue in range(4,8):
        # The pinned finite census covers N<=12.  Here N=13+S and
        # r=N-j=13-j+S, so r-1=12-j+S.
        substitution={
            j:jvalue,
            r:13-jvalue+S,
            h:1+(10+S)*u/2,
            d:1+(10+S)*(1-u)*v,
        }
        for name,expression in tests.items():
            transformed=sp.expand(expression.subs(substitution,simultaneous=True))
            degrees,coefficients=tensor_bernstein(transformed,(u,v))
            bad=[]
            for index,coefficient in enumerate(coefficients):
                powers=sp.Poly(coefficient,S).all_coeffs()
                if not powers or any(value<0 for value in powers):
                    bad.append((index,coefficient))
            print("j",jvalue,name,"degrees",degrees,"coefficients",len(coefficients),
                  "bad",len(bad),flush=True)
            if bad:
                print("first_bad",[(i,str(c)) for i,c in bad[:3]],flush=True)


if __name__=="__main__":
    main()
