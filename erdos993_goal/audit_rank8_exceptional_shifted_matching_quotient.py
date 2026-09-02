#!/usr/bin/env python3
"""Independent, low-memory audit of the ten-cell shifted-Q8 certificate.

This does not enumerate the core trees again.  It checks the exact cell
partition, every canonical certificate, the two sharded assemblies, the
aggregate arithmetic, the degree/finite-difference logic, and one fresh
small-cell replay of the final executable.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_exceptional_shifted_matching_quotient_exact_20260820.json"
NONIMPLICATION = ROOT / "rank8_alpha14_matching_shift_implication_audit_exact_20260820.json"
REDUCTION = ROOT / "rank8_shifted_exceptional_matching_reduction_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_shifted_matching_quotient_independent_audit_exact_20260820.json"
SOURCE = ROOT / "verify_rank8_exceptional_shifted_matching_quotient.rs"
EXECUTABLE = ROOT / "verify_rank8_exceptional_shifted_matching_quotient.exe"
RUNNER = ROOT / "run_rank8_exceptional_shifted_matching_quotient.py"
ASSEMBLER = ROOT / "assemble_rank8_exceptional_shifted_shards.py"

CELLS = (
    (21, 11), (22, 11),
    (21, 12), (22, 12), (23, 12), (24, 12),
    (23, 13), (24, 13), (25, 13), (26, 13),
)
ALL_TWELVE = (
    (21, 11), (21, 12), (21, 13),
    (22, 11), (22, 12), (22, 13),
    (23, 12), (23, 13),
    (24, 12), (24, 13),
    (25, 13), (26, 13),
)
CONDITIONAL = ((21, 13), (22, 13))
TREE_COUNTS = {11: 235, 12: 551, 13: 1301}
EXPECTED_EXPANSIONS = {
    (21, 11): 919_287,
    (22, 11): 120_320,
    (21, 12): 15_465_811,
    (22, 12): 12_517_543,
    (23, 12): 4_668_087,
    (24, 12): 564_224,
    (23, 13): 99_535_527,
    (24, 13): 70_742_243,
    (25, 13): 23_726_807,
    (26, 13): 2_664_448,
}
EXPECTED_TOTALS = {
    "endpoint_coverings": 361_742_723,
    "matching_valid_expansions_with_multiplicity": 230_924_297,
    "rooted_checks_with_multiplicity": 5_392_604_197,
}
EXPECTED_MINIMA = [
    2441788992, 5403864203, 10558277852, 16937770356,
    21360051651, 21057546787, 16449656126, 10071666558,
    4851340810, 1833087879, 555852696, 131500413,
    23186295, 2824107, 206349, 6435,
]

LINE = re.compile(
    r"^QSHIFT order=(?P<order>\d+) alpha=(?P<alpha>\d+) "
    r"matching=(?P<matching>\d+) unmatched=(?P<unmatched>\d+) "
    r"quotient_total=(?P<quotient_total>\d+) quotient_processed=(?P<quotient_processed>\d+) "
    r"singleton_designations=(?P<singleton_designations>\d+) "
    r"endpoint_coverings=(?P<endpoint_coverings>\d+) "
    r"valid_expansions=(?P<valid_expansions>\d+) rooted_checks=(?P<rooted_checks>\d+) "
    r"negatives=(?P<negatives>\[[^]]*\]) minima=(?P<minima>\[[^]]*\])$"
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def byte_digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def parse(text: str) -> dict:
    lines = [line for line in text.splitlines() if line.startswith("QSHIFT ")]
    assert len(lines) == 1, lines
    match = LINE.fullmatch(lines[0])
    assert match, lines[0]
    row = {
        key: int(value)
        for key, value in match.groupdict().items()
        if key not in {"negatives", "minima"}
    }
    row["negatives"] = json.loads(match.group("negatives"))
    row["minima"] = json.loads(match.group("minima"))
    return row


def check_row(row: dict, order: int, alpha: int, *, full: bool) -> None:
    assert row["order"] == order and row["alpha"] == alpha
    assert row["matching"] == order-alpha
    assert row["unmatched"] == 2*alpha-order
    assert row["quotient_total"] == TREE_COUNTS[alpha]
    if full:
        assert row["quotient_processed"] == TREE_COUNTS[alpha]
    assert row["rooted_checks"] == order*row["valid_expansions"]
    assert len(row["negatives"]) == len(row["minima"]) == 16
    assert row["negatives"] == [0]*16
    assert all(value > 0 for value in row["minima"])


def main() -> None:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    nonimplication = json.loads(NONIMPLICATION.read_text(encoding="utf-8"))
    reduction = json.loads(REDUCTION.read_text(encoding="utf-8"))

    assert report["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_TEN_CELLS"
    assert nonimplication["status"] == "PASS_EXACT_NONIMPLICATION_AUDIT"
    assert nonimplication["exact_relaxed_nonimplication_witness"]["C1"] == -37
    assert nonimplication["exact_relaxed_nonimplication_witness"]["Q8_at_threshold"] == 15

    # A tree has alpha=n-nu and alpha>=ceil(n/2).  These are exactly the
    # possible cells with 21<=n<=26 and alpha<=13.
    derived_twelve = tuple(
        (order, alpha)
        for order in range(21, 27)
        for alpha in range((order+1)//2, 14)
    )
    assert derived_twelve == ALL_TWELVE
    assert set(ALL_TWELVE)-set(CONDITIONAL) == set(CELLS)
    assert report["coverage"]["scanned_unconditionally"] == [list(cell) for cell in CELLS]
    assert report["coverage"]["already_closed_conditional_on_Q7"] == [list(cell) for cell in CONDITIONAL]

    rows = report["cells"]
    assert [(row["order"], row["alpha"]) for row in rows] == list(CELLS)
    parsed_rows = {}
    for row in rows:
        cell = (row["order"], row["alpha"])
        check_row(row, *cell, full=True)
        assert row["t0"] == 14-row["alpha"]
        assert row["valid_expansions"] == EXPECTED_EXPANSIONS[cell]
        log = ROOT / row["log"]
        error = ROOT / row["stderr"]
        assert digest(log) == row["log_sha256"]
        assert digest(error) == row["stderr_sha256"]
        assert error.read_bytes() == b""
        text = log.read_text(encoding="utf-8")
        marker = (
            "PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_"
            f"ORDER_{cell[0]}_ALPHA_{cell[1]}_SHARD_0_OF_1"
        )
        assert marker in text
        parsed = parse(text)
        check_row(parsed, *cell, full=True)
        for key in (
            "matching", "unmatched", "quotient_total", "quotient_processed",
            "singleton_designations", "endpoint_coverings", "valid_expansions",
            "rooted_checks", "negatives", "minima",
        ):
            assert parsed[key] == row[key], (cell, key)
        parsed_rows[cell] = parsed

    totals = report["totals"]
    for key, expected in EXPECTED_TOTALS.items():
        assert totals[key] == expected
    assert totals["negative_coefficients"] == [0]*16
    assert totals["coefficient_minima"] == EXPECTED_MINIMA
    assert totals["endpoint_coverings"] == sum(row["endpoint_coverings"] for row in rows)
    assert totals["matching_valid_expansions_with_multiplicity"] == sum(row["valid_expansions"] for row in rows)
    assert totals["rooted_checks_with_multiplicity"] == sum(row["rooted_checks"] for row in rows)
    assert totals["coefficient_minima"] == [min(row["minima"][j] for row in rows) for j in range(16)]

    # Independently reassemble both four-shard cells from the raw shard logs.
    shard_proof = []
    by_order = {item["order"]: item for item in report["shard_certificates"]}
    assert set(by_order) == {23, 24}
    additive = (
        "quotient_processed", "singleton_designations", "endpoint_coverings",
        "valid_expansions", "rooted_checks",
    )
    for order in (23, 24):
        certificate = by_order[order]
        assert certificate["indices"] == [0, 1, 2, 3]
        assert certificate["quotient_processed_sum"] == certificate["quotient_total"] == 1301
        parts = []
        for item in certificate["shards"]:
            index = item["index"]
            log = ROOT / item["log"]
            error = ROOT / item["stderr"]
            assert digest(log) == item["log_sha256"]
            assert digest(error) == item["stderr_sha256"]
            assert error.read_bytes() == b""
            text = log.read_text(encoding="utf-8")
            assert f"SHARD_{index}_OF_4" in text
            part = parse(text)
            check_row(part, order, 13, full=False)
            assert part["quotient_processed"] == item["quotient_processed"]
            parts.append(part)
        whole = parsed_rows[(order, 13)]
        for key in additive:
            assert sum(part[key] for part in parts) == whole[key], (order, key)
        assert [sum(part["negatives"][j] for part in parts) for j in range(16)] == whole["negatives"]
        assert [min(part["minima"][j] for part in parts) for j in range(16)] == whole["minima"]
        shard_proof.append({
            "order": order,
            "quotient_processed_sum": sum(part["quotient_processed"] for part in parts),
            "valid_expansions_sum": sum(part["valid_expansions"] for part in parts),
            "rooted_checks_sum": sum(part["rooted_checks"] for part in parts),
        })

    # Q8 has degree at most 15 in t: its apparent t^16 coefficient cancels.
    leading_p8_squared = Fraction(16, math.factorial(8)**2)
    leading_p7_p9 = Fraction(18, math.factorial(7)*math.factorial(9))
    assert leading_p8_squared == leading_p7_p9
    assert 16*1*1-1*1-18*1*0 == 15
    p7, p8, p9, d7, d8, d9 = 1, 1, 0, 1, 0, 1
    c1 = (
        16*(2*p8*d8+d8*d8)
        -(p7*d8+p8*d7+d7*d8)
        -18*(p7*d9+p9*d7+d7*d9)
    )
    assert c1 == -37

    # Check live artifact hashes and replay the smallest cheap cell with the
    # final executable; compare its stdout byte-for-byte to the canonical log.
    live_hashes = {
        "source_sha256": digest(SOURCE),
        "executable_sha256": digest(EXECUTABLE),
        "runner_sha256": digest(RUNNER),
        "shard_assembler_sha256": digest(ASSEMBLER),
    }
    assert report["hashes"] == live_hashes
    replay = subprocess.run(
        [str(EXECUTABLE), "--order", "22", "--alpha", "11"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    canonical = (ROOT / "rank8_exceptional_shifted_matching_q_n22_a11_exact_20260820.log").read_bytes()
    assert replay.returncode == 0 and replay.stderr == b""
    assert replay.stdout == canonical

    payload = {
        "schema": "rank8-exceptional-shifted-matching-quotient-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT",
        "classification": {
            "all_exceptional_cells": [list(cell) for cell in ALL_TWELVE],
            "literal_shift_cells_proved_unconditionally": [list(cell) for cell in CELLS],
            "cells_retained_conditional_on_rank7_Q7": [list(cell) for cell in CONDITIONAL],
            "exact_dependency": "The final two cells close once Q7(A-q)>=0 is available for alpha(A-q)>=12; the other ten shifted literal-Q8 cells do not use that dependency.",
        },
        "coefficient_certificate": {
            "complete_newton_ranks": list(range(16)),
            "degree_bound": 15,
            "degree_16_cancellation": "16/(8!)^2=18/(7!9!)",
            "all_negative_counts": [0]*16,
            "global_strict_minima": EXPECTED_MINIMA,
        },
        "coverage": {
            "method": "maximum-matching quotient trees; independent unmatched singleton blocks; gauge-normal endpoint assignments; exact augmenting-path rejection; exact alpha recomputation; every root",
            "quotient_tree_counts": TREE_COUNTS,
            "expanded_core_coverings_with_multiplicity": EXPECTED_TOTALS["matching_valid_expansions_with_multiplicity"],
            "rooted_checks_with_multiplicity": EXPECTED_TOTALS["rooted_checks_with_multiplicity"],
            "shard_reassembly": shard_proof,
            "broad_WROM_scan": False,
        },
        "nonimplication": {
            "threshold_Q8": 15,
            "first_shifted_coefficient": -37,
            "scope": "relaxed algebraic witness only; it proves the alpha-14 boundary statistic alone does not imply the shift",
        },
        "fresh_replay": {
            "cell": [22, 11],
            "stdout_sha256": byte_digest(replay.stdout),
            "canonical_sha256": byte_digest(canonical),
            "byte_identical": True,
        },
        "scope_warning": "This proves the ten-cell exceptional literal shifted-Q8 guard and identifies the exact two-cell Q7 dependency. It does not prove large-core Delta0..Delta4, connected Q8, a forest convolution lift, or rank-eight PGC.",
        "hashes": {
            **live_hashes,
            "classification_report_sha256": digest(REPORT),
            "nonimplication_report_sha256": digest(NONIMPLICATION),
            "prior_reduction_report_sha256": digest(REDUCTION),
            "audit_script_sha256": digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True)+"\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", OUTPUT.name, digest(OUTPUT))


if __name__ == "__main__":
    main()
