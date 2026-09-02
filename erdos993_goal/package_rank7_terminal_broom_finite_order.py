#!/usr/bin/env python3
"""Assemble and audit a two-run exact finite terminal-broom certificate."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

LINE = re.compile(
    r"core_n=(?P<n>\d+) trees=(?P<trees>\d+) roots=(?P<roots>\d+) "
    r"low_newton_minima=\[(?P<mins>[^]]+)\] negative=\[(?P<negative>[^]]*)\]"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse(path: Path, order: int, expected_trees: int):
    text = path.read_text(encoding="utf-8")
    matches = list(LINE.finditer(text))
    assert len(matches) == 1, (path, len(matches))
    row = matches[0].groupdict()
    minima = [int(value.strip()) for value in row["mins"].split(",")]
    assert int(row["n"]) == order
    assert int(row["trees"]) == expected_trees
    assert int(row["roots"]) == order * expected_trees
    assert len(minima) == 7 and all(value > 0 for value in minima)
    assert not row["negative"].strip()
    marker = f"PASS_EXACT_RANK7_TERMINAL_BROOM_LOW_NEWTON_ALL_ROOTED_CORES_N{order}"
    assert marker in text
    return minima, marker


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, required=True)
    parser.add_argument("--expected-trees", type=int, required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--exe", required=True)
    parser.add_argument("--primary-log", required=True)
    parser.add_argument("--replay-log", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    paths = {
        "source": Path(args.source),
        "executable": Path(args.exe),
        "primary_log": Path(args.primary_log),
        "fresh_replay_log": Path(args.replay_log),
    }
    minima1, marker1 = parse(paths["primary_log"], args.order, args.expected_trees)
    minima2, marker2 = parse(paths["fresh_replay_log"], args.order, args.expected_trees)
    assert minima1 == minima2 and marker1 == marker2
    assert paths["primary_log"].read_bytes() == paths["fresh_replay_log"].read_bytes()
    report = {
        "schema": "rank7-terminal-broom-finite-single-order-v1",
        "status": marker1,
        "order": args.order,
        "free_trees": args.expected_trees,
        "rooted_cores": args.order * args.expected_trees,
        "low_newton_minima": minima1,
        "conclusion": (
            "Delta^0 through Delta^6 are strictly positive; together with the "
            "existing all-core Delta^7 through Delta^13 theorem this proves "
            "R_t>=0 for every integer t>=1 at this core order"
        ),
        "fresh_replay_byte_identical": True,
        "artifacts_sha256": {
            str(path): sha256(path) for path in paths.values()
        },
    }
    Path(args.output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
