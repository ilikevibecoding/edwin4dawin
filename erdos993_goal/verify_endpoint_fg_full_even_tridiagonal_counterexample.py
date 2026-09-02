"""Exact no-go for the full-even-block F+cG tridiagonal certificate.

This refutes only the particular Gram construction from
ENDPOINT_DISCRIMINANT_TRIDIAGONAL_SONC_REDUCTION_2026-08-13.md.  It does not
refute positivity of the discriminant or real-rootedness of F+cG.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx

import probe_endpoint_rays_forest_s16plus_tridiagonal_sonc as base


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_fg_full_even_tridiagonal_counterexample_exact_20260813.json"
CTX_TC = fmpq_mpoly_ctx.get(("t", "c"), "lex")


def specialize_q_u(poly, q_value: int, u_value: int):
    data = {}
    for monomial, coefficient in poly.to_dict().items():
        key = (monomial[0], monomial[1])
        value = coefficient * q_value**monomial[2] * u_value**monomial[3]
        data[key] = data.get(key, fmpq(0)) + value
    return CTX_TC.from_dict(data)


def rational_record(value) -> dict[str, object]:
    text = str(value)
    numerator, separator, denominator = text.partition("/")
    if not separator:
        denominator = "1"
    return {
        "sign": 1 if value > 0 else -1 if value < 0 else 0,
        "numerator_decimal_digits": len(numerator.lstrip("-")),
        "denominator_decimal_digits": len(denominator),
        "exact_value_sha256": hashlib.sha256(text.encode("ascii")).hexdigest().upper(),
    }


def main() -> None:
    # This is the first layer found by the recorded increasing-layer search.
    # The one-cell replay itself makes no minimality assertion over all q,u.
    s, q_value, u_value = 27, 10724, 1
    pencil = specialize_q_u(base.endpoint_fg(s), q_value, u_value)
    discriminant = pencil.discriminant("t")
    coefficients = {
        int(monomial[1]): coefficient
        for monomial, coefficient in discriminant.to_dict().items()
    }

    negative_odd_blocks = sorted(
        exponent for exponent, coefficient in coefficients.items()
        if coefficient < 0
    )
    assert negative_odd_blocks
    assert all(exponent % 2 == 1 for exponent in negative_odd_blocks)
    assert negative_odd_blocks == list(range(
        negative_odd_blocks[0], negative_odd_blocks[-1] + 1, 2
    ))

    even_blocks = list(range(
        negative_odd_blocks[0] - 1,
        negative_odd_blocks[-1] + 2,
        2,
    ))
    diagonals = [coefficients[exponent] for exponent in even_blocks]
    off_diagonal_magnitudes = [
        -coefficients[exponent] for exponent in negative_odd_blocks
    ]
    assert all(value > 0 for value in diagonals)
    assert all(value > 0 for value in off_diagonal_magnitudes)

    # These are the leading determinants of the scalar tridiagonal matrix
    # with full evaluated even blocks on the diagonal and the negative full
    # evaluated odd blocks (rather than their larger negative parts) off it.
    continuants = [diagonals[0]]
    for index in range(1, len(diagonals)):
        two_back = continuants[index - 2] if index >= 2 else fmpq(1)
        continuants.append(
            diagonals[index] * continuants[index - 1]
            - off_diagonal_magnitudes[index - 1] ** 2 * two_back / 4
        )
    signs = [1 if value > 0 else -1 if value < 0 else 0
             for value in continuants]
    assert signs[:-1] == [1] * (len(signs) - 1)
    assert signs[-1] == -1

    # The penultimate leading block is a positive-definite irreducible
    # Stieltjes matrix.  Its inverse is entrywise positive.  Therefore the
    # negative final Schur complement has a strictly positive witness vector.
    # In the coefficientwise split, each negative-part polynomial N_j(q,u)
    # is at least the magnitude of the full negative evaluated odd block:
    # N_j(q,u) >= -[c^(2j+1)]Disc.  Replacing the off-diagonals by -N_j/2
    # makes the quadratic form no larger on that positive witness.  Hence the
    # original full-even-block Gram matrix is not positive semidefinite here.
    schur_complement = continuants[-1] / continuants[-2]
    assert schur_complement < 0

    payload = {
        "status": "PASS_EXACT_COUNTEREXAMPLE_TO_FULL_EVEN_TRIDIAGONAL_CERTIFICATE",
        "pencil": "F+cG",
        "unaffected_pencil": "E+cF (not tested and not implicated)",
        "s": s,
        "N": 2 * s + 5 + q_value,
        "q": q_value,
        "u": u_value,
        "core_degree": int(pencil.degrees()[0]),
        "discriminant_c_degree": max(coefficients),
        "negative_full_odd_c_blocks": negative_odd_blocks,
        "adjacent_full_even_c_blocks": even_blocks,
        "scalar_leading_continuant_signs": signs,
        "final_scalar_continuant": rational_record(continuants[-1]),
        "final_scalar_schur_complement": rational_record(schur_complement),
        "conclusion": (
            "At this exact positive parameter point, even the tridiagonal "
            "matrix using the smaller magnitudes of the full negative odd "
            "blocks has a negative final Schur complement after positive "
            "earlier leading minors. Its positive Schur witness remains "
            "negative for the coefficientwise-negative-part Gram matrix, "
            "whose off-diagonal magnitudes are only larger. Thus the "
            "full-even-block tridiagonal Gram matrix is not PSD and its "
            "leading continuants cannot all be coefficientwise nonnegative "
            "for arbitrary s."
        ),
        "scope": (
            "This refutes only the full-even-block tridiagonal SONC target "
            "for F+cG. It is not a counterexample to discriminant positivity, "
            "negative-rootedness, another Gram allocation, or E+cF. The "
            "claim that s=27 is first is only relative to the recorded search, "
            "not a proof of minimality over the continuous q,u cone."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
