"""Fast exact coefficient-polynomial audit for the quartic lower tails.

This deliberately keeps every coefficient as a ``Poly(n, QQ)`` and uses the
16-term sparse quartic discriminant formula.  It is intended to distinguish
finite-N support patterns from genuine eventual behavior without factoring all
339 coefficient polynomials.
"""

from __future__ import annotations

import importlib.util
from collections import Counter
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "tail", HERE / "verify_degree4_tail_amgm_symbolic.py"
)
assert SPEC and SPEC.loader
tail = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tail)
n, c, q, u = tail.n, tail.c, tail.q, tail.u

Exponent = tuple[int, int, int]
Sparse = dict[Exponent, sp.Poly]
CEILING = (6, 12, 6)


def as_poly(value: sp.Expr) -> sp.Poly:
    polynomial = sp.Poly(sp.cancel(value), n, domain=sp.QQ)
    assert polynomial.as_expr() == sp.cancel(value)
    return polynomial


def add_term(answer: Sparse, exponent: Exponent, value: sp.Poly) -> None:
    if value.is_zero:
        return
    if exponent in answer:
        value = answer[exponent] + value
    if value.is_zero:
        answer.pop(exponent, None)
    else:
        answer[exponent] = value


def multiply(left: Sparse, right: Sparse) -> Sparse:
    answer: Sparse = {}
    for a_exp, a_value in left.items():
        for b_exp, b_value in right.items():
            exponent = tuple(a_exp[j] + b_exp[j] for j in range(3))
            if any(exponent[j] > CEILING[j] for j in range(3)):
                continue
            add_term(answer, exponent, a_value * b_value)
    return answer


def power(polynomial: Sparse, exponent: int) -> Sparse:
    answer: Sparse = {(0, 0, 0): sp.Poly(1, n, domain=sp.QQ)}
    for _ in range(exponent):
        answer = multiply(answer, polynomial)
    return answer


def input_coefficients(delta: int, forced_defect: int) -> list[Sparse]:
    mixed = {
        pair: tail.mixed_core(*pair, delta, forced_defect)
        for pair in ((0, 0), (1, 1), (0, 1), (1, 2), (2, 2))
    }
    answer = []
    for index in range(5):
        U = mixed[0, 0][index] + u * mixed[1, 1][index]
        X = mixed[0, 1][index] + u * mixed[1, 2][index]
        Y = mixed[1, 1][index] + u * mixed[2, 2][index]
        expression = sp.expand(
            X + c * (U + 2 * (q - 1) * X + (q - 1) ** 2 * Y)
        )
        answer.append({exp: as_poly(value) for exp, value in sp.Poly(expression, c, q, u).terms()})
    return answer


def discriminant_coefficients(delta: int, forced_defect: int) -> Sparse:
    inputs = input_coefficients(delta, forced_defect)
    powers = {
        (index, exponent): power(inputs[index], exponent)
        for index in range(5)
        for exponent in range(5)
    }
    answer: Sparse = {}
    for scalar, exponents in tail.QUARTIC_DISCRIMINANT:
        product: Sparse = {(0, 0, 0): sp.Poly(scalar, n, domain=sp.QQ)}
        for index, exponent in enumerate(exponents):
            if exponent:
                product = multiply(product, powers[index, exponent])
        for monomial, value in product.items():
            add_term(answer, monomial, value)
    return answer


def direct_coefficients(N: int, delta: int) -> dict[Exponent, int]:
    verifier_spec = importlib.util.spec_from_file_location(
        "direct", HERE / "verify_conditional_endpoint_discriminant_positivity.py"
    )
    assert verifier_spec and verifier_spec.loader
    direct = importlib.util.module_from_spec(verifier_spec)
    verifier_spec.loader.exec_module(direct)
    core, _, degree = direct.family(N, 2 * N - delta)
    assert degree == 4
    return {
        exponent: int(value)
        for exponent, value in sp.Poly(sp.discriminant(core, direct.t), direct.c, direct.q, direct.u).terms()
    }


def sign(value: sp.Rational) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0


def audit(delta: int, forced_defect: int) -> None:
    coefficients = discriminant_coefficients(delta, forced_defect)
    print(f"tail delta={delta}: {len(coefficients)} nonzero coefficient polynomials")

    # Independent exact numeric replays at the first valid N and at N=40.
    for N in (12, 13, 40):
        symbolic = {exp: int(poly.eval(N)) for exp, poly in coefficients.items() if poly.eval(N)}
        direct = direct_coefficients(N, delta)
        assert symbolic == direct
        negative = sorted(exp for exp, value in symbolic.items() if value < 0)
        print(f"  N={N}: direct replay PASS; negatives={len(negative)} {negative}")

    leading_negative = sorted(exp for exp, poly in coefficients.items() if poly.LC() < 0)
    leading_positive = sorted(exp for exp, poly in coefficients.items() if poly.LC() > 0)
    assert len(leading_negative) + len(leading_positive) == len(coefficients)
    print(
        f"  eventual leading signs: +{len(leading_positive)} / -{len(leading_negative)}; "
        f"degree distribution={dict(sorted(Counter(poly.degree() for poly in coefficients.values()).items()))}"
    )
    print(f"  eventual-negative exponents: {leading_negative}")
    for N in (100, 1000, 10**6):
        counts = Counter(sign(poly.eval(N)) for poly in coefficients.values())
        print(f"  N={N}: +{counts[1]} / -{counts[-1]} / 0={counts[0]}")

    # Candidate circuit midpoints for the eventual negative support.  Rank by
    # the asymptotic exponent of 2 sqrt(A B) / |negative| and then its leading
    # constant.  This makes growing-margin pairings visible without factoring.
    positives = {exp: poly for exp, poly in coefficients.items() if poly.LC() > 0}
    negatives = {exp: poly for exp, poly in coefficients.items() if poly.LC() < 0}
    selections = []
    for neg_exp, neg_poly in negatives.items():
        candidates = []
        for left_exp, left_poly in positives.items():
            right_exp = tuple(2 * neg_exp[j] - left_exp[j] for j in range(3))
            if right_exp not in positives or left_exp > right_exp:
                continue
            right_poly = positives[right_exp]
            growth_twice = left_poly.degree() + right_poly.degree() - 2 * neg_poly.degree()
            leading_ratio_squared = sp.cancel(
                4 * left_poly.LC() * right_poly.LC() / neg_poly.LC() ** 2
            )
            candidates.append((growth_twice, leading_ratio_squared, left_exp, right_exp))
        candidates.sort(key=lambda item: (item[0], float(item[1])), reverse=True)
        if not candidates:
            print(f"  NO eventual-positive midpoint pair for {neg_exp}")
            continue
        growth, ratio_squared, left, right = candidates[0]
        selections.append((neg_exp, left, right, sp.sqrt(ratio_squared)))
        print(
            f"  best {neg_exp}: {left}<->{right}; ratio^2 ~ "
            f"({ratio_squared}) n^({growth})"
        )
    loads: dict[Exponent, float] = {}
    for _, left, right, ratio in selections:
        share = 1 / float(ratio)
        loads[left] = loads.get(left, 0.0) + share
        loads[right] = loads.get(right, 0.0) + share
    print(f"  naive asymptotic equal-share max endpoint load={max(loads.values()):.6f}")
    print(f"  overloads={[(exp, value) for exp, value in sorted(loads.items()) if value > 1]}")
    degrees = Counter(endpoint for _, left, right, _ in selections for endpoint in (left, right))
    margins = []
    for negative, left, right, ratio in selections:
        allocated_ratio = float(ratio) / (degrees[left] * degrees[right]) ** 0.5
        margins.append((allocated_ratio, negative, left, right, degrees[left], degrees[right]))
    print(f"  uniform-incidence allocation minimum ratio={min(margins)}")
    print(f"  endpoint incidence degrees={dict(sorted(degrees.items()))}")


def main() -> None:
    audit(10, 9)
    audit(11, 10)


if __name__ == "__main__":
    main()
