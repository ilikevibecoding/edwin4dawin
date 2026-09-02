"""Numerical probe of the finite-tail floor for adjacent quartic rows.

The quartic window has a Jacobi realization with a modified 3x3 tail.
After the classical Darboux step, the current row has a 4x4 tail while the
adjacent row has a 3x3 tail, attached to the same prefix.  Every common root
must therefore zero the fixed-degree tail Weyl cross-product

    C(y)=n_A(y)q_H(y)-n_H(y)q_A(y).

This probe tests whether all its branch-relevant roots lie above the outer
threshold y0=4(r+5)/(4(r+5)+1).  It is exploratory, not a certificate.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np

from adjacent_cubic_tail_numeric import _top_coefficients


HERE = Path(__file__).resolve().parent


def recurrence(k, alpha, beta):
    c0, e0 = _top_coefficients(k, alpha, beta)
    c1, e1 = _top_coefficients(k + 1, alpha, beta)
    diagonal = c0 - c1
    subdiagonal = e0 - e1 - diagonal * c0
    return diagonal, subdiagonal


def quartic_tail(p, alpha, n, beta, u, v, c, d):
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

    actions = [t_action(j) for j in range(5)]

    def apply_t_minus(vector, shift):
        output = [0.0] * 5
        for j, coefficient in enumerate(vector):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 4:
                output[j + 1] += coefficient * lower
        return output

    falling = [[1.0, 0.0, 0.0, 0.0, 0.0]]
    for shift in range(4):
        falling.append(apply_t_minus(falling[-1], shift))

    s, q = u + v, u * v
    gamma = [
        c * d,
        c + d - c * d * s,
        1 - (c + d) * s + c * d * q,
        -s + (c + d) * q,
        q,
    ]

    def falling_factorial(x, order):
        value = 1.0
        for j in range(order):
            value *= x - j
        return value

    coordinates = []
    for index in range(5):
        value = 0.0
        for h in range(5):
            value += (
                gamma[h]
                * falling_factorial(ambient, h)
                / falling_factorial(p, 2 * h)
                * falling[h][index]
            )
        coordinates.append(value)
    A, B, C, D = [value / coordinates[0] for value in coordinates[1:]]

    a1, b1 = recurrence(n - 3, alpha, beta)
    a2, b2 = recurrence(n - 2, alpha, beta)
    a3, b3 = recurrence(n - 1, alpha, beta)
    y = np.poly1d([1.0, 0.0])
    n2 = (
        (y - a3) * (y - a2)
        + A * (y - a2)
        - b3
        + B
        - D / b1
    )
    q3 = (
        (y - a3 + A) * ((y - a2) * (y - a1) - b2)
        + (B - b3) * (y - a1)
        + C
    )
    d0 = float(n2.c[1] - q3.c[1])
    remainder = q3 - (y - d0) * n2
    f1 = float(-remainder.c[-2])
    d2 = float(remainder.c[-1] / f1)
    d1 = float(-n2.c[1] - d2)
    f2 = float(d1 * d2 - n2.c[2])
    return d0, d1, d2, f1, f2, b1


def partner_tail(parity, r, u, v, c, d):
    if parity == "odd":
        p, alpha, n, beta = 2 * r + 17, 2 * r, r + 8, 0.5
    else:
        p, alpha, n, beta = 2 * r + 18, 2 * r + 1, r + 9, -0.5
    current = quartic_tail(p, alpha, n, beta, u, v, c, d)
    adjacent = quartic_tail(p - 2, alpha + 1, n - 1, beta, u, v, c, d)
    d0, d1, d2, f1, f2, attachment = current
    j = n - 4
    pivot = (
        (j + 1 + alpha) * (j + 1 + alpha + beta)
        / ((2 * j + alpha + beta + 1) * (2 * j + alpha + beta + 2))
    )
    q1 = d0 - attachment / pivot
    q2 = d1 - f1 / q1
    q3 = d2 - f2 / q2
    tail_a = (
        [pivot + attachment / pivot, q1 + f1 / q1, q2 + f2 / q2, q3],
        [q1 * attachment / pivot, q2 * f1 / q1, q3 * f2 / q2],
    )
    tail_h = ([adjacent[0], adjacent[1], adjacent[2]], [adjacent[3], adjacent[4]])
    return tail_a, tail_h


def shared_prefix(parity, r):
    if parity == "odd":
        alpha, beta, adjacent_degree = 2 * r + 1, 0.5, r + 7
    else:
        alpha, beta, adjacent_degree = 2 * r + 2, -0.5, r + 8
    prefix_size = adjacent_degree - 3
    diagonal = []
    subdiagonal = [0.0]
    for k in range(prefix_size + 1):
        value, coupling = recurrence(k, alpha, beta)
        diagonal.append(value)
        if k:
            subdiagonal.append(coupling)
    return diagonal[:prefix_size], subdiagonal[:prefix_size], subdiagonal[prefix_size]


def prefix_ratio(y, diagonal, subdiagonal):
    ratio = y - diagonal[0]
    positive = int(ratio > 0)
    for k in range(1, len(diagonal)):
        ratio = y - diagonal[k] - subdiagonal[k] / ratio
        positive += int(ratio > 0)
    return ratio, positive


def continuant(diagonal, subdiagonal):
    y = np.poly1d([1.0, 0.0])
    previous = np.poly1d([1.0])
    current = y - diagonal[0]
    for index in range(1, len(diagonal)):
        previous, current = current, (
            (y - diagonal[index]) * current - subdiagonal[index - 1] * previous
        )
    return current


def one_case(parity, r, u, v, c, d):
    tail_a, tail_h = partner_tail(parity, r, u, v, c, d)
    if (
        not all(np.isfinite(value) and value > 0 for value in tail_a[1])
        or not all(np.isfinite(value) and value > 0 for value in tail_h[1])
    ):
        return 4 * (r + 5) / (4 * (r + 5) + 1), []
    q_a = continuant(*tail_a)
    n_a = continuant(tail_a[0][1:], tail_a[1][1:])
    q_h = continuant(*tail_h)
    n_h = continuant(tail_h[0][1:], tail_h[1][1:])
    collision = n_a * q_h - n_h * q_a
    roots = np.roots(collision)
    eigen_a = np.linalg.eigvalsh(
        np.diag(tail_a[0])
        + np.diag(np.sqrt(tail_a[1]), 1)
        + np.diag(np.sqrt(tail_a[1]), -1)
    )
    eigen_h = np.linalg.eigvalsh(
        np.diag(tail_h[0])
        + np.diag(np.sqrt(tail_h[1]), 1)
        + np.diag(np.sqrt(tail_h[1]), -1)
    )
    y0 = 4 * (r + 5) / (4 * (r + 5) + 1)
    prefix_d, prefix_b, prefix_coupling = shared_prefix(parity, r)
    real = []
    for root in roots:
        if abs(root.imag) > 1e-7:
            continue
        y = float(root.real)
        if not (0 < y < 1):
            continue
        count_a = int(np.sum(eigen_a < y))
        count_h = int(np.sum(eigen_h < y))
        ratio, prefix_roots_below = prefix_ratio(y, prefix_d, prefix_b)
        residual = float(q_h(y) * ratio - prefix_coupling * n_h(y))
        scale = abs(float(q_h(y) * ratio)) + abs(float(prefix_coupling * n_h(y)))
        normalized_residual = residual / scale if scale else 0.0
        real.append(
            {
                "y": y,
                "above_floor": y >= y0,
                "tail_counts": [count_a, count_h],
                "count_difference": count_a - count_h,
                "normalized_full_residual": normalized_residual,
                "prefix_roots_below": prefix_roots_below,
            }
        )
    return y0, real


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=993_20260807)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    histogram = {}
    bad = None
    closest = None
    below_diff_one = []
    for trial in range(args.trials):
        parity = "odd" if rng.randrange(2) == 0 else "even"
        r = rng.choice(list(range(25)) + [50, 100, 500, 2000])
        u, v = rng.random(), rng.random()
        c, d = 10 ** rng.uniform(-4, 4), 10 ** rng.uniform(-4, 4)
        y0, roots = one_case(parity, r, u, v, c, d)
        for root in roots:
            key = str(root["count_difference"])
            histogram[key] = histogram.get(key, 0) + 1
            residual_key = (
                f"diff_{root['count_difference']}_"
                + ("positive" if root["normalized_full_residual"] > 1e-8
                   else "negative" if root["normalized_full_residual"] < -1e-8
                   else "near_zero")
                + ("_above" if root["above_floor"] else "_below")
            )
            histogram[residual_key] = histogram.get(residual_key, 0) + 1
            gap = root["y"] - y0
            record = {
                "trial": trial,
                "parity": parity,
                "r": r,
                "u": u,
                "v": v,
                "c": c,
                "d": d,
                "floor": y0,
                **root,
            }
            if closest is None or abs(gap) < abs(closest[0]):
                closest = (gap, record)
            if root["count_difference"] == 1 and not root["above_floor"]:
                if len(below_diff_one) < 10:
                    below_diff_one.append(record)
            # A common full root additionally requires this residual to vanish.
            if (
                root["count_difference"] == 0
                and not root["above_floor"]
                and abs(root["normalized_full_residual"]) < 1e-8
            ):
                bad = record
                break
        if bad:
            break
    report = {
        "status": "counterexample" if bad else "PASS_NUMERIC_PROBE",
        "trials_completed": trial + 1,
        "tail_count_difference_histogram": histogram,
        "first_near_full_collision_below_floor": bad,
        "closest_root_to_floor": None if closest is None else closest[1],
        "diff_one_roots_below_floor_examples": below_diff_one,
    }
    output = HERE / "pf_length3_tail_collision_floor_probe_20260807.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
