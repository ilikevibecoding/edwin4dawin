#!/usr/bin/env python3
"""Run the exact Delta4 capacity-edge repair at a requested order cutoff."""

from __future__ import annotations

import argparse
from pathlib import Path


SOURCE = Path(__file__).with_name("prove_rank7_terminal_broom_delta4_capacity_edge.py")
OLD = "from verify_rank7_terminal_broom_middle_differences import CORE_ORDER, D4_CEILING"
NEW = (
    "from verify_rank7_terminal_broom_middle_differences import D4_CEILING\n"
    "CORE_ORDER = CUTOFF"
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    args = parser.parse_args()
    text = SOURCE.read_text(encoding="utf-8")
    assert text.count(OLD) == 1
    namespace = {
        "__name__": "rank7_delta4_capacity_cutoff_probe",
        "__file__": str(SOURCE),
        "CUTOFF": args.cutoff,
    }
    exec(compile(text.replace(OLD, NEW), str(SOURCE), "exec"), namespace)
    namespace["main"]()
    print("PASS_DELTA4_CAPACITY_CUTOFF_PROBE", args.cutoff)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
