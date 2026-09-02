#!/usr/bin/env python3
"""Exact finite certificate for the diagonal square-kernel tail pattern.

At d=4 write the transformed square kernel as

    B_N[M(t,s)^2] = A_2(x)+A_3(x)+...+A_6(x),

where A_r collects terms from the first copy of M having total degree r
and the second copy of M is left intact.  Put

    T_r=A_r+A_(r+1)+...+A_6.

The needed diagonal source is T_2.  This program uses rational isolating
intervals (not floating point roots) to certify that the A_r and T_r form
strict adjacent interlacing chains at the requested sizes.  A finite pass is
evidence for the all-order Sturm lemma; it is not that lemma's proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_quadratic_kernel_monomial_components import (
    X,
    Y,
    component_polynomial,
    s,
    seed_coefficients,
    t,
)


HERE = Path(__file__).resolve().parent


def primitive_digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def isolating_intervals(poly: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    """Return disjoint rational intervals, one for every real root."""
    records = sp.polys.polytools.intervals(
        poly,
        eps=sp.Rational(1, 10) ** 50,
    )
    intervals: list[tuple[sp.Rational, sp.Rational]] = []
    for (left, right), multiplicity in records:
        if multiplicity != 1:
            raise AssertionError(
                f"expected simple roots for degree {poly.degree()}, got multiplicity {multiplicity}"
            )
        intervals.append((left, right))
    if len(intervals) != poly.degree():
        raise AssertionError(
            f"degree {poly.degree()} polynomial has only {len(intervals)} real roots"
        )
    return intervals


def strictly_interlaces(
    lower_degree: list[tuple[sp.Rational, sp.Rational]],
    higher_degree: list[tuple[sp.Rational, sp.Rational]],
) -> bool:
    """Certify p_0<q_0<p_1<... using disjoint rational intervals."""
    if len(higher_degree) != len(lower_degree) + 1:
        return False
    return all(
        higher_degree[index][1] < lower_degree[index][0]
        and lower_degree[index][1] < higher_degree[index + 1][0]
        for index in range(len(lower_degree))
    )


def grouped_polynomials(N: int) -> tuple[dict[int, sp.Poly], dict[int, sp.Poly]]:
    a = t * (1 + t)
    b = s * (1 + s)
    M = sp.Poly(
        sp.expand((1 + t) * (1 + s) * (a + b) ** 2 - t * s),
        t,
        s,
        domain=sp.ZZ,
    )
    seeds_x = seed_coefficients(N, X, t)
    seeds_y = seed_coefficients(N, Y, s)
    groups = {degree: sp.S.Zero for degree in range(2, 7)}
    for outer, coefficient in M.terms():
        component = component_polynomial(N, 4, outer, seeds_x, seeds_y)
        groups[sum(outer)] += coefficient * component.as_expr().subs(Y, X)
    A = {
        degree: sp.Poly(sp.expand(expression), X, domain=sp.QQ)
        for degree, expression in groups.items()
    }
    T: dict[int, sp.Poly] = {}
    running = sp.S.Zero
    for degree in range(6, 1, -1):
        running = sp.expand(A[degree].as_expr() + running)
        T[degree] = sp.Poly(running, X, domain=sp.QQ)
    return A, T


def one_size(N: int) -> dict[str, object]:
    A, T = grouped_polynomials(N)
    intervals_A = {degree: isolating_intervals(poly) for degree, poly in A.items()}
    intervals_T = {degree: isolating_intervals(poly) for degree, poly in T.items()}
    adjacent_A = {
        str(degree): strictly_interlaces(intervals_A[degree + 1], intervals_A[degree])
        for degree in range(2, 6)
    }
    adjacent_T = {
        str(degree): strictly_interlaces(intervals_T[degree + 1], intervals_T[degree])
        for degree in range(2, 6)
    }
    # The full tail claim was the discovery hypothesis.  Exact extension
    # shows that only its first step T_3 interlaces T_2 eventually fails
    # (beginning at N=16), while the lower tail T_6,...,T_3 and the raw A
    # ladder remain clean.  Keep that obstruction in the certificate rather
    # than asserting the over-strong statement.
    assert all(adjacent_A.values())
    assert all(adjacent_T[str(degree)] for degree in range(3, 6))
    assert T[2] == sp.Poly(sum(A[r].as_expr() for r in range(2, 7)), X)
    return {
        "N": N,
        "degrees_A": {str(r): A[r].degree() for r in range(2, 7)},
        "degrees_T": {str(r): T[r].degree() for r in range(2, 7)},
        "adjacent_A_strict_interlacing": adjacent_A,
        "adjacent_T_strict_interlacing": adjacent_T,
        "full_tail_chain_passes": all(adjacent_T.values()),
        "T2_sha256": primitive_digest(T[2]),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sizes", default="4,7,10,13,16,19,22")
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "diagonal_component_tail_sturm_20260804.json",
    )
    args = parser.parse_args()
    sizes = [int(value) for value in args.sizes.split(",")]
    records = []
    for N in sizes:
        record = one_size(N)
        records.append(record)
        print(
            f"N={N}: A chain and lower T_3..T_6 chain pass; "
            f"T_3 interlaces T_2={record['adjacent_T_strict_interlacing']['2']}",
            flush=True,
        )
    report = {
        "status": "PASS_FINITE_EXACT_LOWER_TAIL_STURM_WITH_T2_OBSTRUCTION",
        "identity": "T_r=sum_(j=r)^6 A_j and T_2=B_N[M^2]",
        "sizes": sizes,
        "records": records,
        "scope": (
            "All root counts and strict orderings are certified by rational "
            "isolating intervals.  The finite range is not an all-order proof; "
            "the report explicitly records failure of the over-strong T_2/T_3 "
            "interlacing conjecture from N=16 onward."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
