#!/usr/bin/env python3
"""Bounded independent audit of the exact all-root order-25 WROM census.

This never launches the expensive census.  It audits the frozen successor
wrapper and completed primary logs, reuses the independently checked WROM
small-order/atlas lane, reconstructs path-endpoint minima with generic tree
DP, and proves a conservative signed-i128 bound.
"""

from __future__ import annotations

import ast
import hashlib
import json
import math
import re
from pathlib import Path

from audit_rank8_terminal_delta03_finite_n23 import (
    adjacency_from_layout,
    deltas03,
    path_minima,
    small_generator_audit,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json"
PRIMARY_LOG = HERE / "rank8_terminal_delta03_finite_n25_primary_20260820.log"
PRIMARY_ERR = HERE / "rank8_terminal_delta03_finite_n25_primary_20260820.err.log"
EXPECTED_PRIMARY_LOG_SHA256 = "030E2A06BCEF8A4FFA09B366BA699245C244F94298156993A0BC6411BFAE206F"
EXPECTED_PRIMARY_ERR_SHA256 = "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"

EXPECTED_HASHES = {
    "verify_rank8_terminal_delta03_finite_n25.rs":
        "431A54BC6C37EF884074D4ADBD805AE8614A78BB773F37AE4BC84EB0DF7E0E8A",
    "verify_rank8_terminal_delta03_finite_n25.exe":
        "4A91610ED7D468D62EA1FC81B1A199EE23338FE4F22E3AFDA7E198E3B04F7110",
    "verify_rank8_terminal_delta03_finite_n24.rs":
        "02B51B72B4E75B332E3B4DFBC1497AD2C84E307B082EE49152D42D1B18E09468",
    "verify_rank8_terminal_delta5_finite.rs":
        "2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6",
    "audit_rank8_terminal_delta03_finite_n24.py":
        "2BE60B8C9814F5F64E61B1FD68A4FE521CF2FC877D94E333BDC061811E9B8097",
    "rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json":
        "60F0DA73B3B6A749EE48E6D54DA2B044A97054235E5A0D04E12B4CD03B616428",
}

EXPECTED_TREES = 104_636_890
EXPECTED_ROOTS = 2_615_922_250
EXPECTED_MINIMA = [
    195_231_879_800_229_242_880,
    587_022_928_070_258_744_064,
    916_860_486_100_125_176_064,
    1_160_407_068_315_624_694_656,
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def source_successor_audit() -> dict:
    previous = (HERE / "verify_rank8_terminal_delta03_finite_n24.rs").read_text(encoding="utf-8")
    current = (HERE / "verify_rank8_terminal_delta03_finite_n25.rs").read_text(encoding="utf-8")
    normalized = (
        current.replace("at core order 25.", "at core order 24.")
        .replace("let n: usize = 25;", "let n: usize = 24;")
        .replace("let expected: u64 = 104_636_890;", "let expected: u64 = 39_299_897;")
        .replace("PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N25", "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N24")
    )
    assert normalized == previous
    return {
        "normalized_byte_for_byte_equal_to_n24": True,
        "only_changes": ["commented order", "n", "expected free-tree count", "PASS label"],
    }


def frozen_n24_audit() -> dict:
    report = json.loads(
        (HERE / "rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N24"
    assert report["primary"]["trees"] == 39_299_897
    assert report["primary"]["roots"] == report["primary"]["active_roots"] == 943_197_528
    assert report["primary"]["negative_counts"] == [0, 0, 0, 0]
    assert report["primary"]["negative_witness_stream_empty"]
    return {
        "trees": report["primary"]["trees"],
        "roots": report["primary"]["roots"],
        "minima": report["primary"]["minima"],
        "audit_sha256": sha256(HERE / "rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json"),
    }


def i128_audit() -> dict:
    n = 25
    c7, c8 = math.comb(n, 7), math.comb(n, 8)
    h6, h7 = math.comb(n - 1, 6), math.comb(n - 1, 7)
    p7 = math.comb(n + 4, 7) + h6
    p8 = math.comb(n + 4, 8) + h7
    p9 = math.comb(n + 4, 9)
    term1 = 8 * c7 * h6 * (16 * p8 * p8 + p7 * p8 + 18 * p7 * p9)
    term2 = 8 * h6 * p7 * (16 * c8 * c8 + c7 * c8)
    term3 = 9 * c7 * p7 * (14 * h7 * h7 + h6 * h7)
    residual_bound = term1 + term2 + term3
    delta3_bound = 8 * residual_bound
    i128_max = 2**127 - 1
    assert delta3_bound < i128_max
    return {
        "absolute_residual_bound": residual_bound,
        "absolute_delta3_bound": delta3_bound,
        "delta3_bound_bits": delta3_bound.bit_length(),
        "i128_positive_bits": 127,
        "integer_margin_floor": i128_max // delta3_bound,
    }


SUMMARY_RE = re.compile(
    r"core_n=25 trees=(\d+) roots=(\d+) active=(\d+) "
    r"minima=(\[[^\]]+\]) active_minima=(\[[^\]]+\]) "
    r"negative_counts=(\[[^\]]+\])"
)
WITNESS_RE = re.compile(
    r"(?:FIRST_NEGATIVE|MINIMUM_WITNESS) n=25 layout=(\[[^\]]+\]) "
    r"root=(\d+) delta=(\d+) value=(-?\d+)"
)


def primary_audit() -> dict:
    assert sha256(PRIMARY_LOG) == EXPECTED_PRIMARY_LOG_SHA256
    assert sha256(PRIMARY_ERR) == EXPECTED_PRIMARY_ERR_SHA256
    stdout = PRIMARY_LOG.read_text(encoding="utf-8")
    stderr = PRIMARY_ERR.read_text(encoding="utf-8")
    matches = SUMMARY_RE.findall(stdout)
    assert len(matches) == 1
    trees_s, roots_s, active_s, minima_s, active_minima_s, negative_s = matches[0]
    trees, roots, active = int(trees_s), int(roots_s), int(active_s)
    minima = list(ast.literal_eval(minima_s))
    active_minima = [int(value) for value in ast.literal_eval(active_minima_s)]
    negative_counts = list(ast.literal_eval(negative_s))
    assert "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N25" in stdout
    assert trees == EXPECTED_TREES
    assert roots == trees * 25 == EXPECTED_ROOTS
    assert active == roots
    assert active_minima == minima
    assert negative_counts == [0, 0, 0, 0]
    assert stderr == ""

    path_values, path_roots = path_minima(25)
    assert path_values == EXPECTED_MINIMA
    assert path_roots == [0, 0, 0, 0]
    assert minima == path_values

    emitted = []
    for match in WITNESS_RE.finditer(stdout + "\n" + stderr):
        layout = list(ast.literal_eval(match.group(1)))
        root, rank, reported = int(match.group(2)), int(match.group(3)), int(match.group(4))
        actual = deltas03(adjacency_from_layout(layout), root)[rank]
        assert actual == reported
        emitted.append({"layout": layout, "root": root, "rank": rank, "value": actual})
    assert emitted == []
    assert "FIRST_NEGATIVE" not in stdout + stderr
    assert "MINIMUM_WITNESS" not in stdout + stderr
    return {
        "log_sha256": sha256(PRIMARY_LOG),
        "stderr_sha256": sha256(PRIMARY_ERR),
        "trees": trees,
        "roots": roots,
        "active_roots": active,
        "minima": minima,
        "active_minima": active_minima,
        "negative_counts": negative_counts,
        "negative_witness_stream_empty": True,
        "path_endpoint_witness": {
            "layout": list(range(25)), "root": 0, "values": path_values,
            "matches_all_global_minima": True,
        },
    }


def main() -> None:
    assert EXPECTED_PRIMARY_LOG_SHA256 != "FILL_AFTER_PRIMARY_FREEZE"
    assert EXPECTED_PRIMARY_ERR_SHA256 != "FILL_AFTER_PRIMARY_FREEZE"
    actual = {name: sha256(HERE / name) for name in EXPECTED_HASHES}
    assert actual == EXPECTED_HASHES
    report = {
        "status": "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N25",
        "scope": {
            "core_order": 25, "free_trees": EXPECTED_TREES,
            "all_rooted_pairs": EXPECTED_ROOTS, "ranks": [0, 1, 2, 3],
            "claim": "finite exact order-25 census only",
        },
        "artifact_hashes": actual,
        "audit_source_sha256": sha256(Path(__file__)),
        "source_successor": source_successor_audit(),
        "generator": small_generator_audit(),
        "frozen_n24": frozen_n24_audit(),
        "i128_safety": i128_audit(),
        "primary": primary_audit(),
        "limitations": [
            "the independent audit intentionally does not repeat the full order-25 census",
            "this is a finite n=25 theorem and is not an all-order rank-eight theorem",
        ],
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"], "report": REPORT.name,
        "report_sha256": sha256(REPORT),
        "audit_source_sha256": report["audit_source_sha256"],
        "minima": report["primary"]["minima"],
    }, indent=2))


if __name__ == "__main__":
    main()
