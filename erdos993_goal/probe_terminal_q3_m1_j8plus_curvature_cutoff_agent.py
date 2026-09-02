#!/usr/bin/env python3
"""Find a safe Bernstein cutoff for the j>=8 R-concavity cells."""

from __future__ import annotations

import sympy as sp

from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def main():
    _n,_d,_mn,_md,variables,tests,_dens=certificate_expressions()
    j,r,h,d,_R,_W,_y=variables
    curvature={name:value for name,value in tests.items() if name.startswith("R_concavity")}
    E,S,u,v,w=sp.symbols("E S u v w",nonnegative=True)
    substitution={
        j:8+E*w,r:1+E*(1-w),
        h:1+(E+6)*u/2,d:1+(E+6)*(1-u)*v,
    }
    all_coefficients=[]
    for expression in curvature.values():
        transformed=sp.expand(expression.subs(substitution,simultaneous=True))
        _degrees,coefficients=tensor_bernstein(transformed,(u,v,w))
        all_coefficients.extend(coefficients)
    print("curvature coefficients",len(all_coefficients),flush=True)
    for base in range(4,31):
        bad=0
        for coefficient in all_coefficients:
            shifted=sp.expand(coefficient.subs(E,base+S))
            bad+=any(value<0 for value in sp.Poly(shifted,S).all_coeffs())
        print("base",base,"bad",bad,flush=True)
        if not bad:
            break


if __name__=="__main__":
    main()
