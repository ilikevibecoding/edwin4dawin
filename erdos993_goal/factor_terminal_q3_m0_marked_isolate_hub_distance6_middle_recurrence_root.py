#!/usr/bin/env python3
"""Factor low exact instances of the distance-six middle recurrence."""

import sympy as sp
from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    core_terms,
)
from probe_terminal_q3_m0_marked_isolate_hub_distance6_middle_recurrence_categories_root import (
    recurrence_piece,
)


def main():
    for target in (4, 5, 6):
        _, x, y = field("x,y", QQ)
        a = x + target - 1
        b = y + target - 1
        f_terms, z_terms = core_terms(DISTANCE, a, b)
        expression = sum(
            recurrence_piece(f_terms, z_terms, category, a, b, target)
            for category in ("n", "a", "b", "none")
        )
        numerator = expression.numer.as_expr()
        denominator = expression.denom.as_expr()
        print("target", target, "denominator", denominator, flush=True)
        print("factor", sp.factor(numerator), flush=True)


if __name__ == "__main__":
    main()
