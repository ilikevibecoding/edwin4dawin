#!/usr/bin/env python3
"""Exact reconnaissance for lowering the ordinary-parent g5 reduction threshold."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g5_ordinary_wchain_geometry_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G5_ORDINARY_WCHAIN_GEOMETRY_RANK7_G5_FINISH"
THRESHOLD = 11


def choose(h, k):
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h - j for j in range(k)) / sp.factorial(k)


def main() -> None:
    n = sp.Symbol("n", nonnegative=True)
    t = sp.Symbol("t", nonnegative=True)
    A2, B2, A3, B3, W2, W3, Z2, Z3 = sp.symbols(
        "A2 B2 A3 B3 W2 W3 Z2 Z3", nonnegative=True
    )
    c3 = A2 + B2 + 8*A3 + 8*B3 + 2*W2 + 8*W3 + 8*Z3 - 2*n
    c4 = 2*(W2 - 3*A2 - 3*B2 - 7*Z2 - n - 2)
    payment = (6*n - 5)*(n - 6)/2
    dcoef = sp.expand(c4 - payment)
    kcoef = sp.expand(c3 + (n - 5)*dcoef/3)

    a, b, c = sp.symbols("a b c", nonnegative=True)
    nval = t + THRESHOLD
    m = nval - 2
    d = sp.Symbol("d", nonnegative=True)
    raw = marked_geometry_branches(m, a, b, c, d)
    r = 1 + (m - 1)*a
    exact_adjacent = (
        "adjacent", (a, b, c), r*b, r*(1-b)*c, m-r,
        sp.Integer(0), sp.Integer(0),
    )
    branches = [exact_adjacent, *raw[1:]]

    rows = []
    for label, variables0, x, y, e, z2, z3 in branches:
        # Exact induced-category union bounds and the frozen forest moment floor.
        aa2 = m - x
        bb2 = m - y
        aa3 = choose(aa2, 2) - e
        bb3 = choose(bb2, 2) - e
        omega_floor = 2*e**2/m - e
        ww2 = choose(m, 2) - e
        ww3 = choose(m, 3) - e*(m-2) + omega_floor
        value_k = sp.cancel(kcoef.subs({
            n:nval, A2:aa2, B2:bb2, A3:aa3, B3:bb3,
            W2:ww2, W3:ww3, Z2:z2, Z3:z3,
        }, simultaneous=True))
        value_minus_d = sp.cancel((-dcoef).subs({
            n:nval, A2:aa2, B2:bb2, W2:ww2, Z2:z2,
        }, simultaneous=True))
        used_k = tuple(v for v in variables0 if v in value_k.free_symbols)
        used_d = tuple(v for v in variables0 if v in value_minus_d.free_symbols)
        print("BRANCH_START", label, flush=True)
        rows.append({
            "geometry": label,
            "k_summary": fast_summary(value_k, used_k, t),
            "minus_d_summary": fast_summary(value_minus_d, used_d, t),
        })

    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "rows": rows,
        "status": "diagnostic; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_counts": {
            row["geometry"]: {
                "k": row["k_summary"]["negative_tail_scalar_coefficients"],
                "minus_d": row["minus_d_summary"]["negative_tail_scalar_coefficients"],
            } for row in rows
        },
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
