"""Exact layer-ten endpoint discriminants and adjacent-block AM-GM repair."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

import prove_endpoint_rays_forest_low_layers as base


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_rays_forest_layer10_amgm_exact_20260813.json"


def digest(poly: sp.Poly) -> str:
    return hashlib.sha256(
        "\n".join(f"{m}:{v}" for m, v in poly.terms()).encode("ascii")
    ).hexdigest().upper()


CTX4 = fmpq_mpoly_ctx.get(("t", "c", "q", "u"), "lex")
CTX2 = fmpq_mpoly_ctx.get(("q", "u"), "lex")


def to_flint(expr: sp.Expr):
    """Convert an exact SymPy expression to FLINT without string parsing."""
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


def flint_digest(poly) -> str:
    return hashlib.sha256(
        "\n".join(
            f"{monomial}:{value}"
            for monomial, value in sorted(poly.to_dict().items(), reverse=True)
        ).encode("ascii")
    ).hexdigest().upper()


def main() -> None:
    s = 10
    E, F, G = base.rays(s)
    print("built rays", flush=True)

    # Multivariate FLINT computes these exact resultants in seconds; the former
    # SymPy route could spend hours in generic-expression simplification.
    ef_data = to_flint(sp.expand(E + base.c * F)).discriminant("t").to_dict()
    ef_negative = [(m, v) for m, v in ef_data.items() if v < 0]
    assert not ef_negative
    assert all(v > 0 for v in ef_data.values())
    print(f"E/F discriminant: {len(ef_data)} positive terms", flush=True)

    fg_poly = to_flint(sp.expand(F + base.c * G)).discriminant("t")
    fg_data = fg_poly.to_dict()
    negative = [(m, v) for m, v in fg_data.items() if v < 0]
    assert len(negative) == 221
    assert {m[1] for m, _ in negative} == {7}
    assert all(v > 0 or m[1] == 7 for m, v in fg_data.items())
    print(f"F/G discriminant: {len(fg_data)} terms, {len(negative)} negative", flush=True)

    D6, D7, D8 = (c_block(fg_data, k) for k in (6, 7, 8))
    assert all(v > 0 for v in D6.to_dict().values())
    assert all(v > 0 for v in D8.to_dict().values())
    negative_part = CTX2.from_dict({m: -v for m, v in D7.to_dict().items() if v < 0})
    positive_part = CTX2.from_dict({m: v for m, v in D7.to_dict().items() if v > 0})
    margin = 4 * D6 * D8 - negative_part * negative_part
    margin_negative = [(m, v) for m, v in margin.to_dict().items() if v < 0]
    assert not margin_negative
    assert all(v > 0 for v in margin.to_dict().values())
    print(f"AM-GM margin: {len(margin.to_dict())} positive terms", flush=True)

    payload = {
        "status": "PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYER10_AMGM_REPAIR",
        "substitution": "s=10, N=25+q, q>=0",
        "E_plus_cF": {
            "core_degree": 5,
            "strictly_positive_discriminant_coefficients": len(ef_data),
            "coefficient_sha256": flint_digest(CTX4.from_dict(ef_data)),
        },
        "F_plus_cG": {
            "core_degree": 5,
            "discriminant_terms": len(fg_data),
            "negative_terms": len(negative),
            "negative_terms_all_have_c_exponent": 7,
            "D6_positive_terms": len(D6.to_dict()),
            "D7_positive_terms": len(positive_part.to_dict()),
            "D7_negative_terms": len(negative_part.to_dict()),
            "D8_positive_terms": len(D8.to_dict()),
            "squared_margin_positive_terms": len(margin.to_dict()),
            "squared_margin_sha256": flint_digest(margin),
            "am_gm_argument": (
                "Writing the sole negative block as -c^7*N(q,u), the "
                "coefficientwise inequality 4*D6*D8-N^2>0 implies "
                "c^6*D6+c^8*D8>c^7*N by AM-GM."
            ),
        },
        "theorem": (
            "At forest layer s=10, both E+cF and F+cG are negative-rooted "
            "for every q,c,u>=0."
        ),
        "homotopy": (
            "Section 75 makes E and G negative-rooted. In the positive "
            "parameter interior, the strictly positive discriminants and "
            "fixed positive leading coefficients prevent collisions and "
            "degree loss along c from E for E+cF and along c from the "
            "scaled limit G for F+cG. Positive coefficients force every "
            "nonzero real root to be negative; boundary parameters follow "
            "by coefficientwise limits and closure of real-rootedness."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
