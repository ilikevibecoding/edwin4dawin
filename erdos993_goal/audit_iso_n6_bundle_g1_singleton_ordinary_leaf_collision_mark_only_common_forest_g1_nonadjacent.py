#!/usr/bin/env python3
"""Independent audit of the exact collision mark-only rank-six G1 leaf.

The audit re-enumerates the complete collision mark-forest family, rebuilds
each exact leaf expression from the pinned formula sources, verifies the pu/pv
symmetry, and fail-closes on the first theorem report's four terminal stream
summaries and every pinned dependency.  It does not widen the theorem scope.
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
    "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_collision_mark_only_"
    "common_forest_g1_nonadjacent.py"
)
REPORT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_collision_mark_only_common_"
    "forest_exact_g1_nonadjacent_20260831.json"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_collision_mark_only_common_"
    "forest_independent_audit_exact_g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_AUDIT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_"
    "COLLISION_MARK_ONLY_COMMON_FOREST_G1_NONADJACENT"
)
THEOREM_MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_COLLISION_"
    "MARK_ONLY_COMMON_FOREST_G1_NONADJACENT"
)
PRODUCER_SHA256 = (
    "57F3908A150EEF17B6232FF9AB2E6E42CD6D6854C87C76E1F2FE02ECDB6E45B4"
)
REPORT_SHA256 = (
    "B42982E083D3A29057D5C1D8ECAAD6B8F895CD2F32C92998D63AC27A3DAB270D"
)
EXPECTED_EXPRESSIONS = {
    "edgeless": "9220807FD5D0D54D1AC97C44252192ADB5A9AAC2C6712652F0BE8AEA7F56D984",
    "pu": "61575F313BC0166B08F3A009230A42385CBAA1B4E17FDBF5CFA9A9C8DB8DD8C0",
    "pv": "61575F313BC0166B08F3A009230A42385CBAA1B4E17FDBF5CFA9A9C8DB8DD8C0",
    "pu,pv": "6D75DE1150AD2CD1192443267C82A51CEFCD4D280BCCDC2F01D1B235DFD65B83",
}
EXPECTED_STREAMS = {
    "pu_high": {
        "power_terms": 330054,
        "cube_degrees": [6, 6, 6, 7],
        "bernstein_rows": 2744,
        "positive": 8532574,
        "negative": 0,
        "minimum": "11/42000",
        "rows_sha256": (
            "38B7C3C67A33B9D21B67C59F2FB7FE8D15DD501F80CF84812DBC234E2E010EC2"
        ),
    },
    "pu_low": {
        "power_terms": 239694,
        "cube_degrees": [6, 6, 6, 2, 7],
        "bernstein_rows": 8232,
        "positive": 8524635,
        "negative": 0,
        "minimum": "1/1200",
        "rows_sha256": (
            "440D81C21F515301A7CDE2B9E3C2720308522C3739436EB06CA4D6F563DE7C80"
        ),
    },
    "pu,pv_high": {
        "power_terms": 330054,
        "cube_degrees": [6, 6, 6, 7],
        "bernstein_rows": 2744,
        "positive": 8532574,
        "negative": 0,
        "minimum": "11/42000",
        "rows_sha256": (
            "231573F4FD6565AC9E2A677F2D4ED366F15D2134EA99F4C184B2B30380A9E0A5"
        ),
    },
    "pu,pv_low": {
        "power_terms": 239694,
        "cube_degrees": [6, 6, 6, 2, 7],
        "bernstein_rows": 8232,
        "positive": 8524635,
        "negative": 0,
        "minimum": "1/1200",
        "rows_sha256": (
            "011D2CED8EA61BA33625221CE58AFC640FF21AFB417A2CB89B6F31AFED356E4A"
        ),
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge_label(edges) -> str:
    return ",".join("".join(sorted(edge)) for edge in sorted(edges)) or "edgeless"


def rebuild_collision_exhaustion() -> dict:
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("collision", n, t)
    rows = {}
    expressions = {}
    for marks, edges in mark_forests("collision"):
        label = edge_label(edges)
        assert label not in rows
        expression = exact_expression(
            "collision", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        rows[label] = digest
        expressions[label] = expression
    assert rows == EXPECTED_EXPRESSIONS
    assert sp.expand(expressions["pu"] - expressions["pv"]) == 0
    assert expressions["pu,pv"] != expressions["pu"]
    return {
        "labelled_collision_mark_forests": len(rows),
        "exact_expression_classes": len(set(rows.values())),
        "expression_sha256": rows,
        "pu_pv_exact_symbolic_difference_zero": True,
    }


def main() -> None:
    assert sha256(PRODUCER) == PRODUCER_SHA256
    assert sha256(REPORT) == REPORT_SHA256
    source_report = json.loads(REPORT.read_text())
    assert source_report["marker"] == THEOREM_MARKER
    assert source_report["source_sha256"] == PRODUCER_SHA256
    assert source_report["rank"] == 6
    assert source_report["coefficient"] == "g1"
    assert all(source_report["checks"].values())
    assert source_report["exhaustion"]["expression_sha256"] == EXPECTED_EXPRESSIONS
    for label, expected in EXPECTED_STREAMS.items():
        observed = source_report["large_certificates"][label]
        assert {key: observed[key] for key in expected} == expected
    for dependency in source_report["pinned_dependencies"].values():
        assert sha256(HERE / dependency["file"]) == dependency["sha256"]
    assert source_report["proof_partition"]["order_overlap"] == (
        "N=13 covered on both sides"
    )
    assert source_report["proof_partition"]["sibling_overlap"] == (
        "10t=11n covered on both sides"
    )
    assert "not universal rank-six G1" in source_report["scope_guard"]
    assert source_report["remaining_obligation"]

    exhaustion = rebuild_collision_exhaustion()
    audit = {
        "marker": MARKER,
        "audited_source": {"file": PRODUCER.name, "sha256": PRODUCER_SHA256},
        "audited_report": {"file": REPORT.name, "sha256": REPORT_SHA256},
        "independent_symbolic_exhaustion": exhaustion,
        "independent_checks": {
            "producer_and_report_hashes_locked": True,
            "all_four_collision_mark_forests_reenumerated": True,
            "all_three_exact_expression_classes_rebuilt_and_locked": True,
            "pu_pv_exact_symbolic_symmetry_reverified": True,
            "four_terminal_stream_summaries_locked": True,
            "all_pinned_dependencies_rehashed": True,
            "finite_large_and_sibling_partition_overlaps_locked": True,
            "scope_guard_and_remaining_obligation_preserved": True,
        },
        "audited_scope": (
            "Exactly the collision mark-only common-forest singleton-ordinary "
            "rank-six G1 ordinary-leaf slice, all orders and sibling counts."
        ),
        "scope_guard": (
            "This audit does not rerun the four Bernstein streams or extend the "
            "producer's scope. It is not universal rank-six G1, all N6, or "
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
