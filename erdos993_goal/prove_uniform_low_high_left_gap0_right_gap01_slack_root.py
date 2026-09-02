#!/usr/bin/env python3
"""Assemble the all-rank left-gap0 over simultaneous right-gap01 theorem."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap0_right_gap01_slack_exact_root_20260827.json"
DEPENDENCIES = {
    "prove_uniform_low_high_left_gap0_right_gap01_payments_root.py":
        "8F9FC8E73461BDC4C2C1EC28C47B4309A36AB508760E3185283053B56EA28602",
    "uniform_low_high_left_gap0_right_gap01_payments_root_20260827.json":
        "587F99CD8025DC6433A5D87C2C975CBE04A6FECEB2075321B84413F0928159F7",
    "prove_uniform_low_high_right_gap01_slack_root.py":
        "57BDA0D6A2A1D4C713D66EEBA1EEF5706AB433B115D08DD8E5484B227B930BEC",
    "uniform_low_high_right_gap01_slack_exact_root_20260827.json":
        "F5864694119A2BE825AA25E5F54ACCB94C09BC6F263622A22FA7A50948F38723",
    "audit_uniform_low_high_right_gap01_slack_independent_root.py":
        "867ECBB8F3207EB64ACEFAB37B7426787F7AB71B0E2BDF10664B0342B160C408",
    "uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json":
        "1143E497957696A02299E1DD7C2EA5B4355173D28DC48D0FA0B8968A2776F11D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def quadratic(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def bilinear(first, second):
    return sp.expand(
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def coefficient_row(rank: int, terminal: int, gap0: int = 0, gap1: int = 0):
    ratios = [
        terminal + rank + 1 + gap0 + gap1,
        terminal + rank - 1 + gap1,
    ]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree: int) -> int:
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def direct_strong(rank: int, x: int, y: int, left_gap0: int,
                  right_gap0: int, right_gap1: int) -> int:
    left_ratios, left = coefficient_row(rank, x, gap0=left_gap0)
    _, right = coefficient_row(rank, y, gap0=right_gap0, gap1=right_gap1)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [
        convolution(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    tail = [
        convolution(left_tail, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    return int(
        left_ratios[2] * (
            whole[1] ** 2 - whole[0] * whole[2] - whole[0] * whole[1]
        )
        + 2 * whole[1] * tail[1]
        - whole[0] * tail[2] - whole[2] * tail[0]
        - whole[0] * tail[1] - whole[1] * tail[0]
    )


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual

    payments = json.loads(
        (HERE / "uniform_low_high_left_gap0_right_gap01_payments_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    base = json.loads(
        (HERE / "uniform_low_high_right_gap01_slack_exact_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    base_audit = json.loads(
        (HERE / "uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert payments["status"] == "PASS_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_PAYMENTS"
    assert len(payments["coefficient_certificates"]) == 10
    assert base["status"] == "PASS_EXACT_ALL_RANK_SIMULTANEOUS_RIGHT_GAP01_STRONG_BOUNDARY"
    assert base_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_SIMULTANEOUS_RIGHT_GAP01_AUDIT"

    # Universal normalized left-top lift.  The right-only row A has Q(A)=0.
    symbols = sp.symbols("c0:3 d0:3 v0:3")
    c, d, v = symbols[:3], symbols[3:6], symbols[6:9]
    p, cap, scale, ratio = sp.symbols("p cap scale ratio")
    a = (scale, scale * ratio, scale * ratio * (ratio - 1))
    assert quadratic(a) == 0
    substitutions = {d[index]: c[index] - a[index] for index in range(3)}
    cp = tuple(c[index] + p * d[index] for index in range(3))
    vp = tuple((1 + p) * v[index] for index in range(3))
    h = cap * quadratic(cp) + bilinear(cp, vp)
    h0 = cap * quadratic(c) + bilinear(c, v)
    payment = cap * quadratic(d) + bilinear(d, v)
    assert sp.expand(
        (h - ((1 + p) * h0 + p * (1 + p) * payment)).subs(substitutions)
    ) == 0

    checks = []
    for rank, x, y, left_gap0, right_gap0, right_gap1 in (
        (8, 0, 0, 1, 1, 1),
        (8, 3, 11, 17, 29, 43),
        (11, 1, 100, 7, 43, 19),
        (15, 29, 2, 100, 5, 71),
        (23, 7, 31, 3, 71, 113),
    ):
        value = direct_strong(
            rank, x, y, left_gap0, right_gap0, right_gap1
        )
        assert value > 0
        checks.append({
            "rank": rank,
            "x": x,
            "y": y,
            "left_gap0_slack": left_gap0,
            "right_gap0_slack": right_gap0,
            "right_gap1_slack": right_gap1,
            "strong_auxiliary": str(value),
        })

    payload = {
        "schema": "uniform-low-high-left-gap0-right-gap01-slack-root-v1",
        "status": "PASS_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_STRONG_BOUNDARY",
        "theorem": (
            "For every integer k>=8 and real x,y,a,s,t>=0, with left ratios "
            "(x+k+1+a,x+k-1,x+k-2,...,x) and right ratios "
            "(y+k+1+s+t,y+k-1+s,y+k-2,...,y), the complete strong "
            "auxiliary (x+k-2)M(c)+B(c,v) is strictly positive."
        ),
        "proof_assembly": {
            "left_normalization": "p=a/(x+k+1)>=0",
            "left_lift_identity": "H(p)=(1+p)H0+p(1+p)K",
            "null_row_reason": "the removed right-only factorial row A satisfies Q(A)=0",
            "base_sign": "H0>0 by the independently audited simultaneous right-gap01 theorem",
            "right_top_normalization": "q=t/(y+k+1+s)>=0",
            "payment_identity": "K(q,s)=(1+q)K0(s)+q(1+q)K2(s)",
            "payment_sign": (
                "K0(s)>0 and K2(s)>0 by ten exact sparse coefficient "
                "certificates split into x>=y and y>=x charts"
            ),
        },
        "direct_exact_checks": checks,
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes three simultaneous gap coordinates on the translated "
            "low/high boundary. Other coordinates and the full Erdos conjecture "
            "remain separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
