#!/usr/bin/env python3
"""Assemble the no-gap alpha(P)=13,14 rank-eight boundary certificate."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank8_pgc_boundary_matching_forest_quotient.rs"
COMMON = ROOT / "verify_rank8_pgc_boundary_connected.rs"
SMALL = ROOT / "rank8_matching_quotient_coverage_small_exact_20260817.json"
BASE = ROOT / "rank8_pgc_census_wave23_exact_20260817.json"
BASE_REPLAY = ROOT / "rank8_pgc_census_wave23_fresh_replay_20260817.json"
REPORT = ROOT / "rank8_pgc_matching_quotient_boundary_exact_20260817.json"
PREFILTER_EXE = ROOT / "verify_rank8_pgc_boundary_matching_forest_quotient_prefilter.exe"
PREFILTER_CROSSCHECKS = [
    (
        ROOT / "rank8_pgc_boundary_matching_forest_quotient_n19_a14_prefilter_crosscheck_20260817.log",
        ROOT / "rank8_pgc_boundary_matching_forest_quotient_n19_a14_exact_20260817.log",
    ),
    (
        ROOT / "rank8_pgc_boundary_matching_forest_quotient_n20_a14_prefilter_crosscheck_20260817.log",
        ROOT / "rank8_pgc_boundary_matching_forest_quotient_n20_a14_exact_20260817.log",
    ),
]

CELLS = [(order, 13) for order in range(19, 27)] + [
    (order, 14) for order in range(19, 29)
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_line(line: str) -> dict[str, object]:
    row: dict[str, object] = {}
    for token in line.split()[1:]:
        key, value = token.split("=", 1)
        if key in {"full", "reduced", "min_v_full", "min_v_reduced"}:
            row[key] = tuple(int(part) for part in value.split(","))
        else:
            row[key] = int(value)
    return row


def q8(poly: tuple[int, ...]) -> int:
    return 16 * poly[8] ** 2 - poly[7] * poly[8] - 18 * poly[7] * poly[9]


def v8(poly: tuple[int, ...]) -> int:
    return 10 * poly[6] * poly[7] + 136 * poly[6] * poly[8] - 98 * poly[7] ** 2


def margin(poly: tuple[int, ...], reduced: tuple[int, ...]) -> tuple[int, int]:
    p7 = poly[7]
    b6 = reduced[6]
    c7 = poly[8] - reduced[7] - reduced[8]
    assert p7 > 0 and b6 > 0 and c7 >= 0
    return (
        8 * b6 * q8(poly) + 24 * c7 * p7 * b6 + v8(reduced) * p7,
        2 * p7 * b6,
    )


def load_cell(order: int, alpha: int) -> tuple[dict[str, object], Path]:
    path = ROOT / f"rank8_pgc_boundary_matching_forest_quotient_n{order}_a{alpha}_exact_20260817.log"
    lines = path.read_text(encoding="utf-8").splitlines()
    data_lines = [line for line in lines if line.startswith("QFOREST ")]
    assert len(data_lines) == 1
    assert any(
        line == f"PASS_EXACT_RANK8_PGC_MATCHING_FOREST_QUOTIENT_ORDER_{order}_ALPHA_{alpha}_SHARD_0_OF_1"
        for line in lines
    )
    row = parse_line(data_lines[0])
    assert row["order"] == order and row["alpha"] == alpha
    assert row["matching"] == order - alpha
    assert row["unmatched"] == 2 * alpha - order
    expected_quotients = 3_658 if alpha == 13 else 8_599
    assert row["quotient_total"] == expected_quotients
    assert row["quotient_processed"] == expected_quotients
    assert row["endpoint_coverings"] >= row["valid_expansions"] > 0
    assert row["support_states"] > 0
    assert row["q_negative"] == 0
    assert row["coupled_negative"] == 0
    full = row["full"]
    reduced = row["reduced"]
    assert isinstance(full, tuple) and isinstance(reduced, tuple)
    assert margin(full, reduced) == (row["min_num"], row["min_den"])
    assert row["min_num"] > 0 and row["min_den"] > 0
    if row["v_negative"]:
        vf = row["min_v_full"]
        vr = row["min_v_reduced"]
        assert isinstance(vf, tuple) and isinstance(vr, tuple)
        assert row["min_v"] < 0 and v8(vr) < 0
        assert margin(vf, vr) == (row["min_v_margin_num"], row["min_v_margin_den"])
        assert row["min_v_margin_num"] > 0
    else:
        assert row["min_v"] == 0
    for error_path in (
        path.with_name(path.stem + ".err"),
        path.with_name(path.stem + ".err.log"),
    ):
        if error_path.exists():
            assert error_path.read_bytes() == b""
    row["log_sha256"] = sha256(path)
    return row, path


def main() -> None:
    assert BASE.read_bytes() == BASE_REPLAY.read_bytes()
    base = json.loads(BASE.read_text(encoding="utf-8"))
    assert base["status"] == "PASS_EXACT_FINITE_RANK8_PGC_CENSUS_THROUGH_ORDER_18_NOT_THEOREM"
    assert base["pendant_pairs_with_common_factors"]["required_distinct_coupled_negative_pairs"] == 0
    small = json.loads(SMALL.read_text(encoding="utf-8"))
    assert small["status"] == "PASS_EXACT_MATCHING_QUOTIENT_SMALL_ORDER_COVERAGE"
    assert all(case["missing_from_quotient"] == 0 for case in small["connected_tree_cases"])
    assert all(case["missing_from_quotient"] == 0 for case in small["all_forest_cases"])
    for prefilter_log, original_log in PREFILTER_CROSSCHECKS:
        # PowerShell Tee-Object wrote CRLF while redirected production output
        # used LF.  Compare every logical output line exactly.
        assert prefilter_log.read_text(encoding="utf-8").splitlines() == \
            original_log.read_text(encoding="utf-8").splitlines()

    rows = []
    paths = []
    for order, alpha in CELLS:
        row, path = load_cell(order, alpha)
        rows.append(row)
        paths.append(path)
    minimum_row = min(rows, key=lambda row: Fraction(row["min_num"], row["min_den"]))
    base_minimum = base["pendant_pairs_with_common_factors"]["global_minimum"]
    base_fraction = Fraction(
        base_minimum["margin"]["numerator"], base_minimum["margin"]["denominator"]
    )
    new_fraction = Fraction(minimum_row["min_num"], minimum_row["min_den"])
    global_fraction = min(base_fraction, new_fraction)

    report = {
        "status": "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS",
        "theorem": (
            "For every forest P with a pendant edge and alpha(P) in {13,14}, "
            "8*b6*Q8(P)+24*c7*p7*b6+V8(B)*p7 is nonnegative."
        ),
        "finite_scope": {
            "base_orders_through_18": True,
            "maximum_order_alpha13": 26,
            "maximum_order_alpha14": 28,
            "matrix_cells": [[order, alpha] for order, alpha in CELLS],
            "matrix_cell_count": len(CELLS),
            "no_gap": True,
        },
        "matching_quotient": {
            "quotient_order": "alpha(P)",
            "matching_blocks": "|P|-alpha(P)",
            "unmatched_singleton_blocks": "2*alpha(P)-|P|",
            "coverage": (
                "contract a maximum matching; enumerate every quotient forest, "
                "every independent singleton marking, and every endpoint-incidence "
                "gauge orbit; an exact augmenting-path test removes nonmaximum "
                "encodings and exact alpha recomputation checks every retained one"
            ),
            "duplicate_policy": (
                "automorphisms and multiple maximum matchings may duplicate checks "
                "but cannot omit a forest"
            ),
            "augmenting_path_prefilter": (
                "Berge exact test on unique quotient paths; exact alpha is still "
                "recomputed and asserted for every retained expansion"
            ),
            "prefilter_full_cell_crosschecks": [
                {
                    "prefilter_log": prefilter_log.name,
                    "original_log": original_log.name,
                    "exact_line_identical": True,
                    "sha256": sha256(prefilter_log),
                }
                for prefilter_log, original_log in PREFILTER_CROSSCHECKS
            ],
        },
        "coverage_totals_above_order18": {
            "quotient_forests_processed_with_multiplicity_by_cell": sum(int(row["quotient_processed"]) for row in rows),
            "independent_singleton_designations": sum(int(row["singleton_designations"]) for row in rows),
            "endpoint_coverings": sum(int(row["endpoint_coverings"]) for row in rows),
            "matching_valid_expansions": sum(int(row["valid_expansions"]) for row in rows),
            "pendant_support_states": sum(int(row["support_states"]) for row in rows),
            "Q8_negative_states": sum(int(row["q_negative"]) for row in rows),
            "V8_negative_states": sum(int(row["v_negative"]) for row in rows),
            "coupled_negative_states": sum(int(row["coupled_negative"]) for row in rows),
        },
        "minimum_above_order18": minimum_row,
        "global_minimum_including_base": {
            "numerator": global_fraction.numerator,
            "denominator": global_fraction.denominator,
            "text": str(global_fraction),
            "attained_in_base_through_order18": global_fraction == base_fraction,
        },
        "cells": rows,
        "independent_small_order_coverage": small,
        "hashes": {
            "source_sha256": sha256(SOURCE),
            "common_source_sha256": sha256(COMMON),
            "prefilter_executable_sha256": sha256(PREFILTER_EXE),
            "small_coverage_sha256": sha256(SMALL),
            "base_primary_sha256": sha256(BASE),
            "base_fresh_replay_sha256": sha256(BASE_REPLAY),
            "cell_logs": {path.name: sha256(path) for path in paths},
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["coverage_totals_above_order18"], sort_keys=True))
    print("global_minimum", str(global_fraction))
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
