#!/usr/bin/env python3
"""Exact audit of the phase/modulus consequence of the radial envelope.

At a proposed nonreal target-circle crossing, the mesh-interval envelope
replaces the positive-root factor by

    A_s(z) = (z-s)/(z+L).

If Q(z)=z^2-Sz+D is the reachable exceptional quadratic and

    W(z) = Q(z-1)/((z+L)Q(z)),

then phase matching says F_s=(z-s)W is positive real.  The proof below
eliminates s and converts the necessary inequality F_s<1 into one explicit
polynomial inequality E<0.  Therefore E>=0 at every reachable phase-matched
point would close the nonreal crossing mechanism.

This is an exact reduction, not a proof that E is nonnegative on the
reachable locus.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_radial_envelope_phase_modulus_reduction_exact_20260809.json"


def main() -> None:
    X, Y, L, S, D, R = sp.symbols("X Y L S D R", real=True)

    q_real = X**2 - Y**2 - S * X + D
    q_imag = Y * (2 * X - S)
    qm_real = (X - 1) ** 2 - Y**2 - S * (X - 1) + D
    qm_imag = Y * (2 * (X - 1) - S)

    denominator_real = (X + L) * q_real - Y * q_imag
    denominator_imag = (X + L) * q_imag + Y * q_real
    denominator = sp.expand(denominator_real**2 + denominator_imag**2)
    w_real_numerator = sp.expand(
        qm_real * denominator_real + qm_imag * denominator_imag
    )
    w_imag_numerator = sp.expand(
        qm_imag * denominator_real - qm_real * denominator_imag
    )
    w_abs_squared_numerator = sp.expand(qm_real**2 + qm_imag**2)

    # Im(W)+Y|W|^2 has this numerator.  Reduce modulo X^2+Y^2=R.
    phase_modulus_numerator = sp.expand(
        w_imag_numerator + Y * w_abs_squared_numerator
    )
    circle_relation = sp.Poly(Y**2 - (R - X**2), Y)
    reduced = sp.Poly(phase_modulus_numerator, Y).rem(circle_relation).as_expr()
    assert sp.factor(reduced / Y).has(Y) is False

    E = sp.factor(reduced / Y)
    expected_E = sp.expand(
        -2 * D * L
        + D * S
        - 4 * D * X
        + D
        + 2 * L * R
        + L * S**2
        - 2 * L * S * X
        + L * S
        - 2 * L * X
        + R * S
        + 3 * R
        + S**2
        - 4 * S * X
        + 2 * S
        - 4 * X
        + 1
    )
    assert sp.expand(E - expected_E) == 0

    target_R = L * (L + 1) / 16
    E_target = sp.factor(E.subs(R, target_R))
    transition = sp.expand(
        4 * D - 4 * target_R - 2 * S**2 + 4 * S * X - 2 * S + 4 * X
    )
    decomposition = sp.expand(
        (-2 * L + S - 4 * X + 1) * transition / 4
        + (S - 2 * X + 2)
        * (L**2 + L + 4 * S**2 - 16 * S * X + 8 * S - 16 * X + 4)
        / 8
    )
    assert sp.factor(E_target - decomposition) == 0

    previous_radius_squared = (L + 1) * (L + 2) / 16
    sharp_face = sp.factor(E_target.subs(D, previous_radius_squared))
    expected_sharp_face = sp.factor(
        (L + 8 * S + 9) * ((L + 1) * S - 2 * (L + 2) * X + 1) / 8
    )
    assert sp.factor(sharp_face - expected_sharp_face) == 0

    # The transition-disk numerator from the quadratic ratio is Y*T/2.
    transition_numerator = sp.expand(q_imag * qm_real - q_real * qm_imag)
    transition_reduced = sp.Poly(transition_numerator, Y).rem(circle_relation).as_expr()
    transition_target = sp.factor((transition_reduced / Y).subs(R, target_R))
    assert sp.factor(transition_target - transition / 2) == 0

    payload = {
        "kind": "window_radial_envelope_phase_modulus_reduction_exact",
        "status": "PASS_EXACT_PHASE_MODULUS_REDUCTION",
        "proved": [
            "phase matching eliminates s: F_s=-Y*abs(W)^2/Im(W)",
            "a positive phase match forces Im(W)<0",
            "F_s<1 is equivalent to Im(W)+Y*abs(W)^2<0",
            "on X^2+Y^2=R, the last expression has sign E",
            "the displayed transition decomposition of E is exact",
            "the previous-radius sharp-face factorization is exact",
        ],
        "definitions": {
            "W": "Q(z-1)/((z+L)Q(z))",
            "Q": "z^2-S*z+D",
            "target_radius_squared": "L*(L+1)/16",
            "transition": str(sp.factor(transition)),
            "E": str(E_target),
            "E_transition_decomposition": str(sp.factor(decomposition)),
            "E_on_previous_radius_face": str(sharp_face),
        },
        "remaining_lemma": (
            "prove E>=0 at every reachable phase-compatible point, retaining "
            "the coupling between the mesh factor and Q"
        ),
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    payload["content_sha256"] = hashlib.sha256(canonical).hexdigest()
    REPORT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
