#!/usr/bin/env python3
"""Verify the candidate (2m+x)/(2m+x+C) affine reserve bounds."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path


PACKAGES = {
    "bottom": {
        "constant": 66,
        "files": (
            "path_isolate_p4_affine_central_reserve_ratio_bottom_20260801.json",
            "path_isolate_p4_affine_central_reserve_ratio_bottom_rays_20260801.json",
        ),
    },
    "group": {
        "constant": 80,
        "files": (
            "path_isolate_p4_affine_central_reserve_ratio_group_20260801.json",
            "path_isolate_p4_affine_central_reserve_ratio_group_rays_20260801.json",
        ),
    },
}


def main() -> None:
    package_reports = []
    total_cases = 0
    total_failures = 0
    for package, specification in PACKAGES.items():
        constant = specification["constant"]
        records = []
        for filename in specification["files"]:
            data = json.loads(Path(filename).read_text(encoding="utf-8"))
            records.extend(data["records"])
        failures = []
        worst = None
        for record in records:
            n_value = 2 * record["m"] + record["x"]
            margin = (
                (n_value + constant) * record["base"]
                + n_value * record["r"] * record["reserve_unit"]
            )
            if margin < 0:
                failures.append({**record, "scaled_margin": margin})
            if (
                record["base"] < 0
                and record["r"] > 0
                and record["reserve_unit"] > 0
                and n_value > 0
            ):
                utilization = Fraction(
                    -record["base"] * (n_value + constant),
                    record["r"] * record["reserve_unit"] * n_value,
                )
                candidate = {
                    "parity": record["parity"],
                    "m": record["m"],
                    "x": record["x"],
                    "r": record["r"],
                    "c": record.get("c"),
                    "bound_utilization_numerator": utilization.numerator,
                    "bound_utilization_denominator": utilization.denominator,
                    "bound_utilization": float(utilization),
                    "scaled_margin": margin,
                }
                if worst is None or utilization > Fraction(
                    worst["bound_utilization_numerator"],
                    worst["bound_utilization_denominator"],
                ):
                    worst = candidate
        report = {
            "package": package,
            "constant_C": constant,
            "bound": f"reserve fraction <= (2m+x)/(2m+x+{constant})",
            "source_files": list(specification["files"]),
            "case_count": len(records),
            "failure_count": len(failures),
            "worst_bound_utilization": worst,
            "first_failures": failures[:20],
        }
        package_reports.append(report)
        total_cases += len(records)
        total_failures += len(failures)

    output = {
        "status": (
            "PASS_AFFINE_SCALED_EXCESS_BOUND_STRESS"
            if total_failures == 0
            else "FAIL"
        ),
        "case_count": total_cases,
        "failure_count": total_failures,
        "packages": package_reports,
        "warning": "Finite exact evidence only; not a uniform proof.",
    }
    Path(
        "path_isolate_p4_affine_scaled_excess_bound_stress_20260801.json"
    ).write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2))
    if total_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
