#!/usr/bin/env python3
"""Exact four-corner reduction for the adjacent rank-six g2 wedge cone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
INPUT_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_FOUR_CORNER_REDUCTION_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(value, rank):
    out = sp.Integer(1)
    for offset in range(rank):
        out *= value-offset
    return sp.expand(out/sp.factorial(rank))


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    locals_ = {str(x): x for x in (*a, *b, *c)}
    expression = sp.expand(sum(
        sp.sympify(source["pieces"][label], locals=locals_)
        for label in ("A2", "L2_AB", "L2_AC", "K2_BC")
    ))
    derivatives = {str(variable): sp.factor(sp.diff(expression, variable))
                   for variable in (b[2], b[3], b[4], b[5], b[6],
                                    c[2], c[3], c[4], c[5], c[6])}
    expected = {
        "b2": 8*a[2]+9*a[3]-4*a[4]-9*a[5]+4*c[1]+6*c[2]+11*c[3]-2*c[4],
        "b3": 4*a[1]+9*a[2]+24*a[3]+8*a[4]+c[1]+11*c[2]+10*c[3],
        "b4": -a[1]-4*a[2]+8*a[3]-15*c[1]-2*c[2],
        "b5": -16*a[1]-9*a[2]-7*c[1],
        "b6": -7*a[1],
        "c2": 8*a[2]+9*a[3]-4*a[4]-9*a[5]+4*b[1]+6*b[2]+11*b[3]-2*b[4],
        "c3": 4*a[1]+9*a[2]+24*a[3]+8*a[4]+b[1]+11*b[2]+10*b[3],
        "c4": -a[1]-4*a[2]+8*a[3]-15*b[1]-2*b[2],
        "c5": -16*a[1]-9*a[2]-7*b[1],
        "c6": -7*a[1],
    }
    assert all(sp.expand(derivatives[name]-value) == 0
               for name, value in expected.items())

    # The only non-immediate derivative is rank four.  Substitute the exact
    # forest edge/wedge identity for A, then make every adverse relaxation:
    # Omega>=0, c1<=N, c2<=C(N,2), and e<=N.
    n, e, omega = sp.symbols("N e Omega", nonnegative=True)
    a2 = choose_polynomial(n, 2)-e
    a3 = choose_polynomial(n, 3)-e*(n-2)+omega
    b4_exact = sp.expand(derivatives["b4"].subs({
        a[1]: n, a[2]: a2, a[3]: a3,
    }))
    adverse = sp.expand(b4_exact.subs({c[1]: n, c[2]: choose_polynomial(n, 2), omega: 0}))
    adverse_at_e_n = sp.factor(adverse.subs(e, n))
    assert sp.factor(adverse_at_e_n - n*(4*n**2-45*n+29)/3) == 0
    assert sp.expand(sp.diff(adverse, e) - (20-8*n)) == 0
    assert (4*14**2-45*14+29) == 183

    # Pascal identities used in the standard leaf-deletion induction proving
    # I_k(F)>=I_k(P_m)=C(m-k+1,k), here for the two required ranks.
    m = sp.symbols("m", integer=True, nonnegative=True)
    pascal = {}
    for rank in (3, 4):
        residual = sp.expand(
            choose_polynomial((m-1)-rank+1, rank)
            + choose_polynomial((m-2)-(rank-1)+1, rank-1)
            - choose_polynomial(m-rank+1, rank)
        )
        assert residual == 0
        pascal[str(rank)] = str(residual)

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": "adjacent no-parent mode, N>=14; exact reduction only",
        "derivatives": {name: str(value) for name, value in derivatives.items()},
        "forced_endpoints": {
            "b3_c3": "PATH because their derivatives are sums of nonnegative terms",
            "b4_c4": "PATH because derivative >= N*(4*N^2-45*N+29)/3 > 0 for N>=14",
            "b5_c5": "EDGELESS because derivatives are nonpositive",
            "b6_c6": "EDGELESS because derivatives are nonpositive",
            "b2_c2": "both PATH/EDGELESS endpoints remain",
        },
        "rank4_derivative_lower_bound": str(adverse_at_e_n),
        "rank4_bound_checks": {
            "edge_derivative": str(sp.factor(sp.diff(adverse, e))),
            "quadratic_at_N14": 183,
            "quadratic_increasing_for_N>=14": "derivative 8*N-45 > 0",
        },
        "path_minimal_pascal_residuals": pascal,
        "corner_count": 4,
        "corners": ["B2_PATH_C2_PATH", "B2_PATH_C2_EDGELESS",
                    "B2_EDGELESS_C2_PATH", "B2_EDGELESS_C2_EDGELESS"],
        "input_sha256": INPUT_SHA256,
        "status": "exact four-corner reduction; corner positivity remains open",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
