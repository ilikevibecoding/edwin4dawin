#!/usr/bin/env python3
"""Search and certify the (B,C)=(9,9) adjacent-g2 relaxation corner.

This is a diagnostic only.  A negative point here is a counterexample to the
continuous rectangular/ratio relaxation, not to the forest theorem.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from scipy.optimize import differential_evolution, minimize


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_adjacent_corner99_relaxation_diagnostic_rank5_g2_alt_20260830.json"
MARKER = "DIAGNOSE_EXACT_ISO_N5_G2_ADJACENT_CORNER99_RELAXATION_RANK5_G2_ALT"
MASK = 9
DEGREE_P = 10
DEGREE_Q = 10


def choose(value, rank):
    out = value * 0 + 1
    for offset in range(rank):
        out *= value - offset
    return out / math.factorial(rank)


def row_corner(order, mask=MASK):
    row = [order * 0 + 1, order]
    for rank in range(2, 6):
        row.append(
            choose(order, rank)
            if mask & (1 << (rank - 2))
            else choose(order - rank + 1, rank)
        )
    return tuple(row)


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else row[0] * 0


def a2(a):
    return (
        4 * at(a, 0) * at(a, 3) - 3 * at(a, 0) * at(a, 4)
        - 15 * at(a, 0) * at(a, 5) - 6 * at(a, 0) * at(a, 6)
        + 12 * at(a, 1) * at(a, 2) + 8 * at(a, 1) * at(a, 3)
        - 19 * at(a, 1) * at(a, 4) - 14 * at(a, 1) * at(a, 5)
        + 11 * at(a, 2) ** 2 + 18 * at(a, 2) * at(a, 3)
        - 2 * at(a, 2) * at(a, 4) + 6 * at(a, 3) ** 2
    )


def l2(a, b):
    return (
        4 * at(a, 0) * at(b, 2) - at(a, 0) * at(b, 3)
        - 14 * at(a, 0) * at(b, 4) - 6 * at(a, 0) * at(b, 5)
        + 8 * at(a, 1) * at(b, 1) + 9 * at(a, 1) * at(b, 2)
        - 4 * at(a, 1) * at(b, 3) - 8 * at(a, 1) * at(b, 4)
        + 4 * at(a, 2) * at(b, 0) + 9 * at(a, 2) * at(b, 1)
        + 20 * at(a, 2) * at(b, 2) + 6 * at(a, 2) * at(b, 3)
        - at(a, 3) * at(b, 0) - 4 * at(a, 3) * at(b, 1)
        + 6 * at(a, 3) * at(b, 2) - 14 * at(a, 4) * at(b, 0)
        - 8 * at(a, 4) * at(b, 1) - 6 * at(a, 5) * at(b, 0)
    )


def k2(b, c):
    return (
        4 * at(b, 0) * at(c, 1) + at(b, 0) * at(c, 2)
        - 13 * at(b, 0) * at(c, 3) - 6 * at(b, 0) * at(c, 4)
        + 4 * at(b, 1) * at(c, 0) + 6 * at(b, 1) * at(c, 1)
        + 9 * at(b, 1) * at(c, 2) - 2 * at(b, 1) * at(c, 3)
        + at(b, 2) * at(c, 0) + 9 * at(b, 2) * at(c, 1)
        + 8 * at(b, 2) * at(c, 2) - 13 * at(b, 3) * at(c, 0)
        - 2 * at(b, 3) * at(c, 1) - 6 * at(b, 4) * at(c, 0)
    )


def evaluate(parameters, *, mapped=True):
    s, z, x0, x1, x2, x3, P, Q = parameters
    if P == 1 or Q == 1:
        raise ZeroDivisionError("use an interior compactified point")
    p = P / (1 - P)
    q = Q / (1 - Q)
    mb = 7 + p
    mc = 7 + p + q
    overlap = mb * s
    n = mb + mc - overlap
    edges = overlap * z
    R1 = 2 * n * (n - 1) - 4 * edges
    budget = R1 - 3 * n
    T = budget * x0
    D4 = budget * (1 - x0) * x1
    D3 = budget * (1 - x0) * (1 - x1) * x2
    D2 = budget * (1 - x0) * (1 - x1) * (1 - x2) * x3
    R5 = T
    R4 = T + n + D4
    R3 = T + 2 * n + D4 + D3
    R2 = T + 3 * n + D4 + D3 + D2
    a = (
        n * 0 + 1, n, R1 / 4, R1 * R2 / (24 * n),
        R1 * R2 * R3 / (192 * n**2),
        R1 * R2 * R3 * R4 / (1920 * n**3),
        R1 * R2 * R3 * R4 * R5 / (23040 * n**4),
    )
    b = row_corner(mb)
    c = row_corner(mc)
    g2 = a2(a) + l2(a, b) + l2(a, c) + k2(b, c)
    source = 46080 * n**4 * g2
    value = source * (1 - P) ** DEGREE_P * (1 - Q) ** DEGREE_Q if mapped else g2
    details = {
        "p": p, "q": q, "mB": mb, "mC": mc, "N": n,
        "overlap": overlap, "edges": edges,
        "R": [R1, R2, R3, R4, R5],
        "rho": [R1 / n, R2 / n, R3 / n, R4 / n, R5 / n],
        "g2": g2, "scaled_source": source,
        "mapped": source * (1 - P) ** DEGREE_P * (1 - Q) ** DEGREE_Q,
    }
    return value, details


def exact_string(value) -> str:
    return f"{value.numerator}/{value.denominator}" if value.denominator != 1 else str(value.numerator)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--maxiter", type=int, default=1000)
    parser.add_argument("--denominator", type=int, default=1024)
    args = parser.parse_args()
    bounds = [(0.0, 1.0)] * 6 + [(0.0, 0.999), (0.0, 0.999)]

    def objective(point):
        return float(evaluate(tuple(point), mapped=True)[0])

    global_result = differential_evolution(
        objective, bounds, seed=args.seed, maxiter=args.maxiter,
        popsize=24, polish=False, updating="immediate", workers=1,
        atol=0.0, tol=1e-10,
    )
    local_result = minimize(
        objective, global_result.x, method="Nelder-Mead",
        options={"maxiter": 20000, "xatol": 1e-12, "fatol": 1e-9},
    )
    numeric_point = np.clip(local_result.x, 0.0, 0.999)
    numeric_value, numeric_details = evaluate(tuple(numeric_point), mapped=True)

    # Search exact nearby dyadic points.  The first negative point is a complete
    # exact witness to failure of the continuous relaxation.
    denominator = args.denominator
    centers = [int(round(value * denominator)) for value in numeric_point]
    exact_witness = None
    for radius in range(5):
        candidates = []
        for axis, center in enumerate(centers):
            low = max(0, center - radius)
            high = min(denominator - (1 if axis >= 6 else 0), center + radius)
            candidates.append(range(low, high + 1))
        # Coordinate descent over exact nearby values avoids a 9^8 product.
        current = [Fraction(center, denominator) for center in centers]
        for _ in range(5):
            changed = False
            for axis in range(8):
                best = None
                for integer in candidates[axis]:
                    trial = list(current)
                    trial[axis] = Fraction(integer, denominator)
                    value, details = evaluate(tuple(trial), mapped=True)
                    if best is None or value < best[0]:
                        best = (value, trial, details)
                assert best is not None
                if best[1][axis] != current[axis]:
                    changed = True
                current = best[1]
            if not changed:
                break
        value, details = evaluate(tuple(current), mapped=True)
        if value < 0:
            exact_witness = (current, value, details)
            break

    report = {
        "marker": MARKER,
        "corner": {"B_mask": MASK, "C_mask": MASK},
        "status": (
            "EXACT_NEGATIVE_CONTINUOUS_RELAXATION_WITNESS"
            if exact_witness is not None else
            "NO_EXACT_NEGATIVE_POINT_FOUND_NUMERIC_SEARCH_ONLY"
        ),
        "numeric_search": {
            "seed": args.seed,
            "global_value": float(global_result.fun),
            "local_value": float(numeric_value),
            "point": [float(value) for value in numeric_point],
            "details": {key: float(value) if not isinstance(value, list) else [float(x) for x in value]
                        for key, value in numeric_details.items()},
        },
        "exact_witness": None,
        "scope": (
            "A negative witness disproves only the continuous endpoint/ratio "
            "relaxation. It is not a forest or marked-deletion counterexample."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    if exact_witness is not None:
        point, value, details = exact_witness
        report["exact_witness"] = {
            "compact_box_point": [exact_string(x) for x in point],
            "variables": ["s", "z", "r0", "r1", "r2", "r3", "P", "Q"],
            "mapped_value": exact_string(value),
            "details": {
                key: exact_string(item) if not isinstance(item, list)
                else [exact_string(x) for x in item]
                for key, item in details.items()
            },
        }
        assert value < 0

    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
