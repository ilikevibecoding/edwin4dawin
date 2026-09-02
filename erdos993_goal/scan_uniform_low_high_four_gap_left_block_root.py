#!/usr/bin/env python3
"""Exact coefficientwise scan of every nonzero four-gap left payment block."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from explore_uniform_low_high_four_gap_symbolic_payments_root import CACHE, load_rows


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(coefficients) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in coefficients).encode("ascii")
    ).hexdigest().upper()


def summary(value):
    if value == 0:
        return {"status": "zero", "numerator_terms": 0, "denominator_terms": 0}
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    numerator_origin = value.numer.to_dict().get((0, 0, 0), QQ.zero)
    denominator_origin = value.denom.to_dict().get((0, 0, 0), QQ.zero)
    positive = (
        numerator_origin > 0 and denominator_origin > 0
        and all(coefficient > 0 for coefficient in numerator)
        and all(coefficient > 0 for coefficient in denominator)
    )
    return {
        "status": "positive" if positive else "mixed",
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
    G, u, xv, yv = field("u,x,y", QQ)

    def shifted(value):
        return G.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): xv.as_expr(),
            y.as_expr(): yv.as_expr(),
        }))

    M = k + y
    left_union = (k - 1) * M / (x + y + k + 2)
    results = []
    failures = []
    routes = {"alpha": 0, "epsilon_union": 0}
    for index in range(start, stop + 1):
        key = keys[index - 1]
        alpha = rows[("T", "L")].get(key, F.zero)
        epsilon = rows[("L", "L")].get(key, F.zero)
        total = alpha + epsilon
        total_summary = summary(shifted(total))
        alpha_summary = summary(shifted(alpha))
        epsilon_summary = summary(shifted(epsilon))
        reserve_summary = summary(shifted(total - epsilon * left_union))
        if total_summary["status"] == "positive" and alpha_summary["status"] == "positive":
            route = "alpha"
        elif (
            total_summary["status"] == "positive"
            and epsilon_summary["status"] == "positive"
            and reserve_summary["status"] == "positive"
        ):
            route = "epsilon_union"
        else:
            route = "failure"
        row = {
            "index": index,
            "key": list(key),
            "route": route,
            "alpha_plus_epsilon": total_summary,
            "alpha": alpha_summary,
            "epsilon": epsilon_summary,
            "union_reserve": reserve_summary,
        }
        results.append(row)
        if route == "failure":
            failures.append(row)
        else:
            routes[route] += 1
        print("ROW", index, tuple(key), route.upper(), flush=True)

    payload = {
        "schema": "uniform-low-high-four-gap-left-block-scan-root-v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "status": (
            "PASS_EXACT_FOUR_GAP_LEFT_BLOCK_SHARD"
            if not failures else "MIXED_EXACT_FOUR_GAP_LEFT_BLOCK_SHARD"
        ),
        "parameters": {"start_index": start, "stop_index": stop, "total_keys": len(keys)},
        "routes": routes,
        "failure_count": len(failures),
        "cache": {"path": CACHE.name, "sha256": sha256(CACHE)},
        "source_sha256": sha256(Path(__file__).resolve()),
        "results": results,
    }
    output = ROOT / f"uniform_low_high_four_gap_left_block_scan_root_20260827_{start:03d}_{stop:03d}.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("REPORT", output.name, sha256(output), flush=True)
    print(payload["status"], routes, "FAILURES", len(failures), flush=True)
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
