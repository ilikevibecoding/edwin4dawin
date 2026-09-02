#!/usr/bin/env python3
"""Coefficient-level forensics for the strong grade-9 face01 outer-0 mismatch.

This is deliberately a one-cell diagnostic.  It reconstructs the row twice:

* the original exact-base-degree producer construction; and
* the independent formal-(ordinary degree,b0 exponent) construction.

The two ordered coefficient streams are compared directly.  If they differ,
the first few exact monomials and the separate base/linear contributions are
written to a uniquely named JSON report.  If they agree completely, both
fresh ordered hashes are recorded so the stale producer certificate can be
distinguished from a reproducible arithmetic discrepancy.
"""

from __future__ import annotations

import gc
import hashlib
import json
import os
from pathlib import Path

from flint import fmpz_mpoly_ctx

import probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent as producer
from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    REDUCED_NAMES,
    build_formal_common,
    construct_pieces,
    private_bytes,
    sha256,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_strong_grade9_face01_outer0_stream_forensics_agent_grade9_forensics.json"
PRODUCER_SHA256 = "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342"
FORMAL_SHA256 = "BE63A33CEA2B7079775BC5277791DAC724A22954B9F8F6CF2795C94413ED62C8"
OLD_PRODUCER_HASH = "EA3719096C9B81C2169BC409F2ED5ED204ABDA64505FA6AB2C4FD0C518DAC64D"
OLD_AUDITOR_HASH = "905AED8D56FAF06C413FA6E2D9E37FF5CF712E681581557D5AAF425094F773E0"
DEGREE = 9
TARGET = 8
OUTER = 0
FACE = (0, 1)
LIMIT = 10_000_000_000


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def term_key(monomial: tuple[int, ...]) -> tuple:
    return -sum(monomial), tuple(reversed(monomial))


class Cursor:
    def __init__(self, label: str, polynomial, scale: int):
        self.label = label
        self.polynomial = polynomial
        self.scale = scale
        self.index = 0
        self.previous = None
        # The producer exports these as absolute indices in the common
        # BASE+REDUCED variable order, which is also REDUCED_NAMES here.
        self.group_a = producer.GROUP_A
        self.group_b = producer.GROUP_B

    def advance(self):
        while self.index < len(self.polynomial):
            index = self.index
            self.index += 1
            monomial = tuple(map(int, self.polynomial.monomial(index)))
            key = term_key(monomial)
            if self.previous is not None:
                assert self.previous <= key
            self.previous = key
            if not any(monomial[position] for position in self.group_a):
                continue
            if OUTER == 0 and not any(monomial[position] for position in self.group_b):
                continue
            assert sum(monomial[: len(producer.BASE)]) == TARGET
            assert sum(monomial[len(producer.BASE) :]) + OUTER == DEGREE
            return key, monomial + (OUTER,), self.scale * int(
                self.polynomial.coefficient(index)
            )
        return None


class Row:
    def __init__(self, specifications):
        self.cursors = [Cursor(*specification) for specification in specifications]
        self.current = [cursor.advance() for cursor in self.cursors]
        self.digest = hashlib.sha256()
        self.terms = 0

    def advance(self):
        while any(item is not None for item in self.current):
            smallest = min(item[0] for item in self.current if item is not None)
            active = [
                index for index, item in enumerate(self.current)
                if item is not None and item[0] == smallest
            ]
            monomial = self.current[active[0]][1]
            coefficient = 0
            contributions = {}
            for index in active:
                assert self.current[index][1] == monomial
                value = self.current[index][2]
                coefficient += value
                contributions[self.cursors[index].label] = value
                self.current[index] = self.cursors[index].advance()
            if coefficient == 0:
                continue
            encoded = (
                ",".join(map(str, monomial)) + ":" + str(coefficient) + "\n"
            ).encode()
            self.digest.update(encoded)
            self.terms += 1
            return smallest, monomial, coefficient, contributions
        return None


def record(item):
    if item is None:
        return None
    key, monomial, coefficient, contributions = item
    return {
        "key": [key[0], list(key[1])],
        "monomial": list(monomial),
        "coefficient": coefficient,
        "scaled_piece_contributions": contributions,
    }


def main() -> None:
    assert sha256(HERE / "probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py") == PRODUCER_SHA256
    assert sha256(HERE / "audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent.py") == FORMAL_SHA256
    peak = [private_bytes()]

    producer_context = fmpz_mpoly_ctx.get(producer.NAMES, "degrevlex")
    raw, h, capacity, c, v, dc, dv = producer.build(
        FACE, "strong", TARGET, producer_context, peak, LIMIT
    )
    producer_polynomials = producer.make_pieces(
        "strong", raw, h, capacity, c, v, dc, dv,
        OUTER, TARGET, peak, LIMIT,
    )
    # The middle row is 4*base + 2*linear; direction has scale zero.
    producer_row = Row((
        ("producer_base_times_4", producer_polynomials[0], 4),
        ("producer_linear_times_2", producer_polynomials[1], 2),
    ))
    peak[0] = max(peak[0], private_bytes())

    formal_common = build_formal_common(FACE, DEGREE, peak, LIMIT)
    formal_specifications = construct_pieces(
        formal_common, "strong_middle_times_4", DEGREE, OUTER, peak, LIMIT
    )
    assert [(name, scale) for name, scale, _ in formal_specifications] == [
        ("base", 4), ("linear", 2)
    ]
    formal_row = Row(tuple(
        (f"formal_{name}_times_{scale}", polynomial, scale)
        for name, scale, polynomial in formal_specifications
    ))
    peak[0] = max(peak[0], private_bytes())

    mismatches = []
    compared = 0
    producer_item = producer_row.advance()
    formal_item = formal_row.advance()
    while producer_item is not None or formal_item is not None:
        compared += 1
        if (
            producer_item is None or formal_item is None
            or producer_item[:3] != formal_item[:3]
        ):
            mismatches.append({
                "ordered_output_position_one_based": compared,
                "producer": record(producer_item),
                "formal": record(formal_item),
            })
            if len(mismatches) >= 20:
                break
        producer_item = producer_row.advance()
        formal_item = formal_row.advance()
        if compared % 100_000 == 0:
            peak[0] = max(peak[0], private_bytes())
            print(
                "COMPARE", compared, "MISMATCHES", len(mismatches),
                "PRIVATE", private_bytes(), flush=True,
            )

    complete = producer_item is None and formal_item is None and not mismatches
    payload = {
        "schema": "rank8-strong-grade9-face01-outer0-coefficient-stream-forensics-agent-v1",
        "status": (
            "PASS_FRESH_PRODUCER_AND_FORMAL_STREAMS_IDENTICAL"
            if complete else "FOUND_EXACT_COEFFICIENT_STREAM_MISMATCH"
        ),
        "scope": {
            "family": "strong",
            "degree": DEGREE,
            "exact_base_degree": TARGET,
            "face": list(FACE),
            "outer_exponent": OUTER,
            "auxiliary": "strong_middle_times_4",
        },
        "compared_ordered_nonzero_terms": compared,
        "fresh_producer_terms_consumed": producer_row.terms,
        "fresh_formal_terms_consumed": formal_row.terms,
        "comparison_complete": complete,
        "mismatches": mismatches,
        "fresh_hashes_if_complete": {
            "producer": producer_row.digest.hexdigest().upper() if complete else None,
            "formal": formal_row.digest.hexdigest().upper() if complete else None,
        },
        "historical_hashes": {
            "producer_certificate": OLD_PRODUCER_HASH,
            "independent_auditor": OLD_AUDITOR_HASH,
        },
        "source_pins": {
            "producer": PRODUCER_SHA256,
            "formal": FORMAL_SHA256,
        },
        "hard_private_memory_limit_bytes": LIMIT,
        "observed_peak_private_bytes": peak[0],
        "source_sha256": sha256(Path(__file__)),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"], OUTPUT, report_hash, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        atomic_json(OUTPUT.with_suffix(OUTPUT.suffix + ".failure.json"), {
            "schema": "rank8-strong-grade9-face01-outer0-coefficient-stream-forensics-agent-v1",
            "status": "FAIL_CLOSED_EXCEPTION",
            "failure": {"type": type(error).__name__, "message": str(error)},
            "private_bytes_at_failure": private_bytes(),
            "source_sha256": sha256(Path(__file__)),
        })
        raise
