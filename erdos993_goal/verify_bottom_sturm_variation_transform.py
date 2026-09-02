#!/usr/bin/env python3
"""Test the TP transform behind the Bernstein Sturm coefficients.

Writing the Bernstein coefficient matrix as

    (Delta Tau) X,  X = K J Tau^T C_Bern,

the adjacent rows Delta Tau each have exactly one sign change.  Strict reverse
total positivity of X, equivalently strict total positivity of XJ, would
therefore give a variation-diminishing route to the observed constant-sign
Bernstein rows, once their endpoint orientation is controlled.  This script
audits the candidate transform exactly; it does not claim an all-size theorem.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    neville_parameters,
    reverse_identity,
)


OUT = Path("bottom_sturm_variation_transform_obstruction_certificate_20260803.json")


def transform(d: int) -> sp.Matrix:
    q = d - 1
    degree = q - 1
    bernstein = sp.Matrix(
        q,
        q,
        lambda power, index: (
            sp.binomial(index, power) / sp.binomial(degree, power)
            if power <= index
            else 0
        ),
    )
    K = central_inverse_from_blocks(d).inv()
    return sp.simplify(
        K * reverse_identity(q) * super_ballot(q).T * bernstein
    )


def main() -> None:
    exhaustive_positive_minors = 0
    positive_neville_parameters = 0
    records = []
    first_failure = None

    for d in range(3, 17):
        raw = transform(d)
        q = d - 1
        assert all(value > 0 for value in raw)
        matrix = raw * reverse_identity(q)

        local_exhaustive = 0
        if d <= 8:
            for order in range(1, q + 1):
                for rows in itertools.combinations(range(q), order):
                    for columns in itertools.combinations(range(q), order):
                        value = sp.factor(matrix.extract(rows, columns).det())
                        if value <= 0 and first_failure is None:
                            first_failure = {
                                "d": d,
                                "rows": rows,
                                "columns": columns,
                                "determinant": str(value),
                            }
                        if value > 0:
                            local_exhaustive += 1
            exhaustive_positive_minors += local_exhaustive

        row_mult, row_pivots = neville_parameters(matrix)
        col_mult, col_pivots = neville_parameters(matrix.T)
        parameters = row_mult + row_pivots + col_mult + col_pivots
        if all(value > 0 for value in parameters):
            positive_neville_parameters += len(parameters)
        elif first_failure is None:
            first_failure = {"d": d, "kind": "nonpositive_neville_parameter"}

        records.append(
            {
                "d": d,
                "size": q,
                "exhaustive_positive_minors_if_d_le_8": local_exhaustive,
                "all_complete_neville_parameters_positive": all(
                    value > 0 for value in parameters
                ),
            }
        )

    assert first_failure is not None
    assert first_failure["d"] == 4
    status = "PASS_EXACT_STURM_VARIATION_TRANSFORM_OBSTRUCTION"
    report = {
        "kind": "bottom_sturm_variation_transform_obstruction_certificate",
        "status": status,
        "d_range": [3, 16],
        "exhaustive_range": [3, 8],
        "exhaustive_positive_minors": exhaustive_positive_minors,
        "positive_complete_neville_parameters": positive_neville_parameters,
        "first_failure": first_failure,
        "scope": (
            "The proposed reverse-TP transform is false: XJ has the recorded "
            "negative 2-by-2 minor already at d=4. Therefore ordinary variation "
            "diminution cannot prove the Bernstein sign lemma through this factor."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status)
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
