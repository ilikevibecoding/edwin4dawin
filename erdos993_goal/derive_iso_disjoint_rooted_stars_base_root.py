#!/usr/bin/env python3
"""Derive the ISO four-minor base for two disjoint rooted stars.

The marked vertices are the two star centers.  This is the disconnected
terminal family left when marked-support leaf collisions are not used in the
third-leaf pruning induction.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


a, b, r = sp.symbols("a b r", integer=True, nonnegative=True)
s = a + b


def c(n, k):
    return sp.binomial(n, k)


def rows_generic(k):
    # E=((1+x)^a+x)((1+x)^b+x), U=(1+x)^a((1+x)^b+x),
    # V=((1+x)^a+x)(1+x)^b, W=(1+x)^(a+b).
    return (
        c(s, k) + c(a, k - 1) + c(b, k - 1),
        c(s, k) + c(a, k - 1),
        c(s, k) + c(b, k - 1),
        c(s, k),
    )


def n_form(rank):
    rows = {k: rows_generic(rank + k) for k in range(-3, 2)}
    E = {k: rows[k][0] for k in rows}
    U = {k: rows[k][1] for k in rows}
    V = {k: rows[k][2] for k in rows}
    W = {k: rows[k][3] for k in rows}
    return sp.expand(
        2 * rank * E[0] * W[-2]
        - (rank + 1) * E[1] * W[-3]
        + E[-1] * (2 * W[-3] - (rank + 1) * W[-1])
        + U[0] * (-(rank + 1) * V[-2] - W[-3])
        + U[-1] * (2 * rank * V[-1] + 2 * W[-2])
        + U[-2] * (-(rank + 1) * V[0] + 2 * V[-2] - W[-1])
        - V[0] * W[-3]
        + 2 * V[-1] * W[-2]
        - V[-2] * W[-1]
    )


def main() -> None:
    value = n_form(r)
    simplified = sp.factor(sp.combsimp(value))
    together = sp.factor(sp.together(simplified))
    report = {
        "marker": "DERIVED_EXACT_ISO_DISJOINT_ROOTED_STARS_BASE",
        "domain": "a,b>=0 and generic rank r>=4; rank 2,3 handled literally",
        "raw": str(value),
        "simplified": str(simplified),
        "together": str(together),
        "ops": int(sp.count_ops(together)),
    }

    # Exact literal grid both catches boundary deltas and supplies candidate
    # factors if SymPy leaves the generic expression opaque.
    from probe_iso_four_minor_third_leaf_root import four_minor_vector
    import networkx as nx

    checks = 0
    minimum = None
    for aa in range(0, 61):
        for bb in range(0, 61):
            g = nx.disjoint_union(nx.star_graph(aa), nx.star_graph(bb))
            u = 0
            v = aa + 1
            vec = four_minor_vector(g, u, v)
            for rank in range(2, len(vec)):
                z = vec[rank]
                checks += 1
                if minimum is None or z < minimum[0]:
                    minimum = (z, aa, bb, rank)
                assert z >= 0
    report["literal_grid"] = {
        "a_max": 60,
        "b_max": 60,
        "checks": checks,
        "minimum": minimum,
    }
    Path("iso_disjoint_rooted_stars_base_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print("simplified:")
    print(together)
    print(f"ops {report['ops']}")
    print(report["literal_grid"])
    print(report["marker"])


if __name__ == "__main__":
    main()
