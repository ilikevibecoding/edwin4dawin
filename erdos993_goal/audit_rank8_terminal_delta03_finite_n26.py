#!/usr/bin/env python3
"""Bounded independent audit scaffold for the all-root order-26 WROM census.

The primary census is external to this script.  After its logs freeze, this
checks the exact successor source, pinned prior boundary, expected counts,
generic-DP path minima, empty witness stream, and signed-i128 safety.
"""

from __future__ import annotations

import ast
import hashlib
import json
import math
import re
from pathlib import Path

from audit_rank8_terminal_delta03_finite_n23 import (
    adjacency_from_layout, deltas03, path_minima, small_generator_audit,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank8_terminal_delta03_finite_n26_independent_audit_exact_20260820.json"
PRIMARY_LOG = HERE / "rank8_terminal_delta03_finite_n26_primary_20260820.log"
PRIMARY_ERR = HERE / "rank8_terminal_delta03_finite_n26_primary_20260820.err.log"
EXPECTED_PRIMARY_LOG_SHA256 = "0A4E319110FB2937DE97595B24E4E4DFA5DBA7B2F2A6C0FAD3C46E523044DA61"
EXPECTED_PRIMARY_ERR_SHA256 = "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"

EXPECTED_HASHES = {
    "verify_rank8_terminal_delta03_finite_n26.rs":
        "B9BA86D5FCA5A36438116670D0D937D076008F37B3FC7101D7653287F4B1B9FC",
    "verify_rank8_terminal_delta03_finite_n26.exe":
        "C9911356BE65E542BA15FF163DC277180B84E5C5C651931B63B9ABE4736C1A7F",
    "verify_rank8_terminal_delta03_finite_n25.rs":
        "431A54BC6C37EF884074D4ADBD805AE8614A78BB773F37AE4BC84EB0DF7E0E8A",
    "verify_rank8_terminal_delta5_finite.rs":
        "2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6",
    "audit_rank8_terminal_delta03_finite_n25.py":
        "285A7623620B7697FDAF302C33EDD1D2AE4C3AAF5A56B240B020DBC643160F3B",
    "rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json":
        "EDC9574415B23BB596074536734F33123D909258E9BC2D1C713036E426687F72",
}

EXPECTED_TREES = 279_793_450
EXPECTED_ROOTS = 7_274_629_700
EXPECTED_MINIMA = [
    993_449_159_246_754_201_600,
    2_817_881_992_439_429_068_800,
    4_024_927_688_858_057_088_000,
    4_670_215_822_947_096_806_400,
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def source_successor_audit() -> dict:
    previous = (HERE / "verify_rank8_terminal_delta03_finite_n25.rs").read_text(encoding="utf-8")
    current = (HERE / "verify_rank8_terminal_delta03_finite_n26.rs").read_text(encoding="utf-8")
    normalized = (
        current.replace("at core order 26.", "at core order 25.")
        .replace("let n: usize = 26;", "let n: usize = 25;")
        .replace("let expected: u64 = 279_793_450;", "let expected: u64 = 104_636_890;")
        .replace("PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N26", "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N25")
    )
    assert normalized == previous
    return {"normalized_byte_for_byte_equal_to_n25": True}


def frozen_n25_audit() -> dict:
    report = json.loads(
        (HERE / "rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N25"
    assert report["primary"]["trees"] == 104_636_890
    assert report["primary"]["roots"] == report["primary"]["active_roots"] == 2_615_922_250
    assert report["primary"]["negative_counts"] == [0, 0, 0, 0]
    return {
        "trees": report["primary"]["trees"],
        "roots": report["primary"]["roots"],
        "minima": report["primary"]["minima"],
    }


def i128_audit() -> dict:
    n = 26
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
    r"core_n=26 trees=(\d+) roots=(\d+) active=(\d+) "
    r"minima=(\[[^\]]+\]) active_minima=(\[[^\]]+\]) "
    r"negative_counts=(\[[^\]]+\])"
)
WITNESS_RE = re.compile(
    r"(?:FIRST_NEGATIVE|MINIMUM_WITNESS) n=26 layout=(\[[^\]]+\]) "
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
    assert "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N26" in stdout
    assert trees == EXPECTED_TREES
    assert roots == trees * 26 == EXPECTED_ROOTS
    assert active == roots
    assert active_minima == minima
    assert negative_counts == [0, 0, 0, 0]
    assert stderr == ""

    path_values, path_roots = path_minima(26)
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
        "log_sha256": sha256(PRIMARY_LOG), "stderr_sha256": sha256(PRIMARY_ERR),
        "trees": trees, "roots": roots, "active_roots": active,
        "minima": minima, "active_minima": active_minima,
        "negative_counts": negative_counts, "negative_witness_stream_empty": True,
        "path_endpoint_witness": {
            "layout": list(range(26)), "root": 0, "values": path_values,
            "matches_all_global_minima": True,
        },
    }


def main() -> None:
    assert EXPECTED_PRIMARY_LOG_SHA256 != "FILL_AFTER_PRIMARY_FREEZE"
    assert EXPECTED_PRIMARY_ERR_SHA256 != "FILL_AFTER_PRIMARY_FREEZE"
    actual = {name: sha256(HERE / name) for name in EXPECTED_HASHES}
    assert actual == EXPECTED_HASHES
    report = {
        "status": "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N26",
        "scope": {
            "core_order": 26, "free_trees": EXPECTED_TREES,
            "all_rooted_pairs": EXPECTED_ROOTS, "ranks": [0, 1, 2, 3],
            "claim": "finite exact order-26 census only",
        },
        "artifact_hashes": actual,
        "audit_source_sha256": sha256(Path(__file__)),
        "source_successor": source_successor_audit(),
        "generator": small_generator_audit(),
        "frozen_n25": frozen_n25_audit(),
        "i128_safety": i128_audit(),
        "primary": primary_audit(),
        "limitations": [
            "the independent audit intentionally does not repeat the full order-26 census",
            "this is a finite n=26 theorem and is not an all-order rank-eight theorem",
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
