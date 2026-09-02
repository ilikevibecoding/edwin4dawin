#!/usr/bin/env python3
"""Verify the ISO + weak-prefix-ratio conditional unimodality reduction.

The script verifies only the algebra and finite logic of the implication.  It
does not prove either input inequality for all forests.
"""

from __future__ import annotations

import itertools
from math import ceil, floor

import sympy as sp


def is_unimodal(values: tuple[int, ...]) -> bool:
    descended = False
    for left, right in zip(values, values[1:]):
        if right < left:
            descended = True
        elif right > left and descended:
            return False
    return True


def assumptions(values: tuple[int, ...]) -> bool:
    alpha = len(values) - 1
    boundary = floor((2 * alpha + 1) / 3)
    if any(values[k] < values[k + 1] for k in range(boundary, alpha)):
        return False
    for r in range(2, boundary):
        previous, current, following = values[r - 1 : r + 2]
        if previous > r * current:
            return False
        iso = r * current * current + previous * previous
        iso -= (r + 1) * previous * following
        if iso < 0:
            return False
    return True


def main() -> None:
    r, pm, p, pp = sp.symbols("r pm p pp", positive=True)
    u = r * p / pm
    w = (r + 1) * pp / p
    iso = r * p**2 + pm**2 - (r + 1) * pm * pp
    assert sp.simplify(r * iso / pm**2 - (r + u**2 - u * w)) == 0
    assert sp.simplify(
        (r + 1) - (u + r / u) - (u - 1) * (r - u) / u
    ) == 0

    for alpha in range(1, 10_001):
        assert ceil((2 * alpha - 1) / 3) == floor((2 * alpha + 1) / 3)

    sequences = 0
    satisfying = 0
    for alpha in range(2, 8):
        for tail in itertools.product(range(1, 6), repeat=alpha):
            values = (1, *tail)
            sequences += 1
            if assumptions(values):
                satisfying += 1
                assert is_unimodal(values), (alpha, values)

    print("PASS_EXACT_CONDITIONAL_ISO_WEAK_PREFIX_UNIMODALITY_REDUCTION")
    print(f"finite_positive_sequences={sequences}")
    print(f"finite_satisfying_sequences={satisfying}")
    print("scope=conditional implication only; both forest inequalities remain open")


if __name__ == "__main__":
    main()
