#!/usr/bin/env python3
"""Derive the induced-relative reduction of the P4 shadow block.

For one rooted core G, let J=G-v and R=G-N[v].  The strong isolate
defect of the one-core shadow expression depends on only

    i_(q-2), i_(q-1), i_q

of J and R.  Applying the support-leaf recursion once more gives the
P4 shadow margin.  This script proves both symbolic reductions and
then rewrites the margin using an induced relative complex.

The final relative expression is linear in the face numbers that hit
the deleted vertex set.  Its nonnegativity is not proved here.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


def isolate_defect(q, m, M, X, rr, r, t):
    return (
        2 * M**2
        + 4 * M * m
        - 2 * M * r
        - 2 * M * rr
        + 2 * X * m
        - (2 * q + 1) * X * rr
        + (2 * q - 1) * m * t
        + 2 * m * r
    )


def main() -> None:
    q = sp.Symbol("q", integer=True, positive=True)
    p0, p1, p2, r0, r1, r2 = sp.symbols(
        "p0 p1 p2 r0 r1 r2"
    )
    am, a0, a1 = sp.symbols("am a0 a1")
    cm, c0, c1 = sp.symbols("cm c0 c1")

    # Adding a support leaf replaces P_j by P_j+A_(j-1) and
    # R_j by R_j+C_(j-1).  Subtract the lower-rank defect.
    leaf_gap = sp.expand(
        isolate_defect(
            q,
            p0 + am,
            p1 + a0,
            p2 + a1,
            r0 + cm,
            r1 + c0,
            r2 + c1,
        )
        - isolate_defect(q, p0, p1, p2, r0, r1, r2)
        - isolate_defect(q - 1, am, a0, a1, cm, c0, c1)
    )
    assert len(sp.Add.make_args(leaf_gap)) == 21

    # Resolve the old graph at the support vertex s:
    # P=A+xU and R=C+xV.
    a2, c2 = sp.symbols("a2 c2")
    um, u0, u1 = sp.symbols("um u0 u1")
    vm, v0, v1 = sp.symbols("vm v0 v1")
    resolved = sp.expand(
        leaf_gap.subs(
            {
                p0: a0 + um,
                p1: a1 + u0,
                p2: a2 + u1,
                r0: c0 + vm,
                r1: c1 + v0,
                r2: c2 + v1,
            }
        )
    )

    # C is the induced restriction of A, and V the corresponding
    # induced restriction of U.  Put H=A-C and K=U-V.
    hm, h0, h1, h2 = sp.symbols("hm h0 h1 h2")
    km, k0, k1 = sp.symbols("km k0 k1")
    relative = sp.factor(
        sp.expand(
            resolved.subs(
                {
                    cm: am - hm,
                    c0: a0 - h0,
                    c1: a1 - h1,
                    c2: a2 - h2,
                    vm: um - km,
                    v0: u0 - k0,
                    v1: u1 - k1,
                }
            )
        )
    )
    expected = sp.expand(
        4 * a0**2
        + 4 * a0 * um
        + 4 * a1 * am
        + 4 * am * u0
        + hm
        * (
            4 * a1
            + (2 * q + 1) * a2
            + (2 * q + 1) * u1
            + 2 * u0
        )
        + h0 * ((2 * q + 3) * a1 + 2 * u0 - 2 * um)
        - h1
        * ((2 * q - 3) * a0 + 4 * am + (2 * q - 1) * um)
        - (2 * q - 1) * am * h2
        + km * (2 * a0 + (2 * q + 1) * a1)
        + 2 * k0 * (a0 - am)
        - (2 * q - 1) * am * k1
    )
    assert sp.expand(relative - expected) == 0

    report = {
        "status": "PASS_ISOLATE_SHADOW_RELATIVE_REDUCTION_IDENTITY",
        "valid_strong_ranks": "q>=5",
        "one_core_isolate_defect": str(
            isolate_defect(q, p0, p1, p2, r0, r1, r2)
        ),
        "support_leaf_gap_term_count": len(
            sp.Add.make_args(leaf_gap)
        ),
        "support_leaf_gap": str(sp.factor(leaf_gap)),
        "relative_term_count": len(
            sp.Add.make_args(sp.expand(relative))
        ),
        "relative_linear_form": str(expected),
        "relative_variables": {
            "A": "deletion complex at the support s",
            "U": "link complex at s, with U subset A",
            "C": "induced restriction of A",
            "V": "corresponding induced restriction of U",
            "H=A-C": "faces hitting the removed vertex set",
            "K=U-V": "link faces hitting the removed vertex set",
        },
        "key_structure": (
            "The P4 shadow margin is affine-linear in the relative "
            "face vectors H and K. When H=K=0, the remaining base "
            "is 4(a0^2+a0*um+a1*am+am*u0)>=0."
        ),
        "warning": (
            "The identities are proved. Nonnegativity of the displayed "
            "relative linear form remains an all-rank proof obligation."
        ),
    }
    Path(
        "isolate_shadow_relative_reduction_identity_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
