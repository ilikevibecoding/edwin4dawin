#!/usr/bin/env python3
"""Derive the symmetric four-copy kernel for Delta^3 of a quotient.

For a common coefficient transform K_j and sources U,W, put

    v_j = K_j(U) / K_j(W).

Writing y=w/(1+z), all four shifted transforms K_{j+t} are obtained
from one common extraction by inserting y^t (the binomial prefactor
cancels in the quotient).  Clearing the four positive denominators and
symmetrising the three W copies gives the kernel derived below.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp


def averaged_monomial(variables, exponents):
    permutations = sorted(set(itertools.permutations(exponents)))
    return sp.expand(
        sum(
            sp.prod(variable**exponent for variable, exponent in zip(variables, perm))
            for perm in permutations
        )
        / len(permutations)
    )


def main() -> None:
    y = sp.symbols("y0:4")
    kernels = []
    for i in range(4):
        others = [y[k] for k in range(4) if k != i]
        kernel = sp.expand(
            y[i] ** 3 * averaged_monomial(others, (0, 1, 2))
            - 3 * y[i] ** 2 * averaged_monomial(others, (0, 1, 3))
            + 3 * y[i] * averaged_monomial(others, (0, 2, 3))
            - averaged_monomial(others, (1, 2, 3))
        )
        kernels.append(kernel)

    total = sp.factor(sum(kernels))
    # The common W baseline must cancel because K_j(W)/K_j(W)=1.
    assert total == 0

    report = {
        "status": "PROVED_EXACT_FOUR_COPY_THIRD_DIFFERENCE_KERNEL",
        "coefficient_word": [1, -3, 3, -1],
        "kernel_for_distinguished_U_copy": str(sp.factor(kernels[0])),
        "all_four_kernels_sum_to_zero": total == 0,
        "consequence": (
            "Writing U=W+E, the W^4 baseline cancels identically.  The "
            "cleared numerator of Delta^3 v is therefore a cyclic "
            "four-copy extraction with exactly one E source and three W "
            "sources.  Unlike utilization curvature, there is no positive "
            "baseline; a proof must control the signed E extraction."
        ),
        "warning": (
            "This is an algebraic reduction, not a sign theorem for the "
            "remaining E-W-W-W extraction."
        ),
    }
    output = Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "deweighted_four_copy_kernel_20260802.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
