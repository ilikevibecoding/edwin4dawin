#!/usr/bin/env python3
"""Fail-closed producer for the distinct pq,pu,qv expression class.

The exact class has labelled members pq,pu,qv and pq,pv,qu.  This producer
uses the first as the sole large-cone representative, independently verifies
their symbolic equality, and pins both finite streams plus the complete frozen
dependency stack inherited from the reviewed distinct-pu scaffold.

The terminal high/low locks are deliberately pending.  Normal mode stops
before ThreadPool or subprocess creation; ``--static-check`` performs only
hash, report, scope, and symbolic validation and writes no certificate.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

import sympy as sp

import prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_mark_only_common_forest_root as scaffold
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pq_pu_qv_mark_only_"
    "common_forest_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_PQ_PU_QV_"
    "MARK_ONLY_COMMON_FOREST_ROOT"
)
STATIC_MARKER = "PASS_STATIC_READY_DISTINCT_PQ_PU_QV_TERMINAL_LOCKS_PENDING"
TARGET_EXPRESSION_SHA256 = (
    "C6431991F7A341708A82A62838599AC6CDFE5BCCE4F38530A9B90CD557E3F199"
)
SCAFFOLD = (
    "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_mark_only_"
    "common_forest_root.py"
)
SCAFFOLD_SHA256 = (
    "957406909752DDF1EB94FE42FC7040A49358B2AAA31CEBA43FCF74ADA7D469B4"
)
PINNED = dict(scaffold.PINNED)
PINNED["producer_scaffold"] = (SCAFFOLD, SCAFFOLD_SHA256)


# Fill all seven values in both sectors only from complete terminal output.
EXPECTED_LARGE = {
    "high": {
        "power_terms": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "cube_degrees": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "bernstein_rows": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "positive": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "negative": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "minimum": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "rows_sha256": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
    },
    "low": {
        "power_terms": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "cube_degrees": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "bernstein_rows": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "positive": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "negative": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "minimum": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
        "rows_sha256": "PENDING_AFTER_DISTINCT_PQ_REPLAY",
    },
}


def validate_pins_and_reports() -> None:
    scaffold.validate_pinned_reports()
    for _label, (name, expected) in PINNED.items():
        assert scaffold.sha256(HERE / name) == expected, name

    classes = json.loads(
        (HERE / PINNED["expression_class_report"][0]).read_text()
    )
    assert classes["classes"][TARGET_EXPRESSION_SHA256] == [
        "pq,pu,qv", "pq,pv,qu"
    ]
    assert all(classes["checks"].values())

    finite = json.loads((HERE / PINNED["finite_report"][0]).read_text())
    common = {
        "checks": 422848,
        "forests": 6607,
        "minimum": 11970000000,
        "negative": 0,
        "rows": 64,
        "scale": 75600000000,
        "stream_sha256": (
            "BF02B56AABCD53B839048CA236CD89E01E854B8EF3969908BFAF4A46E441204F"
        ),
        "tau_degree": 7,
        "witness": [0, 0, [0, 7]],
    }
    assert finite["results"]["distinct"]["pq,pu,qv"] == dict(
        common, edges="pq,pu,qv"
    )
    assert finite["results"]["distinct"]["pq,pv,qu"] == dict(
        common, edges="pq,pv,qu"
    )


def expression_certificate() -> dict:
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("distinct", n, t)
    expressions = {}
    labels = {"pq,pu,qv", "pq,pv,qu"}
    for marks, edges in mark_forests("distinct"):
        label = scaffold.edge_label(edges)
        if label not in labels:
            continue
        expression = exact_expression(
            "distinct", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        assert digest == TARGET_EXPRESSION_SHA256
        expressions[label] = expression
    assert set(expressions) == labels
    assert sp.expand(
        expressions["pq,pu,qv"] - expressions["pq,pv,qu"]
    ) == 0
    return {
        "class_sha256": TARGET_EXPRESSION_SHA256,
        "labelled_members": ["pq,pu,qv", "pq,pv,qu"],
        "representative": "pq,pu,qv",
        "labelled_members_exact_symbolic_difference_zero": True,
    }


def terminal_locks_complete() -> bool:
    required = {
        "power_terms", "cube_degrees", "bernstein_rows", "positive",
        "negative", "minimum", "rows_sha256",
    }
    return set(EXPECTED_LARGE) == {"high", "low"} and all(
        set(row) == required
        and not any(isinstance(value, str) and value.startswith("PENDING_")
                    for value in row.values())
        and row["negative"] == 0
        and re.fullmatch(r"[0-9A-F]{64}", row["rows_sha256"]) is not None
        for row in EXPECTED_LARGE.values()
    )


def run_sector(sector: str) -> dict:
    completed = subprocess.run(
        [
            sys.executable, "-u", str(HERE / scaffold.PROBE),
            "--mode", "distinct", "--edges", "pq,pu,qv", "--sector", sector,
        ],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    assert completed.stderr == ""
    assert "PROBE_ONLY_NO_MARK_ONLY_COMMON_FOREST_THEOREM" in completed.stdout
    result = scaffold.parse_result(completed.stdout)
    expected = EXPECTED_LARGE[sector]
    assert {key: result[key] for key in expected} == expected, (sector, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--static-check", action="store_true")
    args = parser.parse_args()
    validate_pins_and_reports()
    expression = expression_certificate()
    if args.static_check:
        assert not terminal_locks_complete()
        print(STATIC_MARKER)
        print("TARGET_EXPRESSION_SHA256", TARGET_EXPRESSION_SHA256)
        return

    assert terminal_locks_complete(), (
        "terminal low/high locks are incomplete; do not launch the expensive "
        "distinct-pq,pu,qv replay until both exact summaries are installed"
    )
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            sector: executor.submit(run_sector, sector)
            for sector in ("high", "low")
        }
        large = {sector: futures[sector].result() for sector in ("high", "low")}

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "family": (
            "distinct p,q,u,v with mark edges pq,pu,qv (equivalently "
            "pq,pv,qu), disjoint from an arbitrary unmarked common forest K"
        ),
        "expression_certificate": expression,
        "large_certificates": large,
        "proof_partition": {
            "finite": "pinned exhaustive N=0,...,13 mark-only theorem",
            "large_low_sibling": (
                "N>=13 exact max-rank6 high/low cones for pq,pu,qv"
            ),
            "label_symmetry": "pq,pv,qu is exactly equal to pq,pu,qv",
            "large_sibling": "pinned universal theorem for 10t>=11n",
            "order_overlap": "N=13 covered on both sides",
            "sibling_overlap": "10t=11n covered on both sides",
        },
        "checks": {
            "exact_expression_class_locked": True,
            "label_symmetry_exact": True,
            "both_finite_streams_locked": True,
            "two_large_streams_exact_nonnegative": True,
            "two_large_stream_hashes_locked": True,
            "order_partition_gapless": True,
            "sibling_partition_gapless": True,
        },
        "theorem": (
            "For the exact distinct pq,pu,qv/pq,pv,qu mark-only common-forest "
            "singleton-ordinary rank-six G1 ordinary-leaf class, the complete "
            "leaf increment is nonnegative for every order and sibling count."
        ),
        "remaining_obligation": (
            "all other not-separately-promoted distinct mark-only classes; "
            "mixed marked/unmarked components; and rank-six G1 modes outside "
            "this ordinary-leaf slice"
        ),
        "scope_guard": (
            "This closes exactly digest C6431991...557E3F199 represented by "
            "pq,pu,qv and pq,pv,qu. It is not all distinct mark-only "
            "components, universal rank-six G1, all N6, or Erdos Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": scaffold.sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    scaffold.atomic_write(OUTPUT, payload)
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())


if __name__ == "__main__":
    main()
