#!/usr/bin/env python3
"""Inspect exact signed Sturm/Jacobi chains of the parity parts.

For an even-degree polynomial, start with the monic even and odd parity
parts.  For odd degree, first cancel the common leading term of the two
same-degree parts.  Repeated negative Euclidean remainders yield

    P_k = Q_k P_{k+1} - b_k P_{k+2}.

Positive b_k throughout is the classical finite Jacobi/interlacing
certificate.  This diagnostic records where sign defects occur.
"""

from __future__ import annotations

import json
from pathlib import Path

from flint import fmpq_poly

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    reconstruct,
)


def monic(poly: fmpq_poly) -> fmpq_poly:
    return poly / poly[poly.degree()]


def sign(value) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0


def sign_word(values) -> list[int]:
    result = []
    for value in values:
        current = sign(value)
        if current and (not result or result[-1] != current):
            result.append(current)
    return result


def audit(record: dict, source: str) -> dict:
    coefficient, _ = reconstruct(record)
    even_raw = fmpq_poly(coefficient[0::2])
    odd_raw = fmpq_poly(coefficient[1::2])
    even = monic(even_raw)
    odd = monic(odd_raw)
    degree = len(coefficient) - 1

    if even.degree() == odd.degree():
        cancelled = odd - even
        if cancelled.is_zero():
            raise AssertionError("identical parity parts")
        first = even
        second = monic(cancelled)
        initial_cancellation = "monic_odd_minus_monic_even"
    else:
        first, second = even, odd
        initial_cancellation = "none"

    quotient_degrees = []
    b_values = []
    q_constant_signs = []
    chain_degrees = [first.degree(), second.degree()]
    while second.degree() >= 1:
        quotient, remainder = divmod(first, second)
        negative_remainder = -remainder
        if negative_remainder.is_zero():
            break
        b_value = negative_remainder[negative_remainder.degree()]
        quotient_degrees.append(quotient.degree())
        b_values.append(b_value)
        q_constant_signs.append(sign(quotient[0]))
        following = negative_remainder / b_value
        chain_degrees.append(following.degree())
        first, second = second, following

    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": degree,
        "initial_cancellation": initial_cancellation,
        "chain_degrees": chain_degrees,
        "all_degree_drops_one": all(
            chain_degrees[j + 1] == chain_degrees[j] - 1
            for j in range(len(chain_degrees) - 1)
        ),
        "quotient_degrees": quotient_degrees,
        "b_sign_word": sign_word(b_values),
        "b_nonpositive_indices": [
            j for j, value in enumerate(b_values) if value <= 0
        ],
        "q_constant_sign_word": sign_word(q_constant_signs),
        "first_b_values": [str(value) for value in b_values[:3]],
        "last_b_values": [str(value) for value in b_values[-3:]],
    }


def main() -> None:
    records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        for record in candidates:
            if "ell_values" not in record or int(record["r"]) > 30:
                continue
            records.append(audit(record, path.name))
    report = {
        "status": "PARITY_STURM_CHAIN_DIAGNOSTIC",
        "case_count": len(records),
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_parity_sturm_chain_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
