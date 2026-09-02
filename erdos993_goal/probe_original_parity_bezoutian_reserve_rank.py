#!/usr/bin/env python3
"""Test whether the parity Bezoutian is a low-rank reserve perturbation."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation import (
    rank_mod_prime,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    PRIMES,
    reconstruct,
)


def bezout_mod(first: list[int], second: list[int], prime: int) -> list[list[int]]:
    degree = max(len(first), len(second)) - 1
    p = [value % prime for value in first] + [0] * (degree + 1 - len(first))
    q = [value % prime for value in second] + [0] * (degree + 1 - len(second))
    matrix = []
    for a in range(degree):
        row = []
        for j in range(degree):
            value = 0
            for k in range(j + 1):
                high = a + 1 + k
                if high > degree:
                    break
                value += p[high] * q[j - k] - q[high] * p[j - k]
            row.append(value % prime)
        matrix.append(row)
    return matrix


def difference_rank(left, right, scale, prime):
    matrix = [
        [(a - scale * b) % prime for a, b in zip(row_a, row_b)]
        for row_a, row_b in zip(left, right)
    ]
    return rank_mod_prime(matrix, prime)


def audit(record: dict, source: str) -> dict:
    coefficient, reserve = reconstruct(record)
    ce, co = coefficient[0::2], coefficient[1::2]
    re, ro = reserve[0::2], reserve[1::2]
    modular = []
    r = int(record["r"])
    for prime in PRIMES:
        bc = bezout_mod(ce, co, prime)
        br = bezout_mod(re, ro, prime)
        lead_scale = (
            ce[-1] * co[-1]
            * pow((re[-1] * ro[-1]) % prime, -1, prime)
        ) % prime
        constant_scale = (
            ce[0] * co[0]
            * pow((re[0] * ro[0]) % prime, -1, prime)
        ) % prime
        candidates = {
            "one": 1,
            "r_plus_one_squared": (r + 1) ** 2 % prime,
            "leading_product_ratio": lead_scale,
            "constant_product_ratio": constant_scale,
        }
        modular.append({
            "prime": prime,
            "degree": len(bc),
            "reserve_rank": rank_mod_prime(br, prime),
            "original_rank": rank_mod_prime(bc, prime),
            "difference_ranks": {
                name: difference_rank(bc, br, scale, prime)
                for name, scale in candidates.items()
            },
        })
    return {
        "source": source,
        "package": record.get("package"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": r,
        "modular": modular,
    }


def main() -> None:
    available = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        available.extend(
            (record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    selected = [available[index] for index in (1, 0, 2)]
    records = [audit(record, source) for record, source in selected]
    report = {
        "status": "ORIGINAL_PARITY_BEZOUTIAN_RESERVE_RANK_PROBE",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_parity_bezoutian_reserve_rank_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
