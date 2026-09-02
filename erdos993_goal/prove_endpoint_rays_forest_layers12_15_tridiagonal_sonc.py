"""Exact tridiagonal SONC certificates for forest endpoint layers 12--15.

This is a fixed-layer, all-parameter computation.  It does not infer the
same coefficient signs in uncomputed layers.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

import prove_endpoint_rays_forest_low_layers as base


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_rays_forest_layers12_15_tridiagonal_sonc_exact_20260813.json"
CTX4 = fmpq_mpoly_ctx.get(("t", "c", "q", "u"), "lex")
CTX2 = fmpq_mpoly_ctx.get(("q", "u"), "lex")
ONE = CTX2.from_dict({(0, 0): fmpq(1)})


def to_flint(expr: sp.Expr):
    poly = sp.Poly(expr, base.t, base.c, base.q, base.u)
    return CTX4.from_dict({
        monomial: fmpq(int(value.p), int(value.q))
        for monomial, value in poly.terms()
    })


def c_block(data: dict[tuple[int, ...], object], exponent: int):
    return CTX2.from_dict({
        (monomial[2], monomial[3]): value
        for monomial, value in data.items()
        if monomial[1] == exponent
    })


def negative_part(poly):
    return CTX2.from_dict({
        monomial: -value
        for monomial, value in poly.to_dict().items()
        if value < 0
    })


def digest(poly) -> str:
    return hashlib.sha256(
        "\n".join(
            f"{monomial}:{value}"
            for monomial, value in sorted(poly.to_dict().items(), reverse=True)
        ).encode("ascii")
    ).hexdigest().upper()


def positive_record(poly) -> dict[str, object]:
    data = poly.to_dict()
    assert data and all(value > 0 for value in data.values())
    return {
        "positive_terms": len(data),
        "coefficient_sha256": digest(poly),
    }


def layer_certificate(s: int) -> dict[str, object]:
    E, F, G = base.rays(s)

    ef = to_flint(sp.expand(E + base.c * F)).discriminant("t")
    ef_record = positive_record(ef)
    print(f"s={s}: E+cF has {ef_record['positive_terms']} positive terms", flush=True)

    fg = to_flint(sp.expand(F + base.c * G)).discriminant("t")
    data = fg.to_dict()
    negative = [(monomial, value) for monomial, value in data.items() if value < 0]
    assert negative
    negative_exponents = sorted({int(monomial[1]) for monomial, _ in negative})
    assert negative_exponents == list(
        range(negative_exponents[0], negative_exponents[-1] + 1, 2)
    )
    assert all(exponent % 2 == 1 for exponent in negative_exponents)
    assert all(value > 0 or int(monomial[1]) in negative_exponents
               for monomial, value in data.items())

    first_even = negative_exponents[0] - 1
    last_even = negative_exponents[-1] + 1
    even_exponents = list(range(first_even, last_even + 1, 2))
    diagonals = [c_block(data, exponent) for exponent in even_exponents]
    off_diagonals = [negative_part(c_block(data, exponent))
                     for exponent in negative_exponents]
    diagonal_records = [positive_record(poly) for poly in diagonals]
    assert all(poly.to_dict() for poly in off_diagonals)

    # Q has diagonal A_j and off-diagonal -N_j/2.  The determinant K_j of
    # its leading (j+1)-by-(j+1) block obeys
    # K_j=A_j*K_(j-1)-N_(j-1)^2*K_(j-2)/4.
    continuants = [diagonals[0]]
    for index in range(1, len(diagonals)):
        two_back = continuants[index - 2] if index >= 2 else ONE
        continuants.append(
            diagonals[index] * continuants[index - 1]
            - off_diagonals[index - 1] ** 2 * two_back / 4
        )
    continuant_records = [positive_record(poly) for poly in continuants]

    print(
        f"s={s}: F+cG has {len(data)} terms, {len(negative)} negative; "
        f"negative c-blocks={negative_exponents}; continuants="
        f"{[record['positive_terms'] for record in continuant_records]}",
        flush=True,
    )

    return {
        "s": s,
        "substitution": f"N={2 * s + 5}+q",
        "core_degree": int(sp.degree(E + base.c * F, base.t)),
        "E_plus_cF": ef_record,
        "F_plus_cG": {
            "discriminant_terms": len(data),
            "negative_terms": len(negative),
            "negative_c_blocks": negative_exponents,
            "negative_terms_by_c_block": {
                str(exponent): sum(
                    value < 0 and int(monomial[1]) == exponent
                    for monomial, value in data.items()
                )
                for exponent in negative_exponents
            },
            "gram_even_c_blocks": even_exponents,
            "gram_diagonal_blocks": diagonal_records,
            "gram_off_diagonal_terms": [
                len(poly.to_dict()) for poly in off_diagonals
            ],
            "leading_continuants": continuant_records,
        },
    }


def main() -> None:
    layers = [layer_certificate(s) for s in range(12, 16)]
    payload = {
        "status": "PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYERS12_15_TRIDIAGONAL_SONC",
        "parameter_domain": "q,c,u>=0",
        "layers": layers,
        "theorem": (
            "For every integer 12<=s<=15, N=2s+5+q, and q,c,u>=0, "
            "both endpoint pencils E+cF and F+cG are negative-rooted."
        ),
        "proof_scope": (
            "Each E+cF discriminant is an exact coefficientwise-positive "
            "polynomial in (c,q,u). For F+cG, every negative coefficient is "
            "in the listed odd c-blocks and every exact leading continuant "
            "of the displayed tridiagonal Gram matrix is coefficientwise "
            "positive in (q,u). This is an all-parameter theorem only in the "
            "four listed layers, not an induction or an all-order inference."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
