#!/usr/bin/env python3
"""Test paired-cone entry after allocating the exact common factor T."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A,
    T,
    V,
    to_sparse,
    x,
)
from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    add,
    hcu_audit,
    paired_cone_audit,
    reciprocal,
    shift_parameters,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def compact(audit: dict) -> dict:
    return {key: value for key, value in audit.items()
            if key != "atom_certificates"}


def cone_audit(source) -> dict:
    reciprocal_source, degree = reciprocal(source)
    shifted = shift_parameters(reciprocal_source, 1, 3)
    return {
        "reciprocal_bidegree": degree,
        "ordinary_negative_term_count": sum(value < 0 for value in shifted.values()),
        "hcu": hcu_audit(shifted),
        "paired_cone": compact(paired_cone_audit(shifted)),
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
        p_expr = sp.cancel(slope * A / T)
        b_expr = sp.cancel((T**3 * affine * V + slope * A) / T)
        assert sp.denom(p_expr) == sp.denom(b_expr) == 1
        p_source = to_sparse(sp.expand(p_expr))
        b_source = to_sparse(sp.expand(b_expr))
        p_audit = cone_audit(p_source)
        parity_records = []
        for r in range(101):
            audit = cone_audit(add(b_source, p_source, r))
            parity_records.append(
                {
                    "r": r,
                    "ordinary_negative_term_count": audit[
                        "ordinary_negative_term_count"
                    ],
                    "hcu": audit["hcu"]["hcu"],
                    "negative_schur_coefficient_count": audit[
                        "hcu"
                    ]["negative_schur_coefficient_count"],
                    "in_paired_cone": audit["paired_cone"]["in_paired_cone"],
                    "paired_cone_failure_count": audit[
                        "paired_cone"
                    ]["failure_count"],
                }
            )
        records.append(
            {
                "parity": parity,
                "common_factor": "T",
                "P_quotient": p_audit,
                "first_hcu_order": next(
                    (item["r"] for item in parity_records if item["hcu"]), None
                ),
                "first_paired_cone_order": next(
                    (item["r"] for item in parity_records
                     if item["in_paired_cone"]),
                    None,
                ),
                "orders": parity_records,
            }
        )
        print(
            parity,
            p_audit["hcu"]["hcu"],
            p_audit["paired_cone"]["in_paired_cone"],
            records[-1]["first_hcu_order"],
            records[-1]["first_paired_cone_order"],
            flush=True,
        )
    report = {
        "status": "ANALYSIS",
        "order_range": [0, 100],
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_common_T_quotient_cone_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "summary": [
            {
                "parity": item["parity"],
                "P_hcu": item["P_quotient"]["hcu"]["hcu"],
                "P_paired": item["P_quotient"]["paired_cone"]["in_paired_cone"],
                "first_hcu_order": item["first_hcu_order"],
                "first_paired_cone_order": item["first_paired_cone_order"],
            }
            for item in records
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
