#!/usr/bin/env python3
"""Exact densest-bin double-star theorem for no-parent rank-seven G1.

The signed-support witness relaxation has a spurious worst corner with two
large degree hubs.  This producer evaluates the genuine double-star family:
two adjacent centers carrying a and b pendant leaves.  For a+b>=9 its edge
density is strictly above 9/10.  A one-dimensional exact Bernstein conversion
in the hub split closes every a,b simultaneously and removes that false leaf.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_edge_double_star_no_parent_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_EDGE_DOUBLE_STAR_NO_PARENT_RANK7_G4_PIECEWISE"
SUPPORT_SOURCE = HERE / "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py"
SUPPORT_REPORT = HERE / "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json"
SUPPORT_SOURCE_SHA256 = "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846"
SUPPORT_REPORT_SHA256 = "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main() -> None:
    assert sha256(SUPPORT_SOURCE) == SUPPORT_SOURCE_SHA256
    assert sha256(SUPPORT_REPORT) == SUPPORT_REPORT_SHA256
    assert json.loads(SUPPORT_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_RANK7_G4_PIECEWISE"
    )

    split, tail = sp.symbols("split tail", nonnegative=True)
    leaf_total = tail + 9
    a = leaf_total * split
    b = leaf_total * (1 - split)

    # Partition independent sets by whether neither center, the a-center, or
    # the b-center is selected:
    # I(W,x)=(1+x)^(a+b)+x(1+x)^a+x(1+x)^b.
    rows = {
        rank: sp.expand(
            choose_poly(a + b, rank)
            + choose_poly(a, rank - 1)
            + choose_poly(b, rank - 1)
        )
        for rank in range(3, 9)
    }
    w3, w4, w5, w6, w7, w8 = (rows[rank] for rank in range(3, 9))
    value = sp.expand(
        8*w3**2 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4**2 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5**2 + 10*w5*w6
    )
    polynomial = sp.Poly(value, split)
    degree = polynomial.degree()
    assert degree == 8
    power = [
        polynomial.coeff_monomial(split**exponent)
        for exponent in range(degree + 1)
    ]
    controls = [
        sp.expand(sum(
            power[exponent]
            * sp.Rational(
                math.comb(index, exponent), math.comb(degree, exponent)
            )
            for exponent in range(index + 1)
        ))
        for index in range(degree + 1)
    ]
    recovered = [
        sp.expand(
            math.comb(degree, exponent)
            * sum(
                (-1) ** (exponent - index)
                * math.comb(exponent, index)
                * controls[index]
                for index in range(exponent + 1)
            )
        )
        for exponent in range(degree + 1)
    ]
    assert all(
        sp.expand(recovered[index] - power[index]) == 0
        for index in range(degree + 1)
    )
    stream = hashlib.sha256()
    scalar_count = 0
    minimum = None
    for index, control in enumerate(controls):
        coefficients = sp.Poly(control, tail).all_coeffs()
        assert all(coefficient >= 0 for coefficient in coefficients)
        scalar_count += len(coefficients)
        local_minimum = min(coefficients)
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        stream.update(f"{index}|{sp.srepr(control)}\n".encode())
    assert scalar_count == 99
    assert minimum == sp.Rational(109, 176400)
    stream_hash = stream.hexdigest().upper()

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be the double star with adjacent centers carrying a and b "
            "pendant leaves. If a+b>=9, then in no-parent common0/sum0 mode "
            "the exact rank-seven bundle coefficient G1 is nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "family": "double star S_(a,b)",
        "dense_bin_equivalence": (
            "|W|=a+b+2 and e(W)=a+b+1, so e/|W|>9/10 iff a+b>=9"
        ),
        "independence_polynomial": (
            "I(W,x)=(1+x)^(a+b)+x(1+x)^a+x(1+x)^b"
        ),
        "parameterization": {
            "a_plus_b": "tail+9",
            "a": "(tail+9)*split",
            "b": "(tail+9)*(1-split)",
            "split_interval": "0<=split<=1",
        },
        "certificate": {
            "bernstein_degree": degree,
            "bernstein_controls": len(controls),
            "tail_power_coefficients": scalar_count,
            "negative_tail_power_coefficients": 0,
            "minimum_tail_power_coefficient": str(minimum),
            "exact_power_inversion": True,
            "ordered_control_stream_sha256": stream_hash,
        },
        "coverage_gap_within_stated_double_star_dense_bin_family": None,
        "scope": (
            "Rank-seven G1, common0/sum0, no-parent, and only genuine double "
            "stars in the strict edge-density-above-9/10 bin. This removes "
            "the two-hub false corner of the support relaxation but is not an "
            "arbitrary-forest extremal reduction."
        ),
        "dependencies_sha256": {
            SUPPORT_SOURCE.name: SUPPORT_SOURCE_SHA256,
            SUPPORT_REPORT.name: SUPPORT_REPORT_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "bernstein_degree": degree,
        "negative_tail_power_coefficients": 0,
        "minimum_tail_power_coefficient": str(minimum),
        "coverage_gap_within_stated_double_star_dense_bin_family": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
