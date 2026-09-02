#!/usr/bin/env python3
"""Isolate the exact chunk-size-dependent Bernstein coefficient at corner (5,13).

This diagnostic rebuilds the mapped large-order adjacent-g2 polynomial once,
runs the FLINT-matrix tensor transform with two column blockings, and evaluates
every differing Bernstein coordinate directly from the monomial formula.  It
is deliberately separate from all theorem artifacts.
"""

from __future__ import annotations

import hashlib
import json
import math
import gc
from pathlib import Path

import numpy as np
from flint import fmpq, fmpq_mpoly_ctx

from probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt import (
    a_ratio_row,
    compactify,
    row_corner,
    scaled_a2,
    scaled_k2,
    scaled_l2,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from certify_rank8_delta4_junction_coupled_box import (
    tensor_bernstein_from_flint as tensor_bernstein_slow_reference,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n5_g2_adjacent_chunk_dependency_diagnostic_"
    "rank5_g2_alt_20260830.json"
)
MARKER = "DIAGNOSTIC_EXACT_ISO_N5_G2_ADJACENT_CHUNK_DEPENDENCY_RANK5_G2_ALT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def direct_bernstein_coefficient(mapped_terms, degrees, beta):
    """Evaluate one tensor Bernstein coefficient directly from monomials."""
    total = fmpq(0)
    contributing = 0
    for alpha, coefficient in mapped_terms:
        if all(alpha[axis] <= beta[axis] for axis in range(len(degrees))):
            term = coefficient
            for axis, degree in enumerate(degrees):
                exponent = alpha[axis]
                term *= fmpq(
                    math.comb(beta[axis], exponent),
                    math.comb(degree, exponent),
                )
            total += term
            contributing += 1
    return total, contributing


def coefficient_stream(values) -> str:
    digest = hashlib.sha256()
    for value in values.flat:
        digest.update(f"{value};".encode())
    return digest.hexdigest().upper()


def build_corner():
    source_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "r3", "p", "q"), "degrevlex"
    )
    s, z, r0, r1, r2, r3, p, q = source_context.gens()
    one = source_context.constant(1)
    mb = 7 + p
    mc = 7 + p + q
    overlap = mb * s
    n = mb + mc - overlap
    edges = overlap * z
    R1 = 2 * n * (n - 1) - 4 * edges
    budget = R1 - 3 * n
    T = budget * r0
    D4 = budget * (1 - r0) * r1
    D3 = budget * (1 - r0) * (1 - r1) * r2
    D2 = budget * (1 - r0) * (1 - r1) * (1 - r2) * r3
    D1 = budget * (1 - r0) * (1 - r1) * (1 - r2) * (1 - r3)
    R5 = T
    R4 = T + n + D4
    R3 = T + 2 * n + D4 + D3
    R2 = T + 3 * n + D4 + D3 + D2
    assert T + 3 * n + D4 + D3 + D2 + D1 == R1
    arow = a_ratio_row(n, (R1, R2, R3, R4, R5))
    brow = row_corner(mb, 5, one)
    crow = row_corner(mc, 13, one)
    source = (
        scaled_a2(arow, n)
        + scaled_l2(arow, brow, n)
        + scaled_l2(arow, crow, n)
        + scaled_k2(brow, crow, n)
    )
    target_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "r3", "P", "Q"), "degrevlex"
    )
    mapped, degree_p, degree_q, source_terms = compactify(source, target_context)
    return mapped, degree_p, degree_q, source_terms


def main() -> None:
    mapped, degree_p, degree_q, source_terms = build_corner()
    mapped_terms = list(mapped.terms())
    degrees_4096, coefficients_4096, replay_terms_4096 = (
        tensor_bernstein_from_flint_matrix(mapped, 8, chunk_columns=4096)
    )
    degrees_8192, coefficients_8192, replay_terms_8192 = (
        tensor_bernstein_from_flint_matrix(mapped, 8, chunk_columns=8192)
    )
    assert degrees_4096 == degrees_8192
    assert replay_terms_4096 == replay_terms_8192 == len(mapped_terms)
    assert coefficients_4096.shape == coefficients_8192.shape
    degrees = tuple(map(int, degrees_4096))

    differences = []
    for flat_index in range(coefficients_4096.size):
        value_4096 = coefficients_4096.flat[flat_index]
        value_8192 = coefficients_8192.flat[flat_index]
        if value_4096 == value_8192:
            continue
        beta = tuple(map(int, np.unravel_index(flat_index, coefficients_4096.shape)))
        direct, contributing = direct_bernstein_coefficient(mapped_terms, degrees, beta)
        assert direct == value_4096 or direct == value_8192
        differences.append({
            "flat_index": flat_index,
            "tensor_index": list(beta),
            "chunk4096": str(value_4096),
            "chunk8192": str(value_8192),
            "direct_reference": str(direct),
            "direct_matches": (
                "4096" if direct == value_4096 and direct != value_8192
                else "8192" if direct == value_8192 and direct != value_4096
                else "both"
            ),
            "contributing_monomials": contributing,
        })

    chunk4096_summary = {
        "stream_sha256": coefficient_stream(coefficients_4096),
        "negative": sum(value < 0 for value in coefficients_4096.flat),
        "zero": sum(value == 0 for value in coefficients_4096.flat),
        "minimum": str(min(coefficients_4096.flat)),
    }
    chunk8192_summary = {
        "stream_sha256": coefficient_stream(coefficients_8192),
        "negative": sum(value < 0 for value in coefficients_8192.flat),
        "zero": sum(value == 0 for value in coefficients_8192.flat),
        "minimum": str(min(coefficients_8192.flat)),
    }

    # The slow reference uses independent axis-by-axis scalar fmpq arithmetic,
    # not FLINT matrix multiplication or column blocking.
    del coefficients_8192
    gc.collect()
    degrees_reference, coefficients_reference, replay_terms_reference = (
        tensor_bernstein_slow_reference(mapped, 8)
    )
    assert tuple(map(int, degrees_reference)) == degrees
    assert replay_terms_reference == len(mapped_terms)
    reference_differences = []
    for flat_index in range(coefficients_4096.size):
        matrix_value = coefficients_4096.flat[flat_index]
        reference_value = coefficients_reference.flat[flat_index]
        if matrix_value == reference_value:
            continue
        beta = tuple(map(int, np.unravel_index(flat_index, coefficients_4096.shape)))
        direct, contributing = direct_bernstein_coefficient(mapped_terms, degrees, beta)
        assert direct == reference_value
        reference_differences.append({
            "flat_index": flat_index,
            "tensor_index": list(beta),
            "matrix4096": str(matrix_value),
            "slow_reference": str(reference_value),
            "direct_reference": str(direct),
            "contributing_monomials": contributing,
        })

    report = {
        "marker": MARKER,
        "corner": {"B_mask": 5, "C_mask": 13, "global_index": 93},
        "source_terms": source_terms,
        "mapped_terms": len(mapped_terms),
        "compactification_degrees_p_q": [degree_p, degree_q],
        "bernstein_degrees": list(degrees),
        "bernstein_coefficients": int(coefficients_4096.size),
        "chunk4096": chunk4096_summary,
        "chunk8192": chunk8192_summary,
        "differing_coefficients": len(differences),
        "differences": differences,
        "slow_axis_reference": {
            "stream_sha256": coefficient_stream(coefficients_reference),
            "negative": sum(value < 0 for value in coefficients_reference.flat),
            "zero": sum(value == 0 for value in coefficients_reference.flat),
            "minimum": str(min(coefficients_reference.flat)),
            "differences_from_matrix4096": len(reference_differences),
        },
        "slow_reference_differences": reference_differences,
        "admission": "none; diagnostic only",
        "dependencies_sha256": {
            "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py": sha256(
                HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
            ),
            "tensor_bernstein_flint_matrix_root.py": sha256(
                HERE / "tensor_bernstein_flint_matrix_root.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "differing_coefficients": len(differences),
        "differences": differences,
        "chunk4096": report["chunk4096"],
        "chunk8192": report["chunk8192"],
        "slow_axis_reference": report["slow_axis_reference"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
