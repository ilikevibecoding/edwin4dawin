#!/usr/bin/env python3
"""Exact-line probe for the bare differential-operator symbol P+UQ."""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, q, w, z


OUT = Path("bottom_core_symbol_stability_probe_20260802.json")
U, t = sp.symbols("U t")


def line_coefficients(expression, bases, directions):
    line = sp.Poly(
        sp.expand(
            expression.subs(
                {
                    z: bases[0] + directions[0] * t,
                    w: bases[1] + directions[1] * t,
                    U: bases[2] + directions[2] * t,
                }
            )
        ),
        t,
    )
    return [int(line.coeff_monomial(t**degree)) for degree in range(line.degree() + 1)]


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930233)
    G = sp.expand(A * T**2 - q)
    records = []
    failures = []
    for b in range(0, 31):
        P = sp.expand(G * T)
        Q = sp.expand(q * A * ((b + 2) * G + 2 * q))
        orientations = {"P_plus_UQ": P + U * Q, "Q_plus_UP": Q + U * P}
        local = {label: 0 for label in orientations}
        for trial in range(160):
            bases = tuple(rng.randint(-20, 20) for _ in range(3))
            directions = tuple(rng.randint(1, 15) for _ in range(3))
            for label, expression in orientations.items():
                values = line_coefficients(expression, bases, directions)
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
                                "b": b,
                                "trial": trial,
                                "orientation": label,
                                "bases": bases,
                                "directions": directions,
                                "nonreal": nonreal,
                            }
                        )
        records.append({"b": b, **local})
        print(records[-1], flush=True)
    totals = {
        label: sum(record[label] for record in records)
        for label in ("P_plus_UQ", "Q_plus_UP")
    }
    report = {
        "kind": "bottom_core_symbol_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_CORE_SYMBOL_PROBE" if totals["P_plus_UQ"] == 0 else "CORE_SYMBOL_FAILURE",
        "b_range": [0, 30],
        "trials_per_b": 160,
        "failure_totals": totals,
        "records": records,
        "first_failures": failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
