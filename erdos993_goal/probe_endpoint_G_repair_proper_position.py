#!/usr/bin/env python3
"""Probe proper-position relations immediately after the endpoint G repair."""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, q
from probe_bare_bottom_proper_position_parameter_region import transform
from probe_bottom_endpoint_compact_proper_position import add, multiply_affine, nonreal_count
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("endpoint_G_repair_proper_position_probe_20260802.json")


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930241)
    G = sp.expand(A * T**2 - q)
    g_source = to_sparse(G)
    g2_source = to_sparse(G**2)
    trials = 40
    records = []
    failures = []
    for m in range(1, 16):
        N, a, b = 3 * m + 3, 3 * m - 1, 2 * m + 1
        repaired = transform(g_source, N, a, b)
        g2 = transform(g2_source, N, a, b)
        formal_derivative_source = to_sparse(q * A * ((b + 2) * G + 2 * q))
        formal_derivative = transform(formal_derivative_source, N, a, b - 1)
        local = {
            "G_plus_U_formal_derivative": 0,
            "formal_derivative_plus_U_G": 0,
            "G_plus_U_G2": 0,
            "G2_plus_U_G": 0,
        }
        for trial in range(trials):
            base = (rng.randint(-16, 16), rng.randint(-16, 16))
            direction = (rng.randint(1, 12), rng.randint(1, 12))
            u_base = rng.randint(-16, 16)
            u_direction = rng.randint(1, 12)
            values = {
                "G": line_values(repaired, N, base, direction),
                "D": line_values(formal_derivative, N, base, direction),
                "G2": line_values(g2, N, base, direction),
            }
            candidates = {
                "G_plus_U_formal_derivative": add(values["G"], multiply_affine(values["D"], u_base, u_direction)),
                "formal_derivative_plus_U_G": add(values["D"], multiply_affine(values["G"], u_base, u_direction)),
                "G_plus_U_G2": add(values["G"], multiply_affine(values["G2"], u_base, u_direction)),
                "G2_plus_U_G": add(values["G2"], multiply_affine(values["G"], u_base, u_direction)),
            }
            for label, polynomial in candidates.items():
                nonreal = nonreal_count(polynomial)
                if nonreal:
                    local[label] += 1
                    if len(failures) < 50:
                        failures.append({"m": m, "trial": trial, "relation": label, "nonreal": nonreal})
        records.append({"m": m, **local})
        print(records[-1], flush=True)
    totals = {label: sum(record[label] for record in records) for label in local}
    report = {
        "kind": "endpoint_G_repair_proper_position_probe",
        "date": "2026-08-02",
        "status": "PASS_G_REPAIR_RELATION_PROBE",
        "m_range": [1, 15],
        "trials_per_relation": trials,
        "failure_totals": totals,
        "records": records,
        "first_failures": failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
