#!/usr/bin/env python3
"""Independent audit of tree terminal-q3 Newton m=1 for targets j>=4.

No helper, formula object, or coefficient stream is imported from the
producer.  This auditor independently rebuilds the Newton row, staged B2
Bernstein reduction, j>=5 low/high root cones, fixed-j=4 boundary, marked
star-centre boundary, and direct-subset literal replay.

Scope: tree bases, Newton m=1, target j>=4, inside the stated strong-
induction step.  This does not prove m=0, general forest bases, the full
terminal payment, unimodality, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path
import random

import networkx as nx
import sympy as sy


BASE = Path(__file__).resolve().parent
OUTPUT = BASE / "terminal_q3_low_newton_m1_j4plus_independent_audit_20260829.json"
PINS = {
    "prove_terminal_q3_low_newton_m1_j4plus_agent.py":
        "7349A169FBF406EADA042F8F47C78EA55CCA08E9E8A766A7C02C69291FA4DBC6",
    "terminal_q3_low_newton_m1_j4plus_exact_agent_20260829.json":
        "D39FE1342650B9F7518AA0E05FB9D44353CAE57826E5F0B478520E56FD08B35A",
    "TERMINAL_Q3_LOW_NEWTON_M1_J4PLUS_THEOREM_AGENT_2026-08-29.md":
        "547BDD6AE49680272F7D75DFFA593A4622B21A530D454A607ABAC5AFDA87D59D",
    "audit_terminal_q3_anchor_ordering_independent_agent.py":
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C",
    "terminal_q3_anchor_ordering_independent_audit_20260828.json":
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C",
    "audit_all_forest_q3_q2_component_lift_independent_agent.py":
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815",
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D",
    "prove_all_forest_q3_q2_component_lift_root.py":
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json":
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
    "ALL_FOREST_Q3_Q2_THEOREM_2026-08-29.md":
        "354323BF3E2EB4E60CD68441D1539B535C3A95D57F3E0DDF6B426AF99270C1B7",
    "verify_rank4_tree_path_surplus_reserve_root.py":
        "719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "audit_rank4_tree_path_surplus_reserve_root.py":
        "472B2DC9D10573E6F628CB60BE8F96F16BE11A46E652ABC75CE0BE133D509027",
    "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
        "01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137",
    "RANK4_TREE_PATH_SURPLUS_RESERVE_THEOREM_2026-08-26.md":
        "495AB1C891C5CF6C542F80922C03A70F92BC6DC643F94611C95DB37316913481",
    "ROOTED_FOREST_EXTENSION_FLOOR_2026-08-28.md":
        "8AA07C316270045F9CBFCA2B5A04E04994100DCF87F02EB99B84A61080A1458E",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(x, rank):
    answer = sy.Integer(1)
    for offset in range(rank):
        answer *= x - offset
    return sy.cancel(answer / sy.factorial(rank))


def rebuild_model():
    """Reconstruct the exact retained normalized lower before root boxing."""
    M, J, rho, D, E, Z, T, Y = sy.symbols(
        "M J rho D E Z T Y", nonnegative=True
    )
    S = M - D
    wedge = M - 1 + Z
    p0 = M**3 / 6 - M**2 / 2 + M / 3 + wedge
    p1 = (M**2 + M + 2) / 2
    r1 = M**2 - 2 * wedge
    r0 = (
        M * choose(M, 2)
        - 2 * (wedge * (M - 1) + choose(M, 2) - wedge)
        + 3 * (M - 2 + Z + T)
    )

    a = choose(M, 2) - S
    forest_wedges = wedge - choose(D, 2) - E
    z2 = S * (M - 2) - 2 * forest_wedges
    h2 = choose(S, 2) - (S - E)
    c0 = a + z2 + h2
    A0 = sy.expand(p0 * c0 - a * r0)
    A1 = sy.expand(p0 * a + p1 * c0 + p1 * a - a * r1)

    # Strong induction on the strictly smaller forest, followed by the pinned
    # all-forest q3<=q2 lift, gives z_j/b<=J*z2/(2*a).
    ecap = 1 + Y + J * z2 / (2 * a)
    q0 = (J + 1) * (c0 + r0) - 3 * (p0 + a) * ecap
    q1 = (
        (J + 1) * (a + r1)
        - 3 * p1 * ecap
        - 3 * (p0 + a + p1)
    )
    remainder = sy.expand(p0 * q1 + p1 * q0 + p1 * q1)

    u1 = 1 + J / (rho + 1) + J * Y / rho
    u0 = (
        (M - 2 * J + 3 + (J - 1) * Y) / (J + 1)
        + J * Y / rho
    )
    pre_tau = sy.factor(
        (J + 1) * (A0 * u1 + A1 * (u0 + u1)) + remainder
    )
    lower = sy.factor(pre_tau.subs({
        M: J + rho,
        T: (J + rho - 3) * Z / 3,
    }))
    return {
        "symbols": (M, J, rho, D, E, Z, T, Y),
        "rows": (S, wedge, p0, p1, r0, r1, a, forest_wedges, z2, h2, c0, A0, A1),
        "floors": (u0, u1),
        "pre_tau": pre_tau,
        "lower": lower,
    }


def structural_audit(model):
    M, J, rho, D, E, Z, T, Y = model["symbols"]
    S, wedge, p0, p1, r0, r1, a, P, z2, h2, c0, A0, A1 = model["rows"]
    u0, u1 = model["floors"]

    # Rebuild the adverse q-envelope derivative without using the producer.
    ebar = sy.symbols("ebar")
    Q0 = (J + 1) * (c0 + r0) - 3 * (p0 + a) * ebar
    Q1 = (J + 1) * (a + r1) - 3 * p1 * ebar - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    adverse = sy.factor(-sy.diff(remainder, ebar))
    assert sy.factor(adverse - 3 * p1 * (2 * p0 + a + p1)) == 0

    # The tau slope is negative.  For J>=4, rho<=M-4 and
    # a*u1-p1 >= C(M-1,2)(M+1)/(M-3)-p1=4/(M-3).
    tau_slope = sy.factor(sy.diff(model["pre_tau"], T))
    assert sy.factor(tau_slope - 3 * (J + 1) * (p1 - a * u1)) == 0
    margin = sy.factor(choose(M - 1, 2) * (M + 1) / (M - 3) - p1)
    assert sy.factor(margin - 4 / (M - 3)) == 0

    # Independently derive the reduced tau cap from the two pinned Zagreb
    # inputs at tree order n=M+1.
    B3, X = sy.symbols("B3 X", nonnegative=True)
    xcap = (2 * (M - 3) * Z - 6 * B3) / 7
    after_x = sy.factor(B3 + xcap)
    final_cap = sy.factor(after_x.subs(B3, (M - 3) * Z / 3))
    assert sy.factor(final_cap - (M - 3) * Z / 3) == 0

    numerator, denominator = sy.together(model["lower"]).as_numer_denom()
    expected_denominator = sy.factor(24 * rho * (rho + 1) * a.subs(M, J + rho))
    assert sy.factor(denominator - expected_denominator) == 0
    assert sy.Poly(numerator, Z).degree() == 2
    assert sy.Poly(numerator, Y).degree() == 1

    # Re-derive both coupled U floors from the rooted bad-pair incidence
    # estimate C_J<=2((J-1)b+h_J), the exact extension identity, and the two
    # ordinary shadow inequalities.  These identities ensure the symbolic
    # rows did not silently import a producer-side rearrangement.
    fjp1_floor = sy.factor((M - J - 2 * (J - 1 + Y)) / (J + 1))
    assert sy.factor(fjp1_floor - (M - 3 * J + 2 - 2 * Y) / (J + 1)) == 0
    fjm1_floor = J / (rho + 1)
    hjm1_floor = J * Y / rho
    rebuilt_u1 = sy.factor(1 + fjm1_floor + hjm1_floor)
    rebuilt_u0 = sy.factor(1 + Y + fjp1_floor + hjm1_floor)
    assert sy.factor(rebuilt_u1 - u1.subs(M, J + rho)) == 0
    assert sy.factor(rebuilt_u0.subs(M, J + rho) - u0.subs(M, J + rho)) == 0

    # The root box is exhaustive: sum_v(deg(v)-1)=M-1, so after the marked
    # root contribution d-1, the neighbour group has mass E and the farther
    # group has mass S-E.  Convex concentration of C(x,2) gives the upper
    # B2 endpoint used below.  Record the mass identity algebraically.
    farther_mass = sy.factor(M - 1 - (D - 1) - E)
    assert sy.factor(farther_mass - (M - D - E)) == 0

    # The domain split and all exceptional boundaries are disjoint and
    # exhaustive: rho=0 is the marked star centre; otherwise rho>=1.  For
    # J>=5 use rho>=11 plus rho=1,...,10.  For J=4 and M>=15, rho>=11.
    domain_partition = {
        "noncenter": "rho>=1",
        "j5plus_main": "J=5+k, rho=11+q",
        "j5plus_strips": "rho=1,...,10; J=15-rho+q",
        "j4": "J=4, rho=11+q",
        "star_center": "rho>=11 main plus rho=0,...,10 strips",
    }

    return {
        "adverse_q_envelope_slope": str(adverse),
        "tau_slope": str(tau_slope),
        "tau_slope_margin_floor": str(margin),
        "tau_cap": "T<=(M-3)Z/3",
        "lower_positive_denominator": str(denominator),
        "B2_degree": 2,
        "y_degree": 1,
        "extension_floor_fjp1_over_b": str(fjp1_floor),
        "rebuilt_U1_over_b_floor": str(rebuilt_u1),
        "rebuilt_U0_over_b_floor": str(rebuilt_u0),
        "root_partition_farther_mass": str(farther_mass),
        "domain_partition": domain_partition,
        "noncircularity": (
            "q_J(F)<=q_3(F) is used only on F=G-w, which has one fewer "
            "vertex; the independently pinned all-forest q_3<=q_2 lift "
            "then yields q_J(F)<=q_2(F)."
        ),
    }


def bernstein_tensor(expression, variables):
    """Independent sequential power-to-Bernstein conversion."""
    polynomial = sy.Poly(sy.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    current = dict(polynomial.terms())
    for axis, degree in enumerate(degrees):
        result = {}
        others = [index for index in range(len(variables)) if index != axis]
        for other_powers in itertools.product(*[
            range(degrees[index] + 1) for index in others
        ]):
            key = [0] * len(variables)
            for index, power in zip(others, other_powers):
                key[index] = power
            powers = []
            for power in range(degree + 1):
                key[axis] = power
                powers.append(current.get(tuple(key), sy.Integer(0)))
            for endpoint in range(degree + 1):
                value = sy.Integer(0)
                for power in range(endpoint + 1):
                    value += (
                        powers[power]
                        * sy.binomial(endpoint, power)
                        / sy.binomial(degree, power)
                    )
                key[axis] = endpoint
                result[tuple(key)] = sy.expand(value)
        current = result
    return degrees, current


def b2_rows_midpoint(numerator, *, M, D, E, Z):
    """Quadratic B2 Bernstein rows via the midpoint identity."""
    S = M - D
    low = choose(D - 1, 2)
    high = sy.expand(low + choose(E, 2) + choose(S - E, 2))
    midpoint = sy.expand((low + high) / 2)
    b0 = sy.expand(numerator.subs(Z, low))
    b2 = sy.expand(numerator.subs(Z, high))
    middle_value = sy.expand(numerator.subs(Z, midpoint))
    b1 = sy.expand(2 * middle_value - (b0 + b2) / 2)

    # Verify the independently obtained rows reproduce the polynomial at a
    # fresh symbolic Bernstein parameter.
    w = sy.symbols("w")
    direct = sy.expand(numerator.subs(Z, low + w * (high - low)))
    rebuilt = sy.expand(b0 * (1 - w)**2 + 2 * b1 * w * (1 - w) + b2 * w**2)
    assert sy.expand(direct - rebuilt) == 0
    return {"b0": b0, "b1": b1, "b2": b2}


def poly_dictionary(expression, variables):
    polynomial = sy.Poly(sy.expand(expression), *variables)
    return sorted((powers, str(value)) for powers, value in polynomial.as_dict().items())


def certify_j5_coefficient(coefficient, J, rho):
    k, q = sy.symbols("k q", nonnegative=True)
    main = sy.Poly(sy.expand(coefficient.subs({J: 5 + k, rho: 11 + q})), k, q)
    assert main.coeffs() and all(value >= 0 for value in main.coeffs())
    strips = []
    for residual in range(1, 11):
        strip = sy.Poly(
            sy.expand(coefficient.subs({rho: residual, J: 15 - residual + q})), q
        )
        assert strip.coeffs() and all(value >= 0 for value in strip.coeffs())
        strips.append((residual, poly_dictionary(strip.as_expr(), (q,))))
    return poly_dictionary(main.as_expr(), (k, q)), strips


def audit_j5plus(model):
    M, J, rho, D, E, Z, T, Y = model["symbols"]
    lower = model["lower"]
    numerator, denominator = sy.together(lower).as_numer_denom()
    rows = b2_rows_midpoint(numerator, M=J + rho, D=D, E=E, Z=Z)
    N = J + rho
    S = N - D
    u, v = sy.symbols("u v", nonnegative=True)
    cases = {}
    stream = []

    for sector in ("low_root", "high_root"):
        half = (N - 2) * u / 2
        if sector == "low_root":
            dbox = 1 + half
            sbox = N - dbox
            yfaces = ("y0", "y1")
        else:
            sbox = 1 + half
            dbox = N - sbox
            yfaces = ("y0", "yratio")
        ebox = 1 + (sbox - 1) * v

        for row_name, row in rows.items():
            for yface in yfaces:
                if yface == "yratio":
                    zero = row.subs(Y, 0)
                    slope = sy.diff(row, Y)
                    expression = (
                        dbox * zero.subs({D: dbox, E: ebox}, simultaneous=True)
                        + sbox * slope.subs({D: dbox, E: ebox}, simultaneous=True)
                    )
                else:
                    yvalue = 0 if yface == "y0" else 1
                    expression = row.subs(
                        {D: dbox, E: ebox, Y: yvalue}, simultaneous=True
                    )
                boxed_num = sy.together(expression).as_numer_denom()[0]
                degrees, coefficients = bernstein_tensor(boxed_num, (u, v))
                local = []
                for index in sorted(coefficients):
                    main_dict, strips = certify_j5_coefficient(coefficients[index], J, rho)
                    record = f"{sector}|{row_name}|{yface}|{index}|{main_dict}|{strips}"
                    local.append(record)
                    stream.append(record)
                label = f"{sector}_{row_name}_{yface}"
                cases[label] = {
                    "degrees": list(degrees),
                    "coefficients": len(coefficients),
                    "audit_stream_sha256": hashlib.sha256(
                        "\n".join(local).encode("ascii")
                    ).hexdigest().upper(),
                }
                print("J5_AUDIT", label, cases[label], flush=True)

    assert sum(case["coefficients"] for case in cases.values()) == 275
    return {
        "positive_denominator": str(denominator),
        "cases": cases,
        "total_coefficients": 275,
        "audit_stream_sha256": hashlib.sha256(
            "\n".join(stream).encode("ascii")
        ).hexdigest().upper(),
    }


def bernstein_1d(expression, variable):
    degrees, coefficients = bernstein_tensor(expression, (variable,))
    return degrees[0], {index[0]: value for index, value in coefficients.items()}


def audit_j4(model):
    M, J, rho, D, E, Z, T, Y = model["symbols"]
    q = sy.symbols("q", nonnegative=True)
    N = 15 + q
    specialized = sy.factor(model["lower"].subs({J: 4, rho: 11 + q}))
    numerator, denominator = sy.together(specialized).as_numer_denom()
    rows = b2_rows_midpoint(numerator, M=N, D=D, E=E, Z=Z)
    cases = {}
    stream = []
    v = sy.symbols("v", nonnegative=True)

    # Small marked degree d=1,2,3.
    for dvalue in (1, 2, 3):
        svalue = N - dvalue
        ebox = 1 + (svalue - 1) * v
        for row_name, row in rows.items():
            for yface, yvalue in (("y0", 0), ("y1", 1)):
                expression = row.subs(
                    {D: dvalue, E: ebox, Y: yvalue}, simultaneous=True
                )
                boxed_num = sy.together(expression).as_numer_denom()[0]
                degree, coefficients = bernstein_1d(boxed_num, v)
                local = []
                for index in sorted(coefficients):
                    polynomial = sy.Poly(sy.expand(coefficients[index]), q)
                    assert polynomial.coeffs() and all(value >= 0 for value in polynomial.coeffs())
                    record = f"small|{dvalue}|{row_name}|{yface}|{index}|{poly_dictionary(polynomial.as_expr(), (q,))}"
                    local.append(record)
                    stream.append(record)
                label = f"small_d{dvalue}_{row_name}_{yface}"
                cases[label] = {
                    "degree": degree,
                    "coefficients": len(coefficients),
                    "audit_stream_sha256": hashlib.sha256(
                        "\n".join(local).encode("ascii")
                    ).hexdigest().upper(),
                }
                print("J4_AUDIT", label, cases[label], flush=True)

    # d>=4 with exact binomial cap.  Audit the u-half split by direct affine
    # substitution into each half, not by the producer's de Casteljau stream.
    u, x = sy.symbols("u x", nonnegative=True)
    dbox = 4 + (N - 5) * u
    sbox = N - dbox
    ebox = 1 + (sbox - 1) * v
    roots4 = choose(dbox, 4)
    hcap = choose(sbox, 4)
    for row_name, row in rows.items():
        zero = row.subs(Y, 0)
        slope = sy.diff(row, Y)
        for yface, expression in (
            ("y0", zero),
            ("ycap", (roots4 + hcap) * zero + hcap * slope),
        ):
            rooted = expression.subs({D: dbox, E: ebox}, simultaneous=True)
            local = []
            degrees_seen = None
            for half_index, uvalue in ((0, x / 2), (1, (1 + x) / 2)):
                cell_num = sy.together(rooted.subs(u, uvalue)).as_numer_denom()[0]
                degrees, coefficients = bernstein_tensor(cell_num, (x, v))
                degrees_seen = degrees
                for index in sorted(coefficients):
                    polynomial = sy.Poly(sy.expand(coefficients[index]), q)
                    assert polynomial.coeffs() and all(value >= 0 for value in polynomial.coeffs()), (
                        row_name, yface, half_index, index, coefficients[index]
                    )
                    record = f"large|{row_name}|{yface}|{half_index}|{index}|{poly_dictionary(polynomial.as_expr(), (q,))}"
                    local.append(record)
                    stream.append(record)
            label = f"large_{row_name}_{yface}"
            cases[label] = {
                "degrees": list(degrees_seen),
                "half_cells": 2,
                "coefficients": len(local),
                "audit_stream_sha256": hashlib.sha256(
                    "\n".join(local).encode("ascii")
                ).hexdigest().upper(),
            }
            print("J4_AUDIT", label, cases[label], flush=True)

    small_total = sum(
        value["coefficients"] for key, value in cases.items() if key.startswith("small_")
    )
    large_total = sum(
        value["coefficients"] for key, value in cases.items() if key.startswith("large_")
    )
    assert (small_total, large_total) == (66, 352)
    return {
        "positive_denominator": str(denominator),
        "small_d_coefficients": small_total,
        "d4plus_coefficients": large_total,
        "cases": cases,
        "total_coefficients": 418,
        "audit_stream_sha256": hashlib.sha256(
            "\n".join(stream).encode("ascii")
        ).hexdigest().upper(),
    }


def audit_star_center(model):
    M, J, rho, D, E, Z, T, Y = model["symbols"]
    center = sy.factor(model["lower"].subs({
        D: J + rho,
        E: 0,
        Z: choose(J + rho - 1, 2),
        Y: 0,
    }, simultaneous=True))
    k, q = sy.symbols("k q", nonnegative=True)
    cases = {}
    stream = []
    domains = [("rho11plus", {J: 4 + k, rho: 11 + q}, (k, q))]
    for residual in range(11):
        jmin = max(4, 15 - residual)
        domains.append((f"rho{residual}", {rho: residual, J: jmin + q}, (q,)))
    for label, substitution, variables in domains:
        numerator, denominator = sy.together(
            sy.factor(center.subs(substitution))
        ).as_numer_denom()
        npoly = sy.Poly(sy.expand(numerator), *variables)
        dpoly = sy.Poly(sy.expand(denominator), *variables)
        assert npoly.coeffs() and all(value >= 0 for value in npoly.coeffs())
        assert dpoly.coeffs() and all(value >= 0 for value in dpoly.coeffs())
        assert denominator.subs({variable: 0 for variable in variables}) > 0
        cases[label] = {
            "degrees": list(npoly.degree_list()),
            "terms": len(npoly.terms()),
            "minimum_coefficient": str(min(npoly.coeffs())),
            "positive_denominator": str(sy.factor(denominator)),
        }
        stream.append(
            f"{label}|{poly_dictionary(numerator, variables)}|{poly_dictionary(denominator, variables)}"
        )
    return {
        "cases": cases,
        "total_polynomials": len(cases),
        "audit_stream_sha256": hashlib.sha256(
            "\n".join(stream).encode("ascii")
        ).hexdigest().upper(),
    }


def subset_table(tree):
    order = len(tree)
    edges = list(tree.edges())
    table = []
    for mask in range(1 << order):
        induced = sum(
            ((mask >> left) & 1) and ((mask >> right) & 1)
            for left, right in edges
        )
        if induced <= 1:
            table.append((mask, mask.bit_count(), induced))
    return table


def rows_from_table(table, order, allowed):
    zero = [0] * (order + 1)
    one = [0] * (order + 1)
    forbidden = ((1 << order) - 1) ^ allowed
    for mask, size, edges in table:
        if mask & forbidden:
            continue
        (zero if edges == 0 else one)[size] += 1
    return zero, one


def isolate_value(row, rank, count):
    return sum(
        comb(count, used) * (row[rank - used] if 0 <= rank - used < len(row) else 0)
        for used in range(min(rank, count) + 1)
    )


def independent_poly_mask(adjacency, mask, memo):
    """Independence polynomial of an induced forest by deletion recursion."""
    if mask in memo:
        return memo[mask]
    vertices = [vertex for vertex in range(len(adjacency)) if mask & (1 << vertex)]
    pivot = max(vertices, key=lambda vertex: (adjacency[vertex] & mask).bit_count())
    pivot_bit = 1 << pivot
    without = independent_poly_mask(adjacency, mask ^ pivot_bit, memo)
    with_pivot = independent_poly_mask(
        adjacency, mask & ~pivot_bit & ~adjacency[pivot], memo
    )
    degree = max(len(without), len(with_pivot) + 1)
    result = [0] * degree
    for rank, value in enumerate(without):
        result[rank] += value
    for rank, value in enumerate(with_pivot):
        result[rank + 1] += value
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    memo[mask] = tuple(result)
    return memo[mask]


def zero_one_rows_dp(adjacency, edges, allowed, memo):
    """Zero/one-edge rows from a different exact recurrence than subset replay.

    A set inducing exactly one edge has a unique such edge uv.  Once uv is
    selected, every other selected vertex lies in the independent induced
    forest outside N[u] union N[v].  Summing that polynomial over uv counts
    every one-edge set exactly once.
    """
    order = len(adjacency)
    zero_poly = independent_poly_mask(adjacency, allowed, memo)
    zero = list(zero_poly) + [0] * (order + 1 - len(zero_poly))
    one = [0] * (order + 1)
    for left, right in edges:
        pair = (1 << left) | (1 << right)
        if allowed & pair != pair:
            continue
        closed_pair = pair | adjacency[left] | adjacency[right]
        remainder = independent_poly_mask(adjacency, allowed & ~closed_pair, memo)
        for rank, value in enumerate(remainder):
            one[rank + 2] += value
    return zero, one


def adjacency_rows(tree):
    order = len(tree)
    adjacency = [0] * order
    edges = []
    for left, right in tree.edges():
        left = int(left)
        right = int(right)
        adjacency[left] |= 1 << right
        adjacency[right] |= 1 << left
        edges.append((left, right))
    return tuple(adjacency), tuple(edges)


def raw_m1_from_rows(whole0, whole1, f0, f1, h0, target):
    """Literal first Newton difference of the normalized terminal row."""
    a = f0[2]
    b = f0[target]
    assert a > 0 and b > 0
    z2 = f1[3]
    h2 = h0[2]
    zj = f1[target + 1] if target + 1 < len(f1) else 0
    hj = h0[target] if target < len(h0) else 0
    values = []
    raw = []
    for isolates in (1, 2):
        p = isolate_value(whole0, 3, isolates)
        rrow = isolate_value(whole1, 4, isolates)
        urow = isolate_value(whole0, target + 1, isolates)
        c = z2 + h2 + isolates * a
        edge = zj + hj + isolates * b
        anchor = p * c - a * rrow
        qrow = (target + 1) * b * (c + rrow) - 3 * (p + a) * edge
        values.append(a * ((target + 1) * anchor * urow + p * qrow))
        raw.append((p, rrow, urow, c, edge, anchor, qrow))
    return values[1] - values[0], raw


def finite_order15_replay():
    """Fresh all-unlabelled-tree n=15 boundary using deletion recursion."""
    order = 15
    allmask = (1 << order) - 1
    tree_count = root_count = cell_count = negative = zero_count = 0
    minimum = None
    minimum_witness = None
    stream = hashlib.sha256()
    for tree_index, source in enumerate(nx.nonisomorphic_trees(order)):
        tree = nx.convert_node_labels_to_integers(source, ordering="sorted")
        adjacency, edges = adjacency_rows(tree)
        memo = {0: (1,)}
        whole0, whole1 = zero_one_rows_dp(adjacency, edges, allmask, memo)
        tree_count += 1
        for root in range(order):
            root_count += 1
            fmask = allmask ^ (1 << root)
            hmask = fmask & ~adjacency[root]
            f0, f1 = zero_one_rows_dp(adjacency, edges, fmask, memo)
            hpoly = independent_poly_mask(adjacency, hmask, memo)
            h0 = list(hpoly) + [0] * (order + 1 - len(hpoly))
            for target in range(4, order + 1):
                if not f0[target]:
                    continue
                coefficient, _ = raw_m1_from_rows(
                    whole0, whole1, f0, f1, h0, target
                )
                cell_count += 1
                if coefficient < 0:
                    negative += 1
                if coefficient == 0:
                    zero_count += 1
                if minimum is None or coefficient < minimum:
                    minimum = coefficient
                    minimum_witness = {
                        "tree_index": tree_index,
                        "graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
                        "root": root,
                        "target": target,
                        "coefficient": str(coefficient),
                    }
                stream.update(
                    f"{tree_index}|{root}|{target}|{coefficient}\n".encode("ascii")
                )
        if (tree_index + 1) % 500 == 0:
            print(
                "FINITE15_AUDIT", tree_index + 1, root_count, cell_count,
                flush=True,
            )
    assert tree_count == 7741
    assert root_count == 116115
    assert negative == 0
    assert minimum is not None and minimum > 0
    return {
        "method": (
            "independence-polynomial vertex deletion plus the unique-edge "
            "identity E_F(x)=sum_uv x^2 I_(F-N[u]-N[v])(x)"
        ),
        "tree_order": order,
        "unlabelled_trees": tree_count,
        "roots": root_count,
        "supported_j4plus_cells": cell_count,
        "negative_coefficients": negative,
        "zero_coefficients": zero_count,
        "minimum_coefficient": str(minimum),
        "minimum_witness": minimum_witness,
        "audit_value_stream_sha256": stream.hexdigest().upper(),
    }


def literal_root_cells(tree, root, model, table, dp_context):
    order = len(tree)
    allmask = (1 << order) - 1
    fmask = allmask ^ (1 << root)
    hmask = allmask
    for vertex in {root, *tree.neighbors(root)}:
        hmask ^= 1 << vertex
    whole0, whole1 = rows_from_table(table, order, allmask)
    f0, f1 = rows_from_table(table, order, fmask)
    h0, _ = rows_from_table(table, order, hmask)
    adjacency, edges, memo = dp_context
    dp_whole0, dp_whole1 = zero_one_rows_dp(adjacency, edges, allmask, memo)
    dp_f0, dp_f1 = zero_one_rows_dp(adjacency, edges, fmask, memo)
    dp_hpoly = independent_poly_mask(adjacency, hmask, memo)
    dp_h0 = list(dp_hpoly) + [0] * (order + 1 - len(dp_hpoly))
    assert (whole0, whole1) == (dp_whole0, dp_whole1)
    assert (f0, f1) == (dp_f0, dp_f1)
    assert h0 == dp_h0
    Mv = order - 1
    d = tree.degree(root)
    S = Mv - d
    Evalue = sum(tree.degree(vertex) - 1 for vertex in tree.neighbors(root))
    B2 = sum(comb(degree - 1, 2) for _, degree in tree.degree())
    wedge = Mv - 1 + B2
    P = wedge - comb(d, 2) - Evalue
    a = f0[2]
    z2 = f1[3]
    h2 = h0[2]
    assert a == comb(Mv, 2) - S
    assert z2 == S * (Mv - 2) - 2 * P
    assert h2 == comb(S, 2) - (S - Evalue)

    xvalues = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    B3 = sum(comb(value, 3) for value in xvalues.values())
    product = sum(xvalues[left] * xvalues[right] for left, right in tree.edges())
    tau = B3 + product - (Mv - 2)
    if order >= 16:
        assert 3 * tau <= (Mv - 3) * B2

    records = []
    for target in range(4, len(f0)):
        b = f0[target]
        if not b:
            continue
        rho_value = Mv - target
        zj = f1[target + 1]
        hj = h0[target]
        assert 2 * a * zj <= target * b * z2
        yvalue = sy.Rational(hj, b)
        delta1, raw = raw_m1_from_rows(whole0, whole1, f0, f1, h0, target)
        p0, rr0, u0, c0, e0, A0, Q0 = raw[0]
        p1 = raw[1][0] - p0
        u1 = raw[1][2] - u0
        A1 = raw[1][5] - A0
        Q1 = raw[1][6] - Q0
        rebuilt = a * (
            (target + 1) * (A0 * u1 + A1 * u0 + A1 * u1)
            + p0 * Q1 + p1 * Q0 + p1 * Q1
        )
        assert rebuilt == delta1
        assert A0 >= 0 and A1 >= 0

        if rho_value > 0:
            U1floor = 1 + sy.Rational(target, rho_value + 1) + target * yvalue / rho_value
            U0floor = (
                sy.Rational(Mv - 2 * target + 3, target + 1)
                + sy.Rational(target - 1, target + 1) * yvalue
                + target * yvalue / rho_value
            )
            assert sy.Rational(u1, b) >= U1floor
            assert sy.Rational(u0, b) >= U0floor
            if order >= 16:
                assert 1 <= Evalue <= S or d == Mv
                if d < Mv:
                    assert comb(d - 1, 2) <= B2 <= (
                        comb(d - 1, 2) + comb(Evalue, 2) + comb(S - Evalue, 2)
                    )
                M, J, rho, D, E, Z, T, Y = model["symbols"]
                lower_value = model["lower"].subs({
                    J: target, rho: rho_value, D: d, E: Evalue,
                    Z: B2, Y: yvalue,
                })
                assert sy.Rational(delta1, a * b) >= lower_value
        else:
            # Supported rho=0 forces F edgeless, hence the marked star centre.
            assert d == Mv and delta1 >= 0
        records.append((target, delta1, yvalue))
    return records


def literal_replay(model):
    stream = []
    trees = roots = cells = large_cells = 0
    for order in range(5, 10):
        for index, source in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(source, ordering="sorted")
            table = subset_table(tree)
            adjacency, edges = adjacency_rows(tree)
            dp_context = (adjacency, edges, {0: (1,)})
            trees += 1
            for root in sorted(tree):
                rows = literal_root_cells(tree, root, model, table, dp_context)
                roots += 1
                cells += len(rows)
                stream.extend(f"small|{order}|{index}|{root}|{row}" for row in rows)

    rng = random.Random(9931401)
    order = 16
    family = [nx.path_graph(order), nx.star_graph(order - 1)]
    for _ in range(5):
        family.append(nx.from_prufer_sequence([
            rng.randrange(order) for _ in range(order - 2)
        ]))
    for index, source in enumerate(family):
        tree = nx.convert_node_labels_to_integers(source, ordering="sorted")
        table = subset_table(tree)
        adjacency, edges = adjacency_rows(tree)
        dp_context = (adjacency, edges, {0: (1,)})
        roots_to_check = sorted({
            0, order // 2, max(tree, key=tree.degree), min(tree, key=tree.degree)
        })
        trees += 1
        for root in roots_to_check:
            rows = literal_root_cells(tree, root, model, table, dp_context)
            roots += 1
            cells += len(rows)
            large_cells += len(rows)
            stream.extend(f"large|{order}|{index}|{root}|{row}" for row in rows)
    return {
        "trees": trees,
        "roots": roots,
        "supported_j4plus_cells": cells,
        "large_order16_cells": large_cells,
        "audit_value_stream_sha256": hashlib.sha256(
            "\n".join(stream).encode("ascii")
        ).hexdigest().upper(),
    }


def main():
    print("PHASE pins", flush=True)
    observed = {name: digest(BASE / name) for name in PINS}
    assert observed == PINS
    dependency_statuses = {
        "terminal_q3_anchor_ordering_independent_audit_20260828.json":
            "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT",
        "all_forest_q3_q2_component_lift_exact_root_20260829.json":
            "PASS_EXACT_SYMBOLIC_ALL_FOREST_Q3_Q2_LIFT_FROM_ALL_TREE_THEOREM",
        "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
            "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT",
        "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
            "PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS",
        "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
            "PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT",
    }
    for filename, expected in dependency_statuses.items():
        payload = json.loads((BASE / filename).read_text(encoding="utf-8"))
        assert payload["status"] == expected
    producer = json.loads(
        (BASE / "terminal_q3_low_newton_m1_j4plus_exact_agent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == (
        "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M1_J4_PLUS_STRONG_INDUCTION_STEP"
    )
    finite = json.loads(
        (BASE / "terminal_q3_low_newton_adversarial_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["status"] == (
        "PASS_EXACT_FINITE_AND_ADVERSARIAL_LOW_NEWTON_M0_M7_NO_NEGATIVES_NOT_ALL_ORDER"
    )
    assert finite["newton_degrees"]["1"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["1"]["minimum_coefficient"]) > 0
    assert finite["coverage"]["finite"]["trees"] == 13188
    assert finite["coverage"]["finite"]["roots"] == 188260

    print("PHASE model", flush=True)
    model = rebuild_model()
    structural = structural_audit(model)
    print("PHASE j5plus", flush=True)
    j5 = audit_j5plus(model)
    print("PHASE j4", flush=True)
    j4 = audit_j4(model)
    print("PHASE star_center", flush=True)
    star = audit_star_center(model)
    print("PHASE literal", flush=True)
    literal = literal_replay(model)
    print("PHASE finite15", flush=True)
    finite15 = finite_order15_replay()
    assert producer["j5plus"]["stream_records"] == j5["total_coefficients"] == 275
    assert producer["j4"]["stream_records"] == j4["total_coefficients"] == 418
    assert producer["star_center"]["stream_records"] == star["total_polynomials"] == 12

    report = {
        "schema": "terminal-q3-low-newton-m1-j4plus-independent-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J4_PLUS_STRONG_INDUCTION_STEP_AUDIT",
        "claim": (
            "Independent exact reconstruction confirms the tree-base terminal-q3 "
            "Newton m=1 coefficient for every supported target j>=4 and order "
            "n>=15 inside the stated noncircular strong-induction step."
        ),
        "scope_exclusions": [
            "Newton degree m=0",
            "general forest bases",
            "the full terminal payment",
            "unimodality",
            "Erdos Problem 993",
        ],
        "independence": (
            "No producer helper or stream is imported. The audit uses a midpoint "
            "identity for the quadratic B2 Bernstein row, a sequential tensor "
            "transform, direct affine substitution for the j=4 u-half cells, "
            "direct subset enumeration for literal rows, and a distinct vertex-"
            "deletion/unique-edge recurrence for every order-15 tree boundary row."
        ),
        "structural": structural,
        "j5plus": j5,
        "j4": j4,
        "star_center": star,
        "literal_replay": literal,
        "finite_boundary": {
            "fresh_order15_replay": finite15,
            "pinned_all_orders_through_15": {
                "unlabelled_trees": finite["coverage"]["finite"]["trees"],
                "roots": finite["coverage"]["finite"]["roots"],
                "m1_negative_coefficients": 0,
                "global_m1_minimum": finite["newton_degrees"]["1"]["minimum_coefficient"],
            },
        },
        "pins": observed,
        "dependency_statuses": dependency_statuses,
        "auditor_source": Path(__file__).name,
        "auditor_source_sha256": digest(Path(__file__)),
    }
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(payload, encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
