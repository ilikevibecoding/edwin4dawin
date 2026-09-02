#!/usr/bin/env python3
"""Exact coefficientwise scan of the x>=y four-gap right payment block."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from explore_uniform_low_high_four_gap_symbolic_payments_root import CACHE, load_rows


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def summary(value):
    if value == 0:
        return {"status": "zero", "numerator_terms": 0, "denominator_terms": 0}
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    numerator_origin = value.numer.to_dict().get((0, 0, 0), QQ.zero)
    denominator_origin = value.denom.to_dict().get((0, 0, 0), QQ.zero)
    coefficientwise_nonnegative = (
        denominator_origin > 0
        and all(coefficient > 0 for coefficient in numerator)
        and all(coefficient > 0 for coefficient in denominator)
    )
    status = (
        "positive" if coefficientwise_nonnegative and numerator_origin > 0 else
        "nonnegative" if coefficientwise_nonnegative else
        "mixed"
    )
    return {
        "status": status,
        "numerator_terms": len(numerator),
        "numerator_minimum": str(min(numerator)),
        "numerator_origin": str(numerator_origin),
        "numerator_ordered_sha256": ordered_hash(numerator),
        "denominator_terms": len(denominator),
        "denominator_minimum": str(min(denominator)),
        "denominator_origin": str(denominator_origin),
        "denominator_ordered_sha256": ordered_hash(denominator),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-index", type=int, default=1)
    parser.add_argument("--stop-index", type=int)
    arguments = parser.parse_args()

    F, k, x, y = field("k,x,y", QQ)
    rows = load_rows(F)
    keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    start = max(1, arguments.start_index)
    stop = min(len(keys), arguments.stop_index or len(keys))
    assert start <= stop
    H, u, base, gap = field("u,y,z", QQ)

    def high(value):
        return H.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): base.as_expr() + gap.as_expr(),
            y.as_expr(): base.as_expr(),
        }))

    N, M = k + x, k + y
    lower = sum(
        math.prod(k - 1 - index for index in range(power))
        * (M / N) ** power / math.factorial(power)
        for power in range(4)
    )
    results = []
    failures = []
    for index in range(start, stop + 1):
        key = keys[index - 1]
        beta = rows[("T", "R")].get(key, F.zero)
        gamma = -rows[("L", "R")].get(key, F.zero)
        delta = -rows[("R", "R")].get(key, F.zero)
        checks = {
            "beta": summary(high(beta)),
            "delta": summary(high(delta)),
            "minus_delta": summary(high(-delta)),
            "delta_nonnegative_reserve": summary(high(beta * lower - gamma - delta)),
            "delta_negative_reserve": summary(high(beta * lower - gamma)),
        }
        sign_definite = {"positive", "nonnegative"}
        acceptable = {"positive", "nonnegative"}
        delta_nonnegative_possible = checks["minus_delta"]["status"] not in sign_definite
        delta_negative_possible = checks["delta"]["status"] not in sign_definite
        passed = (
            checks["beta"]["status"] in acceptable
            and (
                not delta_nonnegative_possible
                or checks["delta_nonnegative_reserve"]["status"] in acceptable
            )
            and (
                not delta_negative_possible
                or checks["delta_negative_reserve"]["status"] in acceptable
            )
        )
        row = {
            "index": index,
            "key": list(key),
            "passed": passed,
            "delta_nonnegative_possible": delta_nonnegative_possible,
            "delta_negative_possible": delta_negative_possible,
            **checks,
        }
        results.append(row)
        if not passed:
            failures.append(row)
        print("ROW", index, tuple(key), "PASS" if passed else "MIXED", flush=True)

    payload = {
        "schema": "uniform-low-high-four-gap-high-block-scan-root-v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "status": (
            "PASS_EXACT_FOUR_GAP_HIGH_BLOCK_SHARD"
            if not failures else "MIXED_EXACT_FOUR_GAP_HIGH_BLOCK_SHARD"
        ),
        "parameters": {"start_index": start, "stop_index": stop, "total_keys": len(keys)},
        "failure_count": len(failures),
        "cache": {"path": CACHE.name, "sha256": sha256(CACHE)},
        "source_sha256": sha256(Path(__file__).resolve()),
        "results": results,
    }
    output = ROOT / f"uniform_low_high_four_gap_high_block_scan_root_20260827_{start:03d}_{stop:03d}.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("REPORT", output.name, sha256(output), flush=True)
    print(payload["status"], "PASS", len(results) - len(failures), "MIXED", len(failures), flush=True)
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
