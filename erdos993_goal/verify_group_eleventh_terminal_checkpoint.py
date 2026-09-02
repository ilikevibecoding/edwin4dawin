#!/usr/bin/env python3
"""Replay the unreduced s=10 terminal coupling from its gzip checkpoint."""

from __future__ import annotations

import argparse
import gc
import gzip
import json
from pathlib import Path

from flint import fmpq

from derive_group_fifth_homogeneous_tail_schur_flint import CTX, Rat


HERE = Path(__file__).resolve().parent
CHECKPOINT = HERE / "group_eleventh_homogeneous_terminal_checkpoint_20260805.tsv.gz"
REPORT = HERE / "group_eleventh_homogeneous_terminal_replay_20260805.json"


def read_polynomial(handle, expected_label: str):
    header = handle.readline().rstrip("\n").split("\t")
    assert header[0] == expected_label and len(header) == 2
    count = int(header[1])
    terms = {}
    for _ in range(count):
        monomial_text, coefficient_text = handle.readline().rstrip("\n").split("\t")
        monomial = tuple(int(value) for value in monomial_text.split(","))
        terms[monomial] = fmpq(coefficient_text)
    return CTX.from_dict(terms)


def read_checkpoint(path: Path) -> tuple[Rat, Rat, Rat]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        assert handle.readline().rstrip("\n") == "S10_TERMINAL_RATIONAL_CHECKPOINT_V1"
        values = []
        for label in ("diagonal", "constant", "base"):
            numerator = read_polynomial(handle, f"{label}.num")
            denominator = read_polynomial(handle, f"{label}.den")
            # The checkpoint already stores reduced rational functions.  Do
            # not repeat their expensive multivariate gcd normalization.
            values.append(Rat(numerator, denominator, reduce=False))
        assert not handle.read(1)
    return tuple(values)


def positive(poly) -> bool:
    return all(poly.coefficient(position) > 0 for position in range(len(poly)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, default=CHECKPOINT)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    diagonal, constant, base = read_checkpoint(args.checkpoint)
    denominator_factor_terms = [len(diagonal.den), len(constant.den), len(base.den)]
    denominator_positive = all(positive(value.den) for value in (diagonal, constant, base))
    first = -(diagonal.num * constant.num * base.den)
    second = base.num * diagonal.den * constant.den
    numerator = first - second
    del first, second
    gc.collect()
    numerator_positive = positive(numerator)
    report = {
        "status": "EXACT_S10_TERMINAL_UNREDUCED_CHECKPOINT_REPLAY",
        "numerator_terms": len(numerator),
        "numerator_coefficientwise_positive": numerator_positive,
        "denominator_factor_terms": denominator_factor_terms,
        "denominator_coefficientwise_positive": denominator_positive,
    }
    assert numerator_positive and denominator_positive
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
