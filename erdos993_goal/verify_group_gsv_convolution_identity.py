#!/usr/bin/env python3
"""Test the proposed GSV-convolution factorization of the hard group endpoint.

After peeling one S derivative from the odd order d=2m+5, put d0=d-1.
The square differential symbol splits as

    (z+w)^(d0-4) K^2 = K * (z+w)^(d0-4) K.

The two factors correspond to bottom members F_(2m+3,2) and
F_(3m+3,2m+2), both of total degree kappa=4m+4.  This script compares the
normalized coefficient convolution in Marcus's GSV theorem with the exact
even-order defect-one group polynomial.
"""

from __future__ import annotations

import json
from math import factorial
from pathlib import Path

import sympy as sp

from probe_group_as_bottom_difference import bottom, dsum, x, y
from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("group_gsv_convolution_identity_20260804.json")


def even_group(N: int, d0: int) -> sp.Expr:
    seeds = [hypergeometric_form(N - s, 1) for s in range(3)]
    terms = [seed.subs(X, x) * seed.subs(X, y) for seed in seeds]
    return sp.expand(
        dsum(terms[0], d0)
        - 2 * dsum(terms[1], d0 - 2)
        + dsum(terms[2], d0 - 4)
    )


def normalized_array(poly: sp.Expr, kappa: int, local: int) -> dict[tuple[int, int], sp.Expr]:
    source = sp.Poly(sp.expand(poly), x, y)
    result: dict[tuple[int, int], sp.Expr] = {}
    for (j, k), coefficient in source.terms():
        if j + k > kappa:
            raise AssertionError((j, k, kappa))
        result[j, k] = sp.factor(
            coefficient
            * factorial(kappa - j - k)
            * factorial(local - j)
            * factorial(local - k)
        )
    return result


def reverse_borel_array(poly: sp.Expr, ambient: int) -> dict[tuple[int, int], sp.Expr]:
    """Recover K[i,j] from B_ambient[K](X,Y)."""
    source = sp.Poly(sp.expand(poly), x, y)
    result: dict[tuple[int, int], sp.Expr] = {}
    for (h, k), coefficient in source.terms():
        if h > ambient or k > ambient:
            raise AssertionError((h, k, ambient))
        result[ambient - h, ambient - k] = sp.factor(
            coefficient * factorial(h) * factorial(k)
        )
    return result


def convolution(left: dict[tuple[int, int], sp.Expr],
                right: dict[tuple[int, int], sp.Expr]) -> dict[tuple[int, int], sp.Expr]:
    result: dict[tuple[int, int], sp.Expr] = {}
    for (a, b), u in left.items():
        for (c, d), v in right.items():
            key = (a + c, b + d)
            result[key] = result.get(key, sp.S.Zero) + u * v
    return {key: sp.factor(value) for key, value in result.items() if value}


def main() -> None:
    records = []
    for m in range(2, 7):
        N = 3 * m + 4
        d = 2 * m + 5
        d0 = d - 1
        kappa = 2 * N - d0
        e1, e2 = 4, d0 - 4
        M1, M2 = (kappa + e1) // 2, (kappa + e2) // 2
        assert 2 * M1 - e1 == kappa
        assert 2 * M2 - e2 == kappa

        first = bottom(M1, e1)
        second = bottom(M2, e2)
        target = even_group(N, d0)
        left = normalized_array(first, kappa, N)
        right = normalized_array(second, kappa, N)
        observed = convolution(left, right)
        expected = normalized_array(target, kappa, N)

        # The GSV differential-symbol product is truncated to the admissible
        # local/global support of the output.
        observed = {
            key: value for key, value in observed.items()
            if key[0] <= N and key[1] <= N and key[0] + key[1] <= kappa
        }
        expected = {
            key: value for key, value in expected.items()
            if key[0] <= N and key[1] <= N and key[0] + key[1] <= kappa
        }

        keys = set(observed) | set(expected)
        ratios = {
            sp.factor(observed.get(key, 0) / expected.get(key, 0))
            for key in keys
            if observed.get(key, 0) and expected.get(key, 0)
        }
        missing_observed = [key for key in keys if expected.get(key, 0) and not observed.get(key, 0)]
        extra_observed = [key for key in keys if observed.get(key, 0) and not expected.get(key, 0)]
        matched = len(ratios) == 1 and not missing_observed and not extra_observed
        record = {
            "m": m,
            "N": N,
            "d_even": d0,
            "kappa": kappa,
            "first_bottom": [M1, e1],
            "second_bottom": [M2, e2],
            "left_terms": len(left),
            "right_terms": len(right),
            "target_terms": len(expected),
            "ratio_count": len(ratios),
            "ratio": str(next(iter(ratios))) if len(ratios) == 1 else None,
            "missing": missing_observed[:5],
            "extra": extra_observed[:5],
            "matched": matched,
        }
        records.append(record)
        print(record, flush=True)
        if not matched:
            break

    report = {
        "status": (
            "PASS_GSV_CONVOLUTION_IDENTITY" if all(r["matched"] for r in records)
            else "GSV_NORMALIZATION_MISMATCH"
        ),
        "records": records,
        "normalization": (
            "p_jk=[X^jY^k]p * (kappa-j-k)! (N-j)! (N-k)!; Marcus's GSV "
            "output is the admissibly truncated two-dimensional convolution "
            "of these arrays, up to one global positive scalar."
        ),
        "scope": "Finite exact identity audit; an all-order proof would follow from the reverse-Borel kernel product.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
