"""Exact combinatorial checks on coefficient sequences.

All functions take a sequence ``p = [p_0, ..., p_alpha]`` of integers (the
independence sequence of a graph, or any integer sequence) and return
verdicts computed with integer arithmetic only.

Notation used throughout (``alpha = len(p) - 1``):

* Unimodal: nondecreasing then nonincreasing (ties allowed).
  Log-concave: ``p_r**2 >= p_{r-1} * p_{r+1}`` for ``1 <= r <= alpha - 1``.
* ``L(alpha) = ceil((2*alpha - 1) / 3)`` is the Levit–Mandrescu tail cutoff:
  for the independence sequence of any graph, ``p_r >= p_{r+1}`` for every
  ``r >= L(alpha)`` (the TAIL theorem, quoted and *not* proved here).
* ``WR_r``: ``p_{r-1} <= r * p_r`` (defined for ``1 <= r <= alpha``).
* ``ISO_r``: ``Q_r = r*p_r**2 + p_{r-1}**2 - (r+1)*p_{r-1}*p_{r+1} >= 0``
  (defined for ``1 <= r <= alpha - 1``).
* Descent-propagation lemma: if ``p_{r-1} >= p_r >= 0`` with ``p_{r-1} >= 1``,
  ``WR_r`` and ``ISO_r`` hold, then ``p_{r+1} <= p_r``.  See
  :mod:`erdos993.lemma` for the proof; the version with a strict descent
  ``p_{r-1} > p_r`` is the special case that is usually quoted, and the
  weak version (equality allowed) is what makes the chain of applications
  robust against ties.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from fractions import Fraction
from numbers import Integral
from typing import Sequence


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _as_ints(seq: Sequence[int]) -> list[int]:
    """Return ``seq`` as a list of Python ints, rejecting floats and empties."""
    out: list[int] = []
    for value in seq:
        if isinstance(value, bool) or not isinstance(value, Integral):
            raise TypeError(f"sequence entries must be integers, got {value!r}")
        out.append(int(value))
    if not out:
        raise ValueError("the sequence must not be empty")
    return out


def tail_cutoff(alpha: int) -> int:
    """Return ``L(alpha) = ceil((2*alpha - 1) / 3)`` computed exactly."""
    if isinstance(alpha, bool) or not isinstance(alpha, Integral):
        raise TypeError("alpha must be an integer")
    alpha = int(alpha)
    if alpha < 0:
        raise ValueError("alpha must be non-negative")
    return -((1 - 2 * alpha) // 3)


def L_cutoff(alpha: int) -> int:
    """``L(alpha) = ceil((2*alpha - 1) / 3)``."""
    return tail_cutoff(alpha)


# ---------------------------------------------------------------------------
# Unimodality and log-concavity
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class UnimodalityResult:
    """Verdict of :func:`is_unimodal`.

    ``mode_range = (lo, hi)`` are the first and last indices at which the
    maximum of the sequence is attained.  For a unimodal sequence this is the
    plateau of the mode; for a non-unimodal sequence it merely brackets the
    maxima.  The object is truthy exactly when the sequence is unimodal.
    """

    unimodal: bool
    mode_range: tuple[int, int]
    maximum: int

    def __bool__(self) -> bool:
        return self.unimodal


def unimodality(seq: Sequence[int]) -> UnimodalityResult:
    """Unimodality verdict together with the plateau of the maximum.

    ``seq`` is unimodal if there is an index ``m`` with
    ``p_0 <= p_1 <= ... <= p_m >= p_{m+1} >= ... >= p_alpha`` (ties allowed).
    """
    p = _as_ints(seq)
    n = len(p)
    i = 0
    while i + 1 < n and p[i] <= p[i + 1]:
        i += 1
    while i + 1 < n and p[i] >= p[i + 1]:
        i += 1
    maximum = max(p)
    lo = p.index(maximum)
    hi = n - 1 - p[::-1].index(maximum)
    return UnimodalityResult(i == n - 1, (lo, hi), maximum)


def is_unimodal(seq: Sequence[int]) -> bool:
    """``True`` iff ``seq`` is nondecreasing then nonincreasing (ties allowed)."""
    return unimodality(seq).unimodal


def mode(seq: Sequence[int]) -> int:
    """Smallest index ``m`` with ``p_m = max(p)``."""
    return unimodality(seq).mode_range[0]


def mode_range(seq: Sequence[int]) -> tuple[int, int]:
    """``(lo, hi)``: first and last index at which ``max(p)`` is attained."""
    return unimodality(seq).mode_range


def log_concavity_breaks(seq: Sequence[int]) -> list[int]:
    """Return all ``r`` (``1 <= r <= alpha-1``) with ``p_r**2 < p_{r-1} * p_{r+1}``."""
    p = _as_ints(seq)
    return [r for r in range(1, len(p) - 1) if p[r] * p[r] < p[r - 1] * p[r + 1]]


def is_log_concave(seq: Sequence[int]) -> bool:
    """Return ``True`` iff ``p_r**2 >= p_{r-1} * p_{r+1}`` for all interior ``r``.

    Internal zeros are not examined separately; independence sequences have
    none, since ``p_r >= 1`` for ``0 <= r <= alpha``.
    """
    return not log_concavity_breaks(seq)


def first_descent(seq: Sequence[int]) -> int | None:
    """Return the smallest ``r >= 1`` with ``p_{r-1} > p_r``, or ``None``."""
    p = _as_ints(seq)
    for r in range(1, len(p)):
        if p[r - 1] > p[r]:
            return r
    return None


def first_weak_descent(seq: Sequence[int]) -> int | None:
    """Return the smallest ``r >= 1`` with ``p_{r-1} >= p_r``, or ``None``."""
    p = _as_ints(seq)
    for r in range(1, len(p)):
        if p[r - 1] >= p[r]:
            return r
    return None


def tail_failures(seq: Sequence[int]) -> list[int]:
    """Return all ``r >= L(alpha)`` with ``p_r < p_{r+1}``.

    The Levit–Mandrescu TAIL theorem states that this list is empty for the
    independence sequence of every graph.
    """
    p = _as_ints(seq)
    alpha = len(p) - 1
    return [r for r in range(tail_cutoff(alpha), alpha) if p[r] < p[r + 1]]


def tail_check(seq: Sequence[int]) -> bool:
    """``True`` iff ``p_r >= p_{r+1}`` for every ``L(alpha) <= r < alpha``."""
    return not tail_failures(seq)


# ---------------------------------------------------------------------------
# WR and ISO conditions
# ---------------------------------------------------------------------------


def wr_holds(seq: Sequence[int], r: int) -> bool:
    """``WR_r``: ``p_{r-1} <= r * p_r`` (requires ``1 <= r <= alpha``)."""
    p = _as_ints(seq)
    if not 1 <= r <= len(p) - 1:
        raise IndexError(f"WR_r is defined for 1 <= r <= alpha = {len(p) - 1}, got r={r}")
    return p[r - 1] <= r * p[r]


def wr_failures(seq: Sequence[int]) -> list[int]:
    """Return all ``r`` in ``1 .. alpha`` with ``p_{r-1} > r * p_r``."""
    p = _as_ints(seq)
    return [r for r in range(1, len(p)) if p[r - 1] > r * p[r]]


def wr_violations(seq: Sequence[int]) -> list[int]:
    """All ``r`` in ``1 .. alpha`` where ``WR_r: p_{r-1} <= r*p_r`` fails."""
    return wr_failures(seq)


def iso_value(seq: Sequence[int], r: int) -> int:
    """``Q_r = r*p_r**2 + p_{r-1}**2 - (r+1)*p_{r-1}*p_{r+1}`` (``1 <= r <= alpha-1``)."""
    p = _as_ints(seq)
    if not 1 <= r <= len(p) - 2:
        raise IndexError(f"ISO_r is defined for 1 <= r <= alpha-1 = {len(p) - 2}, got r={r}")
    return r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]


def iso_values(seq: Sequence[int]) -> list[int]:
    """Return ``[Q_1, ..., Q_{alpha-1}]`` as exact integers."""
    p = _as_ints(seq)
    return [
        r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]
        for r in range(1, len(p) - 1)
    ]


def iso_holds(seq: Sequence[int], r: int) -> bool:
    """``ISO_r``: ``Q_r >= 0``."""
    return iso_value(seq, r) >= 0


def iso_failures(seq: Sequence[int]) -> list[int]:
    """Return all ``r`` in ``1 .. alpha-1`` with ``Q_r < 0``."""
    return [r for r, q in enumerate(iso_values(seq), start=1) if q < 0]


def iso_violations(seq: Sequence[int]) -> list[int]:
    """All ``r`` in ``1 .. alpha-1`` where ``ISO_r: Q_r >= 0`` fails."""
    return iso_failures(seq)


def descent_conditional_iso_violations(seq: Sequence[int]) -> list[int]:
    """All ``r`` in ``1 .. alpha-1`` with ``p_{r-1} >= p_r`` and ``Q_r < 0``.

    These are the only ``ISO_r`` failures that matter for the
    descent-propagation lemma, whose hypothesis includes ``p_{r-1} >= p_r``.
    """
    p = _as_ints(seq)
    return [r for r, q in enumerate(iso_values(p), start=1) if p[r - 1] >= p[r] and q < 0]


def iso_normalized_slack(seq: Sequence[int], r: int) -> Fraction:
    """Return ``Q_r / (p_{r-1} * p_r)`` as an exact :class:`fractions.Fraction`.

    In terms of ``x = p_r / p_{r-1}`` and ``y = p_{r+1} / p_r`` this equals
    ``r*x + 1/x - (r+1)*y``, the scale-free form of the ``ISO_r`` slack.
    Requires ``p_{r-1} * p_r != 0``.
    """
    p = _as_ints(seq)
    denominator = p[r - 1] * p[r]
    if denominator == 0:
        raise ZeroDivisionError("normalized slack needs p_{r-1} * p_r != 0")
    return Fraction(iso_value(p, r), denominator)


# ---------------------------------------------------------------------------
# Descent propagation
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DescentStep:
    """Hypotheses and conclusion of the descent-propagation lemma at index ``r``.

    ``applies`` is ``True`` when all hypotheses of the (weak) lemma hold:
    ``p_{r-1} >= 1``, ``p_{r-1} >= p_r``, ``WR_r`` and ``ISO_r``.  The lemma
    then guarantees ``conclusion`` (``p_{r+1} <= p_r``); ``consistent`` is
    ``not applies or conclusion`` and can only be ``False`` if the lemma
    were wrong.
    """

    r: int
    strict_descent: bool
    weak_descent: bool
    positive: bool
    wr: bool
    iso: bool
    q: int
    conclusion: bool

    @property
    def applies(self) -> bool:
        return self.positive and self.weak_descent and self.wr and self.iso

    @property
    def applies_strict(self) -> bool:
        return self.positive and self.strict_descent and self.wr and self.iso

    @property
    def consistent(self) -> bool:
        return not self.applies or self.conclusion


@dataclass(frozen=True)
class DescentPropagationReport:
    """Result of :func:`descent_propagation_check`; truthy iff consistent."""

    steps: tuple[DescentStep, ...]

    @property
    def consistent(self) -> bool:
        return all(step.consistent for step in self.steps)

    @property
    def applied_at(self) -> list[int]:
        return [step.r for step in self.steps if step.applies]

    def __bool__(self) -> bool:
        return self.consistent


def descent_propagation_check(seq: Sequence[int]) -> DescentPropagationReport:
    """Verify the descent-propagation lemma index by index on ``seq``.

    For every ``r`` in ``1 .. alpha-1`` the hypotheses (descent, ``WR_r``,
    ``ISO_r``) and the conclusion (``p_{r+1} <= p_r``) are evaluated with
    exact integers.  Because the lemma is a theorem, ``report.consistent``
    must be ``True`` for every integer sequence; the report is useful for
    seeing *where* the lemma actually fires.
    """
    p = _as_ints(seq)
    steps = []
    for r in range(1, len(p) - 1):
        a, b, c = p[r - 1], p[r], p[r + 1]
        q = r * b * b + a * a - (r + 1) * a * c
        steps.append(
            DescentStep(
                r=r,
                strict_descent=a > b,
                weak_descent=a >= b,
                positive=a >= 1,
                wr=a <= r * b,
                iso=q >= 0,
                q=q,
                conclusion=c <= b,
            )
        )
    return DescentPropagationReport(tuple(steps))


# ---------------------------------------------------------------------------
# The unimodality framework: WR + ISO up to the cutoff, then TAIL
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FrameworkResult:
    """Outcome of :func:`unimodality_via_framework`.

    Fields
    ------
    alpha, cutoff
        Degree of the sequence and ``L(alpha)``.
    wr_failures, iso_failures
        Indices ``r <= L(alpha)`` where ``WR_r`` respectively ``ISO_r`` fail.
    tail_failures
        Indices ``r >= L(alpha)`` with ``p_r < p_{r+1}``; empty for every
        independence sequence by the TAIL theorem.
    positive
        All entries are ``>= 1`` (true for every independence sequence; the
        lemma needs ``p_{r-1} >= 1`` at each step of the chain).
    hypotheses_hold
        ``WR_r`` and ``ISO_r`` hold for all ``1 <= r <= L(alpha)``.
    certified
        ``hypotheses_hold``, ``positive`` and the tail is non-increasing; then
        the sequence is unimodal by the descent-propagation lemma plus TAIL.
    case
        Which branch of the argument produced the certificate: ``"increasing"``
        (no weak descent at all), ``"descent_after_cutoff"`` (the first weak
        descent is beyond ``L`` so TAIL alone finishes) or ``"lemma_chain"``
        (the lemma is applied at every index in ``lemma_steps``).
    lemma_steps
        Indices ``r`` where the lemma was invoked to derive ``p_{r+1} <= p_r``.
    mode_index
        Index where the certificate places the (start of the) mode.
    unimodal
        Independent direct verdict of :func:`is_unimodal`.

    The object is truthy exactly when ``certified`` is ``True``.
    """

    alpha: int
    cutoff: int
    wr_failures: list[int]
    iso_failures: list[int]
    tail_failures: list[int]
    positive: bool
    hypotheses_hold: bool
    certified: bool
    case: str | None
    lemma_steps: list[int] = field(default_factory=list)
    mode_index: int | None = None
    unimodal: bool = False

    def __bool__(self) -> bool:
        return self.certified


class FrameworkInconsistency(RuntimeError):
    """Raised if the framework certifies a sequence that is not unimodal.

    This cannot happen for a correct implementation because the certificate
    is a proof; the exception exists to make the cross-check explicit.
    """


def unimodality_via_framework(seq: Sequence[int]) -> FrameworkResult:
    """Certify unimodality from ``WR_r`` and ``ISO_r`` for ``r <= L(alpha)``.

    Argument (all inequalities exact):

    1. Let ``d`` be the first weak descent (``p_{d-1} >= p_d``).  If there is
       none, ``p`` is strictly increasing, hence unimodal.
    2. If ``d > L``, then ``p`` is strictly increasing on ``[0, d-1]`` and the
       TAIL property gives ``p_r >= p_{r+1}`` for ``r >= L``; since
       ``d-1 >= L`` this covers ``[d-1, alpha]``, hence unimodal.
    3. If ``d <= L``, apply the descent-propagation lemma at
       ``r = d, d+1, ..., min(L, alpha-1)``: each step has ``p_{r-1} >= p_r``
       (given for ``r = d``, derived for larger ``r``), ``WR_r`` and
       ``ISO_r`` (both hold since ``r <= L``), and yields ``p_{r+1} <= p_r``.
       TAIL covers ``r >= L``.  Hence ``p`` is strictly increasing on
       ``[0, d-1]`` and non-increasing on ``[d-1, alpha]``: unimodal.

    The tail property is a theorem for independence sequences of graphs but
    is *checked* here (``tail_failures``) so that arbitrary integer input
    cannot be mis-certified; likewise positivity of all entries (automatic
    for independence sequences, needed by the lemma) is checked.  The
    certificate is cross-checked against :func:`is_unimodal`; a disagreement
    raises :class:`FrameworkInconsistency`.
    """
    p = _as_ints(seq)
    alpha = len(p) - 1
    cutoff = tail_cutoff(alpha)
    wr_bad = [r for r in range(1, min(cutoff, alpha) + 1) if p[r - 1] > r * p[r]]
    iso_bad = [r for r in range(1, min(cutoff, alpha - 1) + 1) if iso_value(p, r) < 0]
    tail_bad = tail_failures(p)
    positive = all(value >= 1 for value in p)
    direct = unimodality(p)
    hypotheses_hold = not wr_bad and not iso_bad
    if not hypotheses_hold or tail_bad or not positive:
        return FrameworkResult(
            alpha=alpha,
            cutoff=cutoff,
            wr_failures=wr_bad,
            iso_failures=iso_bad,
            tail_failures=tail_bad,
            positive=positive,
            hypotheses_hold=hypotheses_hold,
            certified=False,
            case=None,
            unimodal=direct.unimodal,
        )

    d = first_weak_descent(p)
    lemma_steps: list[int] = []
    if d is None:
        case = "increasing"
        mode_index = alpha
    elif d > cutoff:
        case = "descent_after_cutoff"
        mode_index = d - 1
    else:
        case = "lemma_chain"
        mode_index = d - 1
        for r in range(d, min(cutoff, alpha - 1) + 1):
            a, b, c = p[r - 1], p[r], p[r + 1]
            if not (a >= 1 and a >= b and a <= r * b and iso_value(p, r) >= 0):
                raise FrameworkInconsistency(f"lemma hypotheses unexpectedly fail at r={r}")
            if c > b:
                raise FrameworkInconsistency(f"lemma conclusion fails at r={r}: {p}")
            lemma_steps.append(r)

    if not direct.unimodal:
        raise FrameworkInconsistency(f"framework certified a non-unimodal sequence: {p}")
    if direct.mode_range[0] != mode_index:
        raise FrameworkInconsistency(
            f"certificate mode index {mode_index} disagrees with {direct.mode_range}: {p}"
        )
    return FrameworkResult(
        alpha=alpha,
        cutoff=cutoff,
        wr_failures=wr_bad,
        iso_failures=iso_bad,
        tail_failures=tail_bad,
        positive=True,
        hypotheses_hold=True,
        certified=True,
        case=case,
        lemma_steps=lemma_steps,
        mode_index=mode_index,
        unimodal=True,
    )


def full_report(seq: Sequence[int]) -> dict:
    """Every check of this module on one coefficient sequence, as a plain dict.

    Keys: ``p``, ``alpha``, ``L``, ``unimodal``, ``mode``, ``mode_range``,
    ``log_concave``, ``lc_breaks``, ``first_descent``, ``first_weak_descent``,
    ``wr_violations``, ``wr_violations_le_L``, ``iso_values``,
    ``iso_violations``, ``iso_violations_le_L``,
    ``descent_conditional_iso_violations``, ``tail_ok``, ``tail_failures``,
    ``framework_certified``, ``framework_case``, ``lemma_steps``.
    """
    p = _as_ints(seq)
    alpha = len(p) - 1
    cutoff = tail_cutoff(alpha)
    um = unimodality(p)
    fw = unimodality_via_framework(p)
    wr_bad = wr_failures(p)
    iso_bad = iso_failures(p)
    return {
        "p": p,
        "alpha": alpha,
        "L": cutoff,
        "unimodal": um.unimodal,
        "mode": um.mode_range[0],
        "mode_range": um.mode_range,
        "log_concave": is_log_concave(p),
        "lc_breaks": log_concavity_breaks(p),
        "first_descent": first_descent(p),
        "first_weak_descent": first_weak_descent(p),
        "wr_violations": wr_bad,
        "wr_violations_le_L": [r for r in wr_bad if r <= cutoff],
        "iso_values": iso_values(p),
        "iso_violations": iso_bad,
        "iso_violations_le_L": [r for r in iso_bad if r <= cutoff],
        "descent_conditional_iso_violations": descent_conditional_iso_violations(p),
        "tail_ok": not fw.tail_failures,
        "tail_failures": fw.tail_failures,
        "framework_certified": fw.certified,
        "framework_case": fw.case,
        "lemma_steps": fw.lemma_steps,
    }
