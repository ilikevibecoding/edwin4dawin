#!/usr/bin/env python3
"""Probe whether the reserve atoms become compatible after natural grouping.

The raw monomial/k atoms are individually PF but are not a compatible family.
This script keeps the actual structured sums and groups them by k, source
monomial, total source degree, z exponent, w exponent, or exponent difference.
It then tests real-rootedness of every group and of random pair sums (including
the shifted compatibility test x f+g).
"""

from __future__ import annotations

from collections import defaultdict
import json
import random
from pathlib import Path

from flint import ctx

from probe_reserve_atom_compatibility import atom, real_nonpositive
from probe_path_isolate_p4_affine_scaled_excess_local_summands import choose
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "reserve_structured_group_compatibility_probe_20260802.json"
)


def add_into(left: list[int], right: list[int]) -> None:
    if len(left) < len(right):
        left.extend([0] * (len(right) - len(left)))
    for j, value in enumerate(right):
        left[j] += value


def add(left: list[int], right: list[int], shift_left: bool = False) -> list[int]:
    if shift_left:
        left = [0] + left
    result = [0] * max(len(left), len(right))
    add_into(result, left)
    add_into(result, right)
    return result


def grouping_keys(pz: int, pw: int, k: int) -> dict[str, object]:
    return {
        "k": k,
        "source_monomial": (pz, pw),
        "source_total_degree": pz + pw,
        "source_z_degree": pz,
        "source_w_degree": pw,
        "source_difference": pz - pw,
        "k_plus_source_w": k + pw,
        "k_plus_source_z": k + pz,
    }


def compatibility_summary(groups: dict[object, list[int]], seed: int) -> dict:
    labels = list(groups)
    individual_failures = [
        label for label in labels if not real_nonpositive(groups[label])
    ]
    rng = random.Random(seed)
    candidate_pairs = [
        (labels[i], labels[j])
        for i in range(len(labels))
        for j in range(i + 1, len(labels))
    ]
    if len(candidate_pairs) > 1000:
        candidate_pairs = rng.sample(candidate_pairs, 1000)
    pair_failures = []
    shifted_failures = []
    for left_label, right_label in candidate_pairs:
        left = groups[left_label]
        right = groups[right_label]
        if not real_nonpositive(add(left, right)) and len(pair_failures) < 12:
            pair_failures.append([left_label, right_label])
        if (
            not real_nonpositive(add(left, right, shift_left=True))
            and len(shifted_failures) < 12
        ):
            shifted_failures.append([left_label, right_label])
    total = []
    for values in groups.values():
        add_into(total, values)
    return {
        "group_count": len(groups),
        "all_group_polynomials_real_nonpositive_rooted": not individual_failures,
        "individual_failure_count": len(individual_failures),
        "first_individual_failures": individual_failures[:12],
        "tested_pair_count": len(candidate_pairs),
        "sampled_pair_sum_failure_count": len(pair_failures),
        "sampled_shifted_pair_failure_count": len(shifted_failures),
        "first_pair_sum_failures": pair_failures,
        "first_shifted_pair_failures": shifted_failures,
        "total_real_nonpositive_rooted": real_nonpositive(total),
    }


def audit(package: str, parity: int, coordinate: str, c: int, m: int, x: int, r: int):
    _, reserve_source = reduced_sources(package, parity, coordinate)
    numeric = evaluate(reserve_source, c, m, x, m + r + 10)
    a = 2 * c + m + x - 3 if package == "group" else m + x - 3
    original_b = 2 * m + parity - (4 if package == "group" else 5)
    b = original_b + 3
    target = m + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    grouped: dict[str, dict[object, list[int]]] = {
        name: defaultdict(list)
        for name in grouping_keys(0, 0, 0)
    }
    for (pz, pw), coefficient in numeric.items():
        if coefficient <= 0:
            raise AssertionError("reserve source is not coefficient-positive")
        for k in range(b + 1):
            values = atom(pz, pw, coefficient, k, a, b, r, target)
            if not any(values):
                continue
            for name, key in grouping_keys(pz, pw, k).items():
                add_into(grouped[name][key], values)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "m": m,
        "x": x,
        "r": r,
        "groupings": {
            name: compatibility_summary(groups, 993 + index)
            for index, (name, groups) in enumerate(grouped.items())
        },
    }


def main() -> None:
    ctx.prec = 80
    records = [
        audit("group", 0, "m", 1, 6, 12, 12),
        audit("bottom", 1, "x", 0, 6, 12, 12),
    ]
    report = {
        "status": "RESERVE_STRUCTURED_GROUP_COMPATIBILITY_PROBE",
        "records": records,
        "warning": "Finite exact-root and randomized-pair evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
