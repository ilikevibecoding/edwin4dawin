#!/usr/bin/env python3
"""Probe an all-order forest-cone certificate for rank-five bundle g4.

This is deliberately fail-closed.  It starts from the frozen exact 103-term
forest invariant and performs only monotone replacements valid for a marked
forest C and an induced marked subforest D.  The remaining C/D degree-excess
cones are parameterized by exact stick-breaking coordinates.  Every tensor
Bernstein coefficient is then audited in the two unbounded order variables.

The output is a probe: a PASS marker is emitted only if every branch has a
coefficientwise-nonnegative exact certificate.  Otherwise the report records
the first negative coefficient and makes no sign claim.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n5_bundle_g4_forest_invariant_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g4_universal_forest_cone_probe_rank5_g4_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def c2(value: sp.Expr) -> sp.Expr:
    return value * (value - 1) / 2


def tensor_bernstein(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(degree, j)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def simplex(total: sp.Expr, indicators: tuple[int, int], box):
    """Return degree excesses x,y and residual edge excess r."""
    a, b, c = box
    zu, zv = indicators
    x = total * a if zu else sp.Integer(0)
    remaining = total * (1 - a) if zu else total
    y = remaining * b if zv else sp.Integer(0)
    remaining = remaining * (1 - b) if zv else remaining
    r = remaining * c
    return x, y, r


def power_audit(value: sp.Expr, unbounded: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(value), *unbounded)
    bad = []
    minimum = None
    for monomial, coefficient in polynomial.terms():
        coefficient = sp.factor(coefficient)
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient.is_negative is True:
            bad.append((monomial, coefficient))
    return minimum, bad


def main() -> None:
    frozen = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert frozen["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_G4_FOREST_INVARIANT_ROOT"
    expression = sp.sympify(frozen["forest_invariant_form"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}

    n, q = names["n"], names["q"]
    eu, ev = names["epsilon_u"], names["epsilon_v"]
    e = names["C_edges"]
    du, dv = names["C_degree_u"], names["C_degree_v"]
    adjacent = names["C_adjacent"]
    wedges = names["C_wedges"]
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    common = names["C_common_neighbor"]
    re, ru, rv, rw = (
        names["C_connected3_E"], names["C_connected3_U"],
        names["C_connected3_V"], names["C_connected3_W"],
    )
    de = names["D_edges"]
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    dadjacent = names["D_adjacent"]
    dwedges = names["D_wedges"]
    dxu, dxv = names["D_neighbor_excess_u"], names["D_neighbor_excess_v"]
    dcommon = names["D_common_neighbor"]

    # Exact D wedge-deletion identity.  Here dminor_wedges is W(D-u-v).
    dminor_wedges = sp.Symbol("D_minor_wedges", nonnegative=True)
    d_wedge_identity = (
        dminor_wedges + c2(ddu) + c2(ddv) + dxu + dxv
        - dadjacent * (ddu + ddv - 2) - dcommon
    )
    d_rewritten = sp.factor(expression.subs(wedges, wedges).subs(dwedges, d_wedge_identity))
    assert sp.diff(d_rewritten, dminor_wedges) == 8
    assert sp.diff(d_rewritten, dxu) == 4
    assert sp.diff(d_rewritten, dxv) == 4
    assert sp.diff(d_rewritten, dcommon) == -14

    # Universal positive motif and local monotonicity coefficients.
    assert sp.diff(d_rewritten, re) == 2
    assert sp.diff(d_rewritten, ru) == 14
    assert sp.diff(d_rewritten, rv) == 14
    assert sp.diff(d_rewritten, rw) == 6
    assert sp.diff(d_rewritten, xu) == 36 * n - 61
    assert sp.diff(d_rewritten, xv) == 36 * n - 61
    assert sp.diff(d_rewritten, common) == 13 - 20 * n
    assert sp.diff(d_rewritten, wedges) == 113 - 42 * n

    # The all-order lower relaxation.  n>=3 on every positive-edge branch.
    relaxed = sp.factor(d_rewritten.subs({
        re: 0, ru: 0, rv: 0, rw: 0,
        xu: 0, xv: 0, common: 1,
        dminor_wedges: 0, dxu: 0, dxv: 0, dcommon: 1,
    }))

    s, h = sp.symbols("s h", integer=True, nonnegative=True)
    cbox = sp.symbols("a b c", nonnegative=True)
    dbox = sp.symbols("A B C", nonnegative=True)
    all_box = cbox + dbox
    failures = []
    branch_count = 0
    coefficient_count = 0
    profiles = set()
    minimum = None
    stream = []

    def audit_branch(branch, lower, variables):
        nonlocal branch_count, coefficient_count, minimum
        branch_count += 1
        if not variables:
            local_minimum, bad = power_audit(lower, (s, h))
            coefficient_count += 1
            profiles.add(())
            if minimum is None or local_minimum < minimum:
                minimum = local_minimum
            if bad and len(failures) < 20:
                failures.append({
                    "branch": branch,
                    "degree_profile": [],
                    "bernstein_index": [],
                    "coefficient": str(lower),
                    "negative_power_terms": [
                        {"s_h_monomial": list(monomial), "coefficient": str(value)}
                        for monomial, value in bad[:10]
                    ],
                })
            stream.append((branch, [], [], str(lower)))
            return
        reconstructed = 0
        for degrees, index, coefficient in tensor_bernstein(lower, variables):
            profiles.add(degrees)
            local_minimum, bad = power_audit(coefficient, (s, h))
            coefficient_count += 1
            if minimum is None or local_minimum < minimum:
                minimum = local_minimum
            if bad and len(failures) < 20:
                failures.append({
                    "branch": branch,
                    "degree_profile": list(degrees),
                    "bernstein_index": list(index),
                    "coefficient": str(coefficient),
                    "negative_power_terms": [
                        {"s_h_monomial": list(monomial), "coefficient": str(value)}
                        for monomial, value in bad[:10]
                    ],
                })
            stream.append((branch, list(degrees), list(index), str(coefficient)))
            term = coefficient
            for variable, degree, position in zip(variables, degrees, index):
                term *= (
                    sp.binomial(degree, position)
                    * variable**position
                    * (1 - variable) ** (degree - position)
                )
            reconstructed += term
        assert sp.expand(reconstructed - lower) == 0

    # C edgeless forces induced D edgeless.  No box variables are required.
    for epsilon_u, epsilon_v in itertools.product((0, 1), repeat=2):
        survival = epsilon_u + epsilon_v
        substitutions = {
            n: 2 + s + h,
            q: survival + s,
            eu: epsilon_u, ev: epsilon_v,
            e: 0, du: 0, dv: 0, adjacent: 0, wedges: 0,
            de: 0, ddu: 0, ddv: 0, dadjacent: 0,
        }
        lower = sp.factor(relaxed.subs(substitutions))
        audit_branch(["C0_D0", epsilon_u, epsilon_v], lower, ())

    # Positive-edge C and edgeless D.
    for epsilon_u, epsilon_v, cadj, czu, czv in itertools.product((0, 1), repeat=5):
        if cadj and not (czu and czv):
            continue
        total_c = s + h
        cx, cy, cr = simplex(total_c, (czu, czv), cbox)
        cdu, cdv = czu + cx, czv + cy
        ce = 1 + cx + cy + cr
        c_wedge_cap = c2(cdu) + c2(cdv) + c2(cr + 1)
        survival = epsilon_u + epsilon_v
        substitutions = {
            n: 2 + s + h,
            q: survival + s,
            eu: epsilon_u, ev: epsilon_v,
            e: ce, du: cdu, dv: cdv, adjacent: cadj, wedges: c_wedge_cap,
            de: 0, ddu: 0, ddv: 0, dadjacent: 0,
        }
        lower = sp.factor(relaxed.subs(substitutions))
        audit_branch(["C1_D0", epsilon_u, epsilon_v, cadj, czu, czv], lower, cbox)

    # Positive-edge C and positive-edge D.  The missing protected marks force
    # n-q >= 2-eu-ev; h is the remaining deletion slack.
    for epsilon_u, epsilon_v in itertools.product((0, 1), repeat=2):
        survival = epsilon_u + epsilon_v
        order_q = 2 + s
        order_n = order_q + (2 - survival) + h
        total_c = order_n - 2
        total_d = order_q - 2
        for cadj, czu, czv in itertools.product((0, 1), repeat=3):
            if cadj and not (czu and czv):
                continue
            cx, cy, cr = simplex(total_c, (czu, czv), cbox)
            cdu, cdv = czu + cx, czv + cy
            ce = 1 + cx + cy + cr
            c_wedge_cap = c2(cdu) + c2(cdv) + c2(cr + 1)
            for dadj, dzu, dzv in itertools.product((0, 1), repeat=3):
                if dzu > epsilon_u or dzv > epsilon_v:
                    continue
                if dadj and not (dzu and dzv):
                    continue
                dx, dy, dr = simplex(total_d, (dzu, dzv), dbox)
                degree_du, degree_dv = dzu + dx, dzv + dy
                edge_d = 1 + dx + dy + dr
                substitutions = {
                    n: order_n, q: order_q,
                    eu: epsilon_u, ev: epsilon_v,
                    e: ce, du: cdu, dv: cdv, adjacent: cadj,
                    wedges: c_wedge_cap,
                    de: edge_d, ddu: degree_du, ddv: degree_dv,
                    dadjacent: dadj,
                }
                lower = sp.factor(relaxed.subs(substitutions))
                audit_branch(
                    ["C1_D1", epsilon_u, epsilon_v, cadj, czu, czv, dadj, dzu, dzv],
                    lower,
                    all_box,
                )

    passed = not failures
    marker = (
        "PASS_EXACT_PROBE_ISO_N5_BUNDLE_G4_UNIVERSAL_FOREST_CONE_RANK5_G4"
        if passed else
        "FAIL_CLOSED_PROBE_ISO_N5_BUNDLE_G4_UNIVERSAL_FOREST_CONE_RANK5_G4"
    )
    report = {
        "marker": marker,
        "passed": passed,
        "candidate_theorem": (
            "g4>=0 for every two-marked forest C and every induced marked subforest D"
        ),
        "exact_reductions": {
            "C_connected3_motif": "2*R_E+14*R_U+14*R_V+6*R_W>=0",
            "C_neighbor_excess": "coefficients 36*n-61>0 for n>=2",
            "C_common_neighbor": "coefficient 13-20*n<0; common<=1",
            "C_wedge": (
                "coefficient 113-42*n<0 for n>=3; replace by "
                "C(du,2)+C(dv,2)+C(r+1,2)"
            ),
            "D_wedge_identity": str(d_wedge_identity),
            "D_post_identity_coefficients": {
                "minor_wedges": "8", "neighbor_excess_u": "4",
                "neighbor_excess_v": "4", "common_neighbor": "-14",
            },
        },
        "certificate": {
            "branches": branch_count,
            "bernstein_coefficients": coefficient_count,
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "minimum_scalar_power_coefficient": str(minimum),
            "ordered_stream_sha256": hashlib.sha256(
                json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
            ).hexdigest().upper(),
            "unbounded_variables": "s,h>=0",
            "box_variables": list(map(str, all_box)),
            "negative_records": failures,
        },
        "scope": (
            "Exact all-order sign proof only if passed=true.  If failed, this is "
            "a fail-closed cone diagnostic and asserts no g4 sign theorem."
        ),
        "dependency": {DEPENDENCY.name: sha256(DEPENDENCY)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": marker,
        "passed": passed,
        "branches": branch_count,
        "bernstein_coefficients": coefficient_count,
        "degree_profiles": report["certificate"]["degree_profiles"],
        "minimum_scalar_power_coefficient": str(minimum),
        "negative_record_count": len(failures),
        "first_failure": failures[:1],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
