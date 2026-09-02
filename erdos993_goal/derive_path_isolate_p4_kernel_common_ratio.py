#!/usr/bin/env python3
"""Factor the fixed-layer P4 kernel by two common path counts.

Every path moment in the terminal P4 kernel is a rational multiple of

  B_l = i_(q-l)(P_(L+1))
      = binom(L-q+l+2, q-l).

This script carries out the whole phase calculation in the rational
function field Q(q,L,a,b) using python-flint.  It returns the reduced
weight W such that

  Q_q^L(a,b) = B_a B_b W(q,L,a,b),

then specializes to the stable convolution coordinates

  q=c+m+s+2, L=2q-4+x,
  a=c+u, b=c+2m+epsilon-u.
"""

from __future__ import annotations

import functools
import hashlib
import json
import math
from pathlib import Path

from flint import fmpq_mpoly, fmpq_mpoly_ctx

from stress_path_isolate_p4_cross_polarizations import term_specs


CTX = fmpq_mpoly_ctx.get(("q", "L", "a", "b"), "lex")
q, length, a_var, b_var = CTX.gens()
ONE = CTX.constant(1)
ZERO = CTX.constant(0)


class RF:
    """A reduced multivariate rational function."""

    __slots__ = ("num", "den")

    def __init__(
        self,
        num: int | fmpq_mpoly | "RF" = 0,
        den: int | fmpq_mpoly = 1,
        *,
        reduce: bool = True,
    ) -> None:
        if isinstance(num, RF):
            self.num = num.num
            self.den = num.den
            return
        self.num = (
            num if isinstance(num, fmpq_mpoly) else CTX.constant(num)
        )
        self.den = (
            den if isinstance(den, fmpq_mpoly) else CTX.constant(den)
        )
        if not self.den:
            raise ZeroDivisionError
        if reduce:
            self._reduce()

    @staticmethod
    def coerce(value: int | fmpq_mpoly | "RF") -> "RF":
        return value if isinstance(value, RF) else RF(value)

    def _reduce(self) -> None:
        if not self.num:
            self.den = ONE
            return
        common = self.num.gcd(self.den)
        if not common.is_one():
            self.num //= common
            self.den //= common
        if self.den.leading_coefficient() < 0:
            self.num = -self.num
            self.den = -self.den

    def __neg__(self) -> "RF":
        return RF(-self.num, self.den, reduce=False)

    def __add__(self, other) -> "RF":
        other = RF.coerce(other)
        common = self.den.gcd(other.den)
        left_scale = other.den // common
        right_scale = self.den // common
        result = RF(
            self.num * left_scale + other.num * right_scale,
            self.den * left_scale,
            reduce=False,
        )
        result._reduce()
        return result

    def __radd__(self, other) -> "RF":
        return self + other

    def __sub__(self, other) -> "RF":
        return self + (-RF.coerce(other))

    def __rsub__(self, other) -> "RF":
        return RF.coerce(other) - self

    def __mul__(self, other) -> "RF":
        other = RF.coerce(other)
        left_common = self.num.gcd(other.den)
        right_common = other.num.gcd(self.den)
        result = RF(
            (self.num // left_common)
            * (other.num // right_common),
            (self.den // right_common)
            * (other.den // left_common),
            reduce=False,
        )
        return result

    def __rmul__(self, other) -> "RF":
        return self * other

    def __truediv__(self, other) -> "RF":
        other = RF.coerce(other)
        if not other.num:
            raise ZeroDivisionError
        return self * RF(other.den, other.num, reduce=False)

    def __rtruediv__(self, other) -> "RF":
        return RF.coerce(other) / self


def factorial_ratio(base: fmpq_mpoly, shift: int) -> RF:
    """Return (base+shift)!/base! for a fixed integer shift."""

    result = RF(1)
    if shift >= 0:
        for offset in range(1, shift + 1):
            result *= base + offset
    else:
        for offset in range(0, -shift):
            result /= base - offset
    return result


@functools.cache
def raw_count_ratio(
    layer_name: str,
    order_delta: int,
    rank_offset: int,
) -> RF:
    layer = a_var if layer_name == "a" else b_var
    top_base = length - q + layer + 2
    slack_base = length - 2 * q + 2 * layer + 2
    return (
        factorial_ratio(
            top_base, order_delta - rank_offset - 1
        )
        / factorial_ratio(q - layer, rank_offset)
        / factorial_ratio(
            slack_base,
            order_delta - 2 * rank_offset - 1,
        )
    )


@functools.cache
def raw_mass_ratio(
    layer_name: str,
    order_delta: int,
    rank_offset: int,
) -> RF:
    layer = a_var if layer_name == "a" else b_var
    order = length + order_delta
    rank = q + rank_offset - layer
    slack = order - 2 * rank + 1
    top = order - rank + 1
    return (
        raw_count_ratio(
            layer_name, order_delta, rank_offset
        )
        * slack
        * (slack - 1)
        / top
    )


@functools.cache
def path_row(
    layer_name: str,
    order_delta: int,
    rank_offset: int,
) -> tuple[RF, RF, RF, RF]:
    layer = a_var if layer_name == "a" else b_var
    order = length + order_delta
    rank = q + rank_offset - layer
    slack = order - 2 * rank + 1
    top = order - rank + 1
    count = raw_count_ratio(
        layer_name, order_delta, rank_offset
    )
    mass = raw_mass_ratio(
        layer_name, order_delta, rank_offset
    )
    residual_edges = (
        count
        * slack
        * (slack - 1)
        * (slack - 2)
        / top
        / (top - 1)
    )
    extra_square = (
        residual_edges
        * (slack - 3)
    )
    square = mass + extra_square + 2 * residual_edges
    components = mass - residual_edges

    previous_count = (
        layer
        * raw_count_ratio(
            layer_name, order_delta, rank_offset + 1
        )
    )
    previous_mass = (
        2
        * layer
        * raw_mass_ratio(
            layer_name, order_delta, rank_offset + 1
        )
    )
    previous2_count = (
        layer
        * (layer - 1)
        * raw_count_ratio(
            layer_name, order_delta, rank_offset + 2
        )
    )
    return (
        count,
        mass + previous_count,
        square
        + previous_mass
        + previous_count
        + previous2_count,
        components + previous_count,
    )


@functools.cache
def terminal_states(
    q_offset: int,
    layer_name: str,
):
    def prow(order_delta: int, rank_relative: int):
        return path_row(
            layer_name,
            order_delta,
            q_offset + rank_relative,
        )

    def pcount(order_delta: int, rank_relative: int):
        return prow(order_delta, rank_relative)[0]

    n_count, mass, square, components = prow(1, 0)
    x_root = pcount(0, 0)
    root_residual = pcount(-1, 0)
    y_hit = x_root - root_residual
    hx = prow(0, 0)[1] + root_residual
    old_a = (
        n_count,
        mass,
        square,
        components,
        x_root,
        y_hit,
        hx,
    )
    old_m = prow(0, -1)
    old_p = prow(0, -2)

    support_absent = pcount(0, 0)
    support_residual = pcount(-1, 0)
    support_hit = support_absent - support_residual
    support_absent_mass = (
        prow(0, 0)[1] + support_residual
    )
    root_support_absent = pcount(-1, 0)

    lower_n, lower_s, lower_h, lower_c = prow(0, -1)
    lower_x = pcount(-1, -1)
    lower_root_residual = pcount(-2, -1)
    lower_y = lower_x - lower_root_residual
    lower_hx = (
        prow(-1, -1)[1] + lower_root_residual
    )
    lower_a = (
        lower_n,
        lower_s,
        lower_h,
        lower_c,
        lower_x,
        lower_y,
        lower_hx,
    )
    lower_m = prow(-1, -2)
    lower_p = prow(-1, -3)

    m_count, t_mass, j2, d_components = old_m
    a1 = pcount(-1, -1)
    residual1 = pcount(-2, -1)
    b1 = a1 - residual1
    ha1 = prow(-1, -1)[1] + residual1
    m_lower, u_mass, k2, e_components = lower_m

    p_count, u_old, k2_old, e_old = old_p
    a2 = pcount(-1, -2)
    residual2 = pcount(-2, -2)
    b2 = a2 - residual2
    ha2 = prow(-1, -2)[1] + residual2
    p_lower, v_mass, l2, f_components = lower_p

    new_a = (
        n_count + lower_n,
        mass + support_absent + lower_s,
        square
        + 2 * support_absent_mass
        + support_absent
        + lower_h,
        components + support_hit + lower_c,
        x_root + lower_x,
        y_hit + lower_y,
        hx + root_support_absent + lower_hx,
    )
    new_m = (
        m_count + m_lower,
        t_mass + a1 + u_mass,
        j2 + 2 * ha1 + a1 + k2,
        d_components + b1 + e_components,
    )
    new_p = (
        p_count + p_lower,
        u_old + a2 + v_mass,
        k2_old + 2 * ha2 + a2 + l2,
        e_old + b2 + f_components,
    )
    return {
        "new": (q + q_offset, new_a, new_m, new_p),
        "old": (q + q_offset, old_a, old_m, old_p),
        "lower": (
            q + q_offset - 1,
            lower_a,
            lower_m,
            lower_p,
        ),
    }


def named(state):
    _, a_state, m_state, p_state = state
    n_count, mass, square, components, x_root, y_hit, hx = (
        a_state
    )
    m_count, t_mass, j2, d_components = m_state
    p_count, u_mass, k2, e_components = p_state
    return {
        "N": n_count,
        "S": mass,
        "H": square,
        "C": components,
        "X": x_root,
        "Y": y_hit,
        "HX": hx,
        "m": m_count,
        "T": t_mass,
        "J2": j2,
        "D": d_components,
        "p": p_count,
        "U": u_mass,
        "K2": k2,
        "E": e_components,
    }


def unselected(state):
    q_scalar, a_state, m_state, p_state = state
    n_count, mass, square, components, x_root, y_hit, hx = (
        a_state
    )
    m_count, t_mass, j2, d_components = m_state
    p_count, u_mass, k2, e_components = p_state
    return (
        q_scalar,
        (
            n_count,
            mass + n_count,
            square + 2 * mass + n_count,
            components + n_count,
            x_root,
            y_hit,
            hx + x_root,
        ),
        (
            m_count,
            t_mass + m_count,
            j2 + 2 * t_mass + m_count,
            d_components + m_count,
        ),
        (
            p_count,
            u_mass + p_count,
            k2 + 2 * u_mass + p_count,
            e_components + p_count,
        ),
    )


def ordered_cross(left_state, right_state, q_scalar):
    left = named(left_state)
    right = named(right_state)
    return sum(
        (
            RF(scalar)
            * left[left_name]
            * right[right_name]
            for scalar, left_name, right_name in term_specs(
                q_scalar
            )
        ),
        RF(0),
    )


def kernel_ratio() -> RF:
    states_q_a = terminal_states(0, "a")
    states_q_b = terminal_states(0, "b")
    states_lower_a = terminal_states(-1, "a")
    states_lower_b = terminal_states(-1, "b")
    total = RF(0)
    for phase_name, phase_sign in (
        ("new", 1),
        ("old", -1),
        ("lower", -1),
    ):
        original_a = states_q_a[phase_name]
        original_b = states_q_b[phase_name]
        selected_a = states_lower_a[phase_name]
        selected_b = states_lower_b[phase_name]
        absent_a = unselected(original_a)
        absent_b = unselected(original_b)
        q_scalar = original_a[0]
        phase = (
            ordered_cross(absent_a, absent_b, q_scalar)
            - ordered_cross(
                original_a, original_b, q_scalar
            )
            + ordered_cross(
                selected_a, absent_b, q_scalar
            )
            + ordered_cross(
                absent_a, selected_b, q_scalar
            )
            + ordered_cross(
                selected_a, selected_b, q_scalar
            )
            - ordered_cross(
                selected_a, selected_b, selected_a[0]
            )
        )
        total += phase_sign * phase
        print(
            f"assembled phase {phase_name}: "
            f"num_terms={len(total.num)}, "
            f"den_terms={len(total.den)}",
            flush=True,
        )
    total._reduce()
    return total


def main() -> None:
    ratio = kernel_ratio()
    Path("path_isolate_p4_kernel_common_ratio_num_20260801.txt").write_text(
        str(ratio.num) + "\n", encoding="utf-8"
    )
    Path("path_isolate_p4_kernel_common_ratio_den_20260801.txt").write_text(
        str(ratio.den) + "\n", encoding="utf-8"
    )
    from derive_path_isolate_p4_symbolic_kernel import (
        distinguished_kernel,
    )

    validations = []
    for q_value, length_value, a_value, b_value in (
        (5, 6, 1, 2),
        (7, 12, 2, 4),
        (8, 15, 3, 5),
    ):
        ratio_value = (
            ratio.num(
                q_value, length_value, a_value, b_value
            )
            / ratio.den(
                q_value, length_value, a_value, b_value
            )
        )
        base_a = math.comb(
            length_value - q_value + a_value + 2,
            q_value - a_value,
        )
        base_b = math.comb(
            length_value - q_value + b_value + 2,
            q_value - b_value,
        )
        extracted = ratio_value * base_a * base_b
        direct = distinguished_kernel(
            q_value, length_value, a_value, b_value
        )
        validations.append(
            {
                "q": q_value,
                "L": length_value,
                "a": a_value,
                "b": b_value,
                "factored_value": str(extracted),
                "direct_value": str(direct),
                "difference": str(extracted - direct),
            }
        )
        if extracted != direct:
            raise AssertionError(validations[-1])

    stable_ctx = fmpq_mpoly_ctx.get(
        ("u", "c", "m", "s", "x"), "lex"
    )
    u, c, m, s, x = stable_ctx.gens()
    q_value = c + m + s + 2
    length_value = 2 * q_value - 4 + x
    records = []
    for parity in (0, 1):
        substitutions = (
            q_value,
            length_value,
            c + u,
            c + 2 * m + parity - u,
        )
        numerator = ratio.num.compose(
            *substitutions, ctx=stable_ctx
        )
        denominator = ratio.den.compose(
            *substitutions, ctx=stable_ctx
        )
        common = numerator.gcd(denominator)
        numerator //= common
        denominator //= common
        if denominator.leading_coefficient() < 0:
            numerator = -numerator
            denominator = -denominator
        numerator_text = str(numerator)
        denominator_text = str(denominator)
        records.append(
            {
                "parity_epsilon": parity,
                "numerator_terms": len(numerator),
                "denominator_terms": len(denominator),
                "numerator_degrees_u_c_m_s_x": list(
                    map(int, numerator.degrees())
                ),
                "denominator_degrees_u_c_m_s_x": list(
                    map(int, denominator.degrees())
                ),
                "numerator_sha256": hashlib.sha256(
                    numerator_text.encode("utf-8")
                ).hexdigest(),
                "denominator_sha256": hashlib.sha256(
                    denominator_text.encode("utf-8")
                ).hexdigest(),
            }
        )
        print(
            f"stable parity={parity}: "
            f"num_terms={len(numerator)}, "
            f"den_terms={len(denominator)}",
            flush=True,
        )

    report = {
        "status": "PASS_PATH_ISOLATE_P4_KERNEL_COMMON_RATIO",
        "identity": (
            "Q_q^L(a,b)=B_a B_b W(q,L,a,b), "
            "B_l=binom(L-q+l+2,q-l)"
        ),
        "common_ratio_num_terms": len(ratio.num),
        "common_ratio_den_terms": len(ratio.den),
        "common_ratio_numerator_degrees_q_L_a_b": list(
            map(int, ratio.num.degrees())
        ),
        "common_ratio_denominator_degrees_q_L_a_b": list(
            map(int, ratio.den.degrees())
        ),
        "common_ratio_numerator_sha256": hashlib.sha256(
            str(ratio.num).encode("utf-8")
        ).hexdigest(),
        "common_ratio_denominator_sha256": hashlib.sha256(
            str(ratio.den).encode("utf-8")
        ).hexdigest(),
        "numeric_validations": validations,
        "stable_records": records,
    }
    Path(
        "path_isolate_p4_kernel_common_ratio_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
