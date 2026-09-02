#!/usr/bin/env python3
"""Probe an A-coupled coefficient box for the adjacent two-deficit g1 case.

For X=A-B with |A|=n and |B|=n-d, combine the valid bounds

  max(0,a_k-C(n-d,k)) <= x_k
  x_k <= min(a_k, C(n,k)-C(n-d-k+1,k), d*C(n-1,k-1)).

The middle upper bound uses the path lower floor for every forest B.  This
file minimizes the exact deficit form over every corner of the resulting
X/Y boxes.  It is a relaxation diagnostic only: positivity would still need
an all-order certificate, while a negative value only refutes this box.
"""

from __future__ import annotations

import argparse
import itertools
import json
from math import comb

import networkx as nx

from prove_iso_compact_ordinary_r5_alpha4_root import polynomial_table
from prove_iso_n5_g1_adjacent_zero_deletion_face_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
    s_face_value,
)


def choose(n: int, k: int) -> int:
    return comb(n, k) if n >= k >= 0 else 0


def path_floor(n: int, k: int) -> int:
    return choose(n-k+1, k)


def at(row, k):
    return row[k] if 0 <= k < len(row) else 0


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


def bounds(a, n, d):
    lo = [0, d]
    hi = [0, d]
    for k in range(2, 6):
        lo.append(max(0, at(a,k)-choose(n-d,k)))
        hi.append(min(
            at(a,k),
            choose(n,k)-path_floor(n-d,k),
            d*choose(n-1,k-1),
        ))
        assert 0 <= lo[-1] <= hi[-1], (a, n, d, k, lo[-1], hi[-1])
    return tuple(lo), tuple(hi)


def corners(lo, hi):
    for mask in range(16):
        yield (lo[0], lo[1], *(
            lo[k] if not (mask & (1 << (k-2))) else hi[k]
            for k in range(2, 6)
        ))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=10)
    parser.add_argument(
        "--coarse",
        action="store_true",
        help=(
            "use x3=d*C(n-1,2), x4=x5=0 and only the two x2 endpoints "
            "0 and d*n-d(d+1)/2"
        ),
    )
    args = parser.parse_args()
    global_min = None
    total = 0
    rows = {}
    for n in range(args.max_order+1):
        local_min = None
        checks = 0
        for forest_index, graph in enumerate(forest_graphs(n)):
            a = tuple(polynomial_table(graph)[0])
            components = nx.number_connected_components(graph) if n else 0
            face = s_face_value(a)
            for dx in range(1, components):
                for dy in range(1, components-dx+1):
                    if args.coarse:
                        edge_count = n-components
                        ux2 = dx*n-dx*(dx+1)//2
                        uy2 = dy*n-dy*(dy+1)//2
                        lx2 = ux2-edge_count
                        ly2 = uy2-edge_count
                        assert lx2 >= 0 and ly2 >= 0
                        xrows = [
                            (
                                0,dx,x2,min(at(a,3),dx*choose(n-1,2)),
                                at(a,4)-choose(n-dx,4),
                                at(a,5)-choose(n-dx,5),
                            )
                            for x2 in sorted(set((lx2,ux2)))
                        ]
                        yrows = [
                            (
                                0,dy,y2,min(at(a,3),dy*choose(n-1,2)),
                                at(a,4)-choose(n-dy,4),
                                at(a,5)-choose(n-dy,5),
                            )
                            for y2 in sorted(set((ly2,uy2)))
                        ]
                    else:
                        lx, ux = bounds(a,n,dx)
                        ly, uy = bounds(a,n,dy)
                        xrows = list(corners(lx,ux))
                        yrows = list(corners(ly,uy))
                    for mx, x in enumerate(xrows):
                        tx = t_value(a,x)
                        for my, y in enumerate(yrows):
                            value = face-tx-t_value(a,y)+k_value(x,y)
                            checks += 1
                            if local_min is None or value < local_min["value"]:
                                local_min = {
                                    "value": value, "order": n,
                                    "forest_index": forest_index,
                                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                                    "components": components, "dx": dx, "dy": dy,
                                    "x_mask": mx, "y_mask": my,
                                    "A": a, "X": x, "Y": y,
                                }
                            if global_min is None or value < global_min["value"]:
                                global_min = dict(local_min)
        assert sum(1 for _ in forest_graphs(n)) == KNOWN_FOREST_COUNTS[n]
        total += checks
        rows[str(n)] = {"corner_checks": checks, "minimum": local_min}
        print(json.dumps({"order": n, **rows[str(n)]}, sort_keys=True), flush=True)
    print(json.dumps({
        "total_corner_checks": total,
        "global_minimum": global_min,
        "rows": rows,
        "scope": "relaxation diagnostic only",
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
