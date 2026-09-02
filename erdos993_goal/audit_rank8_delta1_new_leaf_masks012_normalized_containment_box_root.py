#!/usr/bin/env python3
"""Independent exact audit of the three cleared Delta1 new-leaf corners.

This replay intentionally imports no project algebra module.  It reconstructs
the terminal residual, its first Newton coefficient, the new-leaf substitution,
the two Q endpoints, and the structural recurrence C=D+xF from first principles.
It then verifies the exact Bernstein certificates on the enlarged containment
box for endpoint masks 0, 1, and 2.  Mask 3 is explicitly outside the claim.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_"
    "independent_audit_root_20260825.json"
)

EXPECTED_FILES = {
    "verify_uniform_vk_large_order_reduction.py":
        "F340C4C1C45B9F10B7794DD17139594E4EC9789CA988870A46BB11B1D0DFF5B8",
    "uniform_vk_large_order_reduction_exact_20260816.json":
        "6BE4C4D6E01C1EBE7F48CA9F70AF579E0036C47EB26B7F5415E8D5FF28D5B4C5",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py":
        "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py":
        "D3A17F85CC3E31A229BED7E16201FCDA031E8C9D63ED5568AF0F90D0A66DBBBB",
    "probe_rank8_delta1_new_leaf_normalized_containment_box_root.py":
        "F4B18C4C96521F7325558DF681DA81A20A3B167BD05145F292F1C69F77D82A3D",
    "rank8_delta1_new_leaf_normalized_containment_box_probe_root_20260825.json":
        "ECFD97D7D4D0A44616F5A6A5EBD171669A514312D582E5FE043FBCD767A49E4A",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m00_q_corner_agent_20260823.json":
        "BDAB997A79167BFD9901F923AAC37D00C1D5BB3E895EC91958DB4EB78C63533A",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m01_q_corner_agent_20260823.json":
        "CE705E49A47B4D60D7DF0C1A19039E2B4D867D6C96FD8A8ADB06D5560DA091C4",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m02_q_corner_agent_20260823.json":
        "4703B2BAB732FD982CCADEDBE0D571885D3A62E178D5CACD0990DE76AF40FE06",
}

c = sp.symbols("c0:10", nonnegative=True)
h = sp.symbols("h0:9", nonnegative=True)
d = sp.symbols("d0:9", nonnegative=True)
f = sp.symbols("f0:8", nonnegative=True)
t = sp.symbols("t", integer=True, positive=True)
X, Y, U4, U5, U6 = sp.symbols("X Y U4 U5 U6", nonnegative=True)
VARIABLES = (X, Y, U4, U5, U6)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(variable: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(variable - offset for offset in range(rank)) / sp.factorial(rank)


def smoothed(rank: int) -> sp.Expr:
    return sum(choose_polynomial(t, j) * c[rank - j] for j in range(rank + 1))


def terminal_residual() -> sp.Expr:
    p7 = smoothed(7) + h[6]
    p8 = smoothed(8) + h[7]
    open_p9 = sum(choose_polynomial(t, j) * c[9 - j] for j in range(1, 10))
    q8 = 16 * p8**2 - p7 * p8 - 18 * p7 * open_p9
    core_q8_open = 16 * c[8] ** 2 - c[7] * c[8]
    deleted_q7_open = 14 * h[7] ** 2 - h[6] * h[7]
    return sp.expand(
        8 * c[7] * h[6] * q8
        - 8 * h[6] * p7 * core_q8_open
        - 9 * c[7] * p7 * deleted_q7_open
    )


def newton_coefficients(expression: sp.Expr) -> list[sp.Expr]:
    degree = sp.Poly(expression, t).degree()
    values = [sp.expand(expression.subs(t, value)) for value in range(1, degree + 3)]
    coefficients = [values[0]]
    for _ in range(1, degree + 1):
        values = [sp.expand(values[index + 1] - values[index]) for index in range(len(values) - 1)]
        coefficients.append(values[0])
    final_difference = [
        sp.expand(values[index + 1] - values[index])
        for index in range(len(values) - 1)
    ]
    assert final_difference[0] == 0
    reconstruction = sum(
        choose_polynomial(t - 1, rank) * coefficient
        for rank, coefficient in enumerate(coefficients)
    )
    assert sp.expand(expression - reconstruction) == 0
    return coefficients


def q_upper(row: tuple[sp.Symbol, ...], rank: int) -> sp.Expr:
    return sp.cancel(
        row[rank] * (2 * rank * row[rank] - row[rank - 1])
        / (2 * (rank + 1) * row[rank - 1])
    )


def delta1_new_leaf_gate() -> sp.Expr:
    delta1 = newton_coefficients(terminal_residual())[1]
    extended_core = [
        c[index] + (d[index - 1] if index else 0)
        for index in range(9)
    ]
    substitutions = {c[index]: extended_core[index] for index in range(9)}
    substitutions.update({h[6]: c[6], h[7]: c[7]})
    return sp.expand(delta1.subs(substitutions, simultaneous=True))


def endpoint_numerator(gate: sp.Expr, mask: int) -> tuple[sp.Expr, sp.Expr]:
    c8_endpoint = q_upper(c, 7) if mask & 1 else sp.Integer(0)
    d7_endpoint = q_upper(d, 6) if mask & 2 else sp.Integer(0)
    expression = gate.subs(
        {c[8]: c8_endpoint, d[7]: d7_endpoint}, simultaneous=True
    )
    recurrence = {
        c[index]: d[index] + (f[index - 1] if index else 0)
        for index in range(8)
    }
    expression = expression.subs(recurrence, simultaneous=True)
    expression = expression.subs({d[7]: d7_endpoint}, simultaneous=True)
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert not numerator.has(c[8], d[7])
    return sp.expand(numerator), sp.factor(denominator)


def polynomial_record(expression: sp.Expr) -> dict[str, object]:
    generators = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [
                [list(monomial), str(coefficient)]
                for monomial, coefficient in terms
            ],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return {
        "generators": [str(value) for value in generators],
        "terms": len(terms),
        "negative": sum(1 for _, coefficient in terms if coefficient < 0),
        "positive": sum(1 for _, coefficient in terms if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def bernstein_record(polynomial: sp.Poly) -> dict[str, object]:
    degrees = tuple(polynomial.degree(variable) for variable in VARIABLES)
    power = {
        monomial: Fraction(int(coefficient.p), int(coefficient.q))
        for monomial, coefficient in polynomial.terms()
    }
    negative = zero = positive = count = 0
    minimum: Fraction | None = None
    first_negative = None
    digest = hashlib.sha256()
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = Fraction(0)
        for monomial, coefficient in power.items():
            if any(source > target for source, target in zip(monomial, index)):
                continue
            weight = Fraction(1)
            for source, target, degree in zip(monomial, index, degrees):
                weight *= Fraction(
                    math.comb(target, source), math.comb(degree, source)
                )
            value += coefficient * weight
        count += 1
        digest.update((",".join(map(str, index)) + ":" + str(value) + "\n").encode())
        minimum = value if minimum is None else min(minimum, value)
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"index": list(index), "value": str(value)}
        elif value == 0:
            zero += 1
        else:
            positive += 1
    return {
        "degrees": list(degrees),
        "coefficients": count,
        "negative": negative,
        "zero": zero,
        "positive": positive,
        "minimum": str(minimum),
        "first_negative": first_negative,
        "ordered_sha256": digest.hexdigest().upper(),
    }


def vertex_record(expression: sp.Expr) -> dict[str, object]:
    values: list[tuple[tuple[int, ...], Fraction]] = []
    for vertex in itertools.product((0, 1), repeat=len(VARIABLES)):
        exact = sp.cancel(expression.subs(dict(zip(VARIABLES, vertex))))
        assert exact.is_Rational
        numerator, denominator = exact.as_numer_denom()
        values.append((vertex, Fraction(int(numerator), int(denominator))))
    minimum_vertex, minimum = min(values, key=lambda item: item[1])
    return {
        "vertices": len(values),
        "negative": sum(value < 0 for _, value in values),
        "minimum_vertex": list(minimum_vertex),
        "minimum": str(minimum),
    }


def ratio_bound_audit() -> dict[str, object]:
    order = sp.symbols("N", real=True)
    upper_56 = sp.cancel(6 * order / (order**2 - 15 * order + 10))
    upper_45 = sp.cancel(5 * order / (order**2 - 12 * order + 8))
    derivative_56 = sp.factor(sp.diff(upper_56, order))
    derivative_45 = sp.factor(sp.diff(upper_45, order))
    assert sp.cancel(upper_56.subs(order, 26)) == sp.Rational(39, 74)
    assert sp.cancel(upper_45.subs(order, 26)) == sp.Rational(65, 186)
    expected_derivative_56 = (
        -6 * (order**2 - 10) / (order**2 - 15 * order + 10) ** 2
    )
    expected_derivative_45 = (
        -5 * (order**2 - 8) / (order**2 - 12 * order + 8) ** 2
    )
    assert sp.cancel(derivative_56 - expected_derivative_56) == 0
    assert sp.cancel(derivative_45 - expected_derivative_45) == 0
    assert (order**2 - 15 * order + 10).subs(order, 26) == 296
    assert (order**2 - 12 * order + 8).subs(order, 26) == 372
    theorem = json.loads(
        (HERE / "uniform_vk_large_order_reduction_exact_20260816.json").read_text(
            encoding="utf-8"
        )
    )
    assert theorem["status"] == "PASS_EXACT_UNIFORM_VK_LARGE_ORDER_REDUCTION"
    assert theorem["theorems"]["extension_mean"] == "mu_s >= n-3s+2s/n"
    return {
        "input_theorem": theorem["status"],
        "d5_over_d6_function": str(upper_56),
        "d5_over_d6_derivative": str(derivative_56),
        "d5_over_d6_maximum_N_ge_26": "39/74",
        "d4_over_d5_function": str(upper_45),
        "d4_over_d5_derivative": str(derivative_45),
        "d4_over_d5_maximum_N_ge_26": "65/186",
        "denominator_guard": (
            "Both quadratic denominators are positive and strictly increasing "
            "from N=26; both derivatives are negative for real N>=26."
        ),
    }


def main() -> None:
    actual_files = {name: sha256(HERE / name) for name in EXPECTED_FILES}
    assert actual_files == EXPECTED_FILES, (actual_files, EXPECTED_FILES)
    ratios = ratio_bound_audit()
    reference_probe = json.loads(
        (
            HERE
            / "rank8_delta1_new_leaf_normalized_containment_box_probe_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    assert reference_probe["status"] == (
        "OPEN_BERNSTEIN_NEGATIVE_CONTAINMENT_BOX_METHOD_OBSTRUCTION"
    )

    gate = delta1_new_leaf_gate()
    x_upper = sp.Rational(39, 74)
    y_upper = sp.Rational(65, 186)
    normalization = {
        d[6]: 1,
        d[5]: x_upper * X,
        d[4]: x_upper * y_upper * X * Y,
        f[6]: U6,
        f[5]: x_upper * X * U5,
        f[4]: x_upper * y_upper * X * Y * U4,
    }
    expected_denominators = {
        0: "1",
        1: "2*(d6 + f5)",
        2: "1372*d5**3",
    }
    rows = []
    for mask in range(3):
        numerator, denominator = endpoint_numerator(gate, mask)
        raw_record = polynomial_record(numerator)
        raw_path = HERE / (
            "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_"
            f"m{mask:02d}_q_corner_agent_20260823.json"
        )
        raw_reference = json.loads(raw_path.read_text(encoding="utf-8"))
        assert raw_reference["gate"] == "new_leaf"
        assert raw_reference["rank"] == 1
        assert raw_reference["endpoint_mask"] == mask
        assert raw_record == raw_reference["cleared_numerator"]
        assert str(denominator) == expected_denominators[mask]

        original = sp.Poly(numerator, d[4], d[5], d[6], f[4], f[5], f[6])
        total_degrees = {sum(monomial) for monomial, _ in original.terms()}
        assert len(total_degrees) == 1
        normalized = sp.expand(numerator.subs(normalization, simultaneous=True))
        polynomial = sp.Poly(normalized, *VARIABLES, domain=sp.QQ)
        bernstein = bernstein_record(polynomial)
        vertices = vertex_record(normalized)
        reference = reference_probe["corners"][mask]
        assert reference["mask"] == mask
        assert reference["homogeneous_degree"] == next(iter(total_degrees))
        assert reference["normalized_power_terms"] == len(polynomial.terms())
        assert reference["bernstein"] == bernstein
        assert reference["vertices"] == vertices
        assert bernstein["negative"] == 0
        assert Fraction(bernstein["minimum"]) > 0
        rows.append(
            {
                "mask": mask,
                "endpoint_names": raw_reference["endpoint_names"],
                "positive_denominator": str(denominator),
                "raw_numerator": raw_record,
                "homogeneous_degree": next(iter(total_degrees)),
                "normalized_power_terms": len(polynomial.terms()),
                "bernstein": bernstein,
                "vertices": vertices,
            }
        )
        print(
            "MASK", mask, "TERMS", len(polynomial.terms()),
            "NEG", bernstein["negative"], "MIN", bernstein["minimum"],
            flush=True,
        )

    payload = {
        "schema": (
            "rank8-delta1-new-leaf-masks012-normalized-containment-box-"
            "independent-audit-v1"
        ),
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASKS_0_1_2",
        "independence": (
            "No project algebra module is imported. The terminal residual, Newton "
            "coefficient, leaf gate, Q endpoints, recurrence, normalization, and "
            "Bernstein conversion are independently transcribed here."
        ),
        "scope": (
            "For a source tree A of order n>=27, D=A-v has N>=26. The prior "
            "selected-degree theorem supplies d5/d6<=39/74 and d4/d5<=65/186. "
            "Because F=A-N[v] is induced in D, 0<=f_i<=d_i. The normalized box "
            "therefore encloses every compatible tuple."
        ),
        "ratio_bounds": ratios,
        "support_and_denominator_guard": (
            "Every forest is bipartite, so an order-N>=26 forest has an independent "
            "set of size at least 13; consequently d4,d5,d6>0. Thus every displayed "
            "Q denominator is positive on the theorem domain. Boundary X=0 in the "
            "closed box is used only to certify the numerator by continuity."
        ),
        "rows": rows,
        "proof_boundary": (
            "This proves only endpoint masks 0, 1, and 2 of the Delta1 new-leaf "
            "gate. Mask 3 remains open, so the full Delta1 gate, connected Q8, "
            "forest Q8, and Erdos Problem 993 are not closed by this certificate."
        ),
        "pinned_inputs": actual_files,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", sha256(Path(__file__)), flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
