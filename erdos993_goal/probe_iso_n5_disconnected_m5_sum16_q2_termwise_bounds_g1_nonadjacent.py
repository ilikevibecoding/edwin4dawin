#!/usr/bin/env python3
"""Probe edge-union termwise bounds for the two q=2 Newton modes."""

import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import generic_newton_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


def main():
    x,h,rows=generic_newton_rows();e,t=sp.symbols("e t",nonnegative=True)
    variables=(*x[3:7],*h[3:6])
    for mode in ("distinct","shared"):
        order_x=e+(2 if mode=="distinct" else 1)
        edges_x=e
        substitutions={
            x[1]:order_x,x[2]:choose(order_x,2)-edges_x,
            h[1]:e,h[2]:choose(e,2)-(e-2),
        }
        lower={};upper={}
        for rank in range(3,7):
            lower[x[rank]]=choose(order_x,rank)-edges_x*choose(order_x-2,rank-2)
            upper[x[rank]]=choose(order_x,rank)
        for rank in range(3,6):
            lower[h[rank]]=choose(e,rank)-(e-2)*choose(e-2,rank-2)
            upper[h[rank]]=choose(e,rank)
        for index,row in enumerate(rows):
            expression=sp.expand(row.subs(substitutions));poly=sp.Poly(expression,*variables);bound=0;mixed=[]
            for monomial,coefficient in poly.terms():
                shifted=sp.Poly(sp.expand(coefficient.subs(e,t+13)),t)
                if all(v>=0 for v in shifted.coeffs()):endpoint=lower
                elif all(v<=0 for v in shifted.coeffs()):endpoint=upper
                else:mixed.append((monomial,coefficient));continue
                term=coefficient
                for variable,power in zip(variables,monomial):term*=endpoint[variable]**power
                bound+=term
            if mixed:print(mode,index,"MIXED",mixed,flush=True);continue
            bound=sp.factor(bound);shifted=sp.Poly(sp.expand(bound.subs(e,t+13)),t)
            print(mode,index,"bound",bound,"pass",all(v>=0 for v in shifted.coeffs()),"min",min(shifted.coeffs()),flush=True)


if __name__=="__main__":main()
