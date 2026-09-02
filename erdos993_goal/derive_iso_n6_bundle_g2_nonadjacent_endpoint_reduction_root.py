#!/usr/bin/env python3
"""Exact algebraic endpoint reduction for nonadjacent rank-six g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_endpoint_reduction_exact_root_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_REDUCTION_ROOT"
OCCUPATION = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OCCUPATION_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"
BC_REDUCTION = HERE / "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
BC_REDUCTION_SHA256 = "E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bilinear(left, right, terms):
    return sp.expand(sum(scalar * left[i] * right[j] for scalar, i, j in terms))


def main() -> None:
    assert sha256(OCCUPATION) == OCCUPATION_SHA256
    assert sha256(BC_REDUCTION) == BC_REDUCTION_SHA256
    occupation = json.loads(OCCUPATION.read_text(encoding="utf-8"))
    bc_report = json.loads(BC_REDUCTION.read_text(encoding="utf-8"))
    assert occupation["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"
    assert bc_report["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_FOUR_CORNER_REDUCTION_ROOT"
    )

    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    d = sp.symbols("d0:7", integer=True, nonnegative=True)
    adjacent = sp.expand(
        bilinear(a, a, A2_TERMS)
        + bilinear(a, b, L2_TERMS)
        + bilinear(a, c, L2_TERMS)
        + bilinear(b, c, K2_TERMS)
    )
    k_ad = bilinear(a, d, K2_TERMS)
    nonadjacent = sp.expand(adjacent + k_ad)

    local_symbols = {str(symbol): symbol for symbol in (*a, *b, *c, *d)}
    occupation_k = sp.sympify(occupation["pieces"]["K2_BC"], locals=local_symbols)
    occupation_j = sp.sympify(occupation["pieces"]["J2_AD"], locals=local_symbols)
    assert sp.expand(occupation_k - bilinear(b, c, K2_TERMS)) == 0
    assert sp.expand(occupation_j - k_ad) == 0
    assert sp.expand(occupation_k.xreplace({**dict(zip(b, a)), **dict(zip(c, d))}) - occupation_j) == 0

    d_derivatives = {
        f"d{rank}": sp.expand(sp.diff(nonadjacent, d[rank])) for rank in range(2, 7)
    }
    expected_d = {
        "d2": 4*a[1] + 6*a[2] + 11*a[3] - 2*a[4],
        "d3": a[1] + 11*a[2] + 10*a[3],
        "d4": -15*a[1] - 2*a[2],
        "d5": -7*a[1],
        "d6": sp.Integer(0),
    }
    for key in expected_d:
        assert sp.expand(d_derivatives[key] - expected_d[key]) == 0

    # The nonadjacent correction has no B or C variable, hence every frozen
    # B,C derivative and its N>=14 sign proof transfer verbatim.
    for variable in (*b[2:7], *c[2:7]):
        assert sp.expand(sp.diff(nonadjacent, variable) - sp.diff(adjacent, variable)) == 0
    assert bc_report["corner_count"] == 4
    assert bc_report["corners"] == [
        "B2_PATH_C2_PATH",
        "B2_PATH_C2_EDGELESS",
        "B2_EDGELESS_C2_PATH",
        "B2_EDGELESS_C2_EDGELESS",
    ]

    report = {
        "marker": MARKER,
        "status": "exact algebraic endpoint reduction; positivity supplied by separate shards",
        "occupation_identity": (
            "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D)"
        ),
        "J2_equals_K2_after_row_renaming": True,
        "D_derivatives": {key: str(value) for key, value in d_derivatives.items()},
        "D_endpoint_reduction": {
            "d2": (
                "derivative 4*a1+6*a2+11*a3-2*a4 can change sign; because the "
                "functional is affine, check both universal endpoints 0 and C(d,2)"
            ),
            "d3": (
                "derivative a1+11*a2+10*a3 is nonnegative; use universal lower floor 0"
            ),
            "d4": "derivative -15*a1-2*a2 is nonpositive; use edgeless ceiling C(d,4)",
            "d5": "derivative -7*a1 is nonpositive; use edgeless ceiling C(d,5)",
            "d6": "absent from K2(A,D)",
            "D0_D1": "exactly 1,d",
        },
        "B_C_transfer": {
            "correction_independent_of_B_C": True,
            "N_ge_14_corner_count": 4,
            "corners": bc_report["corners"],
            "argument": (
                "Adding K2(A,D) changes no derivative in b2..b6,c2..c6, so the "
                "frozen adjacent N>=14 four-corner reduction transfers exactly."
            ),
        },
        "geometry_partition": {
            "common0": "d=mB+mC-N; disconnected has e(A)<=d and connected-long has e(A)<=d+1",
            "common1": "d=mB+mC-N+1 and e(A)<=d",
            "exhaustive": (
                "Two nonadjacent vertices in a forest have zero or one common neighbor; "
                "two common neighbors would create a cycle."
            ),
            "component_count_proof": (
                "Put Su=N(u) intersect A and Sv=N(v) intersect A. A component of A "
                "contains at most one Su vertex and at most one Sv vertex, otherwise "
                "the path inside that component together with u or v makes a cycle. "
                "When h=0, at most one A component is mixed (contains one from each); "
                "two mixed components make a cycle through u and v. Thus the N-d "
                "vertices of Su union Sv occupy at least N-d-1 components, giving "
                "e(A)=N-c(A)<=d+1. If u,v are disconnected, no component is mixed, "
                "so e(A)<=d. When h=1, the common-neighbor component plus any other "
                "mixed component would make a cycle, and its own component cannot "
                "contain another marked neighbor; hence all N-d union vertices occupy "
                "distinct components and e(A)<=d."
            ),
        },
        "dependencies_sha256": {
            OCCUPATION.name: OCCUPATION_SHA256,
            BC_REDUCTION.name: BC_REDUCTION_SHA256,
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "J2_equals_K2_after_row_renaming": True,
        "D_derivatives": report["D_derivatives"],
        "B_C_transfer": report["B_C_transfer"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
