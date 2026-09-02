#!/usr/bin/env python3
"""Exact containment-cone probe for the ordinary-parent rank-seven g5 mode.

For an ordinary deleted parent p, PFk counts the F-category independent
k-sets of C that contain p.  Hence 0 <= PFk <= Fk, coefficientwise.  This
script first minimizes the exact ordinary-parent expression over those twelve
containment intervals, then applies the same rigorous induced-category and
forest edge/wedge intervals as the no-parent/endpoint large-order probe.

This file is fail-closed: it records negative Bernstein controls and asserts no
theorem.  A separate theorem wrapper may promote it only if every branch is
exactly nonnegative.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)
from explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent import (
    substitute_geometry_with_wedge_floor,
)
from probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail import (
    bernstein_summary,
    choose,
    eliminate_linear,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g5_ordinary_containment_cone_probe_rank7_g5_tail_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G5_ORDINARY_CONTAINMENT_CONE_RANK7_G5_TAIL"
THRESHOLD = 60


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    names = {"n"}
    names.update(f"{family}{rank}" for family in "WABZ" for rank in range(2, 8))
    names.update(
        f"P{family}{rank}"
        for family, ranks in {
            "A": (4, 5, 6),
            "B": (4, 5, 6),
            "W": (3, 4, 5, 6),
            "Z": (5, 6),
        }.items()
        for rank in ranks
    )
    symbols = {name: sp.Symbol(name, nonnegative=True) for name in sorted(names)}
    n = symbols["n"]
    tail = sp.Symbol("t", nonnegative=True)
    m = n - 2
    e = choose(m, 2) - symbols["W2"]

    current = sp.expand(
        sp.sympify(source["modes"]["ordinary_parent"]["expression"], locals=symbols)
    )

    # Literal set containment: PFk is a subfamily of Fk.  The generic
    # eliminate_linear routine splits a mixed coefficient into exact positive
    # and negative nonnegative-monomial parts, using 0 for the former and Fk
    # for the latter.
    parent_rows = []
    parent_variables = tuple(
        sorted(
            (symbol for symbol in current.free_symbols if str(symbol).startswith("P")),
            key=lambda symbol: (-int(str(symbol)[-1]), str(symbol)),
        )
    )
    forced_positive_parent = {"PA4", "PB4", "PW3", "PW6", "PZ5"}
    # PW4 has coefficient
    #   2*(W2-3*A2-3*B2-7*Z2-n-2).
    # A forest W on m=n-2 vertices has W2>=C(m,2)-(m-1), while
    # A2,B2<=m and Z2<=1.  Therefore this coefficient is nonnegative
    # whenever n^2-21*n+18>=0, in particular for every n>=21.
    if THRESHOLD >= 21:
        forced_positive_parent.add("PW4")
    for variable in parent_variables:
        family_rank = str(variable)[1:]
        upper = symbols[family_rank]
        if str(variable) in forced_positive_parent:
            coefficient = sp.factor(sp.diff(current, variable))
            current = sp.expand(current.subs(variable, 0))
            row = {
                "variable": str(variable),
                "coefficient": str(coefficient),
                "positive_part": str(coefficient),
                "negative_part": "0",
                "lower": "0",
                "upper": str(upper),
                "forced_positive": True,
            }
        else:
            current, row = eliminate_linear(
                current, variable, sp.Integer(0), upper, n, tail
            )
        parent_rows.append(row)
    assert not any(str(symbol).startswith("P") for symbol in current.free_symbols)

    def category_lower(h, k):
        return choose(h, k) - e * choose(h, k - 2)

    def category_upper(h, k):
        retained = e - m * (m - h)
        extension = k * choose(h, k) / (m * (m - 1))
        return choose(h, k) - retained * extension

    intervals = {}
    for rank in range(3, 8):
        internal_rank = rank - 1
        intervals[f"A{rank}"] = (
            category_lower(symbols["A2"], internal_rank),
            category_upper(symbols["A2"], internal_rank),
        )
        intervals[f"B{rank}"] = (
            category_lower(symbols["B2"], internal_rank),
            category_upper(symbols["B2"], internal_rank),
        )
    for rank in range(4, 8):
        internal_rank = rank - 2
        intervals[f"Z{rank}"] = (
            symbols["Z2"] * category_lower(symbols["Z3"], internal_rank),
            symbols["Z2"] * category_upper(symbols["Z3"], internal_rank),
        )
    for rank in range(4, 8):
        incidence = e * choose(m - 2, rank - 2)
        intervals[f"W{rank}"] = (
            choose(m, rank) - incidence,
            choose(m, rank) - incidence / (rank - 1),
        )

    category_rows = []
    for rank in range(7, 2, -1):
        labels = [f"A{rank}", f"B{rank}"]
        if rank >= 4:
            labels += [f"W{rank}", f"Z{rank}"]
        for label in labels:
            current, row = eliminate_linear(
                current, symbols[label], *intervals[label], n, tail
            )
            category_rows.append(row)

    allowed = {
        n, symbols["A2"], symbols["B2"], symbols["W2"],
        symbols["W3"], symbols["Z2"], symbols["Z3"],
    }
    assert current.free_symbols <= allowed

    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    branches = []
    for branch in marked_geometry_branches(tail + THRESHOLD - 2, a, b, c, d):
        label, variables, value = substitute_geometry_with_wedge_floor(
            current, n, tail + THRESHOLD, branch
        )
        print("BRANCH_START", label, flush=True)
        branches.append({
            "geometry": label,
            "summary": bernstein_summary(value, variables, tail),
        })

    negative_count = sum(
        row["summary"]["negative_tail_scalar_coefficients"] for row in branches
    )
    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "parent_containment_elimination": parent_rows,
        "category_elimination": category_rows,
        "residual": str(sp.factor(current)),
        "branches": branches,
        "negative_tail_coefficients": negative_count,
        "containment_fact": (
            "PFk is exactly the subfamily of F-category independent k-sets "
            "that contain the ordinary deleted parent p, so 0<=PFk<=Fk."
        ),
        "forced_parent_sign_facts": {
            "PW3": (
                "Its coefficient is at least 2*W2-2*n >= "
                "(n-3)*(n-4)-2*n, nonnegative for n>=8."
            ),
            "PW4": (
                "Its coefficient is at least n^2-21*n+18, nonnegative "
                "for n>=21; this shortcut is used only when THRESHOLD>=21."
            ),
        },
        "status": "diagnostic containment cone; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold": THRESHOLD,
        "negative_tail_coefficients": negative_count,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
