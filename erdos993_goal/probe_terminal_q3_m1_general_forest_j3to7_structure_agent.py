#!/usr/bin/env python3
"""Probe structural signs for the remaining fixed forest m1 ranks j=3..7."""

from __future__ import annotations

import itertools
import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import build


def tensor(expression,variables):
    poly=sp.Poly(sp.expand(expression),*variables)
    degrees=tuple(poly.degree(x) for x in variables)
    indices=list(itertools.product(*[range(q+1) for q in degrees]))
    out={index:sp.Integer(0) for index in indices}
    for powers,coefficient in poly.terms():
        for index in itertools.product(*[
            range(power,degrees[k]+1) for k,power in enumerate(powers)
        ]):
            out[index]+=coefficient*sp.prod(
                sp.binomial(index[k],powers[k])/sp.binomial(degrees[k],powers[k])
                for k in range(len(variables))
            )
    return degrees,[sp.expand(out[index]) for index in indices]


def main():
    num,_den,mnum,_mden,variables=build()
    j,r,h,d,_R,W,y=variables
    w2=sp.Poly(num,W).coeff_monomial(W**2)
    S,u,v=sp.symbols("S u v",nonnegative=True)
    for jvalue in range(3,8):
        B=jvalue+S-2
        substitution={
            j:jvalue,
            r:1+S,
            h:1+B*u/2,
            d:1+B*(1-u)*v,
        }
        tests={
            "W2_y0":w2.subs(y,0),"W2_y1":w2.subs(y,1),
            "M_y0":mnum.subs(y,0),"M_y_slope":sp.diff(mnum,y),
        }
        for name,expression in tests.items():
            transformed=sp.expand(expression.subs(substitution,simultaneous=True))
            degrees,coefficients=tensor(transformed,(u,v))
            bad=[]
            for index,coefficient in enumerate(coefficients):
                powers=sp.Poly(coefficient,S).all_coeffs()
                if any(value<0 for value in powers):
                    bad.append((index,coefficient))
            print("j",jvalue,name,"degrees",degrees,"bad",len(bad),flush=True)
            if bad:
                print("first",[(i,str(c)) for i,c in bad[:2]],flush=True)


if __name__=="__main__":
    main()
