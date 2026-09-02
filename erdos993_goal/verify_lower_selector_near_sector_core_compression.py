#!/usr/bin/env python3
"""Exact replay for the near-sector safe-core compression reduction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_core_compression_exact_20260813.json"


def symbolic_compression() -> dict[str, object]:
    B, r, z, d, S, P = sp.symbols("B r z d S P")
    Mr, Mm = sp.symbols("Mr Mm")

    def next_meixner(k: sp.Expr, current: sp.Expr, previous: sp.Expr) -> sp.Expr:
        return sp.cancel(
            (4 * (z - k) - d * (B + 2 * k)) * current / (B + k)
            - d * (d + 4) * k * previous / (B + k)
        )

    M1 = next_meixner(r, Mr, Mm)
    M2 = next_meixner(r + 1, M1, Mr)
    polar = sp.expand(M2 + (2 * d + S) * M1 + (d**2 + S * d + P) * Mr)

    L = sp.expand(B * d + (B + r + 1) * S + 4 * (z - r - 1))
    A = sp.expand(
        B**2 * P
        + 2 * B * P * r
        + B * P
        - B * S * d * r
        - 4 * B * S * r
        + 4 * B * S * z
        - B * d**2 * r
        - 4 * B * d * r
        + P * r**2
        + P * r
        - S * d * r**2
        - S * d * r
        - 4 * S * r**2
        + 4 * S * r * z
        - 4 * S * r
        + 4 * S * z
        + 4 * d * r**2
        - 8 * d * r * z
        + 4 * d * r
        + 16 * r**2
        - 32 * r * z
        + 16 * r
        + 16 * z**2
        - 16 * z
    )
    cleared = sp.expand((B + r) * (B + r + 1) * polar)
    expected = sp.expand(A * Mr - d * r * (d + 4) * L * Mm)
    assert sp.factor(cleared - expected) == 0

    return {
        "generic_two_recurrence_elimination": True,
        "L": str(L),
        "A_sha256": hashlib.sha256(str(A).encode("utf-8")).hexdigest().upper(),
        "derivative_form": "A*M_r+d(d+4)L*M_r'",
    }


def determinant_replay() -> list[dict[str, object]]:
    B, z, w = sp.symbols("B z w")
    records: list[dict[str, object]] = []

    def rising(k: int) -> sp.Expr:
        return sp.prod((B + j for j in range(k)), start=sp.Integer(1))

    qpolys = [sp.Integer(1)]
    if True:
        qpolys.append((z - w * (z + B)) / B)
    for k in range(1, 7):
        qpolys.append(
            sp.cancel(
                ((z - k) - w * (z + B + k)) * qpolys[k] / (B + k)
                - w * k * qpolys[k - 1] / (B + k)
            )
        )

    for degree in range(1, 7):
        matrix = sp.zeros(degree)
        for k in range(degree):
            matrix[k, k] = k - z + w * (z + B + k)
            if k + 1 < degree:
                matrix[k, k + 1] = B + k
                matrix[k + 1, k] = w * (k + 1)
        determinant = sp.factor(matrix.det())
        assert sp.factor(
            determinant - (-1) ** degree * rising(degree) * qpolys[degree]
        ) == 0
        records.append({"degree": degree, "determinant_identity": True})
    return records


def exact_rotation_shortcut_counterexample() -> dict[str, object]:
    q, d, z = sp.symbols("q d z")
    B = sp.Integer(27)
    u = sp.Rational(1, 32)
    r = 5
    R = sp.sqrt(110) / 2

    def falling(k: int) -> sp.Expr:
        return sp.prod((z - j for j in range(k)), start=sp.Integer(1))

    def rising(k: int) -> sp.Expr:
        return sp.prod((B + j for j in range(k)), start=sp.Integer(1))

    source = sp.Poly(sp.expand((q + u / 4) ** 2 * (4 * q - d) ** r), q)
    transform = sp.expand(
        sum(source.nth(k) * falling(k) / rising(k) for k in range(r + 3))
    )
    at_anchor = sp.Poly(transform.subs(z, R), d, extension=sp.sqrt(110))
    velocity_numerator = sp.Poly(
        (2 * R * sp.diff(transform, z) + d * sp.diff(transform, d)).subs(z, R),
        d,
        extension=sp.sqrt(110),
    )
    derivative = at_anchor.diff()

    lower = sp.Rational(1, 6000)
    upper = sp.Rational(1, 5000)
    midpoint = (lower + upper) / 2
    assert at_anchor.count_roots(lower, upper) == 1
    assert velocity_numerator.count_roots(lower, upper) == 0
    assert derivative.count_roots(lower, upper) == 0
    assert velocity_numerator.eval(midpoint) < 0
    assert derivative.eval(midpoint) < 0
    assert at_anchor.count_roots(0, sp.oo) == 5

    return {
        "parameters": {
            "m": 7,
            "r": 5,
            "B": 27,
            "R_squared": "55/2",
            "u": "1/32",
            "v": "1/32",
            "K": 32,
        },
        "all_anchor_roots_positive": True,
        "smallest_root_interval": ["1/6000", "1/5000"],
        "velocity_numerator_sign": "negative",
        "F_d_sign": "negative",
        "rotated_height_derivative": "negative",
        "conclusion": (
            "u,v>=1/K and positive real-anchor roots do not by themselves "
            "imply rotating half-angle continuation"
        ),
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_safe_core_compression",
        "date": "2026-08-13",
        "status": "PASS_EXACT_NEAR_SECTOR_SAFE_CORE_COMPRESSION_REDUCTION",
        "symbolic_compression": symbolic_compression(),
        "determinant_replay": determinant_replay(),
        "generic_shortcut_counterexample": exact_rotation_shortcut_counterexample(),
        "remaining_theorem": (
            "Exclude the single cleared boundary-coordinate term for the "
            "actual path-selector pair (u,v) on all four near-sector charts."
        ),
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("determinant_degrees", len(payload["determinant_replay"]))
    print("report", REPORT)


if __name__ == "__main__":
    main()
