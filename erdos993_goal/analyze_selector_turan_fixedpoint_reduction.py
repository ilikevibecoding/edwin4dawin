#!/usr/bin/env python3
"""Exact replay for the Turan/fixed-point closure of the selector outliers.

Let

    Gamma_(N,s)(t)=G_(N,s)(t)-2tG_(N-1,s)(t)+t^2G_(N-2,s)(t).

Suppose the unsigned size family satisfies the strict Turan inequality

    T_(M,s)(t)=G_(M-1,s)(t)^2-G_(M,s)(t)G_(M-2,s)(t)>0 (t>0).  (T)

Put R(t)=G_(N-1,s)(t)/G_(N-2,s)(t).  All coefficients of the G's are
positive.  Hence R(1)>1, while R(t) is bounded as t tends to infinity.
There is therefore t_*>1 with R(t_*)=t_*.  At this fixed point,

    Gamma(t_*)=G_N(t_*)-G_(N-1)(t_*)^2/G_(N-2)(t_*)<0.        (F)

Together with Gamma(1)>0 and its positive leading coefficient, (F) forces
two distinct roots in (1,infinity).  Thus, once the already isolated nested
chain supplies floor(s/2) negative roots, (T) finishes the selector theorem.

The all-order content of this file is the elementary implication (T)=>(F)
and the fixed-point argument.  The exact Turan-coefficient and ratio-array
checks below are finite evidence for the remaining positivity theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

from probe_group_selector_gamma_root_pattern import gamma_coefficients, path_slice


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_turan_fixedpoint_reduction_exact_20260809.json"


def G(M: int, s: int) -> list[int]:
    return gamma_coefficients(path_slice(M, s), s)


def convolve(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return out


def subtract(left: list[int], right: list[int]) -> list[int]:
    size = max(len(left), len(right))
    return [
        (left[i] if i < len(left) else 0)
        - (right[i] if i < len(right) else 0)
        for i in range(size)
    ]


def one_case(s: int, excess: int) -> dict[str, object]:
    M = 2 * s + 5 + excess
    current, previous, older = G(M, s), G(M - 1, s), G(M - 2, s)
    turan = subtract(convolve(previous, previous), convolve(current, older))
    assert all(value > 0 for value in turan)

    current_ratios = [Fraction(a, b) for a, b in zip(current, previous)]
    previous_ratios = [Fraction(b, c) for b, c in zip(previous, older)]
    ratio_interlacing = all(
        previous_ratios[h + 1] <= current_ratios[h] <= previous_ratios[h]
        for h in range(len(current_ratios) - 1)
    ) and current_ratios[-1] <= previous_ratios[-1]
    assert ratio_interlacing

    return {
        "s": s,
        "M": M,
        "forest_excess": excess,
        "gamma_degree": len(current) - 1,
        "strictly_positive_turan_coefficients": len(turan),
        "adjacent_size_coefficient_ratios_interlace": True,
        "minimum_turan_coefficient": min(turan),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=150)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    excesses = (0, 1, 5, 17, 73, 200, 1000)
    records = [
        one_case(s, excess)
        for s in range(2, args.max_layer + 1)
        for excess in excesses
    ]
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_TURAN_FIXEDPOINT_REDUCTION_REPLAY",
        "all_order_reduction": [
            "strict Turan positivity makes the fixed-point selector value negative",
            "R(1)>1 and boundedness at infinity give a fixed point t_*>1",
            "Gamma(1)>0, Gamma(t_*)<0, and positive leading coefficient force two roots above one",
            "combined with the nested-chain negative roots, this gives the full selector root count",
        ],
        "finite_replay_scope": {
            "layers": [2, args.max_layer],
            "forest_excesses": list(excesses),
            "cases": len(records),
            "strict_turan_coefficients": sum(
                record["strictly_positive_turan_coefficients"] for record in records
            ),
        },
        "finite_replay_conclusions": {
            "all_turan_polynomials_are_strictly_coefficient_positive": True,
            "all_adjacent_size_coefficient_ratio_arrays_interlace": True,
        },
        "remaining_target": (
            "Prove the adjacent-size ratio interlacing, or directly the strict coefficientwise "
            "Turan inequality, in all orders; separately prove the unsigned nested root chain."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "cases": len(records),
        "strict_turan_coefficients": report["finite_replay_scope"]["strict_turan_coefficients"],
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
