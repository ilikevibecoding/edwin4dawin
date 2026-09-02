#!/usr/bin/env python3
"""Independent all-order adverse-y-slope theorem for forest m=1,j=3.

This proves that both retained exact-U1 branches are nonincreasing in y on
the N>=31 structural domain.  It does not prove the endpoint branch cover.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sy


BASE = Path(__file__).resolve().parent
OUTPUT = BASE / "terminal_q3_m1_forest_j3_y_slope_independent_20260829.json"
PINS = {
    "audit_terminal_q3_anchor_ordering_independent_agent.py":
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C",
    "terminal_q3_anchor_ordering_independent_audit_20260828.json":
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    answer = sy.Integer(1)
    for offset in range(rank):
        answer *= value - offset
    return sy.cancel(answer / sy.factorial(rank))


def main():
    observed = {name: digest(BASE / name) for name in PINS}
    assert observed == PINS
    anchor = json.loads(
        (BASE / "terminal_q3_anchor_ordering_independent_audit_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert anchor["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"
    )

    N, h, d, R, W = sy.symbols("N h d R W", nonnegative=True)
    m = N - h
    p0 = sy.expand(
        choose(N + 1, 3) - m * (N - 1) + W
        + choose(N + 1, 2) - m
    )
    p1 = sy.expand(choose(N + 1, 2) - m + N + 1)
    R1 = sy.expand(m * N - 2 * W)
    a = sy.expand(choose(N, 2) - (m - d))
    z2 = sy.expand(
        (m - d) * (N - 2) - 2 * (W - choose(d, 2) - R)
    )
    S = N - d
    h2 = sy.expand(choose(S, 2) - (m - d - R))
    c0 = sy.expand(a + z2 + h2)
    A1 = sy.expand(p0 * a + p1 * c0 + p1 * a - a * R1)

    # The q-envelope remainder has y derivative
    # -3*p1*(2*p0+a+p1).  The two U0 slopes are respectively
    # (N+3)/(2(N-3)) and 1.
    adverse_base = sy.expand(3 * p1 * (2 * p0 + a + p1))
    coupled_slope = sy.cancel(
        2 * A1 * (N + 3) / (N - 3) - adverse_base
    )
    tangent_slope = sy.expand(4 * A1 - adverse_base)
    slope_difference = sy.factor(tangent_slope - coupled_slope)
    assert sy.factor(
        slope_difference - 2 * A1 * (N - 9) / (N - 3)
    ) == 0

    # It is enough to prove the larger tangent slope is nonpositive.
    G = sy.expand(-tangent_slope)
    W_slope = sy.factor(sy.diff(G, W))
    assert sy.factor(W_slope - (14 * p1 - 12 * a)) == 0
    assert sy.factor(
        W_slope - (N**2 + 25 * N - 12 * d + 2 * h + 14)
    ) == 0

    # A forest root has W>=A=C(d,2)+R.  Parameterize the full structural
    # cone by h=1+H,d=1+D,N=2h+d+R+L.  This also proves W_slope>0.
    H, D, L = sy.symbols("H D L", nonnegative=True)
    structural = {
        h: 1 + H,
        d: 1 + D,
        N: 2 * (1 + H) + (1 + D) + R + L,
    }
    W_slope_cone = sy.Poly(
        sy.expand(W_slope.subs(structural, simultaneous=True)), H, D, R, L
    )
    assert W_slope_cone.coeffs() and all(value > 0 for value in W_slope_cone.coeffs())
    endpoint = sy.expand(
        G.subs(W, choose(d, 2) + R).subs(structural, simultaneous=True)
    )
    endpoint_poly = sy.Poly(endpoint, H, D, R, L)
    coefficients = sorted(endpoint_poly.terms())
    assert len(coefficients) == 126
    assert all(value > 0 for _powers, value in coefficients)
    assert min(value for _powers, value in coefficients) == sy.Rational(1, 6)
    stream = hashlib.sha256()
    for powers, value in coefficients:
        stream.update(f"{powers}|{value}\n".encode("ascii"))

    report = {
        "schema": "terminal-q3-m1-forest-j3-y-slope-independent-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_BOTH_Y_SLOPES_NONPOSITIVE",
        "claim": (
            "On every supported N>=31 forest-base target-j=3 structural cell, "
            "both exact-U1 retained lower branches are nonincreasing in y."
        ),
        "scope_exclusions": [
            "the y=cap endpoint branch cover",
            "Newton degree m=0",
            "the full terminal payment",
            "unimodality",
            "Erdos Problem 993",
        ],
        "exact_slope_difference": str(slope_difference),
        "tangent_adverse_W_slope": str(W_slope),
        "structural_parameterization": "h=1+H,d=1+D,N=2h+d+R+L,W>=C(d,2)+R",
        "endpoint_power_coefficients": len(coefficients),
        "endpoint_degrees": list(endpoint_poly.degree_list()),
        "endpoint_minimum_coefficient": str(min(value for _powers, value in coefficients)),
        "endpoint_stream_sha256": stream.hexdigest().upper(),
        "pins": observed,
        "source": Path(__file__).name,
        "source_sha256": digest(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
