#!/usr/bin/env python3
"""Bounded independent audit of the exact all-root order-24 WROM census.

The expensive census is never rerun here.  This audit pins the frozen n=24
wrapper/executable/logs, proves the wrapper is exactly the n=23 checker with
only the declared order/count/status substitutions, reuses the independently
audited small WROM/atlas checks, reconstructs the global path-endpoint minima
with generic tree DP, and checks a conservative signed-i128 bound.
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
REPORT = HERE / "rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json"
PRIMARY_LOG = HERE / "rank8_terminal_delta03_finite_n24_primary_20260820.log"
PRIMARY_ERR = HERE / "rank8_terminal_delta03_finite_n24_primary_20260820.err.log"

# The primary log hashes are filled only after the root-owned census exits.
EXPECTED_PRIMARY_LOG_SHA256 = "8FF4CE82AD545051D1259149CE4875D2CA5E6E3EDFF3314720FF00530CB9BFC4"
EXPECTED_PRIMARY_ERR_SHA256 = "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"

EXPECTED_HASHES = {
    "verify_rank8_terminal_delta03_finite_n24.rs":
        "02B51B72B4E75B332E3B4DFBC1497AD2C84E307B082EE49152D42D1B18E09468",
    "verify_rank8_terminal_delta03_finite_n24.exe":
        "398E61190A52F26ED961F04595CD3058BA5A85379DE49F5FD17A625C7253ECF1",
    "verify_rank8_terminal_delta03_finite_n23.rs":
        "04637D9DAC26F23C0A7839C57D6BC3D7243D2A3D06240D17A5A18B84AE09788E",
    "verify_rank8_terminal_delta5_finite.rs":
        "2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6",
    "audit_rank8_terminal_delta03_finite_n23.py":
        "F026F75B38DF3647ECF6DE04F479DE9CB006552925E2772AD7CB32135B4CEFA3",
    "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json":
        "6161599896A4E9991B9D6E0B131D4075EC3C4230B9DB0A038CAF6108747427F4",
}

EXPECTED_TREES = 39_299_897
EXPECTED_ROOTS = 943_197_528
EXPECTED_MINIMA = [
    34_473_285_324_077_064_192,
    110_853_430_454_951_847_936,
    191_062_683_117_818_942_976,
    265_702_252_552_979_633_664,
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def source_successor_audit() -> dict:
    n23 = (HERE / "verify_rank8_terminal_delta03_finite_n23.rs").read_text(encoding="utf-8")
    n24 = (HERE / "verify_rank8_terminal_delta03_finite_n24.rs").read_text(encoding="utf-8")
    normalized = (
        n24.replace("at core order 24.", "at core order 23.")
        .replace("let n: usize = 24;", "let n: usize = 23;")
        .replace("let expected: u64 = 39_299_897;", "let expected: u64 = 14_828_074;")
        .replace("PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N24", "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N23")
    )
    assert normalized == n23
    assert 'include!("verify_rank8_terminal_delta5_finite.rs");' in n24
    return {
        "normalized_byte_for_byte_equal_to_n23": True,
        "only_changes": ["commented order", "n", "expected free-tree count", "PASS label"],
    }


def frozen_n23_audit() -> dict:
    report = json.loads(
        (HERE / "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N23"
    assert report["primary"]["trees"] == 14_828_074
    assert report["primary"]["roots"] == report["primary"]["active_roots"] == 341_045_702
    assert report["primary"]["negative_counts"] == [0, 0, 0, 0]
    assert report["primary"]["path_endpoint_witness"]["matches_all_global_minima"]
    return {
        "trees": report["primary"]["trees"],
        "roots": report["primary"]["roots"],
        "minima": report["primary"]["minima"],
        "independent_small_generator": report["generator"],
    }


def i128_audit() -> dict:
    n = 24
    c7 = math.comb(n, 7)
    c8 = math.comb(n, 8)
    h6 = math.comb(n - 1, 6)
    h7 = math.comb(n - 1, 7)
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
    assert 2**24 < i128_max
    return {
        "coefficient_bounds": {"c7": c7, "c8": c8, "h6": h6, "h7": h7},
        "derived_bounds": {"p7": p7, "p8": p8, "p9_open_loose": p9},
        "absolute_residual_bound": residual_bound,
        "absolute_delta3_bound": delta3_bound,
        "delta3_bound_bits": delta3_bound.bit_length(),
        "i128_positive_bits": 127,
        "integer_margin_floor": i128_max // delta3_bound,
    }


SUMMARY_RE = re.compile(
    r"core_n=24 trees=(\d+) roots=(\d+) active=(\d+) "
    r"minima=(\[[^\]]+\]) active_minima=(\[[^\]]+\]) "
    r"negative_counts=(\[[^\]]+\])"
)
WITNESS_RE = re.compile(
    r"(?:FIRST_NEGATIVE|MINIMUM_WITNESS) n=24 layout=(\[[^\]]+\]) "
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
    assert "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N24" in stdout
    assert trees == EXPECTED_TREES
    assert roots == trees * 24 == EXPECTED_ROOTS
    assert active == roots
    assert negative_counts == [0, 0, 0, 0]
    assert active_minima == minima
    assert stderr == ""

    path_values, path_roots = path_minima(24)
    assert path_values == EXPECTED_MINIMA
    assert path_roots == [0, 0, 0, 0]
    assert minima == path_values

    emitted = []
    for match in WITNESS_RE.finditer(stdout + "\n" + stderr):
        layout = list(ast.literal_eval(match.group(1)))
        root = int(match.group(2))
        rank = int(match.group(3))
        reported = int(match.group(4))
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
            "layout": list(range(24)),
            "root": 0,
            "values": path_values,
            "matches_all_global_minima": True,
        },
    }


def main() -> None:
    assert EXPECTED_PRIMARY_LOG_SHA256 != "FILL_AFTER_PRIMARY_FREEZE"
    assert EXPECTED_PRIMARY_ERR_SHA256 != "FILL_AFTER_PRIMARY_FREEZE"
    actual = {name: sha256(HERE / name) for name in EXPECTED_HASHES}
    assert actual == EXPECTED_HASHES
    generator = small_generator_audit()
    report = {
        "status": "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N24",
        "scope": {
            "core_order": 24,
            "free_trees": EXPECTED_TREES,
            "all_rooted_pairs": EXPECTED_ROOTS,
            "ranks": [0, 1, 2, 3],
            "claim": "finite exact order-24 census only",
        },
        "artifact_hashes": actual,
        "audit_source_sha256": sha256(Path(__file__)),
        "source_successor": source_successor_audit(),
        "generator": generator,
        "frozen_n23": frozen_n23_audit(),
        "i128_safety": i128_audit(),
        "primary": primary_audit(),
        "method": [
            "n24 wrapper normalizes byte-for-byte to the frozen n23 wrapper under four declared substitutions",
            "the n23 audit's independent WROM translation and graph-atlas bijection are hash-pinned and replayed",
            "generic tree DP reconstructs all four n24 path-endpoint global minima",
            "explicit binomial majorant bounds every rank-0..3 value below signed i128 with over 1e11 margin",
            "both output streams are checked for an empty negative-witness stream",
        ],
        "limitations": [
            "the independent audit intentionally does not repeat the full order-24 census",
            "this is a finite n=24 theorem and is not an all-order rank-eight theorem",
        ],
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "report": REPORT.name,
        "report_sha256": sha256(REPORT),
        "audit_source_sha256": report["audit_source_sha256"],
        "minima": report["primary"]["minima"],
    }, indent=2))


if __name__ == "__main__":
    main()
