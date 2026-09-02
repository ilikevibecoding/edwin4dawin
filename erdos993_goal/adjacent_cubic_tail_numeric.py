"""Stable numerical construction of the two adjacent-cubic Jacobi tails.

The cached exact formulas are deliberately expanded for symbolic auditing;
direct floating-point evaluation of those expansions loses accuracy at
large reserve.  This module evaluates the short recurrence from which the
tails were derived, keeping all cancellations local.
"""

from __future__ import annotations

import numpy as np


def _top_coefficients(k, alpha, beta):
    total = alpha + beta
    diagonal = -k * (k + alpha) / (2 * k + total)
    second = (
        k * (k - 1) * (k + alpha - 1) * (k + alpha)
        / (2 * (2 * k + total - 1) * (2 * k + total))
    )
    return diagonal, second


def _cubic_tail(p, alpha, n, beta, u, v, c):
    ambient = p + alpha

    def t_action(j):
        k = n - j
        diagonal_top, second_top = _top_coefficients(k, alpha, beta)
        diagonal_next, second_next = _top_coefficients(k + 1, alpha, beta)
        upper = float(j)
        diagonal = k + (j + 1) * diagonal_top - upper * diagonal_next
        lower = (
            (k - 1) * diagonal_top
            + (j + 2) * second_top
            - upper * second_next
            - diagonal * diagonal_top
        )
        return upper, diagonal, lower

    actions = [t_action(j) for j in range(4)]

    def apply_t_minus(vector, shift):
        output = [0.0, 0.0, 0.0, 0.0]
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 3:
                output[j + 1] += coefficient * lower
        return output

    falling = [[1.0, 0.0, 0.0, 0.0]]
    for shift in range(3):
        falling.append(apply_t_minus(falling[-1], shift))

    gamma = [c, 1 - c * (u + v), c * u * v - (u + v), u * v]

    def falling_factorial(x, order):
        value = 1.0
        for j in range(order):
            value *= x - j
        return value

    coordinates = []
    for index in range(4):
        value = 0.0
        for h in range(4):
            value += (
                gamma[h]
                * falling_factorial(ambient, h)
                / falling_factorial(p, 2 * h)
                * falling[h][index]
            )
        coordinates.append(value)

    def recurrence(k):
        diagonal_top, second_top = _top_coefficients(k, alpha, beta)
        diagonal_next, second_next = _top_coefficients(k + 1, alpha, beta)
        diagonal = diagonal_top - diagonal_next
        subdiagonal = second_top - second_next - diagonal * diagonal_top
        return diagonal, subdiagonal

    a_last, b_last = recurrence(n - 1)
    a_previous, b_previous = recurrence(n - 2)
    v0, v1, v2, v3 = coordinates
    coefficient_a = v1 / v0
    coefficient_b = v2 / v0
    coefficient_c = v3 / v0
    d_last = a_last - coefficient_a + coefficient_c / b_previous
    d_previous = a_previous - coefficient_c / b_previous
    terminal = d_last * d_previous - (
        (a_last - coefficient_a) * a_previous - b_last + coefficient_b
    )
    return d_previous, d_last, terminal, b_previous


def tail_values(parity, r, u, v, c):
    """Return a0,a1,a2,b1,b2,d0,d1,f for A's 3-tail and H's 2-tail."""
    r = np.asarray(r, dtype=float)
    u = np.asarray(u, dtype=float)
    v = np.asarray(v, dtype=float)
    c = np.asarray(c, dtype=float)
    if parity == "odd":
        p, alpha, n, beta = 2 * r + 13, 2 * r, r + 6, 0.5
    elif parity == "even":
        p, alpha, n, beta = 2 * r + 14, 2 * r + 1, r + 7, -0.5
    else:
        raise ValueError(parity)

    current = _cubic_tail(p, alpha, n, beta, u, v, c)
    adjacent = _cubic_tail(p - 2, alpha + 1, n - 1, beta, u, v, c)
    current_d0, current_d1, current_f, current_b0 = current
    adjacent_d0, adjacent_d1, adjacent_f, _ = adjacent

    j = n - 3
    pivot = (
        (j + 1 + alpha) * (j + 1 + alpha + beta)
        / ((2 * j + alpha + beta + 1) * (2 * j + alpha + beta + 2))
    )
    q1 = current_d0 - current_b0 / pivot
    q2 = current_d1 - current_f / q1
    a0 = pivot + current_b0 / pivot
    a1 = q1 + current_f / q1
    a2 = q2
    b1 = q1 * current_b0 / pivot
    b2 = q2 * current_f / q1
    return a0, a1, a2, b1, b2, adjacent_d0, adjacent_d1, adjacent_f

