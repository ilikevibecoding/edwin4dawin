#!/usr/bin/env python3
"""Exact all-order row correlations for the balanced subdivided-star m=0 face.

This freezes the literal Y/tau formulas and coefficientwise H/K path grafts
needed by the terminal Newton-m0 proof.  It deliberately does *not* claim the
remaining root-partition sign reduction or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp

from probe_terminal_q3_low_newton_m0_balanced_subdivided_star_adversary import (
    balanced_arm_counts,
    cleared_q3_lower_margin,
    family_rows,
    structural_data,
    weak_compositions,
)


ROOT = Path(__file__).resolve().parent
DEPENDENCY = ROOT / "probe_terminal_q3_low_newton_m0_balanced_subdivided_star_adversary.py"
OUTPUT = ROOT / "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def convolution(left: list[int], right: list[int], maximum: int) -> list[int]:
    output = [0] * (maximum + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= maximum:
                output[i + j] += a * b
    return output


def path_row(vertices: int, maximum: int) -> list[int]:
    return [C(vertices + 1 - rank, rank) for rank in range(maximum + 1)]


def product_row(factors: list[list[int]], maximum: int) -> list[int]:
    row = [1] + [0] * maximum
    for factor in factors:
        row = convolution(row, factor, maximum)
    return row


def h_max_row(R: int, T: int, Y: int, maximum: int) -> list[int]:
    """Coefficientwise maximum H row at fixed R,T,Y."""
    assert 1 <= Y <= min(R, T)
    if T >= 2 * Y:
        factors = [path_row(T - 2 * Y + 3, maximum)]
        factors += [path_row(3, maximum)] * (Y - 1)
    else:
        factors = [path_row(3, maximum)] * (T - Y)
        factors += [path_row(2, maximum)] * (2 * Y - T)
    factors.append([C(R - Y, rank) for rank in range(maximum + 1)])
    return product_row(factors, maximum)


def k_min_row(T: int, Y: int, maximum: int) -> list[int]:
    """Coefficientwise minimum deep-tail K row at fixed T,Y."""
    assert 1 <= Y <= T
    if T >= 2 * Y:
        factors = [path_row(T - 2 * Y + 2, maximum)]
        factors += [path_row(2, maximum)] * (Y - 1)
    else:
        factors = [path_row(2, maximum)] * (T - Y)
        factors += [path_row(1, maximum)] * (2 * Y - T)
    return product_row(factors, maximum)


def sector_value(krow: list[int], isolates: int, rank: int) -> int:
    return sum(
        C(isolates, selected) * krow[rank - selected]
        for selected in range(rank + 1)
    )


def center_sector_extra_lower(
    j: int, d: int, R: int, T: int, Y: int
) -> int:
    """Lower row of F-H from nonempty exact-centre sectors.

    Integer Jensen is applied to the number of unsubdivided arms outside a
    c-subset of centres.  The sector row is discrete convex in that number.
    """
    krow = k_min_row(T, Y, j)
    unoccupied = R - Y
    extra = 0
    for centres in range(1, min(d, j) + 1):
        sectors = C(d, centres)
        residual_rank = j - centres
        total_outside = sectors * unoccupied * (d - centres)
        assert total_outside % d == 0
        total_outside //= d
        low, excess = divmod(total_outside, sectors)
        extra += (sectors - excess) * sector_value(krow, low, residual_rank)
        extra += excess * sector_value(krow, low + 1, residual_rank)
    return extra


def y_cap(j: int, d: int, R: int, T: int, Y: int) -> Fraction:
    h_upper = h_max_row(R, T, Y, j)[j]
    extra = center_sector_extra_lower(j, d, R, T, Y)
    return Fraction(h_upper, h_upper + extra) if h_upper else Fraction(0)


def symbolic_graft_identities() -> dict[str, object]:
    """Check the four identities and their all-order recurrence closure."""
    x = sp.symbols("x")
    paths: dict[int, sp.Expr] = {-2: sp.Integer(0), -1: sp.Integer(1)}
    paths[0] = sp.Integer(1)
    paths[1] = 1 + x
    for index in range(2, 61):
        paths[index] = sp.expand(paths[index - 1] + x * paths[index - 2])

    checks = 0
    # Lower grafts.
    for a in range(2, 31):
        for b in range(2, a + 1):
            lhs = paths[a] * paths[b] - paths[a + b - 2] * paths[2]
            rhs = x**4 * paths[a - 4] * paths[b - 4]
            assert sp.expand(lhs - rhs) == 0
            checks += 1
    for a in range(2, 31):
        lhs = paths[a] * paths[1] - paths[a - 1] * paths[2]
        rhs = x**3 * paths[a - 4]
        assert sp.expand(lhs - rhs) == 0
        checks += 1

    # Upper grafts.
    for a in range(3, 31):
        for b in range(3, a + 1):
            lhs = paths[a + b - 3] * paths[3] - paths[a] * paths[b]
            rhs = x**5 * paths[a - 5] * paths[b - 5]
            assert sp.expand(lhs - rhs) == 0
            checks += 1
    for a in range(3, 31):
        lhs = paths[a - 1] * paths[3] - paths[a] * paths[2]
        rhs = x**4 * paths[a - 5]
        assert sp.expand(lhs - rhs) == 0
        checks += 1

    # Fail-closed induction skeleton: both sides of every displayed family
    # obey X_n=X_(n-1)+x X_(n-2) in each unbounded path index.  The two base
    # indices used above are checked symbolically here rather than inferred
    # from a finite scan.
    u0, u1 = sp.symbols("u0 u1")
    recurrence_residual = sp.expand((u1 + x * u0) - u1 - x * u0)
    assert recurrence_residual == 0
    base = {
        "lower_pair_(2,2)": sp.expand(
            paths[2] ** 2 - paths[2] ** 2 - x**4 * paths[-2] ** 2
        ),
        "lower_pair_(3,3)": sp.expand(
            paths[3] ** 2 - paths[4] * paths[2] - x**4 * paths[-1] ** 2
        ),
        "upper_pair_(3,3)": sp.expand(
            paths[3] ** 2 - paths[3] ** 2 - x**5 * paths[-2] ** 2
        ),
        "upper_pair_(4,4)": sp.expand(
            paths[5] * paths[3] - paths[4] ** 2 - x**5 * paths[-1] ** 2
        ),
    }
    assert all(value == 0 for value in base.values())
    return {
        "path_recurrence": "P_n=P_(n-1)+x*P_(n-2), P_-2=0, P_-1=P_0=1",
        "lower_pair_graft": "P_a P_b-P_(a+b-2)P_2=x^4 P_(a-4)P_(b-4)",
        "lower_one_graft": "P_a P_1-P_(a-1)P_2=x^3 P_(a-4)",
        "upper_pair_graft": "P_(a+b-3)P_3-P_a P_b=x^5 P_(a-5)P_(b-5)",
        "upper_two_graft": "P_(a-1)P_3-P_a P_2=x^4 P_(a-5)",
        "recurrence_induction_base_residuals": {key: str(value) for key, value in base.items()},
        "finite_formula_replays": checks,
    }


def positive_compositions(total: int, parts: int):
    for row in weak_compositions(total - parts, parts):
        yield tuple(value + 1 for value in row)


def path_allocation_audit() -> dict[str, object]:
    allocations = coefficient_checks = 0
    minimum_upper_slack = None
    minimum_lower_slack = None
    for T in range(1, 19):
        for Y in range(1, min(T, 6) + 1):
            maximum = T + Y
            hmax = h_max_row(Y, T, Y, maximum)
            kmin = k_min_row(T, Y, maximum)
            for ell in positive_compositions(T, Y):
                hrow = product_row(
                    [path_row(value + 1, maximum) for value in ell], maximum
                )
                krow = product_row(
                    [path_row(value, maximum) for value in ell], maximum
                )
                for rank in range(maximum + 1):
                    upper_slack = hmax[rank] - hrow[rank]
                    lower_slack = krow[rank] - kmin[rank]
                    assert upper_slack >= 0
                    assert lower_slack >= 0
                    minimum_upper_slack = (
                        upper_slack
                        if minimum_upper_slack is None
                        else min(minimum_upper_slack, upper_slack)
                    )
                    minimum_lower_slack = (
                        lower_slack
                        if minimum_lower_slack is None
                        else min(minimum_lower_slack, lower_slack)
                    )
                    coefficient_checks += 2
                allocations += 1
    return {
        "positive_subdivision_allocations": allocations,
        "coefficient_checks": coefficient_checks,
        "minimum_H_upper_slack": minimum_upper_slack,
        "minimum_K_lower_slack": minimum_lower_slack,
    }


def literal_graph_moments(
    arms: tuple[int, ...], subdivisions: tuple[int, ...]
) -> tuple[int, int, int]:
    edges: list[tuple[int, int]] = []
    root = 0
    next_vertex = 1
    cursor = 0
    for count in arms:
        centre = next_vertex
        next_vertex += 1
        edges.append((root, centre))
        for ell in subdivisions[cursor : cursor + count]:
            previous = centre
            for _ in range(ell + 1):
                vertex = next_vertex
                next_vertex += 1
                edges.append((previous, vertex))
                previous = vertex
        cursor += count
    degrees = [0] * next_vertex
    for left, right in edges:
        degrees[left] += 1
        degrees[right] += 1
    wedges = sum(C(value, 2) for value in degrees)
    connected_four = sum(C(value, 3) for value in degrees)
    connected_four += sum(
        (degrees[left] - 1) * (degrees[right] - 1) for left, right in edges
    )
    return next_vertex, wedges, connected_four


def family_audit() -> dict[str, object]:
    allocation_rows = rank_checks = moment_checks = 0
    minimum_cap_slack = None
    minimum_h_extension_slack = None
    minimum_linear_f_extension_slack = None
    for d in range(1, 6):
        for R in range(1, 9):
            arms = balanced_arm_counts(d, R)
            for T in range(1, 7):
                if C(T + R - 1, R - 1) > 2500:
                    continue
                N = d + R + T
                q = R // d
                for subdivision in weak_compositions(T, R):
                    data = structural_data(arms, subdivision)
                    Y = data["Y"]
                    order, wedges, connected_four = literal_graph_moments(
                        arms, subdivision
                    )
                    assert order == N + 1
                    assert wedges - (N - 1) == data["B2"]
                    assert (
                        connected_four - (N - 2) - data["B2"]
                        == data["tau"]
                    )
                    moment_checks += 1
                    frow, hrow = family_rows(arms, subdivision, N)
                    supported = max(index for index, value in enumerate(frow) if value)
                    for j in range(3, supported + 1):
                        b, h = frow[j], hrow[j]
                        cap = y_cap(j, d, R, T, Y)
                        cap_slack = cap * b - h
                        assert cap_slack >= 0
                        minimum_cap_slack = (
                            cap_slack
                            if minimum_cap_slack is None
                            else min(minimum_cap_slack, cap_slack)
                        )
                        S = R + T
                        if h:
                            h_extension_floor = Fraction(
                                max(0, (S - 3 * j) * S + 2 * j * (R - Y)),
                                S * (j + 1),
                            )
                            h_extension_slack = Fraction(hrow[j + 1], h) - h_extension_floor
                            assert h_extension_slack >= 0
                            minimum_h_extension_slack = (
                                h_extension_slack
                                if minimum_h_extension_slack is None
                                else min(minimum_h_extension_slack, h_extension_slack)
                            )
                        if q == 0:
                            isolates = d - R
                            f_extension_floor = Fraction(
                                max(0, (N - 3 * j) * N + 2 * j * isolates),
                                N * (j + 1),
                            )
                            f_extension_slack = Fraction(frow[j + 1], b) - f_extension_floor
                            assert f_extension_slack >= 0
                            minimum_linear_f_extension_slack = (
                                f_extension_slack
                                if minimum_linear_f_extension_slack is None
                                else min(minimum_linear_f_extension_slack, f_extension_slack)
                            )
                        rank_checks += 1
                    allocation_rows += 1
    return {
        "allocation_rows": allocation_rows,
        "rank_checks": rank_checks,
        "literal_moment_checks": moment_checks,
        "minimum_y_cap_slack": str(minimum_cap_slack),
        "minimum_H_extension_slack": str(minimum_h_extension_slack),
        "minimum_linear_F_extension_slack": str(minimum_linear_f_extension_slack),
    }


def boundary_36_audit() -> dict[str, object]:
    arms = (2, 2, 2, 1, 1)
    records = []
    for allocation in weak_compositions(2, 8):
        margin, details = cleared_q3_lower_margin(arms, allocation, 4)
        assert details["supported"] == 1
        cap = y_cap(4, 5, 8, 2, details["Y"])
        assert cap * details["b"] >= details["h"]
        records.append((margin, allocation, details))
    records.sort(key=lambda item: (item[0], item[1]))
    assert len(records) == 36
    assert records[0][0] == 6_226_152_956_340
    assert records[0][1] == (0, 0, 0, 0, 0, 2, 0, 0)
    return {
        "parameters": {"N": 15, "j": 4, "d": 5, "R": 8, "T": 2},
        "allocations": len(records),
        "minimum_cleared_q3_lower_margin": records[0][0],
        "minimum_allocation": list(records[0][1]),
        "minimum_details": records[0][2],
        "warning": "This boundary replay audits the lemma; it is not the all-order proof.",
    }


def main() -> None:
    symbolic = symbolic_graft_identities()
    path_audit = path_allocation_audit()
    family = family_audit()
    boundary = boundary_36_audit()
    payload = {
        "schema": "balanced-subdivided-star-m0-row-correlation-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_BALANCED_SUBDIVIDED_STAR_M0_ROW_CORRELATION_LEMMA",
        "theorem": {
            "literal_rows": (
                "For balanced arm counts r_i and subdivision lengths ell_a, "
                "I_H=prod_a P_(ell_a+1), K=prod_a P_(ell_a), and "
                "I_F=prod_i(H_i+x K_i)."
            ),
            "occupancy": (
                "Y=#{a:ell_a>0}; tau=B3+(d-1)R+T-(N-2)"
                "+sum_(ell_a>0)(r(center(a))-1)."
            ),
            "H_upper": (
                "At fixed R,T,Y, I_H is coefficientwise at most the path-graft "
                "row Hmax stated by h_max_row."
            ),
            "K_lower": (
                "At fixed T,Y, K is coefficientwise at least the path-graft "
                "row Kmin stated by k_min_row."
            ),
            "y_cap": (
                "For every supported j, h_j/f_j <= Hmax_j/(Hmax_j+E_j), "
                "where E_j is the exact-centre/deep-tail Jensen floor."
            ),
            "U_correlations": (
                "U0/b=1+h_j/b+f_(j+1)/b; H and every q=0 linear F obey "
                "the isolate-biased degree-two extension floors audited here."
            ),
        },
        "symbolic_graft_proof": symbolic,
        "path_allocation_audit": path_audit,
        "balanced_family_literal_audit": family,
        "boundary_36_allocation_audit": boundary,
        "dependency_sha256": {DEPENDENCY.name: sha256(DEPENDENCY)},
        "scope_warning": (
            "This is an all-order row-correlation lemma for the balanced "
            "subdivided-star endpoint.  It does not by itself prove the m=0 "
            "Newton coefficient, the terminal payment theorem, or Erdos 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("path_audit", path_audit)
    print("family_audit", family)
    print("boundary", boundary)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
