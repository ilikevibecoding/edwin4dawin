#!/usr/bin/env python3
"""Exact terminal ISO leaf remainder for a star plus isolates.

Let F=K_{1,m} disjoint_union t K_1, distinguish one star leaf ell,
and put

    D_r(F,ell)=Q_r(F)-Q_r(F-ell)-Q_{r-1}(F-{ell,v}),

where Q_r(p)=r p_r^2+p_{r-1}^2-(r+1)p_{r-1}p_{r+1}.
This verifier proves D_r>=0 for every m>=1, t>=0 and r>=2.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_leaf_star_isolate_terminal_exact_agent_20260829.json"


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def q_value(row: list[int], rank: int) -> int:
    def c(k: int) -> int:
        return row[k] if 0 <= k < len(row) else 0

    return rank * c(rank) ** 2 + c(rank - 1) ** 2 - (rank + 1) * c(rank - 1) * c(rank + 1)


def rows(m: int, t: int) -> tuple[list[int], list[int], list[int]]:
    """Return I(F), I(F-ell), I(F-{ell,v})."""
    degree = m + t + 2
    full = [choose(m + t, k) + choose(t, k - 1) for k in range(degree)]
    deleted = [choose(m + t - 1, k) + choose(t, k - 1) for k in range(degree)]
    link = [choose(m + t - 1, k) for k in range(degree)]
    while len(full) > 1 and full[-1] == 0:
        full.pop()
    while len(deleted) > 1 and deleted[-1] == 0:
        deleted.pop()
    while len(link) > 1 and link[-1] == 0:
        link.pop()
    return full, deleted, link


def direct_remainder(m: int, t: int, rank: int) -> int:
    full, deleted, link = rows(m, t)
    return q_value(full, rank) - q_value(deleted, rank) - q_value(link, rank - 1)


def symbolic_identity() -> dict[str, str]:
    N, t, r = sp.symbols("N t r", integer=True, positive=True)
    b, q = sp.symbols("b q", nonnegative=True)

    # b=C(N,r-2), q=C(t,r-2).  Adjacent binomial rows are written
    # rationally relative to these two central entries.
    def relative(base: sp.Expr, order: sp.Expr, shift: int) -> sp.Expr:
        out = base
        if shift > 0:
            for j in range(shift):
                out *= (order - (r - 2 + j)) / (r - 1 + j)
        elif shift < 0:
            for j in range(-shift):
                out *= (r - 2 - j) / (order - r + 3 + j)
        return sp.factor(out)

    bn = {j: relative(b, N, j) for j in range(-2, 4)}
    bt = {j: relative(q, t, j) for j in range(-2, 4)}

    # Offsets below are relative to the target rank r.
    def full(off: int) -> sp.Expr:
        return bn[off + 2] + bn[off + 1] + bt[off + 1]

    def deleted(off: int) -> sp.Expr:
        return bn[off + 2] + bt[off + 1]

    def link(off: int) -> sp.Expr:
        return bn[off + 2]

    def Q(fun, rank_shift: int = 0) -> sp.Expr:
        rr = r + rank_shift
        return sp.expand(
            rr * fun(rank_shift) ** 2
            + fun(rank_shift - 1) ** 2
            - (rr + 1) * fun(rank_shift - 1) * fun(rank_shift + 1)
        )

    remainder = sp.factor(Q(full) - Q(deleted) - Q(link, -1))
    A = (N + 1) * (2 * r - 1) * (N - r + 2)
    H = (
        -N**2 * r**2
        + N**2
        + 2 * N * r**2 * t
        + N * r**2
        - 2 * N * r
        + 3 * N
        - r**2 * t**2
        + r**2 * t
        + 2 * r**2
        - 2 * r * t
        - 4 * r
        + t**2
        + 3 * t
        + 4
    )
    target = b * (b * A + q * H) / (r * (r - 1) ** 2)
    assert sp.factor(sp.together(remainder - target)) == 0

    d = sp.symbols("d", integer=True, nonnegative=True)
    H_shifted = sp.factor(H.subs(N, t + d))
    H_expected = (
        -(r**2 - 1) * d**2
        + d * (r**2 - 2 * r + 2 * t + 3)
        + 2 * (t + 1) * (r * (r - 2) + t + 2)
    )
    assert sp.expand(H_shifted - H_expected) == 0

    # Rank two is outside the adjacent-binomial normalization above.
    m = sp.symbols("m", integer=True, positive=True)
    rank_two = (8 * m * t + 6 * m + 5 * t**2 + t - 2) / 2
    assert sp.expand(rank_two.subs(m, 1)) == (5 * t**2 + 9 * t + 4) / 2

    x = sp.symbols("x", nonnegative=True)
    k = sp.symbols("k", integer=True, positive=True)
    envelope = x / (1 + x) ** (k + 1)
    derivative = sp.factor(sp.diff(envelope, x))
    derivative_target = -(k * x - 1) / (x + 1) ** (k + 2)
    assert sp.simplify(derivative - derivative_target) == 0
    # max_x envelope = k^k/(k+1)^(k+1) <= 1/(k+1).
    max_value = k**k / (k + 1) ** (k + 1)
    max_gap_target = ((k + 1) ** k - k**k) / (k + 1) ** (k + 1)
    assert sp.simplify(1 / (k + 1) - max_value - max_gap_target) == 0
    ratio_gap_target = (r - 2) / ((r - 1) * (r + 1))
    assert sp.simplify(
        (2 * r - 1) / (r**2 - 1) - 1 / (r - 1) - ratio_gap_target
    ) == 0

    return {
        "rank_at_least_three": str(target),
        "A": str(A),
        "H": str(H),
        "H_after_N_equals_t_plus_d": str(H_expected),
        "rank_two": str(rank_two),
        "calculus_envelope": str(envelope),
        "calculus_envelope_derivative": str(derivative_target),
    }


def literal_replay() -> dict[str, object]:
    checks = 0
    minimum: dict[str, int] | None = None
    stream = hashlib.sha256()
    for m in range(1, 121):
        for t in range(0, 121):
            alpha = m + t
            full, deleted, link = rows(m, t)
            for rank in range(2, alpha + 4):
                value = (
                    q_value(full, rank)
                    - q_value(deleted, rank)
                    - q_value(link, rank - 1)
                )
                assert value >= 0
                checks += 1
                stream.update(f"{m},{t},{rank},{value};".encode())
                if minimum is None or value < minimum["value"]:
                    minimum = {"value": value, "m": m, "t": t, "rank": rank}

                if rank == 2:
                    expected = (8 * m * t + 6 * m + 5 * t * t + t - 2) // 2
                    assert value == expected
                elif 3 <= rank <= alpha + 1:
                    N = m + t - 1
                    b = choose(N, rank - 2)
                    q = choose(t, rank - 2)
                    A = (N + 1) * (2 * rank - 1) * (N - rank + 2)
                    H = (
                        -N * N * rank * rank
                        + N * N
                        + 2 * N * rank * rank * t
                        + N * rank * rank
                        - 2 * N * rank
                        + 3 * N
                        - rank * rank * t * t
                        + rank * rank * t
                        + 2 * rank * rank
                        - 2 * rank * t
                        - 4 * rank
                        + t * t
                        + 3 * t
                        + 4
                    )
                    numerator = b * (b * A + q * H)
                    denominator = rank * (rank - 1) ** 2
                    assert numerator % denominator == 0
                    assert value == numerator // denominator

    return {
        "literal_parameter_checks": checks,
        "literal_ranges": {"m": [1, 120], "t": [0, 120]},
        "minimum": minimum,
        "value_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_ALL_ORDER_ISO_LEAF_STAR_PLUS_ISOLATES_TERMINAL",
        "scope": (
            "For F=K_(1,m) disjoint_union tK1, m>=1, t>=0, and a "
            "distinguished star leaf ell, D_r(F,ell)>=0 for every r>=2."
        ),
        "symbolic": symbolic_identity(),
        "positivity_argument": [
            "For r>=3 put N=m+t-1, b=C(N,r-2), q=C(t,r-2).",
            "The exact remainder is b(b*A+q*H)/(r(r-1)^2).",
            "If q=0 or H>=0 the sign is immediate.",
            "Otherwise q/b<= (t/N)^(r-2), since every factor "
            "(t-j)/(N-j)<=t/N.",
            "With d=N-t, H>=-(r^2-1)d^2 and "
            "A>=(2r-1)(N+1)d.",
            "Writing x=d/t and k=r-2, "
            "(t/N)^k*d/(N+1)<x/(1+x)^(k+1)<=1/(k+1) "
            "<= (2r-1)/(r^2-1).",
            "Rank two equals (8mt+6m+5t^2+t-2)/2>0.",
        ],
        "literal_replay": literal_replay(),
        "warning": (
            "This proves the enlarged terminal base only.  It does not prove "
            "the nonsibling nested-leaf recurrence needed to reduce an "
            "arbitrary forest to this base."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print(f"REPORT_SHA256 {hashlib.sha256(raw.encode()).hexdigest().upper()}")
    print(report["marker"])


if __name__ == "__main__":
    main()
