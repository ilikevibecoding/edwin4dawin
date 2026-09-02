"""Symbolic and brute-force verification of the descent-propagation lemma.

What is proved here
-------------------
Let ``r >= 1`` be an integer and let ``a = p_{r-1}``, ``b = p_r``,
``c = p_{r+1}`` be integers with ``a >= 1`` and ``c >= 0``.  Assume

* (weak descent) ``a >= b``,
* (WR_r)         ``a <= r * b``,
* (ISO_r)        ``Q_r = r*b**2 + a**2 - (r+1)*a*c >= 0``.

Then ``c <= b``.  The strict-descent statement (``a > b``) that is usually
quoted is the special case ``a > b``; allowing equality is what makes
repeated application of the lemma immune to ties.

Two proofs are checked with :mod:`sympy`:

1. Real-variable form.  With ``x = b/a`` and ``y = c/b`` (``b >= 1`` follows
   from ``1 <= a <= r*b``), ``WR_r`` and the descent give ``1/r <= x <= 1``
   and ``ISO_r`` divided by ``a*b`` reads ``(r+1)*y <= r*x + 1/x``.  The
   polynomial identity

       (r + 1) - r*x - 1/x = (1 - x) * (r*x - 1) / x

   is verified symbolically; on ``1/r <= x <= 1`` both factors of the
   numerator are non-negative and ``x > 0``, so ``r*x + 1/x <= r + 1`` and
   therefore ``y <= 1``, i.e. ``c <= b``.  The sign argument itself is also
   made symbolic: parametrising ``x = (1 + t*s)/(1 + s)`` with ``s = r - 1``
   and ``t`` in ``[0, 1]`` turns the difference into
   ``t*(1-t)*s**2 / (1 + t*s)``, a quotient of manifestly non-negative
   factors.  For small explicit ``r`` the solution set of
   ``r*x + 1/x <= r + 1`` over ``x > 0`` is recomputed with sympy and
   compared with ``[1/r, 1]``.

2. Integer form (no division).  The identity

       Q_r = (a - b) * (a - r*b) + (r + 1) * a * (b - c)

   is verified symbolically.  Under ``b <= a <= r*b`` the first product is
   ``<= 0``, so ``Q_r >= 0`` forces ``(r+1)*a*(b - c) >= 0`` and, as
   ``a >= 1``, ``b >= c``.

Finally the integer statement is checked by brute force: exhaustively for
small ``r, a, b, c`` and on pseudo-random sequences (with a fixed seed), by
evaluating hypotheses and conclusion index by index exactly as
:func:`erdos993.checks.descent_propagation_check` does.

What is NOT proved here
-----------------------
* Nothing is claimed about *when* ``WR_r`` or ``ISO_r`` hold.  They are
  hypotheses of the lemma; whether the independence sequence of a given
  forest satisfies them is a separate, purely computational question (see
  :func:`erdos993.checks.wr_failures` and :func:`erdos993.checks.iso_failures`).
* The Levit–Mandrescu TAIL theorem (``p_r >= p_{r+1}`` for
  ``r >= ceil((2*alpha-1)/3)``) is quoted, not proved.
* Consequently the lemma alone does not prove unimodality of independence
  polynomials of forests; it only shows that ``WR_r`` and ``ISO_r`` for all
  ``r <= L(alpha)``, together with TAIL, imply unimodality of that particular
  sequence.
"""

from __future__ import annotations

import random
from fractions import Fraction
from typing import Sequence

import sympy as sp

DEFAULT_SEED = 993


def rational_identity_holds() -> bool:
    """Check ``(r+1) - r*x - 1/x == (1 - x)*(r*x - 1)/x`` as rational functions."""
    r, x = sp.symbols("r x", positive=True)
    lhs = (r + 1) - r * x - 1 / x
    rhs = (1 - x) * (r * x - 1) / x
    return sp.cancel(lhs - rhs) == 0


def factored_difference() -> sp.Expr:
    """Return ``sympy.factor((r+1) - r*x - 1/x)``, i.e. ``(1-x)*(r*x-1)/x`` up to sign convention."""
    r, x = sp.symbols("r x", positive=True)
    return sp.factor((r + 1) - r * x - 1 / x)


def slack_identity_holds() -> bool:
    """Check ``Q_r / (p_{r-1} p_r) == r*x + 1/x - (r+1)*y`` with ``x = p_r/p_{r-1}``, ``y = p_{r+1}/p_r``."""
    r, a, b, c = sp.symbols("r a b c", positive=True)
    q = r * b**2 + a**2 - (r + 1) * a * c
    x, y = b / a, c / b
    return sp.cancel(q / (a * b) - (r * x + 1 / x - (r + 1) * y)) == 0


def rational_grid_check(max_r: int = 12, steps: int = 60) -> bool:
    """Exact :class:`~fractions.Fraction` check of the sign claim on a grid.

    For ``r = 1 .. max_r`` and ``x = 1/r + (k/steps)*(1 - 1/r)``,
    ``k = 0 .. steps``, verify ``(r+1) - (r*x + 1/x) == (1-x)*(r*x-1)/x >= 0``
    with equality exactly at the endpoints, and that the difference is
    negative just outside ``[1/r, 1]``.
    """
    for r in range(1, max_r + 1):
        lo = Fraction(1, r)
        for k in range(steps + 1):
            x = lo + Fraction(k, steps) * (1 - lo)
            diff = (r + 1) - (r * x + 1 / x)
            if diff != (1 - x) * (r * x - 1) / x or diff < 0:
                return False
            if (diff == 0) != (x == lo or x == 1):
                return False
        for x in (lo - Fraction(1, 1000), 1 + Fraction(1, 1000)):
            if (r + 1) - (r * x + 1 / x) >= 0:
                return False
    return True


def integer_identity_holds() -> bool:
    """Check ``Q_r == (a - b)*(a - r*b) + (r+1)*a*(b - c)`` as polynomials."""
    r, a, b, c = sp.symbols("r a b c")
    q = r * b**2 + a**2 - (r + 1) * a * c
    return sp.expand(q - ((a - b) * (a - r * b) + (r + 1) * a * (b - c))) == 0


def sign_on_interval_holds() -> bool:
    """Check that ``(r+1) - r*x - 1/x >= 0`` on ``1/r <= x <= 1`` symbolically.

    With ``s = r - 1 >= 0`` and ``x = (1 + t*s)/(1 + s)`` for ``0 <= t <= 1``
    (which sweeps exactly ``[1/r, 1]``), the difference equals
    ``t*(1 - t)*s**2/(1 + t*s)``.  Writing ``u = 1 - t >= 0`` the expression
    is a quotient of non-negative factors, which sympy's assumption system
    confirms.
    """
    s, t, u = sp.symbols("s t u", nonnegative=True)
    r = s + 1
    x = (1 + t * s) / (1 + s)
    difference = (r + 1) - r * x - 1 / x
    closed_form = t * (1 - t) * s**2 / (1 + t * s)
    identity_ok = sp.cancel(difference - closed_form) == 0
    sign_ok = (t * u * s**2 / (1 + t * s)).is_nonnegative is True
    return identity_ok and sign_ok


def explicit_intervals_hold(max_r: int = 8) -> bool:
    """Solve ``r*x + 1/x <= r + 1`` over ``x > 0`` for ``r = 1 .. max_r``.

    The solution set must be exactly the closed interval ``[1/r, 1]`` (the
    single point ``{1}`` when ``r = 1``).
    """
    x = sp.Symbol("x", real=True)
    positive = sp.Interval.open(0, sp.oo)
    for r in range(1, max_r + 1):
        solution = sp.solve_univariate_inequality(
            r * x + 1 / x <= r + 1, x, relational=False, domain=positive
        )
        if solution != sp.Interval(sp.Rational(1, r), 1):
            return False
    return True


def lemma_hypotheses(r: int, a: int, b: int, c: int) -> bool:
    """Hypotheses of the (weak) lemma for ``(p_{r-1}, p_r, p_{r+1}) = (a, b, c)``."""
    return a >= 1 and a >= b and a <= r * b and r * b * b + a * a - (r + 1) * a * c >= 0


def check_sequence(seq: Sequence[int]) -> tuple[int, int]:
    """Apply the integer lemma index by index to ``seq``.

    Returns ``(applications, violations)``: how often the hypotheses held and
    how often the conclusion ``p_{r+1} <= p_r`` then failed.  ``violations``
    must be ``0`` for every integer sequence.
    """
    applications = violations = 0
    for r in range(1, len(seq) - 1):
        a, b, c = seq[r - 1], seq[r], seq[r + 1]
        if lemma_hypotheses(r, a, b, c):
            applications += 1
            if c > b:
                violations += 1
    return applications, violations


def exhaustive_integer_check(max_r: int = 6, max_value: int = 24) -> tuple[int, int]:
    """Check the integer lemma for all ``r <= max_r`` and ``0 <= a, b, c <= max_value``."""
    applications = violations = 0
    for r in range(1, max_r + 1):
        for a in range(0, max_value + 1):
            for b in range(0, max_value + 1):
                for c in range(0, max_value + 1):
                    if lemma_hypotheses(r, a, b, c):
                        applications += 1
                        if c > b:
                            violations += 1
    return applications, violations


def random_sequence_check(
    trials: int = 2000, length: int = 12, seed: int = DEFAULT_SEED
) -> tuple[int, int]:
    """Check the integer lemma on pseudo-random positive integer sequences.

    Half of the sequences are unconstrained; the other half are built so that
    the hypotheses fire often (each entry lies between ``p_{r-1}/r`` and
    ``p_{r-1}``, with occasional bumps), which keeps the test non-vacuous.
    """
    rng = random.Random(seed)
    applications = violations = 0
    for trial in range(trials):
        if trial % 2 == 0:
            seq = [rng.randint(1, 10**6) for _ in range(length)]
        else:
            seq = [rng.randint(1, 10**6)]
            for r in range(1, length):
                low = -(-seq[-1] // r)
                high = seq[-1] if rng.random() < 0.8 else 2 * seq[-1] + 1
                seq.append(rng.randint(min(low, high), max(low, high)))
        used, bad = check_sequence(seq)
        applications += used
        violations += bad
    return applications, violations


def _non_vacuous(result: tuple[int, int]) -> bool:
    applications, violations = result
    return applications > 0 and violations == 0


def lemma_checks(random_trials: int = 2000, seed: int = DEFAULT_SEED) -> list[tuple[str, bool]]:
    """Run every check and return ``[(description, passed), ...]`` in proof order."""
    return [
        ("sympy: (r+1) - (r x + 1/x) == (1-x)(r x-1)/x as rational functions", rational_identity_holds()),
        ("sympy: Q_r/(p_{r-1} p_r) == r x + 1/x - (r+1) y with x=p_r/p_{r-1}, y=p_{r+1}/p_r", slack_identity_holds()),
        ("sympy: (1-x)(r x-1)/x >= 0 on [1/r,1] via x=(1+t s)/(1+s), s=r-1, t in [0,1]", sign_on_interval_holds()),
        ("sympy: solution set of r x + 1/x <= r+1 (x>0) is exactly [1/r,1] for r=1..8", explicit_intervals_hold()),
        ("exact Fraction grid: identity, sign and endpoint equality on [1/r,1], r<=12", rational_grid_check()),
        ("sympy: Q_r == (a-b)(a-rb) + (r+1) a (b-c) (division-free form)", integer_identity_holds()),
        ("brute force: lemma holds for all r<=6, 0<=a,b,c<=24 (non-vacuous)", _non_vacuous(exhaustive_integer_check())),
        (
            f"brute force: lemma holds on {random_trials} pseudo-random sequences (seed {seed})",
            _non_vacuous(random_sequence_check(trials=random_trials, seed=seed)),
        ),
    ]


def verify_lemma(random_trials: int = 2000, seed: int = DEFAULT_SEED) -> bool:
    """Run every symbolic and brute-force check; return ``True`` if all pass.

    Raises :class:`AssertionError` naming the first failing check.  The
    module docstring states precisely what passing this function does and
    does not establish.
    """
    for name, passed in lemma_checks(random_trials=random_trials, seed=seed):
        if not passed:
            raise AssertionError(f"lemma check failed: {name}")
    return True
