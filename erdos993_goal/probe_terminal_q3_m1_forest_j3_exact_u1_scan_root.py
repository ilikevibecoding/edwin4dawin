#!/usr/bin/env python3
"""Numeric structural scan of the exact-U1 forest m=1, j=3 lower."""

from __future__ import annotations

import math
import numpy as np
import sympy as sp

from derive_terminal_q3_m1_forest_j3_exact_u1_root import build
from derive_terminal_q3_m1_forest_j3_component_u0_root import (
    build as build_component_u0,
)


def path_floor(n: int, k: int) -> int:
    return math.comb(n - k + 1, k) if n >= 2 * k - 1 else 0


def main(max_N: int = 100) -> None:
    numerator, denominator, _mnum, _mden, variables, b = build()
    component_num, component_den, component_variables, component_b = (
        build_component_u0()
    )
    N, h, d, R, W, y = variables
    assert variables == component_variables
    assert sp.cancel(b - component_b) == 0
    assert sp.cancel(denominator - component_den) == 0
    # denominator=-72*(N-3)*(positive factors)*b on supported cells.
    expected_denominator_ratio = -72 * (N - 3) * (
        N**2 - 3 * N + 2 * d + 2 * h
    ) * (N**2 + N + 2 * h + 2)
    assert sp.cancel(denominator / b - expected_denominator_ratio) == 0
    sign_polys = (sp.Poly(-numerator, W), sp.Poly(-component_num, W))
    assert all(poly.degree() == 3 for poly in sign_polys)
    coefficient_functions = tuple(
        tuple(
            sp.lambdify(
                (N, h, d, R, y),
                poly.coeff_monomial(W**power),
                "math",
            )
            for power in (3, 2, 1, 0)
        )
        for poly in sign_polys
    )

    def real_roots(coefficients):
        scale = max(abs(value) for value in coefficients)
        if scale == 0:
            return []
        trimmed = list(coefficients)
        while len(trimmed) > 1 and abs(trimmed[0]) <= 1e-12 * scale:
            trimmed.pop(0)
        return [
            float(root.real)
            for root in np.roots(trimmed)
            if abs(root.imag) <= 1e-8 * max(1.0, abs(root.real))
        ]

    def evaluate(coefficients, value):
        total = 0.0
        for coefficient in coefficients:
            total = total * value + coefficient
        return total

    def choose(n, k):
        return math.comb(n, k) if 0 <= k <= n else 0

    def path_class_u0_sign(Nv, hv, dv, Rv, Wv, yv):
        """Common-denominator sign from four-set root-neighbor classes."""
        Sv = Nv - dv
        q1, s1 = divmod(Rv, dv)
        one_root = (
            (dv - s1) * path_floor(Sv - q1, 3)
            + s1 * path_floor(Sv - q1 - 1, 3)
        )
        pairs = choose(dv, 2)
        if pairs:
            q2, s2 = divmod((dv - 1) * Rv, pairs)
            two_roots = (
                (pairs - s2) * path_floor(Sv - q2, 2)
                + s2 * path_floor(Sv - q2 - 1, 2)
            )
        else:
            two_roots = 0
        three_roots = choose(dv, 3) * Sv - choose(dv - 1, 2) * Rv
        four_roots = choose(dv, 4)
        zero_roots = path_floor(Sv, 4)
        f4floor = zero_roots + one_root + two_roots + three_roots + four_roots
        assert f4floor >= 0

        mv = Nv - hv
        p0 = choose(Nv + 1, 3) - mv * (Nv - 1) + Wv + choose(Nv + 1, 2) - mv
        p1 = choose(Nv + 1, 2) - mv + Nv + 1
        R1 = mv * Nv - 2 * Wv
        a = choose(Nv, 2) - (mv - dv)
        z2 = (mv - dv) * (Nv - 2) - 2 * (Wv - choose(dv, 2) - Rv)
        h2 = choose(Nv - dv, 2) - (mv - dv - Rv)
        c0 = a + z2 + h2
        bvalue = choose(Nv, 3) - (mv - dv) * (Nv - 2) + Wv - choose(dv, 2) - Rv
        assert a > 0 and p1 > 0
        A1 = p0 * a + p1 * c0 + p1 * a - a * R1
        ebar = 1 + yv + 3 * z2 / (2 * a)
        Q0 = 4 * c0 - 3 * ebar * (p0 + a)
        Q1 = 4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
        remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
        gap = 2 * p1 * c0 - 3 * a * R1
        # This is b*lower with all 1/b terms cancelled algebraically.
        lower_times_b = 4 * (
            1.5 * p0 * R1 * bvalue
            + p0 * p0 * gap / (2 * p1)
            + A1 * ((1 + yv) * bvalue + h2 + f4floor + p0)
        ) + remainder * bvalue
        positive_scale = (
            72 * (Nv - 3)
            * (Nv**2 - 3 * Nv + 2 * dv + 2 * hv)
            * (Nv**2 + Nv + 2 * hv + 2)
        )
        return lower_times_b * positive_scale

    cells = tests = negatives = 0
    interior_tests = interior_negatives = 0
    interior_minimum = None
    branch_negatives = [0, 0, 0]
    branch_minima = [None, None, None]
    minimum = None
    for Nv in range(13, max_N + 1):
        for hv in range(1, (Nv - 1) // 2 + 1):
            edge_budget = Nv - 2 * hv
            B = edge_budget - 1
            if B <= 0:
                continue
            for dv in range(1, edge_budget + 1):
                Sv = Nv - dv
                cS3 = math.comb(Sv, 3) if Sv >= 3 else 0
                for Rv in range(edge_budget - dv + 1):
                    eH = Nv - hv - dv - Rv
                    h3max = cS3 - eH * (Sv - 2) + eH * (eH - 1) // 2
                    assert h3max >= 0
                    qv, sv = divmod(Rv, dv)
                    exactly_one_root_neighbor = (
                        (dv - sv) * path_floor(Sv - qv, 2)
                        + sv * path_floor(Sv - qv - 1, 2)
                    )
                    exactly_two_root_neighbors = (
                        dv * (dv - 1) * Sv // 2 - (dv - 1) * Rv
                    )
                    exactly_three_root_neighbors = (
                        dv * (dv - 1) * (dv - 2) // 6
                    )
                    root_neighbor_classes = (
                        exactly_one_root_neighbor
                        + exactly_two_root_neighbors
                        + exactly_three_root_neighbors
                    )
                    assert root_neighbor_classes >= 0
                    balanced = (
                        h3max / (h3max + root_neighbor_classes)
                        if h3max else 0.0
                    )
                    relative = (
                        (Sv - 2) / (Sv - 2 + 3 * (dv - 3))
                        if dv > 3 and Sv >= 3 else 1.0
                    )
                    ycap = min(balanced, relative)
                    low = max(dv * (dv - 1) / 2 + Rv, B)
                    slack = edge_budget - dv - Rv
                    high = (
                        dv * (dv - 1) / 2
                        + Rv * (Rv + 1) / 2
                        + slack * (slack + 1) / 2
                    )
                    assert low <= high + 1e-9
                    cells += 1
                    endpoint_coefficients = []
                    for yv in sorted(set((0.0, ycap))):
                        symbolic_coefficients = tuple(
                            tuple(fn(Nv, hv, dv, Rv, yv) for fn in functions)
                            for functions in coefficient_functions
                        )
                        samples = [
                            path_class_u0_sign(Nv, hv, dv, Rv, Wsample, yv)
                            for Wsample in range(5)
                        ]
                        delta1 = samples[1] - samples[0]
                        delta2 = samples[2] - 2 * samples[1] + samples[0]
                        delta3 = (
                            samples[3] - 3 * samples[2]
                            + 3 * samples[1] - samples[0]
                        )
                        path_coefficients = (
                            delta3 / 6,
                            delta2 / 2 - delta3 / 2,
                            delta1 - delta2 / 2 + delta3 / 3,
                            samples[0],
                        )
                        assert abs(
                            evaluate(path_coefficients, 4) - samples[4]
                        ) <= 1e-6 * max(1.0, abs(samples[4]))
                        coefficients = symbolic_coefficients + (path_coefficients,)
                        endpoint_coefficients.append(coefficients)
                        wvalues = [low, high]
                        # The minimum of max(L_coupled,L_component) occurs at
                        # an endpoint, a stationary point of either cubic, or
                        # a crossing of the two cubics.
                        for c3, c2, c1, _c0 in coefficients:
                            wvalues.extend(real_roots((3 * c3, 2 * c2, c1)))
                        for left_index in range(len(coefficients)):
                            for right_index in range(left_index + 1, len(coefficients)):
                                difference = tuple(
                                    left - right for left, right in zip(
                                        coefficients[left_index],
                                        coefficients[right_index],
                                    )
                                )
                                wvalues.extend(real_roots(difference))
                        for Wv in wvalues:
                            if not low - 1e-8 <= Wv <= high + 1e-8:
                                continue
                            branch_values = tuple(
                                evaluate(branch, Wv) for branch in coefficients
                            )
                            for branch_index, branch_value in enumerate(branch_values):
                                branch_record = (
                                    branch_value, Nv, hv, dv, Rv, Wv, yv, ycap
                                )
                                if (
                                    branch_minima[branch_index] is None
                                    or branch_record < branch_minima[branch_index]
                                ):
                                    branch_minima[branch_index] = branch_record
                                if branch_value < -1e-3:
                                    branch_negatives[branch_index] += 1
                            value = max(branch_values)
                            tests += 1
                            record = (
                                value, Nv, hv, dv, Rv, Wv, yv, ycap,
                                branch_values,
                            )
                            if minimum is None or record < minimum:
                                minimum = record
                            if value < -1e-3:
                                negatives += 1
                                if negatives <= 8:
                                    print("negative", record, flush=True)
                    if ycap > 0:
                        assert len(endpoint_coefficients) == 2
                        for Wv in range(math.ceil(low), math.floor(high) + 1):
                            values0 = tuple(
                                evaluate(branch, Wv)
                                for branch in endpoint_coefficients[0]
                            )
                            values1 = tuple(
                                evaluate(branch, Wv)
                                for branch in endpoint_coefficients[1]
                            )
                            tvalues = [0.0, 1.0]
                            for left_index in range(len(values0)):
                                for right_index in range(left_index + 1, len(values0)):
                                    slope_difference = (
                                        (values1[left_index] - values0[left_index])
                                        - (values1[right_index] - values0[right_index])
                                    )
                                    if abs(slope_difference) > 1e-12:
                                        crossing = (
                                            values0[right_index] - values0[left_index]
                                        ) / slope_difference
                                        if 0 < crossing < 1:
                                            tvalues.append(crossing)
                            for tv in tvalues:
                                branch_values = tuple(
                                    left + tv * (right - left)
                                    for left, right in zip(values0, values1)
                                )
                                value = max(branch_values)
                                interior_tests += 1
                                record = (
                                    value, Nv, hv, dv, Rv, Wv, tv * ycap,
                                    ycap, branch_values,
                                )
                                if interior_minimum is None or record < interior_minimum:
                                    interior_minimum = record
                                if value < -1e-3:
                                    interior_negatives += 1
                                    if interior_negatives <= 8:
                                        print("interior_negative", record, flush=True)
    print("cells", cells, "tests", tests, "negatives", negatives, flush=True)
    print("minimum", minimum, flush=True)
    print("branch_negatives", branch_negatives, flush=True)
    print("branch_minima", branch_minima, flush=True)
    print(
        "interior_tests", interior_tests,
        "interior_negatives", interior_negatives,
        flush=True,
    )
    print("interior_minimum", interior_minimum, flush=True)


if __name__ == "__main__":
    main()
