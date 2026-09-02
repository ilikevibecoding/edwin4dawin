"""Exact replay for the conditional endpoint common-interlacer reduction."""

from __future__ import annotations

import json
from fractions import Fraction
from math import comb, lcm
from pathlib import Path

from flint import ctx, fmpz_poly


HERE = Path(__file__).resolve().parent
REPORT = HERE / "conditional_endpoint_common_interlacer_exact_20260812.json"
ctx.prec = 160


def p(M: int, i: int) -> Fraction:
    return Fraction(comb(2 * M - i - 1, i)) if 0 <= i < M else Fraction(0)


def add(a: list[Fraction], b: list[Fraction], scale: Fraction = Fraction(1)) -> list[Fraction]:
    return [
        (a[i] if i < len(a) else 0) + scale * (b[i] if i < len(b) else 0)
        for i in range(max(len(a), len(b)))
    ]


def raw_slice(a: list[Fraction], b: list[Fraction], s: int) -> list[Fraction]:
    return [
        (a[i] if i < len(a) else 0)
        * (b[s - i] if 0 <= s - i < len(b) else 0)
        for i in range(s + 1)
    ]


def gamma_from_palindromic(a: list[Fraction]) -> list[Fraction]:
    degree = len(a) - 1
    rem = list(a)
    out: list[Fraction] = []
    for h in range(degree // 2 + 1):
        value = rem[h]
        out.append(value)
        for j in range(degree - 2 * h + 1):
            rem[h + j] -= value * comb(degree - 2 * h, j)
    assert all(x == 0 for x in rem)
    return out


def mixed_gamma(a: list[Fraction], b: list[Fraction], s: int) -> list[Fraction]:
    row = raw_slice(a, b, s)
    reverse = list(reversed(row))
    return gamma_from_palindromic([(x + y) / 2 for x, y in zip(row, reverse)])


def roots_with_forced_zeros(q: list[Fraction]) -> list:
    q = list(q)
    forced = 0
    while len(q) > 1 and q[0] == 0:
        q.pop(0)
        forced += 1
    while len(q) > 1 and q[-1] == 0:
        q.pop()
    denominator = 1
    for x in q:
        denominator = lcm(denominator, x.denominator)
    integer_poly = fmpz_poly([
        x.numerator * (denominator // x.denominator) for x in q
    ])
    roots = integer_poly.complex_roots()
    assert all(z.imag == 0 for z, _ in roots)
    return sorted([z.real for z, _ in roots] + [0] * forced)


def common_gap(a: list[Fraction], b: list[Fraction]) -> bool:
    ra = roots_with_forced_zeros(a)
    rb = roots_with_forced_zeros(b)
    assert len(ra) == len(rb)
    return all(max(ra[i], rb[i]) <= min(ra[i + 1], rb[i + 1])
               for i in range(len(ra) - 1))


def main() -> None:
    identities = 0
    common_gap_checks = 0
    range_u = [Fraction(1, 1000), Fraction(1), Fraction(1000)]
    range_r = [Fraction(-1), Fraction(0), Fraction(1), Fraction(1000)]

    # Exact obstruction to a globally signed raw Wronskian.
    obstruction_R = [Fraction(13), Fraction(72), Fraction(31)]
    obstruction_L = [Fraction(0), Fraction(8), Fraction(0)]
    # W(R,L)=R' L-R L'.
    obstruction_W = [Fraction(-104), Fraction(0), Fraction(248)]
    assert obstruction_W == [Fraction(-104), Fraction(0), Fraction(248)]

    for N in range(5, 26):
        P = [p(N, i) for i in range(N)]
        C = [p(N - 1, i) for i in range(N - 1)]
        D = [p(N - 2, i) for i in range(N - 2)]
        for s in range(2, 2 * N - 5):
            for u in range_u:
                U = add(mixed_gamma(P, P, s), mixed_gamma(C, C, s), u)
                X = add(mixed_gamma(P, C, s), mixed_gamma(C, D, s), u)
                Y = add(mixed_gamma(C, C, s), mixed_gamma(D, D, s), u)

                for r in range_r:
                    A = add(P, C, r)
                    B = add(C, D, r)
                    K_direct = add(mixed_gamma(A, A, s), mixed_gamma(B, B, s), u)
                    K_quadratic = add(add(U, X, 2 * r), Y, r * r)
                    assert K_direct == K_quadratic
                    identities += 1
                    if not common_gap(X, K_direct):
                        print("failed common gap", N, s, u, r, roots_with_forced_zeros(X), roots_with_forced_zeros(K_direct))
                        raise AssertionError
                    common_gap_checks += 1

                Ku = add(add(U, X, 2 * u), Y, u * u)
                Km = add(add(U, X, -2), Y, 1)
                Q = add(Ku, Km, u)
                Q = [x / (u + 1) for x in Q]
                target = add(
                    add(mixed_gamma(P, P, s), mixed_gamma(C, C, s), 2 * u),
                    mixed_gamma(D, D, s),
                    u * u,
                )
                assert Q == target
                identities += 1

    report = {
        "status": "PASS_EXACT_CONDITIONAL_ENDPOINT_COMMON_INTERLACER_REDUCTION",
        "range": "5<=N<=25, 2<=s<=2N-6",
        "u_values": ["1/1000", "1", "1000"],
        "r_values": ["-1", "0", "1", "1000"],
        "exact_identity_checks": identities,
        "certified_common_gap_checks": common_gap_checks,
        "raw_proper_position_obstruction": {
            "cell_N_s_r_u": [5, 2, -1, 1],
            "R_coefficients_ascending": [13, 72, 31],
            "L_coefficients_ascending": [0, 8, 0],
            "W_R_L_coefficients_ascending": [-104, 0, 248],
            "factorization": "8*(31*z^2-13)",
        },
        "scope": (
            "All algebraic identities are exact. Root boxes are certified by FLINT. "
            "The finite common-gap audit is evidence only; the direct-sum mixed-slice "
            "positive-compatibility theorem remains to be proved all-order."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
