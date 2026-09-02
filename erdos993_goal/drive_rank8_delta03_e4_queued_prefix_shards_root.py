#!/usr/bin/env python3
"""Operational parallel driver for the hash-pinned resumable e4 shard runner."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import run_rank8_delta03_e4_queued_prefix_shards_agent as shards


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("orbit", choices=sorted(shards.ORBITS))
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--width", type=int, default=12)
    parser.add_argument("--output-root", type=Path, default=shards.DEFAULT_OUTPUT)
    args = parser.parse_args()
    total = int(shards.ORBITS[args.orbit]["prefixes"])
    assert 1 <= args.workers <= 16
    assert 1 <= args.width <= 12
    ranges = [
        (start, min(start + args.width, total))
        for start in range(0, total, args.width)
    ]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(
                shards.run_shard,
                args.orbit,
                start,
                end,
                None,
                args.output_root,
            ): (start, end)
            for start, end in ranges
        }
        completed = 0
        for future in as_completed(futures):
            start, end = futures[future]
            future.result()
            completed += end - start
            print("DRIVER_PREFIXES", completed, total, flush=True)
    shards.merge_complete(args.orbit, args.output_root)


if __name__ == "__main__":
    main()
