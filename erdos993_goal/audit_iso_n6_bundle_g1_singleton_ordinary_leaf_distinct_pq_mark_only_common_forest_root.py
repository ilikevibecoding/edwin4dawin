#!/usr/bin/env python3
"""Independent static audit of the first exact distinct-pq G1 report."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / (
    "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_"
    "mark_only_common_forest_root.py"
)
REPORT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_mark_only_"
    "common_forest_exact_root_20260831.json"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_mark_only_"
    "common_forest_independent_static_audit_exact_root_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_STATIC_AUDIT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_"
    "LEAF_DISTINCT_PQ_MARK_ONLY_COMMON_FOREST_ROOT"
)
PRODUCER_SHA256 = (
    "823BF71F729AD98159096AEF26C770277B10D23F1278355C34C1F980DADE04DA"
)
REPORT_SHA256 = (
    "C12168FE4DA2B4FA2B04E37935537EA5E6D4CF2E2EA6232EE2E9EAF2B8064CB2"
)
EXPECTED = {
    "high": {
        "power_terms": 330129,
        "cube_degrees": [6, 6, 6, 7],
        "bernstein_rows": 2744,
        "positive": 8532574,
        "negative": 0,
        "minimum": "11/42000",
        "rows_sha256": (
            "CE5AD522AF448E7FD09503A19E20969ABB94A566773D840886774DA71A709E6D"
        ),
    },
    "low": {
        "power_terms": 239747,
        "cube_degrees": [6, 6, 6, 2, 7],
        "bernstein_rows": 8232,
        "positive": 8524635,
        "negative": 0,
        "minimum": "1/1200",
        "rows_sha256": (
            "7A84FC9C2E1BC5648BCCCDEA435A97BBA52BDD65B3615BB5388268A0A310AF78"
        ),
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(PRODUCER) == PRODUCER_SHA256
    assert sha256(REPORT) == REPORT_SHA256
    source_report = json.loads(REPORT.read_text())
    assert source_report["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_PQ_"
        "MARK_ONLY_COMMON_FOREST_ROOT"
    )
    assert source_report["source_sha256"] == PRODUCER_SHA256
    assert source_report["rank"] == 6
    assert source_report["coefficient"] == "g1"
    assert all(source_report["checks"].values())
    for sector, expected in EXPECTED.items():
        observed = source_report["large_certificates"][sector]
        assert {key: observed[key] for key in expected} == expected
    for dependency in source_report["pinned_dependencies"].values():
        assert sha256(HERE / dependency["file"]) == dependency["sha256"]
    assert "distinct-pq mark-only common-forest leaf slice" in source_report[
        "scope_guard"
    ]
    assert "not universal rank-six G1" in source_report["scope_guard"]
    assert source_report["remaining_obligation"]

    audit = {
        "marker": MARKER,
        "audited_source": {
            "file": PRODUCER.name,
            "sha256": PRODUCER_SHA256,
        },
        "audited_report": {
            "file": REPORT.name,
            "sha256": REPORT_SHA256,
        },
        "independent_checks": {
            "producer_and_report_hashes_locked": True,
            "marker_rank_and_coefficient_locked": True,
            "all_source_checks_true": True,
            "two_exact_stream_summaries_locked": True,
            "all_pinned_dependencies_rehashed": True,
            "scope_guard_preserved": True,
            "remaining_obligation_preserved": True,
        },
        "audited_scope": (
            "Exactly the distinct-pq mark-only common-forest singleton-ordinary "
            "rank-six G1 ordinary-leaf slice, all orders and sibling counts."
        ),
        "scope_guard": (
            "This static audit does not extend the producer's scope and is not "
            "universal rank-six G1, all N6, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(audit, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(MARKER)
    print("SOURCE_SHA256", audit["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())


if __name__ == "__main__":
    main()
