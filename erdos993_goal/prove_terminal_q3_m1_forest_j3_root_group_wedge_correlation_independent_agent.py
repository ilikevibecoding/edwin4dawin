#!/usr/bin/env python3
"""Exact root-group wedge correlation for forest terminal m1,j3."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE=Path(__file__).resolve().parent
REPORT=HERE/"terminal_q3_m1_forest_j3_root_group_wedge_correlation_independent_20260829.json"
DEPENDENCIES={
    "FOREST_MARKED_COMPONENT_CORRELATED_WEDGE_UPPER_ROOT_2026-08-29.md":
        "3AFD1FFFEAEDE346C079F7438187F3BAC0F2591CFCC5D9D1681334FAFE4E5922",
    "FOREST_M1_J3_ROOT_NEIGHBOR_CLASS_CAPS_ROOT_2026-08-29.md":
        "1E3937FB48898C5AF101B788E9613CFDD4944616D97B0115231DC931159A22E0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(g: nx.Graph, chosen) -> bool:
    return all(not g.has_edge(a,b) for a,b in itertools.combinations(chosen,2))


def count_class(g: nx.Graph,root:int,k:int) -> int:
    U=set(g.neighbors(root)); F=set(g)-{root}
    return sum(independent(g,chosen) and len(set(chosen)&U)==k
               for chosen in itertools.combinations(F,4))


def check_marked(g:nx.Graph,root:int):
    U=tuple(g.neighbors(root)); d=len(U); N=len(g)-1
    h=nx.number_connected_components(g)-1
    rvals=tuple(g.degree(u)-1 for u in U)
    R=sum(rvals); Q=sum(comb(value,2) for value in rvals)
    H=set(g)-{root}-set(U); S=len(H)
    W=sum(comb(degree,2) for _v,degree in g.degree())
    L=N-2*h-d-R
    if L<0:
        raise AssertionError(("negative L",len(g),root,L))
    qfloor=W-comb(d,2)-R-comb(L+1,2)
    if Q<qfloor:
        raise AssertionError(("wedge Q floor",len(g),root,Q,qfloor))
    checked_classes=False
    if h>=1 and d>=2 and S>=5:
        if R>S-2:
            raise AssertionError(("R support",len(g),root,S,R))
        one=count_class(g,root,1)
        two=count_class(g,root,2)
        one_floor=Fraction(
            d*comb(S-2,3)-R*comb(S-3,2),1
        )+Fraction(Q*(3*S-R-10),3)
        two_floor=(comb(d,2)*comb(S-1,2)-(d-1)*R*(S-2)
                   +(d-2)*Q+comb(R,2))
        if one<one_floor:
            raise AssertionError(("one-root correction",len(g),root,one,one_floor,rvals))
        if two<two_floor:
            raise AssertionError(("two-root correction",len(g),root,two,two_floor,rvals))
        checked_classes=True
    return checked_classes,Q,qfloor


def main():
    for name,want in DEPENDENCIES.items():
        got=sha256(HERE/name)
        if got!=want: raise AssertionError(("dependency hash",name,want,got))

    S,r,q,L,t=sp.symbols("S r q L t")
    C=lambda a,k: sp.prod(a-j for j in range(k))/sp.factorial(k)
    one_identity=sp.factor(
        C(S-r-2,3)-C(S-2,3)+r*C(S-3,2)
        -C(r,2)*(3*S-r-10)/3
    )
    two_identity=sp.factor(
        C(S-q-1,2)-C(S-1,2)+q*(S-2)-C(q,2)
    )
    residual_identity=sp.factor(
        C(L+1,2)-C(t+1,2)-C(L-t+1,2)-t*(L-t)
    )
    if any(value!=0 for value in (one_identity,two_identity,residual_identity)):
        raise AssertionError((one_identity,two_identity,residual_identity))

    atlas_forests=atlas_marked=atlas_class=0; atlas_min_q_slack=None
    for g0 in nx.graph_atlas_g():
        if not len(g0) or len(g0)>7 or not nx.is_forest(g0): continue
        if any(degree==0 for _v,degree in g0.degree()): continue
        g=nx.convert_node_labels_to_integers(g0); atlas_forests+=1
        for root in g:
            classes,Q,qfloor=check_marked(g,root); atlas_marked+=1; atlas_class+=classes
            slack=Q-qfloor
            atlas_min_q_slack=slack if atlas_min_q_slack is None else min(atlas_min_q_slack,slack)

    tree_marked=tree_class=0; tree_min_q_slack=None
    for order in range(2,13):
        for g in nx.generators.nonisomorphic_trees(order):
            for root in g:
                classes,Q,qfloor=check_marked(g,root); tree_marked+=1; tree_class+=classes
                slack=Q-qfloor
                tree_min_q_slack=slack if tree_min_q_slack is None else min(tree_min_q_slack,slack)

    # Independent disconnected replay: every ordered-size pair of
    # nonisomorphic nontrivial trees through total order 12.
    tree_lists={order:list(nx.generators.nonisomorphic_trees(order))
                for order in range(2,11)}
    pair_forests=pair_marked=pair_class=0; pair_min_q_slack=None
    for left_order in range(2,11):
        for right_order in range(left_order,11):
            if left_order+right_order>12: continue
            for left in tree_lists[left_order]:
                for right in tree_lists[right_order]:
                    g=nx.disjoint_union(left,right); pair_forests+=1
                    for root in g:
                        classes,Q,qfloor=check_marked(g,root)
                        pair_marked+=1; pair_class+=classes
                        slack=Q-qfloor
                        pair_min_q_slack=(slack if pair_min_q_slack is None
                                          else min(pair_min_q_slack,slack))

    report={
        "status":"PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_ROOT_GROUP_WEDGE_CORRELATION",
        "scope":(
            "Auxiliary no-isolate h>=1,d>=2,S>=5 root-group correction only; excludes the "
            "complete terminal row, m=0, and Erdos Problem 993."
        ),
        "definitions":{
            "r_i":"deg(u_i)-1 for root neighbors u_i",
            "R":"sum r_i",
            "Q":"sum C(r_i,2)",
            "L":"N-2h-d-R",
        },
        "theorem":{
            "wedge_floor":"Q >= W-C(d,2)-R-C(L+1,2)",
            "one_root_correction":"Q(3S-R-10)/3",
            "two_root_correction":"(d-2)Q+C(R,2)",
            "combined_substitution":(
                "Replace Q in the sum of the two corrections by the wedge floor; "
                "its coefficient is nonnegative for S>=5,R<=S-2,d>=2."
            ),
        },
        "literal_replay":{
            "atlas_no_isolate_forests":atlas_forests,
            "atlas_marked_cells":atlas_marked,
            "atlas_S_ge_5_class_cells":atlas_class,
            "atlas_minimum_Q_floor_slack":atlas_min_q_slack,
            "nonisomorphic_tree_marked_cells_orders_2_through_12":tree_marked,
            "nonisomorphic_tree_S_ge_5_class_cells":tree_class,
            "nonisomorphic_tree_minimum_Q_floor_slack":tree_min_q_slack,
            "two_component_nonisomorphic_tree_pair_forests_order_at_most_12":pair_forests,
            "two_component_marked_cells":pair_marked,
            "two_component_S_ge_5_class_cells":pair_class,
            "two_component_minimum_Q_floor_slack":pair_min_q_slack,
        },
        "dependencies":DEPENDENCIES,
        "source_sha256":sha256(Path(__file__)),
    }
    temp=REPORT.with_suffix(REPORT.suffix+".tmp")
    temp.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    os.replace(temp,REPORT)
    print(json.dumps(report,indent=2))


if __name__=="__main__": main()
