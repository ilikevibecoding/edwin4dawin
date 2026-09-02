#!/usr/bin/env python3
"""Explore the exact two-term Schur decomposition of the group Q^2 kernel.

This is reconnaissance, not a proof.  It verifies the block algebra against
the direct group Schur complement and records the finite sign/rank structure
of the newly isolated core correction.
"""

from __future__ import annotations

import json
from collections import Counter
from itertools import combinations
from pathlib import Path

import sympy as sp

from probe_group_catalan_square_core import matrix, schur_tail
from prove_scaled_bottom_kernel_network import (
    binomial_antidiagonal,
    catalan_u_toeplitz,
)


OUT = Path("group_nested_schur_decomposition_probe_20260803.json")


def sign_pattern(a: sp.Matrix) -> list[str]:
    return [
        "".join("+" if x > 0 else "-" if x < 0 else "0" for x in row)
        for row in a.tolist()
    ]


def minor_sign_counts(a: sp.Matrix) -> dict[str, dict[str, int]]:
    records = {}
    for order in range(1, a.rows + 1):
        counts = Counter()
        for rows in combinations(range(a.rows), order):
            for columns in combinations(range(a.cols), order):
                value = a.extract(rows, columns).det()
                counts["+" if value > 0 else "-" if value < 0 else "0"] += 1
        records[str(order)] = dict(counts)
    return records


def rectangular_minor_sign_counts(a: sp.Matrix) -> dict[str, dict[str, int]]:
    records = {}
    for order in range(1, min(a.rows, a.cols) + 1):
        counts = Counter()
        for rows in combinations(range(a.rows), order):
            for columns in combinations(range(a.cols), order):
                value = a.extract(rows, columns).det()
                counts["+" if value > 0 else "-" if value < 0 else "0"] += 1
        records[str(order)] = dict(counts)
    return records


def diagonal_equivalence(left: sp.Matrix, right: sp.Matrix) -> dict:
    """Test left=diag(r)*right*diag(c), normalized by r_0=1."""
    if left.shape != right.shape or any(value == 0 for value in right):
        return {"holds": False}
    columns = [sp.factor(left[0, j] / right[0, j]) for j in range(left.cols)]
    rows = [
        sp.factor(left[i, 0] / (right[i, 0] * columns[0]))
        for i in range(left.rows)
    ]
    holds = all(
        sp.factor(left[i, j] - rows[i] * right[i, j] * columns[j]) == 0
        for i in range(left.rows)
        for j in range(left.cols)
    )
    return {
        "holds": holds,
        "row_scales_positive": holds and all(value > 0 for value in rows),
        "column_scales_positive": holds and all(value > 0 for value in columns),
        "row_scales": [str(value) for value in rows] if holds else [],
        "column_scales": [str(value) for value in columns] if holds else [],
    }


def exact_inertia_from_leading_ldl(a: sp.Matrix) -> list[int]:
    """Exact inertia when all natural-order leading pivots are nonzero."""
    previous = sp.Integer(1)
    positive = negative = 0
    for order in range(1, a.rows + 1):
        determinant = sp.factor(a[:order, :order].det())
        assert determinant != 0
        pivot = sp.factor(determinant / previous)
        if pivot > 0:
            positive += 1
        else:
            negative += 1
        previous = determinant
    return [positive, negative, 0]


def one_case(m: int) -> dict:
    d = 2 * m + 5
    e = d - 2
    n = 3 * m + 5
    size = n + 1

    toeplitz = catalan_u_toeplitz(n)
    b_group = binomial_antidiagonal(d, n)
    p_scaled = binomial_antidiagonal(e, n) + sp.Matrix(
        matrix(e, power=1, limit=n)
    )
    group = b_group - toeplitz * p_scaled * toeplitz.T
    direct = sp.Matrix(matrix(d, power=2, limit=n))
    assert group == direct

    observed = list(range(d + 1))
    group_tail = list(range(d + 1, size))
    p_core = list(range(e + 1))
    p_tail = list(range(e + 1, size))

    b0 = b_group.extract(observed, observed)
    t0 = toeplitz.extract(observed, list(range(size)))
    t1 = toeplitz.extract(group_tail, list(range(size)))
    correction_full = t0.T * b0.inv() * t0
    assert correction_full[e + 1 :, :] == sp.zeros(size - e - 1, size)
    assert correction_full[:, e + 1 :] == sp.zeros(size, size - e - 1)
    correction = correction_full.extract(p_core, p_core)

    pcc = p_scaled.extract(p_core, p_core)
    pcf = p_scaled.extract(p_core, p_tail)
    pfc = p_scaled.extract(p_tail, p_core)
    pff = p_scaled.extract(p_tail, p_tail)
    sigma_p = pff - pfc * pcc.inv() * pcf
    h = pfc * pcc.inv()
    core_inverse = (pcc.inv() - correction).inv()

    t1c = t1.extract(range(m), p_core)
    t1f = t1.extract(range(m), p_tail)
    adjusted = t1c + t1f * h
    core_term = -adjusted * core_inverse * adjusted.T
    inherited_term = -t1f * sigma_p * t1f.T
    reconstructed = core_term + inherited_term
    sigma_group = schur_tail(direct, d)
    assert reconstructed == sigma_group

    reversal = sp.eye(m)[:, ::-1]
    reversed_group = sigma_group * reversal
    reversed_core = core_term * reversal
    reversed_inherited = inherited_term * reversal

    standard_limit = e + m
    standard_scaled = binomial_antidiagonal(e, standard_limit) + sp.Matrix(
        matrix(e, power=1, limit=standard_limit)
    )
    standard_reversed_tail = -schur_tail(standard_scaled, e)[:, ::-1]

    return {
        "m": m,
        "d": d,
        "scaled_bottom_tail_size": len(p_tail),
        "group_tail_size": m,
        "core_correction_rank": int(correction.rank()),
        "isolated_core_inverse_rank": int(core_inverse.rank()),
        "adjusted_outer_rank": int(adjusted.rank()),
        "core_term_rank": int(core_term.rank()),
        "inherited_term_rank": int(inherited_term.rank()),
        "group_term_rank": int(sigma_group.rank()),
        "core_term_exact_inertia": exact_inertia_from_leading_ldl(core_term),
        "inherited_term_exact_inertia": exact_inertia_from_leading_ldl(inherited_term),
        "group_term_exact_inertia": exact_inertia_from_leading_ldl(sigma_group),
        "reversed_core_signs": sign_pattern(reversed_core),
        "reversed_inherited_signs": sign_pattern(reversed_inherited),
        "reversed_group_signs": sign_pattern(reversed_group),
        "reversed_core_minor_sign_counts": minor_sign_counts(reversed_core),
        "reversed_inherited_minor_sign_counts": minor_sign_counts(reversed_inherited),
        "tail_toeplitz_minor_sign_counts": rectangular_minor_sign_counts(t1f),
        "reversed_tail_toeplitz_minor_sign_counts": rectangular_minor_sign_counts(
            reversal * t1f * sp.eye(len(p_tail))[:, ::-1]
        ),
        "inherited_vs_standard_scaled_bottom_diagonal_equivalence": (
            diagonal_equivalence(reversed_inherited, standard_reversed_tail)
        ),
        "determinant_signs": {
            "core": int(sp.sign(reversed_core.det())),
            "inherited": int(sp.sign(reversed_inherited.det())),
            "group": int(sp.sign(reversed_group.det())),
        },
    }


def main() -> None:
    records = [one_case(m) for m in range(1, 8)]
    report = {
        "status": "PASS_EXACT_NESTED_SCHUR_DECOMPOSITION_FINITE_PROBE",
        "identity": (
            "Sigma_group=-Ttilde K Ttilde^T-Ttail Sigma_scaled Ttail^T, "
            "K=(Pcc^{-1}-E)^{-1}, Ttilde=Tc+Ttail Pfc Pcc^{-1}"
        ),
        "records": records,
        "scope": "The block identity is general algebra; sign/rank records are finite reconnaissance.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
