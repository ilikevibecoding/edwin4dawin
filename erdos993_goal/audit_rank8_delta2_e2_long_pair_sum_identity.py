#!/usr/bin/env python3
"""Independent audit of the long two-arm sum compression used for e=2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e2_symmetric_long_cells import PAIR_P, PAIR_S, universal_pair_states


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "probe_rank8_delta2_e2_symmetric_long_cells.py": "4141749D3431C439510C1A35F5BA4509EC4236503104753D610E7FC777250A36",
    "rank8_delta2_e2_branch_symmetric_long_exact_20260820.json": "82A55E610EB145FF453FE164AD1452C99C61B5B2C71B4D8EB9C8E7BCD58BFFDD",
    "rank8_delta2_e2_bridge_interior_symmetric_long_exact_20260820.json": "82D505176D8CB949C2C93B9F9124470F7816B89EF0C35C7B438D494581DA1ABB",
    "rank8_delta2_e2_pendant_symmetric_long_exact_20260820.json": "F53798E4748FA70D769BABA8AE4DD21A2D16BE8D2ADEF49E8D33F30F0247DE11",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def path_polynomial(order: sp.Expr, rank: int) -> sp.Expr:
    return choose_poly(order - rank + 1, rank)


def two_path_sum_polynomial(total_order: sp.Expr, rank: int) -> sp.Expr:
    # Join the two path components by one edge.  Independent sets not using
    # both joined endpoints are counted by P_total; choosing both endpoints
    # removes two vertices from each side and recurses.
    return sp.expand(
        sum(
            path_polynomial(total_order - 4 * selected_pairs, rank - 2 * selected_pairs)
            for selected_pairs in range(rank // 2 + 1)
        )
    )


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    excluded, included = universal_pair_states(8)
    rows = []
    for rank in range(9):
        expected_excluded = two_path_sum_polynomial(PAIR_S + 14, rank)
        expected_included = (
            sp.Integer(0)
            if rank == 0
            else two_path_sum_polynomial(PAIR_S + 12, rank - 1)
        )
        assert sp.expand(excluded[rank] - expected_excluded) == 0
        assert sp.expand(included[rank] - expected_included) == 0
        assert sp.degree(excluded[rank], PAIR_P) in (-sp.oo, 0)
        assert sp.degree(included[rank], PAIR_P) in (-sp.oo, 0)
        rows.append(
            {
                "rank": rank,
                "excluded_formula": str(sp.factor(expected_excluded)),
                "included_formula": str(sp.factor(expected_included)),
            }
        )

    reports = {
        cell: json.loads((HERE / f"rank8_delta2_e2_{cell}_symmetric_long_exact_20260820.json").read_text())
        for cell in ("branch", "bridge_interior", "pendant")
    }
    assert all(report["status"] == "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL" for report in reports.values())
    assert reports["branch"]["terms"] == 3654
    assert reports["bridge_interior"]["terms"] == reports["pendant"]["terms"] == 27405
    assert all(report["negative_coefficients"] == 0 for report in reports.values())

    payload = {
        "schema": "rank8-delta2-e2-long-pair-sum-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_PAIR_SUM_AND_ROOT_CELLS",
        "immutable_input_hashes": EXPECTED,
        "identity": "for ranks through 8 and arms A+7,B+7, both excluded and included two-arm endpoint states depend only on S=A+B; the P=A*B coordinate cancels",
        "closed_formula": "F_k(N)=sum_{j=0}^{floor(k/2)} [x^(k-2j)] I(P_(N-4j))",
        "rank_checks": rows,
        "positive_long_root_cells": {
            cell: {"degrees": report["degrees"], "terms": report["terms"], "report_sha256": EXPECTED[f"rank8_delta2_e2_{cell}_symmetric_long_exact_20260820.json"]}
            for cell, report in reports.items()
        },
        "scope": "closes only the all-long branch, bridge-interior, and pendant-root cells; short-segment boundaries remain",
    }
    output = HERE / "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
