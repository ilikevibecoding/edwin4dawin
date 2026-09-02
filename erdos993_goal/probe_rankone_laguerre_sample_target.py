#!/usr/bin/env python3
"""Numerically test the endpoint difference in each coupled finite-free sample."""

from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np

from probe_rankone_laguerre_sample_pencil import (
    add,
    coupled_seeds,
    derivative_sum_line,
    robust_nonreal,
)


OUT = Path("rankone_laguerre_sample_target_probe_20260802.json")


def main() -> None:
    rng = random.Random(993_20260802 + 157)
    records = []
    witnesses = []
    for m in range(1, 7):
        N = 3*m+3
        n = N-2
        d = 2*m+3
        failures = 0
        worst = 0.0
        lines = 0
        for sample in range(200):
            perm_left = np.array(rng.sample(range(n), n))
            perm_right = np.array(rng.sample(range(n), n))
            g_left, h_left = coupled_seeds(n, perm_left)
            g_right, h_right = coupled_seeds(n, perm_right)
            for trial in range(8):
                bases = (rng.randint(-100, 100), rng.randint(-100, 100))
                directions = (rng.randint(1, 30), rng.randint(1, 30))
                positive = derivative_sum_line(g_left, g_right, d, bases, directions)
                negative = derivative_sum_line(h_left, h_right, d-2, bases, directions)
                target = add(positive, negative, -1.0)
                count, imaginary = robust_nonreal(target)
                lines += 1
                worst = max(worst, imaginary)
                if count:
                    failures += 1
                    if len(witnesses) < 30:
                        witnesses.append({
                            "m": m,
                            "sample": sample,
                            "trial": trial,
                            "perm_left": perm_left.tolist(),
                            "perm_right": perm_right.tolist(),
                            "bases": bases,
                            "directions": directions,
                            "nonreal": count,
                            "max_imaginary": imaginary,
                        })
        record = {"m": m, "N": N, "lines": lines, "failures": failures, "worst_imaginary": worst}
        records.append(record)
        print(json.dumps(record), flush=True)
    total = sum(item["failures"] for item in records)
    report = {
        "kind": "rankone_laguerre_sample_target_probe",
        "date": "2026-08-02",
        "status": "SAMPLEWISE_TARGET_FALSE" if total else "NO_SAMPLEWISE_TARGET_FAILURE_FOUND",
        "records": records,
        "total_failures": total,
        "first_witnesses": witnesses,
        "warning": "Floating-point route-selection evidence only.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")


if __name__ == "__main__":
    main()
