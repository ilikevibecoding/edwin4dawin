#!/usr/bin/env python3
"""Fail-closed all-order producer for the distinct-pu rank-six G1 leaf class.

The exact distinct-mark expression class consists of the labelled one-edge
forests pu and pv.  This producer promotes only pu as the representative,
rechecks the pu/pv symbolic equality, and joins the pinned finite N=0..13,
large-order low/high ratio-cone, and universal large-sibling certificates.

The two terminal Bernstein locks are intentionally pending.  Normal execution
fails before launching either expensive sector until both complete replay
summaries have been inserted.  ``--static-check`` validates every dependency
and the exact class scope without launching a sector or writing a report.
"""

from __future__ import annotations

import argparse
import ast
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
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
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_pu_mark_only_"
    "common_forest_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_PU_"
    "MARK_ONLY_COMMON_FOREST_ROOT"
)
STATIC_MARKER = "PASS_STATIC_READY_DISTINCT_PU_TERMINAL_LOCKS_PENDING"
PROBE = (
    "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_"
    "rank6_ratio_g1_nonadjacent.py"
)
TARGET_EXPRESSION_SHA256 = (
    "D37D98AE001BF6EF68C6A24D2E8116EBC0D979EED02252BEB795CF36E884B62F"
)


PINNED = {
    "expression_class_source": (
        "certify_iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_expression_classes_root.py",
        "55920CD34ED9D9938DE0486121D9341C4FE30C37CE1F93181A81CEA40DF6CD67",
    ),
    "expression_class_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_expression_classes_exact_root_20260831.json",
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


# Fill every value only from complete exact probe terminals.  Keeping even one
# placeholder makes normal execution stop before subprocess creation.
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


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge_label(edges) -> str:
    return ",".join("".join(sorted(edge)) for edge in sorted(edges)) or "edgeless"


def validate_pinned_reports() -> None:
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected, name

    classes = json.loads((HERE / PINNED["expression_class_report"][0]).read_text())
    assert classes["source_sha256"] == PINNED["expression_class_source"][1]
    assert classes["rank"] == 6 and classes["coefficient"] == "g1"
    assert classes["labelled_forests"] == 24
    assert classes["exact_expression_classes"] == 15
    assert all(classes["checks"].values())
    assert classes["classes"][TARGET_EXPRESSION_SHA256] == ["pu", "pv"]

    finite = json.loads((HERE / PINNED["finite_report"][0]).read_text())
    assert all(finite["checks"].values())
    expected_finite = {
        "checks": 422848,
        "edges": "pu",
        "forests": 6607,
        "minimum": 11970000000,
        "negative": 0,
        "rows": 64,
        "scale": 75600000000,
        "stream_sha256": "F7FA78D2A71E692BEFDDB8CBEA9BEAADAAF19D7CFD0B117E33A49D232F513374",
        "tau_degree": 7,
        "witness": [0, 0, [0, 7]],
    }
    assert finite["results"]["distinct"]["pu"] == expected_finite
    expected_pv = dict(expected_finite, edges="pv")
    assert finite["results"]["distinct"]["pv"] == expected_pv

    sibling = json.loads((HERE / PINNED["large_sibling_report"][0]).read_text())
    assert all(sibling["checks"].values())
    assert set(sibling["cases"]) == {"p=q", "p!=q"}


def expression_certificate() -> dict:
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("distinct", n, t)
    found = {}
    for marks, edges in mark_forests("distinct"):
        label = edge_label(edges)
        if label not in {"pu", "pv"}:
            continue
        expression = exact_expression(
            "distinct", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        assert digest == TARGET_EXPRESSION_SHA256
        found[label] = expression
    assert set(found) == {"pu", "pv"}
    assert sp.expand(found["pu"] - found["pv"]) == 0
    return {
        "class_sha256": TARGET_EXPRESSION_SHA256,
        "labelled_members": ["pu", "pv"],
        "representative": "pu",
        "pu_pv_exact_symbolic_difference_zero": True,
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


def parse_result(stdout: str) -> dict:
    lines = [line for line in stdout.splitlines() if line.startswith("RESULT ")]
    assert len(lines) == 1, lines
    pattern = re.compile(
        r"POWER_TERMS (?P<power>\d+) "
        r"CUBE_DEGREES (?P<degrees>\[[^\]]+\]) "
        r"BERNSTEIN_ROWS (?P<rows>\d+) "
        r"HOMOGENEOUS_POSITIVE (?P<positive>\d+) "
        r"HOMOGENEOUS_NEGATIVE (?P<negative>\d+) "
        r"MINIMUM (?P<minimum>\S+) "
        r"ROWS_SHA256 (?P<digest>[0-9A-F]+)$"
    )
    match = pattern.search(lines[0])
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


def run_sector(sector: str) -> dict:
    completed = subprocess.run(
        [
            sys.executable, "-u", str(HERE / PROBE),
            "--mode", "distinct", "--edges", "pu", "--sector", sector,
        ],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    assert completed.stderr == ""
    assert "PROBE_ONLY_NO_MARK_ONLY_COMMON_FOREST_THEOREM" in completed.stdout
    result = parse_result(completed.stdout)
    expected = EXPECTED_LARGE[sector]
    assert {key: result[key] for key in expected} == expected, (sector, result)
    return result


def atomic_write(path: Path, payload: bytes) -> None:
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--static-check", action="store_true")
    args = parser.parse_args()
    validate_pinned_reports()
    expression = expression_certificate()
    if args.static_check:
        assert not terminal_locks_complete()
        print(STATIC_MARKER)
        print("TARGET_EXPRESSION_SHA256", TARGET_EXPRESSION_SHA256)
        return

    assert terminal_locks_complete(), (
        "terminal low/high locks are incomplete; do not launch the expensive "
        "distinct-pu replay until both exact summaries are installed"
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
            "distinct p,q,u,v with sole mark edge pu (equivalently pv), "
            "disjoint from an arbitrary unmarked common forest K and h isolates"
        ),
        "expression_certificate": expression,
        "large_certificates": large,
        "proof_partition": {
            "finite": "pinned exhaustive N=0,...,13 mark-only theorem",
            "large_low_sibling": "N>=13 exact max-rank6 high/low gap cones for pu",
            "label_symmetry": "pv is exactly symbolically equal to pu",
            "large_sibling": "pinned universal theorem for 10t>=11n",
            "order_overlap": "N=13 covered on both sides",
            "sibling_overlap": "10t=11n covered on both sides",
        },
        "checks": {
            "exact_expression_class_locked": True,
            "pu_pv_symmetry_exact": True,
            "finite_pu_pv_streams_locked": True,
            "two_large_streams_exact_nonnegative": True,
            "two_large_stream_hashes_locked": True,
            "order_partition_gapless": True,
            "sibling_partition_gapless": True,
        },
        "theorem": (
            "For the exact distinct-pu/pv one-edge mark-only common-forest "
            "singleton-ordinary rank-six G1 ordinary-leaf class, the complete "
            "leaf increment is nonnegative for every order and sibling count."
        ),
        "remaining_obligation": (
            "the other thirteen nonempty distinct mark-only expression classes; "
            "mixed marked/unmarked components; and rank-six G1 modes outside "
            "this ordinary-leaf slice"
        ),
        "scope_guard": (
            "This closes exactly digest D37D98AE...E884B62F represented by pu "
            "and pv. It is not all distinct mark-only components, universal "
            "rank-six G1, all N6, or Erdos Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    atomic_write(OUTPUT, payload)
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())


if __name__ == "__main__":
    main()
