"""Exact replay for the finite-free block-to-diagonal propagation audit.

The odd path-block theorem gives a directed proper-position comparison after
convolution with any *fixed* one-sign factor.  This replay verifies an exact
degree-four counterexample to the formally stronger assertion obtained by
changing the factor and its reciprocal simultaneously.

It does not contradict the path theorem.  It shows that a further
path-specific diagonal lemma is logically necessary.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "block_to_diagonal_propagation_exact_20260810.json"


x, z, t, c = sp.symbols("x z t c")


def root_polynomial(roots: tuple[int, ...]) -> sp.Poly:
    """Constant-one polynomial with the displayed positive roots."""
    return sp.Poly(sp.prod(1 - x / sp.Rational(r) for r in roots), x)


def normalized_reverse(p: sp.Poly) -> sp.Poly:
    """p^vee=x^s p(1/x)/lc(p), again normalized to constant one."""
    s = p.degree()
    return sp.Poly(sp.expand(x**s * p.as_expr().subs(x, 1 / x) / p.LC()), x)


def finite_multiplicative_convolution(p: sp.Poly, q: sp.Poly) -> sp.Poly:
    """Normalized degree-s multiplicative convolution in binomial basis."""
    assert p.degree() == q.degree()
    s = p.degree()
    p_bin = [(-1) ** i * p.nth(i) / sp.binomial(s, i) for i in range(s + 1)]
    q_bin = [(-1) ** i * q.nth(i) / sp.binomial(s, i) for i in range(s + 1)]
    return sp.Poly(
        sum(
            (-1) ** i * sp.binomial(s, i) * p_bin[i] * q_bin[i] * x**i
            for i in range(s + 1)
        ),
        x,
        domain=sp.QQ,
    )


def gamma_transform_of_diagonal(d: sp.Poly) -> sp.Poly:
    """Gamma transform of A(z)=d(-z), where d is self-reciprocal."""
    s = d.degree()
    a = sp.Poly(d.as_expr().subs(x, -z), z, domain=sp.QQ)
    residual = [a.nth(i) for i in range(s + 1)]
    gamma: list[sp.Rational] = []
    for h in range(s // 2 + 1):
        gh = residual[h]
        gamma.append(gh)
        for j in range(s - 2 * h + 1):
            residual[h + j] -= gh * sp.binomial(s - 2 * h, j)
    assert all(value == 0 for value in residual)
    g = sp.Poly(sum(gamma[h] * t**h for h in range(len(gamma))), t, domain=sp.QQ)
    reconstructed = sp.cancel(
        (1 + z) ** s * g.as_expr().subs(t, z / (1 + z) ** 2)
    )
    assert sp.Poly(reconstructed - a.as_expr(), z, domain=sp.QQ).is_zero
    return g


def exact_root_intervals(p: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    intervals = p.intervals(eps=sp.Rational(1, 10**30))
    assert len(intervals) == p.degree()
    assert all(mult == 1 for _, mult in intervals)
    return [interval for interval, _ in intervals]


def strictly_precedes(p: sp.Poly, q: sp.Poly) -> bool:
    """Check p_1<q_1<...<p_s<q_s using exact rational isolators."""
    assert p.degree() == q.degree()
    tagged = [(iv, "p") for iv in exact_root_intervals(p)]
    tagged += [(iv, "q") for iv in exact_root_intervals(q)]
    tagged.sort(key=lambda item: item[0][0])
    if any(left[0][1] >= right[0][0] for left, right in zip(tagged, tagged[1:])):
        return False
    return [tag for _, tag in tagged] == [
        tag for _ in range(p.degree()) for tag in ("p", "q")
    ]


def main() -> None:
    p_roots = (1, 3, 5, 7)
    q_roots = (2, 4, 6, 14)
    assert [entry for pair in zip(p_roots, q_roots) for entry in pair] == [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        14,
    ]

    p = root_polynomial(p_roots)
    q = root_polynomial(q_roots)
    p_rev = normalized_reverse(p)
    q_rev = normalized_reverse(q)

    d_pp = finite_multiplicative_convolution(p, p_rev)
    d_qp = finite_multiplicative_convolution(q, p_rev)
    d_pq = finite_multiplicative_convolution(p, q_rev)
    d_qq = finite_multiplicative_convolution(q, q_rev)

    # The two fixed-factor comparisons have the expected strict direction.
    assert strictly_precedes(d_pp, d_qp)
    assert strictly_precedes(d_pq, d_qq)

    # Reciprocal reflection supplies the opposite two bracket inequalities.
    assert normalized_reverse(d_qp) == d_pq
    assert normalized_reverse(d_pp) == d_pp
    assert normalized_reverse(d_qq) == d_qq
    assert strictly_precedes(d_pq, d_pp)
    assert strictly_precedes(d_qq, d_qp)

    # Nevertheless the simultaneous self-dual diagonals do not alternate.
    assert not strictly_precedes(d_pp, d_qq)
    assert not strictly_precedes(d_qq, d_pp)

    g_p = gamma_transform_of_diagonal(d_pp)
    g_q = gamma_transform_of_diagonal(d_qq)
    expected_g_p = sp.Poly(1 + sp.Rational(284, 105) * t + sp.Rational(104, 315) * t**2, t)
    expected_g_q = sp.Poly(1 + sp.Rational(407, 168) * t + sp.Rational(19, 63) * t**2, t)
    assert g_p == expected_g_p
    assert g_q == expected_g_q
    assert sp.discriminant(g_p.as_expr(), t) > 0
    assert sp.discriminant(g_q.as_expr(), t) > 0

    pencil_discriminant = sp.factor(sp.discriminant(g_p.as_expr() - c * g_q.as_expr(), t))
    expected_discriminant = (
        1096675 * c**2 - 2488000 * c + 1410048
    ) / sp.Integer(235200)
    assert sp.factor(pencil_discriminant - expected_discriminant) == 0
    c0 = sp.Rational(49760, 43867)
    negative_value = sp.factor(pencil_discriminant.subs(c, c0))
    assert negative_value == -sp.Rational(14944, 3290025)

    report = {
        "status": "PASS_EXACT_BLOCK_TO_DIAGONAL_PROPAGATION_COUNTEREXAMPLE",
        "degree": 4,
        "input_roots": {"P": list(p_roots), "Q": list(q_roots)},
        "directed_input_order": "1<2<3<4<5<6<7<14",
        "fixed_factor_strict_proper_positions": [
            "P box P^vee precedes Q box P^vee",
            "P box Q^vee precedes Q box Q^vee",
        ],
        "reciprocal_bracket": [
            "P box Q^vee precedes P box P^vee precedes Q box P^vee",
            "P box Q^vee precedes Q box Q^vee precedes Q box P^vee",
        ],
        "diagonal_gamma_polynomials": {
            "Gamma(P box P^vee)": str(g_p.as_expr()),
            "Gamma(Q box Q^vee)": str(g_q.as_expr()),
        },
        "signed_pencil_discriminant": str(pencil_discriminant),
        "positive_witness_c": str(c0),
        "negative_discriminant_at_witness": str(negative_value),
        "logical_conclusion": (
            "Strict directed proper position survives each fixed-factor convolution, "
            "but it does not formally survive the simultaneous self-dual diagonal map "
            "P -> P box P^vee.  A path-specific diagonal lemma is still required."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"c={c0} discriminant={negative_value}")
    print(REPORT.name)


if __name__ == "__main__":
    main()
