#!/usr/bin/env python3
"""Exact replay of the sixth-Cohn-core post-sector reduction.

The abstract reduction is all-order.  The lower-selector sweep is exact finite
evidence for its remaining path-specific hypothesis, not a proof of that
hypothesis.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import sys
from collections import Counter
from pathlib import Path

from flint import fmpq

from search_lower_selector_block_energy_large import (
    normalized_duran_coefficients,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_post_sector_sixth_cohn_core_exact_20260813.json"


def cohn_reduce(A: fmpq, coefficients: list[fmpq]) -> tuple[fmpq, list[fmpq]]:
    """One radical-free Cohn step for q(Rz), R^2=A.

    If q has degree n and ascending coefficients b_j, the returned polynomial
    is the degree-(n-1) coefficient vector of

        q(Rz)-kappa*z^n*q(R/z),  kappa=R^n*b_n/b_0,

    after the common factor R^j is removed from coefficient j.  The first
    return value is kappa^2, so everything stays in QQ.
    """

    n = len(coefficients) - 1
    ratio = coefficients[n] / coefficients[0]
    kappa_square = A**n * ratio**2
    reduced = [
        coefficients[j] - A ** (n - j) * ratio * coefficients[n - j]
        for j in range(n)
    ]
    assert reduced[0] == coefficients[0] * (1 - kappa_square)
    return kappa_square, reduced


def core_count(A: fmpq, coefficients: list[fmpq], core_degree: int = 6):
    """Return the exact disk-root count of the final Cohn core."""

    b = coefficients[:]
    descent_squares = []
    while len(b) - 1 > core_degree:
        square, b = cohn_reduce(A, b)
        assert square != 1
        descent_squares.append(square)

    assert len(b) - 1 == core_degree
    core_squares = []
    inside = 0
    trajectory = []
    while len(b) > 1:
        degree = len(b) - 1
        square, b = cohn_reduce(A, b)
        assert square != 1
        core_squares.append(square)
        # Reconstruct from degree one upward below.
    for degree, square in enumerate(reversed(core_squares), 1):
        if square > 1:
            inside = degree - inside
        trajectory.append(inside)
    return inside, trajectory, descent_squares, core_squares


def verify_abstract_invariant() -> int:
    """Replay the two possible Cohn updates on generic integer intervals."""

    checks = 0
    # This finite loop is only a replay of the displayed endpoint algebra in
    # the note.  The proof there is for an arbitrary n>=5.
    for n in range(6, 101):
        for inside in range(2, n - 1):
            assert 2 <= inside <= n - 2
            assert 2 <= inside <= (n + 1) - 2
            reflected = n + 1 - inside
            assert 2 <= reflected <= (n + 1) - 2
            checks += 2
    return checks


def forbidden_degree_six_words() -> dict[str, int]:
    """Exact six-bit truth table, written in degree-one-to-six order."""

    forbidden = {}
    for bits in itertools.product((False, True), repeat=6):
        inside = 0
        word = ""
        for degree, reflected in enumerate(bits, 1):
            word += "+" if reflected else "-"
            if reflected:
                inside = degree - inside
        if inside not in (2, 3, 4):
            forbidden[word] = inside
    assert len(forbidden) == 14
    return forbidden


def audit(max_d: int) -> dict[str, object]:
    cells = 0
    histogram: Counter[int] = Counter()
    core_words: Counter[str] = Counter()
    first_failures = []
    closest_pivot = None
    deepest_descent = 0
    fifth_core_counterexample = None

    for d in range(5, max_d + 1):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                forced = max(0, row_s - path_n + 1)
                gamma = tuple(selector_gamma(path_n, row_s)[forced:])
                m = len(gamma) - 1
                if m < 7:
                    continue

                effective_p = d + row_s - 2 * forced
                n = effective_p // 2
                x = n - m + 1
                A = fmpq(x) * fmpq(
                    2 * x + (1 if effective_p % 2 else -1), 2
                )
                if A > (m - 1) ** 2:
                    continue

                coefficients = normalized_duran_coefficients(
                    d + row_s - forced, gamma
                )
                inside, trajectory, descent, core = core_count(A, coefficients)
                word = "".join("+" if square > 1 else "-" for square in reversed(core))
                histogram[inside] += 1
                core_words[word] += 1
                deepest_descent = max(deepest_descent, len(descent))
                cell = (d, r, row_s, forced, m)
                if inside not in (2, 3, 4):
                    first_failures.append((*cell, inside, word, trajectory))
                for stage, square in enumerate((*descent, *core)):
                    distance = abs(square - 1)
                    record = (distance, cell, stage, square)
                    if closest_pivot is None or distance < closest_pivot[0]:
                        closest_pivot = record
                if cell == (13, 8, 22, 2, 11):
                    inside5, trajectory5, _, core5 = core_count(
                        A, coefficients, core_degree=5
                    )
                    assert inside5 == 4
                    fifth_core_counterexample = {
                        "cell": cell,
                        "disk_count": inside5,
                        "trajectory_degrees_1_to_5": trajectory5,
                        "reflection_word_degrees_1_to_5": "".join(
                            "+" if square > 1 else "-"
                            for square in reversed(core5)
                        ),
                    }
                cells += 1

    assert closest_pivot is not None
    assert not first_failures
    assert set(histogram) <= {2, 3, 4}
    assert fifth_core_counterexample is not None
    return {
        "kind": "lower_selector_post_sector_sixth_cohn_core_exact",
        "date": "2026-08-13",
        "status": f"PASS_EXACT_D5_TO_D{max_d}_POST_SECTOR_SIXTH_COHN_CORE_AUDIT",
        "scope": "exact finite evidence for the path-specific core hypothesis; the Cohn invariant reduction is all-order",
        "d_range": [5, max_d],
        "cells": cells,
        "core_degree": 6,
        "core_disk_count_histogram": {str(k): histogram[k] for k in sorted(histogram)},
        "core_reflection_word_histogram": dict(sorted(core_words.items())),
        "first_failures": first_failures,
        "degree_five_invariant_counterexample": fifth_core_counterexample,
        "deepest_descent_steps": deepest_descent,
        "closest_pivot_distance_from_one": str(closest_pivot[0]),
        "closest_pivot_cell": closest_pivot[1],
        "closest_pivot_stage_from_top": closest_pivot[2],
        "closest_pivot_square": str(closest_pivot[3]),
        "all_order_reduction": (
            "If every Cohn pivot is nonunit and the degree-six core has "
            "2, 3, or 4 disk roots, then 2<=I_n<=n-2 is invariant under every "
            "remaining Cohn step; hence the original polynomial has at "
            "least two roots in the target disk."
        ),
        "remaining": (
            "Prove all-order nonunit pivots and I_6 in {2,3,4} for the actual "
            "post-sector path-selector Cohn descent."
        ),
    }


def main() -> None:
    max_d = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    invariant_checks = verify_abstract_invariant()
    payload = audit(max_d)
    payload["abstract_invariant_replay_checks"] = invariant_checks
    payload["forbidden_degree_six_words_and_disk_counts"] = forbidden_degree_six_words()
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "cells": payload["cells"],
        "histogram": payload["core_disk_count_histogram"],
        "core_words": payload["core_reflection_word_histogram"],
        "abstract_invariant_replay_checks": invariant_checks,
        "source_sha256": payload["source_sha256"],
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
