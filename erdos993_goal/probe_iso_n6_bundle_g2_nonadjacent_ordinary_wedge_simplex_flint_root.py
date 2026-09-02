#!/usr/bin/env python3
"""Exact N>=19 ratio-floor probe for nonadjacent ordinary-parent g2.

The ordinary-parent coefficient is the proved no-parent expression plus a
linear parent-loss correction.  Six sign-certified harmful coordinates are
replaced by universal subset ceilings.  The two coefficients whose signs are
not valid on the enlarged relaxation (PW2 and PW3) are instead charged by
unconditional one-sided negative envelopes.  This producer certifies the
resulting lower polynomial and the fourteen coefficient signs that it uses.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from flint import fmpq, fmpq_mat, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
    compactify_one,
    multinomial,
    row_corner,
    scaled_bilinear,
    split_simplex,
    weak_compositions,
)
from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import choose, sha256
from probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root import (
    d_coarse_corner_row,
)


HERE = Path(__file__).resolve().parent
LOSS = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json"
)
LOSS_SHA256 = "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6"
RATIO_FLOOR = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json"
)
RATIO_FLOOR_SHA256 = "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA"
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
    "SPLIT_PW3_WEDGE_FLINT_ROOT"
)
MAX_N_DEN = 4
MAX_A2_DEN = 4
BASE_ORDER = 19


def split_simplex_general(source, coefficient_context, prefix_count,
                          simplex_count, tail_count):
    grouped_terms = defaultdict(list)
    for monomial, coefficient in source.terms():
        alpha = tuple(map(
            int, monomial[prefix_count:prefix_count + simplex_count]
        ))
        remaining = (
            *monomial[:prefix_count],
            *monomial[-tail_count:],
        )
        term = coefficient_context.constant(coefficient)
        for variable, exponent in zip(coefficient_context.gens(), remaining):
            term *= variable ** int(exponent)
        grouped_terms[alpha].append(term)
    grouped = {
        alpha: balanced_batched_sum(terms, batch_size=128)
        for alpha, terms in grouped_terms.items()
    }
    degree = max(map(sum, grouped))
    betas = list(weak_compositions(degree, simplex_count))
    coefficients = []
    for beta in betas:
        pieces = []
        for alpha, polynomial in grouped.items():
            if any(alpha[index] > beta[index] for index in range(simplex_count)):
                continue
            gaps = tuple(
                beta[index] - alpha[index] for index in range(simplex_count)
            )
            if sum(gaps) != degree - sum(alpha):
                continue
            pieces.append(polynomial * multinomial(gaps))
        coefficients.append(
            balanced_batched_sum(pieces, batch_size=128)
            if pieces else coefficient_context.constant(0)
        )
    return degree, betas, coefficients, len(grouped)


def scaled_linear(terms, cap, n, a2):
    pieces = []
    for scalar, row, rank in terms:
        numerator, n_den, a2_den = row[rank]
        assert n_den <= MAX_N_DEN and a2_den <= MAX_A2_DEN
        pieces.append(
            scalar * cap * numerator
            * n ** (MAX_N_DEN - n_den)
            * a2 ** (MAX_A2_DEN - a2_den)
        )
    return balanced_batched_sum(pieces, batch_size=32)


def scaled_linear_weight(terms, weight, n, a2):
    weight_numerator, weight_n_den, weight_a2_den = weight
    pieces = []
    for scalar, row, rank in terms:
        numerator, n_den, a2_den = row[rank]
        total_n_den = n_den + weight_n_den
        total_a2_den = a2_den + weight_a2_den
        assert total_n_den <= MAX_N_DEN and total_a2_den <= MAX_A2_DEN
        pieces.append(
            scalar * numerator * weight_numerator
            * n ** (MAX_N_DEN - total_n_den)
            * a2 ** (MAX_A2_DEN - total_a2_den)
        )
    return balanced_batched_sum(pieces, batch_size=32)


def subtract_row_entries(left, right, n, a2):
    left_num, left_n_den, left_a2_den = left
    right_num, right_n_den, right_a2_den = right
    n_den = max(left_n_den, right_n_den)
    a2_den = max(left_a2_den, right_a2_den)
    numerator = (
        left_num * n ** (n_den - left_n_den) * a2 ** (a2_den - left_a2_den)
        - right_num * n ** (n_den - right_n_den) * a2 ** (a2_den - right_a2_den)
    )
    return numerator, n_den, a2_den


def homogeneous_simplex_negative_power_envelope(polynomial, context):
    """Lower-bound the negative part after exact simplex homogenization.

    On u0+...+u4=1, homogenization is an identity.  Every power monomial in
    all remaining nonnegative chart variables is nonnegative, so discarding
    positive scalar coefficients gives a nonpositive polynomial L with
    L <= min(polynomial, 0).
    """
    generators = context.gens()
    simplex = generators[4:9]
    simplex_sum = balanced_batched_sum(simplex, batch_size=5)
    terms = list(polynomial.terms())
    degree = max(sum(map(int, monomial[4:9])) for monomial, _ in terms)
    pieces = []
    for monomial, coefficient in terms:
        term = context.constant(coefficient)
        for variable, exponent in zip(generators, monomial):
            term *= variable ** int(exponent)
        gap = degree - sum(map(int, monomial[4:9]))
        if gap:
            term *= simplex_sum ** gap
        pieces.append(term)
    homogeneous = balanced_batched_sum(pieces, batch_size=64)
    negative_pieces = []
    for monomial, coefficient in homogeneous.terms():
        if coefficient >= 0:
            continue
        term = context.constant(coefficient)
        for variable, exponent in zip(generators, monomial):
            term *= variable ** int(exponent)
        negative_pieces.append(term)
    lower = balanced_batched_sum(negative_pieces, batch_size=64)
    return lower, {
        "simplex_degree": degree,
        "homogeneous_terms": len(list(homogeneous.terms())),
        "negative_power_terms": len(negative_pieces),
    }


def negative_power_terms(polynomial, context):
    pieces = []
    for monomial, coefficient in polynomial.terms():
        if coefficient >= 0:
            continue
        term = context.constant(coefficient)
        for variable, exponent in zip(context.gens(), monomial):
            term *= variable ** int(exponent)
        pieces.append(term)
    return balanced_batched_sum(pieces, batch_size=64), len(pieces)


def lift_simplex_coefficient(polynomial, beta, source_context):
    source_gens = source_context.gens()
    coefficient_gens = (source_gens[0], source_gens[1], source_gens[2],
                        source_gens[3], source_gens[9])
    pieces = []
    for monomial, coefficient in polynomial.terms():
        term = source_context.constant(coefficient)
        for variable, exponent in zip(coefficient_gens, monomial):
            term *= variable ** int(exponent)
        for variable, exponent in zip(source_gens[4:9], beta):
            term *= variable ** int(exponent)
        pieces.append(term)
    return (
        balanced_batched_sum(pieces, batch_size=64)
        if pieces else source_context.constant(0)
    )


def bounded_bernstein_power_data(polynomial, context):
    """Bernstein-transform x,y,z,w while retaining the h power axis."""
    terms = list(polynomial.terms())
    degrees = tuple(
        max(int(monomial[axis]) for monomial, _ in terms)
        for axis in range(4)
    )
    degree_h = max(int(monomial[4]) for monomial, _ in terms)
    shape = (*tuple(degree + 1 for degree in degrees), degree_h + 1)
    values = np.empty(shape, dtype=object)
    values.fill(fmpq(0))
    for monomial, coefficient in terms:
        values[tuple(map(int, monomial))] = coefficient
    for axis, degree in enumerate(degrees):
        if degree == 0:
            continue
        moved = np.moveaxis(values, axis, 0)
        remaining_shape = moved.shape[1:]
        flat = moved.reshape((degree + 1, -1))
        matrix = fmpq_mat([
            [
                fmpq(math.comb(index, exponent), math.comb(degree, exponent))
                if exponent <= index else fmpq(0)
                for exponent in range(degree + 1)
            ]
            for index in range(degree + 1)
        ])
        block = fmpq_mat([
            list(flat[row, :]) for row in range(degree + 1)
        ])
        entries = (matrix * block).entries()
        width = flat.shape[1]
        transformed = np.empty_like(flat)
        for row in range(degree + 1):
            transformed[row, :] = entries[row * width:(row + 1) * width]
        values = np.moveaxis(
            transformed.reshape((degree + 1, *remaining_shape)), 0, axis
        )
    stream = hashlib.sha256()
    for value in values.flat:
        stream.update(f"{value};".encode())
    return degrees, degree_h, values, stream.hexdigest().upper()


def bounded_bernstein_negative_power_envelope(polynomial, context):
    degrees, degree_h, values, stream = bounded_bernstein_power_data(
        polynomial, context
    )
    one = context.constant(1)
    bounded = context.gens()[:4]
    h = context.gens()[4]
    bases = []
    for variable, degree in zip(bounded, degrees):
        bases.append([
            math.comb(degree, index)
            * variable ** index * (one - variable) ** (degree - index)
            for index in range(degree + 1)
        ])
    pieces = []
    negative = 0
    positive = 0
    zero = 0
    minimum = None
    for index in np.ndindex(values.shape):
        coefficient = values[index]
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient > 0:
            positive += 1
            continue
        if coefficient == 0:
            zero += 1
            continue
        negative += 1
        term = context.constant(coefficient) * h ** index[4]
        for axis in range(4):
            term *= bases[axis][index[axis]]
        pieces.append(term)
    lower = (
        balanced_batched_sum(pieces, batch_size=64)
        if pieces else context.constant(0)
    )
    return lower, {
        "bounded_degrees": list(degrees),
        "h_power_degree": degree_h,
        "controls": int(values.size),
        "negative": negative,
        "positive": positive,
        "zero": zero,
        "minimum": str(minimum),
        "control_stream_sha256": stream,
    }


def structured_uncertain_envelope(polynomial, source_context, label):
    """Keep the proved simplex-sign structure and pay only mixed pieces."""
    coefficient_context = fmpq_mpoly_ctx.get(
        ("x", "y", "z", "w", "h"), "degrevlex"
    )
    degree, betas, coefficients, grouped = split_simplex(
        polynomial, coefficient_context, prefix_count=4, tail_count=1
    )
    pieces = []
    negative_power_count = 0
    assumed_positive = []
    assumed_negative = []
    mixed = []
    sign_certificates = []
    mixed_certificates = []
    for beta, coefficient in zip(betas, coefficients):
        if label == "PW2" and beta[-1] != degree:
            _, certificate = bounded_bernstein_negative_power_envelope(
                coefficient, coefficient_context
            )
            assert certificate["negative"] == 0
            assumed_positive.append((beta, coefficient))
            sign_certificates.append({
                "beta": list(beta), "desired_sign": "positive", **certificate
            })
            continue
        if label == "PW3" and beta[-1] == degree:
            _, certificate = bounded_bernstein_negative_power_envelope(
                -coefficient, coefficient_context
            )
            assert certificate["negative"] == 0
            assumed_negative.append((beta, -coefficient))
            sign_certificates.append({
                "beta": list(beta), "desired_sign": "negative", **certificate
            })
            pieces.append(lift_simplex_coefficient(
                coefficient, beta, source_context
            ))
            continue
        lower, certificate = bounded_bernstein_negative_power_envelope(
            coefficient, coefficient_context
        )
        negative_power_count += certificate["negative"]
        mixed.append(beta)
        mixed_certificates.append({"beta": list(beta), **certificate})
        pieces.append(lift_simplex_coefficient(lower, beta, source_context))
    envelope = balanced_batched_sum(pieces, batch_size=32)
    return envelope, {
        "simplex_degree": degree,
        "raw_simplex_monomials": grouped,
        "assumed_positive_betas": [list(beta) for beta, _ in assumed_positive],
        "assumed_negative_betas": [list(beta) for beta, _ in assumed_negative],
        "mixed_betas": [list(beta) for beta in mixed],
        "mixed_negative_power_terms": negative_power_count,
        "simplex_sign_certificates": sign_certificates,
        "mixed_envelope_certificates": mixed_certificates,
    }, assumed_positive, assumed_negative


def coefficient_terms(arow, brow, crow, drow):
    return {
        "PA3": ((-2, arow, 2), (1, arow, 3), (7, arow, 4),
                (-2, crow, 1), (7, crow, 3)),
        "PA4": ((-2, arow, 1), (-2, arow, 2), (-5, arow, 3),
                (-12, crow, 2)),
        "PA5": ((1, arow, 1), (-5, arow, 2), (7, crow, 1)),
        "PA6": ((7, arow, 1),),
        "PB3": ((-2, arow, 2), (1, arow, 3), (7, arow, 4),
                (-2, brow, 1), (7, brow, 3)),
        "PB4": ((-2, arow, 1), (-2, arow, 2), (-5, arow, 3),
                (-12, brow, 2)),
        "PB5": ((1, arow, 1), (-5, arow, 2), (7, brow, 1)),
        "PB6": ((7, arow, 1),),
        "PW2": ((-2, arow, 3), (2, arow, 4), (7, arow, 5),
                (-2, brow, 2), (1, brow, 3), (7, brow, 4),
                (-2, crow, 2), (1, crow, 3), (7, crow, 4),
                (-2, drow, 1), (7, drow, 3)),
        "PW3": ((-4, arow, 2), (-2, arow, 3), (2, arow, 4),
                (-2, brow, 1), (-2, brow, 2), (-5, brow, 3),
                (-2, crow, 1), (-2, crow, 2), (-5, crow, 3),
                (-12, drow, 2)),
        "PW4": ((-2, arow, 1), (-2, arow, 2), (-10, arow, 3),
                (1, brow, 1), (-5, brow, 2),
                (1, crow, 1), (-5, crow, 2), (7, drow, 1)),
        "PW5": ((2, arow, 1), (2, arow, 2),
                (7, brow, 1), (7, crow, 1)),
        "PW6": ((7, arow, 1),),
        "PZ4": ((-2, arow, 1), (7, arow, 3)),
        "PZ5": ((-12, arow, 2),),
        "PZ6": ((7, arow, 1),),
    }


def build_source(context, geometry: str, chart: str,
                 bmask: int, cmask: int, d2mask: int, w_parent_mode: str,
                 base_order: int, ratio_floor: bool):
    if ratio_floor:
        x, y, z, w, t, r0, r1, r2, r3, h = context.gens()
        active_scale = 1 - 2 * t * fmpq(1, 3)
        u0, u1, u2, u3 = (
            active_scale * r0,
            active_scale * r1,
            active_scale * r2,
            active_scale * r3,
        )
        u4 = 2 * t * fmpq(1, 3)
    else:
        x, y, z, w, u0, u1, u2, u3, u4, h = context.gens()
    one = context.constant(1)
    n = base_order + h
    if geometry == "common0":
        union_order = n
    else:
        assert geometry == "common1"
        union_order = n - 1
    if chart == "low":
        mb = 7 + (union_order - 14) * x * fmpq(1, 2)
        mc = union_order - mb + mb * y
        d = mb * y
    elif chart == "high":
        assert geometry == "common1"
        mb = union_order * (one + x) * fmpq(1, 2)
        mc = mb + (union_order - mb) * y
        d = mb + mc - union_order
    elif chart == "high_far":
        assert geometry == "common0"
        deficit_b = 2 + (n - 4) * x * fmpq(1, 2)
        deficit_c = deficit_b * y
        mb = n - deficit_b
        mc = n - deficit_c
        d = n - deficit_b - deficit_c
    elif chart == "high_band":
        assert geometry == "common0"
        deficit_b = one + x
        deficit_c = one - x + 2 * x * y
        mb = n - deficit_b
        mc = n - deficit_c
        d = n - deficit_b - deficit_c
    else:
        assert chart in ("high_near", "high_near_lowedge", "high_near_highedge")
        assert geometry == "common0"
        deficit_b = x * (2 - y)
        deficit_c = x * y
        mb = n - deficit_b
        mc = n - deficit_c
        d = n - 2 * x

    if geometry == "common1":
        edge_cap = d
    elif chart.startswith("high_near"):
        edge_cap = n - 1
    else:
        edge_cap = d + 1
    if chart == "high_near_lowedge":
        edges = n * z * fmpq(1, 2)
        omega = edges**2 * w * fmpq(1, 2)
    elif chart == "high_near_highedge":
        edges = n * fmpq(1, 2) + (n * fmpq(1, 2) - 1) * z
        wedge_floor = 2 * edges - n
        omega = wedge_floor + (edges**2 * fmpq(1, 2) - wedge_floor) * w
    else:
        edges = edge_cap * z
        omega = edges**2 * w * fmpq(1, 2)
    a2 = choose(n, 2, one) - edges
    a3 = choose(n, 3, one) - edges * (n - 2) + omega
    budget_num = 6 * n * a3 - 4 * n * a2
    r3_num = 3 * n * a2 + budget_num * (u0 + u1 + u2 + u3)
    r4_num = 2 * n * a2 + budget_num * (u0 + u1 + u2)
    r5_num = n * a2 + budget_num * (u0 + u1)
    r6_num = budget_num * u0
    arow = (
        (one, 0, 0),
        (n, 0, 0),
        (a2, 0, 0),
        (a3, 0, 0),
        (a3 * r3_num * fmpq(1, 8), 1, 1),
        (a3 * r3_num * r4_num * fmpq(1, 80), 2, 2),
        (a3 * r3_num * r4_num * r5_num * fmpq(1, 960), 3, 3),
        (a3 * r3_num * r4_num * r5_num * r6_num * fmpq(1, 13440), 4, 4),
    )
    brow = row_corner(mb, bmask, one, reduced=True)
    crow = row_corner(mc, cmask, one, reduced=True)
    drow = d_coarse_corner_row(d, d2mask, one)
    no_parent = balanced_batched_sum((
        scaled_bilinear(arow, arow, A2_TERMS, n, a2),
        scaled_bilinear(arow, brow, L2_TERMS, n, a2),
        scaled_bilinear(arow, crow, L2_TERMS, n, a2),
        scaled_bilinear(brow, crow, K2_TERMS, n, a2),
        scaled_bilinear(arow, drow, K2_TERMS, n, a2),
    ), batch_size=5)

    terms = coefficient_terms(arow, brow, crow, drow)
    desired_sign = {
        "PA3": 1, "PA4": -1, "PA5": -1, "PA6": 1,
        "PB3": 1, "PB4": -1, "PB5": -1, "PB6": 1,
        "PW2": 1, "PW3": -1, "PW4": -1, "PW5": 1, "PW6": 1,
        "PZ4": 1, "PZ5": -1, "PZ6": 1,
    }
    uncertain_signs = {"PW2", "PW3"}
    sign_polynomials = {
        label: desired_sign[label] * scaled_linear(value, one, n, a2)
        for label, value in terms.items()
        if label not in uncertain_signs
    }
    uncertain_polynomials = {
        label: scaled_linear(terms[label], one, n, a2)
        for label in sorted(uncertain_signs)
    }
    harmful_caps = {
        "PA4": choose(mb - 1, 2, one),
        "PA5": choose(mb - 1, 3, one),
        "PB4": choose(mc - 1, 2, one),
        "PB5": choose(mc - 1, 3, one),
        "PZ5": choose(d, 2, one),
    }
    signed_harmful_lower = tuple(
        scaled_linear(terms[label], cap, n, a2)
        for label, cap in harmful_caps.items()
    )
    pw4_scaled = scaled_linear(terms["PW4"], one, n, a2)
    if w_parent_mode == "zero":
        w_parent_lower = one * 0
    elif w_parent_mode == "endpoint_q2_zero":
        w_parent_lower = (
            (n - 1) * uncertain_polynomials["PW2"]
            + choose(n - 1, 3, one) * pw4_scaled
        )
    elif w_parent_mode == "endpoint_q2_full":
        w_parent_lower = (
            (n - 1) * uncertain_polynomials["PW2"]
            + choose(n - 1, 2, one) * uncertain_polynomials["PW3"]
            + choose(n - 1, 3, one) * pw4_scaled
        )
    elif w_parent_mode == "isolated_exact":
        qrow = [(one, 0, 0)]
        for rank in range(1, 6):
            qrow.append(subtract_row_entries(
                arow[rank], qrow[rank - 1], n, a2
            ))
        w_parent_lower = balanced_batched_sum(tuple(
            scaled_linear_weight(terms[f"PW{rank}"], qrow[rank - 1], n, a2)
            for rank in range(2, 7)
        ), batch_size=5)
    else:
        assert w_parent_mode == "split_pw3"
        neg_pw3_terms = (
            (4, arow, 2), (2, arow, 3),
            (2, brow, 1), (2, brow, 2), (5, brow, 3),
            (2, crow, 1), (2, crow, 2), (5, crow, 3),
            (12, drow, 2),
        )
        neg_pw3_scaled = scaled_linear(neg_pw3_terms, one, n, a2)
        w_parent_lower = (
            -choose(n - 1, 2, one) * neg_pw3_scaled
            + choose(n - 1, 3, one) * pw4_scaled
        )
    correction_lower = balanced_batched_sum(
        signed_harmful_lower + (w_parent_lower,), batch_size=8
    )
    ordinary_lower = no_parent + correction_lower
    metadata = {
        "geometry": geometry,
        "order_chart": chart,
        "B_mask": bmask,
        "C_mask": cmask,
        "D2_mask": d2mask,
        "positive_multiplier": "N^4*a2^4",
        "sign_certified_harmful_parent_loss_coordinates": sorted(harmful_caps),
        "W_parent_endpoint_mode": w_parent_mode,
        "parent_loss_ceilings": {
            "PA4": "C(mB-1,2)", "PA5": "C(mB-1,3)",
            "PB4": "C(mC-1,2)", "PB5": "C(mC-1,3)",
            "PW2/PW3/PW4": "shared forest-row order endpoint 0 or N-1",
            "PZ5": "C(d,2)",
        },
        "W_parent_endpoint_reduction": {
            "row": "PWk=i_(k-1)(A-N[p]) on t=PW2 vertices",
            "reason": (
                "PW4 coefficient is nonpositive; after the PW3 endpoint choice, "
                "the t-sequence is discretely concave, so t=0 or N-1"
            ),
        },
        "PW2_large_order_sign_floor": (
            "for N>=19 and mB,mC>=7: ambient floor plus two subset floors "
            "and -2d is at least A(N)-2N-50; at N=19+t its coefficients "
            "are 7/120,31/8,2467/24,10857/8,177343/20,22635"
        ),
        "ratio_floor_parameterization": (
            "u4=2t/3 and ui=(1-2t/3)ri for i=0..3, sum ri=1"
            if ratio_floor else "original five-coordinate simplex"
        ),
    }
    return ordinary_lower, sign_polynomials, uncertain_polynomials, metadata


def coefficient_records(polynomial, coefficient_context, target_context,
                        label: str, chunk_columns: int, prefix_count: int,
                        simplex_count: int, tail_count: int,
                        bounded_count: int):
    simplex_degree, betas, coefficients, grouped = split_simplex_general(
        polynomial, coefficient_context, prefix_count, simplex_count,
        tail_count
    )
    records = []
    digest = hashlib.sha256()
    for beta_index, coefficient in enumerate(coefficients):
        mapped, degree_h, coefficient_terms = compactify_one(
            coefficient, target_context, bounded_count=bounded_count
        )
        if not list(mapped.terms()):
            continue
        degrees, values, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, bounded_count + 1, chunk_columns=chunk_columns
        )
        assert replay_terms == len(list(mapped.terms()))
        minimum = min(values.flat)
        minimum_flat_index = min(
            range(values.size), key=lambda index: values.flat[index]
        )
        minimum_multiindex = list(map(int, __import__("numpy").unravel_index(
            minimum_flat_index, values.shape
        )))
        negative = sum(1 for value in values.flat if value < 0)
        zero = sum(1 for value in values.flat if value == 0)
        record = {
            "beta_index": beta_index,
            "beta": betas[beta_index],
            "coefficient_terms": coefficient_terms,
            "compactification_degree_h": degree_h,
            "bernstein_degrees": list(map(int, degrees)),
            "bernstein_coefficients": int(values.size),
            "negative": negative,
            "zero": zero,
            "minimum": str(minimum),
            "minimum_multiindex": minimum_multiindex,
        }
        records.append(record)
        digest.update(json.dumps(
            record, separators=(",", ":"), sort_keys=True
        ).encode())
    return {
        "label": label,
        "simplex_degree": simplex_degree,
        "raw_simplex_monomials": grouped,
        "simplex_coefficients": len(coefficients),
        "negative": sum(row["negative"] for row in records),
        "zero": sum(row["zero"] for row in records),
        "minimum": str(min(fmpq(row["minimum"]) for row in records)),
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--geometry", choices=("common0", "common1"), required=True)
    parser.add_argument(
        "--order-chart",
        choices=(
            "low", "high", "high_far", "high_band", "high_near",
            "high_near_lowedge", "high_near_highedge",
        ),
        required=True,
    )
    parser.add_argument("--b-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--c-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument("--d2-mask", type=int, choices=(0, 1), required=True)
    parser.add_argument(
        "--w-parent-mode",
        choices=(
            "zero", "endpoint_q2_zero", "endpoint_q2_full", "isolated_exact",
            "split_pw3",
        ),
        required=True,
    )
    parser.add_argument("--chunk-columns", type=int, default=4096)
    parser.add_argument("--base-order", type=int, default=BASE_ORDER)
    parser.add_argument("--ratio-floor", action="store_true")
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--diagnose-uncertain-signs", action="store_true")
    args = parser.parse_args()
    assert sha256(LOSS) == LOSS_SHA256
    assert sha256(RATIO_FLOOR) == RATIO_FLOOR_SHA256
    if args.ratio_floor:
        names = ("x", "y", "z", "w", "t", "r0", "r1", "r2", "r3", "h")
        coefficient_names = ("x", "y", "z", "w", "t", "h")
        target_names = ("x", "y", "z", "w", "t", "H")
        prefix_count, simplex_count, tail_count, bounded_count = 5, 4, 1, 5
    else:
        names = ("x", "y", "z", "w", "u0", "u1", "u2", "u3", "u4", "h")
        coefficient_names = ("x", "y", "z", "w", "h")
        target_names = ("x", "y", "z", "w", "H")
        prefix_count, simplex_count, tail_count, bounded_count = 4, 5, 1, 4
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    lower, signs, uncertain, metadata = build_source(
        context, args.geometry, args.order_chart,
        args.b_mask, args.c_mask, args.d2_mask, args.w_parent_mode,
        args.base_order, args.ratio_floor,
    )
    inspect = {
        **metadata,
        "ordinary_lower_terms": len(list(lower.terms())),
        "sign_terms": {label: len(list(value.terms())) for label, value in signs.items()},
    }
    print(json.dumps(inspect, indent=2, sort_keys=True), flush=True)
    if args.inspect_only:
        print(MARKER + "_INSPECT_ONLY")
        return

    coefficient_context = fmpq_mpoly_ctx.get(coefficient_names, "degrevlex")
    target_context = fmpq_mpoly_ctx.get(target_names, "degrevlex")
    lower_certificate = coefficient_records(
        lower, coefficient_context, target_context,
        "ordinary_parent_lower", args.chunk_columns, prefix_count,
        simplex_count, tail_count, bounded_count
    )
    sign_certificates = {
        label: coefficient_records(
            value, coefficient_context, target_context,
            f"desired_sign_{label}", args.chunk_columns, prefix_count,
            simplex_count, tail_count, bounded_count
        )
        for label, value in sorted(signs.items())
    }
    uncertain_certificates = {}
    if args.diagnose_uncertain_signs:
        for label, value in sorted(uncertain.items()):
            uncertain_certificates[label + "_positive"] = coefficient_records(
                value, coefficient_context, target_context,
                label + "_positive", args.chunk_columns, prefix_count,
                simplex_count, tail_count, bounded_count
            )
            uncertain_certificates[label + "_negative"] = coefficient_records(
                -value, coefficient_context, target_context,
                label + "_negative", args.chunk_columns, prefix_count,
                simplex_count, tail_count, bounded_count
            )
    report = {
        "marker": MARKER,
        **inspect,
        "ordinary_lower_certificate": lower_certificate,
        "sign_certificates": sign_certificates,
        "uncertain_sign_diagnostics": uncertain_certificates,
        "negative_lower_controls": lower_certificate["negative"],
        "negative_sign_controls": sum(
            row["negative"] for row in sign_certificates.values()
        ),
        "scope": (
            f"N>={args.base_order}, ordered induced orders at least seven, one geometry/chart/corner; "
            "relaxation probe only"
        ),
        "loss_report_sha256": LOSS_SHA256,
        "ratio_floor_report_sha256": RATIO_FLOOR_SHA256,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_split_pw3_wedge_"
        f"{args.geometry}_{args.order_chart}_B{args.b_mask:02d}_C{args.c_mask:02d}_"
        f"D2{args.d2_mask}_{args.w_parent_mode}_N{args.base_order}_"
        f"{'ratiofloor_' if args.ratio_floor else ''}flint_probe_root_20260831.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_lower_controls": report["negative_lower_controls"],
        "negative_sign_controls": report["negative_sign_controls"],
        "lower_minimum": lower_certificate["minimum"],
        "sign_minimum": min(
            fmpq(row["minimum"]) for row in sign_certificates.values()
        ).__str__(),
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
