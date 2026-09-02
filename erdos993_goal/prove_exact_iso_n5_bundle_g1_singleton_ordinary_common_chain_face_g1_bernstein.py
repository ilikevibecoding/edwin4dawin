#!/usr/bin/env python3
"""Exact face-patch certificate for the hard common-chain simplex branch.

The branch is

    degrees(u,v,p)=111, selected adjacencies=000,
    common(p,u)=0, common(p,v)=1, common(u,v)=1,
    xu,xv at their lower endpoints, xp positive.

The exact singleton-ordinary strong numerator is mapped to the n>=14
degree-excess simplex by the canonical probe source.  At geometry/interval
elevation four every coefficient away from one boundary face is already
nonnegative.  On that face (n=14, dp=1, full edge budget, W at its upper
endpoint, xp at its lower endpoint), a separate three-variable Pólya
elevation through homogeneous degree fifteen has strictly positive exact
coefficients.  This patches the whole branch without a prohibitively large
global elevation.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

import sympy as sp
from flint import fmpq

from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,
    mapped_polynomial,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
SIMPLEX_SOURCE = HERE / "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py"
DERIVATION_SOURCE = HERE / "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py"
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_common_chain_face_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_COMMON_CHAIN_FACE_G1_BERNSTEIN"


def main() -> None:
    polynomial, variables = mapped_polynomial(
        (1, 1, 1), (0, 0, 0), (0, 1), ("L", "L"),
        "centers", 1, 0, 0, 1, 14, parent_state="P",
    )
    coefficients, stats = homogeneous_coefficients_fast(polynomial, 4, 4)
    assert stats == {
        "geometry_degree": 9,
        "wedge_interval_degree": 6,
        "parent_interval_degree": 8,
        "mapped_terms": 1674,
        "homogeneous_coefficients": 315252,
    }

    # Key layout is (N,X,Y,Z,R,H,T,Tbar,L,Lbar).  The exceptional face is
    # N=Z=H=Tbar=L=0.  All coefficients outside it are directly nonnegative.
    def on_face(key: tuple[int, ...]) -> bool:
        return key[0] == key[3] == key[5] == key[7] == key[8] == 0

    outside = [value for key, value in coefficients.items() if not on_face(key)]
    face_rows = [(key, value) for key, value in coefficients.items() if on_face(key)]
    assert outside and min(outside) >= 0
    assert len([value for _key, value in face_rows if value < 0]) == 3

    face: dict[tuple[int, int, int], fmpq] = defaultdict(lambda: fmpq(0))
    for key, value in face_rows:
        assert key[6] == stats["wedge_interval_degree"]
        assert key[9] == stats["parent_interval_degree"]
        geometry = (key[1], key[2], key[4])
        assert sum(geometry) == stats["geometry_degree"]
        face[geometry] += value
    face = {key: value for key, value in face.items() if value}

    # Independently match the extracted slice to the literal restriction of
    # the mapped polynomial, homogenized by X+Y+R=1 at degree nine.
    N, X, Y, Z, R, T, L = variables
    restricted = sp.Poly(
        sp.expand(polynomial.as_expr().subs({N: 0, Z: 0, T: 1, L: 0})),
        X, Y, R,
    )
    literal_homogeneous = sp.expand(sum(
        coefficient * X**monomial[0] * Y**monomial[1] * R**monomial[2]
        * (X + Y + R) ** (stats["geometry_degree"] - sum(monomial))
        for monomial, coefficient in restricted.terms()
    ))
    extracted_homogeneous = sp.expand(sum(
        sp.Rational(int(value.p), int(value.q)) * X**monomial[0]
        * Y**monomial[1] * R**monomial[2]
        for monomial, value in face.items()
    ))
    assert sp.expand(literal_homogeneous - extracted_homogeneous) == 0

    elevation_trace = []
    current_degree = stats["geometry_degree"]
    while True:
        negative = sum(value < 0 for value in face.values())
        elevation_trace.append({
            "homogeneous_degree": current_degree,
            "nonzero_coefficients": len(face),
            "negative_coefficients": int(negative),
            "minimum": str(min(face.values())),
        })
        if not negative:
            break
        assert current_degree < 15, "face did not close by the pinned degree"
        elevated: dict[tuple[int, int, int], fmpq] = defaultdict(lambda: fmpq(0))
        for monomial, value in face.items():
            for position in range(3):
                lifted = list(monomial)
                lifted[position] += 1
                elevated[tuple(lifted)] += value
        face = {key: value for key, value in elevated.items() if value}
        current_degree += 1

    assert current_degree == 15
    assert min(face.values()) == 13735800
    report = {
        "marker": MARKER,
        "branch": {
            "degree_flags_uvp": "111",
            "adjacency_uv_pu_pv": "000",
            "common_pu_pv": "01",
            "neighbor_excess_endpoints_uv": "LL",
            "uv_common": 1,
            "parent_neighbor_excess_state": "P",
            "order_base": 14,
        },
        "exact_geometry": {
            "parent_upper": "xp<=r-1",
            "reason_parent_upper": (
                "the fixed u-v common center has excess one and is disjoint "
                "from N(p); all p-neighbor excess lies in the remaining r-1"
            ),
            "other_wedge_upper": (
                "2+binom(xp,2)+binom(r-xp,2), equivalently "
                "2+f(xp-1)+f(r-xp-1) for f(t)=t(t+1)/2"
            ),
            "reason_wedge_upper": (
                "two distinct fixed excess-one common centers, one "
                "parent-exclusive pool of total xp-1, and one free pool"
            ),
        },
        "global_basis": {
            **stats,
            "outside_face_coefficients": len(outside),
            "outside_face_minimum": str(min(outside)),
            "outside_face_negative": 0,
            "face_negative_at_degree_9": 3,
        },
        "face": {
            "equations": "N=Z=H=Tbar=L=0",
            "factor": "T^6*Lbar^8 times a homogeneous polynomial in X,Y,R",
            "literal_restriction_match": True,
            "elevation_identity": "multiply by X+Y+R=1",
            "trace": elevation_trace,
            "final_degree": current_degree,
            "final_minimum": str(min(face.values())),
            "final_negative": 0,
        },
        "theorem": (
            "The strengthened singleton-ordinary strong numerator is "
            "nonnegative on the displayed complete canonical branch for every n>=14."
        ),
        "scope": (
            "One exact n>=14 canonical simplex branch only. This does not "
            "prove finite orders, other branches or modes, all N5, or Erdos Problem 993."
        ),
        "dependencies_sha256": {
            SIMPLEX_SOURCE.name: hashlib.sha256(SIMPLEX_SOURCE.read_bytes()).hexdigest().upper(),
            DERIVATION_SOURCE.name: hashlib.sha256(DERIVATION_SOURCE.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "global_coefficients": stats["homogeneous_coefficients"],
        "outside_face_negative": 0,
        "face_final_degree": current_degree,
        "face_final_minimum": str(min(face.values())),
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
