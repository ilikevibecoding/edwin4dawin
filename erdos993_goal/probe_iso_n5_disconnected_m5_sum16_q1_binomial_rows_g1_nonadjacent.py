#!/usr/bin/env python3
"""Finite probe of the q=1 isolate-binomial rows for sum16."""

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import H,P,at,interval_cells,unique_expressions


def symbolic_rows():
    t=sp.symbols("t",integer=True,nonnegative=True)
    a=sp.symbols("a0:7");g=sp.symbols("g0:6")
    x=tuple(at(a,k)+at(g,k-1) for k in range(7))
    p=tuple(sp.expand(sum(sp.binomial(t,j)*at(x,k-j) for j in range(k+1))) for k in range(8))
    expression=unique_expressions(interval_cells(P,H))[15]
    q1=sp.expand(sp.expand_func((2*expression).subs({P[k]:p[k] for k in range(8)}).subs({H[k]:a[k] for k in range(7)}).subs({a[0]:1,g[0]:1,g[1]:a[1]-1})))
    rows=[]
    for rank in range(7):
        rows.append(sp.expand(sum((-1)**(rank-j)*sp.binomial(rank,j)*q1.subs(t,j) for j in range(rank+1))))
    return a,g,rows


def main():
    a,g,rows=symbolic_rows(); evaluator=sp.lambdify((*a,*g),rows,modules="math")
    minima=[None]*7;witness=[None]*7;checks=0
    for e in range(1,14):
        trees=[nx.empty_graph(1)] if e==1 else nx.nonisomorphic_trees(e)
        for tree0 in trees:
            tree=nx.convert_node_labels_to_integers(tree0);aa=poly_forest(tree)
            for w in tree:
                lower=tree.copy();lower.remove_node(w);gg=poly_forest(lower)
                args=(*(at(aa,k) for k in range(7)),*(at(gg,k) for k in range(6)))
                values=[int(v) for v in evaluator(*args)]
                for i,v in enumerate(values):
                    if minima[i] is None or v<minima[i]:
                        minima[i]=v;witness[i]=(e,nx.to_graph6_bytes(tree,header=False).decode().strip(),w,aa,gg)
                checks+=7
    print("minima",minima,flush=True)
    for i,(v,w) in enumerate(zip(minima,witness)):print(i,v,w,flush=True)
    print("checks",checks,flush=True)


if __name__=="__main__":main()
