#!/usr/bin/env python3
"""Aggregate the nine-endpoint Gasca--Pena initial-minor certificate.

The solid-minor reports record every coefficientwise obstruction.  All such
obstructions lie strictly away from the first row and first column.  The
separate gamma=0 report verifies positive constant terms.  This script joins
those exact artifacts into the minimal n^2-initial-minor certificate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
BASE = HERE / "equal_direction_bezout_flint_solid_endpoints_20260804.json"
LOCATIONS = {
    19: HERE / "equal_direction_bezout_flint_solid_axis_locations_N19_d15_20260804.json",
    22: HERE / "equal_direction_bezout_flint_solid_axis_locations_N22_d17_20260804.json",
    25: HERE / "equal_direction_bezout_flint_solid_axis_locations_N25_d19_20260804.json",
    28: HERE / "equal_direction_bezout_flint_solid_axis_locations_N28_d21_20260804.json",
}
CONSTANTS = HERE / "equal_direction_bezout_solid_constants_nine_20260804.json"
OUTPUT = HERE / "equal_direction_bezout_initial_nine_20260804.json"


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    base = load(BASE)
    solid_records = {record["N"]: record for record in base["records"]}
    for N, path in LOCATIONS.items():
        solid_records[N] = load(path)["records"][0]
    constant_records = {
        record["N"]: record for record in load(CONSTANTS)["records"]
    }

    records = []
    for N in (4, 7, 10, 13, 16, 19, 22, 25, 28):
        solid = solid_records[N]
        constant = constant_records[N]
        failures = solid.get("coefficient_failures", [])
        if not failures and solid.get("first_failure") is not None:
            raise AssertionError(f"missing complete failure list for N={N}")
        initial_failures = [
            failure for failure in failures
            if failure["row"] == 0 or failure["column"] == 0
        ]
        assert not initial_failures
        n = solid["matrix_size"]
        assert constant["initial_minors"] == n * n
        assert constant["positive_initial_constants"] == n * n
        records.append({
            "N": N,
            "d": solid["d"],
            "matrix_size": n,
            "initial_minors": n * n,
            "symmetry_distinct_initial_minors": n * (n + 1) // 2,
            "coefficientwise_negative_initial_minors": 0,
            "positive_constant_initial_minors": n * n,
            "noninitial_mixed_sign_solid_minors": len(failures),
        })

    sources = [BASE, *LOCATIONS.values(), CONSTANTS]
    report = {
        "status": "EXACT_FINITE_GASCA_PENA_INITIAL_MINOR_CERTIFICATE",
        "criterion": (
            "Every initial Bezout minor is coefficientwise nonnegative in "
            "gamma with positive constant term."
        ),
        "records": records,
        "totals": {
            "initial_minors": sum(item["initial_minors"] for item in records),
            "symmetry_distinct_initial_minors": sum(
                item["symmetry_distinct_initial_minors"] for item in records
            ),
            "coefficientwise_negative_initial_minors": 0,
        },
        "sources": [
            {"file": path.name, "sha256": sha256(path)} for path in sources
        ],
        "scope": "Exact finite certificate through matrix size 35; not an all-order proof.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT, flush=True)


if __name__ == "__main__":
    main()
