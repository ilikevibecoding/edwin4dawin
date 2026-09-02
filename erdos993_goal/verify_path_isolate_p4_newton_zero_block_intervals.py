#!/usr/bin/env python3
"""Verify termwise support for the Newton zero block.

In centered coordinates t=s+1 and
E=2c+2m+x-1, every path-layer scalar has a guaranteed polynomial
zero interval of the form

  B+ell <= -t <= E-B+upper.

This script propagates those intervals through every terminal state
and every ordered cross term in the distinguished P4 kernel.  It then
checks whether, for complementary isolate layers, the two factor
intervals cover the full block 1<=-t<=E term by term.

If this succeeds symbolically, it proves the observed common
(1+z)^E factor of the Newton polynomial without relying on numerical
factorization.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from stress_path_isolate_p4_cross_polarizations import term_specs


@dataclass(frozen=True)
class ZeroInterval:
    """[B+lower, E-B+upper] in the variable K=-t."""

    lower: int
    upper: int


def common_zero(*values: ZeroInterval) -> ZeroInterval:
    return ZeroInterval(
        max(value.lower for value in values),
        min(value.upper for value in values),
    )


def path_layer(order_delta: int, rank_offset: int):
    rho = rank_offset
    delta = order_delta
    return (
        ZeroInterval(rho + 1, delta - rho),
        ZeroInterval(rho + 2, delta - rho - 1),
        ZeroInterval(rho + 3, delta - rho - 2),
        ZeroInterval(rho + 2, delta - rho - 2),
    )


def terminal_states(q_offset: int):
    def prow(order_delta: int, rank_relative: int):
        return path_layer(
            order_delta, q_offset + rank_relative
        )

    def pcount(order_delta: int, rank_relative: int):
        return prow(order_delta, rank_relative)[0]

    n, s, h, c = prow(1, 0)
    x_root = pcount(0, 0)
    root_residual = pcount(-1, 0)
    y = common_zero(x_root, root_residual)
    hx = common_zero(prow(0, 0)[1], root_residual)
    old_a = (n, s, h, c, x_root, y, hx)
    old_m = prow(0, -1)
    old_p = prow(0, -2)

    support_absent = pcount(0, 0)
    support_residual = pcount(-1, 0)
    support_hit = common_zero(
        support_absent, support_residual
    )
    support_absent_mass = common_zero(
        prow(0, 0)[1], support_residual
    )
    root_support_absent = pcount(-1, 0)

    lower_n, lower_s, lower_h, lower_c = prow(0, -1)
    lower_x = pcount(-1, -1)
    lower_root_residual = pcount(-2, -1)
    lower_y = common_zero(
        lower_x, lower_root_residual
    )
    lower_hx = common_zero(
        prow(-1, -1)[1], lower_root_residual
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
    b1 = common_zero(a1, residual1)
    ha1 = common_zero(prow(-1, -1)[1], residual1)
    m_lower, u_mass, k2, e_components = lower_m

    p_count, u_old, k2_old, e_old = old_p
    a2 = pcount(-1, -2)
    residual2 = pcount(-2, -2)
    b2 = common_zero(a2, residual2)
    ha2 = common_zero(prow(-1, -2)[1], residual2)
    p_lower, v_mass, l2, f_components = lower_p

    new_a = (
        common_zero(n, lower_n),
        common_zero(s, support_absent, lower_s),
        common_zero(
            h,
            support_absent_mass,
            support_absent,
            lower_h,
        ),
        common_zero(c, support_hit, lower_c),
        common_zero(x_root, lower_x),
        common_zero(y, lower_y),
        common_zero(hx, root_support_absent, lower_hx),
    )
    new_m = (
        common_zero(m_count, m_lower),
        common_zero(t_mass, a1, u_mass),
        common_zero(j2, ha1, a1, k2),
        common_zero(d_components, b1, e_components),
    )
    new_p = (
        common_zero(p_count, p_lower),
        common_zero(u_old, a2, v_mass),
        common_zero(k2_old, ha2, a2, l2),
        common_zero(e_old, b2, f_components),
    )
    return {
        "new": (new_a, new_m, new_p),
        "old": (old_a, old_m, old_p),
        "lower": (lower_a, lower_m, lower_p),
    }


def named(state):
    a, m, p = state
    n, s, h, c, x_root, y, hx = a
    m_count, t_mass, j2, d_components = m
    p_count, u_mass, k2, e_components = p
    return {
        "N": n,
        "S": s,
        "H": h,
        "C": c,
        "X": x_root,
        "Y": y,
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
    a, m, p = state
    n, s, h, c, x_root, y, hx = a
    m_count, t_mass, j2, d_components = m
    p_count, u_mass, k2, e_components = p
    return (
        (
            n,
            common_zero(s, n),
            common_zero(h, s, n),
            common_zero(c, n),
            x_root,
            y,
            common_zero(hx, x_root),
        ),
        (
            m_count,
            common_zero(t_mass, m_count),
            common_zero(j2, t_mass, m_count),
            common_zero(d_components, m_count),
        ),
        (
            p_count,
            common_zero(u_mass, p_count),
            common_zero(k2, u_mass, p_count),
            common_zero(e_components, p_count),
        ),
    )


def ordered_pairs(left_state, right_state):
    left = named(left_state)
    right = named(right_state)
    return [
        (left[left_name], right[right_name])
        for _, left_name, right_name in term_specs(5)
    ]


def kernel_pairs():
    states_q = terminal_states(0)
    states_lower = terminal_states(-1)
    pairs = []
    for phase_name in ("new", "old", "lower"):
        original = states_q[phase_name]
        selected = states_lower[phase_name]
        absent = unselected(original)
        for left, right in (
            (absent, absent),
            (original, original),
            (selected, absent),
            (absent, selected),
            (selected, selected),
            (selected, selected),
        ):
            pairs.extend(ordered_pairs(left, right))
    return pairs


def covers_block(
    left: ZeroInterval,
    right: ZeroInterval,
    b_left: int,
    b_right: int,
    e_value: int,
) -> bool:
    intervals = [
        (
            b_left + left.lower,
            e_value - b_left + left.upper,
        ),
        (
            b_right + right.lower,
            e_value - b_right + right.upper,
        ),
    ]
    covered = set()
    for lower, upper in intervals:
        covered.update(
            range(max(1, lower), min(e_value, upper) + 1)
        )
    return len(covered) == e_value


def main() -> None:
    pairs = kernel_pairs()
    failures = []
    checks = 0
    # Constants are small.  This exhaustive integer audit is wider
    # than the admissible q>=5 range and is used to discover whether
    # the termwise interval argument is valid before packaging a
    # symbolic inequality proof.
    for parity in (0, 1):
        for e_value in range(7, 61):
            for b_left in range(-30, 31):
                b_right = 2 - parity - b_left
                for pair_index, (left, right) in enumerate(pairs):
                    checks += 1
                    if not covers_block(
                        left,
                        right,
                        b_left,
                        b_right,
                        e_value,
                    ):
                        failures.append(
                            {
                                "parity_epsilon": parity,
                                "E": e_value,
                                "B_left": b_left,
                                "B_right": b_right,
                                "pair_index": pair_index,
                                "left": [
                                    left.lower,
                                    left.upper,
                                ],
                                "right": [
                                    right.lower,
                                    right.upper,
                                ],
                            }
                        )
                        if len(failures) >= 100:
                            break
                if len(failures) >= 100:
                    break
            if len(failures) >= 100:
                break
        if len(failures) >= 100:
            break

    report = {
        "status": (
            "PASS_EXPLORATORY_TERMWISE_ZERO_BLOCK_INTERVALS"
            if not failures
            else "FAIL_TERMWISE_ZERO_BLOCK_INTERVALS"
        ),
        "kernel_pair_count": len(pairs),
        "checks": checks,
        "audit_domain": (
            "epsilon in {0,1}, 7<=E<=60, "
            "-30<=B_left<=30, B_right=2-epsilon-B_left"
        ),
        "failure_count": len(failures),
        "first_failures": failures[:100],
        "warning": (
            "A pass is still a finite discovery audit; a symbolic "
            "coverage proof must follow."
        ),
    }
    Path(
        "path_isolate_p4_newton_zero_block_interval_audit_"
        "20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
