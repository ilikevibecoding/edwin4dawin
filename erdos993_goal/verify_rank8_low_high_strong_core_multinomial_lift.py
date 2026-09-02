#!/usr/bin/env python3
"""Exact low-memory core theorem for the rank-8 low/high strong auxiliary.

The a34 AM-GM certificate is lifted by ta -> ta+a5+a6+a7.  The 4.98M-term
target is streamed so only the small predicted negative/source maps are held.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_core_multinomial_lift_exact_20260820.json"
OLD_NAMES = ("h", "ta", "a3", "a4", "tb", "b0", "b1", "b2")
NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")
INPUTS = {
    "verify_rank8_low_high_strong_a34_prefix_amgm.py":
        "F3CDCD90041A30757173CD256F2367A39E44A18D443FBB639C691CB08A3D4118",
    "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json":
        "795D3FB211BAAFC3ECDEE2A594A2378E79BF9A6299B19D224CD78964D9F282A8",
    "audit_rank8_low_high_strong_a34_prefix_amgm.py":
        "4A500C2E3D27DEC793AC6F47543A4BF0C8341FB40CEA69A32AC3536D0B91E43A",
    "rank8_low_high_strong_a34_prefix_amgm_independent_audit_20260820.json":
        "C7BCA108DF5111227B313563AD49E148E108830A8B0CD4A2A368AFD5BB0CED11",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def map_sha256(values):
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


def convolution(left, right, rank, zero):
    return sum((math.comb(rank, index) * left[index] * right[rank-index]
                for index in range(rank + 1)), zero)


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    x = dict(zip(NAMES, context.gens()))
    zero, one, h = context.constant(0), context.constant(1), x["h"]
    ratios, left = product_row(x["ta"], [
        2*h, h, h, h+x["a3"], h+x["a4"], h+x["a5"],
        h+x["a6"], h+x["a7"],
    ], one)
    _, right = product_row(x["tb"], [
        2*h+x["b0"], h+x["b1"], h+x["b2"], h, h, h, h, h,
    ], one)
    selected = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(selected, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8]**2-c[7]*c[9]-h*c[7]*c[8]
    slope = (2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]
             - h*(v[7]*c[8]+c[7]*v[8]))
    return ratios[2]*margin+h*slope


def lift_ta(monomial, coefficient, output):
    degree = monomial[1]
    factorial = math.factorial(degree)
    for e5 in range(degree + 1):
        for e6 in range(degree-e5+1):
            for e7 in range(degree-e5-e6+1):
                eta = degree-e5-e6-e7
                row = list(monomial)
                row[1] = eta
                key = tuple(row[:4]+[e5,e6,e7]+row[4:])
                multiplier = (factorial//math.factorial(eta)//math.factorial(e5)
                              //math.factorial(e6)//math.factorial(e7))
                output[key] = output.get(key, 0)+coefficient*multiplier


def main() -> None:
    actual_inputs = {name: sha256(ROOT/name) for name in INPUTS}
    assert actual_inputs == INPUTS
    upstream = json.loads((ROOT/"rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json")
                          .read_text(encoding="utf-8"))
    assert upstream["status"] == "PASS_EXACT_STRONG_AUXILIARY_A34_PREFIX_AMGM"
    assert upstream["variables"] == list(OLD_NAMES)
    assert len(upstream["allocations"]) == 1_950

    needed, used = {}, {}
    for allocation in upstream["allocations"]:
        target = tuple(allocation["negative_monomial"])
        low = tuple(allocation["source_low"]["monomial"])
        high = tuple(allocation["source_high"]["monomial"])
        demand = int(allocation["demand"])
        u = int(allocation["source_low"]["allocated"])
        v = int(allocation["source_high"]["allocated"])
        assert all(low[i]+high[i] == 2*target[i] for i in range(8))
        assert 4*u*v >= demand*demand
        lift_ta(target, demand, needed)
        lift_ta(low, u, used)
        lift_ta(high, v, used)
    assert len(needed) == 11_883 and len(used) == 28_493

    polynomial = build()
    seen_negative, seen_used = set(), set()
    terms = positive_terms = negative_terms = 0
    minimum = maximum = None
    minimum_used_remainder = None
    for monomial, coefficient in polynomial.terms():
        key, value = tuple(map(int, monomial)), int(coefficient)
        terms += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0:
            negative_terms += 1
            assert needed.get(key) == -value
            seen_negative.add(key)
        elif value > 0:
            positive_terms += 1
            if key in used:
                remainder = value-used[key]
                assert remainder >= 0
                minimum_used_remainder = (remainder if minimum_used_remainder is None
                                          else min(minimum_used_remainder, remainder))
                seen_used.add(key)
    assert terms == 4_975_819
    assert positive_terms == 4_963_936 and negative_terms == 11_883
    assert minimum == -6_886_512
    assert seen_negative == set(needed) and seen_used == set(used)

    payload = {
        "schema": "rank8-low-high-strong-core-multinomial-lift-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_FULL_LEFT_PREFIX_CORE",
        "theorem": (
            "H_str=C*M0+h*d>=0 for arbitrary h,ta,a3,a4,a5,a6,a7,tb,b0,b1,b2>=0 "
            "when a0=a2=b3=...=b7=0."
        ),
        "variables": list(NAMES),
        "terms": terms,
        "positive_terms": positive_terms,
        "negative_terms": negative_terms,
        "minimum_coefficient": minimum,
        "maximum_coefficient": maximum,
        "upstream_amgm_rows": len(upstream["allocations"]),
        "lifted_used_positive_sources": len(used),
        "capacity_deficits": 0,
        "minimum_used_source_remainder": minimum_used_remainder,
        "negative_map_sha256": map_sha256(needed),
        "lifted_used_map_sha256": map_sha256(used),
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "proof": (
            "Substitute ta->ta+a5+a6+a7 in every exact upstream a34 AM-GM row. "
            "The multinomial negative expansion matches every exact core negative "
            "coefficient, and all expanded source allocations fit inside the exact "
            "positive coefficients. The 4,975,819 target terms are checked as a stream."
        ),
        "scope_warning": (
            "This closes the direct-H left-prefix/early-right-prefix core only. "
            "It leaves a0,a2,b3..b7 zero until separately joined reductions; it is "
            "not by itself a full low/high, low/low, Q8, PGC, or Problem 993 theorem."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2)+"\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", terms, "NEGATIVE", negative_terms, "USED", len(used))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
