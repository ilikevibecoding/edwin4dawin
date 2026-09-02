#!/usr/bin/env python3
"""Exact face certificates for three hard singleton-ordinary common branches."""

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
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_common_faces_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_COMMON_FACES_G1_BERNSTEIN"


def certify(
    common: tuple[int, int], uv_common: int, final_degree: int,
    final_minimum: int, expected_face_negative: int,
):
    polynomial, variables = mapped_polynomial(
        (1, 1, 1), (0, 0, 0), common, ("L", "L"),
        "centers", 1, 0, 0, uv_common, 14, parent_state="P",
    )
    coefficients, stats = homogeneous_coefficients_fast(polynomial, 4, 4)
    assert stats["geometry_degree"] == 9
    assert stats["wedge_interval_degree"] == 6
    assert stats["parent_interval_degree"] == 8
    assert stats["mapped_terms"] == 1674
    assert stats["homogeneous_coefficients"] == 315252

    # Key layout: (N,X,Y,Z,R,H,T,Tbar,L,Lbar).  This is the sole face on
    # which the degree-nine global basis can have negative coefficients.
    def on_face(key: tuple[int, ...]) -> bool:
        return key[0] == key[3] == key[5] == key[7] == key[8] == 0

    outside = [value for key, value in coefficients.items() if not on_face(key)]
    face_rows = [(key, value) for key, value in coefficients.items() if on_face(key)]
    assert min(outside) >= 0
    assert sum(value < 0 for _key, value in face_rows) == expected_face_negative

    face: dict[tuple[int, int, int], fmpq] = defaultdict(lambda: fmpq(0))
    for key, value in face_rows:
        assert key[6] == 6 and key[9] == 8
        geometry = (key[1], key[2], key[4])
        assert sum(geometry) == 9
        face[geometry] += value
    face = {key: value for key, value in face.items() if value}

    # Match the extracted homogeneous slice to a second literal restriction
    # of the mapped polynomial before using X+Y+R=1 for elevation.
    N, X, Y, Z, R, T, L = variables
    restricted = sp.Poly(
        sp.expand(polynomial.as_expr().subs({N: 0, Z: 0, T: 1, L: 0})),
        X, Y, R,
    )
    literal = sp.expand(sum(
        coefficient * X**monomial[0] * Y**monomial[1] * R**monomial[2]
        * (X + Y + R) ** (9 - sum(monomial))
        for monomial, coefficient in restricted.terms()
    ))
    extracted = sp.expand(sum(
        sp.Rational(int(value.p), int(value.q)) * X**monomial[0]
        * Y**monomial[1] * R**monomial[2]
        for monomial, value in face.items()
    ))
    assert sp.expand(literal - extracted) == 0

    trace = []
    degree = 9
    while True:
        negative = sum(value < 0 for value in face.values())
        trace.append({
            "degree": degree,
            "nonzero": len(face),
            "negative": int(negative),
            "minimum": str(min(face.values())),
        })
        if not negative:
            break
        assert degree < final_degree
        elevated: dict[tuple[int, int, int], fmpq] = defaultdict(lambda: fmpq(0))
        for monomial, value in face.items():
            for position in range(3):
                lifted = list(monomial)
                lifted[position] += 1
                elevated[tuple(lifted)] += value
        face = {key: value for key, value in elevated.items() if value}
        degree += 1
    assert degree == final_degree
    assert min(face.values()) == final_minimum
    return {
        "branch": f"111/000/{''.join(map(str, common))}/LL/{uv_common}/P/full",
        "global_degree_9": {
            **stats,
            "outside_face_negative": 0,
            "outside_face_minimum": str(min(outside)),
            "face_negative": expected_face_negative,
        },
        "face": {
            "equations": "N=Z=H=Tbar=L=0",
            "factor": "T^6*Lbar^8 times a homogeneous polynomial in X,Y,R",
            "literal_restriction_match": True,
            "identity": "X+Y+R=1",
            "trace": trace,
            "final_degree": degree,
            "final_minimum": str(min(face.values())),
            "final_negative": 0,
        },
    }


def main() -> None:
    rows = [
        certify((0, 1), 1, 15, 13735800, 3),
        certify((1, 1), 0, 23, 11583000, 3),
        certify((1, 1), 1, 11, 15364800, 1),
    ]
    report = {
        "marker": MARKER,
        "theorem": (
            "The strengthened singleton-ordinary strong numerator is "
            "nonnegative for every n>=14 on all three displayed complete canonical branches."
        ),
        "rows": rows,
        "geometry": {
            "01_uv1": (
                "two distinct fixed excess-one common centers; xp<=r-1; "
                "W_other<=2+f(xp-1)+f(r-xp-1)"
            ),
            "11_uv0": (
                "two distinct fixed excess-one p-mark common centers; xp<=r; "
                "W_other<=2+f(xp-2)+f(r-xp)"
            ),
            "11_uv1": (
                "one shared excess-two center common to all three marked pairs; "
                "xp<=r; W_other<=3+f(xp-2)+f(r-xp)"
            ),
            "f": "f(t)=t(t+1)/2",
        },
        "scope": (
            "Exactly three n>=14 singleton-ordinary canonical branches. No "
            "finite-order, other-mode, all-N5, or Erdos Problem 993 claim."
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
        "branches": [row["branch"] for row in rows],
        "final_degrees": [row["face"]["final_degree"] for row in rows],
        "final_minima": [row["face"]["final_minimum"] for row in rows],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
