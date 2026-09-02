#!/usr/bin/env python3
"""Independent exact replay of the a345 direct-H binomial-lift theorem."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "rank8_low_high_strong_a345_prefix_binomial_lift_independent_audit_20260820.json"
OLD_NAMES = ("h", "ta", "a3", "a4", "tb", "b0", "b1", "b2")
NAMES = ("h", "ta", "a3", "a4", "a5", "tb", "b0", "b1", "b2")
PINS = {
    "verify_rank8_low_high_strong_a345_prefix_binomial_lift.py":
        "B73545B6A2425FA4C966E95C985391AA99D2A0F41EAC99B25708C04A8D810F38",
    "rank8_low_high_strong_a345_prefix_binomial_lift_exact_20260820.json":
        "EBA8BD84DC85DFAFF3BED308979BE9240B899B0F340CC593ED13CAEB95EDD962",
    "verify_rank8_low_high_strong_a34_prefix_amgm.py":
        "F3CDCD90041A30757173CD256F2367A39E44A18D443FBB639C691CB08A3D4118",
    "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json":
        "795D3FB211BAAFC3ECDEE2A594A2378E79BF9A6299B19D224CD78964D9F282A8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def map_sha256(values: dict[tuple[int, ...], int]) -> str:
    wire = [[list(key), values[key]] for key in sorted(values)]
    return hashlib.sha256(json.dumps(wire, separators=(",", ":")).encode()).hexdigest().upper()


def product_row(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def choose_convolution(left, right, rank, zero):
    value = zero
    for index in range(rank + 1):
        value += math.comb(rank, index) * left[index] * right[rank - index]
    return value


def rebuild():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    x = dict(zip(NAMES, context.gens()))
    zero, one, h = context.constant(0), context.constant(1), x["h"]
    ratios, left = product_row(x["ta"], [
        2 * h, h, h, h + x["a3"], h + x["a4"], h + x["a5"], h, h,
    ], one)
    _, right = product_row(x["tb"], [
        2 * h + x["b0"], h + x["b1"], h + x["b2"], h, h, h, h, h,
    ], one)
    selected = [zero, zero, zero] + left[3:]
    c = {r: choose_convolution(left, right, r, zero) for r in (7, 8, 9)}
    v = {r: choose_convolution(selected, right, r, zero) for r in (7, 8, 9)}
    base = c[8] * c[8] - c[7] * c[9] - h * c[7] * c[8]
    slope = (2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
             - h * v[7] * c[8] - h * c[7] * v[8])
    return ratios[2] * base + h * slope


def expand_ta(monomial, coefficient, output):
    exponent = monomial[1]
    for exponent_a5 in range(exponent + 1):
        row = list(monomial)
        row[1] = exponent - exponent_a5
        lifted = tuple(row[:4] + [exponent_a5] + row[4:])
        output[lifted] = output.get(lifted, 0) + coefficient * math.comb(exponent, exponent_a5)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in PINS}
    assert actual == PINS
    theorem = json.loads((ROOT / "rank8_low_high_strong_a345_prefix_binomial_lift_exact_20260820.json")
                         .read_text(encoding="utf-8"))
    upstream = json.loads((ROOT / "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json")
                          .read_text(encoding="utf-8"))
    assert theorem["status"] == "PASS_EXACT_STRONG_AUXILIARY_A345_PREFIX_BINOMIAL_LIFT"
    assert theorem["variables"] == list(NAMES)
    assert upstream["variables"] == list(OLD_NAMES)

    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in rebuild().terms()}
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == theorem["terms"] == 482_694
    assert len(negative) == theorem["negative_terms"] == 3_943

    demand_map = {}
    used_map = {}
    for allocation in upstream["allocations"]:
        target = tuple(allocation["negative_monomial"])
        low = tuple(allocation["source_low"]["monomial"])
        high = tuple(allocation["source_high"]["monomial"])
        demand = int(allocation["demand"])
        u = int(allocation["source_low"]["allocated"])
        v = int(allocation["source_high"]["allocated"])
        assert all(low[i] + high[i] == 2 * target[i] for i in range(8))
        assert 4 * u * v >= demand * demand
        expand_ta(target, demand, demand_map)
        expand_ta(low, u, used_map)
        expand_ta(high, v, used_map)

    assert demand_map == negative
    assert map_sha256(negative) == theorem["negative_map_sha256"]
    assert map_sha256(used_map) == theorem["lifted_used_map_sha256"]
    assert len(used_map) == theorem["lifted_used_positive_sources"] == 5_930
    assert all(used <= positive.get(key, 0) for key, used in used_map.items())
    residual = {key: positive[key] - used_map.get(key, 0) for key in positive}
    assert min(residual.values()) == theorem["minimum_full_positive_remainder"]

    payload = {
        "schema": "rank8-low-high-strong-a345-prefix-binomial-lift-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_STRONG_A345_PREFIX_BINOMIAL_LIFT",
        "pinned_inputs": actual,
        "terms": len(terms),
        "negative_terms": len(negative),
        "upstream_rows_replayed": len(upstream["allocations"]),
        "lifted_used_positive_sources": len(used_map),
        "minimum_full_positive_remainder": min(residual.values()),
        "negative_map_sha256": map_sha256(negative),
        "lifted_used_map_sha256": map_sha256(used_map),
        "scope_warning": theorem["scope_warning"],
        "source_sha256": sha256(Path(__file__)),
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUT))


if __name__ == "__main__":
    main()
