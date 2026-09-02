#!/usr/bin/env python3
"""Test the most direct partial-symmetrization parent for the endpoint sum.

Let P_ij(X,Y) be the stable polynomial obtained after fixing the two
distinguished deletion slots and averaging the remaining d-2 deletions.  If

    sum_{i<j} P_ij(X,Y) u_i u_j

were real stable, setting every u_i=1 would prove the endpoint sum stable.
For positive real X,Y, its homogeneous quadratic coefficient form must have
at most one positive eigenvalue.  This numerical inertia test is a cheap
adversarial check of that proposed parent.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from probe_distinguished_pair_prefix_interlacing import (
    actual_leaf_data,
    prefix_line_polynomials,
)


OUT = Path("distinguished_pair_lorentzian_parent_probe_20260803.json")


def main() -> None:
    records = []
    # Larger endpoints require higher-precision algebraic leaf division, but
    # m=1 already supplies a decisive numerical inertia obstruction and m=2
    # independently repeats it.
    for m in range(1, 3):
        N = 3 * m + 3
        d = 2 * m + 3
        a, g, roots, weights = actual_leaf_data(N)
        for X, Y in ((0, 0), (1, 1), (1, 7), (7, 1), (10, 30)):
            prefixes = prefix_line_polynomials(
                N, d, a, g, roots, weights, (X, 0, Y, 0)
            )
            form = np.zeros((2 * N, 2 * N), dtype=float)
            minimum_coefficient = float("inf")
            for (i, j), polynomial in prefixes.items():
                coefficient = float(polynomial.coef[0])
                minimum_coefficient = min(minimum_coefficient, coefficient)
                form[i, j] = coefficient
                form[j, i] = coefficient
            eigenvalues = np.linalg.eigvalsh(form)
            tolerance = max(1.0, np.max(np.abs(eigenvalues))) * 1e-9
            positive = int(np.sum(eigenvalues > tolerance))
            record = {
                "m": m,
                "N": N,
                "d": d,
                "X": X,
                "Y": Y,
                "minimum_coefficient": minimum_coefficient,
                "positive_eigenvalues": positive,
                "largest_eigenvalues": eigenvalues[-5:].tolist(),
            }
            records.append(record)
            print(record, flush=True)
    failed = [record for record in records if record["positive_eigenvalues"] > 1]
    report = {
        "kind": "distinguished_pair_quadratic_parent_lorentzian_probe",
        "status": "NUMERICAL_OBSTRUCTION" if failed else "NO_OBSTRUCTION_FOUND",
        "cases": len(records),
        "obstructions": len(failed),
        "scope": (
            "Numerical inertia is route-selection evidence.  A case with more "
            "than one positive eigenvalue disproves the direct quadratic stable "
            "parent once replayed with exact/algebraic arithmetic."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
