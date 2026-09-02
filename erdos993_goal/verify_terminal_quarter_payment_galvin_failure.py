#!/usr/bin/env python3
"""Independent exact replay of terminal quantitative-payment failures.

The witness is Galvin's tree T_(m,t), rooted at its outer vertex:

    E=(1+2x)^t,
    A=E+x(1+x)^t,
    R=A^m+xE^m,
    C=R-q=A^m.

Attach the path q-p-l.  Then T=R+xC and Q=T+xR.  Two stated prefix
ranks refute the conjectural factor-four and factor-three terminal
payments, respectively.  At both witnesses the actual local payment,
ordinary pendant cascade, and three-quarters cascade remain strictly
positive.
"""

from __future__ import annotations

import sys

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])


def coeff(poly: Poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def reserve(poly: Poly, k: int):
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(
        0,
        max(abs(numerator).bit_length(), denominator.bit_length()) - 52,
    )
    return (numerator >> shift) / (denominator >> shift)


def replay(t: int, m_parameter: int, r: int) -> dict:
    k = r + 1

    e = (1 + 2 * X) ** t
    a = e + X * (1 + X) ** t
    root_deleted = a**m_parameter
    rooted_tree = root_deleted + X * e**m_parameter
    assert rooted_tree == a**m_parameter + X * e**m_parameter

    once_extended = rooted_tree + X * root_deleted
    terminal_tree = once_extended + X * rooted_tree

    alpha_r = m_parameter * (t + 1)
    alpha_q = alpha_r + 1
    cutoff = (2 * alpha_q + 1) // 3
    assert rooted_tree.degree() == alpha_r
    assert terminal_tree.degree() == alpha_q
    assert k < cutoff

    bm = int(coeff(rooted_tree, r - 1))
    b = int(coeff(rooted_tree, r))
    bp = int(coeff(rooted_tree, r + 1))
    cm = int(coeff(root_deleted, r - 1))
    c = int(coeff(root_deleted, r))

    cross = b * c - bp * cm
    local_reserve = (
        2 * b * b + b * cm + 2 * (r + 1) * cross
    )
    mean_numerator = (
        bm * ((r + 1) * (bp + c) + b)
        - r * b * (b + cm)
    )
    payment_denominator = (
        bm * (b + cm + bm) * local_reserve
    )
    payment = payment_denominator - mean_numerator**2

    assert cross > 0
    assert local_reserve > 0
    assert payment > 0
    g_r = int(reserve(rooted_tree, r))
    g_q = int(reserve(terminal_tree, k))
    assert g_r > 0
    assert g_q > 0

    ordinary_left = k * g_q * bm
    ordinary_right = r * g_r * int(coeff(terminal_tree, k - 1))
    assert ordinary_left > ordinary_right

    three_quarters_left = 3 * ordinary_left
    three_quarters_right = 4 * ordinary_right
    assert three_quarters_left > three_quarters_right

    return {
        "t": t,
        "m": m_parameter,
        "r": r,
        "k": k,
        "order": 1 + m_parameter * (1 + 2 * t),
        "alpha_terminal": alpha_q,
        "cutoff": cutoff,
        "payment_numerator": mean_numerator**2,
        "payment_denominator": payment_denominator,
        "payment": payment,
        "ordinary_left": ordinary_left,
        "ordinary_right": ordinary_right,
        "three_quarters_left": three_quarters_left,
        "three_quarters_right": three_quarters_right,
        "coefficient_digit_lengths": (
            len(str(bm)),
            len(str(b)),
            len(str(bp)),
        ),
    }


def print_record(label: str, record: dict) -> None:
    print(
        f"{label}: t={record['t']}, m={record['m']}, "
        f"|R|={record['order']}, "
        f"alpha(Q)={record['alpha_terminal']}, "
        f"k={record['k']}<{record['cutoff']}"
    )
    print(
        "payment ratio:",
        stable_ratio(
            record["payment_numerator"],
            record["payment_denominator"],
        ),
    )
    print(
        "remaining true local-payment reserve ratio:",
        stable_ratio(
            record["payment"],
            record["payment_denominator"],
        ),
    )
    print(
        "ordinary cascade right/left:",
        stable_ratio(
            record["ordinary_right"],
            record["ordinary_left"],
        ),
    )
    print(
        "three-quarters cleared margin/left:",
        stable_ratio(
            record["three_quarters_left"]
            - record["three_quarters_right"],
            record["three_quarters_left"],
        ),
    )
    print(
        "coefficient digit lengths:",
        *record["coefficient_digit_lengths"],
    )


def main() -> None:
    factor_four = replay(t=11, m_parameter=23, r=183)
    factor_three = replay(t=13, m_parameter=186, r=1735)
    assert (
        4 * factor_four["payment_numerator"]
        > factor_four["payment_denominator"]
    )
    assert (
        3 * factor_three["payment_numerator"]
        > factor_three["payment_denominator"]
    )
    assert (
        factor_four["payment_numerator"]
        < factor_four["payment_denominator"]
    )
    assert (
        factor_three["payment_numerator"]
        < factor_three["payment_denominator"]
    )

    print("PASS")
    print_record("factor-four failure", factor_four)
    print_record("factor-three failure", factor_three)


if __name__ == "__main__":
    main()
