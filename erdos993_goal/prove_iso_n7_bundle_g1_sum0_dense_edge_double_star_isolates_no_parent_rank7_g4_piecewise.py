#!/usr/bin/env python3
"""Exact dense-bin double-star-plus-isolates theorem, no-parent G1."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_edge_double_star_isolates_no_parent_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_EDGE_DOUBLE_STAR_ISOLATES_NO_PARENT_RANK7_G4_PIECEWISE"
BASE_SOURCE = HERE / "prove_iso_n7_bundle_g1_sum0_dense_edge_double_star_no_parent_rank7_g4_piecewise.py"
BASE_REPORT = HERE / "iso_n7_bundle_g1_sum0_dense_edge_double_star_no_parent_exact_rank7_g4_piecewise_20260831.json"
BASE_SOURCE_SHA256 = "033BE6954A26A40B56F655187FF60A3A3C68589B6C44330B255FBFE7969EB366"
BASE_REPORT_SHA256 = "C69ABBB02BD489C8C572B634AEFB30F44E668D3B3AFA92530B763FA612B9DB9E"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main() -> None:
    assert sha256(BASE_SOURCE) == BASE_SOURCE_SHA256
    assert sha256(BASE_REPORT) == BASE_REPORT_SHA256
    assert json.loads(BASE_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_EDGE_DOUBLE_STAR_NO_PARENT_RANK7_G4_PIECEWISE"
    )

    split, isolates, tail = sp.symbols(
        "split isolates tail", nonnegative=True
    )
    leaf_total = 9*isolates + 9 + tail
    a = leaf_total*split
    b = leaf_total*(1 - split)
    rows = {
        rank: sp.expand(
            choose_poly(leaf_total + isolates, rank)
            + choose_poly(a + isolates, rank - 1)
            + choose_poly(b + isolates, rank - 1)
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
    scalar_count = 0
    minimum = None
    stream = hashlib.sha256()
    for index, control in enumerate(controls):
        terms = sp.Poly(control, isolates, tail).terms()
        assert all(coefficient >= 0 for _, coefficient in terms)
        scalar_count += len(terms)
        local_minimum = min(coefficient for _, coefficient in terms)
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        stream.update(f"{index}|{sp.srepr(control)}\n".encode())
    assert scalar_count == 594
    assert minimum == sp.Rational(109, 176400)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be a double star with a and b pendant leaves, together "
            "with r isolated vertices. If a+b>=9r+9, then in no-parent "
            "common0/sum0 mode the exact rank-seven coefficient G1 is "
            "nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "family": "double star S_(a,b) plus rK1",
        "dense_bin_equivalence": (
            "|W|=a+b+2+r and e=a+b+1, so 10e>9|W| iff a+b>=9r+9"
        ),
        "independence_polynomial": (
            "I(W,x)=(1+x)^(a+b+r)+x(1+x)^(a+r)+x(1+x)^(b+r)"
        ),
        "parameterization": {
            "a_plus_b": "9r+9+tail",
            "a": "(9r+9+tail)*split",
            "b": "(9r+9+tail)*(1-split)",
            "r": "isolates",
            "split_interval": "0<=split<=1",
        },
        "certificate": {
            "split_bernstein_degree": degree,
            "split_bernstein_controls": len(controls),
            "nonzero_isolate_tail_power_coefficients": scalar_count,
            "negative_power_coefficients": 0,
            "minimum_power_coefficient": str(minimum),
            "exact_split_power_inversion": True,
            "ordered_control_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_stated_double_star_isolate_dense_bin_family": None,
        "scope": (
            "Rank-seven G1, common0/sum0, no-parent, only a double star plus "
            "isolates in the strict edge-density-above-9/10 bin. No arbitrary "
            "forest extremal reduction is asserted."
        ),
        "dependencies_sha256": {
            BASE_SOURCE.name: BASE_SOURCE_SHA256,
            BASE_REPORT.name: BASE_REPORT_SHA256,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_power_coefficients": 0,
        "minimum_power_coefficient": str(minimum),
        "coverage_gap_within_stated_double_star_isolate_dense_bin_family": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
