#!/usr/bin/env python3
"""Certified root counts for saved far-ray affine j-polynomials."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly


def main() -> None:
    source = Path(
        "path_isolate_p4_affine_parameter_monotonicity_far_sign_blocks_"
        "probe_20260802.json"
    )
    records = json.loads(source.read_text(encoding="utf-8"))["records"]
    ctx.prec = 100
    results = []
    for record in records:
        polynomial = fmpz_poly(record["j_aggregates"])
        roots = polynomial.complex_roots()
        negative = 0
        positive = 0
        zero = 0
        nonreal = 0
        positive_below_one = 0
        positive_above_one = 0
        positive_balls = []
        for root, multiplicity in roots:
            if root.imag.is_zero():
                if root.real < 0:
                    negative += multiplicity
                elif root.real > 0:
                    positive += multiplicity
                    positive_balls.extend([str(root.real)] * multiplicity)
                    if root.real < 1:
                        positive_below_one += multiplicity
                    elif root.real > 1:
                        positive_above_one += multiplicity
                else:
                    zero += multiplicity
            else:
                nonreal += multiplicity
        result = {
            "package": record["package"],
            "parity": record["parity"],
            "coordinate": record["coordinate"],
            "c": record["c"],
            "m": record["m"],
            "x": record["x"],
            "r": record["r"],
            "degree": polynomial.degree(),
            "negative_real_root_count": negative,
            "zero_root_count": zero,
            "positive_real_root_count": positive,
            "nonreal_root_count": nonreal,
            "positive_root_balls": positive_balls,
            "one_strictly_between_positive_roots": (
                positive_below_one == 1 and positive_above_one == 1
            ),
        }
        results.append(result)
        print(result, flush=True)
    report = {
        "status": "PASS_CERTIFIED_FAR_ROOT_COUNTS",
        "source": source.name,
        "records": results,
        "warning": "Finite exact polynomials; root balls are certified by python-flint/Arb.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_far_roots_"
        "20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(results)}, indent=2))


if __name__ == "__main__":
    main()
