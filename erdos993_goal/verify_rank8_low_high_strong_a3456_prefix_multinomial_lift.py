#!/usr/bin/env python3
"""Exact multinomial lift of the a34 direct-H AM-GM certificate through a6."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from verify_rank8_low_high_strong_a3_prefix_amgm import factor, convolution


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_a3456_prefix_multinomial_lift_exact_20260820.json"
OLD_NAMES = ("h", "ta", "a3", "a4", "tb", "b0", "b1", "b2")
NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "tb", "b0", "b1", "b2")
INPUTS = {
    "verify_rank8_low_high_strong_a34_prefix_amgm.py":
        "F3CDCD90041A30757173CD256F2367A39E44A18D443FBB639C691CB08A3D4118",
    "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json":
        "795D3FB211BAAFC3ECDEE2A594A2378E79BF9A6299B19D224CD78964D9F282A8",
    "audit_rank8_low_high_strong_a34_prefix_amgm.py":
        "4A500C2E3D27DEC793AC6F47543A4BF0C8341FB40CEA69A32AC3536D0B91E43A",
    "rank8_low_high_strong_a34_prefix_amgm_independent_audit_20260820.json":
        "C7BCA108DF5111227B313563AD49E148E108830A8B0CD4A2A368AFD5BB0CED11",
    "verify_rank8_low_high_strong_a345_prefix_binomial_lift.py":
        "B73545B6A2425FA4C966E95C985391AA99D2A0F41EAC99B25708C04A8D810F38",
    "rank8_low_high_strong_a345_prefix_binomial_lift_exact_20260820.json":
        "EBA8BD84DC85DFAFF3BED308979BE9240B899B0F340CC593ED13CAEB95EDD962",
    "audit_rank8_low_high_strong_a345_prefix_binomial_lift.py":
        "AF301BD9A2FF345ED90DAAAAF9CFCA6441A087436F4ECA3BC78370130950B90A",
    "rank8_low_high_strong_a345_prefix_binomial_lift_independent_audit_20260820.json":
        "77C682C2954B58A78F042157EFF27245AD97C266526F1F487B06E81E1B56CA96",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def map_sha256(values):
    wire = [[list(key), values[key]] for key in sorted(values)]
    return hashlib.sha256(json.dumps(wire, separators=(",", ":")).encode()).hexdigest().upper()


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    x = dict(zip(NAMES, context.gens()))
    zero, one, h = context.constant(0), context.constant(1), x["h"]
    ratios, left = factor(x["ta"], [
        2*h, h, h, h+x["a3"], h+x["a4"], h+x["a5"], h+x["a6"], h,
    ], one)
    _, right = factor(x["tb"], [
        2*h+x["b0"], h+x["b1"], h+x["b2"], h, h, h, h, h,
    ], one)
    tail = [zero] * 3 + left[3:]
    c = {r: convolution(left, right, r, zero) for r in (7, 8, 9)}
    v = {r: convolution(tail, right, r, zero) for r in (7, 8, 9)}
    margin = c[8]**2 - c[7]*c[9] - h*c[7]*c[8]
    slope = (2*c[8]*v[8] - v[7]*c[9] - c[7]*v[9]
             - h*(v[7]*c[8] + c[7]*v[8]))
    return ratios[2] * margin + h * slope


def lift_ta(monomial, coefficient, output):
    degree = monomial[1]
    for e5 in range(degree + 1):
        for e6 in range(degree - e5 + 1):
            eta = degree - e5 - e6
            row = list(monomial)
            row[1] = eta
            lifted = tuple(row[:4] + [e5, e6] + row[4:])
            multiplier = (math.factorial(degree) // math.factorial(eta)
                          // math.factorial(e5) // math.factorial(e6))
            output[lifted] = output.get(lifted, 0) + coefficient * multiplier


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in INPUTS}
    assert actual_inputs == INPUTS
    upstream = json.loads((ROOT / "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json")
                          .read_text(encoding="utf-8"))
    assert upstream["variables"] == list(OLD_NAMES)
    polynomial = build()
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in polynomial.terms()}
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 1_636_946 and len(negative) == 7_124

    needed, used = {}, {}
    for allocation in upstream["allocations"]:
        target = tuple(allocation["negative_monomial"])
        low = tuple(allocation["source_low"]["monomial"])
        high = tuple(allocation["source_high"]["monomial"])
        demand = int(allocation["demand"])
        u = int(allocation["source_low"]["allocated"])
        v = int(allocation["source_high"]["allocated"])
        assert all(low[i] + high[i] == 2 * target[i] for i in range(8))
        assert 4 * u * v >= demand * demand
        lift_ta(target, demand, needed)
        lift_ta(low, u, used)
        lift_ta(high, v, used)
    assert needed == negative
    assert all(amount <= positive.get(key, 0) for key, amount in used.items())
    remainder = {key: positive[key] - used.get(key, 0) for key in positive}
    assert min(remainder.values()) >= 0

    payload = {
        "schema": "rank8-low-high-strong-a3456-prefix-multinomial-lift-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_A3456_PREFIX_MULTINOMIAL_LIFT",
        "theorem": (
            "H_str=C*M0+h*d>=0 for arbitrary h,ta,a3,a4,a5,a6,tb,b0,b1,b2>=0 "
            "when a0=a2=a7=b3=...=b7=0."
        ),
        "variables": list(NAMES),
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "upstream_amgm_rows": len(upstream["allocations"]),
        "lifted_used_positive_sources": len(used),
        "capacity_deficits": 0,
        "minimum_full_positive_remainder": min(remainder.values()),
        "negative_map_sha256": map_sha256(negative),
        "lifted_used_map_sha256": map_sha256(used),
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "proof": (
            "Substitute ta->ta+a5+a6 in every exact upstream a34 AM-GM row. "
            "Its multinomial negative expansion equals the exact a3456 negative "
            "part and its aggregate source usage fits coefficientwise inside the "
            "exact positive part."
        ),
        "scope_warning": (
            "This direct-H face leaves a0,a2,a7,b3..b7 zero and is not a full "
            "low/high, low/low, Q8, PGC, or Problem 993 theorem."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "NEGATIVE", len(negative), "USED", len(used))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
