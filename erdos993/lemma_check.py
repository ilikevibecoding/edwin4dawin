"""Exact symbolic verification of the WR+ISO descent lemma and the unimodality assembly.

Lemma (descent).  Let r >= 1 be an integer and a = p_{r-1}, b = p_r, c = p_{r+1} be
positive integers with

    WR_r :  a <= r*b,
    ISO_r:  r*b^2 + a^2 >= (r+1)*a*c,
    a >= b  (a descent or a plateau at r).

Then b >= c.

Proof.  The polynomial identity

    r*b^2 + a^2 - (r+1)*a*b = (r*b - a)*(b - a)

(verified below with sympy) shows that r*b^2 + a^2 <= (r+1)*a*b whenever
r*b - a >= 0 and b - a <= 0.  Hence (r+1)*a*c <= r*b^2 + a^2 <= (r+1)*a*b, and
dividing by (r+1)*a > 0 gives c <= b.                                     QED

Assembly.  Let alpha = deg I(F) and L = ceil((2*alpha-1)/3).  Suppose

    (T)  p_r >= p_{r+1} for all L <= r <= alpha - 1        (decreasing tail),
    (P)  WR_r and ISO_r hold for all 2 <= r <= L - 1        (prefix hypotheses).

Then (p_0, ..., p_alpha) is unimodal.

Proof.  p_0 = 1 <= p_1 = |V| for a non-empty forest, so the first strict descent,
if any, occurs at some r0 >= 2 (p_{r0-1} > p_{r0}) and p is non-decreasing on
[0, r0-1].  If r0 >= L, (T) gives p non-increasing on [r0-1, alpha] (using the
given strict descent at r0 when r0 = L) and we are done.  If r0 <= L-1, the
descent lemma with r = r0 gives p_{r0} >= p_{r0+1}; inductively, for each
r in [r0, L-1] the hypothesis p_{r-1} >= p_r together with WR_r and ISO_r gives
p_r >= p_{r+1}, so p is non-increasing on [r0-1, L], and (T) extends this to
[r0-1, alpha].                                                             QED

The script (i) verifies the identity symbolically, (ii) exhaustively checks the
integer lemma on a finite grid, and (iii) checks the assembly on the grid of all
sequences that satisfy the hypotheses for small alpha with bounded entries,
by brute force (a finite sanity check of the logic, not a proof of unimodality).
"""

from __future__ import annotations

import itertools
import sys

import sympy as sp

from checks import L_cutoff, is_unimodal


def verify_identity() -> None:
    r, a, b, x = sp.symbols("r a b x")
    lhs = sp.expand(r * b**2 + a**2 - (r + 1) * a * b)
    rhs = sp.expand((r * b - a) * (b - a))
    assert sp.simplify(lhs - rhs) == 0, "identity failed"
    # ratio form used in the handoff:  r x + 1/x - (r+1) = (r x - 1)(x - 1)/x
    lhs2 = sp.together(r * x + 1 / x - (r + 1))
    rhs2 = (r * x - 1) * (x - 1) / x
    assert sp.simplify(lhs2 - rhs2) == 0, "ratio identity failed"
    print("identity  r b^2 + a^2 - (r+1) a b == (r b - a)(b - a)             : verified symbolically")
    print("identity  r x + 1/x - (r+1)     == (r x - 1)(x - 1)/x               : verified symbolically")


def check_integer_lemma(bound: int = 40, rmax: int = 10) -> None:
    checked = 0
    for r in range(1, rmax + 1):
        for a in range(1, bound + 1):
            for b in range(1, bound + 1):
                if not (a <= r * b and a >= b):
                    continue
                for c in range(1, bound + 1):
                    if r * b * b + a * a >= (r + 1) * a * c:
                        checked += 1
                        assert b >= c, (r, a, b, c)
    print(f"integer descent lemma: {checked} hypothesis-satisfying triples checked, no counterexample")


def check_assembly(alpha_max: int = 6, vmax: int = 6) -> None:
    """Brute force: every sequence with p_0=1, p_1>=1 and 1<=p_r<=vmax that satisfies (T) and (P) is unimodal."""
    total = 0
    for alpha in range(1, alpha_max + 1):
        L = L_cutoff(alpha)
        for tail in itertools.product(range(1, vmax + 1), repeat=alpha):
            p = (1,) + tail
            ok_T = all(p[r] >= p[r + 1] for r in range(L, alpha))
            if not ok_T:
                continue
            ok_P = True
            for r in range(2, min(L - 1, alpha - 1) + 1):
                a, b, c = p[r - 1], p[r], p[r + 1]
                if not (a <= r * b and r * b * b + a * a >= (r + 1) * a * c):
                    ok_P = False
                    break
            if not ok_P:
                continue
            total += 1
            assert is_unimodal(p), p
    print(f"assembly (T)+(P) => unimodal: {total} sequences with alpha<={alpha_max}, entries<={vmax}: all unimodal")


if __name__ == "__main__":
    verify_identity()
    check_integer_lemma()
    check_assembly()
    print("LEMMA_CHECK_PASS")
    sys.exit(0)
