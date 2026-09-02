#!/usr/bin/env python3
"""Exact binomial lift of the a34 direct-H AM-GM certificate to a345."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from verify_rank8_low_high_strong_a3_prefix_amgm import factor, convolution


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_strong_a345_prefix_binomial_lift_exact_20260820.json"
OLD_NAMES = ("h", "ta", "a3", "a4", "tb", "b0", "b1", "b2")
NAMES = ("h", "ta", "a3", "a4", "a5", "tb", "b0", "b1", "b2")
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


def map_sha256(values: dict[tuple[int, ...], int]) -> str:
    wire = [[list(key), values[key]] for key in sorted(values)]
    return hashlib.sha256(json.dumps(wire, separators=(",", ":")).encode()).hexdigest().upper()


def build():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero, one, h = context.constant(0), context.constant(1), variables["h"]
    left_ratios, left = factor(variables["ta"], [
        2 * h, h, h, h + variables["a3"], h + variables["a4"],
        h + variables["a5"], h, h,
    ], one)
    _, right = factor(variables["tb"], [
        2 * h + variables["b0"], h + variables["b1"],
        h + variables["b2"], h, h, h, h, h,
    ], one)
    tail = [zero] * 3 + left[3:]
    c = {rank: convolution(left, right, rank, zero) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank, zero) for rank in (7, 8, 9)}
    margin = c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8]
    derivative = (2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
                  - h * (v[7] * c[8] + c[7] * v[8]))
    return left_ratios[2] * margin + h * derivative


def lift_ta(monomial: tuple[int, ...], coefficient: int,
            output: dict[tuple[int, ...], int]) -> None:
    """Expand the old ta exponent after ta -> ta+a5."""
    exponent = monomial[1]
    for a5_exponent in range(exponent + 1):
        old = list(monomial)
        old[1] = exponent - a5_exponent
        lifted = tuple(old[:4] + [a5_exponent] + old[4:])
        output[lifted] = (output.get(lifted, 0)
                          + coefficient * math.comb(exponent, a5_exponent))


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in INPUTS}
    assert actual_inputs == INPUTS
    upstream = json.loads((ROOT / "rank8_low_high_strong_a34_prefix_amgm_exact_20260820.json")
                          .read_text(encoding="utf-8"))
    assert upstream["status"] == "PASS_EXACT_STRONG_AUXILIARY_A34_PREFIX_AMGM"
    assert upstream["variables"] == list(OLD_NAMES)
    assert len(upstream["allocations"]) == 1_950

    polynomial = build()
    terms = {tuple(map(int, monomial)): int(coefficient)
             for monomial, coefficient in polynomial.terms()}
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    assert len(terms) == 482_694 and len(negative) == 3_943

    lifted_negative: dict[tuple[int, ...], int] = {}
    lifted_used: dict[tuple[int, ...], int] = {}
    for row in upstream["allocations"]:
        target = tuple(row["negative_monomial"])
        low = tuple(row["source_low"]["monomial"])
        high = tuple(row["source_high"]["monomial"])
        demand = int(row["demand"])
        low_used = int(row["source_low"]["allocated"])
        high_used = int(row["source_high"]["allocated"])
        assert tuple(low[index] + high[index] for index in range(len(OLD_NAMES))) == tuple(
            2 * exponent for exponent in target)
        assert 4 * low_used * high_used >= demand * demand
        lift_ta(target, demand, lifted_negative)
        lift_ta(low, low_used, lifted_used)
        lift_ta(high, high_used, lifted_used)

    # The whole negative part is precisely the ta->ta+a5 binomial lift.
    assert lifted_negative == negative
    deficits = {key: lifted_used[key] - positive.get(key, 0)
                for key in lifted_used if lifted_used[key] > positive.get(key, 0)}
    assert not deficits
    residuals = {key: positive.get(key, 0) - lifted_used.get(key, 0)
                 for key in positive}
    assert min(residuals.values()) >= 0

    payload = {
        "schema": "rank8-low-high-strong-a345-prefix-binomial-lift-v1",
        "status": "PASS_EXACT_STRONG_AUXILIARY_A345_PREFIX_BINOMIAL_LIFT",
        "theorem": (
            "H_str=C*M0+h*d>=0 for arbitrary h,ta,a3,a4,a5,tb,b0,b1,b2>=0 "
            "when a0=a2=a6=a7=b3=...=b7=0."
        ),
        "variables": list(NAMES),
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "upstream_amgm_rows": len(upstream["allocations"]),
        "lifted_negative_terms": len(lifted_negative),
        "lifted_used_positive_sources": len(lifted_used),
        "capacity_deficits": len(deficits),
        "minimum_full_positive_remainder": min(residuals.values()),
        "negative_map_sha256": map_sha256(negative),
        "lifted_used_map_sha256": map_sha256(lifted_used),
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "proof": (
            "Substitute ta->ta+a5 in every exact upstream a34 AM-GM row. "
            "The expanded negative side equals the exact a345 negative part, "
            "while the aggregate expanded source usage is coefficientwise no "
            "larger than the exact a345 positive part."
        ),
        "scope_warning": (
            "This is a direct-H face theorem only. It leaves a0,a2,a6,a7 and "
            "b3..b7 zero; it is not a full low/high, low/low, Q8, PGC, or "
            "Problem 993 theorem."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "NEGATIVE", len(negative), "USED", len(lifted_used))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
