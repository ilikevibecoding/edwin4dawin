#!/usr/bin/env python3
"""Independent symbolic audit of the exact distinct-pq rank-six G1 leaf.

This audit deliberately does not rerun the expensive Bernstein streams.  It
independently re-enumerates the labelled distinct-mark forests, selects the
unique pq-only family, rebuilds its exact leaf expression from the pinned
formula sources, and then fail-closes on every source/report/stream digest in
the first theorem report.  Its scope is exactly the pq mark-only slice.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)


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
    "common_forest_independent_symbolic_audit_exact_root_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_SYMBOLIC_AUDIT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_"
    "LEAF_DISTINCT_PQ_MARK_ONLY_COMMON_FOREST_ROOT"
)
THEOREM_MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_PQ_"
    "MARK_ONLY_COMMON_FOREST_ROOT"
)
PRODUCER_SHA256 = (
    "823BF71F729AD98159096AEF26C770277B10D23F1278355C34C1F980DADE04DA"
)
REPORT_SHA256 = (
    "C12168FE4DA2B4FA2B04E37935537EA5E6D4CF2E2EA6232EE2E9EAF2B8064CB2"
)
MARK_ONLY_FORMULA_SHA256 = (
    "DEA01339260C835DB8707D5549A624E8B0A47EEE174A82620E2AF194DBBD8BA7"
)
LEAF_FORMULA_SHA256 = (
    "C0B8BD01DBE2B1C2D798C426B49A1F1B5DE4C4566A2B1B2C7C86068540820015"
)
PQ_EXPRESSION_SHA256 = (
    "E25FCD2FEBA4085A452E4B0E540C61ADC3C60ACA66A2A1643467B70E6C865A6C"
)
EXPECTED_STREAMS = {
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


def edge_label(edges) -> str:
    return ",".join("".join(sorted(edge)) for edge in sorted(edges)) or "edgeless"


def rebuild_pq_expression() -> dict:
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("distinct", n, t)
    all_rows = list(mark_forests("distinct"))
    matches = []
    for marks, edges in all_rows:
        if edge_label(edges) != "pq":
            continue
        expression = exact_expression(
            "distinct", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        matches.append({
            "marks": list(marks),
            "edges": [list(edge) for edge in sorted(edges)],
            "expression_sha256": digest,
        })
    assert len(all_rows) == 24
    assert len(matches) == 1
    assert matches[0]["expression_sha256"] == PQ_EXPRESSION_SHA256
    return {
        "all_labelled_distinct_mark_forests": len(all_rows),
        "pq_only_representatives": len(matches),
        "pq_expression_sha256": matches[0]["expression_sha256"],
    }


def main() -> None:
    assert sha256(PRODUCER) == PRODUCER_SHA256
    assert sha256(REPORT) == REPORT_SHA256
    assert sha256(
        HERE
        / "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent.py"
    ) == MARK_ONLY_FORMULA_SHA256
    assert sha256(
        HERE
        / "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent.py"
    ) == LEAF_FORMULA_SHA256

    source_report = json.loads(REPORT.read_text())
    assert source_report["marker"] == THEOREM_MARKER
    assert source_report["source_sha256"] == PRODUCER_SHA256
    assert source_report["rank"] == 6
    assert source_report["coefficient"] == "g1"
    assert all(source_report["checks"].values())
    for sector, expected in EXPECTED_STREAMS.items():
        observed = source_report["large_certificates"][sector]
        assert {key: observed[key] for key in expected} == expected
    for dependency in source_report["pinned_dependencies"].values():
        assert sha256(HERE / dependency["file"]) == dependency["sha256"]
    assert source_report["expression_certificate"]["expression_sha256"] == (
        PQ_EXPRESSION_SHA256
    )
    assert source_report["proof_partition"]["order_overlap"] == (
        "N=13 covered on both sides"
    )
    assert source_report["proof_partition"]["sibling_overlap"] == (
        "10t=11n covered on both sides"
    )
    assert "not universal rank-six G1" in source_report["scope_guard"]
    assert source_report["remaining_obligation"]

    symbolic = rebuild_pq_expression()
    audit = {
        "marker": MARKER,
        "audited_source": {"file": PRODUCER.name, "sha256": PRODUCER_SHA256},
        "audited_report": {"file": REPORT.name, "sha256": REPORT_SHA256},
        "symbolic_reconstruction": symbolic,
        "independent_checks": {
            "producer_report_and_formula_hashes_locked": True,
            "all_24_distinct_mark_forests_reenumerated": True,
            "unique_pq_labelled_family_reidentified": True,
            "pq_exact_expression_independently_rebuilt_and_locked": True,
            "two_exact_stream_summaries_locked": True,
            "all_pinned_dependencies_rehashed": True,
            "finite_large_and_sibling_partition_overlaps_locked": True,
            "scope_guard_and_remaining_obligation_preserved": True,
        },
        "audited_scope": (
            "Exactly the distinct-pq mark-only common-forest singleton-ordinary "
            "rank-six G1 ordinary-leaf slice, all orders and sibling counts."
        ),
        "scope_guard": (
            "This symbolic audit does not rerun the Bernstein streams or extend "
            "the producer's scope. It is not universal rank-six G1, all N6, or "
            "Erdos Problem 993."
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
