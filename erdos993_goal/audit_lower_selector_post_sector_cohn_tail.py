"""Exact diagnostic for the final two Cohn/Schur reflection parameters.

For P(z)=q(Rz)/q(0)=sum b_j R^j z^j, R^2=A, one Cohn
reduction preserves the form sum b'_j R^j z^j.  This makes every squared
reflection parameter rational.  If the final two parameters have modulus
greater than one, Cohn's rule supplies two target-disk roots directly.
"""

from __future__ import annotations

from flint import fmpq

from probe_lower_selector_tail3_flint_full import (
    duran_coefficients,
    selector_gamma,
)


def reflection_squares(A: fmpq, coefficients: list[fmpq]) -> list[fmpq]:
    """Return |kappa_n|^2 for n=m,m-1,...,1, exactly over QQ."""
    b = coefficients[:]
    result = []
    while len(b) > 1:
        n = len(b) - 1
        ratio = b[n] / b[0]
        result.append(A**n * ratio**2)
        b = [
            b[j] - A ** (n - j) * ratio * b[n - j]
            for j in range(n)
        ]
    return result


def main(max_d: int = 30) -> None:
    minimum_last = None
    minimum_penultimate = None
    cells = 0
    count_agreement = 0
    for d in range(5, max_d + 1):
        for r in range(d - 4):
            N = d + r
            for s in range(r + 1, N + r + 1):
                a = max(0, s - N + 1)
                gamma = selector_gamma(N, s)[a:]
                m = len(gamma) - 1
                if m < 7:
                    continue
                p = d + s - 2 * a
                n = p // 2
                x = n - m + 1
                A = fmpq(x) * fmpq(2 * x + (1 if p % 2 else -1), 2)
                if A > (m - 1) ** 2:
                    continue
                q = duran_coefficients(d + s - a, gamma)
                kappasq = reflection_squares(A, q)
                last = kappasq[-1]
                penultimate = kappasq[-2]
                record = (last, (d, r, s, a, m))
                if minimum_last is None or last < minimum_last[0]:
                    minimum_last = record
                record = (penultimate, (d, r, s, a, m))
                if minimum_penultimate is None or penultimate < minimum_penultimate[0]:
                    minimum_penultimate = record
                # Cohn recursion, reconstructed from degree one upward.  For
                # |kappa_n|<1 the number I_n of disk roots is I_(n-1); for
                # |kappa_n|>1 it is n-I_(n-1).
                inside = 0
                trajectory = []
                for degree, square in enumerate(reversed(kappasq), 1):
                    assert square != 1
                    if square > 1:
                        inside = degree - inside
                    trajectory.append(inside)
                if inside < 2:
                    print("ROOT_COUNT_FAILURE", d, r, s, a, m, trajectory)
                    return
                # Independent exact consequence of the already-proved
                # Pochhammer zero-count theorem: q has at least m-2 negative
                # roots.  Count which of those certified roots lie in the
                # target disk by an exact Sturm count on (-R,0), represented
                # without adjoining R by even/odd splitting after z=-R*x.
                # (The comparison itself is supplied by the existing Sturm
                # engine; this script currently records Cohn only.)
                cells += 1
    print("PASS_EXACT_DIAGNOSTIC", max_d, "cells", cells)
    print("minimum_kappa1_sq", minimum_last, float(minimum_last[0]))
    print("minimum_kappa2_sq", minimum_penultimate, float(minimum_penultimate[0]))


if __name__ == "__main__":
    import sys

    main(int(sys.argv[1]) if len(sys.argv) > 1 else 30)
