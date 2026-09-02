#!/usr/bin/env python3
"""Infer and verify rational-in-layer formulas for the last Jacobi couplings."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import sympy as sp

if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)


HERE = Path(__file__).resolve().parent


def load_records(path: Path) -> list[dict[str, object]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["status"] == "EXACT_SCALAR_ALL_LAYER_POSITIVE_JACOBI_PROBE"
    return data["records"]


def infer(data: list[tuple[int, sp.Rational]], variable: sp.Symbol, max_total: int):
    for total_degree in range(max_total + 1):
        for numerator_degree in range(total_degree + 1):
            sample_size = total_degree + 1
            if sample_size > len(data):
                continue
            try:
                candidate = sp.cancel(
                    sp.rational_interpolate(
                        data[:sample_size], numerator_degree, X=variable
                    )
                )
            except (ValueError, ZeroDivisionError):
                continue
            if all(sp.cancel(candidate.subs(variable, x) - y) == 0 for x, y in data):
                numerator, denominator = sp.fraction(candidate)
                return {
                    "total_degree": total_degree,
                    "numerator_degree": sp.degree(numerator, variable),
                    "denominator_degree": sp.degree(denominator, variable),
                    "formula": str(sp.factor(candidate)),
                    "verified_points": len(data),
                    "first_h": data[0][0],
                    "last_h": data[-1][0],
                }
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--first-layer", type=int, default=8)
    parser.add_argument("--max-total-degree", type=int, default=40)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "group_bottom_coupling_layer_recurrence_20260805.json",
    )
    args = parser.parse_args()
    h = sp.symbols("h", integer=True, nonnegative=True)
    reports = []
    for input_path in args.inputs:
        raw = json.loads(input_path.read_text(encoding="utf-8"))
        records = [
            record
            for record in raw["records"]
            if int(record["layer"]) >= args.first_layer
        ]
        input_report = {
            "input": input_path.name,
            "alpha": raw["alpha"],
            "slack": raw["slack"],
            "fits": [],
        }
        for parity in (0, 1):
            selected = [
                record for record in records if int(record["layer"]) % 2 == parity
            ]
            for from_bottom in range(3):
                points = [
                    (
                        int(record["layer"]) // 2,
                        sp.Rational(str(record["couplings"][-1 - from_bottom])),
                    )
                    for record in selected
                ]
                result = infer(points, h, args.max_total_degree)
                input_report["fits"].append(
                    {
                        "parity": "even" if parity == 0 else "odd",
                        "from_bottom": from_bottom,
                        "fit": result,
                    }
                )
                print(
                    input_path.name,
                    parity,
                    from_bottom,
                    None if result is None else result["total_degree"],
                    flush=True,
                )
        reports.append(input_report)
    output = {
        "status": "EXACT_RATIONAL_IN_LAYER_BOTTOM_COUPLING_INFERENCE",
        "warning": "Formulas are inferred from and exactly replayed on scalar specializations; multivariate proof remains separate.",
        "reports": reports,
    }
    args.output.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
