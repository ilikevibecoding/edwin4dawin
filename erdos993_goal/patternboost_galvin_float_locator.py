#!/usr/bin/env python3
"""Floating locator for PatternBoost-tree × Galvin-tree forest products.

This is deliberately not a witness checker.  It scans the natural
``m = c(3/2)^t`` scale in normalized double precision, retains promising
parameter pairs, and emits the exact Prüfer-certified bases needed by
``patternboost_galvin_forest_search.py`` for integer replay.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np

from galvin_scaled_float_scan import galvin_distribution, normalize


def profile(values: np.ndarray) -> dict:
    mode = int(np.argmax(values))
    cutoff = float(values[mode]) * 1e-14
    best_ratio = -1.0
    best_index = -1
    first_reascent = None
    minimum_ratio = math.inf
    best_recovery = -math.inf
    recovery_index = -1
    for k in range(mode, len(values) - 1):
        if values[k] <= cutoff or values[k + 1] <= cutoff:
            continue
        ratio = float(values[k + 1] / values[k])
        if k > mode and ratio > best_ratio:
            best_ratio = ratio
            best_index = k
        if ratio > 1.0 + 2e-10 and first_reascent is None:
            first_reascent = k
        if minimum_ratio < math.inf and ratio - minimum_ratio > best_recovery:
            best_recovery = ratio - minimum_ratio
            recovery_index = k
        minimum_ratio = min(minimum_ratio, ratio)
    return {
        "mode": mode,
        "best_post_mode_ratio": best_ratio,
        "best_index": best_index,
        "numerical_reascent": first_reascent,
        "best_ratio_recovery": (
            best_recovery if best_recovery > -math.inf else 0.0
        ),
        "recovery_index": recovery_index,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--base-top", type=int, default=3)
    parser.add_argument("--t-min", type=int, default=8)
    parser.add_argument("--t-max", type=int, default=18)
    parser.add_argument("--c-min", type=float, default=0.25)
    parser.add_argument("--c-max", type=float, default=4.0)
    parser.add_argument("--c-step", type=float, default=0.25)
    parser.add_argument("--retain", type=int, default=80)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    corpus = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = corpus["records"][: args.base_top]
    bases = [
        normalize(np.asarray(record["polynomial"], dtype=np.float64))
        for record in records
    ]
    candidates = []
    numerical_witness = None
    started = time.time()
    tested = 0

    for t in range(args.t_min, args.t_max + 1):
        c = args.c_min
        local = None
        seen_m = set()
        while c <= args.c_max + 0.5 * args.c_step:
            m = max(1, round(c * (1.5**t)))
            c += args.c_step
            if m in seen_m:
                continue
            seen_m.add(m)
            factor = galvin_distribution(t, m)
            for base_index, base in enumerate(bases):
                result = profile(normalize(np.convolve(base, factor)))
                tested += 1
                candidate = {
                    "t": t,
                    "m": m,
                    "scaled_m": m * ((2.0 / 3.0) ** t),
                    "base_index": base_index,
                    **result,
                }
                candidates.append(candidate)
                if (
                    local is None
                    or candidate["best_post_mode_ratio"]
                    > local["best_post_mode_ratio"]
                ):
                    local = candidate
                if (
                    result["numerical_reascent"] is not None
                    and numerical_witness is None
                ):
                    numerical_witness = candidate
        assert local is not None
        print(
            f"t={t} m={local['m']} "
            f"ratio={local['best_post_mode_ratio']:.12f} "
            f"recovery={local['best_ratio_recovery']:.6g}",
            flush=True,
        )

    # Keep leaders for both crossing proximity and genuine ratio recovery.
    by_ratio = sorted(
        candidates,
        key=lambda item: item["best_post_mode_ratio"],
        reverse=True,
    )[: args.retain]
    by_recovery = sorted(
        candidates,
        key=lambda item: item["best_ratio_recovery"],
        reverse=True,
    )[: args.retain]
    selected = {}
    for item in [*by_ratio, *by_recovery]:
        selected[(item["t"], item["m"], item["base_index"])] = item
    for t in range(args.t_min, args.t_max + 1):
        band = [item for item in candidates if item["t"] == t]
        for item in (
            max(band, key=lambda value: value["best_post_mode_ratio"]),
            max(band, key=lambda value: value["best_ratio_recovery"]),
        ):
            selected[(item["t"], item["m"], item["base_index"])] = item

    payload = {
        "status": (
            "NUMERICAL_REASCENT_REQUIRES_EXACT_REPLAY"
            if numerical_witness
            else "NO_NUMERICAL_REASCENT"
        ),
        "floating_point_locator_only": True,
        "parameters": {
            key: str(value) if isinstance(value, Path) else value
            for key, value in vars(args).items()
        },
        "tested_products": tested,
        "first_numerical_reascent": numerical_witness,
        "candidates_for_exact_replay": list(selected.values()),
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": payload["status"],
                "tested_products": tested,
                "retained": len(selected),
                "first_numerical_reascent": numerical_witness,
                "elapsed_seconds": payload["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
