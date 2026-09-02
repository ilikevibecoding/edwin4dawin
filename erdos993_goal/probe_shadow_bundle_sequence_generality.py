#!/usr/bin/env python3
"""Probe how much structure binomial positivity of the shadow block needs."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from analyze_deepest_support_leaf_bundle_differences import (
    forward_coefficients,
)


def coefficient_after_isolates(
    sequence: list[int], d: int, rank: int
) -> int:
    return sum(
        math.comb(d, chosen) * sequence[rank - chosen]
        for chosen in range(min(d, rank) + 1)
        if rank - chosen < len(sequence)
    )


def shadow_cross(
    q: int,
    d: int,
    k0: list[int],
    a0: list[int],
    d0: list[int],
    e0: list[int],
    separated: bool,
) -> int:
    K = lambda rank: coefficient_after_isolates(k0, d, rank)
    A = lambda rank: coefficient_after_isolates(a0, d, rank)
    eps = int(separated)
    M = K(q - 1) + d0[q - 2]
    X = K(q) + d0[q - 1]
    r = A(q - 1) + eps * e0[q - 2]
    t = A(q) + eps * e0[q - 1]
    m = K(q - 2)
    k = K(q - 1)
    a = A(q - 2)
    b = A(q - 1)
    return (
        4 * M * m
        + 2 * M * k
        + 2 * X * m
        - 2 * a * k
        + (2 * q - 1) * (M * b + m * t)
        + 2 * b * m
        - (2 * q + 1) * (X * a + k * r)
    )


def main() -> None:
    rng = random.Random(993812)
    trials = 0
    failures: list[dict] = []
    for q in range(4, 9):
        for separated in (False, True):
            for _ in range(2000):
                length = q + 2
                k0 = [rng.randrange(11) for _ in range(length)]
                a0 = [
                    rng.randrange(k0[index] + 1)
                    for index in range(length)
                ]
                d0 = [rng.randrange(11) for _ in range(length)]
                e0 = [
                    rng.randrange(a0[index] + 1)
                    for index in range(length)
                ]
                values = [
                    shadow_cross(
                        q, d, k0, a0, d0, e0, separated
                    )
                    for d in range(2 * q + 5)
                ]
                coefficients = forward_coefficients(values)
                trials += 1
                if min(coefficients) < 0:
                    failures.append(
                        {
                            "q": q,
                            "separated": separated,
                            "k0": k0,
                            "a0": a0,
                            "d0": d0,
                            "e0": e0,
                            "first_negative_order": next(
                                index
                                for index, value in enumerate(
                                    coefficients
                                )
                                if value < 0
                            ),
                            "coefficients": coefficients,
                        }
                    )
                    if len(failures) >= 20:
                        break
            if len(failures) >= 20:
                break
        if len(failures) >= 20:
            break
    report = {
        "status": (
            "PASS_ARBITRARY_SEQUENCE_PROBE"
            if not failures
            else "FAIL_ARBITRARY_SEQUENCE_PROBE"
        ),
        "trials": trials,
        "failure_count": len(failures),
        "failures": failures,
        "interpretation": (
            "Failure means graph/minor structure beyond "
            "coefficientwise containment is essential."
        ),
    }
    Path(
        "shadow_bundle_sequence_generality_probe_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
