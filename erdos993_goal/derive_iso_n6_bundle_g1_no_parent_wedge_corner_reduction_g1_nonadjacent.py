#!/usr/bin/env python3
"""Exact endpoint reduction for the rank-six no-parent g1 wedge cone.

For N>=19, the occupation functional is multilinear in the induced forest
rows B,C,D.  The rank-four B/C derivatives and rank-four D derivative have
uniform positive lower bounds.  Ranks five and six have the displayed
negative derivatives.  Thus only ranks two and three of B,C and rank two of
D require both PATH/EDGELESS endpoints (32 corners total).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_no_parent_occupation_exact_g1_nonadjacent_20260831.json"
INPUT_SHA256 = "5153BD29BE22ABC6C1FE693A8C32E7988BF07AC54844707447C32332E1C4AE9A"
OUTPUT = HERE / "iso_n6_bundle_g1_no_parent_wedge_corner_reduction_exact_g1_nonadjacent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_NO_PARENT_WEDGE_32_CORNER_REDUCTION_G1_NONADJACENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(value, rank):
    out = sp.Integer(1)
    for offset in range(rank):
        out *= value - offset
    return sp.expand(out / sp.factorial(rank))


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G1_NO_PARENT_OCCUPATION_G1_NONADJACENT"
    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    d = sp.symbols("d0:6", nonnegative=True)
    locals_ = {str(value): value for value in (*a, *b, *c, *d)}
    expression = sp.expand(sum(
        sp.sympify(source["pieces"][label], locals=locals_)
        for label in ("AA", "AB", "AC", "BC", "AD")
    ))
    variables = (*b[2:7], *c[2:7], *d[2:6])
    derivatives = {
        str(variable): sp.factor(sp.diff(expression, variable))
        for variable in variables if variable in expression.free_symbols
    }
    expected = {
        "b2": 4*a[3]-16*a[5]-7*a[6]+4*c[2]+2*c[3]-15*c[4]-7*c[5],
        "b3": 4*a[2]+8*a[3]+12*a[4]-2*a[5]+2*c[2]+26*c[3]+5*c[4],
        "b4": 12*a[3]+10*a[4]-15*c[2]+5*c[3],
        "b5": -16*a[2]-2*a[3]-7*c[2],
        "b6": -7*a[2],
        "c2": 4*a[3]-16*a[5]-7*a[6]+4*b[2]+2*b[3]-15*b[4]-7*b[5],
        "c3": 4*a[2]+8*a[3]+12*a[4]-2*a[5]+2*b[2]+26*b[3]+5*b[4],
        "c4": 12*a[3]+10*a[4]-15*b[2]+5*b[3],
        "c5": -16*a[2]-2*a[3]-7*b[2],
        "c6": -7*a[2],
        "d2": 4*a[2]+2*a[3]-15*a[4]-7*a[5],
        "d3": 2*a[2]+26*a[3]+5*a[4],
        "d4": 5*(a[3]-3*a[2]),
        "d5": -7*a[2],
    }
    assert set(derivatives) == set(expected)
    assert all(sp.expand(derivatives[label] - value) == 0 for label, value in expected.items())

    n = sp.symbols("N", nonnegative=True)
    path3 = choose_polynomial(n - 2, 3)
    edge2 = choose_polynomial(n, 2)
    b4_lower = sp.factor(12*path3 - 15*edge2)
    d4_lower = sp.factor(5*(path3 - 3*edge2))
    assert sp.factor(b4_lower - (4*n**3-51*n**2+119*n-96)/2) == 0
    assert sp.factor(d4_lower - 5*(n**3-18*n**2+35*n-24)/6) == 0
    assert b4_lower.subs(n, 19) > 0 and d4_lower.subs(n, 19) > 0
    assert sp.diff(b4_lower, n).subs(n, 19) > 0
    assert sp.diff(d4_lower, n).subs(n, 19) > 0
    assert sp.diff(b4_lower, n, 2).subs(n, 19) > 0
    assert sp.diff(d4_lower, n, 2).subs(n, 19) > 0

    # The coefficientwise path floor I_r(P_m)=C(m-r+1,r) obeys the
    # leaf recurrence exactly.  This is the induction identity proving it
    # is the minimum among forests of order m (pad a smaller second child
    # by isolates before invoking induction).
    m = sp.symbols("m", integer=True, nonnegative=True)
    pascal = {}
    for rank in range(2, 7):
        residual = sp.expand(
            choose_polynomial(m-rank, rank)
            + choose_polynomial(m-rank, rank-1)
            - choose_polynomial(m-rank+1, rank)
        )
        assert residual == 0
        pascal[str(rank)] = "0"

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "no_parent_k0",
        "scope": "adjacent and nonadjacent no-parent occupation modes, common-row order N>=19",
        "derivatives": {label: str(value) for label, value in derivatives.items()},
        "forced_endpoints": {
            "B4_C4": "PATH because derivative is at least the displayed positive B4 lower bound",
            "B5_C5_B6_C6": "EDGELESS because derivatives are nonpositive",
            "D3_D4": "PATH because derivatives are positive",
            "D5": "EDGELESS because derivative is nonpositive",
            "B2_B3_C2_C3_D2": "both PATH and EDGELESS endpoints remain",
        },
        "positive_lower_bounds": {
            "B4_C4": str(b4_lower),
            "D4": str(d4_lower),
            "value_at_N19": {
                "B4_C4": str(b4_lower.subs(n, 19)),
                "D4": str(d4_lower.subs(n, 19)),
            },
            "monotonicity": "first and second derivatives are positive at N=19 and second derivatives increase thereafter",
        },
        "path_minimal_pascal_residuals": pascal,
        "corner_bits": ["B2", "B3", "C2", "C3", "D2"],
        "corner_count_nonadjacent": 32,
        "corner_count_adjacent": 16,
        "input_sha256": INPUT_SHA256,
        "status": "exact endpoint reduction; corner positivity remains open",
        "scope_guard": (
            "No corner sign is asserted here.  This does not prove no-parent g1, other modes, N6, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "corner_count_nonadjacent": 32,
        "positive_lower_bounds": report["positive_lower_bounds"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
