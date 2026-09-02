#!/usr/bin/env python3
"""Fail-closed producer for the distinct-pu,qv rank-six G1 leaf slice.

This covers only exact expression digest
EF72CE682AD3727145BF4BCD2A707235F1D06A43366069917876C6B474B4F6D9,
represented by pu,qv (equivalently pv,qu), disjoint from an arbitrary unmarked
common forest.  High/low N>=13 subprocesses are unreachable until both exact
sparse ratio-cone stream records are fully pinned.
"""

from __future__ import annotations

import ast
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_qv_mark_only_"
    "common_forest_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_PU_QV_"
    "MARK_ONLY_COMMON_FOREST_ROOT"
)
PROBE = (
    "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_"
    "rank6_ratio_g1_nonadjacent.py"
)
CLASS_SOURCE = (
    "certify_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_"
    "expression_classes_root.py"
)
CLASS_REPORT = (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_"
    "expression_classes_exact_root_20260831.json"
)

PINNED = {
    "expression_class_source": (
        CLASS_SOURCE,
        "55920CD34ED9D9938DE0486121D9341C4FE30C37CE1F93181A81CEA40DF6CD67",
    ),
    "expression_class_report": (
        CLASS_REPORT,
        "A4E9CC944444473E378D443BCB53B0DA63337EB4654EE2D4A1593C206BC1DD2E",
    ),
    "large_probe": (
        PROBE,
        "1BF45CCC74865271645230495727EF97C8DF99AB4AE6F65231CE9401A9B506BF",
    ),
    "mark_only_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent.py",
        "DEA01339260C835DB8707D5549A624E8B0A47EEE174A82620E2AF194DBBD8BA7",
    ),
    "leaf_delta_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent.py",
        "C0B8BD01DBE2B1C2D798C426B49A1F1B5DE4C4566A2B1B2C7C86068540820015",
    ),
    "rank6_ratio_cone": (
        "probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent.py",
        "72795F07C3C0A30CF0B6E05C2980AA97367763EEC6AC8B43514F873AA23D6CFF",
    ),
    "sparse_stream_engine": (
        "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_rank4_ratio_g1_nonadjacent.py",
        "35D61A4FD392AEC269CFE4A39A4A89FD4DFE2F6BCD224EEA15ADDEFA3F26E6E8",
    ),
    "finite_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_finite_g1_nonadjacent.py",
        "279DD1092A82036931659EDC3323039204633955A83686E33138AFBCCC9F8B87",
    ),
    "finite_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_finite_exact_g1_nonadjacent_20260831.json",
        "19D5C79A90C40A44FA4A7A0A8B941E9D3B9E2C1CFC167BF42DA31A2C3E82DB80",
    ),
    "large_sibling_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_large_sibling_tail_g1_nonadjacent.py",
        "15A54315418206D19A72C65D7014A66AD30B65E2C0EA52190BD99E1B1B944EF2",
    ),
    "large_sibling_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_large_sibling_tail_exact_g1_nonadjacent_20260831.json",
        "6D33CE02C35DE5E52225952CE36838A0AD23206B0D7ACC0B47183A62B6CDD34D",
    ),
}

EXPRESSION_SHA256 = (
    "EF72CE682AD3727145BF4BCD2A707235F1D06A43366069917876C6B474B4F6D9"
)
FINITE_STREAM_SHA256 = (
    "76F1DD349AA4091D74020B3B1541579086DA3DF2BA4F3EAD73C5ACE425B8A886"
)
REPRESENTATIVES = ("pu,qv", "pv,qu")
EXPECTED_LARGE = {
    "high": {"rows_sha256": "PENDING_PU_QV_HIGH_EXACT_STREAM"},
    "low": {"rows_sha256": "PENDING_PU_QV_LOW_EXACT_STREAM"},
}
REQUIRED_STREAM_FIELDS = (
    "power_terms", "cube_degrees", "bernstein_rows", "positive",
    "negative", "minimum", "rows_sha256",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge_label(edges) -> str:
    return ",".join("".join(sorted(edge)) for edge in sorted(edges)) or "edgeless"


def validate_static_dependencies() -> None:
    for _label, (name, expected) in PINNED.items():
        path = HERE / name
        assert path.is_file(), name
        assert sha256(path) == expected, name
    classes = json.loads((HERE / CLASS_REPORT).read_text())
    assert classes["source_sha256"] == PINNED["expression_class_source"][1]
    assert classes["exact_expression_classes"] == 15
    assert classes["labelled_forests"] == 24
    assert classes["classes"][EXPRESSION_SHA256] == list(REPRESENTATIVES)
    assert all(classes["checks"].values())
    finite = json.loads((HERE / PINNED["finite_report"][0]).read_text())
    assert finite["source_sha256"] == PINNED["finite_source"][1]
    assert finite["geometry"]["common_forest_orders_N"] == [0, 13]
    assert finite["checks"]["all_unlabeled_K_through_13_exhausted"] is True
    for representative in REPRESENTATIVES:
        assert (
            finite["results"]["distinct"][representative]["stream_sha256"]
            == FINITE_STREAM_SHA256
        )
    sibling = json.loads((HERE / PINNED["large_sibling_report"][0]).read_text())
    assert sibling["source_sha256"] == PINNED["large_sibling_source"][1]
    assert sibling["checks"]["all_low_core_orders_checked_by_universal_envelopes"] is True
    assert sibling["checks"]["all_low_order_shifted_power_coefficients_nonnegative"] is True
    assert sibling["region"] == (
        "every possible core order, with sibling-isolate count 10t>=11n"
    )


def expression_certificate():
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("distinct", n, t)
    matches = []
    for marks, edges in mark_forests("distinct"):
        label = edge_label(edges)
        if label not in REPRESENTATIVES:
            continue
        expression = exact_expression(
            "distinct", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        assert digest == EXPRESSION_SHA256
        matches.append((label, digest))
    assert sorted(matches) == sorted(
        (label, EXPRESSION_SHA256) for label in REPRESENTATIVES
    )
    return {
        "labelled_family": "pu,qv (equivalently pv,qu)",
        "representatives": list(REPRESENTATIVES),
        "expression_sha256": EXPRESSION_SHA256,
    }


def assert_large_pins_complete() -> None:
    for sector in ("high", "low"):
        record = EXPECTED_LARGE[sector]
        missing = [field for field in REQUIRED_STREAM_FIELDS if field not in record]
        pending = [
            field for field, value in record.items()
            if isinstance(value, str) and "PENDING" in value
        ]
        if missing or pending:
            raise RuntimeError(
                "PU_QV LARGE STREAMS NOT FROZEN; heavy probes were not launched; "
                f"sector={sector} missing={missing} pending={pending}"
            )
        assert record["negative"] == 0, (sector, record)
        assert re.fullmatch(r"[0-9A-F]{64}", record["rows_sha256"])


def parse_result(stdout: str):
    lines = [line for line in stdout.splitlines() if line.startswith("RESULT ")]
    assert len(lines) == 1, lines
    match = re.search(
        r"POWER_TERMS (?P<power>\d+) CUBE_DEGREES (?P<degrees>\[[^\]]+\]) "
        r"BERNSTEIN_ROWS (?P<rows>\d+) HOMOGENEOUS_POSITIVE (?P<positive>\d+) "
        r"HOMOGENEOUS_NEGATIVE (?P<negative>\d+) MINIMUM (?P<minimum>\S+) "
        r"ROWS_SHA256 (?P<digest>[0-9A-F]+)$",
        lines[0],
    )
    assert match is not None, lines[0]
    return {
        "power_terms": int(match.group("power")),
        "cube_degrees": ast.literal_eval(match.group("degrees")),
        "bernstein_rows": int(match.group("rows")),
        "positive": int(match.group("positive")),
        "negative": int(match.group("negative")),
        "minimum": match.group("minimum"),
        "rows_sha256": match.group("digest"),
        "stdout_sha256": hashlib.sha256(stdout.encode()).hexdigest().upper(),
    }


def run_sector(sector: str):
    completed = subprocess.run(
        [sys.executable, "-u", str(HERE / PROBE), "--mode", "distinct",
         "--edges", "pu,qv", "--sector", sector],
        cwd=HERE, text=True, capture_output=True, check=False,
    )
    assert completed.returncode == 0, completed.stderr
    assert completed.stderr == ""
    assert "PROBE_ONLY_NO_MARK_ONLY_COMMON_FOREST_THEOREM" in completed.stdout
    result = parse_result(completed.stdout)
    assert {key: result[key] for key in REQUIRED_STREAM_FIELDS} == EXPECTED_LARGE[sector]
    return result


def main():
    validate_static_dependencies()
    expression = expression_certificate()
    # Hard gate before worker or subprocess creation.
    assert_large_pins_complete()
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
            "distinct p,q,u,v with sole mark edges pu,qv (equivalently pv,qu), "
            "disjoint from an arbitrary unmarked common forest K and h isolates"
        ),
        "expression_certificate": expression,
        "large_certificates": large,
        "proof_partition": {
            "finite": "pinned exhaustive N=0,...,13 mark-only theorem",
            "large_low_sibling": "N>=13 exact high/low gap cones for pu,qv",
            "large_sibling": "pinned universal theorem for 10t>=11n",
            "order_overlap": "N=13 covered on both sides",
            "sibling_overlap": "10t=11n covered on both sides",
        },
        "checks": {
            "pu_qv_pv_qu_expression_class_locked": True,
            "finite_representative_streams_locked": True,
            "two_large_streams_exact_nonnegative": True,
            "two_large_stream_hashes_locked": True,
            "order_partition_gapless": True,
            "sibling_partition_gapless": True,
        },
        "theorem": (
            "For every instance in expression class " + EXPRESSION_SHA256 +
            ", represented by pu,qv or pv,qu in the distinct mark-only "
            "common-forest ordinary-leaf slice, the rank-six G1 leaf increment "
            "is nonnegative for every order and sibling count."
        ),
        "remaining_obligation": (
            "the other distinct mark-only expression classes; geometries sharing "
            "a mark component with an unmarked core vertex; and other rank-six modes"
        ),
        "scope_guard": (
            "This closes exactly digest " + EXPRESSION_SHA256 +
            " represented by pu,qv or pv,qu. It does not promote another class, "
            "universal rank-six G1, all N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "large_rows_sha256": {
            sector: value["rows_sha256"] for sector, value in large.items()
        },
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
