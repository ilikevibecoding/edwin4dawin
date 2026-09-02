#!/usr/bin/env python3
"""Exact three-way endpoint completion after matched-column contraction.

Once the two Wishart-column choices have been paired by the stable K_(2,N)
selector, an endpoint event has only three remaining types: its matched
column label, the endpoint row in copy A, and the endpoint row in copy B.

Amini's standard relaxed-hyperedge completion has subset-size coefficients

    a_s = 1-s,  s=0,1,2,3.

For two reflected endpoints, the balanced one-event grade pairs complementary
subsets.  Since a_1=0, every partial 1/2 complement vanishes and only the
empty/full and full/empty choices survive, with total coefficient -4.  A
positive scale 1/2 on the product of the three directions normalizes the
zero-, one-, and two-event grades to 1,-2,1.

This is an all-order local identity.  The global fixed-grade contraction is
still required.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent


def main() -> None:
    coefficients = [sp.Integer(1 - size) for size in range(4)]
    balanced = sp.expand(sum(
        coefficients[len(subset)] * coefficients[3 - len(subset)]
        for size in range(4)
        for subset in itertools.combinations(range(3), size)
    ))
    desired_full_empty = 2 * coefficients[0] * coefficients[3]
    contaminant = sp.expand(balanced - desired_full_empty)
    assert coefficients == [1, 0, -1, -2]
    assert balanced == -4
    assert desired_full_empty == -4
    assert contaminant == 0

    scale_product = sp.Rational(1, 2)
    normalized = [
        sp.Integer(1),
        sp.expand(balanced * scale_product),
        sp.expand(coefficients[3] ** 2 * scale_product**2),
    ]
    assert normalized == [1, -2, 1]

    report = {
        "status": "ALL_ORDER_THREE_WAY_LOCAL_COMPLETION_PROVED",
        "coefficient_by_subset_size": list(map(str, coefficients)),
        "balanced_one_event_coefficient": str(balanced),
        "partial_complement_contaminant": str(contaminant),
        "positive_direction_product_scale": str(scale_product),
        "normalized_endpoint_grades": list(map(str, normalized)),
        "scope": (
            "Matched-column apolarity reduces the local endpoint event to "
            "three types. Amini's lambda=1 completion then cancels all local "
            "partial complements. Stability of the global fixed-grade cycle "
            "contraction remains required."
        ),
    }
    out = HERE / "three_way_endpoint_completion_after_column_pairing_20260804.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(out)


if __name__ == "__main__":
    main()
