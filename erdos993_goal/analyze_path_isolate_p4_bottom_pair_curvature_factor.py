#!/usr/bin/env python3
"""Analyze homogeneous Schur rows of the bottom-pair curvature quotients."""

from __future__ import annotations

import json

import sympy as sp

from prove_path_isolate_p4_bottom_pair_affine_slope import load_bottom


z, w, m = sp.symbols("z w m")
T = z * (1 + z) + w * (1 + w)
common = (
    z**2
    * w**2
    * (1 + z)
    * (1 + w)
    * (z + w)
    * (z**2 + w**2)
    * T**5
    * (
        2 * z**2 * w**2
        + 4 * z**2 * w
        + 3 * z**2
        + 4 * z * w**2
        + 8 * z * w
        + 6 * z
        + 3 * w**2
        + 6 * w
        + 4
    )
)


def row_record(poly: sp.Expr, degree: int) -> dict:
    source = sp.Poly(poly, z, w)
    row = [int(source.coeff_monomial(z**i * w ** (degree - i))) for i in range(degree + 1)]
    differences = []
    previous = 0
    for i in range(degree // 2 + 1):
        differences.append(row[i] - previous)
        previous = row[i]
    return {
        "total_degree": degree,
        "row_edge_to_edge": row,
        "schur_coefficients_edge_to_center": differences,
        "schur_positive": all(value >= 0 for value in differences),
    }


def main() -> None:
    parity_records = []
    for parity in (0, 1):
        _, slope = load_bottom(parity)
        quotient = sp.Poly(sp.cancel(slope / common), z, w, m)
        assert sp.expand(slope - common * quotient.as_expr()) == 0
        component_records = []
        for m_power in (0, 1):
            component = sp.Poly(quotient.as_expr(), m).coeff_monomial(m**m_power)
            degrees = sorted({sum(mon) for mon, _ in sp.Poly(component, z, w).terms()})
            rows = [row_record(component, degree) for degree in degrees]
            component_records.append(
                {
                    "m_power": m_power,
                    "degree_range": [min(degrees), max(degrees)],
                    "rows": rows,
                    "non_schur_positive_degrees": [
                        row["total_degree"] for row in rows if not row["schur_positive"]
                    ],
                }
            )
        parity_records.append(
            {
                "parity_epsilon": parity,
                "quotient_term_count": len(quotient.terms()),
                "components": component_records,
            }
        )
    report = {"status": "ANALYSIS", "parities": parity_records}
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
