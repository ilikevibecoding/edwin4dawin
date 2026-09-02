#!/usr/bin/env python3
"""Exact reconnaissance cone for large-order rank-seven G1, no-parent mode.

The high marked rows are eliminated by rigorous induced-forest intervals.
W4 and W5 are retained together and parameterized over safe edge-incidence
intervals, while W3 uses the exact edge/wedge identity and forest wedge box.
This is diagnostic only: no theorem is asserted unless every relaxation is
later audited and a fail-closed producer is frozen.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_no_parent_coarse_interval_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_COARSE_INTERVAL_RANK7_G4_PIECEWISE"
THRESHOLD = 11


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    base.THRESHOLD = THRESHOLD
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G1_PARENT_MODES_RANK7_G4_PIECEWISE"
    )
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 9):
            symbols[f"{family}{rank}"] = sp.Symbol(
                f"{family}{rank}", nonnegative=True
            )
    n = symbols["n"]
    tail = sp.Symbol("t", nonnegative=True)
    m = n-2
    edge = choose(m, 2)-symbols["W2"]

    def category_lower(h, k):
        return choose(h, k)-edge*choose(h, k-2)

    def category_upper(h, k):
        retained = edge-m*(m-h)
        extension = k*choose(h, k)/(m*(m-1))
        return choose(h, k)-retained*extension

    intervals = {}
    for rank in range(4, 9):
        internal = rank-1
        intervals[f"A{rank}"] = (
            category_lower(symbols["A2"], internal),
            category_upper(symbols["A2"], internal),
        )
        intervals[f"B{rank}"] = (
            category_lower(symbols["B2"], internal),
            category_upper(symbols["B2"], internal),
        )
    for rank in range(5, 9):
        internal = rank-2
        intervals[f"Z{rank}"] = (
            symbols["Z2"]*category_lower(symbols["Z3"], internal),
            symbols["Z2"]*category_upper(symbols["Z3"], internal),
        )
    for rank in range(6, 9):
        incidence = edge*choose(m-2, rank-2)
        intervals[f"W{rank}"] = (
            choose(m, rank)-incidence,
            choose(m, rank)-incidence/(rank-1),
        )

    current = sp.expand(sp.sympify(
        source["modes"]["no_parent"]["expression"], locals=symbols
    ))
    elimination = []
    for rank in range(8, 3, -1):
        labels = [f"A{rank}", f"B{rank}"]
        if rank >= 6:
            labels.append(f"W{rank}")
        if rank >= 5:
            labels.append(f"Z{rank}")
        for label in labels:
            current, row = base.eliminate_linear(
                current, symbols[label], *intervals[label], n, tail
            )
            elimination.append(row)
    expected = {
        n, symbols["A2"], symbols["B2"], symbols["W2"], symbols["W3"],
        symbols["W4"], symbols["W5"], symbols["Z2"], symbols["Z3"],
    }
    assert current.free_symbols <= expected, sorted(map(str, current.free_symbols-expected))

    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    p4, p5 = sp.symbols("p4 p5", nonnegative=True)
    nval = tail+THRESHOLD
    mval = nval-2
    rows = []
    for label, variables0, x, y, e, z2, z3 in marked_geometry_branches(
        mval, a, b, c, d
    ):
        omega_lower = sp.cancel(2*e**2/mval-e)
        omega_upper = e**2/2
        omega = sp.cancel(omega_lower+d*(omega_upper-omega_lower))
        incidence4 = e*choose(mval-2, 2)
        incidence5 = e*choose(mval-2, 3)
        w4_lower = choose(mval, 4)-incidence4
        w4_upper = choose(mval, 4)-incidence4/3
        w5_lower = choose(mval, 5)-incidence5
        w5_upper = choose(mval, 5)-incidence5/4
        replacements = {
            n: nval,
            symbols["A2"]: mval-x,
            symbols["B2"]: mval-y,
            symbols["W2"]: choose(mval, 2)-e,
            symbols["W3"]: choose(mval, 3)-e*(mval-2)+omega,
            symbols["W4"]: w4_lower+p4*(w4_upper-w4_lower),
            symbols["W5"]: w5_lower+p5*(w5_upper-w5_lower),
            symbols["Z2"]: z2,
            symbols["Z3"]: z3,
        }
        value = sp.cancel(current.subs(replacements, simultaneous=True))
        variables = tuple(v for v in (*variables0, p4, p5) if v in value.free_symbols)
        print("BRANCH_START", label, variables, flush=True)
        rows.append({
            "geometry": label,
            "summary": fast_summary(value, variables, tail),
        })

    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "mode": "no_parent",
        "rows": rows,
        "elimination": elimination,
        "negative_tail_scalar_coefficients": sum(
            row["summary"]["negative_tail_scalar_coefficients"] for row in rows
        ),
        "interval_facts": {
            "high_rows": (
                "A/B/Z and W6-W8 use exact edge-incidence lower/upper bounds."
            ),
            "W4_W5": (
                "Each is kept as an independent safe edge-incidence interval; "
                "this deliberately enlarges the true coupled forest region."
            ),
            "W3": (
                "W3=C(m,3)-e(m-2)+Omega with "
                "2e^2/m-e<=Omega<=e^2/2."
            ),
        },
        "status": "diagnostic exact relaxation; no theorem asserted",
        "scope": "Rank-seven G1 no-parent mode, n>=11 relaxation only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_counts": {
            row["geometry"]: row["summary"]["negative_tail_scalar_coefficients"]
            for row in rows
        },
        "minima": {
            row["geometry"]: row["summary"]["minimum_tail_scalar_coefficient"]
            for row in rows
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
