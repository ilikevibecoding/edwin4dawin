#!/usr/bin/env python3
"""Exact obstruction to the obsolete A-only W relaxation for forest m1,j3."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_forest_j3_enlarged_w_obstruction_independent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def main() -> None:
    N, h, d, R = 1681, 1, 1341, 0
    S = N - d
    L = N - 2 * h - d - R
    W = C(d, 2) + R
    assert (S, L, W) == (340, 338, 898470)
    assert W < C(d, 2) + R + L
    m = N - h
    eH = N - h - d - R
    U3 = C(S, 3) - eH * (S - 2) + C(eH, 2)
    B = (d * C(S - 1, 2) - R * (S - 2) + C(d, 2) * S
         - (d - 1) * R + C(d, 3))
    y = Fraction(U3, U3 + B)
    assert (U3, B, U3 + B) == (6435689, 783324141, 789759830)
    assert B > 0

    p0 = C(N + 1, 3) - m * (N - 1) + W + C(N + 1, 2) - m
    p1 = C(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = C(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - C(d, 2) - R)
    h2 = C(S, 2) - (m - d - R)
    c0 = a + z2 + h2
    b = C(N, 3) - (m - d) * (N - 2) + W - C(d, 2) - R
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    assert (a, p1, b, A1) == (
        1411701, 1413723, 789702539, 1120325273118333,
    )
    ebar = 1 + y + Fraction(3 * z2, 2 * a)
    Q0 = 4 * c0 - 3 * ebar * (p0 + a)
    Q1 = 4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    gap = 2 * p1 * c0 - 3 * a * R1
    U1 = Fraction(p0, b)
    f4bar = (
        d * C(S - 2, 3) - R * C(S - 3, 2)
        + C(d, 2) * C(S - 1, 2) - (d - 1) * R * (S - 2)
        + C(d, 3) * S - C(d - 1, 2) * R + C(d, 4)
    )
    Uc = Fraction(N - 3 + 2 * y, 4) + Fraction(3 * y, N - 3)
    Ut = 1 + y + Fraction(h2 + f4bar, b)

    def lower(U0: Fraction) -> Fraction:
        return 4 * (
            Fraction(3, 2) * p0 * R1
            + Fraction(p0 * U1 * gap, 2 * p1)
            + A1 * (U0 + U1)
        ) + remainder

    values = (lower(Uc), lower(Ut))
    expected = (
        Fraction(-400533540735423582269175901622706161590889178,
                 2522477146387530583948599526135),
        Fraction(-416041876859959445497906030936302243699612,
                 69150148232316094673203562695),
    )
    assert values == expected and all(value < 0 for value in values)

    source = Path(__file__).resolve()
    report = {
        "schema": "terminal-q3-m1-forest-j3-enlarged-w-obstruction-independent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_OBSTRUCTION_TO_A_ONLY_W_RELAXATION",
        "parameters": {"N": N, "h": h, "d": d, "R": R, "S": S,
                       "L": L, "W": W},
        "genuine_cap": {"U3": U3, "B": B, "y": str(y)},
        "positive_rows": {"a": a, "p1": p1, "b": b, "A1": A1},
        "coupled_lower": str(values[0]),
        "tangent_lower": str(values[1]),
        "excluded_by_correct_floor": "W<C(d,2)+R+L",
        "replay": "PYTHONHASHSEED=0 python verify_terminal_q3_m1_forest_j3_enlarged_w_obstruction_independent_agent.py",
        "scope": (
            "This refutes only the obsolete enlarged relaxation W>=C(d,2)+R. "
            "The cell violates the mandatory correlated wedge floor and is "
            "not evidence against the actual forest payment, m=1 theorem, "
            "unimodality, or Erdos Problem 993."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
