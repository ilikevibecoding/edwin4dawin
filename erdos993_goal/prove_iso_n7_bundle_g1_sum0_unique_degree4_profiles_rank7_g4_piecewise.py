#!/usr/bin/env python3
"""Exact all-order cone certificate for the unique-degree-4 profiles."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_symbolic_rank7_g4_piecewise import (
    S,
    T,
    cone_controls,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_unique_degree4_profiles_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_UNIQUE_DEGREE4_PROFILES_RANK7_G4_PIECEWISE"
DEPENDENCY = "analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_symbolic_rank7_g4_piecewise.py"
DEPENDENCY_SHA = "0C38A6BF758EB0D825A33028169784C9729A942E86B0FAB16F04648C234167C1"
B, C, A, R = sp.symbols("B C A R", integer=True, nonnegative=True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(HERE/DEPENDENCY) == DEPENDENCY_SHA
    branching_threes = B+2
    degree_twos = C
    order = 5+2*branching_threes+degree_twos
    moments = {
        rank: sp.binomial(4, rank)+branching_threes*sp.binomial(3, rank)+degree_twos*sp.binomial(2, rank)
        for rank in S
    }
    squares = {
        rank: sp.binomial(4, rank)**2+branching_threes*sp.binomial(3, rank)**2+degree_twos*sp.binomial(2, rank)**2
        for rank in T
    }
    controls = cone_controls(order, moments, squares)
    stream = hashlib.sha256()
    total = 0
    negative = 0
    minimum = None
    per_control = []
    for index, control in enumerate(controls):
        local_total = 0
        local_negative = 0
        local_minimum = None
        for fixed_b in range(17):
            sector = sp.Poly(
                sp.expand(control.subs({B: fixed_b, C: 33-2*fixed_b+R})),
                R,
                domain=sp.QQ,
            )
            for powers, coefficient in sector.terms():
                key = ("finite", fixed_b, powers)
                stream.update(f"{index}|{key}|{coefficient}\n".encode("ascii"))
                local_total += 1
                local_negative += 1 if coefficient < 0 else 0
                candidate = (coefficient, key)
                local_minimum = candidate if local_minimum is None else min(local_minimum, candidate)
        tail = sp.Poly(
            sp.expand(control.subs({B: 17+A, C: R})), A, R, domain=sp.QQ
        )
        for powers, coefficient in tail.terms():
            key = ("tail", None, powers)
            stream.update(f"{index}|{key}|{coefficient}\n".encode("ascii"))
            local_total += 1
            local_negative += 1 if coefficient < 0 else 0
            local_minimum = min(local_minimum, (coefficient, key))
        assert local_total == 253
        assert local_negative == 0
        total += local_total
        negative += local_negative
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        per_control.append({
            "control_index": index,
            "coefficient_count": local_total,
            "negative_count": local_negative,
            "minimum": [str(local_minimum[0]), list(local_minimum[1])],
        })
    assert total == 2277
    assert negative == 0
    assert minimum[0] == sp.Rational(143, 100800)
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every degree profile with exactly one vertex of degree four, "
            "B+2 vertices of degree three, C vertices of degree two, and the "
            "remaining vertices leaves, all nine controls of the pinned "
            "connected-tree G1 degree-profile relaxation are nonnegative when "
            "the order is at least 42."
        ),
        "profile": (
            "increments (3,2^(B+2),1^C), order n=9+2B+C, B,C>=0"
        ),
        "gapless_domain_partition": {
            "finite_sectors": "B=0..16 and C=33-2B+R, R>=0",
            "tail_sector": "B=17+A and C=R, A,R>=0",
            "coverage_gap": None,
        },
        "certificate": {
            "controls": 9,
            "coefficient_count": total,
            "negative_count": negative,
            "minimum_coefficient": str(minimum[0]),
            "per_control": per_control,
            "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_profile_scope": None,
        "scope": (
            "Exact degree-profile relaxation only. This is the exceptional "
            "profile family for the maximum-degree leaf-growth induction; it "
            "does not alone promote actual connected-tree G1."
        ),
        "dependency_sha256": {DEPENDENCY: DEPENDENCY_SHA},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coefficient_count": total,
        "negative_count": negative,
        "minimum_coefficient": str(minimum[0]),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_profile_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
