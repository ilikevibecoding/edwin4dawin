#!/usr/bin/env python3
"""Factor and audit the two hard affine-monotonicity increment kernels."""

from __future__ import annotations

import json
import hashlib
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import m, w, x, z
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)


def factor_record(name: str, expression: sp.Expr) -> dict:
    expanded = sp.expand(expression)
    constant, factors = sp.factor_list(expanded)
    swapped = expanded.xreplace({z: w, w: z})
    factor_records = []
    for factor, multiplicity in factors:
        polynomial = sp.Poly(factor, z, w, m, x)
        canonical = "\n".join(
            f"{monomial}:{coefficient}"
            for monomial, coefficient in polynomial.terms()
        )
        term_count = len(polynomial.terms())
        factor_records.append({
            "multiplicity": int(multiplicity),
            "expression": str(factor) if term_count <= 100 else None,
            "term_count": term_count,
            "degrees_z_w_m_x": [int(value) for value in polynomial.degree_list()],
            "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        })
    return {
        "name": name,
        "term_count": len(sp.Poly(expanded, z, w, m, x).terms()),
        "symmetric_z_w": sp.expand(expanded - swapped) == 0,
        "constant_factor": str(constant),
        "factors": factor_records,
    }


def main() -> None:
    records = []
    for family, pair in (
        ("group_parity0_m", group_increment(0, "m")),
        ("bottom_parity1_x", bottom_increment(1, "x")),
    ):
        for kind, expression in zip(("base", "reserve"), pair):
            record = factor_record(f"{family}_{kind}", expression)
            records.append(record)
            print(record["name"], record["term_count"], record["symmetric_z_w"])
            print(
                record["constant_factor"],
                [
                    (factor["multiplicity"], factor["term_count"],
                     factor["degrees_z_w_m_x"])
                    for factor in record["factors"]
                ],
            )
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "hard_kernel_factors_20260802.json"
    ).write_text(
        json.dumps({"status": "EXACT_SYMBOLIC", "records": records}, indent=2)
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
