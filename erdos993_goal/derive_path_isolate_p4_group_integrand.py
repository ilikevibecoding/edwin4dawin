#!/usr/bin/env python3
"""Derive a coefficient-extraction integrand for the P4 group.

For a path-count atom across isolate layer u,

  binom(u+A, C-u)
    = [z^C] (1+z)^A {z(1+z)}^u.

Consequently, the fixed-intersection binomial convolution over
u+v=d is obtained by applying layer-moment operators to

  (Z+W)^d,  Z=z(1+z), W=w(1+w).

This script propagates exact path count/moment atoms through all
terminal states and the distinguished-isolate P4 kernel.  It derives
the common coefficient-extraction integrand, verifies it numerically
against the direct group engine, and tests whether the two-layer
lift integrand is coefficientwise nonnegative after its unavoidable
common factors are removed.
"""

from __future__ import annotations

import functools
import json
import math
from pathlib import Path

import sympy as sp

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_cross_polarizations import term_specs
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


q, length, c, d = sp.symbols(
    "q L c d", integer=True, nonnegative=True
)
u, v = sp.symbols("u v", integer=True)
z, w, Z, W, T = sp.symbols("z w Z W T")

# An atom is coefficient * binom(u+A0+aoff, C0+coff-u).
Atom = tuple[sp.Expr, int, int]
Sequence = tuple[Atom, ...]


def seq_add(*values: Sequence) -> Sequence:
    grouped: dict[tuple[int, int], sp.Expr] = {}
    for value in values:
        for coefficient, aoff, coff in value:
            key = (aoff, coff)
            grouped[key] = grouped.get(key, 0) + coefficient
    result = []
    for (aoff, coff), coefficient in grouped.items():
        coefficient = sp.expand(coefficient)
        if coefficient != 0:
            result.append((coefficient, aoff, coff))
    return tuple(result)


def seq_scale(value: Sequence, scalar: sp.Expr) -> Sequence:
    return seq_add(
        tuple(
            (sp.expand(scalar * coefficient), aoff, coff)
            for coefficient, aoff, coff in value
        )
    )


def seq_neg(value: Sequence) -> Sequence:
    return seq_scale(value, -1)


def seq_sub(left: Sequence, *right: Sequence) -> Sequence:
    return seq_add(left, *(seq_neg(value) for value in right))


@functools.cache
def path_layer(
    order_delta: int,
    rank_offset: int,
    layer_variable: sp.Symbol,
) -> tuple[Sequence, Sequence, Sequence, Sequence]:
    """Count, mass, square, components as path-count atoms."""

    rho = rank_offset
    delta = order_delta
    aoff = delta - rho
    coff = rho
    c_effective = q - c + rho
    layer = c + layer_variable
    slack = (
        length
        - 2 * q
        + 2 * c
        + 1
        + delta
        - 2 * rho
        + 2 * layer_variable
    )
    count: Sequence = ((sp.Integer(1), aoff, coff),)
    mass: Sequence = ((slack - 1, aoff - 1, coff),)
    square: Sequence = (
        (slack - 1, aoff - 1, coff),
        ((slack - 1) * (slack - 2), aoff - 2, coff),
    )
    components: Sequence = (
        (c_effective + 1 - layer_variable, aoff - 2, coff),
    )

    previous_count: Sequence = (
        (layer, aoff - 1, coff + 1),
    )
    previous_mass: Sequence = (
        (
            2 * layer * (slack - 3),
            aoff - 2,
            coff + 1,
        ),
    )
    previous2_count: Sequence = (
        (
            layer * (layer - 1),
            aoff - 2,
            coff + 2,
        ),
    )
    return (
        count,
        seq_add(mass, previous_count),
        seq_add(
            square,
            previous_mass,
            previous_count,
            previous2_count,
        ),
        seq_add(components, previous_count),
    )


@functools.cache
def terminal_states(
    q_offset: int,
    layer_variable: sp.Symbol,
):
    def prow(order_delta: int, rank_relative: int):
        return path_layer(
            order_delta,
            q_offset + rank_relative,
            layer_variable,
        )

    def pcount(order_delta: int, rank_relative: int):
        return prow(order_delta, rank_relative)[0]

    n, s_mass, h_square, c_components = prow(1, 0)
    x_root = pcount(0, 0)
    root_residual = pcount(-1, 0)
    y_hit = seq_sub(x_root, root_residual)
    hx = seq_add(prow(0, 0)[1], root_residual)
    old_a = (
        n,
        s_mass,
        h_square,
        c_components,
        x_root,
        y_hit,
        hx,
    )
    old_m = prow(0, -1)
    old_p = prow(0, -2)

    support_absent = pcount(0, 0)
    support_residual = pcount(-1, 0)
    support_hit = seq_sub(
        support_absent, support_residual
    )
    support_absent_mass = seq_add(
        prow(0, 0)[1], support_residual
    )
    root_support_absent = pcount(-1, 0)

    lower_n, lower_s, lower_h, lower_c = prow(0, -1)
    lower_x = pcount(-1, -1)
    lower_root_residual = pcount(-2, -1)
    lower_y = seq_sub(lower_x, lower_root_residual)
    lower_hx = seq_add(
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
    b1 = seq_sub(a1, residual1)
    ha1 = seq_add(prow(-1, -1)[1], residual1)
    m_lower, u_mass, k2, e_components = lower_m

    p_count, u_old, k2_old, e_old = old_p
    a2 = pcount(-1, -2)
    residual2 = pcount(-2, -2)
    b2 = seq_sub(a2, residual2)
    ha2 = seq_add(prow(-1, -2)[1], residual2)
    p_lower, v_mass, l2, f_components = lower_p

    new_a = (
        seq_add(n, lower_n),
        seq_add(s_mass, support_absent, lower_s),
        seq_add(
            h_square,
            seq_scale(support_absent_mass, 2),
            support_absent,
            lower_h,
        ),
        seq_add(c_components, support_hit, lower_c),
        seq_add(x_root, lower_x),
        seq_add(y_hit, lower_y),
        seq_add(hx, root_support_absent, lower_hx),
    )
    new_m = (
        seq_add(m_count, m_lower),
        seq_add(t_mass, a1, u_mass),
        seq_add(j2, seq_scale(ha1, 2), a1, k2),
        seq_add(d_components, b1, e_components),
    )
    new_p = (
        seq_add(p_count, p_lower),
        seq_add(u_old, a2, v_mass),
        seq_add(
            k2_old, seq_scale(ha2, 2), a2, l2
        ),
        seq_add(e_old, b2, f_components),
    )
    phase_scalars = {
        "new": q + q_offset,
        "old": q + q_offset,
        "lower": q + q_offset - 1,
    }
    return {
        "new": (new_a, new_m, new_p),
        "old": (old_a, old_m, old_p),
        "lower": (lower_a, lower_m, lower_p),
    }, phase_scalars


def named(state):
    a_state, m_state, p_state = state
    n, s_mass, h_square, c_components, x_root, y_hit, hx = (
        a_state
    )
    m_count, t_mass, j2, d_components = m_state
    p_count, u_mass, k2, e_components = p_state
    return {
        "N": n,
        "S": s_mass,
        "H": h_square,
        "C": c_components,
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
    a_state, m_state, p_state = state
    n, s_mass, h_square, c_components, x_root, y_hit, hx = (
        a_state
    )
    m_count, t_mass, j2, d_components = m_state
    p_count, u_mass, k2, e_components = p_state
    return (
        (
            n,
            seq_add(s_mass, n),
            seq_add(h_square, seq_scale(s_mass, 2), n),
            seq_add(c_components, n),
            x_root,
            y_hit,
            seq_add(hx, x_root),
        ),
        (
            m_count,
            seq_add(t_mass, m_count),
            seq_add(j2, seq_scale(t_mass, 2), m_count),
            seq_add(d_components, m_count),
        ),
        (
            p_count,
            seq_add(u_mass, p_count),
            seq_add(k2, seq_scale(u_mass, 2), p_count),
            seq_add(e_components, p_count),
        ),
    )


def cross_atom_terms(
    left_state,
    right_state,
    q_scalar: sp.Expr,
):
    left = named(left_state)
    right = named(right_state)
    result = []
    for scalar, left_name, right_name in term_specs(q_scalar):
        for left_atom in left[left_name]:
            for right_atom in right[right_name]:
                result.append((scalar, left_atom, right_atom))
    return result


def distinguished_atom_terms():
    print("building left terminal states", flush=True)
    states_q, scalars_q = terminal_states(0, u)
    states_lower, scalars_lower = terminal_states(-1, u)
    # Build the right-copy states independently in v.
    print("building right terminal states", flush=True)
    right_q, right_scalars_q = terminal_states(0, v)
    right_lower, right_scalars_lower = terminal_states(-1, v)
    terms = []
    for phase_name, phase_sign in (
        ("new", 1),
        ("old", -1),
        ("lower", -1),
    ):
        print(f"expanding phase {phase_name}", flush=True)
        original_left = states_q[phase_name]
        original_right = right_q[phase_name]
        selected_left = states_lower[phase_name]
        selected_right = right_lower[phase_name]
        absent_left = unselected(original_left)
        absent_right = unselected(original_right)
        q_scalar = scalars_q[phase_name]
        selected_scalar = scalars_lower[phase_name]
        for cross_sign, left_state, right_state, scalar in (
            (1, absent_left, absent_right, q_scalar),
            (-1, original_left, original_right, q_scalar),
            (1, selected_left, absent_right, q_scalar),
            (1, absent_left, selected_right, q_scalar),
            (1, selected_left, selected_right, q_scalar),
            (
                -1,
                selected_left,
                selected_right,
                selected_scalar,
            ),
        ):
            for scalar_term, left_atom, right_atom in (
                cross_atom_terms(
                    left_state, right_state, scalar
                )
            ):
                terms.append(
                    (
                        phase_sign * cross_sign * scalar_term,
                        left_atom,
                        right_atom,
                    )
                )
    return terms


@functools.cache
def theta_power(i: int, j: int) -> sp.Expr:
    value = (Z + W) ** d
    for _ in range(i):
        value = Z * sp.diff(value, Z)
    for _ in range(j):
        value = W * sp.diff(value, W)
    return sp.factor(value)


def moment_transform(
    left_coefficient: sp.Expr,
    right_coefficient: sp.Expr,
) -> sp.Expr:
    polynomial = sp.Poly(
        sp.expand(left_coefficient * right_coefficient),
        u,
        v,
    )
    result = 0
    for (power_u, power_v), coefficient in polynomial.terms():
        result += coefficient * theta_power(power_u, power_v)
    return result


def derive_integrand():
    terms = distinguished_atom_terms()
    common_a_min = min(
        min(atom[1] for _, atom, _ in terms),
        min(atom[1] for _, _, atom in terms),
    )
    common_c_max = max(
        max(atom[2] for _, atom, _ in terms),
        max(atom[2] for _, _, atom in terms),
    )
    left_a_min = right_a_min = common_a_min
    left_c_max = right_c_max = common_c_max
    print(
        "atom terms/alignment:",
        len(terms),
        left_a_min,
        right_a_min,
        left_c_max,
        right_c_max,
        flush=True,
    )
    result = 0
    for index, (scalar, left_atom, right_atom) in enumerate(terms):
        left_coefficient, left_aoff, left_coff = left_atom
        right_coefficient, right_aoff, right_coff = right_atom
        transformed = moment_transform(
            left_coefficient, right_coefficient
        )
        result += (
            scalar
            * z ** (left_c_max - left_coff)
            * (1 + z) ** (left_aoff - left_a_min)
            * w ** (right_c_max - right_coff)
            * (1 + w) ** (right_aoff - right_a_min)
            * transformed
        )
        if index and index % 1000 == 0:
            print(f"assembled {index} terms", flush=True)
    # The binomial convolution and the common coefficient target are
    # invariant under exchanging the two copies.  Replace the ordered
    # integrand by its symmetric average before testing signs.
    swapped = result.xreplace({z: w, w: z, Z: W, W: Z})
    result = sp.expand((result + swapped) / 2)
    return (
        sp.factor(result),
        {
            "left_a_min": left_a_min,
            "right_a_min": right_a_min,
            "left_c_max": left_c_max,
            "right_c_max": right_c_max,
            "atom_term_count": len(terms),
        },
    )


def validate_numeric(integrand: sp.Expr, alignment: dict):
    cases = [
        (5, 6, 0, 6, 0),
        (6, 9, 1, 5, 1),
        (7, 12, 2, 4, 0),
    ]
    records = []
    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    try:
        for q_value, length_value, c_value, d_value, parity in cases:
            if d_value % 2 != parity:
                continue
            m_value = (d_value - parity) // 2
            s_value = q_value - c_value - m_value - 2
            x_value = length_value - 2 * q_value + 4
            direct_value = internal_group(
                c_value,
                m_value,
                s_value,
                x_value,
                parity,
            )
            a0 = length_value - q_value + c_value + 1
            c0 = q_value - c_value
            expression = (
                (1 + z)
                ** (a0 + alignment["left_a_min"])
                * (1 + w)
                ** (a0 + alignment["right_a_min"])
                * integrand.subs(
                    {
                        q: q_value,
                        length: length_value,
                        c: c_value,
                        d: d_value,
                    }
                )
            )
            expression = sp.expand(
                expression.subs(
                    {
                        Z: z * (1 + z),
                        W: w * (1 + w),
                    }
                )
            )
            target_z = c0 + alignment["left_c_max"]
            target_w = c0 + alignment["right_c_max"]
            extracted = int(
                expression.coeff(z, target_z).coeff(
                    w, target_w
                )
            )
            record = {
                "q": q_value,
                "L": length_value,
                "c": c_value,
                "d": d_value,
                "direct": direct_value,
                "extracted": extracted,
                "difference": extracted - direct_value,
            }
            records.append(record)
            assert extracted == direct_value
    finally:
        direct.path_row_series = original
    return records


def main() -> None:
    print("starting integrand derivation", flush=True)
    integrand, alignment = derive_integrand()
    print("validating coefficient extraction", flush=True)
    validations = validate_numeric(integrand, alignment)
    print("forming two-layer residual integrand", flush=True)
    integrand_t = integrand.xreplace({Z + W: T})
    new_integrand = integrand_t.subs(
        {d: d + 2, q: q + 1, length: length + 2},
        simultaneous=True,
    )
    residual = sp.expand(
        (1 + z) * (1 + w) * new_integrand
        - z * w * integrand_t
    )
    reduced_residual = sp.Add(
        *(
            sp.powdenest(
                sp.powsimp(
                    term / T ** (d - 4),
                    force=True,
                ),
                force=True,
            )
            for term in sp.Add.make_args(residual)
        )
    )
    remaining_symbolic_powers = [
        power
        for power in reduced_residual.atoms(sp.Pow)
        if power.exp.has(d)
    ]
    print(
        "remaining d-dependent powers:",
        len(remaining_symbolic_powers),
        flush=True,
    )

    # Moment operators have total order at most four.  Work at each
    # parity separately so symbolic powers of Z+W cancel exactly.
    m, s_distance, x = sp.symbols(
        "m s x", integer=True, nonnegative=True
    )
    parity_records = []
    all_negative = []
    all_prefix_failures = []
    for parity_value in (0, 1):
        print(
            f"reducing stable parity {parity_value}",
            flush=True,
        )
        parity_residual = reduced_residual.subs(
            {
                d: 2 * m + parity_value,
                q: c + m + s_distance + 2,
                length: 2 * (c + m + s_distance + 2)
                - 4
                + x,
            },
            simultaneous=True,
        )
        parity_reduced = sp.cancel(parity_residual)
        stable = sp.expand(
            parity_reduced.subs(T, Z + W).subs(
                {
                    Z: z * (1 + z),
                    W: w * (1 + w),
                }
            )
        )
        numerator, denominator = map(
            sp.factor, sp.fraction(stable)
        )
        polynomial = sp.Poly(
            sp.expand(numerator),
            z,
            w,
            c,
            m,
            s_distance,
            x,
        )
        term_payload = [
            {
                "monomial_z_w_c_m_s_x": list(monomial),
                "coefficient": str(coefficient),
            }
            for monomial, coefficient in polynomial.terms()
        ]
        Path(
            "path_isolate_p4_group_integrand_stable_"
            f"parity{parity_value}_terms_20260730.json"
        ).write_text(
            json.dumps(
                {
                    "parity_epsilon": parity_value,
                    "variables": ["z", "w", "c", "m", "s", "x"],
                    "common_factor": (
                        "(z*(1+z)+w*(1+w))"
                        f"^(2m+{parity_value}-4)"
                    ),
                    "denominator": str(denominator),
                    "terms": term_payload,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        negative = [
            (monomial, coefficient)
            for monomial, coefficient in polynomial.terms()
            if coefficient < 0
        ]
        all_negative.extend(
            (parity_value, monomial, coefficient)
            for monomial, coefficient in negative
        )
        chains: dict[
            tuple[tuple[int, int, int, int], int],
            dict[int, sp.Expr],
        ] = {}
        symmetry_failures = []
        coefficient_lookup = {
            monomial: coefficient
            for monomial, coefficient in polynomial.terms()
        }
        for monomial, coefficient in polynomial.terms():
            power_z, power_w, *parameter_powers = monomial
            swapped_monomial = (
                power_w,
                power_z,
                *parameter_powers,
            )
            if (
                coefficient_lookup.get(swapped_monomial, 0)
                != coefficient
            ):
                symmetry_failures.append(
                    (monomial, coefficient)
                )
            if power_z < power_w:
                continue
            key = (
                tuple(parameter_powers),
                power_z + power_w,
            )
            imbalance = power_z - power_w
            multiplicity = 1 if imbalance == 0 else 2
            chains.setdefault(key, {})[imbalance] = (
                multiplicity * coefficient
            )
        prefix_failures = []
        minimum_prefix = None
        prefix_checks = 0
        for (parameter_powers, total_degree), chain in chains.items():
            running = 0
            for imbalance in sorted(chain):
                running += chain[imbalance]
                prefix_checks += 1
                record = {
                    "parameter_powers_c_m_s_x": list(
                        parameter_powers
                    ),
                    "total_z_w_degree": total_degree,
                    "through_imbalance": imbalance,
                    "prefix": int(running),
                }
                if (
                    minimum_prefix is None
                    or running < minimum_prefix["prefix"]
                ):
                    minimum_prefix = record
                if running < 0:
                    prefix_failures.append(record)
        all_prefix_failures.extend(
            {
                "parity_epsilon": parity_value,
                **record,
            }
            for record in prefix_failures
        )
        parity_records.append(
            {
                "parity_epsilon": parity_value,
                "reduced_denominator": str(denominator),
                "reduced_numerator_term_count": len(
                    polynomial.terms()
                ),
                "negative_coefficient_count": len(negative),
                "symmetric_chain_count": len(chains),
                "symmetry_failure_count": len(
                    symmetry_failures
                ),
                "imbalance_prefix_checks": prefix_checks,
                "negative_imbalance_prefix_count": len(
                    prefix_failures
                ),
                "minimum_imbalance_prefix": minimum_prefix,
                "first_negative_imbalance_prefixes": (
                    prefix_failures[:20]
                ),
            }
        )
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GROUP_INTEGRAND"
            if not all_negative
            else "FAIL_PATH_ISOLATE_P4_GROUP_INTEGRAND_SIGN"
        ),
        "imbalance_grouped_status": (
            "PASS_IMBALANCE_PREFIX_GROUPING"
            if not all_prefix_failures
            else "FAIL_IMBALANCE_PREFIX_GROUPING"
        ),
        "alignment": alignment,
        "ordered_copy_symmetrization": True,
        "numeric_validations": validations,
        "common_residual_factor": "(Z+W)^(d-4)",
        "parity_records": parity_records,
        "negative_coefficient_count": len(all_negative),
        "negative_imbalance_prefix_count": len(
            all_prefix_failures
        ),
        "first_negative_imbalance_prefixes": (
            all_prefix_failures[:50]
        ),
        "first_negative_terms": [
            {
                "parity_epsilon": parity_value,
                "monomial_z_w_c_m_s_x_epsilon": list(
                    monomial
                ),
                "coefficient": int(coefficient),
            }
            for parity_value, monomial, coefficient in all_negative[:50]
        ],
        "warning": (
            "A sign failure of this raw integrand does not disprove "
            "the coefficient-extracted lift; it only means further "
            "grouping is required."
        ),
    }
    Path(
        "path_isolate_p4_group_integrand_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if all_negative:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
