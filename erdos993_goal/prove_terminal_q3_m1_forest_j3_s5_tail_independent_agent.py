#!/usr/bin/env python3
"""Fail-closed exact certificate for the forest m=1,j=3 S>=5,N>=31 tail.

This file reconstructs the terminal-row lower bounds directly in a fresh
FLINT polynomial context.  It proves the middle ratio band and then assembles
it with the separately frozen outer-cone theorem.  It intentionally excludes
S=2,3,4, the finite N=13..30 boundary, m=0, and full Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import json
import os
from math import comb, prod
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx


HERE = Path(__file__).resolve().parent
REPORT = HERE / "terminal_q3_m1_forest_j3_s5_tail_independent_20260829.json"

DEPENDENCY_HASHES = {
    "prove_terminal_q3_m1_forest_j3_y_slope_independent_agent.py":
        "DBB3FFAB587A581F7B87B5B4FD41709F7165EE919D38B66CDC7BED15B2162EB2",
    "terminal_q3_m1_forest_j3_y_slope_independent_20260829.json":
        "DA388A15F27F77AAE4306925EBA770AE6AF052365B468D85686CD02CB5D9FDD5",
    "prove_terminal_q3_m1_forest_j3_artificial_cap_denominator_independent_agent.py":
        "172FB7FEB8564BCF389862840B79C1CA8AA05D3D1CA753ACDD866C26D690BAF1",
    "terminal_q3_m1_forest_j3_artificial_cap_denominator_independent_20260829.json":
        "9F3708C1CB0A791E1DE8608EB6BA1D6D394087469E3BFFCEECFD2DCB9E4B405C",
    "prove_terminal_q3_m1_forest_j3_pair_exclusion_cap_independent_agent.py":
        "DECD67FD64234509F51591DDE1D4C1E7FE9548047F83D7F8DCAFA7992ADE3643",
    "terminal_q3_m1_forest_j3_pair_exclusion_cap_independent_20260829.json":
        "34724EA94874B104DC789277A1E7F97091FA2AA31D056F99242AD18F4B400CEA",
    "prove_terminal_q3_m1_forest_j3_h4_path_floor_independent_agent.py":
        "64C79C9D8E68A8FE51A0A3B91862DC317B3EA167F74DDD0B2E624297BE65A69F",
    "terminal_q3_m1_forest_j3_h4_path_floor_independent_20260829.json":
        "DF1D57C1D5F27CC2DFA174A72BB5392BEA6B0577AEC26B8F26B0AE56E88700E6",
    "prove_terminal_q3_m1_forest_j3_root_group_wedge_correlation_independent_agent.py":
        "E29E8723C55B1896C737450353B1EB914B20221D755002DA1C90AF9A6F1D7D55",
    "terminal_q3_m1_forest_j3_root_group_wedge_correlation_independent_20260829.json":
        "B43F79F29ECA9B499126731FE3940D14681D5C37A5598768A9C1B31FC858EF7F",
    "prove_marked_forest_correlated_wedge_lower_independent_agent.py":
        "84000ACBEA7ABD2BD02688F3C2A40B3EB1DACDF972C6A4108C040CCEF54D9375",
    "marked_forest_correlated_wedge_lower_independent_20260829.json":
        "6516D61C20CD7798EC9F67145521CCA568DF9A2E58643CC003E99BA272EB7E67",
    "MARKED_FOREST_CORRELATED_WEDGE_LOWER_INDEPENDENT_2026-08-29.md":
        "926F3CFB8040BC470773527CCB7E42279EAA122E2519E44B382948E5BEB124B0",
    "FOREST_MARKED_COMPONENT_CORRELATED_WEDGE_UPPER_ROOT_2026-08-29.md":
        "3AFD1FFFEAEDE346C079F7438187F3BAC0F2591CFCC5D9D1681334FAFE4E5922",
    "prove_terminal_q3_m1_forest_j3_outer_cones_independent_agent.py":
        "897F0104E58616217912710051FA62857F1012E531FC0DCCA7AF517408D0DC76",
    "terminal_q3_m1_forest_j3_outer_cones_independent_20260829.json":
        "A92F6C45F041ADC71AC5FA619BE3F604F1264208C9280DE68A245CEEE67B7587",
    "TERMINAL_Q3_M1_FOREST_J3_OUTER_CONES_INDEPENDENT_2026-08-29.md":
        "C5FB8DD0C99146C4B25EFD42F546446FB76903887DB6CE8043D5E90F58B24D84",
}

EXPECTED_STATUSES = {
    "terminal_q3_m1_forest_j3_y_slope_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_BOTH_Y_SLOPES_NONPOSITIVE",
    "terminal_q3_m1_forest_j3_artificial_cap_denominator_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_N31_PLUS_ARTIFICIAL_CAP_DENOMINATOR",
    "terminal_q3_m1_forest_j3_pair_exclusion_cap_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_PAIR_EXCLUSION_CAP",
    "terminal_q3_m1_forest_j3_h4_path_floor_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_H4_PATH_FLOOR",
    "terminal_q3_m1_forest_j3_root_group_wedge_correlation_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_ROOT_GROUP_WEDGE_CORRELATION",
    "marked_forest_correlated_wedge_lower_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_MARKED_FOREST_CORRELATED_WEDGE_LOWER",
    "terminal_q3_m1_forest_j3_outer_cones_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_N31_PLUS_OUTER_CONES",
}

# Filled after the first deterministic coefficient replay and then enforced on
# every subsequent run.  Direct stream hashes include labels, shapes, and every
# exact rational Bernstein coefficient in canonical order.
EXPECTED_STREAMS = {
    "all_order_sha256":
        "6A9E716D0C9839055B6CD2E6664328DC60929855E3C42FC60FC8F7CED14C5226",
    "finite_sha256":
        "3A1398DC1FA31C342E1E769C654741BF973EEC771A3B1D2F157A789B9815528F",
    "all_order_count": 288324,
    "finite_count": 36828,
    "finite_cells": 85,
}


CTX = fmpq_mpoly_ctx.get(["x", "t", "u", "r", "w"])
x, t, u, r, w = CTX.gens()


def q(n: int, d: int = 1):
    return fmpq(n, d)


def choose(value, rank: int):
    out = CTX.constant(1)
    for offset in range(rank):
        out *= value - offset
    return out / (1, 1, 2, 6, 24)[rank]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def check_dependencies() -> None:
    for name, expected in DEPENDENCY_HASHES.items():
        actual = sha256(HERE / name)
        if actual != expected:
            raise AssertionError(("dependency hash mismatch", name, expected, actual))
    for name, expected in EXPECTED_STATUSES.items():
        actual = json.loads((HERE / name).read_text(encoding="utf-8")).get("status")
        if actual != expected:
            raise AssertionError(("dependency status mismatch", name, expected, actual))


def build_row(s, D, r_lower=fmpq(0), r_upper=fmpq(1), *,
              branch: str, cap: str, h4_mode: str = "path",
              q_correction: bool = False):
    """Return a cleared exact polynomial lower for one retained branch.

    The order of G is N+1.  G has h+1 components and no isolated component.
    The marked root has degree d, H=G-N[w] has S vertices, and
    S=2h+R+L.  W is the total wedge count.  The affine boxes below cover
    every integer structural tuple, although they also include unrealizable
    continuous tuples.
    """

    S = 5 + s
    d = 1 + D
    N = S + d
    h = 1 + (S - 2) * u / 2
    root_fraction = r_lower + (r_upper - r_lower) * r
    R = (S - 2) * (1 - u) * root_fraction
    L = (S - 2) * (1 - u) * (1 - root_fraction)
    if S - (2 * h + R + L):
        raise AssertionError("vertex budget identity failed")

    W_lower = choose(d, 2) + R + L
    W_upper = choose(d, 2) + choose(R + 1, 2) + choose(L + 1, 2)
    W = W_lower + (W_upper - W_lower) * w
    m = N - h

    # Fixed-low and target-rank coordinates from the exact subset identities.
    p0 = choose(N + 1, 3) - m * (N - 1) + W + choose(N + 1, 2) - m
    p1 = choose(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = choose(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - choose(d, 2) - R)
    h2 = choose(S, 2) - (m - d - R)
    c0 = a + z2 + h2
    b = choose(N, 3) - (m - d) * (N - 2) + W - choose(d, 2) - R
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    gap = 2 * p1 * c0 - 3 * a * R1

    # Rank-four classes with at least one root neighbor.
    nonzero_f4 = (
        d * choose(S - 2, 3) - R * choose(S - 3, 2)
        + choose(d, 2) * choose(S - 1, 2) - (d - 1) * R * (S - 2)
        + choose(d, 3) * S - choose(d - 1, 2) * R + choose(d, 4)
    )
    if q_correction:
        q_floor = W - choose(d, 2) - R - choose(L + 1, 2)
        q_coefficient = (3 * S - R - 10) / 3 + d - 2
        nonzero_f4 += q_floor * q_coefficient + choose(R, 2)

    # Fixed-edge cap y<=U3/(U3+B).
    edges_H = N - h - d - R
    U3 = choose(S, 3) - edges_H * (S - 2) + choose(edges_H, 2)
    B = (
        d * choose(S - 1, 2) - R * (S - 2)
        + choose(d, 2) * S - (d - 1) * R + choose(d, 3)
    )
    fixed_den = U3 + B

    def scaled(y_value):
        # This is exactly 2*a*p1*b*(N-3) times the normalized m=1 row
        # lower.  ebar_num, Q0_num, Q1_num clear the sole factor 2a.
        ebar_num = 2 * a * (1 + y_value) + 3 * z2
        Q0_num = 8 * a * c0 - 3 * ebar_num * (p0 + a)
        Q1_num = (
            2 * a * (4 * (a + R1) - 3 * (p0 + a + p1))
            - 3 * ebar_num * p1
        )
        remainder_num = p0 * Q1_num + p1 * Q0_num + p1 * Q1_num
        n3 = N - 3
        common = (
            12 * a * p1 * b * n3 * p0 * R1
            + 4 * a * n3 * p0 * p0 * gap
            + 8 * a * p1 * n3 * A1 * p0
            + p1 * b * n3 * remainder_num
        )
        if branch == "coupled":
            u0_part = (
                2 * a * p1 * b * n3 * A1 * (n3 + 2 * y_value)
                + 24 * a * p1 * b * A1 * y_value
            )
        elif branch == "tangent":
            if h4_mode == "path":
                h4_floor = choose(S - 3, 4)
            elif h4_mode == "component":
                h4_floor = (h + R - 3) * b * y_value / 4
            else:
                raise ValueError(h4_mode)
            C_value = h2 + nonzero_f4 + h4_floor
            u0_part = (
                8 * a * p1 * b * n3 * A1 * (1 + y_value)
                + 8 * a * p1 * n3 * A1 * C_value
            )
        else:
            raise ValueError(branch)
        return common + u0_part

    at_zero = scaled(0)
    at_one = scaled(1)
    if cap == "fixed_edge":
        cap_num, cap_den = U3, fixed_den
    elif cap == "pair":
        cap_num = S - 2
        cap_den = S - 2 + 3 * (d - 2)
    else:
        raise ValueError(cap)
    return at_zero * cap_den + (at_one - at_zero) * cap_num


def bernstein_net(poly):
    """Compactify x>=0, then Bernstein-convert t,u,r,w on [0,1]."""

    degrees = tuple(poly.degrees())
    shape = tuple(degree + 1 for degree in degrees)
    strides = tuple(prod(shape[index + 1:]) for index in range(5))
    values = [fmpq(0)] * prod(shape)
    for powers, coefficient in poly.to_dict().items():
        index = sum(power * stride for power, stride in zip(powers, strides))
        values[index] = coefficient / comb(degrees[0], powers[0])
    for axis in range(1, 5):
        degree = degrees[axis]
        stride = strides[axis]
        converted = [fmpq(0)] * len(values)
        weights = [
            [fmpq(comb(index, power), comb(degree, power))
             for power in range(index + 1)]
            for index in range(degree + 1)
        ]
        for outer in range(prod(shape[:axis])):
            base = outer * shape[axis] * stride
            for inner in range(stride):
                line = [values[base + power * stride + inner]
                        for power in range(degree + 1)]
                for index in range(degree + 1):
                    converted[base + index * stride + inner] = sum(
                        (weights[index][power] * line[power]
                         for power in range(index + 1)),
                        fmpq(0),
                    )
        values = converted
    return shape, values


def update_stream(digest, label, shape, values) -> None:
    digest.update((label + "\n").encode("ascii"))
    digest.update((",".join(map(str, shape)) + "\n").encode("ascii"))
    for value in values:
        digest.update((str(value) + "\n").encode("ascii"))


def certify(label, poly, digest):
    shape, values = bernstein_net(poly)
    negative = sum(value < 0 for value in values)
    minimum = min(values)
    if negative or minimum <= 0:
        raise AssertionError((label, shape, negative, str(minimum)))
    update_stream(digest, label, shape, values)
    local = hashlib.sha256()
    update_stream(local, label, shape, values)
    return {
        "label": label,
        "shape": [int(entry) for entry in shape],
        "count": len(values),
        "negative": negative,
        "zero": sum(value == 0 for value in values),
        "minimum": str(minimum),
        "stream_sha256": local.hexdigest().upper(),
    }


def ratio(lo_num, lo_den, hi_num, hi_den):
    return q(lo_num, lo_den) + (q(hi_num, hi_den) - q(lo_num, lo_den)) * t


def main() -> None:
    check_dependencies()
    all_order_digest = hashlib.sha256()
    finite_digest = hashlib.sha256()
    all_order = []
    finite = []

    # s>=10, 5/3<=D/s<=2: coupled exact-U1 lower at the fixed-edge cap.
    s_poly = 10 + x
    D_poly = s_poly * ratio(5, 3, 2, 1)
    all_order.append(certify(
        "s10plus_ratio_5_3_to_2_coupled_fixed_edge",
        build_row(s_poly, D_poly, branch="coupled", cap="fixed_edge"),
        all_order_digest,
    ))

    # s>=10, 2<=D/s<=17/4: the tangent row is covered by two exact
    # root-neighbor allocation halves.
    D_poly = s_poly * ratio(2, 1, 17, 4)
    all_order.append(certify(
        "s10plus_ratio_2_to_17_4_r_0_to_1_2_tangent_path",
        build_row(s_poly, D_poly, fmpq(0), fmpq(1, 2),
                  branch="tangent", cap="pair", h4_mode="path"),
        all_order_digest,
    ))
    all_order.append(certify(
        "s10plus_ratio_2_to_17_4_r_1_2_to_1_tangent_component_q",
        build_row(s_poly, D_poly, fmpq(1, 2), fmpq(1),
                  branch="tangent", cap="pair", h4_mode="component",
                  q_correction=True),
        all_order_digest,
    ))

    # s>=10, 17/4<=D/s<=5: the path floor plus correlated Q reserve works
    # on the full root-neighbor allocation interval.
    D_poly = s_poly * ratio(17, 4, 5, 1)
    all_order.append(certify(
        "s10plus_ratio_17_4_to_5_tangent_path_q",
        build_row(s_poly, D_poly, branch="tangent", cap="pair",
                  h4_mode="path", q_correction=True),
        all_order_digest,
    ))

    # Exact integer boundary s=5,...,9.  The tail constraint is D>=25-s;
    # only middle-band cells D<5s remain after the outer-cone theorem.
    finite_cell_count = 0
    for s_value in range(5, 10):
        for D_value in range(25 - s_value, 5 * s_value):
            finite_cell_count += 1
            prefix = f"s{s_value}_D{D_value}"
            if D_value < 2 * s_value:
                finite.append(certify(
                    prefix + "_coupled_fixed_edge",
                    build_row(CTX.constant(s_value), CTX.constant(D_value),
                              branch="coupled", cap="fixed_edge"),
                    finite_digest,
                ))
            elif 4 * D_value <= 17 * s_value:
                finite.append(certify(
                    prefix + "_r_0_to_1_2_tangent_path",
                    build_row(CTX.constant(s_value), CTX.constant(D_value),
                              fmpq(0), fmpq(1, 2), branch="tangent",
                              cap="pair", h4_mode="path"),
                    finite_digest,
                ))
                finite.append(certify(
                    prefix + "_r_1_2_to_1_tangent_component_q",
                    build_row(CTX.constant(s_value), CTX.constant(D_value),
                              fmpq(1, 2), fmpq(1), branch="tangent",
                              cap="pair", h4_mode="component",
                              q_correction=True),
                    finite_digest,
                ))
            else:
                finite.append(certify(
                    prefix + "_tangent_path_q",
                    build_row(CTX.constant(s_value), CTX.constant(D_value),
                              branch="tangent", cap="pair", h4_mode="path",
                              q_correction=True),
                    finite_digest,
                ))

    if finite_cell_count != 85:
        raise AssertionError(("finite cell count", finite_cell_count))
    all_order_count = sum(item["count"] for item in all_order)
    finite_count = sum(item["count"] for item in finite)
    actual_streams = {
        "all_order_sha256": all_order_digest.hexdigest().upper(),
        "finite_sha256": finite_digest.hexdigest().upper(),
        "all_order_count": all_order_count,
        "finite_count": finite_count,
        "finite_cells": finite_cell_count,
    }
    if EXPECTED_STREAMS["all_order_sha256"] != "TO_BE_FROZEN":
        if actual_streams != EXPECTED_STREAMS:
            raise AssertionError(("coefficient stream mismatch",
                                  EXPECTED_STREAMS, actual_streams))

    report = {
        "status": "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_S5_N31_PLUS_TAIL",
        "scope": (
            "Assembles the frozen outer cones with a fresh exact middle-band "
            "certificate to prove only the no-isolate disconnected-forest "
            "terminal m=1,j=3 row for S>=5,N>=31. Excludes S=2,3,4, "
            "N=13..30, m=0, and "
            "full Erdos Problem 993."
        ),
        "global_gate_statement": (
            "Closes the remaining disconnected-forest m=1,j=3 "
            "S>=5,N>=31 tail gate. "
            "The S=2,3,4 strips and finite N=13..30 boundary remain before "
            "all-order forest m=1,j=3 is closed."
        ),
        "coordinates": {
            "s": "S-5",
            "D": "d-1",
            "N": "6+s+D",
            "tail": "s,D integers >=0 and s+D>=25",
            "middle": "5s/3<=D<=5s",
            "structural_budget": "S=2h+R+L",
            "W_interval": (
                "C(d,2)+R+L <= W <= "
                "C(d,2)+C(R+1,2)+C(L+1,2)"
            ),
        },
        "clearing_factor": "2*a*p1*b*(N-3), positive on supported rows",
        "all_order_certificates": all_order,
        "finite_certificates": finite,
        "streams": actual_streams,
        "dependencies": DEPENDENCY_HASHES,
        "source_sha256": sha256(Path(__file__)),
    }
    temp = REPORT.with_suffix(REPORT.suffix + ".tmp")
    temp.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, REPORT)
    print(json.dumps({
        "status": report["status"],
        "streams": actual_streams,
        "all_order": all_order,
        "finite_rows": len(finite),
        "finite_minimum": str(min(fmpq(item["minimum"]) for item in finite)),
        "report": REPORT.name,
        "source_sha256": report["source_sha256"],
    }, indent=2))


if __name__ == "__main__":
    main()
