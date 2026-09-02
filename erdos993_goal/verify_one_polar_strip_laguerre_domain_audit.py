#!/usr/bin/env python3
"""Exact replay of the one-polar Laguerre-domain audit and counterexamples."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "one_polar_strip_laguerre_domain_audit_exact_20260813.json"


def pochhammer_transform(source: sp.Expr, q: sp.Symbol, z: sp.Expr, B: sp.Expr) -> sp.Expr:
    """P_B[sum c_j q^j](z), exactly."""
    out = sp.S.Zero
    for (j,), coefficient in sp.Poly(sp.expand(source), q).terms():
        falling = sp.prod(z - h for h in range(j))
        rising = sp.prod(B + h for h in range(j))
        out += coefficient * falling / rising
    return sp.factor(out)


def real_height_resultant(
    polynomial: sp.Expr,
    d: sp.Symbol,
    b_substitution: sp.Expr,
    height: sp.Symbol,
) -> sp.Expr:
    """Eliminate Re(d) after supplying Im(d) in terms of height and Re(d)."""
    a, b = sp.symbols("a b", real=True)
    expanded = sp.expand_complex(polynomial.subs(d, a + sp.I * b))
    real_part = sp.factor(sp.re(expanded).subs(b, b_substitution.subs("a", a)))
    imag_part = sp.factor(sp.im(expanded).subs(b, b_substitution.subs("a", a)))
    resultant = sp.resultant(real_part, imag_part, a)
    numerator = sp.together(resultant).as_numer_denom()[0]
    return sp.factor(sp.primitive(numerator, height)[1])


def generic_direction_counterexample() -> dict[str, str]:
    d = sp.symbols("d")
    f = (d + 1 - sp.I / 10) * (d - 1 - sp.I / 10)
    polar = sp.factor(2 * f - (d - sp.I) * sp.diff(f, d))
    root = sp.solve(polar, d)[0]
    assert root == -sp.Rational(91, 90) * sp.I
    return {
        "f": str(sp.expand(f)),
        "polar_point": "I",
        "polar_derivative": str(polar),
        "polar_zero": str(root),
    }


def base_strip_counterexample() -> dict[str, object]:
    q, d, h = sp.symbols("q d h")
    B = sp.Integer(5)
    k = 2
    R = sp.Rational(1001, 1000)
    s = sp.Rational(40, 41) + sp.I * sp.Rational(9, 41)
    z = sp.factor(R * s**2)
    M3 = pochhammer_transform((4 * q - d) ** (k + 1), q, z, B)

    # h=Im(d/s)=(40*b-9*a)/41, so b=(41*h+9*a)/40.
    a = sp.Symbol("a", real=True)
    height_resultant = real_height_resultant(M3, d, (41 * h + 9 * a) / 40, h)
    negative_count = int(sp.count_roots(height_resultant, -sp.oo, 0))
    positive_count = int(sp.count_roots(height_resultant, 0, sp.oo))
    assert (negative_count, positive_count) == (1, 2)
    intervals = sp.intervals(height_resultant, eps=sp.Rational(1, 10) ** 10)
    real_intervals = [interval for interval, multiplicity in intervals if multiplicity == 1]
    assert real_intervals[0][0] == -sp.Rational(243, 205232)
    assert real_intervals[0][1] == -sp.Rational(151, 127531)
    return {
        "parameters": {"k": k, "B": str(B), "R": str(R), "s": str(s), "z": str(z)},
        "height_resultant": str(height_resultant),
        "negative_height_roots": negative_count,
        "positive_height_roots": positive_count,
        "isolating_intervals": [[str(left), str(right)] for left, right in real_intervals],
    }


def near_strip_second_polar_counterexample() -> dict[str, object]:
    q, d, t = sp.symbols("q d t")
    B = sp.Integer(31)
    k = 2
    R = sp.Rational(21, 20)
    u = sp.Rational(1, 8)
    v = sp.Rational(3, 25)
    s = (1 + sp.I) / sp.sqrt(2)
    z = sp.I * R

    lower = sp.factor(4 * (k - R) / (B + k))
    upper = sp.factor(4 * R / B)
    assert lower == sp.Rational(19, 165)
    assert upper == sp.Rational(21, 155)
    assert lower < v < u < upper

    H = sp.factor(4 * pochhammer_transform((q + u / 4) * (4 * q - d) ** k, q, z, B))
    J = sp.factor(
        16 * pochhammer_transform(
            (q + u / 4) * (q + v / 4) * (4 * q - d) ** (k - 1), q, z, B
        )
    )
    second_polar = sp.factor(H - (d + v) * sp.diff(H, d) / k)
    assert sp.factor(second_polar - J) == 0

    # t=Im(d)-Re(d), with the same sign as Im(d/s); hence b=a+t.
    a = sp.Symbol("a", real=True)
    height_resultant = real_height_resultant(H, d, a + t, t)
    expected = (
        211407947597440000 * t**4
        - 115269506706816000 * t**3
        + 27227778956470400 * t**2
        - 3139312034295360 * t
        + 91724619224763
    )
    assert sp.factor(height_resultant / expected) in (1, -1)
    negative_count = int(sp.count_roots(expected, -sp.oo, 0))
    positive_count = int(sp.count_roots(expected, 0, sp.oo))
    assert (negative_count, positive_count) == (0, 2)

    root = sp.factor(sp.solve(J, d)[0])
    expected_root = (
        -sp.Rational(1553545, 40903192)
        - sp.I * sp.Rational(18906293, 153386970)
    )
    assert sp.factor(root - expected_root) == 0
    scaled_height = sp.factor(sp.im(root) - sp.re(root))
    assert scaled_height == -sp.Rational(52321997, 613547880)

    intervals = sp.intervals(expected, eps=sp.Rational(1, 10) ** 10)
    real_intervals = [interval for interval, multiplicity in intervals if multiplicity == 1]
    return {
        "parameters": {
            "k": k,
            "B": str(B),
            "R": str(R),
            "s": str(s),
            "z": str(z),
            "u": str(u),
            "v": str(v),
            "lower_bound": str(lower),
            "upper_bound": str(upper),
        },
        "second_polar_identity": True,
        "H_height_resultant": str(expected),
        "H_negative_height_roots": negative_count,
        "H_positive_height_roots": positive_count,
        "H_height_isolating_intervals": [
            [str(left), str(right)] for left, right in real_intervals
        ],
        "J_unique_root": str(root),
        "J_scaled_height_Im_minus_Re": str(scaled_height),
    }


def main() -> None:
    payload = {
        "kind": "one_polar_strip_laguerre_domain_audit",
        "date": "2026-08-13",
        "status": "PASS_EXACT_LAGUERRE_DOMAIN_CORRECTION_AND_SECOND_POLAR_COUNTEREXAMPLE",
        "generic_direction_counterexample": generic_direction_counterexample(),
        "base_strip_counterexample": base_strip_counterexample(),
        "near_strip_second_polar_counterexample": near_strip_second_polar_counterexample(),
        "logical_scope": {
            "one_polar_strip_lemma": "not refuted and not proved",
            "automatic_second_polar_step": "exactly refuted",
            "finite_scans_are_proof": False,
        },
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
