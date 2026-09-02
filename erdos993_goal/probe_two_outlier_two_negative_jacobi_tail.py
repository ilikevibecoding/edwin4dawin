#!/usr/bin/env python3
"""Explore the two-coupling Jacobi tail for two negative gamma factors.

This is an exploratory exact calculation, not yet a theorem certificate.
At p-alpha=13 it derives the top-five Jacobi combination for

    (1-u*t)(1-v*t)(t+c)(t+d)

and clears the two terminal coupling inequalities of the natural modified
two-vertex Jacobi tail.  It reports degrees and coefficient signs before a
full tensor-Bernstein certification is attempted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_two_negative_jacobi_tail_probe_20260805.json"


def ff(x: sp.Expr, h: int) -> sp.Expr:
    return sp.prod((x - j for j in range(h)), start=sp.Integer(1))


def q(numerator: sp.Expr, denominator: sp.Expr) -> sp.Expr:
    value = sp.cancel(sp.sympify(numerator) / sp.sympify(denominator))
    assert not value.atoms(sp.Float)
    return value


Sparse = dict[tuple[int, int, int, int], sp.Expr]


def sparse_add(*values: Sparse) -> Sparse:
    output: Sparse = {}
    for value in values:
        for monomial, coefficient in value.items():
            if monomial in output:
                output[monomial] += coefficient
            else:
                output[monomial] = coefficient
    return {monomial: coefficient for monomial, coefficient in output.items() if coefficient != 0}


def sparse_scale(value: Sparse, scalar: sp.Expr) -> Sparse:
    return {
        monomial: coefficient * scalar
        for monomial, coefficient in value.items()
        if coefficient != 0 and scalar != 0
    }


def sparse_multiply(left: Sparse, right: Sparse) -> Sparse:
    output: Sparse = {}
    for left_monomial, left_coefficient in left.items():
        for right_monomial, right_coefficient in right.items():
            monomial = tuple(a + b for a, b in zip(left_monomial, right_monomial))
            product = left_coefficient * right_coefficient
            if monomial in output:
                output[monomial] += product
            else:
                output[monomial] = product
    return {monomial: coefficient for monomial, coefficient in output.items() if coefficient != 0}


def bernstein_uv(value: Sparse, degree_u: int, degree_v: int, field) -> Sparse:
    """Convert only the bounded u,v variables to their tensor Bernstein basis."""
    degree_c = max((monomial[2] for monomial in value), default=0)
    degree_d = max((monomial[3] for monomial in value), default=0)
    output: Sparse = {}
    for i in range(degree_u + 1):
        for j in range(degree_v + 1):
            for k in range(degree_c + 1):
                for ell in range(degree_d + 1):
                    coefficient = field.zero
                    for a in range(i + 1):
                        for b in range(j + 1):
                            power = value.get((a, b, k, ell), field.zero)
                            if power:
                                multiplier = field.from_sympy(
                                    sp.Rational(
                                        math.comb(i, a) * math.comb(j, b),
                                        math.comb(degree_u, a) * math.comb(degree_v, b),
                                    )
                                )
                                coefficient += power * multiplier
                    if coefficient:
                        output[i, j, k, ell] = coefficient
    return output


YPoly = list[Sparse]


def ypoly_add(left: YPoly, right: YPoly) -> YPoly:
    length = max(len(left), len(right))
    output = []
    for index in range(length):
        a = left[index] if index < len(left) else {}
        b = right[index] if index < len(right) else {}
        output.append(sparse_add(a, b))
    while output and not output[-1]:
        output.pop()
    return output


def ypoly_scale(value: YPoly, scalar: Sparse) -> YPoly:
    return [sparse_multiply(coefficient, scalar) for coefficient in value]


def ypoly_scale_rf(value: YPoly, scalar) -> YPoly:
    return [sparse_scale(coefficient, scalar) for coefficient in value]


def ypoly_y_minus(value: YPoly, scalar) -> YPoly:
    return ypoly_add([{}] + value, ypoly_scale_rf(value, -scalar))


def derive(parity: str) -> dict[str, object]:
    r, u, v, c, d = sp.symbols("r u v c d", nonnegative=True)
    field = sp.QQ.frac_field(r)
    rr = field.gens[0]
    if parity == "even":
        n, p, alpha, beta = rr + 7, 2 * rr + 14, 2 * rr + 1, field.from_sympy(sp.Rational(-1, 2))
    else:
        n, p, alpha, beta = rr + 6, 2 * rr + 13, 2 * rr, field.from_sympy(sp.Rational(1, 2))
    ambient = p + alpha

    def falling_factorial(x, h: int):
        output = field.one
        for j in range(h):
            output *= x - j
        return output

    def top(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        total = alpha + beta
        return (
            -k * (k + alpha) / (2 * k + total),
            k * (k - 1) * (k + alpha - 1) * (k + alpha)
            / (2 * (2 * k + total - 1) * (2 * k + total)),
        )

    def action(j: int) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
        k = n - j
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        upper = field.convert(j)
        diagonal = k + (j + 1) * c0 - upper * c1
        lower = (k - 1) * c0 + (j + 2) * e0 - upper * e1 - diagonal * c0
        return upper, diagonal, lower

    print(f"{parity}: building Jacobi actions", flush=True)
    actions = [action(j) for j in range(5)]
    print(f"{parity}: Jacobi actions done", flush=True)

    def apply(vector: list[sp.Expr], shift: int) -> list[sp.Expr]:
        output = [field.zero] * 5
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 4:
                output[j + 1] += coefficient * lower
        return output

    falling = [[field.one, field.zero, field.zero, field.zero, field.zero]]
    for shift in range(4):
        print(f"{parity}: falling action {shift}", flush=True)
        falling.append(apply(falling[-1], shift))
    print(f"{parity}: falling actions done", flush=True)

    gamma: list[Sparse] = [
        {(0, 0, 1, 1): field.one},
        {
            (0, 0, 1, 0): field.one,
            (0, 0, 0, 1): field.one,
            (1, 0, 1, 1): -field.one,
            (0, 1, 1, 1): -field.one,
        },
        {
            (0, 0, 0, 0): field.one,
            (1, 0, 1, 0): -field.one,
            (0, 1, 1, 0): -field.one,
            (1, 0, 0, 1): -field.one,
            (0, 1, 0, 1): -field.one,
            (1, 1, 1, 1): field.one,
        },
        {
            (1, 1, 1, 0): field.one,
            (1, 1, 0, 1): field.one,
            (1, 0, 0, 0): -field.one,
            (0, 1, 0, 0): -field.one,
        },
        {(1, 1, 0, 0): field.one},
    ]
    V: list[Sparse] = []
    for i in range(5):
        print(f"{parity}: building V{i}", flush=True)
        contributions = []
        for h in range(5):
            scalar = falling_factorial(ambient, h) / falling_factorial(p, 2 * h) * falling[h][i]
            contributions.append(sparse_scale(gamma[h], scalar))
        V.append(sparse_add(*contributions))
    assert not any(
        field.to_sympy(coefficient).atoms(sp.Float)
        for value in V
        for coefficient in value.values()
    )

    def recurrence(k: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        diagonal = c0 - c1
        subdiagonal = e0 - e1 - diagonal * c0
        return diagonal, subdiagonal

    a_last, b_last = recurrence(n - 1)
    a_previous, b_previous = recurrence(n - 2)
    a_ante, b_ante = recurrence(n - 3)
    V0, V1, V2, V3, V4 = V

    # First modified coupling: e_previous=b_previous-D/b_ante.
    print(f"{parity}: building H", flush=True)
    H = sparse_add(sparse_scale(V0, b_previous * b_ante), sparse_scale(V4, -1))

    # With y=D/b_ante and x=[C-y(a_ante-a_last+A)]/(b_previous-y),
    # write x=J/(V0*H).
    L = sparse_add(sparse_scale(V0, a_previous - a_last), V1)
    M = sparse_add(sparse_scale(V0, a_ante - a_last), V1)
    print(f"{parity}: building J", flush=True)
    J = sparse_add(
        sparse_scale(sparse_multiply(V3, V0), b_ante),
        sparse_scale(sparse_multiply(V4, M), -1),
    )

    # Clear e_last=b_last-B+y+x(a_previous-a_last+A)-x^2 by
    # V0^2*b_ante*H^2.
    print(f"{parity}: building R products", flush=True)
    H2 = sparse_multiply(H, H)
    J2 = sparse_multiply(J, J)
    R = sparse_add(
        sparse_scale(sparse_multiply(sparse_multiply(V0, V0), H2), b_last * b_ante),
        sparse_scale(sparse_multiply(sparse_multiply(V2, V0), H2), -b_ante),
        sparse_multiply(sparse_multiply(V4, V0), H2),
        sparse_scale(sparse_multiply(sparse_multiply(J, L), H), b_ante),
        sparse_scale(J2, -b_ante),
    )

    # A less rigid representation attaches a full symmetric 3-by-3 tail to
    # the unchanged Jacobi block of order n-3.  Express
    #
    #   K = Q3(y) p_(n-3)(y) - Q2(y) p_(n-4)(y).
    #
    # The three local Jacobi couplings are positive iff lead(Q2/V0)>0 and
    # the two cleared Euclidean remainders below are positive.
    one_sparse = {(0, 0, 0, 0): field.one}
    zero_poly: YPoly = []
    p_n3 = ([one_sparse], zero_poly)
    p_n4 = (zero_poly, [one_sparse])

    def recurrence_pair(previous_pair, earlier_pair, diagonal, subdiagonal):
        return (
            ypoly_add(
                ypoly_y_minus(previous_pair[0], diagonal),
                ypoly_scale_rf(earlier_pair[0], -subdiagonal),
            ),
            ypoly_add(
                ypoly_y_minus(previous_pair[1], diagonal),
                ypoly_scale_rf(earlier_pair[1], -subdiagonal),
            ),
        )

    p_n2 = recurrence_pair(p_n3, p_n4, a_ante, b_ante)
    p_n1 = recurrence_pair(p_n2, p_n3, a_previous, b_previous)
    p_n0 = recurrence_pair(p_n1, p_n2, a_last, b_last)
    basis_pairs = [p_n0, p_n1, p_n2, p_n3, p_n4]
    Q3: YPoly = []
    R2: YPoly = []
    for coefficient, pair in zip(V, basis_pairs):
        Q3 = ypoly_add(Q3, ypoly_scale(pair[0], coefficient))
        R2 = ypoly_add(R2, ypoly_scale(pair[1], coefficient))
    assert len(Q3) == 4 and len(R2) == 3
    Q2 = [sparse_scale(coefficient, -1) for coefficient in R2]
    A0, A1, A2, A3 = Q3
    B0, B1, B2 = Q2
    assert A3 == V0

    print(f"{parity}: building three-vertex tail remainders", flush=True)
    R1num = sparse_add(
        sparse_multiply(A1, sparse_multiply(B2, B2)),
        sparse_scale(sparse_multiply(A3, sparse_multiply(B0, B2)), -1),
        sparse_scale(
            sparse_multiply(
                sparse_add(sparse_multiply(A2, B2), sparse_scale(sparse_multiply(A3, B1), -1)),
                B1,
            ),
            -1,
        ),
    )
    H1 = sparse_scale(R1num, -1)
    R0num = sparse_add(
        sparse_multiply(A0, sparse_multiply(B2, B2)),
        sparse_scale(
            sparse_multiply(
                sparse_add(sparse_multiply(A2, B2), sparse_scale(sparse_multiply(A3, B1), -1)),
                B0,
            ),
            -1,
        ),
    )
    E2num = sparse_add(
        sparse_multiply(
            sparse_add(sparse_multiply(B1, R1num), sparse_scale(sparse_multiply(B2, R0num), -1)),
            R0num,
        ),
        sparse_scale(sparse_multiply(B0, sparse_multiply(R1num, R1num)), -1),
    )

    records = {}
    for name, value in (
        ("V0", V0),
        ("two_vertex_first_coupling_H", H),
        ("two_vertex_final_coupling_R", R),
        ("three_vertex_first_coupling_B2", B2),
        ("three_vertex_second_coupling_H1", H1),
        ("three_vertex_third_coupling_E2", E2num),
    ):
        print(f"{parity}: screen {name}", flush=True)
        degrees = [max((monomial[index] for monomial in value), default=-1) for index in range(4)]
        records[name] = {
            "degrees_u_v_c_d": degrees,
            "term_count": len(value),
            "distinct_denominator_count": len(
                {
                    str(sp.factor(sp.fraction(field.to_sympy(coefficient))[1]))
                    for coefficient in value.values()
                }
            ),
            "power_coefficients_nonnegative_r": None,
        }
        # This is only a cheap first screen.  A failed power-basis sign does
        # not rule out a Bernstein certificate.
        signs = []
        for coefficient in value.values():
            coefficient_expr = field.to_sympy(coefficient)
            coefficient_num, coefficient_den = sp.fraction(sp.cancel(coefficient_expr))
            num_poly = sp.Poly(sp.expand(coefficient_num), r, domain=sp.QQ)
            den_poly = sp.Poly(sp.expand(coefficient_den), r, domain=sp.QQ)
            if den_poly.LC() < 0:
                num_poly = -num_poly
                den_poly = -den_poly
            signs.append(
                all(x >= 0 for x in num_poly.all_coeffs())
                and any(x > 0 for x in num_poly.all_coeffs())
                and all(x >= 0 for x in den_poly.all_coeffs())
                and den_poly.eval(0) > 0
            )
        records[name]["power_coefficients_nonnegative_r"] = all(signs)
        records[name]["power_bad_count"] = signs.count(False)
        print(f"{parity}: Bernstein transform {name}", flush=True)
        bounded = bernstein_uv(value, degrees[0], degrees[1], field)
        bernstein_signs = []
        bad_indices = []
        for monomial, coefficient in sorted(bounded.items()):
            coefficient_expr = field.to_sympy(coefficient)
            coefficient_num, coefficient_den = sp.fraction(sp.cancel(coefficient_expr))
            num_poly = sp.Poly(sp.expand(coefficient_num), r, domain=sp.QQ)
            den_poly = sp.Poly(sp.expand(coefficient_den), r, domain=sp.QQ)
            if den_poly.LC() < 0:
                num_poly = -num_poly
                den_poly = -den_poly
            good = (
                all(x >= 0 for x in num_poly.all_coeffs())
                and any(x > 0 for x in num_poly.all_coeffs())
                and all(x >= 0 for x in den_poly.all_coeffs())
                and den_poly.eval(0) > 0
            )
            bernstein_signs.append(good)
            if not good and len(bad_indices) < 20:
                bad_indices.append(
                    {
                        "index_u_v_c_d": list(monomial),
                        "numerator_degree_r": num_poly.degree(),
                        "numerator_negative_coefficient_count": sum(
                            coefficient < 0 for coefficient in num_poly.all_coeffs()
                        ),
                        "numerator_digest": hashlib.sha256(
                            ",".join(map(str, num_poly.all_coeffs())).encode("utf-8")
                        ).hexdigest(),
                        "denominator_degree_r": den_poly.degree(),
                    }
                )
        records[name]["bernstein_uv_coefficient_count"] = len(bounded)
        records[name]["bernstein_uv_all_c_d_power_coefficients_nonnegative_r"] = all(
            bernstein_signs
        )
        records[name]["bernstein_uv_bad_count"] = bernstein_signs.count(False)
        records[name]["bernstein_uv_first_bad"] = bad_indices
        print(parity, name, records[name], flush=True)

    return {
        "parity": parity,
        "boundary": {
            "p": str(field.to_sympy(p)),
            "alpha": str(field.to_sympy(alpha)),
            "n": str(field.to_sympy(n)),
        },
        "quantities": records,
        "scope": "Exploratory degree/sign screen; no theorem is asserted.",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("even", "odd", "both"), default="both")
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    parities = ("even", "odd") if args.parity == "both" else (args.parity,)
    report = {
        "status": "TWO_OUTLIER_TWO_NEGATIVE_JACOBI_TAIL_PROBE",
        "records": [derive(parity) for parity in parities],
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
