#!/usr/bin/env python3
"""Exact arbitrary-length double-broom plus isolates theorem, no-parent G1.

A double broom has two hubs joined by a path with s internal vertices, with a
and b pendant leaves at the hubs.  Together with r isolates its strict
edge-density-above-9/10 condition is a+b+s>=9r+9.  Connector lengths 0..8 are
finite symbolic cells.  For s>=9, two continuous cones according as the
connector lies below or above 9r+9 cover every remaining integer parameter.
All cells have exact positive split-Bernstein/power certificates.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_edge_double_broom_isolates_no_parent_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_EDGE_DOUBLE_BROOM_ISOLATES_NO_PARENT_RANK7_G4_PIECEWISE"
FILES = {
    "s0_source": "prove_iso_n7_bundle_g1_sum0_dense_edge_double_star_isolates_no_parent_rank7_g4_piecewise.py",
    "s0_report": "iso_n7_bundle_g1_sum0_dense_edge_double_star_isolates_no_parent_exact_rank7_g4_piecewise_20260831.json",
    "s1_source": "prove_iso_n7_bundle_g1_sum0_dense_edge_subdivided_double_star_isolates_no_parent_rank7_g4_piecewise.py",
    "s1_report": "iso_n7_bundle_g1_sum0_dense_edge_subdivided_double_star_isolates_no_parent_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "s0_source": "FD916196C579A480771537BD19579A7B0BCCE057204A83A233AAB8256F2E8B17",
    "s0_report": "88F26EA811032524EA74BFD429B2FA53ACF851F7E22599AF21D7515E7762A878",
    "s1_source": "67E5BF7541937FE1788B9175EBCACFBAA683AABF98C16FAF064ECBDF17D36C5A",
    "s1_report": "D483FDFC502724E0BE54F80F43A803B17F2BD528991364555676773167508864",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def path_counts(order: int) -> list[sp.Integer]:
    """Independence rows through eight, with P_-1=P_0=1."""
    if order == -1:
        return [sp.Integer(1)] + [sp.Integer(0)]*8
    previous = [sp.Integer(1)] + [sp.Integer(0)]*8
    if order == 0:
        return previous
    current = [sp.Integer(1), sp.Integer(1)] + [sp.Integer(0)]*7
    if order == 1:
        return current
    for _ in range(2, order + 1):
        following = [
            current[rank] + (previous[rank - 1] if rank else 0)
            for rank in range(9)
        ]
        previous, current = current, following
    return current


def reduced_g1(rows):
    w3, w4, w5, w6, w7, w8 = (rows[rank] for rank in range(3, 9))
    return sp.expand(
        8*w3**2 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4**2 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5**2 + 10*w5*w6
    )


def fixed_connector_rows(connector, leaves, isolates, split):
    a = leaves*split
    b = leaves*(1 - split)
    middle = path_counts(connector)
    one_hub = path_counts(connector - 1)
    both_hubs = path_counts(connector - 2) if connector >= 1 else None
    rows = {}
    for rank in range(3, 9):
        value = sum(
            middle[j]*choose_poly(leaves + isolates, rank - j)
            for j in range(rank + 1)
        )
        value += sum(
            one_hub[j]
            * (
                choose_poly(a + isolates, rank - 1 - j)
                + choose_poly(b + isolates, rank - 1 - j)
            )
            for j in range(rank)
        )
        if connector >= 1:
            value += sum(
                both_hubs[j]*choose_poly(isolates, rank - 2 - j)
                for j in range(rank - 1)
            )
        rows[rank] = sp.expand(value)
    return rows


def stable_connector_rows(connector, leaves, isolates, split):
    """Polynomial path rows, valid on every integer connector>=9."""
    a = leaves*split
    b = leaves*(1 - split)
    rows = {}
    for rank in range(3, 9):
        value = sum(
            choose_poly(connector - j + 1, j)
            * choose_poly(leaves + isolates, rank - j)
            for j in range(rank + 1)
        )
        value += sum(
            choose_poly(connector - j, j)
            * (
                choose_poly(a + isolates, rank - 1 - j)
                + choose_poly(b + isolates, rank - 1 - j)
            )
            for j in range(rank)
        )
        value += sum(
            choose_poly(connector - j - 1, j)
            * choose_poly(isolates, rank - 2 - j)
            for j in range(rank - 1)
        )
        rows[rank] = sp.expand(value)
    return rows


def split_certificate(expression, split, unbounded_variables):
    polynomial = sp.Poly(sp.expand(expression), split)
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
        terms = sp.Poly(control, *unbounded_variables).terms()
        assert all(coefficient >= 0 for _, coefficient in terms)
        scalar_count += len(terms)
        local_minimum = min(coefficient for _, coefficient in terms)
        minimum = local_minimum if minimum is None else min(minimum, local_minimum)
        stream.update(f"{index}|{sp.srepr(control)}\n".encode())
    assert minimum == sp.Rational(109, 176400)
    return {
        "split_bernstein_degree": degree,
        "split_bernstein_controls": len(controls),
        "nonzero_unbounded_power_coefficients": scalar_count,
        "negative_power_coefficients": 0,
        "minimum_power_coefficient": str(minimum),
        "exact_split_power_inversion": True,
        "ordered_control_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest
    assert json.loads((HERE/FILES["s0_report"]).read_text(encoding="utf-8"))[
        "marker"
    ] == "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_EDGE_DOUBLE_STAR_ISOLATES_NO_PARENT_RANK7_G4_PIECEWISE"
    assert json.loads((HERE/FILES["s1_report"]).read_text(encoding="utf-8"))[
        "marker"
    ] == "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_EDGE_SUBDIVIDED_DOUBLE_STAR_ISOLATES_NO_PARENT_RANK7_G4_PIECEWISE"

    split, isolates, tail = sp.symbols(
        "split isolates tail", nonnegative=True
    )
    cells = [
        {"connector_internal_vertices": 0, "dependency": "s0_report"},
        {"connector_internal_vertices": 1, "dependency": "s1_report"},
    ]
    for connector in range(2, 9):
        leaves = 9*isolates + 9 - connector + tail
        value = reduced_g1(
            fixed_connector_rows(connector, leaves, isolates, split)
        )
        certificate = split_certificate(
            value, split, (isolates, tail)
        )
        assert certificate["nonzero_unbounded_power_coefficients"] == 594
        cells.append({
            "connector_internal_vertices": connector,
            "leaf_total": f"9r+{9-connector}+tail",
            "certificate": certificate,
        })

    # Stable connector below the isolate quota: s=9+u, v=9r+9-s>=0,
    # r=(u+v)/9, and the leaf total is v+tail.
    u, v = sp.symbols("u v", nonnegative=True)
    connector_low = 9 + u
    isolates_low = (u + v)/9
    leaves_low = v + tail
    low_value = reduced_g1(stable_connector_rows(
        connector_low, leaves_low, isolates_low, split
    ))
    low_certificate = split_certificate(
        low_value, split, (u, v, tail)
    )
    assert low_certificate["nonzero_unbounded_power_coefficients"] == 2574

    # Stable connector above the isolate quota: s=9r+9+u, with arbitrary
    # nonnegative leaf total tail.
    connector_high = 9*isolates + 9 + u
    leaves_high = tail
    high_value = reduced_g1(stable_connector_rows(
        connector_high, leaves_high, isolates, split
    ))
    high_certificate = split_certificate(
        high_value, split, (isolates, u, tail)
    )
    assert high_certificate["nonzero_unbounded_power_coefficients"] == 2574

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be a double broom whose two hubs carry a,b pendant leaves "
            "and are joined by a path with s internal vertices, together with "
            "r isolated vertices. If a+b+s>=9r+9, then the exact no-parent "
            "common0/sum0 rank-seven coefficient G1 is nonnegative."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "family": "arbitrary-length double broom plus isolates",
        "dense_bin_equivalence": (
            "|W|=a+b+s+2+r and e=a+b+s+1, so 10e>9|W| iff a+b+s>=9r+9"
        ),
        "independence_polynomial": (
            "For s>=1: (1+x)^r[(1+x)^(a+b)I(P_s)+"
            "x((1+x)^a+(1+x)^b)I(P_(s-1))+x^2 I(P_(s-2))]; "
            "the s=0 adjacent-hub cell omits the final term."
        ),
        "finite_connector_cells": cells,
        "stable_connector_cells": [
            {
                "condition": "s>=9 and s<=9r+9",
                "parameterization": (
                    "u=s-9, v=9r+9-s, r=(u+v)/9, a+b=v+tail"
                ),
                "certificate": low_certificate,
            },
            {
                "condition": "s>=9r+9",
                "parameterization": (
                    "u=s-(9r+9), a+b=tail"
                ),
                "certificate": high_certificate,
            },
        ],
        "coverage_partition": (
            "s=0,1 imported; s=2..8 exact finite symbolic cells; every s>=9 "
            "lies in at least one of the two stable connector cells."
        ),
        "coverage_gap_within_stated_double_broom_dense_bin_family": None,
        "scope": (
            "Rank-seven G1, common0/sum0, no-parent, arbitrary-length double "
            "brooms plus isolates in the strict >9/10 edge-density bin. This "
            "is a stopping family for the two-hub overlap obstruction, not an "
            "arbitrary-forest extremal reduction."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_connector_cells": len(cells),
        "stable_connector_cells": 2,
        "negative_power_coefficients": 0,
        "coverage_gap_within_stated_double_broom_dense_bin_family": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
