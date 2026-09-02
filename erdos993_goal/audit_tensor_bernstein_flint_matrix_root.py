#!/usr/bin/env python3
"""Independent exact regression audit for the FLINT-matrix Bernstein transform."""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import tensor_bernstein_from_flint
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "tensor_bernstein_flint_matrix_independent_audit_root_20260825.json"
EXPECTED = {
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "certify_rank8_delta4_junction_coupled_box.py":
        "E0B57F44FD5C7A58C48A1841D1352228C2367DDA2C37148DDCE6CE2D59E1C5CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    generator = random.Random(993_20260825)
    cases = coefficient_comparisons = chunk_replays = 0
    maximum_tensor_size = 0
    witnesses = []
    for dimension in range(1, 6):
        context = fmpq_mpoly_ctx.get([f"X{dimension}_{j}" for j in range(dimension)])
        for case_index in range(12):
            degree_caps = tuple(generator.randint(1, 5) for _ in range(dimension))
            data = {}
            target_terms = min(
                math.prod(cap + 1 for cap in degree_caps),
                80,
                4 + 6 * dimension + case_index,
            )
            while len(data) < target_terms:
                monomial = tuple(generator.randint(0, cap) for cap in degree_caps)
                numerator = generator.randint(-10_000, 10_000)
                denominator = generator.randint(1, 997)
                if numerator:
                    data[monomial] = fmpq(numerator, denominator)
            polynomial = context.from_dict(data)
            expected_degrees, expected_coefficients, expected_terms = (
                tensor_bernstein_from_flint(polynomial, dimension)
            )
            maximum_tensor_size = max(maximum_tensor_size, expected_coefficients.size)
            for chunk in (1, 2, 7, 31, 4096):
                degrees, coefficients, terms = tensor_bernstein_from_flint_matrix(
                    polynomial, dimension, chunk_columns=chunk
                )
                assert degrees == expected_degrees
                assert terms == expected_terms
                assert coefficients.shape == expected_coefficients.shape
                for flat_index in range(coefficients.size):
                    assert coefficients.flat[flat_index] == expected_coefficients.flat[flat_index]
                    coefficient_comparisons += 1
                chunk_replays += 1
            cases += 1
            if len(witnesses) < 8:
                witnesses.append(
                    {
                        "dimension": dimension,
                        "case": case_index,
                        "degree_caps": list(degree_caps),
                        "actual_degrees": [int(value) for value in expected_degrees],
                        "terms": int(expected_terms),
                        "tensor_size": int(expected_coefficients.size),
                    }
                )

    payload = {
        "schema": "tensor-bernstein-flint-matrix-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_FLINT_MATRIX_BERNSTEIN_AUDIT",
        "method": (
            "Deterministic random sparse rational polynomials in dimensions "
            "one through five are transformed by both the established dense "
            "axis implementation and the new chunked fmpq_mat implementation. "
            "Every exact tensor coefficient is compared at five chunk sizes."
        ),
        "cases": cases,
        "chunk_replays": chunk_replays,
        "coefficient_comparisons": coefficient_comparisons,
        "maximum_tensor_size": maximum_tensor_size,
        "sample_cases": witnesses,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
