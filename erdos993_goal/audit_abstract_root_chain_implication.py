#!/usr/bin/env python3
"""Exact counterexamples to abstract implications toward root chain (62.4)."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "abstract_root_chain_counterexamples_exact_20260810.json"
t, lam = sp.symbols("t lam")


def q(value: Fraction) -> sp.Rational:
    return sp.Rational(value.numerator, value.denominator)


def polynomial(scale: Fraction, roots: tuple[int, int]) -> list[Fraction]:
    r1, r2 = map(Fraction, roots)
    return [scale, scale * (1 / r1 + 1 / r2), scale / (r1 * r2)]


def convolution(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
    answer = [Fraction(0)] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            answer[i + j] += x * y
    return answer


def discriminant_pencil(left: list[Fraction], right: list[Fraction]) -> sp.Poly:
    coefficients = [q(left[i]) + lam * q(right[i]) for i in range(3)]
    return sp.Poly(sp.expand(coefficients[1] ** 2 - 4 * coefficients[0] * coefficients[2]), lam)


def path_coefficients(n: int) -> list[Fraction]:
    return [Fraction(sp.binomial(n - i, i)) for i in range(n // 2 + 1)]


def jensen(coefficients: list[Fraction], order: int, scale: Fraction) -> list[Fraction]:
    answer = [Fraction(0)] * (order + 1)
    for i in range(min(order, len(coefficients) - 1) + 1):
        answer[i] = Fraction(sp.factorial(order), sp.factorial(order - i)) * coefficients[i] * scale**i
    return answer


def path_jensen_replay() -> int:
    identities = 0
    for s in range(2, 9):
        for n in (4 * s + 9, 4 * s + 10):
            qn = path_coefficients(n)
            qsmall = path_coefficients(n - 4)
            block = jensen(qn, s, Fraction(-1, 4))
            block_small = jensen(qsmall, s, Fraction(-1, 4))

            pieces = [path_coefficients(n - shift) for shift in range(2, 6)]
            length = max(map(len, pieces))
            ell = [
                sum(piece[i] if i < len(piece) else 0 for piece in pieces)
                for i in range(length)
            ]
            separator = jensen(ell, s - 1, Fraction(-1, 4))
            right = [Fraction(0)] + [Fraction(-s, 4) * value for value in separator]
            assert [block[i] - block_small[i] for i in range(s + 1)] == right
            identities += 1
    return identities


def verify_case(
    name: str,
    a_scale: Fraction,
    a_roots: tuple[int, int],
    b_roots: tuple[int, int],
    c_roots: tuple[int, int],
) -> dict[str, object]:
    a = polynomial(a_scale, a_roots)
    b = polynomial(Fraction(1), b_roots)
    c = polynomial(Fraction(1), c_roots)

    # The roots are exactly the negative integers listed here; scaling does
    # not move them.  Each adjacent pair has overlapping open root intervals.
    roots_a = sorted((-Fraction(a_roots[0]), -Fraction(a_roots[1])))
    roots_b = sorted((-Fraction(b_roots[0]), -Fraction(b_roots[1])))
    roots_c = sorted((-Fraction(c_roots[0]), -Fraction(c_roots[1])))
    assert max(roots_a[0], roots_b[0]) < min(roots_a[1], roots_b[1])
    assert max(roots_b[0], roots_c[0]) < min(roots_b[1], roots_c[1])

    discriminants = [discriminant_pencil(a, b), discriminant_pencil(b, c)]
    for disc in discriminants:
        assert all(value > 0 for value in disc.all_coeffs())

    ratio_checks: list[dict[str, str]] = []
    for h in range(2):
        lower = b[h + 1] / c[h + 1]
        middle = a[h] / b[h]
        upper = b[h] / c[h]
        assert lower < middle < upper
        ratio_checks.append(
            {"h": str(h), "lower": str(lower), "middle": str(middle), "upper": str(upper)}
        )
    terminal_middle = a[2] / b[2]
    terminal_upper = b[2] / c[2]
    assert terminal_middle < terminal_upper

    turan = [x - y for x, y in zip(convolution(b, b), convolution(a, c))]
    assert all(value > 0 for value in turan)

    return {
        "name": name,
        "A_coefficients": list(map(str, a)),
        "B_coefficients": list(map(str, b)),
        "C_coefficients": list(map(str, c)),
        "A_roots": list(map(str, roots_a)),
        "B_roots": list(map(str, roots_b)),
        "C_roots": list(map(str, roots_c)),
        "adjacent_pencil_discriminants": [str(sp.factor(disc.as_expr())) for disc in discriminants],
        "ratio_checks": ratio_checks,
        "terminal_ratio": {"middle": str(terminal_middle), "upper": str(terminal_upper)},
        "turan_coefficients": list(map(str, turan)),
    }


def main() -> None:
    orientation = verify_case(
        "all abstract hypotheses but adjacent orientation fails",
        Fraction(1267, 2592),
        (2, 13),
        (3, 4),
        (1, 5),
    )
    assert not all(
        Fraction(orientation["A_roots"][i])
        < Fraction(orientation["B_roots"][i])
        < Fraction(orientation["C_roots"][i])
        for i in range(2)
    )

    cross_gap = verify_case(
        "componentwise adjacent orientation holds but codimension-two cross-gap fails",
        Fraction(249, 400),
        (4, 6),
        (2, 5),
        (1, 3),
    )
    roots_a = list(map(Fraction, cross_gap["A_roots"]))
    roots_b = list(map(Fraction, cross_gap["B_roots"]))
    roots_c = list(map(Fraction, cross_gap["C_roots"]))
    assert all(roots_a[i] < roots_b[i] < roots_c[i] for i in range(2))
    assert roots_c[0] > roots_a[1]

    path_jensen_identities = path_jensen_replay()

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_ABSTRACT_ROOT_CHAIN_COUNTEREXAMPLES",
        "conclusion": [
            "negative-rootedness, strict adjacent positive pencils, coefficient-ratio inequalities, and coefficientwise strict Turan positivity do not force adjacent componentwise orientation",
            "even after adjacent componentwise orientation is added, those hypotheses do not force the codimension-two cross-gap",
        ],
        "source_sha256": source_hash,
        "path_jensen_difference_identities": path_jensen_identities,
        "cases": [orientation, cross_gap],
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(REPORT.read_bytes()).hexdigest().upper()
    print(json.dumps({"status": report["status"], "source_sha256": source_hash, "report_sha256": report_hash}, indent=2))


if __name__ == "__main__":
    main()
