#!/usr/bin/env python3
"""Assemble four no-gap quotient-tree shards into canonical cell logs."""

from __future__ import annotations

import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent
SHARDS = 4
LINE = re.compile(
    r"^QSHIFT order=(?P<order>\d+) alpha=(?P<alpha>\d+) matching=(?P<matching>\d+) "
    r"unmatched=(?P<unmatched>\d+) quotient_total=(?P<quotient_total>\d+) "
    r"quotient_processed=(?P<quotient_processed>\d+) singleton_designations=(?P<singleton_designations>\d+) "
    r"endpoint_coverings=(?P<endpoint_coverings>\d+) valid_expansions=(?P<valid_expansions>\d+) "
    r"rooted_checks=(?P<rooted_checks>\d+) negatives=(?P<negatives>\[[^]]*\]) "
    r"minima=(?P<minima>\[[^]]*\])$"
)


def parse(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    rows = [line for line in text.splitlines() if line.startswith("QSHIFT ")]
    assert len(rows) == 1, (path, rows)
    match = LINE.fullmatch(rows[0])
    assert match, rows[0]
    out = {key: int(value) for key, value in match.groupdict().items()
           if key not in {"negatives", "minima"}}
    out["negatives"] = json.loads(match.group("negatives"))
    out["minima"] = json.loads(match.group("minima"))
    return out


def assemble(order: int, alpha: int = 13) -> None:
    rows = []
    for index in range(SHARDS):
        path = ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a{alpha}_shard_{index}_of{SHARDS}_20260820.log"
        marker = f"PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_ORDER_{order}_ALPHA_{alpha}_SHARD_{index}_OF_{SHARDS}"
        text = path.read_text(encoding="utf-8")
        assert marker in text, (path, marker)
        err = ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a{alpha}_shard_{index}_of{SHARDS}_20260820.err"
        assert err.read_text(encoding="utf-8") == ""
        rows.append(parse(path))
    invariant = ("order", "alpha", "matching", "unmatched", "quotient_total")
    for key in invariant:
        assert len({row[key] for row in rows}) == 1, key
    assert sum(row["quotient_processed"] for row in rows) == rows[0]["quotient_total"]
    negatives = [sum(row["negatives"][rank] for row in rows) for rank in range(16)]
    minima = [min(row["minima"][rank] for row in rows) for rank in range(16)]
    assert all(value == 0 for value in negatives)
    assert all(value > 0 for value in minima)
    sums = {key: sum(row[key] for row in rows) for key in (
        "quotient_processed", "singleton_designations", "endpoint_coverings",
        "valid_expansions", "rooted_checks",
    )}
    line = (
        f"QSHIFT order={order} alpha={alpha} matching={rows[0]['matching']} unmatched={rows[0]['unmatched']} "
        f"quotient_total={rows[0]['quotient_total']} quotient_processed={sums['quotient_processed']} "
        f"singleton_designations={sums['singleton_designations']} endpoint_coverings={sums['endpoint_coverings']} "
        f"valid_expansions={sums['valid_expansions']} rooted_checks={sums['rooted_checks']} "
        f"negatives={json.dumps(negatives,separators=(',',':'))} minima={json.dumps(minima,separators=(',',':'))}\n"
        f"PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_ORDER_{order}_ALPHA_{alpha}_SHARD_0_OF_1\n"
    )
    output = ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a{alpha}_exact_20260820.log"
    output.write_text(line, encoding="utf-8")
    error = ROOT / f"rank8_exceptional_shifted_matching_q_n{order}_a{alpha}_exact_20260820.err"
    error.write_text("", encoding="utf-8")
    print("PASS_ASSEMBLED", order, alpha, sums["valid_expansions"], sums["rooted_checks"])


def main() -> None:
    assemble(23)
    assemble(24)
    print("PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_SHARD_ASSEMBLY")


if __name__ == "__main__":
    main()
