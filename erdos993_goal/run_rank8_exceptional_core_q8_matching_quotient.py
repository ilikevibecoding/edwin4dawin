#!/usr/bin/env python3
"""Run and assemble the six-cell exceptional-core Q8 quotient audit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank8_exceptional_core_q8_matching_quotient.rs"
EXE = ROOT / "verify_rank8_exceptional_core_q8_matching_quotient.exe"
OUTPUT = ROOT / "rank8_exceptional_core_q8_matching_quotient_exact_20260820.json"
CELLS = ((21,11),(22,11),(21,12),(22,12),(23,12),(24,12))
TREE_COUNTS = {11:235,12:551}

LINE = re.compile(
    r"^COREQ8 order=(?P<order>\d+) alpha=(?P<alpha>\d+) "
    r"quotient_total=(?P<quotient_total>\d+) quotient_processed=(?P<quotient_processed>\d+) "
    r"singleton_designations=(?P<singleton_designations>\d+) "
    r"endpoint_coverings=(?P<endpoint_coverings>\d+) "
    r"valid_expansions=(?P<valid_expansions>\d+) "
    r"q8_negative_with_multiplicity=(?P<q8_negative_with_multiplicity>\d+) "
    r"distinct_negative_jets=(?P<distinct_negative_jets>\d+) "
    r"minimum_q8=(?P<minimum_q8>-?\d+) minimum_full=(?P<minimum_full>\[[^]]*\])$"
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    rows = []
    negative_jets = set()
    for order, alpha in CELLS:
        result = subprocess.run(
            [str(EXE), "--order", str(order), "--alpha", str(alpha)],
            cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, check=False,
        )
        log = ROOT / f"rank8_exceptional_core_q8_matching_q_n{order}_a{alpha}_exact_20260820.log"
        error = ROOT / f"rank8_exceptional_core_q8_matching_q_n{order}_a{alpha}_exact_20260820.err"
        log.write_text(result.stdout, encoding="utf-8")
        error.write_text(result.stderr, encoding="utf-8")
        marker = f"PASS_EXACT_RANK8_EXCEPTIONAL_CORE_Q8_MATCHING_QUOTIENT_ORDER_{order}_ALPHA_{alpha}"
        assert result.returncode == 0 and marker in result.stdout, (order,alpha,result.stderr)
        lines = [line for line in result.stdout.splitlines() if line.startswith("COREQ8 ")]
        assert len(lines) == 1
        match = LINE.fullmatch(lines[0])
        assert match, lines[0]
        row = {
            key: int(value)
            for key, value in match.groupdict().items()
            if key != "minimum_full"
        }
        row["minimum_full"] = json.loads(match.group("minimum_full"))
        assert row["order"] == order and row["alpha"] == alpha
        assert row["quotient_total"] == row["quotient_processed"] == TREE_COUNTS[alpha]
        jet_lines = [line for line in result.stdout.splitlines() if line.startswith("NEGATIVE_JET ")]
        assert len(jet_lines) == row["distinct_negative_jets"]
        for line in jet_lines:
            negative_jets.add(line)
        row.update({
            "log": log.name, "log_sha256": digest(log),
            "stderr": error.name, "stderr_sha256": digest(error),
        })
        rows.append(row)
        print("PASS",order,alpha,row["valid_expansions"],row["minimum_q8"],flush=True)

    payload = {
        "schema": "rank8-exceptional-core-q8-matching-quotient-v1",
        "status": "PASS_EXACT_RANK8_EXCEPTIONAL_CORE_Q8_MATCHING_QUOTIENT_SIX_CELLS",
        "scope": "Every connected tree core in the six possible alpha=11,12 cells at orders 21 through 24, covered by maximum-matching quotient expansion with multiplicity.",
        "cells": rows,
        "totals": {
            "endpoint_coverings": sum(row["endpoint_coverings"] for row in rows),
            "valid_expansions_with_multiplicity": sum(row["valid_expansions"] for row in rows),
            "q8_negative_with_multiplicity": sum(row["q8_negative_with_multiplicity"] for row in rows),
            "distinct_negative_jet_lines": len(negative_jets),
            "minimum_q8": min(row["minimum_q8"] for row in rows),
        },
        "negative_jet_lines": sorted(negative_jets),
        "coverage_warning": "Expansion counts include automorphic multiplicity and are not counts of distinct unlabeled trees.",
        "hashes": {
            "source_sha256": digest(SOURCE),
            "executable_sha256": digest(EXE),
            "runner_sha256": digest(Path(__file__)),
            "reused_shifted_source_sha256": digest(ROOT / "verify_rank8_exceptional_shifted_matching_quotient.rs"),
        },
    }
    OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(payload["status"])
    print("REPORT",OUTPUT.name,digest(OUTPUT))


if __name__ == "__main__":
    main()
