"""Derive exact rational ingredients for the tail-collision quarter lemma.

The intended proof has two parts.  At a Weyl collision, a first-coordinate
Schur complement reduces the tail count difference to the trailing 2x2
current block versus the trailing scalar of the adjacent block.  Exact
signs then leave two possible equal-count intervals.  Bernstein controls
for the collision cubic exclude [1/4,a2], and a resolvent ceiling excludes
the upper equal-count interval (d1,lambda_2).

This script derives the rational expressions and optionally records their
multidegrees and factorizations.  Positivity certification is performed in
separate, smaller stages so every generated artifact remains auditable.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c", nonnegative=True)


def load_values(parity: str, r_value: int | None = None):
    local = {"r": R, "u": U, "v": V, "c": C}
    tail_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json").read_text()
    )
    expression_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_expression_cache_20260806.json").read_text()
    )
    current = {key: sp.sympify(value, locals=local) for key, value in tail_raw["current"].items()}
    adjacent = {key: sp.sympify(value, locals=local) for key, value in tail_raw["adjacent"].items()}
    # Only the two Cholesky pivots are needed here.  The same cache also stores
    # the much larger radical-majorant certificates from the one-sided theorem;
    # parsing those unused strings dominated every checkpoint restart.
    needed_expression_keys = (
        "current_penultimate_cholesky_pivot",
        "current_last_cholesky_pivot",
    )
    expressions = {
        key: sp.sympify(expression_raw["expressions"][key], locals=local)
        for key in needed_expression_keys
    }
    if r_value is not None:
        current = {key: sp.cancel(value.subs(R, r_value)) for key, value in current.items()}
        adjacent = {key: sp.cancel(value.subs(R, r_value)) for key, value in adjacent.items()}
        expressions = {key: sp.cancel(value.subs(R, r_value)) for key, value in expressions.items()}

    if parity == "odd":
        alpha = 2 * R
        n = R + 6
        beta = sp.Rational(1, 2)
    else:
        alpha = 2 * R + 1
        n = R + 7
        beta = sp.Rational(-1, 2)
    pivot = sp.cancel(
        (n - 2 + alpha) * (n - 2 + alpha + beta)
        / ((2 * (n - 3) + alpha + beta + 1) * (2 * (n - 3) + alpha + beta + 2))
    )
    if r_value is not None:
        pivot = sp.cancel(pivot.subs(R, r_value))

    q1 = expressions["current_penultimate_cholesky_pivot"]
    q2 = expressions["current_last_cholesky_pivot"]
    b0 = current["b_previous"]
    f_current = current["terminal"]
    values = {
        "a0": sp.cancel(pivot + b0 / pivot),
        "a1": sp.cancel(q1 + f_current / q1),
        "a2": q2,
        "b1": sp.cancel(q1 * b0 / pivot),
        "b2": sp.cancel(q2 * f_current / q1),
        "d0": adjacent["d_previous"],
        "d1": adjacent["d_last"],
        "f": adjacent["terminal"],
        # Retain the current-tail Cholesky data.  It supplies a cancellation-
        # free form of delta^2*n_A(d1+f/delta) below.
        "_q1": q1,
        "_q2": q2,
        "_current_terminal": f_current,
    }
    return values


def iter_interval_bernstein_controls(values, threshold: sp.Rational):
    """Return the four cubic Bernstein controls on [threshold,a2]."""
    a0, a1, a2 = values["a0"], values["a1"], values["a2"]
    b1, b2 = values["b1"], values["b2"]
    d0, d1, f = values["d0"], values["d1"], values["f"]
    q1 = values["_q1"]
    q2 = values["_q2"]
    current_terminal = values["_current_terminal"]
    delta = sp.cancel(a0 - d0)

    def trailing_characteristic(y):
        # With a1=q1+g/q1, a2=q2 and b2=q2*g/q1, the direct
        # expression (y-a1)(y-a2)-b2 simplifies before expansion to
        # (y-q1)(y-q2)-g*y/q1.  This removes the same large squared
        # Cholesky denominator which appears in the z-ceiling ingredient.
        return (y - q1) * (y - q2) - current_terminal * y / q1

    def trailing_characteristic_derivative(y):
        return 2 * y - q1 - q2 - current_terminal / q1

    def collision(y):
        na = trailing_characteristic(y)
        nh = y - d1
        return na * (delta * nh - f) + b1 * nh * (y - a2)

    def collision_derivative(y):
        na = trailing_characteristic(y)
        nap = trailing_characteristic_derivative(y)
        nh = y - d1
        return (
            nap * (delta * nh - f)
            + na * delta
            + b1 * ((y - a2) + nh)
        )

    span = a2 - threshold
    endpoint0 = collision(threshold)
    yield endpoint0
    yield endpoint0 + span * collision_derivative(threshold) / 3
    del endpoint0
    endpoint1 = collision(a2)
    yield endpoint1 - span * collision_derivative(a2) / 3
    yield endpoint1


def interval_positive_scaling_factors(values):
    """Positive factors clearing the four interval-control denominators.

    If D0,D1,D2 are the reduced denominators of d1,q1,q2, respectively,
    the kth cubic Bernstein control has reduced denominator dividing
    D0*D1*D2**k.  Each factor is certified separately.
    """
    factors = (
        sp.fraction(values["d1"])[1],
        sp.fraction(values["_q1"])[1],
        sp.fraction(values["_q2"])[1],
    )
    return tuple(map(sp.expand, factors))


def interval_bernstein_controls(values, threshold: sp.Rational):
    return tuple(iter_interval_bernstein_controls(values, threshold))


def iter_ingredients(values, skip_names=frozenset()):
    a0, a1, a2 = values["a0"], values["a1"], values["a2"]
    b1, b2 = values["b1"], values["b2"]
    d0, d1, f = values["d0"], values["d1"], values["f"]
    delta = sp.cancel(a0 - d0)

    if "delta" not in skip_names:
        yield "delta", delta
    if "d1_minus_a2" not in skip_names:
        yield "d1_minus_a2", sp.cancel(d1 - a2)
    if "d1_inside_trailing_spectrum" not in skip_names:
        yield "d1_inside_trailing_spectrum", sp.cancel(b2 - (d1 - a1) * (d1 - a2))

    trailing_trace = a1 + a2
    trace_remainder_slope = sp.cancel(trailing_trace - d0 - d1)
    if "trailing_trace_gap" not in skip_names:
        yield "trailing_trace_gap", -trace_remainder_slope

    if "z_minus_a1_scaled" not in skip_names:
        z_minus_a1_scaled = sp.cancel(f + delta * (d1 - a1))
        yield "z_minus_a1_scaled", z_minus_a1_scaled
    if "z_minus_a2_scaled" not in skip_names:
        z_minus_a2_scaled = sp.cancel(f + delta * (d1 - a2))
        yield "z_minus_a2_scaled", z_minus_a2_scaled
    if "z_characteristic_scaled" not in skip_names:
        # Put Z=delta*d1+f.  With the current-tail Cholesky data
        # a1=q1+g/q1, a2=q2, b2=q2*g/q1, direct cancellation gives
        #   delta^2 n_A(d1+f/delta)
        #   =(Z-delta*q1)(Z-delta*q2)-delta*g*Z/q1.
        # This removes a squared q1 denominator before expansion.
        z_numerator = sp.cancel(delta * d1 + f)
        q1 = values["_q1"]
        q2 = values["_q2"]
        current_terminal = values["_current_terminal"]
        z_characteristic_scaled = sp.cancel(
            (z_numerator - delta * q1) * (z_numerator - delta * q2)
            - delta * current_terminal * z_numerator / q1
        )
        yield "z_characteristic_scaled", z_characteristic_scaled

    scale_d0, scale_d1, scale_d2 = interval_positive_scaling_factors(values)
    for name, factor in (
        ("quarter_interval_scale_d0", scale_d0),
        ("quarter_interval_scale_d1", scale_d1),
        ("quarter_interval_scale_d2", scale_d2),
    ):
        if name not in skip_names:
            yield name, factor

    interval_names = tuple(f"quarter_interval_bernstein_{index}" for index in range(4))
    if not all(name in skip_names for name in interval_names):
        for index, control in enumerate(
            iter_interval_bernstein_controls(values, sp.Rational(1, 4))
        ):
            name = interval_names[index]
            if name not in skip_names:
                positive_scale = scale_d0 * scale_d1 * scale_d2**index
                yield name, sp.cancel(control * positive_scale)

    # This is substantially larger than the other ingredients at symbolic r.
    # Keep it last so every independent sign is checkpointed before forming it.
    if "lower_tail_square_gap" not in skip_names:
        trace_remainder_constant = sp.cancel(d0 * d1 - f - a1 * a2 + b2)
        trailing_determinant = sp.cancel(a1 * a2 - b2)
        # If q_B(y)=y^2-T*y+P and q_H-q_B=L*y+M, then
        # Res(q_B,q_H)=M^2+L*M*T+L^2*P.  Also
        # L^2*Delta-(2*M+L*T)^2 = -4*Res(q_B,q_H).
        # The resultant form avoids the catastrophic cancellation between two
        # separately expanded large squares in the equivalent discriminant form.
        lower_tail_square_gap = sp.cancel(
            -4
            * (
                trace_remainder_constant**2
                + trace_remainder_slope * trace_remainder_constant * trailing_trace
                + trace_remainder_slope**2 * trailing_determinant
            )
        )
        yield "lower_tail_square_gap", lower_tail_square_gap


def ingredients(values):
    return dict(iter_ingredients(values))


def expression_record(value, *, factor: bool):
    value = sp.cancel(value)
    numerator, denominator = sp.fraction(value)
    polynomial = sp.Poly(sp.expand(numerator), R, U, V, C)
    record = {
        "degrees_r_u_v_c": [polynomial.degree(variable) for variable in (R, U, V, C)],
        "numerator_term_count": len(polynomial.terms()),
        "denominator_length": len(str(denominator)),
    }
    if factor:
        record["factored_numerator"] = str(sp.factor(numerator))
        record["factored_denominator"] = str(sp.factor(denominator))
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--r", type=int)
    parser.add_argument("--factor", action="store_true")
    args = parser.parse_args()
    print("loading exact tails", flush=True)
    values = load_values(args.parity, args.r)
    print("forming lemma ingredients", flush=True)
    records = {}
    for name, value in iter_ingredients(values):
        print(f"recording {name}", flush=True)
        records[name] = expression_record(value, factor=args.factor)
    suffix = "symbolic" if args.r is None else f"r{args.r}"
    output = HERE / f"tail_collision_quarter_ingredients_{args.parity}_{suffix}_20260806.json"
    output.write_text(
        json.dumps(
            {
                "parity": args.parity,
                "r_specialization": args.r,
                "records": records,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(output, flush=True)


if __name__ == "__main__":
    main()
