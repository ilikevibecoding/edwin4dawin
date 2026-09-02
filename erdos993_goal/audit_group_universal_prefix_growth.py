#!/usr/bin/env python3
"""Audit the exact universal-prefix/exceptional-suffix Jacobi growth law."""

from __future__ import annotations

import argparse
import json
import sys
from fractions import Fraction
from pathlib import Path


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

HERE = Path(__file__).resolve().parent


def expected(layer: int, index: int, alpha: int, slack: int) -> Fraction:
    t = 2 * index + 2 * ((layer + 1) // 2) + 2
    return Fraction(
        (alpha + slack + t)
        * (alpha + slack + t + 1)
        * (3 * alpha + slack + t)
        * (3 * alpha + slack + t + 1),
        (4 * alpha + 2 * slack + 2 * t - 1)
        * (4 * alpha + 2 * slack + 2 * t + 1) ** 2
        * (4 * alpha + 2 * slack + 2 * t + 3),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "group_universal_prefix_growth_audit_20260805.json",
    )
    args = parser.parse_args()
    by_layer: dict[int, list[dict[str, object]]] = {}
    for path in args.inputs:
        data = json.loads(path.read_text(encoding="utf-8"))
        alpha = int(data["alpha"])
        slack = int(data["slack"])
        for record in data["records"]:
            layer = int(record["layer"])
            values = [Fraction(value) for value in record["couplings"]]
            prefix = 0
            for index, value in enumerate(values):
                if index == prefix and value == expected(layer, index, alpha, slack):
                    prefix += 1
            h = layer // 2
            predicted_prefix = (h + 1) // 2
            predicted_suffix = h + 1 - predicted_prefix
            assert len(values) == h + 1
            assert prefix == predicted_prefix
            by_layer.setdefault(layer, []).append(
                {
                    "input": path.name,
                    "alpha": alpha,
                    "slack": slack,
                    "coupling_count": len(values),
                    "universal_prefix_length": prefix,
                    "exceptional_suffix_length": len(values) - prefix,
                }
            )
    records = []
    for layer in sorted(by_layer):
        observations = by_layer[layer]
        signatures = {
            (
                item["coupling_count"],
                item["universal_prefix_length"],
                item["exceptional_suffix_length"],
            )
            for item in observations
        }
        assert len(signatures) == 1
        count, prefix, suffix = signatures.pop()
        records.append(
            {
                "layer": layer,
                "h": layer // 2,
                "coupling_count": count,
                "universal_prefix_length": prefix,
                "exceptional_suffix_length": suffix,
                "specializations_checked": len(observations),
            }
        )
    report = {
        "status": "EXACT_SCALAR_UNIVERSAL_PREFIX_GROWTH_AUDIT",
        "formula": {
            "layers": "s=2h or s=2h+1",
            "coupling_count": "h+1",
            "universal_prefix_length": "floor((h+1)/2)",
            "exceptional_suffix_length": "ceil((h+1)/2)",
        },
        "warning": "Exact at the listed scalar specializations; the symbolic all-parameter identity remains to prove.",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "first_layer": records[0]["layer"],
                "last_layer": records[-1]["layer"],
                "record_count": len(records),
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
