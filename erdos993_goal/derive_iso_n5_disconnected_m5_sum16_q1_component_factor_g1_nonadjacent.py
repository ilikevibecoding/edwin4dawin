#!/usr/bin/env python3
"""Derive the q=1 leaf-component/isolate expansion of unique Psi sum16."""

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    at,
    interval_cells,
    unique_expressions,
)


def main():
    t=sp.symbols("t",integer=True,nonnegative=True)
    a=sp.symbols("a0:7",nonnegative=True)  # H, a tree on e vertices
    g=sp.symbols("g0:6",nonnegative=True)  # H-w
    x=tuple(at(a,k)+at(g,k-1) for k in range(7))  # leaf extension T
    p=tuple(sp.expand(sum(sp.binomial(t,j)*at(x,k-j) for j in range(k+1))) for k in range(8))
    expression=unique_expressions(interval_cells(P,H))[15]
    q1=sp.expand(2*expression.subs({P[k]:p[k] for k in range(8)}).subs({H[k]:a[k] for k in range(7)}))
    q1=sp.expand(sp.expand_func(q1.subs({a[0]:1,g[0]:1,g[1]:a[1]-1})))
    assert sp.degree(q1,t)<=7
    # Exact Newton/binomial expansion in the isolate count t.
    rows=[];reconstructed=0
    for rank in range(8):
        difference=sp.expand(sum(
            (-1)**(rank-j)*sp.binomial(rank,j)*q1.subs(t,j)
            for j in range(rank+1)
        ))
        rows.append(sp.factor(difference))
        reconstructed+=difference*sp.binomial(t,rank)
    assert sp.expand(sp.expand_func(reconstructed)-q1)==0
    print("twice_q1_sum16",sp.factor(q1),flush=True)
    for rank,row in enumerate(rows):print("BINOM",rank,row,flush=True)
    print("DERIVED_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_Q1_COMPONENT_FACTOR_G1_NONADJACENT")


if __name__=="__main__":main()
