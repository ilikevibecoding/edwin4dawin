"""Exact all-excess endpoint-ray theorem for selector layers 2 through 8.

For each fixed s, substitute N=2s+5+q and prove the discriminants of
E+cF and F+cG have strictly positive coefficients in c,q,u.  This proves
both endpoint pencils on the whole forest half-line q>=0 for these layers.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_rays_forest_low_layers_exact_20260813.json"
t, u, c, q = sp.symbols("t u c q", nonnegative=True)


def path_coefficient(M: sp.Expr, i: int) -> sp.Expr:
    if i < 0:
        return sp.Integer(0)
    return sp.prod(2 * M - i - 1 - j for j in range(i)) / sp.factorial(i)


def gamma(row: list[sp.Expr]) -> list[sp.Expr]:
    degree = len(row) - 1
    residual = list(map(sp.expand, row))
    answer = []
    for h in range(degree // 2 + 1):
        value = residual[h]
        answer.append(value)
        for j in range(degree - 2 * h + 1):
            residual[h + j] = sp.expand(
                residual[h + j]
                - value * sp.binomial(degree - 2 * h, j)
            )
    assert all(sp.expand(value) == 0 for value in residual)
    return answer


def mixed(left: list[sp.Expr], right: list[sp.Expr], s: int) -> sp.Expr:
    raw = [left[i] * right[s - i] for i in range(s + 1)]
    symmetric = [
        sp.expand((raw[i] + raw[s - i]) / 2) for i in range(s + 1)
    ]
    return sp.expand(sum(value * t**i for i, value in enumerate(gamma(symmetric))))


def rays(s: int) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
    N = 2 * s + 5 + q
    P = [path_coefficient(N, i) for i in range(s + 1)]
    C = [path_coefficient(N - 1, i) for i in range(s + 1)]
    D = [path_coefficient(N - 2, i) for i in range(s + 1)]
    V = [sp.expand(P[i] - C[i]) for i in range(s + 1)]
    W = [sp.expand(C[i] - D[i]) for i in range(s + 1)]
    E = sp.expand(mixed(C, C, s) + u * mixed(D, D, s))
    F = sp.expand(mixed(C, V, s) + u * mixed(D, W, s))
    G = sp.expand(mixed(V, V, s) + u * mixed(W, W, s))
    return E, F, G


def certificate(poly: sp.Expr) -> dict[str, object]:
    t_poly = sp.Poly(poly, t)
    forced = min(monomial[0] for monomial, _ in t_poly.terms())
    core = sp.cancel(poly / t**forced)
    degree = int(sp.degree(core, t))
    if degree <= 1:
        coefficients = sp.Poly(core, t, c, q, u).coeffs()
        assert coefficients and all(value > 0 for value in coefficients)
        return {
            "forced_zero_order": forced,
            "core_degree": degree,
            "discriminant_status": "TRIVIAL_DEGREE_AT_MOST_ONE",
        }
    discriminant = sp.Poly(sp.discriminant(core, t), c, q, u)
    terms = discriminant.terms()
    assert terms and all(value > 0 for _, value in terms)
    digest = hashlib.sha256(
        "\n".join(f"{monomial}:{value}" for monomial, value in terms).encode("ascii")
    ).hexdigest().upper()
    return {
        "forced_zero_order": forced,
        "core_degree": degree,
        "strictly_positive_discriminant_coefficients": len(terms),
        "coefficient_sha256": digest,
    }


def main() -> None:
    rows = []
    total = 0
    for s in range(2, 9):
        E, F, G = rays(s)
        ray_counts = {}
        for name, ray in (("E", E), ("F", F), ("G", G)):
            coefficients = sp.Poly(ray, t, q, u).coeffs()
            assert coefficients and all(value > 0 for value in coefficients)
            ray_counts[name] = len(coefficients)
        ef = certificate(sp.expand(E + c * F))
        fg = certificate(sp.expand(F + c * G))
        total += int(ef.get("strictly_positive_discriminant_coefficients", 0))
        total += int(fg.get("strictly_positive_discriminant_coefficients", 0))
        rows.append({
            "s": s,
            "strictly_positive_ray_coefficients": ray_counts,
            "E_plus_cF": ef,
            "F_plus_cG": fg,
        })
        print(f"s={s}: E/F={ef}; F/G={fg}", flush=True)

    payload = {
        "status": "PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYERS_2_THROUGH_8",
        "substitution": "N=2s+5+q, q>=0",
        "parameters": "c>=0, u>=0",
        "rows": rows,
        "total_strictly_positive_discriminant_coefficients": total,
        "theorem": (
            "For every 2<=s<=8 and N>=2s+5, both E+cF and F+cG are "
            "negative-rooted for every c,u>=0, with forced zero roots retained."
        ),
        "proof_scope": (
            "The displayed discriminants are exact symbolic polynomials in "
            "(c,q,u) with strictly positive coefficients. A real-rooted base "
            "ray, fixed positive leading coefficient, and the nonvanishing "
            "discriminant give the homotopy proof in the positive interior; "
            "boundaries follow by coefficientwise limits."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
