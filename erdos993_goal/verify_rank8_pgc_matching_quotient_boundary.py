#!/usr/bin/env python3
"""Fast no-gap replay audit for the completed rank-eight boundary matrix."""

from __future__ import annotations

import json
from pathlib import Path

import assemble_rank8_pgc_matching_quotient_boundary as assembly


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_pgc_matching_quotient_boundary_exact_20260817.json"


def main() -> None:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS"
    scope = report["finite_scope"]
    assert scope["no_gap"] is True
    assert scope["matrix_cell_count"] == 18
    assert [tuple(cell) for cell in scope["matrix_cells"]] == assembly.CELLS
    assert report["coverage_totals_above_order18"]["Q8_negative_states"] == 0
    assert report["coverage_totals_above_order18"]["coupled_negative_states"] == 0
    assert report["coverage_totals_above_order18"]["V8_negative_states"] > 0
    assert report["global_minimum_including_base"] == {
        "numerator": 15_765_688,
        "denominator": 1_725,
        "text": "15765688/1725",
        "attained_in_base_through_order18": True,
    }
    # Reparse every expensive log and recompute all displayed witnesses.
    reparsed = [assembly.load_cell(order, alpha)[0] for order, alpha in assembly.CELLS]
    assert json.loads(json.dumps(reparsed)) == report["cells"]
    assert all(row["coupled_negative"] == 0 for row in reparsed)
    assert report["hashes"]["source_sha256"] == assembly.sha256(assembly.SOURCE)
    assert report["hashes"]["common_source_sha256"] == assembly.sha256(assembly.COMMON)
    assert report["hashes"]["prefilter_executable_sha256"] == assembly.sha256(assembly.PREFILTER_EXE)
    assert report["hashes"]["small_coverage_sha256"] == assembly.sha256(assembly.SMALL)
    assert report["hashes"]["base_primary_sha256"] == assembly.sha256(assembly.BASE)
    assert report["hashes"]["base_fresh_replay_sha256"] == assembly.sha256(assembly.BASE_REPLAY)
    assert report["hashes"]["cell_logs"] == {
        f"rank8_pgc_boundary_matching_forest_quotient_n{order}_a{alpha}_exact_20260817.log":
        assembly.sha256(
            ROOT / f"rank8_pgc_boundary_matching_forest_quotient_n{order}_a{alpha}_exact_20260817.log"
        )
        for order, alpha in assembly.CELLS
    }
    assert all(
        prefilter_log.read_text(encoding="utf-8").splitlines()
        == original_log.read_text(encoding="utf-8").splitlines()
        for prefilter_log, original_log in assembly.PREFILTER_CROSSCHECKS
    )
    print("PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS_REPLAY")
    print("report_sha256", assembly.sha256(REPORT))


if __name__ == "__main__":
    main()
