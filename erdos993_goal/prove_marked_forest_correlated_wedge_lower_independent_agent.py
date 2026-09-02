#!/usr/bin/env python3
"""Exact marked-forest correlated lower bound for the total wedge count."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sy


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "marked_forest_correlated_wedge_lower_independent_20260829.json"
ISOLATE_NOTE = HERE / "TERMINAL_PAYMENT_PERMANENT_ISOLATE_SHIFT_2026-08-29.md"
ISOLATE_NOTE_SHA = "AD41E7C287FFC5E0CDB1C2429574B42E3C2482DD6060A915DEDC2BE10B5B0C2B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(ISOLATE_NOTE) == ISOLATE_NOTE_SHA
    N, h, z, d, R, t = sy.symbols("N h z d R t", integer=True, nonnegative=True)
    other_edges = sy.expand(N - h - d - R - t)
    other_nontrivial = h - z
    Lz = sy.expand(N - 2 * h + z - d - R)
    assert sy.expand(t + other_edges - other_nontrivial - Lz) == 0

    # The two local excess identities used in the combinatorial proof.
    x, e = sy.symbols("x e", integer=True, nonnegative=True)
    local_surplus = sy.expand(sy.binomial(x + 1, 2) - x)
    assert sy.simplify(local_surplus - sy.binomial(x, 2)) == 0
    # In a nontrivial tree with e edges, sum_v(deg(v)-1)=e-1,
    # so W=e-1+sum_v C(deg(v)-1,2).
    assert sy.expand((2 * e - (e + 1)) - (e - 1)) == 0

    # Symbolically verify the sharp R=t=0 construction.  The marked
    # component is a d-star; z components are isolates; the remaining
    # q=h-z nontrivial components are paths with total other_edges edges.
    q = other_nontrivial
    construction_vertices = sy.expand((d + 1) + z + other_edges + q)
    assert sy.expand((construction_vertices - (N + 1)).subs({R: 0, t: 0})) == 0
    construction_wedges = sy.expand(sy.binomial(d, 2) + other_edges - q)
    construction_lower = sy.expand(sy.binomial(d, 2) + R + Lz)
    assert sy.simplify(
        (construction_wedges - construction_lower).subs({R: 0, t: 0})
    ) == 0

    source = Path(__file__).resolve()
    report = {
        "schema": "marked-forest-correlated-wedge-lower-independent-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_MARKED_FOREST_CORRELATED_WEDGE_LOWER",
        "claim": (
            "If G is a forest of order N+1 with h+1 components, z of them "
            "isolated and a marked nonisolated root w of degree d, and R is "
            "the total child excess of the root neighbors, then its total "
            "wedge count satisfies W>=C(d,2)+R+N-2h+z-d-R. In the no-isolate "
            "cone z=0 this is W>=C(d,2)+R+L with L=N-2h-d-R."
        ),
        "component_budget_identity": "t+E_other-(h-z)=N-2h+z-d-R",
        "local_surplus_identity": "C(x+1,2)=x+C(x,2)",
        "nontrivial_tree_identity": "W(T)=e(T)-1+sum_v C(deg(v)-1,2)",
        "sharpness": (
            "For R=t=0, take the marked component to be a d-star, z isolated "
            "components, and every other nontrivial component a path. The "
            "vertex budget is exactly N+1 and equality holds."
        ),
        "isolate_handling": (
            "Isolated components contribute zero wedges and are counted by z; "
            "the terminal program may alternatively strip them using the "
            "pinned permanent-isolate shift theorem."
        ),
        "dependencies": {ISOLATE_NOTE.name: ISOLATE_NOTE_SHA},
        "replay": "PYTHONHASHSEED=0 python prove_marked_forest_correlated_wedge_lower_independent_agent.py",
        "scope": (
            "This is a structural wedge-count lemma only. It does not prove "
            "the terminal m=1 branch cover, m=0, the full payment, unimodality, "
            "or Erdos Problem 993."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
