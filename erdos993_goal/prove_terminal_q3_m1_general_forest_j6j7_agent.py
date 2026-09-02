#!/usr/bin/env python3
"""Exact conditional all-order forest m=1 theorem for targets j=6,7.

The large-order cone reuses the fixed-low-block expressions and repaired
affine-R component endpoint reduction from the frozen j>=8 producer.  The
orders below the cone threshold are supplied by the pinned direct-canonical
finite forest theorem and independently sampled here through order 11.
"""

from __future__ import annotations

from fractions import Fraction
from functools import lru_cache
import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

import audit_terminal_q3_low_newton_adversarial_agent as canonical
import audit_terminal_q3_low_newton_m2_forest_canonical_import_agent as rows
import prove_terminal_q3_m1_general_forest_j8plus_agent as base
from derive_terminal_q3_m1_general_forest_agent import C


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_general_forest_j6j7_exact_agent_20260829.json"

PINNED = {
    "prove_terminal_q3_m1_general_forest_j8plus_agent.py":
        "3854DA3117F6BB8653E1D98495866121D2C2DA92A077EA741C5FFBDF981D1BCE",
    "terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json":
        "60F970B393314511563BFA6D18CDFD27554659EB7EEAC0EFDE009ACE81FEB667",
    "derive_terminal_q3_m1_general_forest_agent.py":
        "348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "audit_terminal_q3_low_newton_m2_forest_canonical_import_agent.py":
        "462C76A2B3F39DBECD2E28EF4A434C6F461A65B19B53F7BB6032ACF51A9238E3",
    "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json":
        "63E52E6956A2B1B84C79B5E5893097151A1ADFC357683345B13965AE4732F29A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def verify_pins():
    for filename, expected in PINNED.items():
        actual = sha256(HERE / filename)
        assert actual == expected, (filename, actual, expected)
    base.verify_pins()
    finite = json.loads(
        (HERE / "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["status"] == "PASS_DIRECT_CANONICAL_ALL_FOREST_M1_FINITE_ORDER13"


def pinned_finite_dependency():
    finite = json.loads(
        (HERE / "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json")
        .read_text(encoding="utf-8")
    )
    census = finite["finite_census"]
    assert census["maximum_G_order"] == 13
    assert census["supported_cells_all_j"] == 272761
    assert census["positive_m1_cells"] == 272761
    assert census["zero_m1_cells"] == 0
    assert census["supported_cells_by_target"]["6"] == 46829
    assert census["supported_cells_by_target"]["7"] == 41806
    return {
        "status": finite["status"],
        "maximum_G_order": census["maximum_G_order"],
        "supported_j6_cells": census["supported_cells_by_target"]["6"],
        "supported_j7_cells": census["supported_cells_by_target"]["7"],
        "minimum_all_target_m1": census["minimum_m1"],
        "ordered_cell_stream_sha256": census["ordered_cell_stream_sha256"],
    }


def cone_certificate():
    (_num, _den, _mnum, _mden, variables, tests,
     endpoint_denominators) = base.certificate_expressions()
    j, r, h, d, _R, _W, _y = variables
    S, u, v = sp.symbols("S u v", nonnegative=True)
    records = {}
    stream = hashlib.sha256()
    total_bernstein = total_power = zeros = 0
    minimum_positive = None
    for jvalue in (6, 7):
        substitution = {
            j: jvalue,
            r: 13 - jvalue + S,
            h: 1 + (10 + S) * u / 2,
            d: 1 + (10 + S) * (1 - u) * v,
        }
        for name, expression in tests.items():
            transformed = sp.expand(expression.subs(substitution, simultaneous=True))
            degrees, coefficients = base.tensor_bernstein(transformed, (u, v))
            powers_all = []
            for index, coefficient in enumerate(coefficients):
                powers = sp.Poly(coefficient, S).all_coeffs()
                assert powers and all(value >= 0 for value in powers), (
                    jvalue, name, index, coefficient
                )
                powers_all.extend(powers)
                stream.update(f"j{jvalue}|{name}|{index}|{coefficient}\n".encode())
            positives = [value for value in powers_all if value > 0]
            assert positives
            local_min = min(positives)
            minimum_positive = (
                local_min if minimum_positive is None
                else min(minimum_positive, local_min)
            )
            key = f"j{jvalue}_{name}"
            records[key] = {
                "degrees_u_v": list(degrees),
                "bernstein_coefficients": len(coefficients),
                "power_coefficients_in_S": len(powers_all),
                "zero_power_coefficients": sum(value == 0 for value in powers_all),
                "minimum_positive_power_coefficient": str(local_min),
            }
            total_bernstein += len(coefficients)
            total_power += len(powers_all)
            zeros += sum(value == 0 for value in powers_all)
            print(key, "PASS", len(coefficients), flush=True)
    return {
        "parameterization": (
            "For j in {6,7}: N=13+S, r=13-j+S, "
            "h=1+(10+S)u/2, d=1+(10+S)(1-u)v"
        ),
        "mapping_checks": {
            "large_order": "N>=13, equivalently |G|>=14",
            "B": "N-2h-1=(10+S)(1-u)>=0",
            "root_slack": "N-2h-d=(10+S)(1-u)(1-v)>=0",
            "lambda": "(d-1)/B=v on B>0",
            "finite_complement": "N<=12, equivalently |G|<=13, pinned finite theorem",
        },
        "endpoint_denominators": endpoint_denominators,
        "tests": records,
        "total_bernstein_coefficients": total_bernstein,
        "total_power_coefficients_in_S": total_power,
        "zero_power_coefficients": zeros,
        "minimum_positive_power_coefficient": str(minimum_positive),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
    }


def direct_canonical_crosscheck(max_order: int = 11):
    numerator, denominator, mnum, mden, variables, _tests, _dens = (
        base.certificate_expressions()
    )
    num_eval = base.compile_exact_polynomial(numerator, variables)
    den_eval = base.compile_exact_polynomial(denominator, variables)
    mnum_eval = base.compile_exact_polynomial(mnum, variables)
    mden_eval = base.compile_exact_polynomial(mden, variables)
    types = []
    for order in range(2, max_order + 1):
        for graph in nx.nonisomorphic_trees(order):
            graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
            datum = rows.type_data(graph)
            datum["graph"] = graph
            datum["wedges"] = sum(
                degree * (degree - 1) // 2 for _, degree in graph.degree()
            )
            types.append(datum)

    @lru_cache(maxsize=None)
    def forest_pair(components):
        pair = ((1,), (0,))
        for index in components:
            pair = rows.union_pair(pair, types[index]["pair"])
        return pair

    forests = roots = supported = canonical_equalities = lower_checks = 0
    minimum_actual = None
    minimum_cell = ""
    stream = hashlib.sha256()
    for order in range(8, max_order + 1):
        for components in rows.component_multisets(types, order):
            if len(components) < 2:
                continue
            forests += 1
            g_pair = forest_pair(components)
            W = sum(int(types[index]["wedges"]) for index in components)
            seen = set()
            for position, type_index in enumerate(components):
                if type_index in seen:
                    continue
                seen.add(type_index)
                rest = components[:position] + components[position + 1:]
                rest_pair = forest_pair(rest)
                root_type = types[type_index]
                graph = root_type["graph"]
                for root in root_type["roots"]:
                    roots += 1
                    wroot = int(root["marked"])
                    d = graph.degree(wroot)
                    R = sum(graph.degree(u) - 1 for u in graph.neighbors(wroot))
                    f_pair = rows.union_pair(root["F"], rest_pair)
                    h_pair = rows.union_pair(root["H"], rest_pair)
                    fi, fc = f_pair
                    hi, _hc = h_pair
                    adapter = rows.Adapter(f_pair, h_pair)
                    terminal = {item[0]: item for item in canonical.terminal_rows(
                        nx.Graph(), 0, list(g_pair[0]),
                        rows.one_edge_actual(g_pair[1]), adapter,
                    )}
                    for target in (6, 7):
                        b = rows.coeff(fi, target)
                        if not b:
                            continue
                        assert target in terminal
                        actual = terminal[target][1][1]
                        assert actual > 0
                        gi = g_pair[0]
                        gs = rows.one_edge_actual(g_pair[1])
                        fs = rows.one_edge_actual(fc)
                        N = order - 1
                        h = len(components) - 1
                        r = N - target
                        m = N - h
                        assert r >= 1 and d >= 1 and h >= 1
                        assert 0 <= R <= N - 2 * h - d
                        assert W >= d * (d - 1) // 2 + R
                        assert W >= N - 2 * h - 1
                        assert W <= (N - 2 * h) * (N - 2 * h - 1) // 2

                        p0 = rows.coeff(gi, 3) + rows.coeff(gi, 2)
                        p1 = rows.coeff(gi, 2) + rows.coeff(gi, 1)
                        r0 = rows.coeff(gs, 4) + rows.coeff(gs, 3)
                        r1 = rows.coeff(gs, 3) + rows.coeff(gs, 2)
                        u0 = rows.coeff(gi, target + 1) + rows.coeff(gi, target)
                        u1 = rows.coeff(gi, target) + rows.coeff(gi, target - 1)
                        a = rows.coeff(fi, 2)
                        z2 = rows.coeff(fs, 3)
                        h2 = rows.coeff(hi, 2)
                        hj = rows.coeff(hi, target)
                        zj = rows.coeff(fs, target + 1)
                        c0 = a + z2 + h2
                        e0 = b + zj + hj
                        assert p0 == int(C(N + 1, 3) - m * (N - 1) + W
                                         + C(N + 1, 2) - m)
                        assert p1 == int(C(N + 1, 2) - m + N + 1)
                        assert r1 == m * N - 2 * W
                        assert a == int(C(N, 2) - (m - d))
                        assert z2 == int((m - d) * (N - 2)
                                         - 2 * (W - C(d, 2) - R))
                        assert h2 == int(C(N - d, 2) - (m - d - R))

                        A0 = p0 * c0 - a * r0
                        A1 = p0 * a + p1 * c0 + p1 * a - a * r1
                        Q0 = (target + 1) * b * (c0 + r0) - 3 * (p0 + a) * e0
                        Q1 = ((target + 1) * b * (a + r1) - 3 * p1 * e0
                              - 3 * b * (p0 + a + p1))
                        local = ((target + 1) * a * (A0 * u1 + A1 * u0 + A1 * u1)
                                 + a * (p0 * Q1 + p1 * Q0 + p1 * Q1))
                        assert local == actual
                        canonical_equalities += 1

                        yvalue = Fraction(hj, b)
                        values = (target, r, h, d, R, W, yvalue)
                        nv = num_eval(values)
                        dv = den_eval(values)
                        mn = mnum_eval(values)
                        md = mden_eval(values)
                        assert dv > 0 and md > 0 and mn >= 0
                        assert Fraction(actual, a * b) >= nv / dv
                        lower_checks += 1
                        supported += 1
                        cell = (f"order={order},components={components},"
                                f"type={root_type['graph6']},w={wroot},j={target}")
                        stream.update(f"{cell}|{actual}|{nv}|{dv}\n".encode())
                        if minimum_actual is None or actual < minimum_actual:
                            minimum_actual = actual
                            minimum_cell = cell
    assert supported > 0
    return {
        "maximum_G_order": max_order,
        "no_isolate_disconnected_forests": forests,
        "rooted_cells": roots,
        "supported_j6j7_cells": supported,
        "canonical_delta1_equalities": canonical_equalities,
        "symbolic_lower_bound_checks": lower_checks,
        "minimum_actual_delta1": str(minimum_actual),
        "minimum_actual_cell": minimum_cell,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    verify_pins()
    generic = base.generic_identities()
    print("generic identities PASS", flush=True)
    cone = cone_certificate()
    print("all-order j=6,7 cone PASS", flush=True)
    finite = pinned_finite_dependency()
    print("pinned direct-canonical finite theorem PASS", flush=True)
    report = {
        "schema": "terminal-q3-m1-general-forest-j6j7-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J6J7_CONDITIONAL_Q_ENVELOPE",
        "claim": (
            "For every disconnected forest G without isolated components, "
            "every marked w, and target j in {6,7} with support, terminal-q3 "
            "Newton coefficient d1 is nonnegative, assuming the smaller-forest "
            "input q_j(G-w)<=q_2(G-w)."
        ),
        "fixed_low_block": "a=i2(F), z2=s3(F), h2=i2(H)",
        "exact_reserves": (
            "The forest-anchor Gap term is retained exactly. The FQ32 margin M "
            "is discarded only after a*(U1/b)-p1>=0 is certified."
        ),
        "pinned_sha256": PINNED,
        "generic_and_domain": generic,
        "large_order_cone": cone,
        "finite_order_dependency": finite,
        "scope": (
            "This closes only no-isolate disconnected-forest m1 for j=6,7, "
            "conditional on the strong-induction q envelope. Targets j=3,4,5, "
            "forest m0, the complete q envelope, unimodality, and Erdos Problem "
            "993 remain open."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
