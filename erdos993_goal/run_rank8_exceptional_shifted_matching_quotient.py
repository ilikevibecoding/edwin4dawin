#!/usr/bin/env python3
"""Run and assemble the ten-cell matching-quotient shifted-Q8 certificate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank8_exceptional_shifted_matching_quotient.exe"
SOURCE = ROOT / "verify_rank8_exceptional_shifted_matching_quotient.rs"
OUTPUT = ROOT / "rank8_exceptional_shifted_matching_quotient_exact_20260820.json"

# The two omitted cells (21,13),(22,13) are already paid, conditional on Q7,
# by Q8(A), Q7(A-q), and the exact all-root residual coefficients.
CELLS = (
    (21, 11), (22, 11),
    (21, 12), (22, 12), (23, 12), (24, 12),
    (23, 13), (24, 13), (25, 13), (26, 13),
)
QUOTIENT_TREE_COUNTS = {11: 235, 12: 551, 13: 1301}

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


def log_path(order: int, alpha: int) -> Path:
    return ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a{alpha}_exact_20260820.log"


def err_path(order: int, alpha: int) -> Path:
    return ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a{alpha}_exact_20260820.err"


def marker(order: int, alpha: int) -> str:
    return f"PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_ORDER_{order}_ALPHA_{alpha}_SHARD_0_OF_1"


def ensure_cell(order: int, alpha: int) -> str:
    log = log_path(order, alpha)
    existing = log.read_text(encoding="utf-8") if log.exists() else ""
    if marker(order, alpha) in existing:
        return existing
    result = subprocess.run(
        [str(EXE), "--order", str(order), "--alpha", str(alpha)],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    log.write_text(result.stdout, encoding="utf-8")
    err_path(order, alpha).write_text(result.stderr, encoding="utf-8")
    if result.returncode or marker(order, alpha) not in result.stdout:
        raise RuntimeError(f"cell {(order, alpha)} failed\n{result.stdout}\n{result.stderr}")
    return result.stdout


def parse_qshift(text: str, order: int, alpha: int) -> dict:
    lines = [line for line in text.splitlines() if line.startswith("QSHIFT ")]
    assert len(lines) == 1, (order, alpha, lines)
    match = LINE.fullmatch(lines[0])
    assert match, lines[0]
    row = {key: int(value) for key, value in match.groupdict().items()
           if key not in {"negatives", "minima"}}
    row["negatives"] = json.loads(match.group("negatives"))
    row["minima"] = json.loads(match.group("minima"))
    assert row["order"] == order and row["alpha"] == alpha
    assert row["matching"] == order-alpha
    assert row["unmatched"] == 2*alpha-order
    assert row["rooted_checks"] == order*row["valid_expansions"]
    assert len(row["negatives"]) == len(row["minima"]) == 16
    assert all(value == 0 for value in row["negatives"])
    assert all(value > 0 for value in row["minima"])
    return row


def parse_cell(text: str, order: int, alpha: int) -> dict:
    row = parse_qshift(text, order, alpha)
    assert row["quotient_total"] == row["quotient_processed"] == QUOTIENT_TREE_COUNTS[alpha]
    row["t0"] = 14-alpha
    row["log"] = log_path(order, alpha).name
    row["log_sha256"] = digest(log_path(order, alpha))
    row["stderr"] = err_path(order, alpha).name
    row["stderr_sha256"] = digest(err_path(order, alpha))
    assert err_path(order, alpha).read_text(encoding="utf-8") == ""
    return row


def main() -> None:
    rows = []
    for order, alpha in CELLS:
        print("CELL", order, alpha, flush=True)
        rows.append(parse_cell(ensure_cell(order, alpha), order, alpha))
        print("PASS", order, alpha, rows[-1]["valid_expansions"], rows[-1]["rooted_checks"], flush=True)
    minima = [min(row["minima"][rank] for row in rows) for rank in range(16)]
    shard_certificates = []
    for order in (23, 24):
        items = []
        processed = 0
        for index in range(4):
            log = ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a13_shard_{index}_of4_20260820.log"
            err = ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a13_shard_{index}_of4_20260820.err"
            text = log.read_text(encoding="utf-8")
            row = parse_qshift(text, order, 13)
            assert row["quotient_total"] == QUOTIENT_TREE_COUNTS[13]
            marker_text = f"SHARD_{index}_OF_4"
            assert marker_text in text
            assert err.read_text(encoding="utf-8") == ""
            processed += row["quotient_processed"]
            items.append({
                "index": index,
                "log": log.name,
                "log_sha256": digest(log),
                "stderr": err.name,
                "stderr_sha256": digest(err),
                "quotient_processed": row["quotient_processed"],
            })
        assert processed == QUOTIENT_TREE_COUNTS[13]
        shard_certificates.append({
            "order": order,
            "alpha": 13,
            "shard_count": 4,
            "indices": [0,1,2,3],
            "quotient_processed_sum": processed,
            "quotient_total": QUOTIENT_TREE_COUNTS[13],
            "shards": items,
        })
    payload = {
        "schema": "rank8-exceptional-shifted-matching-quotient-v1",
        "status": "PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_TEN_CELLS",
        "theorem": "For the ten listed rooted tree-core cells, every shifted Newton coefficient C0..C15 of literal Q8(G_t), shifted at t0=14-alpha(A), is strictly positive.",
        "method": "connected maximum-matching quotient trees, independent singleton designations, gauge-normal endpoint patterns, exact augmenting-path rejection, exact alpha recomputation, and every root",
        "cells": rows,
        "cell_count": len(rows),
        "totals": {
            "endpoint_coverings": sum(row["endpoint_coverings"] for row in rows),
            "matching_valid_expansions_with_multiplicity": sum(row["valid_expansions"] for row in rows),
            "rooted_checks_with_multiplicity": sum(row["rooted_checks"] for row in rows),
            "negative_coefficients": [sum(row["negatives"][rank] for row in rows) for rank in range(16)],
            "coefficient_minima": minima,
        },
        "coverage": {
            "scanned_unconditionally": [list(cell) for cell in CELLS],
            "already_closed_conditional_on_Q7": [[21, 13], [22, 13]],
            "reason_for_omission": "Q8(A)>=0 from the exact alpha=13 matching boundary, Q7(A-q)>=0 from the rank-seven target theorem, and Delta0..Delta15>=0 from exact all-root/order packages.",
            "result_after_Q7": "all twelve exceptional core cells at orders 21..26 are closed",
        },
        "shard_certificates": shard_certificates,
        "scope_warning": "This closes only the exceptional shifted-core band. It does not prove analytic Delta0..Delta4 for large cores, connected Q8, the forest convolution lift, or rank-eight PGC.",
        "hashes": {
            "source_sha256": digest(SOURCE),
            "executable_sha256": digest(EXE),
            "runner_sha256": digest(Path(__file__)),
            "shard_assembler_sha256": digest(ROOT / "assemble_rank8_exceptional_shifted_shards.py"),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"], flush=True)
    print("REPORT", OUTPUT.name, digest(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
