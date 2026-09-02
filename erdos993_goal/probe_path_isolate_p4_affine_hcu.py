#!/usr/bin/env python3
"""Probe HCU of the affine-in-x part after all group multipliers."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w, c, m, x = sp.symbols("z w c m x")
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)
V = 1 + z + w


def hcu_record(expression: sp.Expr) -> dict:
    poly = sp.Poly(sp.expand(expression), z, w)
    rows: dict[int, dict[int, int]] = {}
    minimum = None
    first_failure = None
    checks = 0
    for (power_z, power_w), coefficient in poly.terms():
        rows.setdefault(power_z + power_w, {})[power_z] = int(coefficient)
    for degree in sorted(rows):
        row = rows[degree]
        previous = 0
        for power_z in range(degree // 2 + 1):
            current = row.get(power_z, 0)
            difference = current - previous
            checks += 1
            record = {
                "degree": degree,
                "edge_index": power_z,
                "difference": difference,
                "coefficient": current,
                "previous": previous,
            }
            if minimum is None or difference < minimum["difference"]:
                minimum = record
            if difference < 0 and first_failure is None:
                first_failure = record
            previous = current
    return {
        "hcu": first_failure is None,
        "checks": checks,
        "minimum": minimum,
        "first_failure": first_failure,
        "term_count": len(poly.terms()),
    }


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        slope_over_t5 = sp.cancel(slope / T**5)
        for c_value, m_value in ((1, 3),):
            exponent_t = 2 * m_value + parity - 1
            if exponent_t < 0:
                continue
            for x_value in (0,):
                exponent_a = 2 * c_value + m_value + x_value - 3
                for order in (7,):
                    expression = (
                        A**exponent_a
                        * T**exponent_t
                        * V**order
                        * affine.subs({c: c_value, m: m_value, x: x_value})
                    )
                    expression += (
                        order
                        * A ** (exponent_a + 1)
                        * T ** (2 * m_value + parity + 1)
                        * V ** (order - 1)
                        * slope_over_t5
                    )
                    result = hcu_record(expression)
                    records.append(
                        {
                            "parity_epsilon": parity,
                            "c": c_value,
                            "m": m_value,
                            "x": x_value,
                            "newton_order": order,
                            **result,
                        }
                    )
    failures = [record for record in records if not record["hcu"]]
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "hcu_case_count": len(records) - len(failures),
        "failure_count": len(failures),
        "first_failures": failures[:20],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
