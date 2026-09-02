#!/usr/bin/env python3
"""Test N-dependent output multipliers suggested by the first endpoint."""

from __future__ import annotations

import json
import random
from pathlib import Path

from flint import ctx
import sympy as sp

from explore_bottom_slice_hypergeometric import bottom_target
from probe_output_multiplier_bottom_stability import line_polynomial, nonreal, output_multiplier


OUT = Path("output_multiplier_dynamic_bottom_stability_probe_20260802.json")


def main() -> None:
    ctx.prec = 128
    rng = random.Random(993_20260802 + 193)
    records = []
    first = []
    for m in range(1, 11):
        N = 3*m+3
        target = bottom_target(m)
        parameters = {
            "N": N,
            "2N-3": 2*N-3,
            "2N-2": 2*N-2,
            "2N": 2*N,
            "3N": 3*N,
            "N^2": N*N,
        }
        lines = [
            (rng.randint(-80, 80), rng.randint(1, 35), rng.randint(-80, 80), rng.randint(1, 35))
            for _ in range(30)
        ]
        for label, c_value in parameters.items():
            transformed = output_multiplier(target, sp.Integer(c_value))
            failures = 0
            for trial, line in enumerate(lines):
                count = nonreal(line_polynomial(transformed, line))
                failures += bool(count)
                if count and len(first) < 50:
                    first.append({"m": m, "label": label, "c": c_value, "trial": trial, "line": line, "nonreal": count})
            record = {"m": m, "N": N, "label": label, "c": c_value, "trials": len(lines), "failures": failures}
            records.append(record)
            print(json.dumps(record), flush=True)
    totals = {label: sum(r["failures"] for r in records if r["label"] == label) for label in ["N", "2N-3", "2N-2", "2N", "3N", "N^2"]}
    report = {
        "kind": "output_multiplier_dynamic_bottom_stability_probe",
        "date": "2026-08-02",
        "status": "DONE_FINITE_EXACT_DYNAMIC_OUTPUT_MULTIPLIER_SCAN",
        "m_range": [1, 10],
        "failure_totals": totals,
        "records": records,
        "first_failures": first,
        "warning": "Finite exact affine-line tests only.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"failure_totals": totals, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
