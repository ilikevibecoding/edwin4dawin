#!/usr/bin/env python3
"""Literal finite transfer diagnostics for the spine p-u-v ordinary mode."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import networkx as nx
import sympy as sp

from census_iso_n6_bundle_g2_adjacent_actual_n0_8_root import bilinear, graph6, independence_row, remove_closed_neighborhood
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import A2_TERMS,K2_TERMS,L2_TERMS
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE=Path(__file__).resolve().parent
INPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_marked_spine_occupation_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256="1A79A8F679DA504BF8CE43E98BF66E836991E24C09C25E19680B5B000C00F156"
OUTPUT=HERE/"iso_n6_bundle_g2_adjacent_ordinary_marked_spine_transfer_n1_8_exact_rank7_g5_finish_20260831.json"
MARKER="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_TRANSFER_N1_8_RANK7_G5_FINISH"


def remove(graph,vertices):
    out=graph.copy();out.remove_nodes_from(vertices);return out


def no_parent(graph,u,v):
    a=independence_row(remove(graph,(u,v)),7)
    b=independence_row(remove_closed_neighborhood(graph,v),6)
    c=independence_row(remove_closed_neighborhood(graph,u),6)
    return bilinear(a,a,A2_TERMS)+bilinear(a,b,L2_TERMS)+bilinear(a,c,L2_TERMS)+bilinear(b,c,K2_TERMS)


def main():
    assert hashlib.sha256(INPUT.read_bytes()).hexdigest().upper()==INPUT_SHA256
    report=json.loads(INPUT.read_text(encoding="utf-8"))
    names={z:sp.Symbol(z) for z in ([f"a{i}" for i in range(8)]+[f"b{i}" for i in range(7)]+[f"c{i}" for i in range(7)]+[f"x{i}" for i in range(6)]+[f"y{i}" for i in range(5)])}
    expr=sp.sympify(report["target"],locals=names);args=tuple(sorted(expr.free_symbols,key=str));evaluate=sp.lambdify(args,expr,"math")
    records=neg=delta_c_neg=delta_d_neg=0; minima={"total":None,"delta_C":None,"delta_D":None};witness={}
    stream=hashlib.sha256(); per_order={}
    for order in range(3,11):
        local_records=local_neg=local_dc=local_dd=0
        for graph0 in forest_graphs(order):
            g=nx.convert_node_labels_to_integers(graph0,ordering="sorted");code=graph6(g)
            for left,right in sorted(tuple(sorted(e)) for e in g.edges()):
                for u,v in ((left,right),(right,left)):
                    A=remove(g,(u,v));a=independence_row(A,7)
                    b=independence_row(remove_closed_neighborhood(g,v),6)
                    c=independence_row(remove_closed_neighborhood(g,u),6)
                    base=no_parent(g,u,v)
                    for p in sorted(set(g)-{u,v}):
                        if not g.has_edge(p,u): continue
                        assert not g.has_edge(p,v)
                        Q=remove_closed_neighborhood(g,p)
                        x=independence_row(remove(Q,(v,)),5)
                        y=independence_row(remove_closed_neighborhood(Q,v),4)
                        values={**{f"a{k}":a[k] for k in range(8)},**{f"b{k}":b[k] for k in range(7)},**{f"c{k}":c[k] for k in range(7)},**{f"x{k}":x[k] for k in range(6)},**{f"y{k}":y[k] for k in range(5)}}
                        total=int(evaluate(*(values[str(z)] for z in args)))
                        dgraph=remove(g,(p,)); base_d=no_parent(dgraph,u,v)
                        dc=total-base;dd=total-base_d
                        rec=(total,dc,dd,order,code,u,v,p)
                        stream.update(("|".join(map(str,rec))+";").encode())
                        records+=1;local_records+=1;neg+=total<0;local_neg+=total<0;delta_c_neg+=dc<0;local_dc+=dc<0;delta_d_neg+=dd<0;local_dd+=dd<0
                        for key,val in (("total",total),("delta_C",dc),("delta_D",dd)):
                            cand=(val,code,u,v,p)
                            if minima[key] is None or cand<minima[key]: minima[key]=cand; witness[key]={"value":val,"order":order,"graph6":code,"u":u,"v":v,"p":p,"ordinary":total,"no_parent_C":base,"no_parent_D":base_d}
        per_order[str(order-2)]={"spine_triples":local_records,"negative_total":local_neg,"negative_vs_no_parent_C":local_dc,"negative_vs_no_parent_D":local_dd}
        print(order-2,local_records,local_neg,local_dc,local_dd,flush=True)
    out={"marker":MARKER,"scope":"all forests through order 10, oriented spine p-u-v","per_common_order":per_order,"aggregate":{"spine_triples":records,"negative_total":neg,"negative_vs_no_parent_C":delta_c_neg,"negative_vs_no_parent_D":delta_d_neg,"minima":{k:v[0] for k,v in minima.items()},"witnesses":witness,"ordered_stream_sha256":stream.hexdigest().upper()},"status":"exact finite transfer diagnostic","source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()}
    raw=json.dumps(out,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n");print(json.dumps(out["aggregate"],indent=2,sort_keys=True));print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper());print(MARKER)


if __name__=="__main__":main()
