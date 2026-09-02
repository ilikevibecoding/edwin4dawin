#!/usr/bin/env python3
"""Exact rank-six g1 theorem for nonadjacent double-stars without a common neighbour."""

from __future__ import annotations

import gc
import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_nonadjacent_edgeless_w_fast_bernstein_g1_nonadjacent import build
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from prove_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent import certify


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_nonadjacent_common0_double_star_actual_d_exact_g1_nonadjacent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON0_DOUBLE_STAR_ACTUAL_D_G1_NONADJACENT"
HELPERS = (
    HERE / "explore_iso_n6_bundle_g1_nonadjacent_edgeless_w_fast_bernstein_g1_nonadjacent.py",
    HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py",
    HERE / "prove_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent.py",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    generic = reconstruct(1)
    names = {str(symbol): symbol for symbol in generic.free_symbols}
    swap = {}
    for prefix in "cd":
        for rank in range(8):
            if f"{prefix}U{rank}" in names and f"{prefix}V{rank}" in names:
                swap[names[f"{prefix}U{rank}"]] = names[f"{prefix}V{rank}"]
                swap[names[f"{prefix}V{rank}"]] = names[f"{prefix}U{rank}"]
    assert sp.expand(generic.xreplace(swap) - generic) == 0

    cases = []
    total_rows = total_scalars = 0
    minimum = None
    # keep_u=1,keep_v=0 is the exact mark swap of 0,1 over the full x,y domain.
    for keep_u, keep_v in ((0, 0), (0, 1), (1, 1)):
        value, tail, variables = build(0, 0, keep_u, keep_v)
        certificate = certify(value, tail, variables)
        local = sp.Rational(certificate["minimum_tail_power_coefficient"])
        minimum = local if minimum is None else min(minimum, local)
        total_rows += certificate["bernstein_coefficients"]
        total_scalars += certificate["tail_power_coefficients"]
        cases.append({"keep_u": keep_u, "keep_v": keep_v, **certificate})
        print(
            "CASE", keep_u, keep_v,
            "ROWS", certificate["bernstein_coefficients"],
            "SCALARS", certificate["tail_power_coefficients"],
            "MIN", certificate["minimum_tail_power_coefficient"],
            flush=True,
        )
        del value
        gc.collect()

    report = {
        "marker": MARKER,
        "scope": (
            "all forests C of order n>=8 consisting of two nonadjacent marked "
            "star centres with no common neighbour, arbitrary exclusive marked "
            "arms and common isolates, and every actual induced marked minor D"
        ),
        "claim": "rank-six bundle g1 is nonnegative",
        "parameterization": (
            "m=n-2=t+6, x=ma, y=m(1-a)b, z=m(1-a)(1-b); "
            "rx,ry,rz are retained orbit fractions"
        ),
        "calculated_mark_retention_cases": [[0, 0], [0, 1], [1, 1]],
        "inferred_mark_retention_case": [1, 0],
        "mark_swap_identity_verified": True,
        "cases": cases,
        "bernstein_rows": total_rows,
        "tail_power_coefficients": total_scalars,
        "minimum_tail_power_coefficient": str(minimum),
        "helper_sha256": {path.name: sha256(path) for path in HELPERS},
        "source_sha256": sha256(Path(__file__)),
        "proof": (
            "With W edgeless and no common neighbour, the literal rows include "
            "the both-marks term C(z,r-2).  The hierarchical (a,b) box covers "
            "all x+y+z=n-2 and rx,ry,rz cover every actual induced D.  For the "
            "three mark cases 00,01,11, an exact separable tensor-Bernstein "
            "conversion in (a,b,rx,ry,rz), its exact inverse, and nonnegative "
            "t=n-8 power coefficients prove g1>=0.  The exact U/V identity and "
            "exchange of the two arms gives case 10 from case 01."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("ROWS", total_rows, "SCALARS", total_scalars, "MIN", minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
