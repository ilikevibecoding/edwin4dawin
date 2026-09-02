#!/usr/bin/env python3
"""Extract the actual positive Jacobi couplings behind the proved Schur tails."""

from __future__ import annotations

import json
from pathlib import Path

from derive_group_fifth_homogeneous_tail_schur_flint import (
    ZERO,
    derive as derive_quartic,
    polynomial_add,
    polynomial_scale,
    polynomial_y_minus,
)
from derive_group_seventh_homogeneous_tail_schur_flint import (
    derive as derive_quintic,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_schur_tail_jacobi_parameters_20260804.json"


def tail_for_layer(layer: int):
    if layer in (4, 5):
        A, B, _ = derive_quartic("even", layer=layer)
    elif layer in (6, 7):
        A, B, _, _ = derive_quintic("even", layer=layer)
    else:
        raise ValueError(layer)
    return A, B


def extract(A, B):
    next_polynomial = A
    current = B
    diagonals = []
    couplings = []
    while len(current) > 1:
        degree = len(current) - 1
        diagonal = current[degree - 1] - next_polynomial[degree]
        residual = polynomial_add(
            polynomial_y_minus(current, diagonal),
            polynomial_scale(next_polynomial, -1),
        )
        coupling = residual[degree - 1]
        assert coupling
        previous = [value / coupling for value in residual]
        while len(previous) > 1 and not previous[-1]:
            previous.pop()
        assert len(previous) == degree and previous[-1].num == previous[-1].den
        diagonals.append(diagonal)
        couplings.append(coupling)
        next_polynomial, current = current, previous
    diagonals.append(-next_polynomial[0])
    return diagonals, couplings


def main() -> None:
    layers = []
    for layer in range(4, 8):
        A, B = tail_for_layer(layer)
        diagonals, couplings = extract(A, B)
        coupling_records = []
        for index, coupling in enumerate(couplings):
            numerator_positive = all(value > 0 for value in coupling.num.coeffs())
            denominator_positive = all(value > 0 for value in coupling.den.coeffs())
            assert numerator_positive and denominator_positive
            coupling_records.append(
                {
                    "tail_index_from_top": index,
                    "numerator_terms": len(list(coupling.num.terms())),
                    "denominator_terms": len(list(coupling.den.terms())),
                    "numerator_factorization": str(coupling.num.factor()),
                    "denominator_factorization": str(coupling.den.factor()),
                }
            )
        layers.append(
            {
                "layer_deficit": layer,
                "tail_order": len(A) - 1,
                "diagonal_count": len(diagonals),
                "positive_couplings": coupling_records,
            }
        )
        print(
            layer,
            [(r["numerator_terms"], r["denominator_terms"]) for r in coupling_records],
            flush=True,
        )
    report = {
        "status": "EXACT_POSITIVE_JACOBI_TAIL_PARAMETERS",
        "layers": layers,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
