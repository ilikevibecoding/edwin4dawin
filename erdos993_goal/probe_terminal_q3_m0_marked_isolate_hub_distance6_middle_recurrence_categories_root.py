#!/usr/bin/env python3
"""Split the exact distance-six same-tree target recurrence by row category."""

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    anchor,
    core_terms,
    fixed_coefficient,
)


def category_coefficient(terms, category, rank, a, b):
    return fixed_coefficient(
        [term for term in terms if term[0] == category], rank, a, b
    )


def recurrence_piece(f_terms, z_terms, category, a, b, target):
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = category_coefficient(f_terms, category, target - 1, a, b)
    f0 = category_coefficient(f_terms, category, target, a, b)
    fp1 = category_coefficient(f_terms, category, target + 1, a, b)
    fp2 = category_coefficient(f_terms, category, target + 2, a, b)
    zp1 = category_coefficient(z_terms, category, target + 1, a, b)
    zp2 = category_coefficient(z_terms, category, target + 2, a, b)
    return (
        f2
        * determinant
        * (
            (target + 2) * fp2
            + (target + 3) * fp1
            - target * f0
            - (target + 1) * fm1
        )
        + f2
        * p0
        * (
            (c0 + r0) * ((target + 2) * fp1 - (target + 1) * f0)
            - 3
            * (p0 + f2)
            * (zp2 - zp1 + 2 * (fp1 - f0))
        )
    )


def stats(expression):
    assert len(expression.denom.terms()) == 1
    coefficients = [coefficient for _, coefficient in expression.numer.terms()]
    return {
        "terms": len(coefficients),
        "negative": sum(coefficient < 0 for coefficient in coefficients),
        "zero": sum(coefficient == 0 for coefficient in coefficients),
        "minimum": str(min(coefficients)) if coefficients else None,
    }


def main():
    for target in range(4, 16):
        _, q, v = field("q,v", QQ)
        a = q + v + target - 1
        b = q + target - 1
        f_terms, z_terms = core_terms(DISTANCE, a, b)
        pieces = {
            category: recurrence_piece(
                f_terms, z_terms, category, a, b, target
            )
            for category in ("n", "a", "b", "none")
        }
        print(
            target,
            {category: stats(piece) for category, piece in pieces.items()},
            "sum",
            stats(sum(pieces.values())),
            flush=True,
        )

        _, x, y = field("x,y", QQ)
        a = x + target - 1
        b = y + target - 1
        f_terms, z_terms = core_terms(DISTANCE, a, b)
        independent = sum(
            recurrence_piece(f_terms, z_terms, category, a, b, target)
            for category in ("n", "a", "b", "none")
        )
        print(target, "independent_excess", stats(independent), flush=True)


if __name__ == "__main__":
    main()
