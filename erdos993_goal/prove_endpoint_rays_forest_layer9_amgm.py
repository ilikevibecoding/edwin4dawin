"""Exact AM-GM repair of the first forest-layer endpoint discriminant block."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import prove_endpoint_rays_forest_low_layers as base


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_rays_forest_layer9_amgm_exact_20260813.json"


def digest(poly: sp.Poly) -> str:
    return hashlib.sha256(
        "\n".join(f"{monomial}:{value}" for monomial, value in poly.terms()).encode("ascii")
    ).hexdigest().upper()


def main() -> None:
    s = 9
    E, F, G = base.rays(s)

    ef = sp.Poly(sp.discriminant(sp.expand(E + base.c * F), base.t),
                 base.c, base.q, base.u)
    assert ef.terms() and all(value > 0 for _, value in ef.terms())

    fg_expr = sp.discriminant(sp.expand(F + base.c * G), base.t)
    fg = sp.Poly(fg_expr, base.c, base.q, base.u)
    negative = [(monomial, value) for monomial, value in fg.terms() if value < 0]
    assert len(negative) == 144
    assert {monomial[0] for monomial, _ in negative} == {5}
    assert all(value > 0 or monomial[0] == 5 for monomial, value in fg.terms())

    by_c = sp.Poly(fg_expr, base.c)
    D4 = sp.Poly(by_c.coeff_monomial(base.c**4), base.q, base.u)
    D5 = sp.Poly(by_c.coeff_monomial(base.c**5), base.q, base.u)
    D6 = sp.Poly(by_c.coeff_monomial(base.c**6), base.q, base.u)
    assert all(value > 0 for _, value in D4.terms())
    assert all(value > 0 for _, value in D6.terms())

    negative_part = sp.Poly(sum(
        (-value) * base.q**monomial[0] * base.u**monomial[1]
        for monomial, value in D5.terms() if value < 0
    ), base.q, base.u)
    positive_part = sp.Poly(sum(
        value * base.q**monomial[0] * base.u**monomial[1]
        for monomial, value in D5.terms() if value > 0
    ), base.q, base.u)
    assert len(negative_part.terms()) == 144
    assert len(positive_part.terms()) == 115

    squared_margin = sp.Poly(
        4 * D4.as_expr() * D6.as_expr() - negative_part.as_expr() ** 2,
        base.q, base.u,
    )
    assert len(squared_margin.terms()) == 949
    assert all(value > 0 for _, value in squared_margin.terms())

    payload = {
        "status": "PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYER9_AMGM_REPAIR",
        "substitution": "s=9, N=23+q, q>=0",
        "E_plus_cF": {
            "core_degree": 4,
            "strictly_positive_discriminant_coefficients": len(ef.terms()),
            "coefficient_sha256": digest(ef),
        },
        "F_plus_cG": {
            "core_degree": 4,
            "discriminant_terms": len(fg.terms()),
            "negative_terms": len(negative),
            "negative_terms_all_have_c_exponent": 5,
            "D4_positive_terms": len(D4.terms()),
            "D5_positive_terms": len(positive_part.terms()),
            "D5_negative_terms": len(negative_part.terms()),
            "D6_positive_terms": len(D6.terms()),
            "squared_margin_positive_terms": len(squared_margin.terms()),
            "squared_margin_sha256": digest(squared_margin),
            "am_gm_argument": (
                "Write the only negative block as -c^5*N(q,u). The c^4 and "
                "c^6 blocks D4,D6 are coefficientwise positive and "
                "4*D4*D6-N^2 is coefficientwise strictly positive. Hence "
                "c^4*D4+c^6*D6 >= 2*c^5*sqrt(D4*D6) > c^5*N; all remaining "
                "discriminant terms are positive."
            ),
        },
        "theorem": (
            "At forest layer s=9, both E+cF and F+cG are negative-rooted "
            "for every q,c,u>=0. Together with the prior package, the exact "
            "endpoint square is closed for every 2<=s<=9."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
