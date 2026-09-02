#!/usr/bin/env python3
"""Exact FLINT factorization of the third-moment threshold margin."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from derive_combined_ground_root_invariant_flint import (
    HERE,
    degrees,
    parse_rat,
    serialize,
)


def factor_record(value, exponent):
    return {
        "exponent": int(exponent),
        "terms": len(list(value.terms())),
        "degrees_r_u_v_c": degrees(value.terms()),
        "polynomial": serialize(value),
    }


def derive(parity: str):
    components = json.loads(
        (HERE / f"ground_deflated_tail_endpoint_{parity}_symbolic_components_20260806.json").read_text(
            encoding="utf-8"
        )
    )["records"][0]["target_expressions"]
    g0 = parse_rat(components["endpoint_margin_at_zero_shift"])
    slope = parse_rat(components["shift_slope_denominator"])
    q2 = parse_rat(components["current_last_cholesky_pivot"])
    p3 = parse_rat(components["third_inverse_y_power_sum"])
    moment = slope**3 + q2**3 * g0**3 * p3
    numerator_unit, numerator_factors = moment.num.factor()
    denominator_unit, denominator_factors = moment.den.factor()
    return {
        "status": "EXACT_THIRD_MOMENT_MARGIN_FACTORIZATION",
        "parity": parity,
        "identity": "moment margin = slope^3 + q2^3*g0^3*P3",
        "numerator_unit": str(numerator_unit),
        "numerator_factors": [factor_record(*item) for item in numerator_factors],
        "denominator_unit": str(denominator_unit),
        "denominator_factors": [factor_record(*item) for item in denominator_factors],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = derive(args.parity)
    output = args.output or HERE / f"ground_root_moment_{args.parity}_factorization_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    summary = {
        "status": report["status"],
        "parity": args.parity,
        "numerator_unit": report["numerator_unit"],
        "numerator_factors": [
            {key: value for key, value in item.items() if key != "polynomial"}
            for item in report["numerator_factors"]
        ],
        "denominator_unit": report["denominator_unit"],
        "denominator_factors": [
            {key: value for key, value in item.items() if key != "polynomial"}
            for item in report["denominator_factors"]
        ],
    }
    print(json.dumps(summary, indent=2))
    print(output)


if __name__ == "__main__":
    main()
