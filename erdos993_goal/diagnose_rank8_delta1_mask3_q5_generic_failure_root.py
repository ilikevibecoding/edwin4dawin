#!/usr/bin/env python3
"""Expose the first nontrivial Bernstein cell in the generic Delta1 Q5 route."""

from __future__ import annotations

import argparse
import json
import sys

import prove_rank8_delta1_new_leaf_mask3_q5_exact_F_generic_root as target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--small-F-max", type=int, required=True)
    parser.add_argument("--x-slabs", type=int, default=1)
    args = parser.parse_args()

    original = target.base.audit
    calls = 0

    def traced(polynomial):
        nonlocal calls
        calls += 1
        result = original(polynomial)
        print("AUDIT_CALL", calls, json.dumps(result, sort_keys=True), flush=True)
        return result

    target.base.audit = traced
    sys.argv = [
        target.__file__,
        "--D-order", str(args.D_order),
        "--small-F-max", str(args.small_F_max),
        "--x-slabs", str(args.x_slabs),
        "--output", "diagnostic-never-sealed.json",
    ]
    target.main()


if __name__ == "__main__":
    main()
