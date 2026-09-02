#!/usr/bin/env python3
"""Sample every exact mass-polarized leaf-growth control kernel."""

from __future__ import annotations

import itertools
import random

import sympy as sp

from analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_kernel_rank7_g4_piecewise import (
    d,
    growth_differences,
    mass_triple_kernel,
    n,
    w,
    y,
    z,
)


def main() -> None:
    differences = growth_differences()
    for index, difference in enumerate(differences):
        kernel = mass_triple_kernel(difference)
        function = sp.lambdify((n, d, y, z, w), kernel, "math")
        minimum = None
        for order in range(40, 61):
            for maximum in range(4, order-4):
                top = maximum-1
                values = {1, 2, 3, top}
                values.update(
                    random.Random(index*100000+order*100+maximum).randrange(1, top+1)
                    for _ in range(12)
                )
                for triple in itertools.product(sorted(values), repeat=3):
                    value = function(order, maximum, *triple)
                    candidate = (value, order, maximum, triple)
                    minimum = candidate if minimum is None else min(minimum, candidate)
        numerator, denominator = sp.cancel(kernel).as_numer_denom()
        print(index, "MIN", minimum, "NUMERATOR_TERMS", len(sp.Poly(numerator, y, z, w).terms()),
              "YZW_DEGREE", sp.Poly(numerator, y, z, w).total_degree(),
              "DENOMINATOR", denominator)


if __name__ == "__main__":
    main()
