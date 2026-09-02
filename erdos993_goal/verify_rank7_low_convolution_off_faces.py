#!/usr/bin/env python3
"""Exact replay of the full rank-seven low convolution off-face claims.

For each requested cone this program reconstructs the full FLINT integer
polynomial, scans every monomial once, and proves that every negative
coefficient is on the previously certified hard face.  The hard-face slice
is also compared coefficient-for-coefficient with an independently
reconstructed reduced polynomial.

Run the cases in separate processes: each full polynomial is very large.
This keeps peak memory bounded by one cone rather than two cones plus their
Python coefficient lists.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from explore_rank7_convolution_hard_faces import low_high_hard, low_low_hard
from explore_rank7_three_halves_convolution import low_high, low_low


ROOT = Path(__file__).resolve().parent


CASES = {
    "low-high": {
        "full": low_high,
        "hard": low_high_hard,
        # Full variables:
        # a,b,ta,a0,a2,a3,a4,a5,a6,tb,b0,b1,b2,b3,b4,b5,b6
        "kept": (1, 2, 5, 6, 7, 8, 9, 10),
        "report": ROOT / "rank7_low_high_off_face_exact_20260813.json",
    },
    "low-low": {
        "full": low_low,
        "hard": low_low_hard,
        # Full variables:
        # a,b,c,ta,a0,a2,a3,a4,a5,a6,tb,b0,b2,b3,b4,b5,b6
        "kept": (1, 2, 3, 6, 7, 8, 9, 10, 11),
        "report": ROOT / "rank7_low_low_off_face_exact_20260813.json",
    },
}


def exact_map(polynomial) -> dict[tuple[int, ...], int]:
    return {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }


def scan_full(polynomial, kept: tuple[int, ...]) -> tuple[dict, dict, dict]:
    """Return exact total/off-face statistics and the small hard-face map."""
    total_terms = total_negative = 0
    total_minimum = total_maximum = None
    outside_terms = outside_negative = 0
    outside_minimum = outside_maximum = None
    hard_map: dict[tuple[int, ...], int] = {}

    for monomial, coefficient_raw in polynomial.terms():
        coefficient = int(coefficient_raw)
        total_terms += 1
        total_negative += coefficient < 0
        total_minimum = coefficient if total_minimum is None else min(total_minimum, coefficient)
        total_maximum = coefficient if total_maximum is None else max(total_maximum, coefficient)

        on_hard_face = all(
            exponent == 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        )
        if on_hard_face:
            projected = tuple(int(monomial[index]) for index in kept)
            assert projected not in hard_map
            hard_map[projected] = coefficient
        else:
            outside_terms += 1
            outside_negative += coefficient < 0
            outside_minimum = (
                coefficient if outside_minimum is None else min(outside_minimum, coefficient)
            )
            outside_maximum = (
                coefficient if outside_maximum is None else max(outside_maximum, coefficient)
            )

    total = {
        "terms": total_terms,
        "negative": total_negative,
        "minimum": total_minimum,
        "maximum": total_maximum,
    }
    outside = {
        "terms": outside_terms,
        "negative": outside_negative,
        "minimum": outside_minimum,
        "maximum": outside_maximum,
    }
    return total, outside, hard_map


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=tuple(CASES), required=True)
    args = parser.parse_args()
    data = CASES[args.case]

    full, full_context = data["full"]()
    full_variables = tuple(str(value) for value in full_context.gens())
    total, outside, extracted_hard = scan_full(full, data["kept"])

    # This is the theorem-producing assertion: no negative coefficient is
    # allowed away from the already certified boundary polynomial.
    assert outside["negative"] == 0

    hard, hard_context = data["hard"]()
    hard_variables = tuple(str(value) for value in hard_context.gens())
    reconstructed_hard = exact_map(hard)
    assert extracted_hard == reconstructed_hard
    hard_coefficients = tuple(reconstructed_hard.values())
    hard_statistics = {
        "terms": len(hard_coefficients),
        "negative": sum(value < 0 for value in hard_coefficients),
        "minimum": min(hard_coefficients),
        "maximum": max(hard_coefficients),
    }
    assert total["terms"] == outside["terms"] + hard_statistics["terms"]
    assert total["negative"] == hard_statistics["negative"]

    report = {
        "status": f"PASS_EXACT_FULL_RANK7_{args.case.upper().replace('-', '_')}_OFF_FACE_CONE",
        "case": args.case,
        "full_variables": full_variables,
        "hard_variables": hard_variables,
        "kept_full_variable_indices": list(data["kept"]),
        "full_statistics": total,
        "off_hard_face_statistics": outside,
        "hard_face_statistics": hard_statistics,
        "hard_face_equals_independent_reduced_reconstruction": True,
        "conclusion": "every negative coefficient of the full cone lies on the certified hard face",
    }
    report_path: Path = data["report"]
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"], flush=True)
    print("full", total, flush=True)
    print("off hard face", outside, flush=True)
    print("hard face", hard_statistics, flush=True)
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(report_path.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
