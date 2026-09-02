#!/usr/bin/env python3
"""Exact four-corner reduction for adjacent endpoint-parent rank-six g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_occupation_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "E3085D7739627E4BAB837208DFF2E8DBCA1A97ACB5073538398F2E3BE17377CD"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_four_corner_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_FOUR_CORNER_RANK7_G5_FINISH"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(value, rank):
    result = sp.Integer(1)
    for offset in range(rank):
        result *= value - offset
    return sp.expand(result / sp.factorial(rank))


def main():
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_OCCUPATION_RANK7_G5_FINISH"
    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    locals_ = {str(x): x for x in (*a, *b, *c)}
    expression = sp.expand(sum(
        sp.sympify(source["pieces"][label], locals=locals_)
        for label in ("A2", "L2_AB", "M2_AC", "R2_BC")
    ))
    derivatives = {
        str(variable): sp.factor(sp.diff(expression, variable))
        for variable in (b[2], b[3], b[4], b[5], b[6],
                         c[2], c[3], c[4], c[5], c[6])
    }
    expected = {
        "b2": 8*a[2]+9*a[3]-4*a[4]-9*a[5]+4*c[1]+6*c[2]-c[3]-2*c[4],
        "b3": 4*a[1]+9*a[2]+24*a[3]+8*a[4]+c[1]+18*c[2]+10*c[3],
        "b4": -a[1]-4*a[2]+8*a[3]-15*c[1]-2*c[2],
        "b5": -16*a[1]-9*a[2]-7*c[1],
        "b6": -7*a[1],
        "c2": 6*a[2]+10*a[3]+3*a[4]-9*a[5]+2*b[1]+6*b[2]+18*b[3]-2*b[4],
        "c3": 2*a[1]+7*a[2]+19*a[3]+8*a[4]+b[1]-b[2]+10*b[3],
        "c4": -9*a[2]+8*a[3]-8*b[1]-2*b[2],
        "c5": -9*a[1]-9*a[2]-7*b[1],
        "c6": -7*a[1],
    }
    assert all(sp.expand(derivatives[label] - value) == 0 for label, value in expected.items())

    n, e, omega = sp.symbols("N e Omega", nonnegative=True)
    a2_exact = choose_polynomial(n, 2) - e
    a3_exact = choose_polynomial(n, 3) - e*(n-2) + omega
    b4_exact = sp.expand(derivatives["b4"].subs({a[1]: n, a[2]: a2_exact, a[3]: a3_exact}))
    b4_adverse = sp.expand(b4_exact.subs({c[1]: n, c[2]: choose_polynomial(n, 2), omega: 0}))
    b4_floor = sp.factor(b4_adverse.subs(e, n))
    assert sp.factor(b4_floor - n*(4*n**2-45*n+29)/3) == 0
    assert sp.expand(sp.diff(b4_adverse, e) - (20-8*n)) == 0
    assert (4*14**2-45*14+29) == 183

    path3 = choose_polynomial(n-2, 3)
    c3_floor = sp.factor(sp.expand(2*n + 19*path3 - choose_polynomial(n, 2)))
    c4_floor = sp.factor(sp.expand(8*path3 - 11*choose_polynomial(n, 2) - 8*n))
    assert c3_floor.subs(n, 14) == 4117
    assert c4_floor.subs(n, 14) == 647
    c3_derivative = sp.factor(sp.diff(c3_floor, n))
    c4_derivative = sp.factor(sp.diff(c4_floor, n))
    assert c3_derivative.subs(n, 14) > 0 and sp.diff(c3_derivative, n).subs(n, 14) > 0
    assert c4_derivative.subs(n, 14) > 0 and sp.diff(c4_derivative, n).subs(n, 14) > 0

    m = sp.symbols("m", integer=True, nonnegative=True)
    pascal = {}
    for rank in (3, 4):
        residual = sp.expand(
            choose_polynomial((m-1)-rank+1, rank)
            + choose_polynomial((m-2)-(rank-1)+1, rank-1)
            - choose_polynomial(m-rank+1, rank)
        )
        assert residual == 0
        pascal[str(rank)] = "0"

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": "adjacent endpoint-parent mode, common order N>=14; exact reduction only",
        "derivatives": {label: str(value) for label, value in derivatives.items()},
        "forced_endpoints": {
            "b3": "PATH; derivative is a sum of nonnegative terms",
            "b4": "PATH; derivative >= N*(4*N^2-45*N+29)/3 > 0",
            "b5_b6": "EDGELESS; derivatives are nonpositive",
            "c3": "PATH; derivative >= (19*N^3-174*N^2+509*N-456)/6 > 0",
            "c4": "PATH; derivative >= (8*N^3-105*N^2+193*N-192)/6 > 0",
            "c5_c6": "EDGELESS; derivatives are nonpositive",
            "b2_c2": "both PATH/EDGELESS endpoints remain",
        },
        "lower_bounds": {
            "b4": str(b4_floor),
            "c3": str(c3_floor),
            "c4": str(c4_floor),
            "values_at_N14": {"b4_quadratic": 183, "c3": 4117, "c4": 647},
            "derivatives": {"c3": str(c3_derivative), "c4": str(c4_derivative)},
        },
        "forest_bounds_used": [
            "i_k(P_m)=C(m-k+1,k)<=i_k(F)<=C(m,k)",
            "e(A)<=N and Omega(A)>=0",
            "mB,mC<=N",
        ],
        "path_minimal_pascal_residuals": pascal,
        "corner_count": 4,
        "input_sha256": INPUT_SHA256,
        "status": "exact four-corner reduction; corner positivity remains open",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "corner_count": 4, "lower_bounds": report["lower_bounds"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
