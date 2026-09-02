#!/usr/bin/env python3
"""Probe whether symmetric reverse-TP2 sources imply the positive-real pair."""

from __future__ import annotations

import json
import random
from pathlib import Path

from probe_quadratic_symmetric_smoother_reserve_cross import convolve, one_case


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "rr2_source_positive_real_preservation_probe_20260802.json"
)


FACTORS = [
    {(0, 0): 1, (1, 0): 1, (0, 1): 1, (1, 1): 1},
    {(1, 0): 1, (0, 1): 1},
    {(2, 0): 1, (0, 2): 1},
    {(3, 0): 1, (0, 3): 1},
    {(1, 0): 1, (0, 1): 1, (2, 0): 1, (0, 2): 1},
    {(0, 0): 2, (1, 0): 1, (0, 1): 1},
]


def all_rr2(source):
    max_i = max(i for i, _ in source)
    max_j = max(j for _, j in source)
    for i1 in range(max_i + 1):
        for i2 in range(i1 + 1, max_i + 1):
            for j1 in range(max_j + 1):
                for j2 in range(j1 + 1, max_j + 1):
                    if (
                        source.get((i1, j1), 0) * source.get((i2, j2), 0)
                        > source.get((i1, j2), 0) * source.get((i2, j1), 0)
                    ):
                        return False
    return True


def main() -> None:
    rng = random.Random(993)
    failures = []
    trials = 2000
    for trial in range(trials):
        source = {(0, 0): 1}
        factor_indices = []
        for _ in range(rng.randint(1, 8)):
            index = rng.randrange(len(FACTORS))
            factor_indices.append(index)
            source = convolve(source, FACTORS[index])
        assert all_rr2(source)
        m = rng.randint(2, 40)
        x = rng.randint(2 * m, 10 * m)
        r = rng.randint(m, 2 * m)
        result = one_case(source, m + x + 1, 2 * m + 1, r, m + r + 4)
        if result["real_negative_count"]:
            failures.append({
                "trial": trial,
                "factor_indices": factor_indices,
                "m": m,
                "x": x,
                "r": r,
                **result,
            })
            if len(failures) >= 12:
                break
    report = {
        "status": (
            "PASS_RR2_SOURCE_POSITIVE_REAL_PRESERVATION_PROBE"
            if not failures else "RR2_SOURCE_POSITIVE_REAL_PRESERVATION_FAILURE"
        ),
        "planned_trial_count": trials,
        "completed_trial_count": trial + 1,
        "failure_count": len(failures),
        "first_failures": failures,
        "warning": "Finite exact random evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
