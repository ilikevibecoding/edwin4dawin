#!/usr/bin/env python3
"""Exact certificate for the normalized algebra in the rank-5 leaf step.

The mathematical lemma checked here is the following.

Let

    0 <= X <= 1,
    D0 = (2 + X)/10 <= D <= 1,
    1/2 <= r <= 1,
    q >= 1/2,
    q <= 1,
    q >= r - D/2.

Then Phi(X,D,r,q) >= 0, where Phi is the normalized rank-5 leaf
payment polynomial defined below.

The proof uses concavity in q.  The upper endpoint q=1 reduces, by
successive concavity in D and r, to four univariate polynomials.  The
lower endpoint q=max(1/2,r-D/2) reduces by concavity in D to four
bivariate endpoint polynomials.  Positivity of all eight polynomials is
certified exactly by tensor Bernstein coefficients.  All arithmetic is
rational.
"""

from __future__ import annotations

from collections import deque

import numpy as np
import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_leaf_induction_reduction import rooted_payment


X, D, r, q, z = sp.symbols("X D r q z", real=True)

PHI = (
    -10 * D**2
    + 12 * D * X**2 * r**2
    + 12 * D * X**2 * r
    + 20 * D * X * q
    + 4 * D * X * r
    + 12 * D * X
    + 12 * D
    - X**3 * r**2
    - X**3 * r
    - 10 * X**2 * q**2
    + 20 * X**2 * q * r
    - 12 * X**2 * r**2
    - 4 * X**2 * r
    - X**2
    - 4 * X * r
    - 3 * X
    - 2
)

D0 = (2 + X) / 10
rm = (12 + X) / 20


def endpoint_polynomials() -> dict[str, sp.Expr]:
    """Return polynomial numerators on the unit square (X,z)."""

    r_first = sp.Rational(1, 2) + z / 2
    r_between = sp.Rational(1, 2) + (
        rm - sp.Rational(1, 2)
    ) * z
    r_last = rm + (1 - rm) * z
    substitutions = {
        # q=1/2 branch, D=1, r in [1/2,1].
        "P1": {D: 1, q: sp.Rational(1, 2), r: r_first},
        # q=1/2 branch, D=D0, r between 1/2 and rm.
        "P2": {D: D0, q: sp.Rational(1, 2), r: r_between},
        # Both branches meet at D=2r-1, q=1/2.  It suffices to use the
        # larger range r in [rm,1].
        "P3": {
            D: 2 * r_last - 1,
            q: sp.Rational(1, 2),
            r: r_last,
        },
        # q=r-D/2 branch, D=D0, again on r in [rm,1].
        "C2": {D: D0, q: r_last - D0 / 2, r: r_last},
    }
    out: dict[str, sp.Expr] = {}
    for name, sub in substitutions.items():
        value = sp.factor(PHI.subs(sub, simultaneous=True))
        numerator, denominator = sp.fraction(sp.cancel(value))
        assert denominator.is_positive is not False
        out[name] = sp.factor(numerator)

    # Because Phi(X,D,r,1) is concave first in D and then, at either
    # D endpoint, in r, its minimum occurs among these four corners.
    for d_name, d_value in (("D0", D0), ("D1", sp.S.One)):
        for r_name, r_value in (
            ("rhalf", sp.Rational(1, 2)),
            ("r1", sp.S.One),
        ):
            value = sp.factor(
                PHI.subs(
                    {D: d_value, q: 1, r: r_value},
                    simultaneous=True,
                )
            )
            numerator, denominator = sp.fraction(sp.cancel(value))
            assert denominator.is_positive is not False
            out[f"Q1_{d_name}_{r_name}"] = sp.factor(numerator)
    return out


def certify_bernstein(
    polynomial: sp.Expr,
    *,
    max_depth: int = 24,
) -> tuple[tuple[int, ...], sp.Expr, tuple[int, ...], int, int]:
    """Certify nonnegativity on a unit box by exact dyadic subdivision."""

    # Keeping a dummy degree-zero z axis also makes the exact NumPy
    # object-array representation uniform for univariate endpoints.
    variables = (X, z)
    degrees, coefficients = tensor_bernstein_fast(polynomial, variables)
    queue = deque([(coefficients, 0)])
    leaves = 0
    global_minimum = None
    global_index = None
    deepest = 0
    while queue:
        patch, depth = queue.popleft()
        minimum, index = minimum_with_index(patch)
        if global_minimum is None or minimum < global_minimum:
            global_minimum = minimum
            global_index = index
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            continue
        if depth >= max_depth:
            raise AssertionError(
                f"uncertified patch at depth {depth}: "
                f"minimum={minimum}, index={index}"
            )
        axis = depth % len(variables)
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    assert global_minimum is not None and global_index is not None
    return degrees, sp.factor(global_minimum), global_index, leaves, deepest


def verify_calculus_reduction() -> None:
    """Check the monotonicity/concavity identities used in the reduction."""

    assert sp.diff(PHI, q, 2) == -20 * X**2
    half_branch = sp.expand(PHI.subs(q, sp.Rational(1, 2)))
    curved_branch = sp.expand(PHI.subs(q, r - D / 2))
    assert sp.diff(half_branch, D, 2) == -20
    assert sp.factor(sp.diff(curved_branch, D, 2)) == -5 * (X + 2) ** 2

    # At the switching boundary D=2r-1, both q formulas equal 1/2.
    boundary_a = half_branch.subs(D, 2 * r - 1)
    boundary_b = curved_branch.subs(D, 2 * r - 1)
    assert sp.expand(boundary_a - boundary_b) == 0

    upper_branch = sp.expand(PHI.subs(q, 1))
    assert sp.diff(upper_branch, D, 2) == -20
    assert sp.expand(
        sp.diff(upper_branch, r, 2)
        + 2 * X**2 * (X - 12 * D + 12)
    ) == 0


def verify_payment_normalization() -> None:
    """Check that Phi is exactly the normalized rooted payment."""

    d, e, f, h, k = sp.symbols("d e f h k", positive=True)
    payment = rooted_payment(e + h, f + k, d, e, f)
    normalized = PHI.subs(
        {
            X: d / e,
            D: 1 - d * f / e**2,
            r: h / d,
            q: k / e,
        },
        simultaneous=True,
    )
    assert sp.factor(payment - 5 * e**4 * normalized) == 0


def main() -> None:
    verify_payment_normalization()
    verify_calculus_reduction()
    polynomials = endpoint_polynomials()
    print("symbolic calculus reduction: OK")
    for name, polynomial in polynomials.items():
        result = certify_bernstein(polynomial)
        degrees, minimum, index, leaves, deepest = result
        print(
            name,
            "degrees",
            degrees,
            "global raw Bernstein minimum",
            minimum,
            "index",
            index,
            "certified leaves",
            leaves,
            "max depth",
            deepest,
        )
    print("normalized rank-5 algebra lemma: CERTIFIED")


if __name__ == "__main__":
    main()
