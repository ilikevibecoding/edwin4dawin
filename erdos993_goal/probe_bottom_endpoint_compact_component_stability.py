#!/usr/bin/env python3
"""Probe the three compact L_m components of the bottom endpoint."""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m as m_symbol, q, w, z
from probe_path_isolate_p4_affine_target_rows import A as A_sparse, T as T_sparse, multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("bottom_endpoint_compact_component_stability_probe_20260802.json")


def main():
    ctx.prec = 80
    rng = random.Random(9930219)
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    common = sp.expand((z + w) * (z**2 + w**2) * (A - 1) * F)
    sources = {
        "base_common": to_sparse(common),
        "G_T": to_sparse(sp.expand(common * G * T)),
        "q_A_G": to_sparse(sp.expand(common * q * A * G)),
        "q2_A": to_sparse(sp.expand(common * q**2 * A)),
        "coupled_tail": to_sparse(
            sp.expand(common * q * A * ((2 * m_symbol + 3) * G + 2 * q))
        ),
        "full_compact": to_sparse(
            sp.expand(common * (G * T + q * A * ((2 * m_symbol + 3) * G + 2 * q)))
        ),
    }
    records, failures = [], []
    for m in range(1, 13):
        a, b, N = 3 * m - 1, 2 * m + 1, 3 * m + 3
        for label, source in sources.items():
            numeric = evaluate(source, 0, m, 2 * m, N)
            K = multiply(multiply(numeric, power(A_sparse, a, N), N), power(T_sparse, b, N), N)
            local = 0
            for trial in range(30):
                base = (rng.randint(-12, 12), rng.randint(-12, 12))
                direction = (rng.randint(1, 9), rng.randint(1, 9))
                values = line_values(K, N, base, direction)
                nonreal = sum(mu for root, mu in fmpz_poly(values).complex_roots() if not root.imag.is_zero())
                if nonreal:
                    local += 1
                    failures.append({"m": m, "component": label, "trial": trial, "base": base, "direction": direction, "nonreal": nonreal})
            row = {"m": m, "component": label, "failure_count": local}
            records.append(row)
            print(row, flush=True)
    report = {
        "kind": "bottom_endpoint_compact_component_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_COMPONENT_PROBE" if not failures else "COMPONENT_STABILITY_FAILURE",
        "m_range": [1, 12],
        "trials_per_component": 30,
        "failure_count": len(failures),
        "records": records,
        "first_failures": failures[:30],
        "warning": "Finite positive-direction affine-line tests only.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
