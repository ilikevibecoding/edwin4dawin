"""Test core-vertex shift dominance on all unlabeled trees.

Candidate theorem.  If v belongs to every maximum independent set of a
forest T, equivalently alpha(T-v)=alpha(T)-1, then

    [x^k] I(T-v) <= [x^(k+1)] I(T)  for every k.

At the component-separated Boundary-SM3 interface, one marked component
must have such a core root.  Coefficientwise convolution would then give
x I(H) <= I(F), proving h_(r-1) <= f_r at every rank.

This script is a bounded exact probe, not an all-order proof.
"""

from __future__ import annotations

import argparse
import json
from functools import lru_cache
from pathlib import Path

import networkx as nx


def add(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    n = max(len(a), len(b))
    return tuple((a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n))


def shift(a: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + a


def polynomial_oracle(g: nx.Graph):
    n = g.number_of_nodes()
    adj = [0] * n
    for u, v in g.edges():
        adj[u] |= 1 << v
        adj[v] |= 1 << u

    @lru_cache(maxsize=None)
    def poly(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        bit = mask & -mask
        v = bit.bit_length() - 1
        without = mask & ~bit
        closed_without = without & ~adj[v]
        return add(poly(without), shift(poly(closed_without)))

    return poly, (1 << n) - 1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-order", type=int, default=16)
    ap.add_argument("--output", type=Path, default=Path("core_vertex_shift_dominance_probe.json"))
    args = ap.parse_args()
    totals = {"trees": 0, "core_vertices": 0, "coefficient_checks": 0, "failures": 0,
              "conditional_checks": 0, "conditional_failures": 0}
    first_failure = None
    first_conditional = None
    min_margin = None
    for n in range(2, args.max_order + 1):
        for ti, g0 in enumerate(nx.generators.nonisomorphic_trees(n)):
            g = nx.convert_node_labels_to_integers(g0, ordering="sorted")
            totals["trees"] += 1
            poly, full = polynomial_oracle(g)
            b = poly(full)
            alpha = len(b) - 1
            for v in range(n):
                c = poly(full & ~(1 << v))
                if len(c) - 1 != alpha - 1:
                    continue
                totals["core_vertices"] += 1
                for k, ck in enumerate(c):
                    totals["coefficient_checks"] += 1
                    margin = b[k + 1] - ck
                    item = {
                        "n": n,
                        "tree_index": ti,
                        "vertex": v,
                        "alpha": alpha,
                        "k": k,
                        "deleted_count": ck,
                        "parent_next_count": b[k + 1],
                        "margin": margin,
                        "polynomial": list(b),
                        "deleted_polynomial": list(c),
                        "edges": sorted(tuple(sorted(e)) for e in g.edges()),
                    }
                    if min_margin is None or margin < min_margin["margin"]:
                        min_margin = item
                    if margin < 0:
                        totals["failures"] += 1
                        if first_failure is None:
                            first_failure = item
                    dnext = c[k + 1] if k + 1 < len(c) else 0
                    if ck > 3 * dnext and k + 1 <= (2 * alpha) // 3:
                        totals["conditional_checks"] += 1
                        if margin < 0:
                            totals["conditional_failures"] += 1
                            if first_conditional is None:
                                first_conditional = item
    report = {
        "status": "PASS_BOUNDED_CORE_VERTEX_SHIFT_NOT_PROOF" if first_failure is None else "FAIL_CORE_VERTEX_SHIFT",
        "max_order": args.max_order,
        "totals": totals,
        "minimum_margin": min_margin,
        "first_failure": first_failure,
        "first_conditional_failure": first_conditional,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
