#!/usr/bin/env python3
"""Prove bundle coefficient g1 for the deepest ordinary singleton-parent case.

Let G be a forest, let u,v,p be distinct vertices, and let p be the unique
non-bundle parent of a canonical deepest support.  The first binomial bundle
coefficient g1 is the ordinary rank-four FML gap.  This proof combines:

* an exact configuration reduction through independent five-sets;
* a universal incidence payment for all connected 3/4-edge motifs;
* an exact parent-deletion reduction of the remaining expression;
* a degree-excess upper bound for the wedge count;
* an exact tensor Bernstein certificate for every n>=12; and
* a complete unlabeled-forest census for 3<=n<=11.

The result is a theorem only for this precisely stated deepest ordinary case.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIGURATION = HERE / "iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json"
HIGH_MOTIF = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
ROOT_RESIDUAL = HERE / "iso_n4_bundle_g1_parent_residual_root_20260829.json"
AGENT_RESIDUAL = HERE / "iso_n4_bundle_g1_parent_residual_exact_agent_20260829.json"
DEGREE_CONE = HERE / "iso_n4_bundle_g1_degree_excess_cone_independent_audit_agent_20260829.json"
FINITE_CENSUS = HERE / "iso_n4_bundle_g1_parent_residual_forest_census_agent_20260829.json"
CONFIGURATION_PROBE = HERE / "iso_n4_bundle_g1_configuration_moments_probe_agent_20260829.json"
DIRECT_FINITE = HERE / "iso_n4_bundle_g1_degree_excess_finite_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_deepest_ordinary_exact_root_20260829.json"


def tensor_bernstein(poly: sp.Expr, variables: tuple[sp.Symbol, ...]):
    expanded = sp.Poly(sp.expand(poly), *variables)
    degrees = tuple(expanded.degree(variable) for variable in variables)
    power = dict(expanded.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(degree, j)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def rational_pair(value: sp.Expr) -> tuple[int, int]:
    value = sp.Rational(value)
    return int(value.p), int(value.q)


def coefficient_record(value: sp.Expr, q: sp.Symbol) -> list[list[int]]:
    polynomial = sp.Poly(sp.expand(value), q)
    return [
        list(rational_pair(polynomial.nth(power)))
        for power in range(polynomial.degree() + 1)
    ] if polynomial else [[0, 1]]


def renamed_agent_residual(agent_form: sp.Expr, root_symbols: dict[str, sp.Symbol]) -> sp.Expr:
    agent_names = {str(symbol): symbol for symbol in agent_form.free_symbols}
    rename = {
        agent_names["parent_adjacent_u"]: root_symbols["adjacent_pu"],
        agent_names["parent_adjacent_v"]: root_symbols["adjacent_pv"],
        agent_names["parent_common_neighbor_u"]: root_symbols["common_neighbor_pu"],
        agent_names["parent_common_neighbor_v"]: root_symbols["common_neighbor_pv"],
        agent_names["parent_degree"]: root_symbols["degree_p"],
        agent_names["parent_neighbor_excess"]: root_symbols["neighbor_excess_p"],
    }
    return sp.expand(agent_form.xreplace(rename))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    configuration = json.loads(CONFIGURATION.read_text(encoding="utf-8"))
    high_motif = json.loads(HIGH_MOTIF.read_text(encoding="utf-8"))
    root_residual_report = json.loads(ROOT_RESIDUAL.read_text(encoding="utf-8"))
    agent_residual_report = json.loads(AGENT_RESIDUAL.read_text(encoding="utf-8"))
    degree_cone = json.loads(DEGREE_CONE.read_text(encoding="utf-8"))
    finite = json.loads(FINITE_CENSUS.read_text(encoding="utf-8"))
    configuration_probe = json.loads(CONFIGURATION_PROBE.read_text(encoding="utf-8"))
    direct_finite = json.loads(DIRECT_FINITE.read_text(encoding="utf-8"))

    assert configuration["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_CONFIGURATION_REDUCTION_AGENT"
    assert high_motif["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert root_residual_report["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL"
    assert agent_residual_report["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL_REDUCTION_AGENT"
    assert degree_cone["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_DEGREE_EXCESS_CONE_AUDIT_AGENT"
    assert finite["marker"] == "PASS_EXACT_FINITE_CENSUS_ISO_N4_BUNDLE_G1_PARENT_RESIDUAL_FORESTS_N3_TO_N11_AGENT"
    assert configuration_probe["marker"] == "PASS_EXACT_FINITE_ISO_N4_BUNDLE_G1_CONFIGURATION_AND_I5_PROBE_AGENT"
    assert direct_finite["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_DEGREE_EXCESS_AND_ORDERS8_11_AGENT"

    residual = sp.sympify(root_residual_report["rooted_residual"])
    names = {str(symbol): symbol for symbol in residual.free_symbols}
    agent_residual = renamed_agent_residual(
        sp.sympify(agent_residual_report["parent_rooted_form"]), names
    )
    assert sp.expand(residual - agent_residual) == 0

    census = finite["finite_census"]
    assert census["orders"] == [3, 11]
    assert census["forest_types"] == 1344
    assert census["marked_parent_cells"] == 526680
    assert census["negative"] == 0 and census["zero"] == 0
    assert census["minimum"]["value"] == 14
    assert finite["dependency"]["sha256"] == sha256(AGENT_RESIDUAL)
    assert configuration_probe["finite_probe"]["orders_G"] == [3, 7]
    assert configuration_probe["finite_probe"]["marked_parent_cells"] == 5466
    assert configuration_probe["finite_probe"]["minimum"]["g1"] == 14
    direct_audit = direct_finite["finite_all_forest_audit"]
    assert direct_audit["orders"] == [8, 11]
    assert direct_audit["unlabelled_forests"] == 1268
    assert direct_audit["marked_parent_cells"] == 521214
    assert direct_audit["independent_direct_Gamma1_checks"] == 521214
    assert direct_audit["minimum"]["g1"] == 3006

    n, e = names["n"], names["edge_count"]
    du, dv, dp = names["degree_u"], names["degree_v"], names["degree_p"]
    adjacent = names["adjacent"]
    apu, apv = names["adjacent_pu"], names["adjacent_pv"]
    wedges = names["C_wedges_E"]
    xu, xv, xp = (
        names["C_neighbor_excess_u"],
        names["C_neighbor_excess_v"],
        names["neighbor_excess_p"],
    )
    common, cpu, cpv = (
        names["C_common_neighbor"],
        names["common_neighbor_pu"],
        names["common_neighbor_pv"],
    )

    # Exact monotonicity coefficients.  On every forest with n>=12,
    # e<=n-1, d_v<=n-1, d_u+d_v<=n.  The displayed elementary floors prove
    # the required signs before any relaxation is made.
    k_xu = sp.factor(sp.diff(residual, xu))
    k_xv = sp.factor(sp.diff(residual, xv))
    k_xp = sp.factor(sp.diff(residual, xp))
    k_common = sp.factor(sp.diff(residual, common))
    k_cpu = sp.factor(sp.diff(residual, cpu))
    k_cpv = sp.factor(sp.diff(residual, cpv))
    k_wedge = sp.factor(sp.diff(residual, wedges))
    assert k_xu == -3 * dv - 2 * e + 6 * n**2 - 15 * n + 3
    assert k_xv == -3 * du - 2 * e + 6 * n**2 - 15 * n + 3
    assert k_xp == 7 * n - 17
    assert sp.expand(
        k_common + (-10 * e + 5 * n**2 - n - 4) / 2
    ) == 0
    assert sp.expand(k_cpu - (4 - 5 * n)) == 0
    assert sp.expand(k_cpv - (4 - 5 * n)) == 0
    wedge_bracket = sp.factor(-2 * k_wedge)
    assert sp.expand(
        wedge_bracket
        - (
            6 * adjacent
            - 12 * du
            - 12 * dv
            + 8 * e
            + 15 * n**2
            - 67 * n
            + 36
        )
    ) == 0
    xu_floor = 6 * n**2 - 20 * n + 8
    common_positive_floor = (5 * n - 6) * (n - 1)
    wedge_positive_floor = 15 * n**2 - 79 * n + 36
    assert xu_floor.subs(n, 12) > 0
    assert common_positive_floor.subs(n, 12) > 0
    assert wedge_positive_floor.subs(n, 12) > 0
    assert sp.diff(xu_floor, n).subs(n, 12) > 0
    assert sp.diff(common_positive_floor, n).subs(n, 12) > 0
    assert sp.diff(wedge_positive_floor, n).subs(n, 12) > 0

    # Edgeless forests are outside E=e-1 parameterization.  Their residual
    # is positive directly for every possible n>=3.
    edgeless = sp.factor(
        residual.subs({symbol: 0 for symbol in residual.free_symbols if symbol != n})
    )
    edgeless_expected = sp.factor(
        (n - 1) * (65 * n**3 - 89 * n**2 - 238 * n + 192) / 24
    )
    assert sp.expand(edgeless - edgeless_expected) == 0
    edgeless_cubic = 65 * n**3 - 89 * n**2 - 238 * n + 192
    assert edgeless_cubic.subs(n, 3) == 432
    assert sp.diff(edgeless_cubic, n).subs(n, 3) == 983
    assert sp.diff(edgeless_cubic, n, 2).subs(n, 3) > 0
    assert degree_cone["edgeless_branch"]["status"] == (
        "separate exact positive branch for n>=3"
    )
    assert sp.expand(
        sp.sympify(degree_cone["edgeless_branch"]["residual"])
        - edgeless_expected
    ) == 0

    # Exact large-order Bernstein certificate.
    q = sp.symbols("q", nonnegative=True)
    box = sp.symbols("a b c d", nonnegative=True)
    a, b, c, d = box
    total = sp.Integer(10) + q  # total=n-2, so n=12+q
    x = total * a
    y = total * (1 - a) * b
    z = total * (1 - a) * (1 - b) * c
    r = total * (1 - a) * (1 - b) * (1 - c) * d

    branch_count = 0
    coefficient_count = 0
    zero_polynomials = 0
    degree_profiles: set[tuple[int, ...]] = set()
    ordered_stream = []
    minimum_q0 = None
    minimum_q0_record = None
    for auv, au, av in itertools.product((0, 1), repeat=3):
        if auv + au + av == 3:  # a forest has no triangle on u,v,p
            continue
        for zu, zv, zp in itertools.product((0, 1), repeat=3):
            if auv and not (zu and zv):
                continue
            if au and not (zu and zp):
                continue
            if av and not (zv and zp):
                continue
            d_u, d_v, d_p = zu + x, zv + y, zp + z
            edge_count = 1 + x + y + z + r
            wedge_upper = (
                d_u * (d_u - 1) / 2
                + d_v * (d_v - 1) / 2
                + d_p * (d_p - 1) / 2
                + r * (r + 1) / 2
            )
            lower = sp.cancel(
                residual.subs(
                    {
                        xu: 0,
                        xv: 0,
                        xp: 0,
                        common: 1,
                        cpu: 1,
                        cpv: 1,
                        wedges: wedge_upper,
                        n: total + 2,
                        e: edge_count,
                        du: d_u,
                        dv: d_v,
                        dp: d_p,
                        adjacent: auv,
                        apu: au,
                        apv: av,
                    }
                )
            )
            assert sp.denom(lower) == 1
            branch_count += 1
            branch = [auv, au, av, zu, zv, zp]
            for degrees, index, coefficient in tensor_bernstein(lower, box):
                degree_profiles.add(degrees)
                power_coefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
                assert all(value >= 0 for value in power_coefficients)
                coefficient_count += 1
                zero_polynomials += int(coefficient == 0)
                q0 = sp.factor(coefficient.subs(q, 0))
                record = {
                    "branch": branch,
                    "index": list(index),
                    "q_coefficients_ascending": coefficient_record(coefficient, q),
                }
                ordered_stream.append(record)
                if minimum_q0 is None or q0 < minimum_q0:
                    minimum_q0 = q0
                    minimum_q0_record = {**record, "q0": list(rational_pair(q0))}

    assert branch_count == 17
    assert coefficient_count == 4352
    assert degree_profiles == {(3, 3, 3, 3)}
    stream_raw = json.dumps(ordered_stream, separators=(",", ":"), sort_keys=True).encode()
    stream_sha = hashlib.sha256(stream_raw).hexdigest().upper()

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_ORDINARY",
        "theorem": (
            "For every forest G and distinct marks u,v and parent p, the first "
            "rank-four binomial sibling-bundle coefficient g1 is nonnegative."
        ),
        "proof_structure": {
            "high_motif_payment": (
                "2(n-4)R3+5Q35-5R4 plus deletion R3 terms is nonnegative"
            ),
            "parent_residual": "exact 103-term parent-deletion form",
            "monotone_replacements_n_ge_12": (
                "drop three positive neighbor-excess terms, set each of three "
                "common-neighbor counts to one, and replace wedges by the audited "
                "degree-excess upper bound"
            ),
            "degree_excess_cone": degree_cone["theorem"],
            "simplex_parameterization": (
                "d_u=z_u+x,d_v=z_v+y,d_p=z_p+z; e-1=x+y+z+r; "
                "n-2=x+y+z+r+h; stick-break the five nonnegative parts"
            ),
            "edgeless_residual": str(edgeless),
        },
        "large_order_certificate": {
            "orders": "n>=12",
            "branches": branch_count,
            "box_variables": 4,
            "degree_profiles": [list(profile) for profile in sorted(degree_profiles)],
            "bernstein_coefficients": coefficient_count,
            "zero_coefficient_polynomials": zero_polynomials,
            "minimum_value_at_q0": list(rational_pair(minimum_q0)),
            "minimum_value_at_q0_record": minimum_q0_record,
            "ordered_coefficient_stream_sha256": stream_sha,
            "q_definition": "q=n-12>=0",
            "sign_check": "every q-power coefficient of every Bernstein coefficient is nonnegative",
        },
        "finite_census": {
            "orders": census["orders"],
            "unlabeled_forests": census["forest_types"],
            "marked_parent_cells": census["marked_parent_cells"],
            "negative": census["negative"],
            "zero": census["zero"],
            "minimum": census["minimum"],
            "direct_Gamma1_cross_checks": {
                "orders_3_to_7": configuration_probe["finite_probe"]["marked_parent_cells"],
                "orders_8_to_11": direct_audit["independent_direct_Gamma1_checks"],
            },
        },
        "dependencies": {
            path.name: sha256(path)
            for path in (
                CONFIGURATION,
                HIGH_MOTIF,
                ROOT_RESIDUAL,
                AGENT_RESIDUAL,
                DEGREE_CONE,
                FINITE_CENSUS,
                CONFIGURATION_PROBE,
                DIRECT_FINITE,
            )
        },
        "scope": (
            "Exact theorem for g1 in the singleton-parent deepest ordinary case "
            "p distinct from u,v. It does not prove marked-parent endpoint modes, "
            "arbitrary noncanonical supports, later FML ranks, all N4, or Erdos 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
