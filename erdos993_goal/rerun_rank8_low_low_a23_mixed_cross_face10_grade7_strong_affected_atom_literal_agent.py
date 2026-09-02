#!/usr/bin/env python3
"""Literal-formal bounded rerun of the one mismatching face10 strong atom."""

from __future__ import annotations

import gc
import gzip
import hashlib
import json
import os
from pathlib import Path

import audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent as audit
import probe_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent as producer
from diagnose_rank8_low_low_a23_mixed_cross_face10_grade7_strong_atom_mismatch_agent import (
    compare_stream,
)


HERE = Path(__file__).resolve().parent
FACE = (1, 0)
DEGREE = 7
EXPONENT = 1
TARGET = ("base", "derivative", "twice_c8_v8")
LIMIT = 500_000_000
DIAGNOSTIC = (
    HERE / "rank8_low_low_a23_mixed_cross_face10_grade7_strong_atom_mismatch_diagnostic_agent_20260823.json",
    "8FB966AACF61D105783FF556928B3E23F3EBD460DCE2B81E74D1DCB0DAC54226",
)
FAILURE = (
    HERE / "rank8_low_low_a23_mixed_cross_face_10_strong_grade_7_outer_factored_atom_stream_independent_audit_agent_20260823.json.failure.json",
    "44116F61A254AC44C882E9C2E4FCF364E56DD47756A702796867DB7F78DC2AF0",
)
PREFIX = HERE / (
    "rank8_low_low_a23_mixed_cross_face_10_strong_base_derivative_twice_c8_v8_"
    "grade_7_b0_exp_1_literal_rerun_agent_20260823"
)
STREAM = Path(str(PREFIX) + ".txt.gz")
OUTPUT = Path(str(PREFIX) + ".json")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def write_literal_stream(polynomial, peak: list[int]) -> dict:
    indices = {item: audit.REDUCED_NAMES.index(item) for item in audit.REDUCED_NAMES}
    group_a = tuple(indices[item] for item in audit.GROUP_A)
    group_b = tuple(indices[item] for item in audit.GROUP_B if item != "b0")
    temporary = STREAM.with_suffix(STREAM.suffix + ".tmp")
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    previous = None
    with temporary.open("wb") as raw:
        with gzip.GzipFile(filename="", fileobj=raw, mode="wb", compresslevel=1, mtime=0) as saved:
            for term_index in range(len(polynomial)):
                reduced = tuple(map(int, polynomial.monomial(term_index)))
                key = (-sum(reduced), tuple(reversed(reduced)))
                if previous is not None:
                    assert previous <= key
                previous = key
                if not any(reduced[index] for index in group_a):
                    continue
                if EXPONENT == 0 and not any(reduced[index] for index in group_b):
                    continue
                coefficient = int(polynomial.coefficient(term_index))
                full = reduced + (EXPONENT,)
                encoded = (",".join(map(str, full)) + ":" + str(coefficient) + "\n").encode()
                saved.write(encoded)
                digest.update(encoded)
                terms += 1
                minimum = coefficient if minimum is None else min(minimum, coefficient)
                if coefficient < 0:
                    negative += 1
                    if first_negative is None:
                        first_negative = {"monomial": list(full), "coefficient": coefficient}
                if terms % 100_000 == 0:
                    audit.guard("literal affected-atom stream", peak, LIMIT)
    os.replace(temporary, STREAM)
    return {
        "unfiltered_terms": len(polynomial),
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
        "stream_sha256": sha256(STREAM),
    }


def main() -> None:
    for path, expected in (DIAGNOSTIC, FAILURE):
        assert sha256(path) == expected
    diagnostic = json.loads(DIAGNOSTIC[0].read_text(encoding="utf-8"))
    assert diagnostic["formal_replay_vs_saved"]["expected_coefficient"] == 20_873_537_328
    assert diagnostic["formal_replay_vs_saved"]["observed_line"].endswith(":20873537264")

    peak = [0]
    formal_common = audit.build_formal_common(FACE, DEGREE, peak, LIMIT)
    formal_polynomial = audit.construct_atom(
        formal_common, *TARGET, DEGREE, EXPONENT, peak, LIMIT
    )
    literal_result = write_literal_stream(formal_polynomial, peak)
    del formal_polynomial, formal_common
    gc.collect()

    split_common = producer.build_split_common(FACE, DEGREE, peak, LIMIT)
    split_polynomial = producer.construct_atom(
        split_common, *TARGET, DEGREE, EXPONENT, peak, LIMIT
    )
    split_vs_literal = compare_stream(split_polynomial, STREAM)
    del split_polynomial, split_common
    gc.collect()
    assert split_vs_literal["exact_match"]
    assert split_vs_literal["stream_lines_compared"] == literal_result["mixed_support_terms"]

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face10-grade7-strong-affected-atom-literal-rerun-agent-v1",
        "status": "PASS_BOUNDED_AFFECTED_ATOM_LITERAL_FORMAL_RERUN_AND_SPLIT_REBUILD_EXACT_MATCH",
        "face": list(FACE), "bridge_corner": [2, 0],
        "total_ordinary_slack_degree": DEGREE,
        "outer_variable": "b0", "outer_exponent": EXPONENT,
        "target": {"piece": TARGET[0], "part": TARGET[1], "atom": TARGET[2]},
        "literal_formal_stream": str(STREAM),
        "literal_formal_result": literal_result,
        "fresh_split_rebuild_vs_literal_formal_stream": split_vs_literal,
        "failed_saved_stream_first_coefficient": 20_873_537_264,
        "correct_literal_coefficient": 20_873_537_328,
        "coefficient_delta_saved_minus_literal": -64,
        "diagnostic": {"path": str(DIAGNOSTIC[0]), "sha256": DIAGNOSTIC[1]},
        "failure": {"path": str(FAILURE[0]), "sha256": FAILURE[1]},
        "hard_private_memory_limit_bytes": LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "formal_auditor_source_sha256": sha256(HERE / "audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent.py"),
        "producer_source_sha256": sha256(HERE / "probe_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent.py"),
    }
    print("PASS", OUTPUT, atomic_json(OUTPUT, payload), flush=True)


if __name__ == "__main__":
    main()
