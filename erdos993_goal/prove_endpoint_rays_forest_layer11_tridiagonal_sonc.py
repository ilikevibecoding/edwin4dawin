"""Exact tridiagonal SONC certificate for forest endpoint layer eleven."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

import prove_endpoint_rays_forest_low_layers as base


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_rays_forest_layer11_tridiagonal_sonc_exact_20260813.json"
CTX4 = fmpq_mpoly_ctx.get(("t", "c", "q", "u"), "lex")
CTX2 = fmpq_mpoly_ctx.get(("q", "u"), "lex")


def to_flint(expr: sp.Expr):
    poly = sp.Poly(expr, base.t, base.c, base.q, base.u)
    return CTX4.from_dict({
        m: fmpq(int(v.p), int(v.q)) for m, v in poly.terms()
    })


def block(data, k: int):
    return CTX2.from_dict({
        (m[2], m[3]): v for m, v in data.items() if m[1] == k
    })


def negative_part(poly):
    return CTX2.from_dict({m: -v for m, v in poly.to_dict().items() if v < 0})


def digest(poly) -> str:
    return hashlib.sha256(
        "\n".join(
            f"{m}:{v}" for m, v in sorted(poly.to_dict().items(), reverse=True)
        ).encode("ascii")
    ).hexdigest().upper()


def positive_record(poly) -> dict[str, object]:
    data = poly.to_dict()
    assert data and all(v > 0 for v in data.values())
    return {"positive_terms": len(data), "coefficient_sha256": digest(poly)}


def main() -> None:
    E, F, G = base.rays(11)
    ef = to_flint(sp.expand(E + base.c * F)).discriminant("t")
    ef_record = positive_record(ef)

    fg = to_flint(sp.expand(F + base.c * G)).discriminant("t")
    data = fg.to_dict()
    negative = [(m, v) for m, v in data.items() if v < 0]
    assert len(data) == 4941
    assert len(negative) == 649
    assert {m[1] for m, _ in negative} == {5, 7}

    D4, D5, D6, D7, D8 = (block(data, k) for k in range(4, 9))
    N5, N7 = negative_part(D5), negative_part(D7)
    assert len(N5.to_dict()) == 151
    assert len(N7.to_dict()) == 498
    assert all(v > 0 for v in D4.to_dict().values())
    assert all(v > 0 for v in D6.to_dict().values())
    assert all(v > 0 for v in D8.to_dict().values())

    minor2 = 4 * D4 * D6 - N5 * N5
    minor3 = 4 * D4 * D6 * D8 - D4 * N7 * N7 - D8 * N5 * N5
    minor2_record = positive_record(minor2)
    minor3_record = positive_record(minor3)
    assert minor2_record["positive_terms"] == 2057
    assert minor3_record["positive_terms"] == 4525

    payload = {
        "status": "PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYER11_TRIDIAGONAL_SONC",
        "substitution": "s=11, N=27+q, q>=0",
        "E_plus_cF": {
            "core_degree": 5,
            "strictly_positive_discriminant_coefficients": ef_record["positive_terms"],
            "coefficient_sha256": ef_record["coefficient_sha256"],
        },
        "F_plus_cG": {
            "core_degree": 5,
            "discriminant_terms": len(data),
            "negative_terms": len(negative),
            "negative_blocks": {"c^5": len(N5.to_dict()), "c^7": len(N7.to_dict())},
            "tail_diagonal_terms": {
                "D4": len(D4.to_dict()), "D6": len(D6.to_dict()), "D8": len(D8.to_dict())
            },
            "leading_minor_2": minor2_record,
            "leading_minor_3": minor3_record,
            "sonc_argument": (
                "The c^4 through c^8 tail equals a coefficientwise-positive "
                "residual plus x^T Q x for x=(c^2,c^3,c^4), diagonal "
                "Q=(D4,D6,D8), and off-diagonals (-N5/2,-N7/2). The two "
                "cleared leading principal minors are coefficientwise strictly "
                "positive, so Q is positive definite for q,u>0."
            ),
        },
        "theorem": (
            "At forest layer s=11, both E+cF and F+cG are negative-rooted "
            "for every q,c,u>=0 by the tridiagonal discriminant certificate "
            "and the rooted-endpoint homotopy."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
