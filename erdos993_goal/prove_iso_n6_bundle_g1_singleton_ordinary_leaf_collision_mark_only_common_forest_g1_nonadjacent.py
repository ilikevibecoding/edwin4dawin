#!/usr/bin/env python3
"""Exact all-order collision mark-only theorem for the rank-six G1 leaf.

The collision geometry has marks p,u,v and forbids uv.  Consequently its
labelled mark forests are exactly the edgeless graph, either one-edge graph
pu/pv, and the two-edge star pu,pv.  The edgeless case is already covered by
the pinned isolated-mark theorem.  This producer recomputes both max-rank-six
large-order sectors for one representative of each nonempty expression class,
checks the exact pu/pv symmetry, and joins them to the pinned finite-core and
large-sibling theorems.  Every promoted replay therefore fails closed on all
source, report, expression, and Bernstein-stream hashes.
"""

from __future__ import annotations

import argparse
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
    "iso_n6_bundle_g1_singleton_ordinary_leaf_collision_mark_only_common_forest_"
    "exact_g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_COLLISION_"
    "MARK_ONLY_COMMON_FOREST_G1_NONADJACENT"
)
PROBE = (
    "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_"
    "rank6_ratio_g1_nonadjacent.py"
)


PINNED = {
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
    "isolated_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_g1_nonadjacent.py",
        "AFB2D1599844A012763620CC4BDB193DBEAFCC1F64F0039C8B4285FBC088CEEF",
    ),
    "isolated_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_exact_g1_nonadjacent_20260831.json",
        "39E1847DCAAEB81F41FFE087D6459AAA908DFB2F30DFF7C3A56F4959F2F2A952",
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


EXPRESSION_SHA256 = {
    "edgeless": "9220807FD5D0D54D1AC97C44252192ADB5A9AAC2C6712652F0BE8AEA7F56D984",
    "pu": "61575F313BC0166B08F3A009230A42385CBAA1B4E17FDBF5CFA9A9C8DB8DD8C0",
    "pv": "61575F313BC0166B08F3A009230A42385CBAA1B4E17FDBF5CFA9A9C8DB8DD8C0",
    "pu,pv": "6D75DE1150AD2CD1192443267C82A51CEFCD4D280BCCDC2F01D1B235DFD65B83",
}


# Filled only from complete exact probe terminals, never from partial output.
EXPECTED_LARGE = {
    ("pu", "high"): {
        "power_terms": 330054,
        "cube_degrees": [6, 6, 6, 7],
        "bernstein_rows": 2744,
        "positive": 8532574,
        "negative": 0,
        "minimum": "11/42000",
        "rows_sha256": "38B7C3C67A33B9D21B67C59F2FB7FE8D15DD501F80CF84812DBC234E2E010EC2",
    },
    ("pu", "low"): {
        "power_terms": 239694,
        "cube_degrees": [6, 6, 6, 2, 7],
        "bernstein_rows": 8232,
        "positive": 8524635,
        "negative": 0,
        "minimum": "1/1200",
        "rows_sha256": "440D81C21F515301A7CDE2B9E3C2720308522C3739436EB06CA4D6F563DE7C80",
    },
    ("pu,pv", "high"): {
        "power_terms": 330054,
        "cube_degrees": [6, 6, 6, 7],
        "bernstein_rows": 2744,
        "positive": 8532574,
        "negative": 0,
        "minimum": "11/42000",
        "rows_sha256": "231573F4FD6565AC9E2A677F2D4ED366F15D2134EA99F4C184B2B30380A9E0A5",
    },
    ("pu,pv", "low"): {
        "power_terms": 239694,
        "cube_degrees": [6, 6, 6, 2, 7],
        "bernstein_rows": 8232,
        "positive": 8524635,
        "negative": 0,
        "minimum": "1/1200",
        "rows_sha256": "011D2CED8EA61BA33625221CE58AFC640FF21AFB417A2CB89B6F31AFED356E4A",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge_label(edges) -> str:
    return ",".join("".join(sorted(edge)) for edge in sorted(edges)) or "edgeless"


def expression_exhaustion_certificate():
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("collision", n, t)
    rows = {}
    expressions = {}
    for marks, edges in mark_forests("collision"):
        label = edge_label(edges)
        expression = exact_expression(
            "collision", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        assert digest == EXPRESSION_SHA256[label]
        rows[label] = digest
        expressions[label] = expression
    assert set(rows) == {"edgeless", "pu", "pv", "pu,pv"}
    assert sp.expand(expressions["pu"] - expressions["pv"]) == 0
    assert expressions["pu,pv"] != expressions["pu"]
    return {
        "labelled_forests": 4,
        "exact_expression_classes": 3,
        "expression_sha256": rows,
        "pu_pv_exact_symbolic_difference_zero": True,
        "representatives_requiring_large_cones": ["pu", "pu,pv"],
    }


def parse_results(stdout: str):
    lines = [line for line in stdout.splitlines() if line.startswith("RESULT ")]
    assert len(lines) == 2, lines
    pattern = re.compile(
        r"SECTOR (?P<sector>high|low).* "
        r"POWER_TERMS (?P<power>\d+) "
        r"CUBE_DEGREES (?P<degrees>\[[^\]]+\]) "
        r"BERNSTEIN_ROWS (?P<rows>\d+) "
        r"HOMOGENEOUS_POSITIVE (?P<positive>\d+) "
        r"HOMOGENEOUS_NEGATIVE (?P<negative>\d+) "
        r"MINIMUM (?P<minimum>\S+) "
        r"ROWS_SHA256 (?P<digest>[0-9A-F]+)$"
    )
    results = {}
    stdout_digest = hashlib.sha256(stdout.encode()).hexdigest().upper()
    for line in lines:
        match = pattern.search(line)
        assert match is not None, line
        sector = match.group("sector")
        assert sector not in results
        results[sector] = {
            "power_terms": int(match.group("power")),
            "cube_degrees": ast.literal_eval(match.group("degrees")),
            "bernstein_rows": int(match.group("rows")),
            "positive": int(match.group("positive")),
            "negative": int(match.group("negative")),
            "minimum": match.group("minimum"),
            "rows_sha256": match.group("digest"),
            "geometry_stdout_sha256": stdout_digest,
        }
    assert set(results) == {"high", "low"}
    return results


def run_geometry(edges):
    completed = subprocess.run(
        [
            sys.executable,
            "-u",
            str(HERE / PROBE),
            "--mode", "collision",
            "--edges", edges,
        ],
        cwd=HERE,
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    assert completed.stderr == ""
    assert "PROBE_ONLY_NO_MARK_ONLY_COMMON_FOREST_THEOREM" in completed.stdout
    results = parse_results(completed.stdout)
    for sector, result in results.items():
        expected = EXPECTED_LARGE[(edges, sector)]
        assert {key: result[key] for key in expected} == expected, (
            edges, sector, result
        )
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, choices=(1, 2, 4), default=2)
    args = parser.parse_args()
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected, name
    assert all("PENDING" not in row["rows_sha256"] for row in EXPECTED_LARGE.values())

    exhaustion = expression_exhaustion_certificate()
    geometries = ["pu", "pu,pv"]
    # Each subprocess reuses the expensive exact expression and bounded lower
    # for both sectors of one geometry.  The two geometries run concurrently.
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            edges: executor.submit(run_geometry, edges) for edges in geometries
        }
        by_geometry = {edges: futures[edges].result() for edges in geometries}
    large = {
        f"{edges}_{sector}": by_geometry[edges][sector]
        for edges in geometries for sector in ("high", "low")
    }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "family": (
            "collision p=q; p,u,v span an arbitrary labelled forest with uv "
            "forbidden, disjoint from an arbitrary unmarked common forest K and "
            "h extra isolates"
        ),
        "exhaustion": exhaustion,
        "large_certificates": large,
        "proof_partition": {
            "edgeless": "pinned all-order isolated-mark theorem",
            "nonempty_finite": "pinned exhaustive N=0,...,13 mark-only theorem",
            "nonempty_large_low_sibling": (
                "N>=13 exact max-rank6 high/low gap cones for pu and pu,pv; "
                "pv is exactly symmetric to pu"
            ),
            "large_sibling": "pinned universal theorem for 10t>=11n",
            "order_overlap": "N=13 covered on both sides",
            "sibling_overlap": "10t=11n covered on both sides",
        },
        "checks": {
            "all_four_collision_mark_forests_exhausted": True,
            "three_exact_expression_classes_exhausted": True,
            "pu_pv_symmetry_exact": True,
            "four_large_streams_exact_nonnegative": True,
            "four_large_stream_hashes_locked": True,
            "order_partition_gapless": True,
            "sibling_partition_gapless": True,
        },
        "theorem": (
            "For every collision singleton-ordinary rank-six G1 ordinary-leaf "
            "instance in which the distinguished marks span a mark-only forest "
            "component disjoint from an arbitrary common forest, the complete "
            "leaf increment is nonnegative for every order and sibling count."
        ),
        "remaining_obligation": (
            "distinct mark-only components not separately frozen; geometries in "
            "which a distinguished mark shares a component with an unmarked core "
            "vertex; and canonical rank-six G1 modes outside this leaf slice"
        ),
        "scope_guard": (
            "This closes exactly the collision mark-only common-forest leaf slice. "
            "It is not universal rank-six G1, all N6, or Erdos Problem 993."
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
            key: value["rows_sha256"] for key, value in large.items()
        },
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
