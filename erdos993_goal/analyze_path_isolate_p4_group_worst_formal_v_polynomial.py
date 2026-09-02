#!/usr/bin/env python3
"""Inspect formal V-weight polynomial for the worst sampled reserve ratio."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from probe_path_isolate_p4_affine_target_rows import A, T, V, multiply, power
from probe_path_isolate_p4_group_finite_kernel_target_cone import evaluate_kernel


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    parity, coordinate = 1, "x"
    c_value, m_value, x_value, tail = 1, 12, 24, 19
    parity_item = next(
        item for item in data["parities"] if item["parity_epsilon"] == parity
    )
    kernels = parity_item["recurrences"][coordinate]["coefficients"]
    maximum = len(kernels) - 1
    order = maximum + tail
    target = m_value + order + 4
    exponent_a = 2 * c_value + m_value + x_value - 3
    exponent_t = 2 * m_value + parity - 4
    coefficients = []
    for kernel in kernels:
        j = kernel["numerator_order"]
        source = evaluate_kernel(kernel, c_value, m_value, x_value, target)
        for factor, exponent in (
            (A, exponent_a),
            (T, exponent_t),
            (V, tail + maximum - j),
        ):
            source = multiply(source, power(factor, exponent, target), target)
        coefficients.append(source.get((target, target), 0))
    lam = sp.symbols("lambda")
    polynomial = sum(
        value * lam ** (maximum - j)
        for j, value in enumerate(coefficients)
    )
    report = {
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value,
        "m": m_value,
        "x": x_value,
        "tail": tail,
        "formal_coefficients_j_0_to_J": coefficients,
        "P": int(polynomial.subs(lam, 1)),
        "base": int((polynomial + lam * sp.diff(polynomial, lam)).subs(lam, 1)),
        "combined": int(
            ((tail + 1) * polynomial + lam * sp.diff(polynomial, lam)).subs(
                lam, 1
            )
        ),
        "factorization": str(sp.factor(polynomial)),
        "roots": [str(root) for root in sp.nroots(polynomial)],
    }
    Path(
        "path_isolate_p4_group_worst_formal_v_polynomial_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
