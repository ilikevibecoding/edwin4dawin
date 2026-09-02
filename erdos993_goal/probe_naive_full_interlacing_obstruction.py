"""Exact obstruction to an over-strong arbitrary-factor compatibility cone.

For the quadratic two-positive-root input, the shifted polynomials
G_j=t^j S_{p-2j,alpha+j}[Gamma] need not be compatible for nonadjacent j.
This rejects the naive claim that their whole Hankel grid is fully interlacing;
it does not test the Pólya-frequency constrained convolution actually needed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "naive_full_interlacing_obstruction_exact_20260806.json"


def digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def one_case(p: int, alpha: int, u: sp.Rational, v: sp.Rational) -> dict[str, object]:
    gamma = [sp.Integer(1), -(u + v), u * v]
    shifted = []
    for index in range(3):
        row = window_polynomial(p - 2 * index, alpha + index, gamma)
        shifted.append(sp.Poly(X**index * row.as_expr(), X, domain=sp.QQ))

    witness = sp.Poly(shifted[0].as_expr() + 100 * shifted[2].as_expr(), X)
    real_root_count = int(sp.polys.polytools.count_roots(witness, -sp.oo, sp.oo))
    assert real_root_count == witness.degree() - 2

    block_determinant = sp.factor(
        shifted[0].nth(1) * shifted[2].nth(1) - shifted[1].nth(1) ** 2
    )
    assert block_determinant < 0
    assert all(coefficient >= 0 for poly in shifted for coefficient in poly.all_coeffs())
    return {
        "p": p,
        "alpha": alpha,
        "u": str(u),
        "v": str(v),
        "degrees": [poly.degree() for poly in shifted],
        "degree_one_symmetric_block_determinant": str(block_determinant),
        "witness": "G_0 + 100 G_2",
        "witness_degree": witness.degree(),
        "witness_real_root_count": real_root_count,
        "witness_nonreal_root_count": witness.degree() - real_root_count,
        "digests": [digest(poly) for poly in shifted],
        "witness_digest": digest(witness),
    }


def main() -> None:
    cases = [
        one_case(13, 0, sp.Rational(1, 2), sp.Rational(4, 5)),
        one_case(21, 4, sp.Rational(1, 3), sp.Rational(3, 4)),
    ]
    report = {
        "status": "EXACT_OBSTRUCTION_NAIVE_FULL_INTERLACING",
        "cases": cases,
        "logical_implication": (
            "The nonadjacent shifted rows G_0 and G_2 are not compatible, so a "
            "proof for arbitrary appended factors cannot enlarge the coefficient "
            "domain to the whole nonnegative orthant.  It must retain the "
            "Pólya-frequency constraints satisfied by products of (t+c_i)."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
