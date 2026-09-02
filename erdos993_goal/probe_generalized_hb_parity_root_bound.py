#!/usr/bin/env python3
"""Falsify a naive parity-root version of the index-two lemma.

We generate exact pairs E,O with real roots, strictly alternating negative
roots, and at most two positive roots in each part.  We then count roots in
the open right half-plane of C(t)=E(t^2)+t O(t^2).  This determines which
extra orientation hypotheses a usable Hermite--Biehler lemma must include.
"""

from __future__ import annotations

import itertools
import json
import random
from pathlib import Path

from flint import ctx, fmpz_poly


def multiply(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for j, a in enumerate(left):
        for k, b in enumerate(right):
            result[j + k] += a * b
    return result


def rooted(roots: list[int], scale: int) -> list[int]:
    result = [scale]
    for root in roots:
        result = multiply(result, [-root, 1])
    return result


def combine(even: list[int], odd: list[int]) -> list[int]:
    result = [0] * max(2 * len(even) - 1, 2 * len(odd))
    for j, value in enumerate(even):
        result[2 * j] = value
    for j, value in enumerate(odd):
        result[2 * j + 1] = value
    while result and result[-1] == 0:
        result.pop()
    return result


def rhp_count(values: list[int]) -> tuple[int, int]:
    right = imaginary = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.real > 0:
            right += multiplicity
        elif root.real.contains(0):
            imaginary += multiplicity
    return right, imaginary


def trial(
    rng: random.Random,
    degree: int,
    require_hurwitz_orientation: bool,
) -> dict | None:
    # Degree patterns forced by C(t)=E(t^2)+tO(t^2).
    if degree % 2 == 0:
        e_degree, o_degree = degree // 2, degree // 2 - 1
    else:
        e_degree = o_degree = degree // 2

    if require_hurwitz_orientation:
        common_positive = rng.randrange(0, min(2, e_degree, o_degree) + 1)
        e_positive = o_positive = common_positive
    else:
        e_positive = rng.randrange(0, min(2, e_degree) + 1)
        o_positive = rng.randrange(0, min(2, o_degree) + 1)
    e_negative = e_degree - e_positive
    o_negative = o_degree - o_positive
    if abs(e_negative - o_negative) > 1:
        return None

    labels = []
    if e_negative == o_negative:
        first = (
            "O" if require_hurwitz_orientation else rng.choice(("E", "O"))
        )
        labels = [first if j % 2 == 0 else ("O" if first == "E" else "E")
                  for j in range(e_negative + o_negative)]
    else:
        majority = "E" if e_negative > o_negative else "O"
        labels = [majority if j % 2 == 0 else ("O" if majority == "E" else "E")
                  for j in range(e_negative + o_negative)]

    negative_values = sorted(rng.sample(range(-80, -1), len(labels)))
    e_roots = [root for root, label in zip(negative_values, labels) if label == "E"]
    o_roots = [root for root, label in zip(negative_values, labels) if label == "O"]
    e_roots.extend(rng.sample(range(1, 30), e_positive))
    o_roots.extend(rng.sample(range(31, 60), o_positive))

    if require_hurwitz_orientation:
        common_sign = rng.choice((-1, 1))
        e_scale = common_sign * rng.choice((1, 2, 4))
        o_scale = common_sign * rng.choice((1, 3, 5))
    else:
        e_scale = rng.choice((-5, -3, -1, 1, 2, 4))
        o_scale = rng.choice((-6, -2, -1, 1, 3, 5))
    even = rooted(e_roots, e_scale)
    odd = rooted(o_roots, o_scale)
    coefficient = combine(even, odd)
    right, imaginary = rhp_count(coefficient)
    return {
        "degree": degree,
        "common_positive_root_count": (
            e_positive if e_positive == o_positive else None
        ),
        "e_roots": e_roots,
        "o_roots": o_roots,
        "e_scale": e_scale,
        "o_scale": o_scale,
        "hurwitz_oriented": require_hurwitz_orientation,
        "right_half_plane_count": right,
        "imaginary_axis_unresolved_count": imaginary,
        "coefficient_signs": [0 if x == 0 else (1 if x > 0 else -1) for x in coefficient],
    }


def main() -> None:
    ctx.prec = 80
    rng = random.Random(993020802)
    summaries = {}
    for oriented in (False, True):
        records = []
        maximum = 0
        witness = None
        for degree, _ in itertools.product(range(5, 15), range(500)):
            record = trial(rng, degree, oriented)
            if record is None:
                continue
            records.append(record)
            if record["right_half_plane_count"] > maximum:
                maximum = record["right_half_plane_count"]
                witness = record
        by_common_positive = {}
        for count in range(3):
            subset = [
                record for record in records
                if record["common_positive_root_count"] == count
            ]
            if subset:
                by_common_positive[str(count)] = {
                    "case_count": len(subset),
                    "right_half_plane_counts": sorted(
                        {record["right_half_plane_count"] for record in subset}
                    ),
                }
        summaries["hurwitz_oriented" if oriented else "unoriented"] = {
            "valid_trial_count": len(records),
            "maximum_right_half_plane_count": maximum,
            "first_maximum_witness": witness,
            "by_common_positive_root_count": by_common_positive,
        }
    report = {
        "status": (
            "ORIENTED_INDEX_TWO_REFUTED"
            if summaries["hurwitz_oriented"]["maximum_right_half_plane_count"] > 2
            else "NO_ORIENTED_INDEX_TWO_REFUTATION"
        ),
        "summaries": summaries,
        "warning": "Diagnostic falsification search; not a theorem.",
    }
    Path(
        "generalized_hb_parity_root_bound_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
