#!/usr/bin/env python3
"""Probe the bare endpoint Laguerre chain B, GB, GTB, G^2B, and tail."""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, q
from probe_bottom_endpoint_compact_proper_position import transformed
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("bare_endpoint_laguerre_chain_stability_probe_20260802.json")


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930237)
    G = sp.expand(A * T**2 - q)
    records = []
    failures = []
    trials = 30
    for m in range(1, 21):
        N, b = 3 * m + 3, 2 * m + 1
        sources = {
            "B": sp.S.One,
            "G_B": G,
            "T_G_B": T * G,
            "G2_B": G**2,
            "tail_B": q * A * ((b + 2) * G + 2 * q),
        }
        kernels = {
            label: transformed(to_sparse(sp.expand(source)), m, N)
            for label, source in sources.items()
        }
        local = {label: 0 for label in sources}
        for trial in range(trials):
            base = (rng.randint(-16, 16), rng.randint(-16, 16))
            direction = (rng.randint(1, 12), rng.randint(1, 12))
            for label, kernel in kernels.items():
                values = line_values(kernel, N, base, direction)
                nonreal = sum(
                    multiplicity
                    for root, multiplicity in fmpz_poly(values).complex_roots()
                    if not root.imag.is_zero()
                )
                if nonreal:
                    local[label] += 1
                    if len(failures) < 50:
                        failures.append(
                            {
                                "m": m,
                                "trial": trial,
                                "block": label,
                                "base": base,
                                "direction": direction,
                                "nonreal": nonreal,
                            }
                        )
        records.append({"m": m, **local})
        print(records[-1], flush=True)
    totals = {label: sum(record[label] for record in records) for label in ("B", "G_B", "T_G_B", "G2_B", "tail_B")}
    report = {
        "kind": "bare_endpoint_laguerre_chain_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_CHAIN_LOCALIZATION_PROBE",
        "m_range": [1, 20],
        "trials_per_block": trials,
        "failure_totals": totals,
        "records": records,
        "first_failures": failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
