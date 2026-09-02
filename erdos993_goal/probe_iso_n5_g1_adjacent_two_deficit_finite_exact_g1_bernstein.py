#!/usr/bin/env python3
"""Complete exact finite census for adjacent g1 with two positive deficits.

For each unlabeled forest A through the requested order, every component is
assigned one of three modes: unattached, attached to the first mark at one
chosen root, or attached to the second mark at one chosen root.  Both marked
sides must be nonempty.  This is exactly the adjacent-forest occupation
geometry; duplicates under automorphisms are harmless and retained in the
ordered replay stream.

The artifact is finite evidence only until combined with an all-order cone.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_g1_adjacent_zero_deletion_face_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
    s_face_value,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_two_deficit_finite_exact_g1_bernstein_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_FINITE_G1_BERNSTEIN"
RANK = 6


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def truncate(row):
    return tuple(at(row,index) for index in range(RANK+1))


def product(left, right):
    out = [0]*(RANK+1)
    for i,li in enumerate(left):
        if not li:
            continue
        for j,rj in enumerate(right[:RANK+1-i]):
            out[i+j] += li*rj
    return tuple(out)


def t_value(a, x):
    return (
        (2*at(a,2)-at(a,3)-10*at(a,4)-6*at(a,5))*at(x,1)
        +2*(at(a,1)+5*at(a,2)+4*at(a,3)-at(a,4))*at(x,2)
        +(-at(a,1)+8*at(a,2)+8*at(a,3))*at(x,3)
        -2*(5*at(a,1)+at(a,2))*at(x,4)-6*at(a,1)*at(x,5)
    )


def k_value(x, y):
    return (
        2*at(x,1)*at(y,2)-3*at(x,1)*at(y,3)-6*at(x,1)*at(y,4)
        +2*at(x,2)*at(y,1)+6*at(x,2)*at(y,2)+4*at(x,2)*at(y,3)
        -3*at(x,3)*at(y,1)+4*at(x,3)*at(y,2)-6*at(x,4)*at(y,1)
    )


def value(a, b, c):
    x = tuple(at(a,index)-at(b,index) for index in range(RANK+1))
    y = tuple(at(a,index)-at(c,index) for index in range(RANK+1))
    return s_face_value(a)-t_value(a,x)-t_value(a,y)+k_value(x,y),x,y


def component_data(graph):
    answer=[]
    for nodes in nx.connected_components(graph):
        component=nx.convert_node_labels_to_integers(graph.subgraph(nodes).copy())
        whole=truncate(poly_forest(component))
        deleted=[]
        for root in component:
            reduced=component.copy(); reduced.remove_node(root)
            deleted.append(truncate(poly_forest(reduced)))
        answer.append((whole,tuple(deleted)))
    return tuple(answer)


def expected_cells(components):
    sizes=[len(deleted) for _whole,deleted in components]
    return math.prod(1+2*size for size in sizes)-2*math.prod(1+size for size in sizes)+1


def enumerate_cells(a, components, callback):
    identity=(1,0,0,0,0,0,0)

    def recurse(index,b,c,has_x,has_y,mode_word):
        if index == len(components):
            if has_x and has_y:
                callback(b,c,mode_word)
            return
        whole,deleted=components[index]
        recurse(index+1,product(b,whole),product(c,whole),has_x,has_y,(*mode_word,0))
        for root,row in enumerate(deleted):
            recurse(index+1,product(b,row),product(c,whole),True,has_y,(*mode_word,1+root))
            recurse(index+1,product(b,whole),product(c,row),has_x,True,(*mode_word,-1-root))

    recurse(0,identity,identity,False,False,())


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--max-order",type=int,default=12)
    parser.add_argument("--count-only",action="store_true")
    args=parser.parse_args()
    total_forests=total_cells=0
    global_minimum=None
    global_witness=None
    rows={}
    digest=hashlib.sha256()
    for order in range(args.max_order+1):
        forests=cells=0
        local_minimum=None
        local_witness=None
        for forest_index,graph in enumerate(forest_graphs(order)):
            forests+=1
            a=truncate(poly_forest(graph))
            components=component_data(graph)
            expected=expected_cells(components)
            cells+=expected
            if args.count_only or expected == 0:
                continue
            seen=0

            def check(b,c,mode_word):
                nonlocal seen,local_minimum,local_witness,global_minimum,global_witness
                seen+=1
                result,x,y=value(a,b,c)
                assert result >= 0, (order,forest_index,mode_word,a,b,c,x,y,result)
                witness={
                    "order":order,"forest_index":forest_index,
                    "graph6":nx.to_graph6_bytes(graph,header=False).decode().strip(),
                    "mode_word":mode_word,"A":a,"B":b,"C":c,"X":x,"Y":y,
                }
                if local_minimum is None or result < local_minimum:
                    local_minimum=result; local_witness=witness
                if global_minimum is None or result < global_minimum:
                    global_minimum=result; global_witness=witness
                digest.update(f"{order}|{forest_index}|{mode_word}|{a}|{b}|{c}|{result};".encode())

            enumerate_cells(a,components,check)
            assert seen == expected
        assert forests == KNOWN_FOREST_COUNTS[order]
        total_forests+=forests; total_cells+=cells
        rows[str(order)]={
            "unlabeled_forests":forests,"marked_cells":cells,
            "minimum":local_minimum,"witness":local_witness,
        }
        print(json.dumps({"order":order,**rows[str(order)]},sort_keys=True),flush=True)
    if args.count_only:
        print(json.dumps({"unlabeled_forests":total_forests,"marked_cells":total_cells,
                          "rows":rows,"scope":"count only"},indent=2,sort_keys=True))
        return
    report={
        "marker":MARKER,"orders":[0,args.max_order],
        "unlabeled_forests":total_forests,"marked_cells":total_cells,
        "minimum":global_minimum,"witness":global_witness,
        "ordered_stream_sha256":digest.hexdigest().upper(),"rows":rows,
        "coverage":(
            "Every component independently unattached, X-rooted, or Y-rooted; "
            "X and Y both nonempty; hence all adjacent two-deficit forest cells."
        ),
        "scope":"Complete finite census only; no all-order theorem claim.",
        "source_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8")
    print(json.dumps({key:report[key] for key in (
        "marker","orders","unlabeled_forests","marked_cells","minimum",
        "ordered_stream_sha256","scope",
    )},indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
