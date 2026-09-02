#!/usr/bin/env python3
"""Independent no-gap multiset audit of the terminal-alpha-three band."""

from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha3_exact.py"
SOURCE_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha3_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha3_audit_exact_20260820.json"
RETAINED_RANK = 9
TERMINAL_ALPHA = 3


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(
    left: tuple[int, ...], right: tuple[int, ...]
) -> tuple[int, ...]:
    return tuple(
        sum(left[index] * right[rank - index] for index in range(rank + 1))
        for rank in range(RETAINED_RANK + 1)
    )


def power(polynomial: tuple[int, ...], exponent: int) -> tuple[int, ...]:
    result = (1,) + (0,) * RETAINED_RANK
    base = polynomial
    while exponent:
        if exponent & 1:
            result = multiply(result, base)
        exponent >>= 1
        if exponent:
            base = multiply(base, base)
    return result


def q8(polynomial: tuple[int, ...]) -> int:
    return (
        16 * polynomial[8] * polynomial[8]
        - polynomial[7] * polynomial[8]
        - 18 * polynomial[7] * polynomial[9]
    )


def load_first_nine() -> tuple[tuple[int, tuple[int, ...]], ...]:
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            rows.append(
                (
                    int(row["alpha"]),
                    tuple(int(row[f"i{rank}"]) for rank in range(10)),
                )
            )
    assert len(rows) == 1215
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == 9
    assert tuple(alpha for alpha, _ in selected) == (1, 1, 2, 2, 3, 3, 3, 3, 3)
    return selected


def exponent_vectors(
    weights: tuple[int, ...], total: int, index: int = 0, prefix: tuple[int, ...] = ()
):
    if index == len(weights) - 1:
        weight = weights[index]
        if total % weight == 0:
            yield prefix + (total // weight,)
        return
    weight = weights[index]
    for exponent in range(total // weight + 1):
        yield from exponent_vectors(
            weights, total - exponent * weight, index + 1, prefix + (exponent,)
        )


def product_from_exponents(
    jets: tuple[tuple[int, tuple[int, ...]], ...], exponents: tuple[int, ...]
) -> tuple[int, ...]:
    result = (1,) + (0,) * RETAINED_RANK
    for (_, polynomial), exponent in zip(jets, exponents, strict=True):
        result = multiply(result, power(polynomial, exponent))
    return result


def main() -> int:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA3_BAND"
    assert report["scope"]["certified_cells"] == [
        {"source": 11, "terminal": 3, "total": 14},
        {"source": 12, "terminal": 3, "total": 15},
        {"source": 13, "terminal": 3, "total": 16},
    ]
    assert report["scope"]["workers"] == 1
    assert report["resources"]["peak_private_bytes"] < 512 * 1024**2
    assert report["hashes"] == {
        JETS.name: digest(JETS),
        CLASSIFICATION.name: digest(CLASSIFICATION),
        SOURCE_DEPENDENCY.name: digest(SOURCE_DEPENDENCY),
        SOURCE.name: digest(SOURCE),
    }

    jets = load_first_nine()
    weights = tuple(alpha for alpha, _ in jets)
    audits: dict[str, dict[str, object]] = {}
    aggregate_values = []
    for total_alpha in (14, 15, 16):
        source_alpha = total_alpha - TERMINAL_ALPHA
        canonical_key_counts: Counter[tuple[object, ...]] = Counter()
        product_key_counts: Counter[tuple[int, ...]] = Counter()
        multiset_count = 0

        for exponents in exponent_vectors(weights, total_alpha):
            nonzero_terminal_indices = [
                index for index in range(4, 9) if exponents[index] > 0
            ]
            if not nonzero_terminal_indices:
                continue
            largest_zero_based = max(nonzero_terminal_indices)
            largest_type = largest_zero_based + 1
            source_exponents = list(exponents)
            source_exponents[largest_zero_based] -= 1
            assert source_exponents[largest_zero_based] >= 0
            source = product_from_exponents(jets, tuple(source_exponents))
            product = product_from_exponents(jets, exponents)
            value = q8(product)
            key = (largest_type, source, product, value)
            canonical_key_counts[key] += 1
            product_key_counts[product] += 1
            multiset_count += 1

        reported_cell = report["cells"][str(source_alpha)]
        reported_checks = {
            (
                int(row["canonical_largest_type_index"]),
                tuple(row["source_i0_through_i9"]),
                tuple(row["product_i0_through_i9"]),
                int(row["Q8"]),
            )
            for row in reported_cell["rows"]
        }
        assert reported_checks == set(canonical_key_counts)
        assert len(reported_cell["rows"]) == len(reported_checks)

        # Recount final products from canonical checks, not raw multisets.
        canonical_product_counts = Counter(key[2] for key in canonical_key_counts)
        canonical_values = [int(key[3]) for key in canonical_key_counts]
        assert all(q8(product) == value for _, _, product, value in canonical_key_counts)
        assert reported_cell["ordered_covering_checks"] == len(canonical_key_counts)
        assert reported_cell["distinct_crossing_jets"] == len(canonical_product_counts)
        assert reported_cell["crossing_product_collisions"] == (
            len(canonical_key_counts) - len(canonical_product_counts)
        )
        assert reported_cell["negative_Q8"] == sum(value < 0 for value in canonical_values) == 0
        assert reported_cell["zero_Q8"] == sum(value == 0 for value in canonical_values) == 0
        assert reported_cell["minimum_Q8"] == min(canonical_values)
        assert reported_cell["maximum_Q8"] == max(canonical_values)
        aggregate_values.extend(canonical_values)

        multiset_to_check_collisions = multiset_count - len(canonical_key_counts)
        check_to_product_collisions = len(canonical_key_counts) - len(canonical_product_counts)
        audits[str(source_alpha)] = {
            "source_alpha": source_alpha,
            "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha": total_alpha,
            "independently_enumerated_multisets": multiset_count,
            "canonical_check_keys": len(canonical_key_counts),
            "distinct_crossing_jets": len(canonical_product_counts),
            "multiset_to_canonical_key_collisions": multiset_to_check_collisions,
            "canonical_key_to_product_collisions": check_to_product_collisions,
            "maximum_multisets_per_canonical_key": max(canonical_key_counts.values()),
            "maximum_multisets_per_product": max(product_key_counts.values()),
            "maximum_canonical_keys_per_product": max(canonical_product_counts.values()),
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": min(canonical_values),
            "maximum_Q8": max(canonical_values),
        }

    expected = {
        "11": (2435, 2179, 1864, 256, 315),
        "12": (3486, 3071, 2624, 415, 447),
        "13": (4837, 4172, 3547, 665, 625),
    }
    for source, values in expected.items():
        cell = audits[source]
        assert (
            cell["independently_enumerated_multisets"],
            cell["canonical_check_keys"],
            cell["distinct_crossing_jets"],
            cell["multiset_to_canonical_key_collisions"],
            cell["canonical_key_to_product_collisions"],
        ) == values

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha3-independent-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA3_AUDIT",
        "method": (
            "enumerate every exponent vector of the nine alpha<=3 types at total "
            "alpha14,15,16; assign the unique largest alpha3 type; delete one copy; "
            "and compare each exact canonical source/product/Q8 key"
        ),
        "cells": audits,
        "aggregate": {
            "independently_enumerated_multisets": sum(
                int(cell["independently_enumerated_multisets"])
                for cell in audits.values()
            ),
            "canonical_check_keys": sum(
                int(cell["canonical_check_keys"]) for cell in audits.values()
            ),
            "distinct_cell_crossing_jets_sum": sum(
                int(cell["distinct_crossing_jets"]) for cell in audits.values()
            ),
            "multiset_to_canonical_key_collisions": sum(
                int(cell["multiset_to_canonical_key_collisions"])
                for cell in audits.values()
            ),
            "canonical_key_to_product_collisions": sum(
                int(cell["canonical_key_to_product_collisions"])
                for cell in audits.values()
            ),
            "negative_Q8": sum(value < 0 for value in aggregate_values),
            "zero_Q8": sum(value == 0 for value in aggregate_values),
            "minimum_Q8": min(aggregate_values),
            "maximum_Q8": max(aggregate_values),
        },
        "scope_warning": (
            "This no-gap audit covers only terminal alpha3; terminal-alpha bands "
            "4 through 9 remain."
        ),
        "hashes": {
            REPORT.name: digest(REPORT),
            SOURCE.name: digest(SOURCE),
            SOURCE_DEPENDENCY.name: digest(SOURCE_DEPENDENCY),
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        "multisets=10758 checks=9422 products_cell_sum=8035 "
        "multiset_key_collisions=1336 key_product_collisions=1387 negative=0 zero=0"
    )
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
