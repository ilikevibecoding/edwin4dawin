#!/usr/bin/env python3
"""Rank the audited PatternBoost tree corpus by 2/3-alpha saddle fugacity."""

from __future__ import annotations

import argparse
import heapq
import json
import time
from pathlib import Path

from scan_tree_saddle_fugacity import saddle


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--top", type=int, default=100)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.input.read_text(encoding="utf-8"))
    heap = []
    for index, record in enumerate(source["records"]):
        poly = tuple(record["polynomial"])
        rho, limit = saddle(poly)
        item = {
            "record_index": index,
            "first_line": record["first_line"],
            "prufer_code_one_based": record["prufer_code_one_based"],
            "independence_polynomial": list(poly),
            "alpha": len(poly) - 1,
            "rho": rho,
            "rho_over_one_plus_rho": limit,
        }
        if len(heap) < args.top:
            heapq.heappush(heap, (limit, index, item))
        elif limit > heap[0][0]:
            heapq.heapreplace(heap, (limit, index, item))

    report = {
        "status": "SEARCH_COMPLETE_NOT_PROOF",
        "parameters": vars(args)
        | {"input": str(args.input), "output": str(args.output)},
        "records": len(source["records"]),
        "top": [entry[2] for entry in sorted(heap, reverse=True)],
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
