#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.73."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_E2_DOUBLE_CLAW_N23_BOUNDARY_THEOREM_2026-08-20.md":
        "A17EF7533E72E91147FE0681A2B4D79E2B4124D5EF7AB34DE5D40D65CEB2DAB6",
    "scan_rank8_delta013_e2_double_claws_n23.py":
        "3FD0FCB77E1A3B09E30AA3E00DBA904D446B83E6502944EB4DA5B0404FCFEF5C",
    "rank8_delta013_e2_double_claws_n23_exact_20260820.json":
        "A2CA7228A172D5C8E1A1747014691F38A49BC0DE07C59D82400A80ED245A7AC9",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json":
        "BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027",
    "assemble_rank8_connected_q8_integration_readonly.py":
        "05D9D26A8DA9D5B96210833C607CC45DC312D7AE6E1A1AFE16E9D52EA17087DE",
    "rank8_connected_q8_integration_readonly_20260820.json":
        "2DCC45BB2522C4F914F38FAE548C4E7EB9EA8905B41D09AE3138BA8C4F2029D0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }

    theorem = load("rank8_delta013_e2_double_claws_n23_exact_20260820.json")
    audit = load("rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json")
    integration = load("rank8_connected_q8_integration_readonly_20260820.json")

    assert theorem["status"] == "PASS_EXACT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23"
    assert audit["status"] == "PASS_INDEPENDENT_EXACT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23"
    assert theorem["suppressed_length_sum"] == 22
    assert theorem["canonical_cores"] == 920
    assert theorem["rooted_cases"] == 21160
    assert theorem["unique_coefficient_root_profiles"] == 11395
    assert audit["canonical_coverage"]["sets_identical"] is True
    assert audit["canonical_coverage"]["canonical_length_tuples"] == 920
    assert audit["independent_exact_scan"]["rooted_cases"] == 21160
    minima = [
        6570404611911847800,
        21884430029308489796,
        41490192594553419725,
        63006870505707355076,
    ]
    for rank, expected_minimum in enumerate(minima):
        row = theorem["rank_results"][str(rank)]
        signs = audit["independent_exact_scan"]["rank_signs"][str(rank)]
        assert row["negative"] == 0 and row["zero"] == 0 and row["positive"] == 21160
        assert signs == {"negative": 0, "zero": 0, "positive": 21160}
        assert row["minimum"] == expected_minimum
        assert audit["independent_exact_scan"]["rank_minima"][str(rank)] == expected_minimum

    assert integration["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N23_PLUS"
    assert integration["connected_Q8_complete"] is False
    assert integration["degree_surplus_two_order23_closed_pending_ranks"] == [0, 1, 2, 3]
    for rank in ("Delta0", "Delta1", "Delta2", "Delta3"):
        row = integration["bounded_structural_progress_on_pending_ranks"][rank]
        assert "e=2 closed exactly at orders 23..30" in row["second_nonpath_finite_band"]
        assert row["remaining_nonpath_reduction"].startswith(
            "e>=3 remains at orders 23..30; e>=2 remains from order 31"
        )

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.73 The degree-surplus-two order-23 boundary is closed exactly"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        if name.startswith("assemble_rank8_connected") or name.startswith("rank8_connected_q8"):
            continue
        assert name in section and digest in section, name
    assert "exactly 920" in section
    assert "21,160 rooted cases" in section
    assert "order-23 structural remainder" in section and "`e>=3`" in section
    assert "not an all-order `e=2` theorem" in section
    assert "not a proof of Problem 993" in section

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_73",
        "immutable_inputs": actual,
        "order": 23,
        "closed_degree_surplus": 2,
        "closed_ranks": [0, 1, 2, 3],
        "canonical_cores": 920,
        "rooted_cases": 21160,
        "connected_Q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_73_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
