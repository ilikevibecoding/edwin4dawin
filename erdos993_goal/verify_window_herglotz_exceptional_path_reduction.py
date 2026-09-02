#!/usr/bin/env python3
"""Exact audit of the Herglotz/N_1 reduction for one negative append.

If R=P Q, where P has positive roots separated by at least one and
Q(x)=x^2-Sx+D, then a zero of

    R_next=(4+c)xR(x-1)-c(x+L)R(x)

satisfies

    A(x)=tau Q(x)/Q(x-1),
    A(x)=x/(x+L) P(x-1)/P(x), tau=c/(4+c).

The poles and zeros of A interlace, so A is Herglotz.  Hence a nonreal
zero z=X+iY in the upper half-plane must lie in the exact transition disk

    (X-(S+1)/2)^2+Y^2 < (1+4D-S^2)/4.

The identities are proofs.  The frozen rational cases only audit signs.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_herglotz_exceptional_path_reduction_exact_20260809.json"
X, Y, S, D, L, c = sp.symbols("X Y S D L c", real=True)
Z = X + sp.I * Y
T = sp.symbols("t")


def symbolic_transition_disk() -> dict[str, str]:
    q = lambda z: z**2 - S * z + D
    numerator = sp.expand(q(Z) * sp.conjugate(q(Z - 1)))
    imaginary_over_y = sp.factor(sp.im(numerator) / Y)
    expected = sp.expand(
        -2 * ((X - (S + 1) / 2) ** 2 + Y**2)
        + (1 + 4 * D - S**2) / 2
    )
    assert sp.expand(imaginary_over_y - expected) == 0
    return {
        "imaginary_numerator_over_Y": str(imaginary_over_y),
        "completed_square": str(sp.factor(expected)),
        "transition_disk": (
            "(X-(S+1)/2)^2+Y^2 < (1+4D-S^2)/4"
        ),
    }


def exact_herglotz_residue_audit() -> dict[str, object]:
    cases = []
    digest_payload = []
    for degree in range(0, 8):
        roots = []
        current = sp.Rational(1, 7)
        for index in range(degree):
            current += sp.Rational(8 + (3 * index) % 5, 7)
            roots.append(current)
        length = sp.Integer(3 * degree + 7)
        p = sp.prod((T - root for root in roots), start=sp.Integer(1))
        a = sp.cancel(T / (T + length) * p.subs(T, T - 1) / p)
        poles = [-length, *roots]
        residues = [sp.factor(sp.limit((T - pole) * a, T, pole)) for pole in poles]
        assert all(residue < 0 for residue in residues)
        # Degree equality and limit one give the Herglotz partial-fraction form
        # A(z)=1+sum residue/(z-pole), with every residue negative.
        reconstructed = 1 + sum(residue / (T - pole) for pole, residue in zip(poles, residues))
        assert sp.cancel(a - reconstructed) == 0
        payload = ";".join(map(str, residues))
        digest_payload.append(payload)
        cases.append(
            {
                "degree": degree,
                "length": str(length),
                "positive_roots": list(map(str, roots)),
                "all_residues_negative": True,
                "residues": list(map(str, residues)),
            }
        )
    return {
        "cases": cases,
        "combined_digest": hashlib.sha256("|".join(digest_payload).encode("ascii")).hexdigest(),
    }


def symbolic_root_equation() -> str:
    q0, q1, q2 = sp.symbols("q0 q1 q2")
    p0, p1, p2, p3 = sp.symbols("p0 p1 p2 p3")
    q = q0 + q1 * T + q2 * T**2
    p = p0 + p1 * T + p2 * T**2 + p3 * T**3
    r = sp.expand(p * q)
    nxt = sp.expand((4 + c) * T * r.subs(T, T - 1) - c * (T + L) * r)
    tau = c / (4 + c)
    cleared = sp.expand(
        nxt / (4 + c)
        - (T + L) * p * q.subs(T, T - 1)
        * (
            T / (T + L) * p.subs(T, T - 1) / p
            - tau * q / q.subs(T, T - 1)
        )
    )
    assert sp.cancel(cleared) == 0
    return "A(x)=tau Q(x)/Q(x-1), A=x/(x+L) P(x-1)/P(x)"


def main() -> None:
    report = {
        "kind": "window_herglotz_exceptional_path_reduction_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_HERGLOTZ_AND_TRANSITION_DISK_REDUCTION",
        "root_equation": symbolic_root_equation(),
        "transition_disk": symbolic_transition_disk(),
        "herglotz_residue_audit": exact_herglotz_residue_audit(),
        "proof_status": (
            "The root equation, Herglotz interlacing mechanism, and transition-disk "
            "identity are proved. The remaining task is to show that the unique N_1 "
            "exceptional zero path stays within the shrinking admissible disk (with "
            "positive-branch exchanges handled by selecting the largest roots)."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(REPORT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
