"""Exact formal identities used by the adjacent-cubic collision proof.

This is deliberately independent of the cached Jacobi formulas.  It verifies the
two characteristic-polynomial eliminations, the short collision cubic, and the
resultant form of the lower-tail square gap.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "tail_collision_topology_identities_exact_20260806.json"


def digest(value: sp.Expr) -> str:
    return hashlib.sha256(sp.srepr(sp.expand(value)).encode("utf-8")).hexdigest()


def main() -> None:
    y = sp.symbols("y")
    a0, a1, a2, b1, b2, d0, d1, f = sp.symbols(
        "a0 a1 a2 b1 b2 d0 d1 f"
    )
    pm, pp, rho2 = sp.symbols("p_m p_previous rho_squared")

    n_a = (y - a1) * (y - a2) - b2
    q_a = (y - a0) * n_a - b1 * (y - a2)
    n_h = y - d1
    q_h = (y - d0) * (y - d1) - f
    collision = sp.expand(n_a * q_h - n_h * q_a)
    delta = a0 - d0
    collision_short = sp.expand(
        n_a * (delta * (y - d1) - f) + b1 * (y - d1) * (y - a2)
    )
    assert sp.expand(collision - collision_short) == 0

    full_a = pm * q_a - rho2 * pp * n_a
    full_h = pm * q_h - rho2 * pp * n_h
    prefix_cross = sp.expand(full_a * n_h - full_h * n_a)
    coupling_cross = sp.expand(full_a * q_h - full_h * q_a)
    assert sp.expand(prefix_cross + pm * collision) == 0
    assert sp.expand(coupling_cross + rho2 * pp * collision) == 0

    trace_b = a1 + a2
    determinant_b = a1 * a2 - b2
    trace_h = d0 + d1
    determinant_h = d0 * d1 - f
    ell = trace_b - trace_h
    em = determinant_h - determinant_b
    discriminant_b = trace_b**2 - 4 * determinant_b
    square_gap = sp.expand(
        ell**2 * discriminant_b - (2 * em + ell * trace_b) ** 2
    )
    resultant_form = sp.expand(
        -4 * (em**2 + ell * em * trace_b + ell**2 * determinant_b)
    )
    assert sp.expand(square_gap - resultant_form) == 0

    resultant_direct = sp.resultant(
        y**2 - trace_b * y + determinant_b,
        y**2 - trace_h * y + determinant_h,
        y,
    )
    assert sp.expand(square_gap + 4 * resultant_direct) == 0

    delta_symbol, q1, q2, g, z_numerator = sp.symbols(
        "delta q1 q2 g z_numerator", nonzero=True
    )
    cholesky_a1 = q1 + g / q1
    cholesky_a2 = q2
    cholesky_b2 = q2 * g / q1
    direct_scaled_characteristic = sp.cancel(
        (z_numerator - delta_symbol * cholesky_a1)
        * (z_numerator - delta_symbol * cholesky_a2)
        - delta_symbol**2 * cholesky_b2
    )
    reduced_scaled_characteristic = sp.cancel(
        (z_numerator - delta_symbol * q1)
        * (z_numerator - delta_symbol * q2)
        - delta_symbol * g * z_numerator / q1
    )
    assert sp.cancel(direct_scaled_characteristic - reduced_scaled_characteristic) == 0
    tail_argument = sp.symbols("tail_argument")
    direct_trailing_characteristic = sp.cancel(
        (tail_argument - cholesky_a1) * (tail_argument - cholesky_a2)
        - cholesky_b2
    )
    reduced_trailing_characteristic = sp.cancel(
        (tail_argument - q1) * (tail_argument - q2) - g * tail_argument / q1
    )
    assert sp.cancel(direct_trailing_characteristic - reduced_trailing_characteristic) == 0
    assert sp.cancel(
        sp.diff(direct_trailing_characteristic, tail_argument)
        - (2 * tail_argument - q1 - q2 - g / q1)
    ) == 0

    report = {
        "status": "PASS_EXACT_TAIL_COLLISION_TOPOLOGY_IDENTITIES",
        "checks": {
            "short_collision_identity": True,
            "common_full_root_prefix_cross_identity": True,
            "common_full_root_coupling_cross_identity": True,
            "square_gap_resultant_identity": True,
            "direct_quadratic_resultant_replay": True,
            "cholesky_scaled_characteristic_cancellation": True,
            "cholesky_trailing_characteristic_cancellation": True,
            "cholesky_trailing_derivative_cancellation": True,
        },
        "digests": {
            "collision_cubic": digest(collision),
            "square_gap": digest(square_gap),
            "quadratic_resultant": digest(resultant_direct),
        },
        "logical_implication": (
            "Because consecutive prefix characteristic polynomials are coprime, "
            "the two cross identities force the collision cubic to vanish at "
            "every common full eigenvalue, including tail-pole cases.  The large "
            "lower square gap is exactly minus four times the quadratic-tail "
            "resultant, and the two Cholesky identities remove the apparent "
            "squared pivot denominators from the ceiling and interval controls.  "
            "Together these give the memory-stable exact calculation."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
