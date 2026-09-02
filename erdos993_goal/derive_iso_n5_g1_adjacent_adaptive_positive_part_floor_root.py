#!/usr/bin/env python3
"""Branch-free adaptive lower floors for adjacent two-deficit g1.

For 0<=a<=U and B>=0,

  max(0,a-B) >= a(a-B)/U.

Applying U=C(n,k), B=C(n-d,k) gives a valid branch-free lower bound for
the rank-k deletion deficit a_k-b_k.  The adjacent endpoint reduction is
increasing in ranks 4 and 5, so the k=4,5 instances may replace the two
positive-part branches by exact rational polynomial floors.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_adaptive_positive_part_floor_exact_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_ADJACENT_ADAPTIVE_POSITIVE_PART_FLOOR_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    a,U,B = sp.symbols("a U B", nonnegative=True)
    active_gap = sp.factor((a-B)-a*(a-B)/U)
    inactive_gap = sp.factor(-a*(a-B)/U)
    assert sp.cancel(active_gap+(B-a)*(U-a)/U) == 0
    assert sp.cancel(inactive_gap+a*(a-B)/U) == 0

    n,d = sp.symbols("n d", integer=True, nonnegative=True)
    a4,a5 = sp.symbols("a4 a5", nonnegative=True)
    floors = {
        "rank4": sp.factor(a4*(a4-sp.binomial(n-d,4))/sp.binomial(n,4)),
        "rank5": sp.factor(a5*(a5-sp.binomial(n-d,5))/sp.binomial(n,5)),
    }
    report = {
        "marker": MARKER,
        "general_lemma": "max(0,a-B)>=a*(a-B)/U for 0<=a<=U and B>=0",
        "case_a_at_least_B_gap": str(active_gap),
        "case_a_at_most_B_gap": str(inactive_gap),
        "case_signs": {
            "active": "(a-B)*(U-a)/U>=0",
            "inactive": "a*(B-a)/U>=0",
        },
        "forest_application": {
            "ceiling": "0<=a_k<=C(n,k)",
            "deletion_order": "b_k<=C(n-d,k), hence a_k-b_k>=a_k-C(n-d,k)",
            "rank4_adaptive_floor": str(floors["rank4"]),
            "rank5_adaptive_floor": str(floors["rank5"]),
            "conclusion": (
                "x4 and x5 may be replaced by these floors in any lower bound "
                "whose exact partial derivatives in x4,x5 are nonnegative"
            ),
        },
        "branch_reduction": (
            "Replaces four active/inactive rank-4/5 choices across the X,Y sides "
            "by one branch-free rational substitution per side."
        ),
        "scope": "exact inequality/reduction only; endpoint positivity is not asserted",
        "dependencies_sha256": {
            "derive_iso_n5_g1_adjacent_two_deficit_endpoint_reduction_root.py": sha256(
                HERE/"derive_iso_n5_g1_adjacent_two_deficit_endpoint_reduction_root.py"
            ),
            "iso_n5_g1_adjacent_two_deficit_endpoint_reduction_exact_root_20260830.json": sha256(
                HERE/"iso_n5_g1_adjacent_two_deficit_endpoint_reduction_exact_root_20260830.json"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "rank4_floor": str(floors["rank4"]),
        "rank5_floor": str(floors["rank5"]),
        "branch_free": True,
        "scope": report["scope"],
    },indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
