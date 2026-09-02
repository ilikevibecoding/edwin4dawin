#!/usr/bin/env python3
"""Exact finite probe of the two q=2 component modes for sum16."""

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import add,mul,poly_forest
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import H,P,at,interval_cells,unique_expressions


def generic_newton_rows():
    t=sp.symbols("t",integer=True,nonnegative=True)
    x=sp.symbols("x0:8");h=sp.symbols("h0:7")
    p=tuple(sp.expand(sum(sp.binomial(t,j)*at(x,k-j) for j in range(k+1))) for k in range(8))
    expression=unique_expressions(interval_cells(P,H))[15]
    twice=sp.expand(sp.expand_func((2*expression).subs({P[k]:p[k] for k in range(8)}).subs({H[k]:h[k] for k in range(7)}).subs({x[0]:1,h[0]:1})))
    rows=[];reconstructed=0
    for rank in range(7):
        row=sp.expand(sum((-1)**(rank-j)*sp.binomial(rank,j)*twice.subs(t,j) for j in range(rank+1)))
        rows.append(row);reconstructed+=row*sp.binomial(t,rank)
    assert sp.expand(sp.expand_func(reconstructed)-twice)==0
    return x,h,rows


def shift(poly):
    return [0,*poly]


def main():
    x,h,rows=generic_newton_rows();evaluator=sp.lambdify((*x,*h),rows,modules="math")
    minima={mode:[None]*7 for mode in ("distinct","shared")};witness={mode:[None]*7 for mode in minima}
    checks={mode:0 for mode in minima}
    cache={}
    for order in range(1,12):
        items=[]
        candidates=[nx.empty_graph(1)] if order==1 else nx.nonisomorphic_trees(order)
        for tree0 in candidates:
            tree=nx.convert_node_labels_to_integers(tree0);a=poly_forest(tree)
            for w in tree:
                lower=tree.copy();lower.remove_node(w);g=poly_forest(lower)
                items.append((a,g,nx.to_graph6_bytes(tree,header=False).decode().strip(),w))
        cache[order]=items
    for total in range(2,13):
        for e1 in range(1,total):
            e2=total-e1
            # Ordered pairs are harmless and make branch coverage transparent.
            for a1,g1,g61,w1 in cache[e1]:
                for a2,g2,g62,w2 in cache[e2]:
                    hpoly=mul(a1,a2)
                    leaf1=add(a1,shift(g1));leaf2=add(a2,shift(g2))
                    base={
                        "distinct":mul(leaf1,leaf2),
                        "shared":add(hpoly,shift(mul(g1,g2))),
                    }
                    for mode,xpoly in base.items():
                        arguments=(*(at(xpoly,k) for k in range(8)),*(at(hpoly,k) for k in range(7)))
                        values=[int(round(v)) for v in evaluator(*arguments)]
                        for index,value in enumerate(values):
                            if minima[mode][index] is None or value<minima[mode][index]:
                                minima[mode][index]=value;witness[mode][index]=(total,e1,e2,g61,w1,g62,w2,xpoly,hpoly)
                        checks[mode]+=7
    print("minima",minima,flush=True)
    print("checks",checks,flush=True)
    for mode in minima:
        for index,value in enumerate(minima[mode]):print(mode,index,value,witness[mode][index],flush=True)


if __name__=="__main__":main()
