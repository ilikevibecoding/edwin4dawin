#!/usr/bin/env python3
"""Independent no-gap multiset audit of the terminal-alpha-two band."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha2_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha2_audit_exact_20260820.json"
RETAINED_RANK = 9


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


def load_first_four() -> tuple[tuple[int, tuple[int, ...]], ...]:
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
    selected = tuple(row for row in rows if row[0] <= 2)
    assert len(selected) == 4
    assert tuple(alpha for alpha, _ in selected) == (1, 1, 2, 2)
    return selected


def product_from_exponents(
    jets: tuple[tuple[int, tuple[int, ...]], ...], exponents: tuple[int, ...]
) -> tuple[int, ...]:
    result = (1,) + (0,) * RETAINED_RANK
    for (_, polynomial), exponent in zip(jets, exponents, strict=True):
        result = multiply(result, power(polynomial, exponent))
    return result


def main() -> int:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA2_BAND"
    assert report["scope"]["certified_cells"] == [
        {"source": 12, "terminal": 2, "total": 14},
        {"source": 13, "terminal": 2, "total": 15},
    ]
    assert report["scope"]["workers"] == 1
    assert report["resources"]["peak_private_bytes"] < 512 * 1024**2
    assert report["hashes"] == {
        JETS.name: digest(JETS),
        CLASSIFICATION.name: digest(CLASSIFICATION),
        SOURCE.name: digest(SOURCE),
    }

    jets = load_first_four()
    audits: dict[str, dict[str, object]] = {}
    aggregate_values: list[int] = []
    for total_alpha in (14, 15):
        source_alpha = total_alpha - 2
        # Enumerate all exponent vectors directly.  At least one alpha2 type
        # is required; its largest nonzero index is the unique canonical
        # terminal type.  Delete one such copy to obtain the source state.
        expected_checks = set()
        multiset_rows = 0
        expected_products = set()
        expected_values: list[int] = []
        for e3 in range(total_alpha // 2 + 1):
            for e4 in range(total_alpha // 2 + 1 - e3):
                remaining = total_alpha - 2 * (e3 + e4)
                if remaining < 0 or e3 + e4 == 0:
                    continue
                for e1 in range(remaining + 1):
                    e2 = remaining - e1
                    exponents = (e1, e2, e3, e4)
                    largest_type = 4 if e4 else 3
                    source_exponents = list(exponents)
                    source_exponents[largest_type - 1] -= 1
                    assert source_exponents[largest_type - 1] >= 0
                    source = product_from_exponents(jets, tuple(source_exponents))
                    product = product_from_exponents(jets, exponents)
                    value = q8(product)
                    expected_checks.add((largest_type, source, product, value))
                    expected_products.add(product)
                    expected_values.append(value)
                    multiset_rows += 1

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
        assert reported_checks == expected_checks
        assert multiset_rows == len(expected_checks)
        assert len(reported_cell["rows"]) == len(reported_checks)
        assert reported_cell["ordered_covering_checks"] == len(expected_checks)
        assert reported_cell["distinct_crossing_jets"] == len(expected_products)
        assert reported_cell["negative_Q8"] == sum(value < 0 for value in expected_values) == 0
        assert reported_cell["zero_Q8"] == sum(value == 0 for value in expected_values) == 0
        assert reported_cell["minimum_Q8"] == min(expected_values)
        assert reported_cell["maximum_Q8"] == max(expected_values)
        aggregate_values.extend(expected_values)
        audits[str(source_alpha)] = {
            "source_alpha": source_alpha,
            "terminal_alpha": 2,
            "total_alpha": total_alpha,
            "independently_enumerated_multisets": multiset_rows,
            "canonical_check_keys": len(expected_checks),
            "distinct_crossing_jets": len(expected_products),
            "source_jet_collisions_within_largest_type": multiset_rows
            - len(expected_checks),
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": min(expected_values),
            "maximum_Q8": max(expected_values),
        }

    assert audits["12"]["independently_enumerated_multisets"] == 189
    assert audits["13"]["independently_enumerated_multisets"] == 224
    assert report["aggregate"]["ordered_covering_checks"] == 413
    assert report["aggregate"]["negative_Q8"] == 0
    assert report["aggregate"]["zero_Q8"] == 0

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha2-independent-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA2_AUDIT",
        "method": (
            "enumerate every exponent vector of the two alpha1 and two alpha2 "
            "types at total alpha14 and15, assign its unique largest alpha2 type, "
            "delete one terminal copy, and compare the exact source/product/Q8 key"
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
            "negative_Q8": sum(value < 0 for value in aggregate_values),
            "zero_Q8": sum(value == 0 for value in aggregate_values),
            "minimum_Q8": min(aggregate_values),
            "maximum_Q8": max(aggregate_values),
        },
        "scope_warning": (
            "This no-gap audit covers only terminal alpha2; terminal-alpha bands "
            "3 through 9 remain."
        ),
        "hashes": {
            REPORT.name: digest(REPORT),
            SOURCE.name: digest(SOURCE),
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("multisets=413 checks=413 negative=0 zero=0")
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
