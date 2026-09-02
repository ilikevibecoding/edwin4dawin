#!/usr/bin/env python3
"""Probe union-bound certificates for q=1 sum16 isolate-binomial rows."""

import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q1_binomial_rows_g1_nonadjacent import symbolic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


def main():
    a,g,rows=symbolic_rows(); e,t=sp.symbols("e t",nonnegative=True)
    variables=(*a[3:7],*g[2:6])
    # H is an e-vertex tree.  G=H-w is an (e-1)-vertex forest with at
    # most e-2 edges.  Edge-union lower bounds and binomial ceilings.
    lower={}
    upper={}
    for rank in range(3,7):
        lower[a[rank]]=choose(e,rank)-(e-1)*choose(e-2,rank-2)
        upper[a[rank]]=choose(e,rank)
    for rank in range(2,6):
        lower[g[rank]]=choose(e-1,rank)-(e-2)*choose(e-3,rank-2)
        upper[g[rank]]=choose(e-1,rank)
    for index,row in enumerate(rows):
        expression=sp.expand(row.subs({a[1]:e,a[2]:choose(e-1,2)}))
        poly=sp.Poly(expression,*variables)
        bound=0; signs=[]
        for monomial,coefficient in poly.terms():
            shifted=sp.Poly(sp.expand(coefficient.subs(e,t+13)),t)
            if all(value>=0 for value in shifted.coeffs()):sign=1
            elif all(value<=0 for value in shifted.coeffs()):sign=-1
            else:
                signs.append((monomial,coefficient,"MIXED"));continue
            term=coefficient
            for variable,power in zip(variables,monomial):
                term*=(lower if sign>0 else upper)[variable]**power
            bound+=term;signs.append((monomial,coefficient,sign))
        if any(row[-1]=="MIXED" for row in signs):
            print(index,"MIXED",[row for row in signs if row[-1]=="MIXED"],flush=True);continue
        bound=sp.factor(bound)
        shifted=sp.Poly(sp.expand(bound.subs(e,t+13)),t)
        print(index,"bound",bound,"coeffs",shifted.all_coeffs(),"pass",all(v>=0 for v in shifted.coeffs()),flush=True)


if __name__=="__main__":main()
