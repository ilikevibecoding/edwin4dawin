#!/usr/bin/env python3
"""Symbolic two-layer kernel for the path-terminal P4 recurrence.

Unlike the truncated-series engine, this file keeps the two ordinary
isolate input layers ``a`` and ``b`` symbolic.  It exposes the kernel
whose fixed-intersection binomial convolution is the candidate
all-layer certificate.
"""

from __future__ import annotations

import functools

import sympy as sp

from derive_bare_path_terminal_phase_gap import path_row
from stress_path_isolate_p4_cross_polarizations import term_specs


@functools.cache
def path_layer(order, rank, layer):
    n, s, square, components = path_row(order, rank - layer)
    previous_n = path_row(order, rank - layer + 1)[0]
    previous_s = path_row(order, rank - layer + 1)[1]
    previous2_n = path_row(order, rank - layer + 2)[0]
    return (
        n,
        s + layer * previous_n,
        square
        + 2 * layer * previous_s
        + layer * previous_n
        + layer * (layer - 1) * previous2_n,
        components + layer * previous_n,
    )


@functools.cache
def terminal_states(q, length, layer):
    def prow(order, rank):
        return path_layer(order, rank, layer)

    def pcount(order, rank):
        return prow(order, rank)[0]

    N, S, H, C = prow(length + 1, q)
    X = pcount(length, q)
    root_residual = pcount(length - 1, q)
    Y = X - root_residual
    HX = prow(length, q)[1] + root_residual
    old_a = (N, S, H, C, X, Y, HX)
    old_m = prow(length, q - 1)
    old_p = prow(length, q - 2)

    support_absent = pcount(length, q)
    support_residual = pcount(length - 1, q)
    support_hit = support_absent - support_residual
    support_absent_mass = (
        prow(length, q)[1] + support_residual
    )
    root_support_absent = pcount(length - 1, q)

    lower_n, lower_s, lower_h, lower_c = prow(
        length, q - 1
    )
    lower_x = pcount(length - 1, q - 1)
    lower_root_residual = pcount(length - 2, q - 1)
    lower_y = lower_x - lower_root_residual
    lower_hx = (
        prow(length - 1, q - 1)[1]
        + lower_root_residual
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
    lower_m = prow(length - 1, q - 2)
    lower_p = prow(length - 1, q - 3)

    M, T, J2, D = old_m
    A1 = pcount(length - 1, q - 1)
    residual1 = pcount(length - 2, q - 1)
    B1 = A1 - residual1
    HA1 = prow(length - 1, q - 1)[1] + residual1
    m, u, k2, e = lower_m

    P, U, K2, E = old_p
    A2 = pcount(length - 1, q - 2)
    residual2 = pcount(length - 2, q - 2)
    B2 = A2 - residual2
    HA2 = prow(length - 1, q - 2)[1] + residual2
    p, V, L2, F = lower_p

    new_a = (
        N + lower_n,
        S + support_absent + lower_s,
        H
        + 2 * support_absent_mass
        + support_absent
        + lower_h,
        C + support_hit + lower_c,
        X + lower_x,
        Y + lower_y,
        HX + root_support_absent + lower_hx,
    )
    new_m = (
        M + m,
        T + A1 + u,
        J2 + 2 * HA1 + A1 + k2,
        D + B1 + e,
    )
    new_p = (
        P + p,
        U + A2 + V,
        K2 + 2 * HA2 + A2 + L2,
        E + B2 + F,
    )
    return {
        "new": (q, new_a, new_m, new_p),
        "old": (q, old_a, old_m, old_p),
        "lower": (q - 1, lower_a, lower_m, lower_p),
    }


def named(state):
    _, A, M, P = state
    N, S, H, C, X, Y, HX = A
    m, T, J2, D = M
    p, U, K2, E = P
    return {
        "N": N,
        "S": S,
        "H": H,
        "C": C,
        "X": X,
        "Y": Y,
        "HX": HX,
        "m": m,
        "T": T,
        "J2": J2,
        "D": D,
        "p": p,
        "U": U,
        "K2": K2,
        "E": E,
    }


def unselected(state):
    q, A, M, P = state
    N, S, H, C, X, Y, HX = A
    m, T, J2, D = M
    p, U, K2, E = P
    return (
        q,
        (
            N,
            S + N,
            H + 2 * S + N,
            C + N,
            X,
            Y,
            HX + X,
        ),
        (m, T + m, J2 + 2 * T + m, D + m),
        (p, U + p, K2 + 2 * U + p, E + p),
    )


def ordered_cross(left_state, right_state, q_scalar):
    left = named(left_state)
    right = named(right_state)
    return sum(
        scalar * left[left_name] * right[right_name]
        for scalar, left_name, right_name in term_specs(q_scalar)
    )


def distinguished_kernel(q, length, a, b):
    states_q_a = terminal_states(q, length, a)
    states_q_b = terminal_states(q, length, b)
    states_lower_a = terminal_states(q - 1, length, a)
    states_lower_b = terminal_states(q - 1, length, b)
    total = 0
    for phase_name, sign in (
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
        total += sign * (
            ordered_cross(absent_a, absent_b, q_scalar)
            - ordered_cross(original_a, original_b, q_scalar)
            + ordered_cross(selected_a, absent_b, q_scalar)
            + ordered_cross(absent_a, selected_b, q_scalar)
            + ordered_cross(selected_a, selected_b, q_scalar)
            - ordered_cross(
                selected_a, selected_b, selected_a[0]
            )
        )
    return total


if __name__ == "__main__":
    q, length, a, b = sp.symbols(
        "q L a b", integer=True, nonnegative=True
    )
    print(distinguished_kernel(q, length, a, b))
