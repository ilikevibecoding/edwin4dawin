#!/usr/bin/env python3
"""Independent audit of the simultaneous two-row first-gap-slack theorem."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = (
    "prove_uniform_low_high_both_gap0_slacks_root.py",
    "CE5013F56604DFCAADDDAE9092DF0B0D9E7323690C9A8147FEDB6E5DF8D2C5DE",
)
PRODUCER_REPORT = (
    "uniform_low_high_both_gap0_slacks_exact_root_20260827.json",
    "3CD9799EBFFFAE8DB504962736336E101BEF27970EAF839F6773D47AD6E21611",
)
AXIS_AUDITS = {
    "uniform_low_high_left_gap0_slack_independent_audit_root_20260827.json":
        "4B7A2DD54ED055E6C05889E41FC1690D4897C1DDC2FB7BBA7293E1BB73C3F9ED",
    "uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json":
        "57ACB1006AE195F36710BBD5BB411EF6937AAA157413C464FFE0439784D90F4B",
}
OUTPUT = HERE / "uniform_low_high_both_gap0_slacks_independent_audit_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def qform(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def pairing(first, second):
    return sp.expand(
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def sparse_rows(expression, variables):
    rows = []
    for monomial, coefficient in sp.Poly(sp.expand(expression), *variables).terms():
        assert coefficient.is_Integer and coefficient > 0
        rows.append({"monomial": list(monomial), "coefficient": int(coefficient)})
    assert rows
    return rows


def fraction_certificate(expression, expected_denominator, rank, shift, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert sp.expand(denominator - expected_denominator) == 0
    return sparse_rows(numerator.subs(rank, shift + 8), variables)


def make_coefficients(rank: int, terminal: int, slack: int = 0):
    ratios = [terminal + rank + 1 + slack]
    ratios.extend(terminal + rank - index for index in range(1, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def conv(first, second, degree: int):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def direct_value(rank: int, x: int, y: int, left_slack: int, right_slack: int):
    left_ratios, left = make_coefficients(rank, x, left_slack)
    _, right = make_coefficients(rank, y, right_slack)
    truncated = [0, 0, 0, *left[3:]]
    whole = [conv(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    tail = [conv(truncated, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return int(left_ratios[2] * qform(whole) + pairing(whole, tail))


def main() -> int:
    assert sha256(HERE / PRODUCER_SOURCE[0]) == PRODUCER_SOURCE[1]
    assert sha256(HERE / PRODUCER_REPORT[0]) == PRODUCER_REPORT[1]
    for name, expected in AXIS_AUDITS.items():
        assert sha256(HERE / name) == expected
    producer = json.loads((HERE / PRODUCER_REPORT[0]).read_text(encoding="utf-8"))
    assert producer["status"] == "PASS_EXACT_ALL_RANK_SIMULTANEOUS_BOTH_GAP0_SLACKS_STRONG_BOUNDARY"
    assert producer["source_sha256"] == PRODUCER_SOURCE[1]

    r, a, b = sp.symbols("r a b", real=True)
    z = sp.Symbol("z", nonnegative=True)
    U, V, W = sp.symbols("U V W", positive=True)
    A, B = a + r, b + r
    total_weight = (A + 1) * (B + 1) * U
    left_weight = (A + 1) * V
    right_weight = (B + 1) * W
    total_ratio = A + B - r + 1
    c = (
        (total_weight - left_weight - right_weight) / (A * B),
        (
            total_weight * total_ratio
            - left_weight * (a + 1) - right_weight * (b + 1)
        ) / (A * B),
        (
            total_weight * total_ratio * (total_ratio - 1)
            - left_weight * a * (a + 1)
            - right_weight * b * (b + 1)
        ) / (A * B),
    )
    left_previous = (A + 1) * V / A
    left_only = (
        left_previous,
        left_previous * (a + 1),
        left_previous * a * (a + 1),
    )
    right_previous = (B + 1) * W / B
    right_only = (
        right_previous,
        right_previous * (b + 1),
        right_previous * b * (b + 1),
    )
    removed = (
        right_previous * (
            1 + (r - 1) * (A + 1) / (b + 2)
            + ((r - 1) * (r - 2) / 2) * (A ** 2 - 1)
            / ((b + 2) * (b + 3))
        ),
        right_previous * (
            b + 1 + r * (A + 1)
            + (r * (r - 1) / 2) * (A ** 2 - 1) / (b + 2)
        ),
        right_previous * (
            b * (b + 1) + (r + 1) * (A + 1) * (b + 1)
            + (r * (r + 1) / 2) * (A ** 2 - 1)
        ),
    )
    tail = tuple(sp.cancel(c[index] - removed[index]) for index in range(3))
    left_dir = tuple(sp.cancel(c[index] - right_only[index]) for index in range(3))
    right_dir = tuple(sp.cancel(c[index] - left_only[index]) for index in range(3))
    mixed_dir = tuple(
        sp.cancel(c[index] - left_only[index] - right_only[index]) for index in range(3)
    )
    tail_right_dir = tuple(sp.cancel(tail[index] - left_only[index]) for index in range(3))
    cross_coefficients = {
        "p1_q1": (
            (A - 2) * (pairing(c, mixed_dir) + pairing(right_dir, left_dir))
            + pairing(c, tail_right_dir) + pairing(right_dir, tail)
            + pairing(left_dir, tail_right_dir) + pairing(mixed_dir, tail)
        ),
        "p1_q2": (
            (A - 2) * pairing(right_dir, mixed_dir)
            + pairing(right_dir, tail_right_dir) + pairing(mixed_dir, tail_right_dir)
        ),
        "p2_q1": (
            (A - 2) * pairing(left_dir, mixed_dir)
            + pairing(left_dir, tail_right_dir) + pairing(mixed_dir, tail)
        ),
        "p2_q2": (A - 2) * qform(mixed_dir) + pairing(mixed_dir, tail_right_dir),
    }

    # Recheck the cross-coefficient expansion in an abstract polynomial ring.
    p, q, cap = sp.symbols("p q cap", real=True)
    ac = sp.symbols("c0:3")
    ar = sp.symbols("r0:3")
    al = sp.symbols("l0:3")
    ae = sp.symbols("e0:3")
    av = sp.symbols("v0:3")
    aw = sp.symbols("w0:3")
    C = tuple(ac[i] + q * ar[i] for i in range(3))
    D = tuple(al[i] + q * ae[i] for i in range(3))
    Tail = tuple(av[i] + q * aw[i] for i in range(3))
    full = sp.Poly(
        sp.expand(
            cap * qform(tuple(C[i] + p * D[i] for i in range(3)))
            + pairing(
                tuple(C[i] + p * D[i] for i in range(3)),
                tuple((1 + p) * Tail[i] for i in range(3)),
            )
        ), p, q,
    )
    abstract_expected = {
        (1, 1): (
            cap * (pairing(ac, ae) + pairing(ar, al))
            + pairing(ac, aw) + pairing(ar, av)
            + pairing(al, aw) + pairing(ae, av)
        ),
        (1, 2): cap * pairing(ar, ae) + pairing(ar, aw) + pairing(ae, aw),
        (2, 1): cap * pairing(al, ae) + pairing(al, aw) + pairing(ae, av),
        (2, 2): cap * qform(ae) + pairing(ae, aw),
    }
    for powers, expected in abstract_expected.items():
        assert sp.expand(full.coeff_monomial(p ** powers[0] * q ** powers[1]) - expected) == 0

    lower = (
        1 + (r - 1) * A / B
        + ((r - 1) * (r - 2) / 2) * (A / B) ** 2
        + ((r - 1) * (r - 2) * (r - 3) / 6) * (A / B) ** 3
    )
    base_denominator = (b + 2) * (b + 3)
    denominators = {
        "p1_q1": (1, base_denominator, 3 * B * base_denominator, base_denominator),
        "p1_q2": (1, base_denominator, 3 * B * base_denominator, base_denominator),
        "p2_q1": (1, base_denominator, 6 * B * base_denominator, base_denominator),
        "p2_q2": (1, 2 * base_denominator, 6 * B * base_denominator, 2 * base_denominator),
    }
    replayed = []
    row_key = "shift_k_equals_t_plus_8_sparse_coefficients"
    for index, (label, coefficient) in enumerate(cross_coefficients.items()):
        polynomial = sp.Poly(sp.cancel(coefficient * (A * B) ** 2), U, V, W)
        assert {monomial for monomial, _ in polynomial.terms()} == {
            (1, 1, 0), (1, 0, 1), (0, 1, 1), (0, 0, 2)
        }
        alpha = sp.cancel(polynomial.coeff_monomial(U * V))
        beta = sp.cancel(polynomial.coeff_monomial(U * W))
        gamma = sp.cancel(-polynomial.coeff_monomial(V * W))
        delta = sp.cancel(-polynomial.coeff_monomial(W ** 2))
        da, db, d1, d2 = denominators[label]
        rows = {
            "alpha_positive": fraction_certificate(alpha, da, r, z, (z, a, b)),
            "beta_positive": fraction_certificate(beta, db, r, z, (z, a, b)),
            "payment_one": fraction_certificate(
                sp.cancel(alpha * lower - gamma), d1, r, z, (z, a, b)
            ),
            "payment_two": fraction_certificate(
                sp.cancel(beta - delta), d2, r, z, (z, a, b)
            ),
        }
        expected = producer["cross_positive_coefficient_certificates"][index]
        assert expected["coefficient"] == label
        for section, sparse in rows.items():
            assert sparse == expected[section][row_key]
        replayed.append({
            "coefficient": label,
            "alpha_terms": len(rows["alpha_positive"]),
            "beta_terms": len(rows["beta_positive"]),
            "payment_one_terms": len(rows["payment_one"]),
            "payment_two_terms": len(rows["payment_two"]),
        })
        print(label, "MATCH", flush=True)

    direct_checks = []
    for rank, x_value, y_value, left_slack, right_slack in (
        (8, 0, 17, 2, 3),
        (10, 4, 0, 99, 5),
        (12, 31, 7, 1, 77),
        (17, 2, 53, 41, 11),
        (25, 19, 3, 8, 13),
    ):
        value = direct_value(rank, x_value, y_value, left_slack, right_slack)
        assert value > 0
        direct_checks.append({
            "rank": rank,
            "x": x_value,
            "y": y_value,
            "left_first_gap_slack": left_slack,
            "right_first_gap_slack": right_slack,
            "strong_auxiliary": value,
        })

    payload = {
        "schema": "uniform-low-high-both-gap0-slacks-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_SIMULTANEOUS_BOTH_GAP0_SLACKS_AUDIT",
        "producer_source_sha256": PRODUCER_SOURCE[1],
        "producer_report_sha256": PRODUCER_REPORT[1],
        "axis_independent_audits_sha256": AXIS_AUDITS,
        "replayed_cross_certificates": replayed,
        "independent_direct_checks": direct_checks,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Gap coordinates with index >=1 remain unresolved.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
