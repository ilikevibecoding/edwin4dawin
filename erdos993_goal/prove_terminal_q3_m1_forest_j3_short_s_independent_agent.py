#!/usr/bin/env python3
"""Fail-closed exact certificate for forest m=1,j=3, S=2,3,4, N>=31."""

from __future__ import annotations

import hashlib
import json
import os
from itertools import combinations
from math import comb, prod
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx


HERE = Path(__file__).resolve().parent
REPORT = HERE / "terminal_q3_m1_forest_j3_short_s_independent_20260829.json"

DEPENDENCY_HASHES = {
    "prove_terminal_q3_m1_forest_j3_y_slope_independent_agent.py":
        "DBB3FFAB587A581F7B87B5B4FD41709F7165EE919D38B66CDC7BED15B2162EB2",
    "terminal_q3_m1_forest_j3_y_slope_independent_20260829.json":
        "DA388A15F27F77AAE4306925EBA770AE6AF052365B468D85686CD02CB5D9FDD5",
    "prove_marked_forest_correlated_wedge_lower_independent_agent.py":
        "84000ACBEA7ABD2BD02688F3C2A40B3EB1DACDF972C6A4108C040CCEF54D9375",
    "marked_forest_correlated_wedge_lower_independent_20260829.json":
        "6516D61C20CD7798EC9F67145521CCA568DF9A2E58643CC003E99BA272EB7E67",
    "MARKED_FOREST_CORRELATED_WEDGE_LOWER_INDEPENDENT_2026-08-29.md":
        "926F3CFB8040BC470773527CCB7E42279EAA122E2519E44B382948E5BEB124B0",
    "FOREST_MARKED_COMPONENT_CORRELATED_WEDGE_UPPER_ROOT_2026-08-29.md":
        "3AFD1FFFEAEDE346C079F7438187F3BAC0F2591CFCC5D9D1681334FAFE4E5922",
}

EXPECTED_STATUSES = {
    "terminal_q3_m1_forest_j3_y_slope_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_BOTH_Y_SLOPES_NONPOSITIVE",
    "marked_forest_correlated_wedge_lower_independent_20260829.json":
        "PASS_INDEPENDENT_EXACT_MARKED_FOREST_CORRELATED_WEDGE_LOWER",
}

EXPECTED = {
    "coefficient_stream_sha256":
        "4D19F2E3F73E188D88032D56F29E0C233D672ED2EBC0CD7B35350C04F37F95EA",
    "literal_H_stream_sha256":
        "08CB2DC0E58718DFC9187813FA4253C7051E94C2223449E43E3E84F84E47D56E",
    "coefficient_count": 255,
    "structural_case_count": 7,
}


CTX = fmpq_mpoly_ctx.get(["E", "t", "u", "r", "w"])
E, t, u, r, w = CTX.gens()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank: int):
    out = CTX.constant(1)
    for offset in range(rank):
        out *= value - offset
    return out / (1, 1, 2, 6, 24)[rank]


def check_dependencies() -> None:
    for name, expected in DEPENDENCY_HASHES.items():
        actual = sha256(HERE / name)
        if actual != expected:
            raise AssertionError(("dependency hash mismatch", name, expected, actual))
    for name, expected in EXPECTED_STATUSES.items():
        actual = json.loads((HERE / name).read_text(encoding="utf-8")).get("status")
        if actual != expected:
            raise AssertionError(("dependency status mismatch", name, expected, actual))


def short_H_data(order: int, components: int, digest) -> dict:
    """Enumerate every labeled forest H and return exact h3/h4 maxima."""

    edges = list(combinations(range(order), 2))
    forest_count = 0
    h3_maximum = -1
    h4_maximum = -1
    h3_witnesses = 0
    for mask in range(1 << len(edges)):
        chosen = [edges[index] for index in range(len(edges)) if mask >> index & 1]
        if len(chosen) != order - components:
            continue
        parent = list(range(order))

        def find(vertex):
            while parent[vertex] != vertex:
                parent[vertex] = parent[parent[vertex]]
                vertex = parent[vertex]
            return vertex

        acyclic = True
        for left, right in chosen:
            a, b = find(left), find(right)
            if a == b:
                acyclic = False
                break
            parent[a] = b
        if not acyclic or len({find(vertex) for vertex in range(order)}) != components:
            continue
        adjacency = [set() for _ in range(order)]
        for left, right in chosen:
            adjacency[left].add(right)
            adjacency[right].add(left)

        def independent_count(rank):
            total = 0
            for subset in combinations(range(order), rank):
                if all(right not in adjacency[left]
                       for left, right in combinations(subset, 2)):
                    total += 1
            return total

        h3 = independent_count(3)
        h4 = independent_count(4)
        digest.update(f"{order},{components},{mask},{h3},{h4}\n".encode("ascii"))
        forest_count += 1
        if h3 > h3_maximum:
            h3_maximum = h3
            h3_witnesses = 1
        elif h3 == h3_maximum:
            h3_witnesses += 1
        h4_maximum = max(h4_maximum, h4)
    if forest_count == 0:
        raise AssertionError(("no H forests", order, components))
    return {
        "S": order,
        "components_H": components,
        "labeled_forests": forest_count,
        "h3_maximum": h3_maximum,
        "h3_maximum_witnesses": h3_witnesses,
        "h4_maximum": h4_maximum,
    }


def build(S_value: int, h_value: int, R_value: int, L_value: int,
          h3_bound: int):
    S = CTX.constant(S_value)
    h = CTX.constant(h_value)
    R = CTX.constant(R_value)
    L = CTX.constant(L_value)
    N = 31 + E
    d = N - S
    if S - (2 * h + R + L):
        raise AssertionError("structural budget identity failed")

    W_lower = choose(d, 2) + R + L
    W_upper = choose(d, 2) + choose(R + 1, 2) + choose(L + 1, 2)
    width = W_upper - W_lower
    width_expected = comb(R_value, 2) + comb(L_value, 2)
    if width != CTX.constant(width_expected) or width_expected < 0:
        raise AssertionError(("negative integral W width", S_value, h_value,
                              R_value, L_value, width))
    W = W_lower + width * w
    m = N - h

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

    # Exact all-order lower for the independent four-sets using at least one
    # root neighbor.  The zero-root-neighbor class is exactly h4(H)=0 here.
    nonzero_f4 = (
        d * choose(S - 2, 3) - R * choose(S - 3, 2)
        + choose(d, 2) * choose(S - 1, 2) - (d - 1) * R * (S - 2)
        + choose(d, 3) * S - choose(d - 1, 2) * R + choose(d, 4)
    )

    def tangent_scaled(y_value):
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
        C_value = h2 + nonzero_f4
        extra = (
            8 * a * p1 * b * n3 * A1 * (1 + y_value)
            + 8 * a * p1 * n3 * A1 * C_value
        )
        return common + extra

    at_zero = tangent_scaled(0)
    at_one = tangent_scaled(1)
    # The frozen slope theorem permits y=h3/b <= h3_bound/b.  Multiplying
    # by positive b clears that cap exactly.
    cleared = at_zero * b + (at_one - at_zero) * h3_bound
    return cleared, {"a": a, "p1": p1, "b": b, "N_minus_3": N - 3}


def bernstein_net(poly):
    degrees = tuple(poly.degrees())
    shape = tuple(int(degree + 1) for degree in degrees)
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


def main() -> None:
    check_dependencies()
    expected_cases = [
        (2, 1, 0, 0),
        (3, 1, 0, 1), (3, 1, 1, 0),
        (4, 1, 0, 2), (4, 1, 1, 1), (4, 1, 2, 0),
        (4, 2, 0, 0),
    ]
    cases = []
    for S in (2, 3, 4):
        for h in range(1, S // 2 + 1):
            for R in range(S - 2 * h + 1):
                cases.append((S, h, R, S - 2 * h - R))
    if cases != expected_cases:
        raise AssertionError(("short structural cases", cases, expected_cases))

    literal_digest = hashlib.sha256()
    H_cache = {}
    for S, h, R, _L in cases:
        key = (S, h + R)
        if key not in H_cache:
            H_cache[key] = short_H_data(S, h + R, literal_digest)
    if any(item["h4_maximum"] != 0 for item in H_cache.values()):
        raise AssertionError(("h4 is not zero", H_cache))

    coefficient_digest = hashlib.sha256()
    certificates = []
    sign_checks = []
    for S, h, R, L in cases:
        H_data = H_cache[(S, h + R)]
        h3_bound = H_data["h3_maximum"]
        row, signs = build(S, h, R, L, h3_bound)
        label = f"S{S}_h{h}_R{R}_L{L}_tangent_h3max{h3_bound}"
        shape, values = bernstein_net(row)
        negative = sum(value < 0 for value in values)
        minimum = min(values)
        if negative or minimum <= 0:
            raise AssertionError((label, shape, negative, str(minimum)))
        update_stream(coefficient_digest, label, shape, values)
        local = hashlib.sha256()
        update_stream(local, label, shape, values)
        certificates.append({
            "label": label,
            "shape": list(shape),
            "count": len(values),
            "negative": negative,
            "zero": sum(value == 0 for value in values),
            "minimum": str(minimum),
            "stream_sha256": local.hexdigest().upper(),
        })
        sign_item = {"case": label}
        for sign_name, sign_poly in signs.items():
            sign_shape, sign_values = bernstein_net(sign_poly)
            sign_minimum = min(sign_values)
            if sign_minimum <= 0:
                raise AssertionError(("clearing sign", label, sign_name,
                                      sign_shape, str(sign_minimum)))
            sign_item[sign_name + "_minimum"] = str(sign_minimum)
        sign_checks.append(sign_item)

    actual = {
        "coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "literal_H_stream_sha256": literal_digest.hexdigest().upper(),
        "coefficient_count": sum(item["count"] for item in certificates),
        "structural_case_count": len(cases),
    }
    if EXPECTED["coefficient_stream_sha256"] != "TO_BE_FROZEN":
        if actual != EXPECTED:
            raise AssertionError(("frozen stream mismatch", EXPECTED, actual))

    report = {
        "status": "PASS_INDEPENDENT_EXACT_FOREST_M1_J3_SHORT_S_N31_PLUS",
        "scope": (
            "Proves only the no-isolate disconnected-forest terminal m=1,j=3 "
            "row for S=2,3,4 and N>=31. Excludes finite N=13..30, m=0, "
            "and full Erdos Problem 993."
        ),
        "global_gate_statement": (
            "Together with the frozen S>=5 tail, this leaves only the finite "
            "N=13..30 boundary before the no-isolate disconnected-forest "
            "m=1,j=3 theorem is all-order."
        ),
        "structural_cases": [
            {
                "S": S, "h": h, "R": R, "L": L,
                "components_H": h + R,
                "H_enumeration": H_cache[(S, h + R)],
            }
            for S, h, R, L in cases
        ],
        "certificates": certificates,
        "clearing_factor_sign_checks": sign_checks,
        "streams": actual,
        "dependencies": DEPENDENCY_HASHES,
        "source_sha256": sha256(Path(__file__)),
    }
    temp = REPORT.with_suffix(REPORT.suffix + ".tmp")
    temp.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, REPORT)
    print(json.dumps({
        "status": report["status"],
        "streams": actual,
        "certificates": certificates,
        "report": REPORT.name,
        "source_sha256": report["source_sha256"],
    }, indent=2))


if __name__ == "__main__":
    main()
