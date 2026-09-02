#!/usr/bin/env python3
"""Probe the internal magnitude shape of selected long negative j-tails."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A, T, V, load_bottom, m, q, x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


def group_sources(parity: int):
    constant, slope = split_sparse(
        Path(
            "path_isolate_p4_group_integrand_stable_"
            f"parity{parity}_terms_20260730.json"
        ),
        "zwcmsx",
    )
    kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
    affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
    p = sp.expand(slope * A)
    base = sp.expand(T**3 * affine * V + p)
    return {
        "x": (
            to_sparse(sp.expand(A * base.subs(x, x + 1) - base)),
            to_sparse(sp.expand((A - 1) * p)),
        ),
        "c": (
            to_sparse(sp.expand(A**2 * base.subs(c, c + 1) - base)),
            to_sparse(sp.expand((A**2 - 1) * p)),
        ),
        "m": (
            to_sparse(sp.expand(A * T**2 * base.subs(m, m + 1) - q * base)),
            to_sparse(sp.expand((A * T**2 - q) * p)),
        ),
    }


def bottom_sources(parity: int):
    constant, slope = load_bottom(parity)
    kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
    affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
    p = sp.expand(slope * A)
    base = sp.expand(q**2 * T**3 * affine * V + p)
    return {
        "x": (
            to_sparse(sp.expand(A * base.subs(x, x + 1) - base)),
            to_sparse(sp.expand((A - 1) * p)),
        ),
        "m": (
            to_sparse(sp.expand(A * T**2 * base.subs(m, m + 1) - q * base)),
            to_sparse(sp.expand(A * T**2 * p.subs(m, m + 1) - q * p)),
        ),
    }


def main() -> None:
    requested = [
        ("group", 0, "c", 1, 30, 60, 45),
        ("group", 1, "c", 1, 60, 120, 55),
        ("group", 1, "m", 1, 60, 120, 80),
        ("bottom", 0, "m", 0, 60, 120, 55),
        ("bottom", 1, "m", 0, 45, 90, 60),
    ]
    sources = {}
    for package, parity, *_ in requested:
        key = (package, parity)
        if key not in sources:
            sources[key] = (
                group_sources(parity)
                if package == "group"
                else bottom_sources(parity)
            )

    records = []
    for package, parity, coordinate, c_value, m_value, x_value, r in requested:
        record = audit_components(
            package, parity, coordinate, c_value, m_value, x_value, r,
            *sources[(package, parity)][coordinate],
        )
        records.append(record)
        tail = record["full_tail"]
        print(
            package, parity, coordinate, m_value, x_value, r,
            tail["negative_count"], tail["magnitude_unimodal"],
            tail["magnitude_direction_transitions"],
            tail["magnitude_log_concavity_failure_count"],
            tail["tail_debt_over_peak"],
            flush=True,
        )

    report = {
        "status": "PROBE",
        "case_count": len(records),
        "all_negative_magnitude_tails_unimodal": all(
            record["full_tail"]["magnitude_unimodal"] for record in records
        ),
        "maximum_magnitude_direction_transitions": max(
            record["full_tail"]["magnitude_direction_transitions"]
            for record in records
        ),
        "maximum_log_concavity_failure_count": max(
            record["full_tail"]["magnitude_log_concavity_failure_count"]
            for record in records
        ),
        "maximum_tail_debt_over_peak": max(
            record["full_tail"]["tail_debt_over_peak"] or 0.0
            for record in records
        ),
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_tail_shape_"
        "probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items() if key != "records"
    }, indent=2))


if __name__ == "__main__":
    main()
