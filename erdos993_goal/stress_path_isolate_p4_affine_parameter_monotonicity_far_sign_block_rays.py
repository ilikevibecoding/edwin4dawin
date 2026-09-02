#!/usr/bin/env python3
"""Stress the replacement three-block pattern farther along two rays."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_path_isolate_p4_affine_parameter_monotonicity_tail_shape import (
    bottom_sources,
    group_sources,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


def compact(record: dict) -> dict:
    blocks = record["sign_blocks"]
    negative_debt = -sum(block["sum"] for block in blocks if block["sign"] < 0)
    positive_mass = sum(block["sum"] for block in blocks if block["sign"] > 0)
    return {
        key: record[key]
        for key in ("package", "parity", "coordinate", "c", "m", "x", "r")
    } | {
        "full_total_positive": record["full_total"] > 0,
        "half_total_positive": record["half_total"] > 0,
        "ordinary_turan_failure_count": record["ordinary_turan_failure_count"],
        "signed_ultra_log_concavity_failure_count": record[
            "signed_ultra_log_concavity_failure_count"
        ],
        "nonzero_sign_block_count": len(blocks),
        "sign_block_spans": [
            {
                "sign": block["sign"],
                "start": block["start"],
                "end": block["end"],
                "count": block["count"],
            }
            for block in blocks
        ],
        "boundary_debt_over_positive_middle": (
            float(Fraction(negative_debt, positive_mass))
            if positive_mass > 0 else None
        ),
    }


def certified_root_summary(values: list[int]) -> dict:
    polynomial = fmpz_poly(values)
    roots = polynomial.complex_roots()
    negative = positive = nonreal = 0
    below_one = above_one = 0
    for root, multiplicity in roots:
        if root.imag.is_zero():
            if root.real < 0:
                negative += multiplicity
            elif root.real > 0:
                positive += multiplicity
                if root.real < 1:
                    below_one += multiplicity
                elif root.real > 1:
                    above_one += multiplicity
        else:
            nonreal += multiplicity
    return {
        "degree": polynomial.degree(),
        "negative_real_root_count": negative,
        "positive_real_root_count": positive,
        "nonreal_root_count": nonreal,
        "positive_roots_below_one": below_one,
        "positive_roots_above_one": above_one,
    }


def main() -> None:
    ctx.prec = 80
    sources = {
        ("group", 0): group_sources(0)["m"],
        ("bottom", 1): bottom_sources(1)["x"],
    }
    records = []
    for m_value in (90, 120, 150, 180):
        cases = (
            ("group", 0, "m", 1, 4 * m_value // 3),
            ("bottom", 1, "x", 0, 3 * m_value // 2),
        )
        for package, parity, coordinate, c_value, r in cases:
            full = audit_components(
                package, parity, coordinate, c_value,
                m_value, 2 * m_value, r,
                *sources[(package, parity)],
                store_sequence=True,
            )
            record = compact(full)
            record["roots"] = certified_root_summary(full["j_aggregates"])
            records.append(record)
            print(record, flush=True)

    failures = [
        record for record in records
        if (
            not record["full_total_positive"]
            or record["ordinary_turan_failure_count"]
            or record["signed_ultra_log_concavity_failure_count"]
            or record["nonzero_sign_block_count"] > 3
            or record["sign_block_spans"][-1]["sign"] != -1
            or record["roots"]["positive_real_root_count"] > 2
            or record["roots"]["nonreal_root_count"] > 2
            or (
                record["roots"]["positive_real_root_count"] == 2
                and not (
                    record["roots"]["positive_roots_below_one"] == 1
                    and record["roots"]["positive_roots_above_one"] == 1
                )
            )
        )
    ]
    report = {
        "status": "PASS_FINITE_THREE_BLOCK_RAYS" if not failures else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "maximum_sign_block_count": max(
            record["nonzero_sign_block_count"] for record in records
        ),
        "maximum_initial_negative_block_length": max(
            (
                record["sign_block_spans"][0]["count"]
                if record["sign_block_spans"][0]["sign"] < 0 else 0
            )
            for record in records
        ),
        "maximum_boundary_debt_over_positive_middle": max(
            record["boundary_debt_over_positive_middle"] or 0.0
            for record in records
        ),
        "maximum_positive_real_root_count": max(
            record["roots"]["positive_real_root_count"] for record in records
        ),
        "maximum_nonreal_root_count": max(
            record["roots"]["nonreal_root_count"] for record in records
        ),
        "records": records,
        "failures": failures,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_far_sign_block_"
        "rays_stress_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items()
        if key not in {"records", "failures"}
    }, indent=2))


if __name__ == "__main__":
    main()
