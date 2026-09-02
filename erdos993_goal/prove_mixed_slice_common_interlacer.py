#!/usr/bin/env python3
"""Exact replay for the mixed-slice common-interlacer theorem.

The all-order proof is in MIXED_SLICE_COMMON_INTERLACER_2026-08-10.md.
This script checks the diagonal stability-preserver symbol, path-slice
coefficient identities, exact strict root alternation with the mixed slice,
and the induced gamma-pencils in a finite range.  The finite range is only a
transcription audit, not the proof.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "mixed_slice_common_interlacer_exact_20260810.json"
z, w, c = sp.symbols("z w c")


def path_coeff(M: int, i: int) -> int:
    if i < 0 or i >= M:
        return 0
    return comb(2 * M - i - 1, i)


def slice_poly(M1: int, M2: int, s: int) -> sp.Poly:
    return sp.Poly(
        sum(path_coeff(M1, i) * path_coeff(M2, s - i) * z**i
            for i in range(s + 1)),
        z,
        domain=sp.QQ,
    )


def gamma_coeffs(poly: sp.Poly, s: int) -> list[int]:
    # A(z)=sum_h g_h z^h(1+z)^(s-2h); triangular at z^h.
    a = list(reversed(poly.all_coeffs()))
    out: list[int] = []
    for h in range(s // 2 + 1):
        val = a[h]
        for j in range(h):
            val -= out[j] * comb(s - 2 * j, h - j)
        out.append(int(val))
    return out


def disjoint_root_intervals(poly: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    data = poly.intervals(eps=sp.Rational(1, 10**30))
    assert sum(mult for _, mult in data) == poly.degree()
    assert all(mult == 1 for _, mult in data)
    intervals = [ab for ab, _ in data]
    assert all(b < 0 for a, b in intervals)
    return intervals


def strict_alternation(p: sp.Poly, q: sp.Poly) -> bool:
    ip = disjoint_root_intervals(p)
    iq = disjoint_root_intervals(q)
    tagged = [(a, b, 0) for a, b in ip] + [(a, b, 1) for a, b in iq]
    tagged.sort(key=lambda item: item[0])
    assert all(tagged[j][1] < tagged[j + 1][0]
               for j in range(len(tagged) - 1))
    return all(tagged[j][2] != tagged[j + 1][2]
               for j in range(len(tagged) - 1))


def common_interlacer_condition(p: sp.Poly, q: sp.Poly) -> bool:
    """Exact common degree-(d-1) interlacer interval criterion."""
    rp = disjoint_root_intervals(p)
    rq = disjoint_root_intervals(q)
    assert len(rp) == len(rq)
    # There must be a point in every intersection
    # (root_i(p),root_(i+1)(p)) cap (root_i(q),root_(i+1)(q)).
    for i in range(len(rp) - 1):
        left = max(rp[i][1], rq[i][1])
        right = min(rp[i + 1][0], rq[i + 1][0])
        if not left < right:
            return False
    return True


def symbol_check(m: int, ell: int, s: int) -> bool:
    mus = sp.symbols(f"u0:{ell}")
    # R(v)=prod(1+mu_j v), so r_k=e_k(mu).
    rpoly = sp.Poly(sp.prod(1 + mu * c for mu in mus), c)
    rcoeff = list(reversed(rpoly.all_coeffs()))
    lhs = sp.expand(sum(
        comb(m, i) * (rcoeff[s - i] if 0 <= s - i < len(rcoeff) else 0)
        * z**i * w ** (m - i)
        for i in range(m + 1)
    ))
    # w^(m-s)e_s(z repeated m, mu_j w).
    variables = [z] * m + [mu * w for mu in mus]
    rhs = 0
    for subset in __import__("itertools").combinations(variables, s):
        rhs += sp.prod(subset)
    rhs = sp.expand(w ** (m - s) * rhs)
    return sp.expand(lhs - rhs) == 0


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    symbol_cases = 0
    for m, ell, s in [(3, 4, 2), (4, 5, 3), (5, 6, 4), (6, 7, 5)]:
        assert symbol_check(m, ell, s)
        symbol_cases += 1

    slice_cases = 0
    gamma_cases = 0
    pencil_cases = 0
    for s in range(2, 15):
        for excess in (0, 3):
            M = 2 * s + 5 + excess
            A = slice_poly(M, M, s)
            B = slice_poly(M - 1, M - 1, s)
            K = slice_poly(M - 1, M, s)
            Kstar = sp.Poly(sp.expand(z**s * K.as_expr().subs(z, 1 / z)), z)
            assert sp.expand(Kstar.as_expr() -
                             slice_poly(M, M - 1, s).as_expr()) == 0
            assert strict_alternation(A, K)
            assert strict_alternation(B, K)
            slice_cases += 1

            ga = gamma_coeffs(A, s)
            gb = gamma_coeffs(B, s)
            G = sp.Poly(sum(v * z**i for i, v in enumerate(ga)), z)
            H = sp.Poly(sum(v * z**i for i, v in enumerate(gb)), z)
            assert common_interlacer_condition(G, H)
            gamma_cases += 1

            # Exact rational positive pencils: theorem says all c>=0.
            for num, den in ((1, 7), (1, 1), (13, 5)):
                pencil = sp.Poly(den * G.as_expr() + num * H.as_expr(), z)
                disjoint_root_intervals(pencil)
                pencil_cases += 1

    payload = {
        "status": "PASS_EXACT_MIXED_SLICE_COMMON_INTERLACER_REPLAY",
        "symbol_cases": symbol_cases,
        "strict_mixed_slice_cases": slice_cases,
        "gamma_common_interlacer_cases": gamma_cases,
        "positive_gamma_pencil_cases": pencil_cases,
        "range": "2<=s<=14, M=2s+5+e, e in {0,3}",
        "warning": (
            "Positive compatibility is weaker than the oriented strict "
            "alternation (62.4); the remaining issue is componentwise root "
            "monotonicity under M."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    payload["source_sha256"] = sha256(Path(__file__).resolve())
    payload["report_sha256_before_hash_annotation"] = sha256(REPORT)
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
