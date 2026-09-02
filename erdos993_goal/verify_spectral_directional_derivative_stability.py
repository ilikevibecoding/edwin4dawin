"""Replay the spectral directional-derivative stability theorem.

The theorem is proved analytically in the companion note.  This script
checks its identities and a deterministic exact family.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "spectral_directional_derivative_stability_exact_20260813.json"


def homogeneous_part(poly: sp.Expr, z: sp.Symbol, w: sp.Symbol, degree: int) -> sp.Expr:
    out = 0
    for term in sp.Poly(sp.expand(poly), z, w).terms():
        (i, j), coeff = term
        if i + j == degree:
            out += coeff * z**i * w**j
    return sp.expand(out)


def gamma_from_palindromic(poly_z: sp.Expr, z: sp.Symbol, degree: int) -> sp.Poly:
    """Solve p(z)=sum g_k z^k(1+z)^(degree-2k)."""
    t = sp.Symbol("t")
    residual = sp.Poly(sp.expand(poly_z), z)
    gamma = 0
    for k in range(degree // 2 + 1):
        coeff = residual.nth(k)
        gamma += coeff * t**k
        residual = sp.Poly(
            sp.expand(residual.as_expr() - coeff * z**k * (1 + z) ** (degree - 2 * k)),
            z,
        )
    assert residual.is_zero
    return sp.Poly(gamma, t)


def nonpositive_real_roots(poly: sp.Poly) -> bool:
    if poly.degree() <= 0:
        return True
    intervals = sp.polys.polytools.intervals(poly, eps=sp.Rational(1, 10**20))
    count = 0
    for (lo, hi), multiplicity in intervals:
        if hi > 0:
            return False
        count += multiplicity
    return count == poly.degree()


def main() -> None:
    z, w = sp.symbols("z w")
    identity_checks = 0
    gamma_checks = 0
    root_checks = 0
    pencil_checks = 0

    # Generic differentiation identity through four spectral variables.
    for n in range(1, 5):
        lambdas = sp.symbols(f"l0:{n}")
        deltas = sp.symbols(f"d0:{n}")
        pz = sp.prod(1 + lambdas[i] * z for i in range(n))
        pw = sp.prod(1 + lambdas[i] * w for i in range(n))
        full = sp.expand(pz * pw)
        direct = sum(deltas[i] * sp.diff(full, lambdas[i]) for i in range(n))
        cleared = 0
        for i in range(n):
            cleared += deltas[i] * (
                z * sp.prod(1 + lambdas[j] * z for j in range(n) if j != i) * pw
                + w * sp.prod(1 + lambdas[j] * w for j in range(n) if j != i) * pz
            )
        assert sp.expand(direct - cleared) == 0
        identity_checks += 1

    rational_spectra = [
        (sp.Rational(1), sp.Rational(2), sp.Rational(5)),
        (sp.Rational(1, 3), sp.Rational(4, 3), sp.Rational(7, 2), sp.Rational(9)),
        (sp.Rational(1, 5), sp.Rational(2, 5), sp.Rational(3), sp.Rational(8), sp.Rational(13)),
    ]
    directions = [
        lambda n: [sp.Rational(i + 1) for i in range(n)],
        lambda n: [sp.Rational((i + 1) ** 2, n + 1) for i in range(n)],
    ]
    pencil_weights = [sp.Rational(1, 7), sp.Rational(1), sp.Rational(11)]

    for spectrum in rational_spectra:
        n = len(spectrum)
        symbols = sp.symbols(f"x0:{n}")
        full_symbolic = sp.prod(1 + symbols[i] * z for i in range(n)) * sp.prod(
            1 + symbols[i] * w for i in range(n)
        )
        substitution = dict(zip(symbols, spectrum))
        full = sp.expand(full_symbolic.subs(substitution))
        ds = []
        for direction_builder in directions:
            direction = direction_builder(n)
            derivative = sum(
                direction[i] * sp.diff(full_symbolic, symbols[i]) for i in range(n)
            ).subs(substitution)
            ds.append(sp.expand(derivative))

        for degree in range(1, 2 * n):
            base_h = homogeneous_part(full, z, w, degree)
            base_g = gamma_from_palindromic(base_h.subs(w, 1), z, degree)
            assert nonpositive_real_roots(base_g)
            root_checks += 1

            derivative_gammas = []
            for derivative in ds:
                dh = homogeneous_part(derivative, z, w, degree)
                dg = gamma_from_palindromic(dh.subs(w, 1), z, degree)
                derivative_gammas.append(dg)
                assert nonpositive_real_roots(dg)
                gamma_checks += 1
                for c in pencil_weights:
                    pencil = sp.Poly(base_g.as_expr() + c * dg.as_expr(), base_g.gens[0])
                    assert nonpositive_real_roots(pencil)
                    pencil_checks += 1

            for c in pencil_weights:
                pencil = sp.Poly(
                    derivative_gammas[0].as_expr() + c * derivative_gammas[1].as_expr(),
                    derivative_gammas[0].gens[0],
                )
                assert nonpositive_real_roots(pencil)
                pencil_checks += 1

    payload = {
        "kind": "spectral_directional_derivative_stability_exact",
        "date": "2026-08-13",
        "status": "PASS_EXACT_SPECTRAL_DIRECTIONAL_DERIVATIVE_STABILITY_REPLAY",
        "scope": "replay of an all-order analytic theorem",
        "generic_identity_checks": identity_checks,
        "gamma_derivative_checks": gamma_checks,
        "root_checks": root_checks,
        "positive_pencil_checks": pencil_checks,
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(json.dumps(payload, indent=2))
    print("source_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
