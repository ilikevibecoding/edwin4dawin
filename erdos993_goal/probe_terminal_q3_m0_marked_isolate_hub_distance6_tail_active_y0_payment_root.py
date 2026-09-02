#!/usr/bin/env python3
"""Pay the active tail-start small-side correction using a binomial lower bound."""

from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    stats,
)
from probe_terminal_q3_m0_marked_isolate_hub_distance6_tail_common_normalizer_root import (
    normalized_payment,
)
from probe_terminal_q3_m0_marked_isolate_hub_distance6_tail_zero_boundary_corrections_root import (
    gap3_correction,
)
from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    C,
    falling,
)


def main():
    # y=0 and j>=6 force q>=2; write q=w+2.
    _, w, u = field("w,u", QQ)
    q = w + 2
    b = q + 1
    target = q + 4
    a = q + u + 2
    n = a + b
    selected = target - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + selected * b)
    correction = gap3_correction(b, a, target)
    lower_binomial = C(n, 3)
    for label, rho in (
        ("tail_active_y0_origin_Cn3_payment", 0),
        ("tail_active_y0_cap_Cn3_payment", cap_a),
    ):
        start = perf_counter()
        expression = lower_binomial * normalized_payment(
            a, b, target, rho, 0
        ) + correction
        stats(label, expression, perf_counter() - start)


if __name__ == "__main__":
    main()
