#!/usr/bin/env python3
"""Diagnostic wrapper: reuse the frozen exact-box engine with N=41."""

from __future__ import annotations

import argparse
import sys

import prove_rank8_delta1_new_leaf_mask3_order43_exact_F_shard_delta1d43 as engine


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--F-order", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert 18 <= args.F_order <= 40
    engine.N_VALUE = 41
    sys.argv = [
        "engine", "--F-start", str(args.F_order),
        "--F-end", str(args.F_order), "--output", args.output,
    ]
    engine.main()


if __name__ == "__main__":
    main()


