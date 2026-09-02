#!/usr/bin/env python3
"""Exact one-branch simplex probe for singleton-ordinary rank-five g1.

This is a fail-closed PROBE, not a theorem assembler.  It maps the exact
degree-excess simplex, the broad W interval [0,Wcap], and the p-neighbor
excess interval [0,e-dp] into barycentric coordinates.  It then performs the
literal sparse homogeneous completion.  Nonnegative output coefficients are
a sufficient exact certificate for the selected branch; a negative output is
only an obstruction to this particular relaxation/basis.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from collections import defaultdict
from pathlib import Path

import sympy as sp
from flint import fmpq

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive


MARKER = "PROBE_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_STRONG_SIMPLEX_G1_BERNSTEIN"


def compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in compositions(total - first, parts - 1):
            yield (first, *rest)


def multinomial(exponents: tuple[int, ...]) -> int:
    out = math.factorial(sum(exponents))
    for exponent in exponents:
        out //= math.factorial(exponent)
    return out


def parse_bits(text: str, length: int) -> tuple[int, ...]:
    if len(text) != length or any(character not in "01" for character in text):
        raise ValueError(f"expected {length} bits, got {text!r}")
    return tuple(map(int, text))


def parse_endpoint_states(text: str) -> tuple[str, str]:
    text = text.upper()
    if len(text) != 2 or any(character not in "ZLU" for character in text):
        raise ValueError(f"expected two endpoint states from Z,L,U, got {text!r}")
    return text[0], text[1]


def valid_branch(
    degree_flags: tuple[int, int, int],
    adjacency: tuple[int, int, int],
    common: tuple[int, int],
) -> bool:
    zu, zv, zp = degree_flags
    a, apu, apv = adjacency
    cpu, cpv = common
    if sum(adjacency) == 3:
        return False
    if a and not (zu and zv):
        return False
    if apu and not (zu and zp):
        return False
    if apv and not (zv and zp):
        return False
    if cpu and (apu or not (zu and zp)):
        return False
    if cpv and (apv or not (zv and zp)):
        return False
    # The third selected mark itself is a forced common neighbor on the two
    # selected-edge paths p-v-u and p-u-v.
    if a and apv and not cpu:
        return False
    if a and apu and not cpv:
        return False
    if cpu and cpv and a:
        return False
    return True


def valid_endpoint_branch(
    degree_flags: tuple[int, int, int],
    adjacency: tuple[int, int, int],
    common: tuple[int, int],
    endpoints: tuple[str, str],
) -> bool:
    if not valid_branch(degree_flags, adjacency, common):
        return False
    zu, zv, zp = degree_flags
    a, apu, apv = adjacency
    cpu, cpv = common
    endpoint_u, endpoint_v = endpoints
    if not zu and endpoint_u != "Z":
        return False
    if not zv and endpoint_v != "Z":
        return False
    if endpoint_u == "Z" and cpu:
        return False
    if endpoint_v == "Z" and cpv:
        return False
    # A neighbor of a zero-excess marked center must have degree exactly one.
    # If its selected-edge incidence already requires degree at least two,
    # the branch is empty.
    if endpoint_u == "Z":
        if a and a + apv > 1:
            return False
        if apu and apu + apv > 1:
            return False
    if endpoint_v == "Z":
        if a and a + apu > 1:
            return False
        if apv and apu + apv > 1:
            return False
    return True


def valid_parent_state(
    degree_flags: tuple[int, int, int],
    adjacency: tuple[int, int, int],
    common: tuple[int, int],
    parent_state: str,
) -> bool:
    """Validate the exact xp=0 / positive-integer split."""
    if parent_state not in ("Z", "P"):
        return False
    if not valid_branch(degree_flags, adjacency, common):
        return False
    zu, zv, zp = degree_flags
    a, apu, apv = adjacency
    cpu, cpv = common
    if not zp:
        return parent_state == "Z"
    if parent_state == "P":
        return True
    degree_u_base = max(zu, a + apu)
    degree_v_base = max(zv, a + apv)
    parent_lower_minimum = (
        apu * (degree_u_base - 1)
        + apv * (degree_v_base - 1)
        + (cpu - a * apv)
        + (cpv - a * apu)
    )
    return parent_lower_minimum == 0


def mapped_polynomial(
    degree_flags: tuple[int, int, int],
    adjacency_values: tuple[int, int, int],
    common_values: tuple[int, int],
    excess_endpoints: tuple[str, str],
    wedge_lower_mode: str,
    subdivisions: int,
    wedge_cell: int,
    parent_cell: int,
    uv_common: int,
    order_base: int,
    numerator: sp.Expr | None = None,
    parent_state: str = "P",
    positive_parent_interval: str = "full",
    selected_excess_states: tuple[str, str, str] = ("F", "F", "F"),
    endpoint_lower_modes: tuple[str, str] = ("current", "current"),
    parent_lower_mode: str = "current",
    wedge_partition_mode: str = "current",
    additional_remainder_base: int = 0,
) -> tuple[sp.Poly, tuple[sp.Symbol, ...]]:
    if numerator is None:
        raw = derive()["strong_parent_cone_before_common"]
        numerator = sp.expand(sp.fraction(raw)[0])
    names = {str(symbol): symbol for symbol in numerator.free_symbols}
    n = names["n"]
    e = names["edge_count"]
    du = names["degree_u"]
    dv = names["degree_v"]
    dp = names["degree_p"]
    wedges = names["C_wedges_E"]
    xu = names["C_neighbor_excess_u"]
    xv = names["C_neighbor_excess_v"]
    xp = names["neighbor_excess_p"]

    N, X, Y, Z, R, T, L = sp.symbols("N X Y Z R T L", nonnegative=True)
    variables = (N, X, Y, Z, R, T, L)
    nn = N + order_base
    zu, zv, zp = degree_flags
    a, apu, apv = adjacency_values
    endpoint_u, endpoint_v = excess_endpoints
    if not valid_parent_state(degree_flags, adjacency_values, common_values, parent_state):
        raise ValueError("incompatible parent-neighbor-excess state")
    if positive_parent_interval not in ("full", "lower", "above"):
        raise ValueError("unknown positive-parent interval split")
    if parent_state != "P" and positive_parent_interval != "full":
        raise ValueError("positive-parent interval split requires parent state P")
    if any(state not in ("F", "Z", "P") for state in selected_excess_states):
        raise ValueError("selected excess states must be F, Z, or P")
    if any(mode not in ("current", "one", "structural") for mode in endpoint_lower_modes):
        raise ValueError("unknown endpoint lower mode")
    if parent_lower_mode not in ("current", "one", "structural"):
        raise ValueError("unknown parent lower mode")
    valid_wedge_partition_modes = {
        "current", "pv_disjoint", "pv_uv_common", "pv_pu_common",
        "two_edge_parent_center", "uv_parent_separate", "uv_pv_common",
        "two_edge_endpoint_parent",
    }
    if wedge_partition_mode not in valid_wedge_partition_modes:
        raise ValueError("unknown wedge partition mode")
    if additional_remainder_base < 0:
        raise ValueError("additional remainder base must be nonnegative")
    anchor_u = bool(zu and endpoint_u == "Z")
    anchor_v = bool(zv and endpoint_v == "Z")
    anchor_p = bool(zp and parent_state == "Z")
    anchor_components = (
        int(anchor_u) + int(anchor_v) + int(anchor_p)
        - int(anchor_u and anchor_v and a)
        - int(anchor_u and anchor_p and apu)
        - int(anchor_v and anchor_p and apv)
    )
    covered_u = anchor_u or (anchor_v and bool(a)) or (anchor_p and bool(apu))
    covered_v = anchor_v or (anchor_u and bool(a)) or (anchor_p and bool(apv))
    covered_p = anchor_p or (anchor_u and bool(apu)) or (anchor_v and bool(apv))
    uncovered_positive = (
        (zu and not covered_u) or (zv and not covered_v) or (zp and not covered_p)
    )
    nontrivial_components = max(1, anchor_components + int(uncovered_positive))
    # If u and v have an unmarked common neighbor, no selected adjacencies,
    # no p-u/p-v common neighbor, and both neighbor-excess variables are at
    # their lower endpoint, then their component is closed.  Indeed, the
    # common neighbor contributes the entire value xu=xv=1, so it has degree
    # two and every other neighbor of u or v is a leaf.  A positive-degree p
    # therefore lies in a second nontrivial component.  This is an exact
    # component floor, not a relaxation heuristic.
    closed_uv_ll_component = (
        a == apu == apv == 0
        and uv_common == 1
        and common_values == (0, 0)
        and endpoint_u == endpoint_v == "L"
    )
    if closed_uv_ll_component and zp:
        nontrivial_components = max(nontrivial_components, 2)
    # On the exact lower-xp face, a single p-u or p-v common-neighbor bridge
    # can similarly close that marked pair's component.  For example, if
    # cpv=1, xv is at its lower endpoint, and xp equals its structural lower
    # endpoint, the common center has degree two and every other neighbor of
    # p or v is a leaf.  With no bridge to u, positive-degree u lies in a
    # second component.  The strict-above-xp face is handled separately and
    # receives no such component credit.
    closed_parent_pair_at_lower = (
        positive_parent_interval == "lower"
        and a == apu == apv == 0
        and uv_common == 0
        and (
            (common_values == (1, 0) and endpoint_u == "L" and zv)
            or (common_values == (0, 1) and endpoint_v == "L" and zu)
        )
    )
    if closed_parent_pair_at_lower:
        nontrivial_components = max(nontrivial_components, 2)
    isolated_selected = 3 - zu - zv - zp
    # For e>=1, c(G) is at least the isolated selected marks plus the exact
    # star components forced by each Z state, plus at most one component
    # containing all remaining positive selected marks.
    degree_u_base = max(zu, a + apu)
    degree_v_base = max(zv, a + apv)
    degree_p_base = max(zp, apu + apv)
    required_degree_excess = (
        degree_u_base - zu + degree_v_base - zv + degree_p_base - zp
    )
    # The union of the edge sets incident with u,v,p has size exactly
    # du+dv+dp-(a+apu+apv).  Hence
    #
    #   e >= du+dv+dp-(a+apu+apv).
    #
    # In the degree-excess coordinates below this is precisely the lower
    # bound remainder >= zu+zv+zp-1-(a+apu+apv).  Retaining it removes an
    # impossible low-remainder face while preserving every forest cell.
    incident_remainder_base = max(
        0, zu + zv + zp - 1 - (a + apu + apv)
    )
    # If the selected marks are pairwise nonadjacent and have no common
    # neighbor, every endpoint of an edge outside their incident-edge union
    # is adjacent to at most one selected mark.  Such an edge therefore
    # contributes at most two units to xu+xv+xp.  Each nonzero endpoint state
    # represents an actual positive integer excess, so the number of positive
    # states forces the displayed extra integer slack beyond the incident
    # union.  (Other adjacency/common branches deliberately use zero here.)
    pairwise_separated = (
        a == apu == apv == 0
        and common_values == (0, 0)
        and uv_common == 0
    )
    positive_excess_states = (
        int(endpoint_u != "Z")
        + int(endpoint_v != "Z")
        + int(parent_state == "P")
    )
    neighbor_slack_base = (
        (positive_excess_states + 1) // 2 if pairwise_separated else 0
    )
    single_parent_common_ll = (
        a == apu == apv == 0
        and endpoint_u == endpoint_v == "L"
        and common_values in ((1, 0), (0, 1))
    )
    double_parent_common_ll = (
        a == apu == apv == 0
        and uv_common == 0
        and endpoint_u == endpoint_v == "L"
        and common_values == (1, 1)
    )
    triple_common_ll = (
        a == apu == apv == 0
        and uv_common == 1
        and endpoint_u == endpoint_v == "L"
        and common_values == (1, 1)
    )
    # Above the structural xp endpoint, the parent-exclusive excess center
    # is distinct from both the fixed p-mark common center and the lower
    # excess center on the third mark.  This forces one further unit of
    # unmarked degree excess.
    if single_parent_common_ll and positive_parent_interval == "above":
        neighbor_slack_base += 1
    remainder_base = (
        incident_remainder_base + neighbor_slack_base + additional_remainder_base
    )
    selected_state_bases = sum(state == "P" for state in selected_excess_states)
    total = (
        nn - 1 - isolated_selected - nontrivial_components
        - required_degree_excess - remainder_base - selected_state_bases
    )
    force_x_zero = bool((anchor_v and a) or (anchor_p and apu))
    force_y_zero = bool((anchor_u and a) or (anchor_p and apv))
    force_z_zero = bool((anchor_u and apu) or (anchor_v and apv))
    if ((force_x_zero and selected_excess_states[0] == "P")
            or (force_y_zero and selected_excess_states[1] == "P")
            or (force_z_zero and selected_excess_states[2] == "P")):
        raise ValueError("positive selected excess forced to zero")
    selected_active = tuple(state != "Z" for state in selected_excess_states)
    selected_bases = tuple(int(state == "P") for state in selected_excess_states)
    x, y, z, remainder = (
        selected_bases[0] + zu * (not force_x_zero) * selected_active[0] * total * X,
        selected_bases[1] + zv * (not force_y_zero) * selected_active[1] * total * Y,
        selected_bases[2] + zp * (not force_z_zero) * selected_active[2] * total * Z,
        remainder_base + total * R,
    )
    degree_u = degree_u_base + x
    degree_v = degree_v_base + y
    degree_p = degree_p_base + z
    edge_count = 1 + required_degree_excess + x + y + z + remainder
    # In the pairwise-separated branch the three marked neighbor sets are
    # disjoint.  Each positive neighbor-excess state therefore requires a
    # distinct unmarked center with degree excess at least one.  Convexity
    # concentrates all remaining excess at one of those centers, giving the
    # sharp k-center cap f(r-k+1)+(k-1)f(1), rather than the impossible
    # one-center cap f(r).
    fixed_uv_common_center = (
        a == apu == apv == 0
        and uv_common == 1
        and common_values == (0, 0)
        and endpoint_u == endpoint_v == "L"
    )
    if fixed_uv_common_center:
        # The unique unmarked common neighbor of u,v has degree excess at
        # least one and contributes to both xu,xv.  At the two lower
        # endpoints xu=xv=1, so that center has degree excess exactly one;
        # no further excess may be concentrated there.
        remaining_excess = remainder - 1
        other_wedge_cap = 1 + remaining_excess * (remaining_excess + 1) / 2
    elif pairwise_separated and positive_excess_states:
        concentrated_excess = remainder - positive_excess_states + 1
        other_wedge_cap = (
            concentrated_excess * (concentrated_excess + 1) / 2
            + positive_excess_states - 1
        )
    else:
        other_wedge_cap = remainder * (remainder + 1) / 2
    wedge_cap = sp.expand(
        degree_u * (degree_u - 1) / 2
        + degree_v * (degree_v - 1) / 2
        + degree_p * (degree_p - 1) / 2
        + other_wedge_cap
    )
    center_wedges = sp.expand(
        degree_u * (degree_u - 1) / 2
        + degree_v * (degree_v - 1) / 2
        + degree_p * (degree_p - 1) / 2
    )
    # Each unmarked common neighbor of one selected pair contributes at
    # least one wedge.  If one unmarked center is common to all three pairs,
    # its three pair incidences equal its minimum C(3,2)=3 wedges.  The
    # subtractions remove the cases where the common neighbor is itself the
    # third selected mark, whose wedges are already in center_wedges.
    unmarked_common_wedges = (
        (uv_common - apu * apv)
        + (common_values[0] - a * apv)
        + (common_values[1] - a * apu)
    )
    wedge_lower = (
        sp.Integer(0)
        if wedge_lower_mode == "zero"
        else center_wedges + unmarked_common_wedges
    )
    wedge_parameter = sp.Rational(wedge_cell, subdivisions) + T / subdivisions
    parent_parameter = sp.Rational(parent_cell, subdivisions) + L / subdivisions
    lower_u = sp.expand(
        a * (degree_v - 1)
        + apu * (degree_p - 1)
        + (uv_common - apu * apv)
        + (common_values[0] - a * apv)
    )
    lower_v = sp.expand(
        a * (degree_u - 1)
        + apv * (degree_p - 1)
        + (uv_common - apu * apv)
        + (common_values[1] - a * apu)
    )
    lower_p = sp.expand(
        apu * (degree_u - 1)
        + apv * (degree_v - 1)
        + (common_values[0] - a * apv)
        + (common_values[1] - a * apu)
    )
    minimum_lower_u = lower_u.subs({X: 0, Y: 0, Z: 0, R: 0})
    minimum_lower_v = lower_v.subs({X: 0, Y: 0, Z: 0, R: 0})
    def endpoint_lower(mode: str, lower, minimum):
        if mode == "one":
            return sp.Integer(1)
        if mode == "structural":
            return lower
        return lower if minimum >= 1 else sp.Integer(1)

    endpoint_lowers = (
        endpoint_lower(endpoint_lower_modes[0], lower_u, minimum_lower_u),
        endpoint_lower(endpoint_lower_modes[1], lower_v, minimum_lower_v),
    )
    endpoint_value_u = {
        "Z": sp.Integer(0),
        "L": endpoint_lowers[0],
        "U": zu * (edge_count - degree_u),
    }[endpoint_u]
    endpoint_value_v = {
        "Z": sp.Integer(0),
        "L": endpoint_lowers[1],
        "U": zv * (edge_count - degree_v),
    }[endpoint_v]
    minimum_lower_p = lower_p.subs({X: 0, Y: 0, Z: 0, R: 0})
    if parent_lower_mode == "one":
        parent_excess_lower = sp.Integer(1)
    elif parent_lower_mode == "structural":
        parent_excess_lower = lower_p
    else:
        parent_excess_lower = lower_p if minimum_lower_p >= 1 else sp.Integer(1)
    parent_excess_upper = zp * (edge_count - degree_p)
    if wedge_partition_mode == "pv_disjoint":
        pool_u = endpoint_value_u
        pool_v = endpoint_value_v - z
        parent_excess_upper = y + remainder - pool_u - pool_v
    elif wedge_partition_mode == "pv_uv_common":
        parent_excess_upper = y + remainder - 1
    elif wedge_partition_mode == "pv_pu_common":
        pool_v = endpoint_value_v - z
        parent_excess_upper = y + remainder - pool_v
    elif wedge_partition_mode == "two_edge_parent_center":
        pool_u = endpoint_value_u - z
        pool_v = endpoint_value_v - z
        parent_excess_upper = x + y + remainder - pool_u - pool_v
    elif wedge_partition_mode == "uv_parent_separate":
        pool_u = endpoint_value_u - y
        pool_v = endpoint_value_v - x
        parent_excess_upper = remainder - pool_u - pool_v
    elif wedge_partition_mode == "uv_pv_common":
        pool_u = endpoint_value_u - y
        parent_excess_upper = remainder - pool_u
    elif wedge_partition_mode == "two_edge_endpoint_parent":
        pool_u = endpoint_value_u - y
        pool_v = endpoint_value_v - x - z
        parent_excess_upper = y + remainder - pool_u - pool_v
    elif single_parent_common_ll:
        # The third marked-neighbor set is disjoint from N(p).  Its exact
        # lower endpoint is one, so xp <= remainder-1.  This is stronger
        # than the generic e-dp bound and also makes the strict-above
        # interval nonnegative after the extra remainder unit above.
        parent_excess_upper = remainder - 1
    elif double_parent_common_ll:
        # The two p-mark common centers are distinct (otherwise they would
        # also be a u-v common neighbor) and exhaust xu=xv=1.  All p-neighbor
        # excess belongs to the unmarked remainder, hence xp<=remainder.
        parent_excess_upper = remainder
    elif triple_common_ll:
        # A forest cannot realize the three pairwise common-neighbor
        # incidences at distinct centers: their union would contain a cycle.
        # Thus one center is adjacent to u,v,p, has excess two on the LL
        # face, and all xp lies in the unmarked remainder.
        parent_excess_upper = remainder
    if parent_state == "Z":
        parent_excess = sp.Integer(0)
    elif positive_parent_interval == "lower":
        parent_excess = parent_excess_lower
    elif positive_parent_interval == "above":
        parent_excess = parent_excess_lower + 1 + parent_parameter * (
            parent_excess_upper - parent_excess_lower - 1
        )
    else:
        parent_excess = parent_excess_lower + parent_parameter * (
            parent_excess_upper - parent_excess_lower
        )
    convex_wedge = lambda amount: amount * (amount + 1) / 2
    if wedge_partition_mode == "pv_disjoint":
        pool_u = endpoint_value_u
        pool_v = endpoint_value_v - z
        pool_p = parent_excess - y
        pool_free = remainder - pool_u - pool_v - pool_p
        wedge_cap = sp.expand(center_wedges + sum(map(convex_wedge, (
            pool_u, pool_v, pool_p, pool_free,
        ))))
    elif wedge_partition_mode == "pv_uv_common":
        pool_p = parent_excess - y
        pool_free = remainder - 1 - pool_p
        wedge_cap = sp.expand(
            center_wedges + 1 + convex_wedge(pool_p) + convex_wedge(pool_free)
        )
    elif wedge_partition_mode == "pv_pu_common":
        pool_v = endpoint_value_v - z
        pool_p = parent_excess - y - 1
        pool_free = remainder - 1 - pool_v - pool_p
        wedge_cap = sp.expand(
            center_wedges + 1 + convex_wedge(pool_v)
            + convex_wedge(pool_p) + convex_wedge(pool_free)
        )
    elif wedge_partition_mode == "two_edge_parent_center":
        pool_u = endpoint_value_u - z
        pool_v = endpoint_value_v - z
        pool_p = parent_excess - x - y
        pool_free = remainder - pool_u - pool_v - pool_p
        wedge_cap = sp.expand(center_wedges + sum(map(convex_wedge, (
            pool_u, pool_v, pool_p, pool_free,
        ))))
    elif wedge_partition_mode == "uv_parent_separate":
        pool_u = endpoint_value_u - y
        pool_v = endpoint_value_v - x
        pool_p = parent_excess
        pool_free = remainder - pool_u - pool_v - pool_p
        wedge_cap = sp.expand(center_wedges + sum(map(convex_wedge, (
            pool_u, pool_v, pool_p, pool_free,
        ))))
    elif wedge_partition_mode == "uv_pv_common":
        pool_u = endpoint_value_u - y
        pool_p = parent_excess - 1
        pool_free = remainder - pool_u - 1 - pool_p
        wedge_cap = sp.expand(
            center_wedges + convex_wedge(pool_u) + 1
            + convex_wedge(pool_p) + convex_wedge(pool_free)
        )
    elif wedge_partition_mode == "two_edge_endpoint_parent":
        pool_u = endpoint_value_u - y
        pool_v = endpoint_value_v - x - z
        pool_p = parent_excess - y
        pool_free = remainder - pool_u - pool_v - pool_p
        wedge_cap = sp.expand(center_wedges + sum(map(convex_wedge, (
            pool_u, pool_v, pool_p, pool_free,
        ))))
    elif single_parent_common_ll:
        if positive_parent_interval == "lower":
            # One fixed y=1 common center and one disjoint y=1 center on the
            # third mark; all residual excess can be concentrated elsewhere.
            split_other_wedge_cap = (
                2 + (remainder - 2) * (remainder - 1) / 2
            )
        else:
            # Write t=xp-1 for the parent-exclusive neighbor excess.  The
            # four disjoint pools are: the fixed common center (one), the
            # third-mark lower center (one), the parent-exclusive pool (t),
            # and all remaining centers (remainder-xp-1).  Convexity within
            # each pool gives this exact upper bound.
            parent_exclusive = parent_excess - 1
            free_excess = remainder - parent_excess - 1
            split_other_wedge_cap = (
                2
                + parent_exclusive * (parent_exclusive + 1) / 2
                + free_excess * (free_excess + 1) / 2
            )
        wedge_cap = sp.expand(center_wedges + split_other_wedge_cap)
    elif double_parent_common_ll:
        # Two fixed excess-one common centers, a parent-exclusive pool of
        # total xp-2, and the free pool of total remainder-xp.
        parent_exclusive = parent_excess - 2
        free_excess = remainder - parent_excess
        split_other_wedge_cap = (
            2
            + parent_exclusive * (parent_exclusive + 1) / 2
            + free_excess * (free_excess + 1) / 2
        )
        wedge_cap = sp.expand(center_wedges + split_other_wedge_cap)
    elif triple_common_ll:
        # The common center has excess two and contributes f(2)=3 wedges;
        # the remaining pools have totals xp-2 and remainder-xp.
        parent_exclusive = parent_excess - 2
        free_excess = remainder - parent_excess
        split_other_wedge_cap = (
            3
            + parent_exclusive * (parent_exclusive + 1) / 2
            + free_excess * (free_excess + 1) / 2
        )
        wedge_cap = sp.expand(center_wedges + split_other_wedge_cap)
    substitution = {
        n: nn,
        e: edge_count,
        du: degree_u,
        dv: degree_v,
        dp: degree_p,
        wedges: wedge_lower + wedge_parameter * (wedge_cap - wedge_lower),
        xu: endpoint_value_u,
        xv: endpoint_value_v,
        xp: parent_excess,
        names["adjacent"]: a,
        names["adjacent_pu"]: apu,
        names["adjacent_pv"]: apv,
        names["common_neighbor_pu"]: common_values[0],
        names["common_neighbor_pv"]: common_values[1],
        names["C_common_neighbor"]: uv_common,
    }
    return sp.Poly(sp.expand(numerator.subs(substitution)), *variables), variables


def homogeneous_coefficients(
    polynomial: sp.Poly,
    geometry_elevation: int,
    interval_elevation: int,
) -> tuple[dict[tuple[int, ...], sp.Rational], dict[str, int]]:
    terms = polynomial.terms()
    geometry_degree = (
        max(sum(monomial[1:5]) for monomial, _ in terms) + geometry_elevation
    )
    wedge_base_degree = max(monomial[5] for monomial, _ in terms)
    parent_base_degree = max(monomial[6] for monomial, _ in terms)
    wedge_interval_degree = wedge_base_degree + (
        interval_elevation if wedge_base_degree else 0
    )
    parent_interval_degree = parent_base_degree + (
        interval_elevation if parent_base_degree else 0
    )
    expansion_cache: dict[tuple[int, int], tuple[tuple[tuple[int, ...], int], ...]] = {}

    def expansions(missing: int, parts: int):
        key = (missing, parts)
        if key not in expansion_cache:
            expansion_cache[key] = tuple(
                (row, multinomial(row)) for row in compositions(missing, parts)
            )
        return expansion_cache[key]

    coefficients: dict[tuple[int, ...], sp.Rational] = defaultdict(lambda: sp.Rational(0))
    for monomial, coefficient in terms:
        n_power = monomial[0]
        geometry = monomial[1:5]
        wedge_power = monomial[5]
        parent_power = monomial[6]
        missing_geometry = geometry_degree - sum(geometry)
        missing_wedge = wedge_interval_degree - wedge_power
        missing_parent = parent_interval_degree - parent_power
        for add_geometry, geometry_factor in expansions(missing_geometry, 5):
            geometry_key = tuple(
                (geometry[index] if index < 4 else 0) + add_geometry[index]
                for index in range(5)
            )
            for add_wedge in range(missing_wedge + 1):
                wedge_key = (wedge_power + add_wedge, missing_wedge - add_wedge)
                wedge_factor = math.comb(missing_wedge, add_wedge)
                for add_parent in range(missing_parent + 1):
                    parent_key = (parent_power + add_parent, missing_parent - add_parent)
                    parent_factor = math.comb(missing_parent, add_parent)
                    key = (n_power, *geometry_key, *wedge_key, *parent_key)
                    coefficients[key] += (
                        coefficient * geometry_factor * wedge_factor * parent_factor
                    )
    coefficients = {key: value for key, value in coefficients.items() if value}
    return coefficients, {
        "geometry_degree": geometry_degree,
        "wedge_interval_degree": wedge_interval_degree,
        "parent_interval_degree": parent_interval_degree,
        "mapped_terms": len(terms),
        "homogeneous_coefficients": len(coefficients),
    }


def homogeneous_coefficients_fast(
    polynomial: sp.Poly,
    geometry_elevation: int,
    interval_elevation: int,
    wedge_elevation: int | None = None,
    parent_elevation: int | None = None,
) -> tuple[dict[tuple[int, ...], fmpq], dict[str, int]]:
    """Exact degree elevation from the smallest homogeneous basis.

    ``homogeneous_coefficients`` expands every original monomial directly to
    the requested degree.  That is convenient at small degree but repeats a
    large multinomial expansion when the geometry needs substantial
    elevation.  Here we first construct the exact minimal basis, convert its
    rational coefficients to FLINT, and elevate by repeated multiplication
    by the three identities

        X+Y+Z+R+H=1,  T+Tbar=1,  L+Lbar=1.

    The result is coefficient-for-coefficient identical and much smaller in
    peak memory for the hard n=15 branches.
    """
    base, base_stats = homogeneous_coefficients(polynomial, 0, 0)
    coefficients: dict[tuple[int, ...], fmpq] = {}
    for key, value in base.items():
        numerator, denominator = map(int, sp.fraction(value))
        coefficients[key] = fmpq(numerator, denominator)

    def elevate(positions: tuple[int, ...]) -> None:
        nonlocal coefficients
        out: dict[tuple[int, ...], fmpq] = defaultdict(lambda: fmpq(0))
        for key, value in coefficients.items():
            for position in positions:
                lifted = list(key)
                lifted[position] += 1
                out[tuple(lifted)] += value
        coefficients = {key: value for key, value in out.items() if value}

    for _ in range(geometry_elevation):
        elevate((1, 2, 3, 4, 5))
    wedge_elevation = interval_elevation if wedge_elevation is None else wedge_elevation
    parent_elevation = interval_elevation if parent_elevation is None else parent_elevation
    if base_stats["wedge_interval_degree"]:
        for _ in range(wedge_elevation):
            elevate((6, 7))
    if base_stats["parent_interval_degree"]:
        for _ in range(parent_elevation):
            elevate((8, 9))

    return coefficients, {
        "geometry_degree": base_stats["geometry_degree"] + geometry_elevation,
        "wedge_interval_degree": (
            base_stats["wedge_interval_degree"] + wedge_elevation
            if base_stats["wedge_interval_degree"] else 0
        ),
        "parent_interval_degree": (
            base_stats["parent_interval_degree"] + parent_elevation
            if base_stats["parent_interval_degree"] else 0
        ),
        "mapped_terms": base_stats["mapped_terms"],
        "homogeneous_coefficients": len(coefficients),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--degrees", default="111")
    parser.add_argument("--adjacency", default="000")
    parser.add_argument("--common", default="00")
    parser.add_argument(
        "--endpoints", default="UU",
        help="two states: Z=exact zero, L=lower positive endpoint 1, U=upper endpoint",
    )
    parser.add_argument("--w-lower", choices=("zero", "centers"), default="centers")
    parser.add_argument("--subdivisions", type=int, default=1)
    parser.add_argument("--w-cell", type=int, default=0)
    parser.add_argument("--p-cell", type=int, default=0)
    parser.add_argument("--uv-common", type=int, choices=(0, 1), default=0)
    parser.add_argument("--parent-state", choices=("Z", "P"), default="P")
    parser.add_argument(
        "--positive-parent-interval",
        choices=("full", "lower", "above"),
        default="full",
        help="optionally split positive xp into its exact lower face and strict-above interval",
    )
    parser.add_argument("--order-base", type=int, default=14)
    parser.add_argument("--geometry-elevation", type=int, default=0)
    parser.add_argument("--interval-elevation", type=int, default=0)
    parser.add_argument("--wedge-elevation", type=int)
    parser.add_argument("--parent-elevation", type=int)
    args = parser.parse_args()
    degree_flags = parse_bits(args.degrees, 3)
    adjacency = parse_bits(args.adjacency, 3)
    common = parse_bits(args.common, 2)
    endpoints = parse_endpoint_states(args.endpoints)
    if args.subdivisions < 1:
        raise ValueError("subdivisions must be positive")
    if args.order_base < 14:
        raise ValueError("order-base must be at least 14 for this reduction")
    if args.geometry_elevation < 0 or args.interval_elevation < 0:
        raise ValueError("elevations must be nonnegative")
    if args.wedge_elevation is not None and args.wedge_elevation < 0:
        raise ValueError("wedge-elevation must be nonnegative")
    if args.parent_elevation is not None and args.parent_elevation < 0:
        raise ValueError("parent-elevation must be nonnegative")
    if not (0 <= args.w_cell < args.subdivisions):
        raise ValueError("w-cell outside subdivision")
    if not (0 <= args.p_cell < args.subdivisions):
        raise ValueError("p-cell outside subdivision")
    if not valid_endpoint_branch(degree_flags, adjacency, common, endpoints):
        raise ValueError("incompatible branch")
    if not valid_parent_state(degree_flags, adjacency, common, args.parent_state):
        raise ValueError("incompatible parent-neighbor-excess state")
    if args.parent_state != "P" and args.positive_parent_interval != "full":
        raise ValueError("positive-parent interval split requires parent state P")
    if args.uv_common and (
        adjacency[0] or not (degree_flags[0] and degree_flags[1])
        or "Z" in endpoints
    ):
        raise ValueError("incompatible uv-common branch")
    if adjacency[1] and adjacency[2] and not args.uv_common:
        raise ValueError("p is a forced common neighbor of u,v")

    polynomial, _variables = mapped_polynomial(
        degree_flags, adjacency, common, endpoints, args.w_lower,
        args.subdivisions, args.w_cell, args.p_cell, args.uv_common,
        args.order_base, parent_state=args.parent_state,
        positive_parent_interval=args.positive_parent_interval,
    )
    coefficients, stats = homogeneous_coefficients_fast(
        polynomial, args.geometry_elevation, args.interval_elevation,
        args.wedge_elevation, args.parent_elevation,
    )
    negative_rows = sorted(
        ((key, value) for key, value in coefficients.items() if value < 0),
        key=lambda row: row[1],
    )
    report = {
        "marker": MARKER,
        "branch": {
            "degree_flags_uvp": args.degrees,
            "adjacency_uv_pu_pv": args.adjacency,
            "common_pu_pv": args.common,
            "neighbor_excess_endpoints_uv": args.endpoints,
            "wedge_lower": args.w_lower,
            "interval_subdivision": args.subdivisions,
            "wedge_cell": args.w_cell,
            "parent_excess_cell": args.p_cell,
            "uv_common": args.uv_common,
            "parent_neighbor_excess_state": args.parent_state,
            "positive_parent_interval": args.positive_parent_interval,
            "order_base": args.order_base,
            "geometry_elevation": args.geometry_elevation,
            "interval_elevation": args.interval_elevation,
            "wedge_elevation": (
                args.interval_elevation
                if args.wedge_elevation is None else args.wedge_elevation
            ),
            "parent_elevation": (
                args.interval_elevation
                if args.parent_elevation is None else args.parent_elevation
            ),
        },
        **stats,
        "negative": len(negative_rows),
        "minimum": str(min(coefficients.values())),
        "first_negative_rows": [
            {"key": list(key), "coefficient": str(value)}
            for key, value in negative_rows[:10]
        ],
        "all_homogeneous_power_coefficients_nonnegative": not negative_rows,
        "scope": (
            "One exact strengthened relaxation branch only. PASS is deliberately "
            "not emitted; a full compatible-branch assembler and the e=1 boundary "
            "are separate obligations."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(report, indent=2, sort_keys=True), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
