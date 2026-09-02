#!/usr/bin/env python3
"""Probe HCU of B_k=V*Kaff+k*A*T^2*(J/T^5)."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_curvature_reserve_identity import split_sparse
from probe_path_isolate_p4_affine_hcu import hcu_record


z, w, c, m, x = sp.symbols("z w c m x")
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)
V = 1 + z + w


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
        for c_value, m_value in ((1, 3), (2, 2), (3, 1), (2, 4)):
            for x_value in (0, 1, 4):
                affine_value = affine.subs({c: c_value, m: m_value, x: x_value})
                for order in (1,):
                    bracket = sp.expand(
                        V * affine_value + order * A * T**2 * slope_over_t5
                    )
                    result = hcu_record(bracket)
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
        "hcu_count": len(records) - len(failures),
        "failure_count": len(failures),
        "first_failures": failures[:30],
        "minimum_schur_record": min(records, key=lambda item: item["minimum"]["difference"]),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
