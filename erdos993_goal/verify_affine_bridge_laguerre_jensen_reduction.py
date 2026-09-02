#!/usr/bin/env python3
"""Exact checks for the Laguerre--Jensen form of the affine reserve.

The identities certified here are all-order algebraic identities.  The
two-colour curvature sweep at the end is deliberately labelled finite
evidence for the remaining lemma; it is not used as a proof.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
HARD_SOURCE = ROOT / "affine_bridge_euler_transfer_blocks_probe_20260812.json"
OUTPUT = ROOT / "affine_bridge_laguerre_jensen_reduction_exact_20260812.json"

z, w, c, m, x, y = sp.symbols("z w c m x y")
GENS = (z, w, c, m, x)
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


def reserve_core(package: str, parity: int) -> sp.Poly:
    if package == "group":
        path = ROOT / (
            f"path_isolate_p4_group_integrand_stable_parity{parity}_"
            "terms_20260730.json"
        )
        monomial_key = "monomial_z_w_c_m_s_x"
    else:
        path = ROOT / (
            f"path_isolate_p4_bottom_pair_lift_integrand_parity{parity}_"
            "terms_20260801.json"
        )
        monomial_key = "monomial_z_w_m_s_x"

    slope: dict[tuple[int, ...], int] = {}
    for item in json.loads(path.read_text(encoding="utf-8"))["terms"]:
        powers = item[monomial_key]
        if not powers[-2]:
            continue
        exponent = (
            (powers[0], powers[1], powers[2], powers[3], powers[5])
            if package == "group"
            else (powers[0], powers[1], 0, powers[2], powers[4])
        )
        slope[exponent] = slope.get(exponent, 0) + int(item["coefficient"])

    # R=(slope*A)/(z+w).  Both families contain the common A^2 T^5,
    # which is moved into the outer exponents in the Laguerre formula.
    reserve = (
        sp.Poly.from_dict(slope, GENS, domain=sp.ZZ)
        * sp.Poly(A, *GENS, domain=sp.ZZ)
    ).exquo(sp.Poly(z + w, *GENS, domain=sp.ZZ))
    return reserve.exquo(sp.Poly(A**2 * T**5, *GENS, domain=sp.ZZ))


def laguerre_coefficient(N: int, exponent: int) -> sp.Expr:
    """[z^N](1+z)^exponent exp(yz), as an exact polynomial in y."""
    if N < 0:
        return sp.Integer(0)
    return sp.expand(
        sum(
            sp.Rational(choose(exponent, N - h), math.factorial(h)) * y**h
            for h in range(N + 1)
        )
    )


def atom_weighted_row(n: int, A0: int, B0: int, alpha: int, beta: int) -> list[int]:
    return [
        sum(
            choose(n, h)
            * choose(h, u)
            * choose(A0, alpha - u)
            * choose(B0, beta - h + u)
            for u in range(h + 1)
        )
        for h in range(n + 1)
    ]


def atom_weighted_value(
    n: int, A0: int, B0: int, alpha: int, beta: int, h: int
) -> int:
    return choose(n, h) * sum(
        choose(h, u)
        * choose(A0, alpha - u)
        * choose(B0, beta - h + u)
        for u in range(h + 1)
    )


def first_reflected_curvature_failure(row: list[int]):
    n = len(row) - 1
    curvature: list[Fraction | None] = [None] * (n + 1)
    for h in range(1, n):
        if row[h - 1] and row[h + 1]:
            curvature[h] = Fraction(
                row[h] * row[h], row[h - 1] * row[h + 1]
            )
    for i in range(1, n):
        for j in range(i + 2, n):
            if (
                i + j <= n - 2
                and curvature[i] is not None
                and curvature[j] is not None
                and curvature[i] < curvature[j]
            ):
                return i, j, curvature[i], curvature[j]
    return None


def fraction_record(value: Fraction, metadata: dict) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **metadata,
    }


def main() -> None:
    core_records = []
    cores = {}
    for package in ("group", "bottom"):
        first_core = None
        for parity in (0, 1):
            core = reserve_core(package, parity)
            cores[package, parity] = core
            terms = core.terms()
            assert all(coefficient > 0 for _, coefficient in terms)
            minimum_degree = min(mon[0] + mon[1] for mon, _ in terms)
            minimum_layer = sp.expand(
                sum(
                    coefficient * z**mon[0] * w**mon[1] * m**mon[3]
                    for mon, coefficient in terms
                    if mon[0] + mon[1] == minimum_degree
                )
            )
            expected = 4 * z**2 * w**2 * (z**2 + w**2) * (
                z**2 + z * w + w**2
            )
            if package == "bottom":
                expected *= z + w
            assert sp.expand(minimum_layer - expected) == 0
            if first_core is None:
                first_core = core
            elif package == "group":
                assert core == first_core
            core_records.append(
                {
                    "package": package,
                    "parity": parity,
                    "term_count": len(terms),
                    "minimum_total_degree": minimum_degree,
                    "maximum_total_degree": max(
                        mon[0] + mon[1] for mon, _ in terms
                    ),
                    "minimum_layer_factorization": str(sp.factor(minimum_layer)),
                }
            )

    # Phi_(N,E)(y)=[z^N](1+z)^E exp(yz)=L_N^(E-N)(-y).
    laguerre_checks = 0
    for exponent in range(0, 13):
        for N in range(0, 19):
            direct = laguerre_coefficient(N, exponent)
            classical = sp.expand(sp.assoc_laguerre(N, exponent - N, -y))
            assert sp.expand(direct - classical) == 0
            laguerre_checks += 1

    # Check the two-colour coefficient/Jensen identity independently of
    # SymPy's Laguerre implementation.
    atom_identity_checks = 0
    for n in range(0, 9):
        for A0 in range(0, 8):
            for B0 in range(0, 8):
                for alpha in range(0, A0 + 1):
                    for beta in range(0, B0 + 1):
                        product = sp.Poly(
                            laguerre_coefficient(alpha, A0)
                            * laguerre_coefficient(beta, B0),
                            y,
                        )
                        direct = atom_weighted_row(n, A0, B0, alpha, beta)
                        for h, value in enumerate(direct):
                            coefficient = product.coeff_monomial(y**h)
                            assert value == math.prod(range(n - h + 1, n + 1)) * coefficient
                            atom_identity_checks += 1

    # Exact hard-record audit of the stronger reserve statement which is
    # sufficient for every reflected K comparison once n>=2t+4:
    # K_i>=K_j for gap >=2 and i+j<=n-2.
    hard = json.loads(HARD_SOURCE.read_text(encoding="utf-8"))
    hard_checks = 0
    hard_minimum = None
    hard_minimum_metadata = None
    for record in hard["records"]:
        metadata = {
            key: value for key, value in record.items() if key != "orders"
        }
        for order in record["orders"]:
            n = order["r"] + 1
            weighted = [
                choose(n, h) * layer["rho_h"]
                for h, layer in enumerate(order["layers"])
            ]
            ratios = [None] + [
                Fraction(weighted[h], weighted[h - 1])
                if weighted[h - 1]
                else None
                for h in range(1, n + 1)
            ]
            curvature = [None] + [
                ratios[h] / ratios[h + 1]
                if ratios[h] is not None and ratios[h + 1] is not None
                else None
                for h in range(1, n)
            ] + [None]
            for i in range(1, n):
                for j in range(i + 2, n):
                    if i + j > n - 2:
                        continue
                    if curvature[i] is None or curvature[j] is None:
                        continue
                    quotient = curvature[i] / curvature[j]
                    assert quotient >= 1
                    hard_checks += 1
                    if hard_minimum is None or quotient < hard_minimum:
                        hard_minimum = quotient
                        hard_minimum_metadata = {
                            **metadata,
                            "k": order["r"],
                            "i": i,
                            "j": j,
                        }

    # Finite evidence for the clean two-colour lemma suggested by the exact
    # reduction.  The high-degree hypothesis is alpha+beta>=2n-2.
    atom_curvature_checks = 0
    atom_adjacent_left_half_checks = 0
    for n in range(4, 11):
        for alpha in range(0, 2 * n + 1):
            for beta in range(0, 2 * n + 1):
                if alpha + beta < 2 * n - 2:
                    continue
                for A0 in range(alpha, alpha + 8):
                    for B0 in range(beta, beta + 8):
                        row = atom_weighted_row(n, A0, B0, alpha, beta)
                        if not all(row):
                            continue
                        assert first_reflected_curvature_failure(row) is None
                        atom_curvature_checks += 1
                        curvature = [None] + [
                            Fraction(
                                row[h] * row[h], row[h - 1] * row[h + 1]
                            )
                            for h in range(1, n)
                        ] + [None]
                        for h in range(1, (n - 2) // 2 + 1):
                            assert curvature[h] >= curvature[h + 1]
                            atom_adjacent_left_half_checks += 1

    # The degree condition is substantive, not a generic Laguerre-product
    # theorem.  This exact lower-degree cell fails K_4>=K_6.
    counterexample = {
        "n": 12,
        "A": 5,
        "B": 20,
        "alpha": 1,
        "beta": 11,
    }
    counterexample_row = atom_weighted_row(
        counterexample["n"],
        counterexample["A"],
        counterexample["B"],
        counterexample["alpha"],
        counterexample["beta"],
    )
    failure = first_reflected_curvature_failure(counterexample_row)
    assert failure is not None and failure[:2] == (4, 6)

    # The high-degree condition does not rescue a single atom all-order.
    # This one-colour specialization has alpha+beta=2n-2 but fails the
    # adjacent left-half comparison K_15>=K_16 by a tiny exact amount.
    high_degree_atom_counterexample = {
        "n": 32,
        "A": 489,
        "B": 0,
        "alpha": 62,
        "beta": 0,
        "h": 15,
    }
    hd_row = atom_weighted_row(
        high_degree_atom_counterexample["n"],
        high_degree_atom_counterexample["A"],
        high_degree_atom_counterexample["B"],
        high_degree_atom_counterexample["alpha"],
        high_degree_atom_counterexample["beta"],
    )
    hd_h = high_degree_atom_counterexample["h"]
    hd_k0 = Fraction(
        hd_row[hd_h] ** 2, hd_row[hd_h - 1] * hd_row[hd_h + 1]
    )
    hd_k1 = Fraction(
        hd_row[hd_h + 1] ** 2, hd_row[hd_h] * hd_row[hd_h + 2]
    )
    assert hd_k0 == Fraction(1020672, 882895)
    assert hd_k1 == Fraction(1507713, 1304192)
    assert hd_k0 < hd_k1

    # A surviving all-order subcase.  For a one-colour atom, write
    # n=2h+2+s, alpha=2n-2+r, A=alpha+t.  The numerator of K_h-K_(h+1)
    # is C0+C2*t*(t+2h+2).  Its values at t=0 and t=2h are
    # coefficientwise positive in h,s,r.  Since the quadratic is monotone
    # on t>=0 according to the sign of C2, both endpoint signs prove the
    # inequality throughout 0<=t<=2h+29s.
    hh, ss, rr, tt = sp.symbols("hh ss rr tt", nonnegative=True)
    nn = 2 * hh + 2 + ss
    aa = 2 * nn - 2 + rr

    def one_colour_curvature(index):
        return sp.factor(
            (index + 1)
            * (nn - index + 1)
            * (aa - index + 1)
            * (tt + index + 1)
            / (
                index
                * (nn - index)
                * (aa - index)
                * (tt + index)
            )
        )

    one_colour_difference = sp.factor(
        one_colour_curvature(hh) - one_colour_curvature(hh + 1)
    )
    one_colour_numerator, one_colour_denominator = sp.fraction(
        one_colour_difference
    )
    one_colour_polynomial = sp.Poly(sp.expand(one_colour_numerator), tt)
    one_colour_c2 = one_colour_polynomial.coeff_monomial(tt**2)
    one_colour_c1 = one_colour_polynomial.coeff_monomial(tt)
    one_colour_c0 = one_colour_polynomial.coeff_monomial(1)
    assert sp.expand(one_colour_c1 - 2 * (hh + 1) * one_colour_c2) == 0
    endpoint_zero = sp.Poly(sp.expand(one_colour_c0), hh, ss, rr)
    endpoint_two_h = sp.Poly(
        sp.expand(one_colour_numerator.subs(tt, 2 * hh)), hh, ss, rr
    )
    endpoint_wide_room = sp.Poly(
        sp.expand(one_colour_numerator.subs(tt, 2 * hh + 29 * ss)),
        hh,
        ss,
        rr,
    )
    assert all(coefficient > 0 for _, coefficient in endpoint_zero.terms())
    assert all(coefficient > 0 for _, coefficient in endpoint_two_h.terms())
    assert all(coefficient > 0 for _, coefficient in endpoint_wide_room.terms())

    # Allow the Laguerre degree to fall below 2n-2 by at most the left-half
    # room s.  Put alpha=2n-2+(q-s), q>=0.  The same endpoint proof works
    # through total excess t=2h+28s.
    qq = sp.symbols("qq", nonnegative=True)
    degree_room_numerator = sp.expand(one_colour_numerator.subs(rr, qq - ss))
    degree_room_endpoint_zero = sp.Poly(
        degree_room_numerator.subs(tt, 0), hh, ss, qq
    )
    degree_room_endpoint_wide = sp.Poly(
        degree_room_numerator.subs(tt, 2 * hh + 28 * ss), hh, ss, qq
    )
    assert all(
        coefficient > 0
        for _, coefficient in degree_room_endpoint_zero.terms()
    )
    assert all(
        coefficient > 0
        for _, coefficient in degree_room_endpoint_wide.terms()
    )
    expected_denominator = (
        hh
        * (hh + 1)
        * (hh + tt)
        * (ss + hh + 1)
        * (ss + hh + 2)
        * (hh + tt + 1)
        * (2 * ss + 3 * hh + rr + 1)
        * (2 * ss + 3 * hh + rr + 2)
    )
    assert sp.expand(one_colour_denominator - expected_denominator) == 0

    # Reconstruct one genuine path point atom by atom and verify the exact
    # mixture closure/covariance identity.  This sample deliberately has
    # both atomwise failures and positive covariance, while the full mixture
    # still has decreasing adjacent curvature.
    path_record = next(
        record
        for record in hard["records"]
        if record["package"] == "group"
        and record["parity"] == 0
        and record["c"] == 30
        and record["m"] == 3
        and record["x"] == 0
    )
    path_n = 32
    path_h = 15
    path_order = path_record["orders"][path_n - 1]
    source_coefficients = defaultdict(int)
    for monomial, coefficient in cores["group", 0].terms():
        p, q, c_power, m_power, x_power = monomial
        specialized = (
            int(coefficient)
            * path_record["c"] ** c_power
            * path_record["m"] ** m_power
            * path_record["x"] ** x_power
        )
        source_coefficients[p, q] += specialized
    outer_a = 2 * path_record["c"] + path_record["m"] + path_record["x"] - 1
    outer_b = 2 * path_record["m"] + 1
    target = path_record["m"] + path_n + 4
    atoms = []
    for (p, q), coefficient in source_coefficients.items():
        if not coefficient:
            continue
        for v in range(outer_b + 1):
            alpha = target - p - v
            beta = target - q - outer_b + v
            if alpha < 0 or beta < 0:
                continue
            row = [
                atom_weighted_value(
                    path_n,
                    outer_a + v,
                    outer_a + outer_b - v,
                    alpha,
                    beta,
                    layer,
                )
                for layer in range(path_h - 1, path_h + 3)
            ]
            if row[0]:
                assert all(row)
                atoms.append((coefficient * choose(outer_b, v), row))
            else:
                # No atom is born inside this four-layer window.
                assert not any(row[1:])

    totals = [
        sum(weight * row[index] for weight, row in atoms)
        for index in range(4)
    ]
    expected = [
        choose(path_n, layer) * path_order["layers"][layer]["rho_h"]
        for layer in range(path_h - 1, path_h + 3)
    ]
    assert totals == expected
    mass = totals[0]

    def expectation(function):
        return sum(
            Fraction(weight * row[0], mass)
            * function(
                [Fraction(row[index], row[index - 1]) for index in range(1, 4)]
            )
            for weight, row in atoms
        )

    atom_failure_count = sum(
        1
        for _, row in atoms
        if Fraction(row[1], row[0]) * Fraction(row[3], row[2])
        < Fraction(row[2], row[1]) ** 2
    )
    mean_x = expectation(lambda ratios: ratios[0])
    mean_y = expectation(lambda ratios: ratios[1])
    mean_xy = expectation(lambda ratios: ratios[0] * ratios[1])
    mean_xyz = expectation(lambda ratios: math.prod(ratios))
    covariance = mean_xy - mean_x * mean_y
    atom_defect_reserve = expectation(
        lambda ratios: ratios[1]
        * (ratios[0] * ratios[2] - ratios[1] ** 2)
    )
    cubic_jensen_reserve = (
        expectation(lambda ratios: ratios[1] ** 3) - mean_y ** 3
    )
    closure_left = mean_x ** 3 * (
        atom_defect_reserve + cubic_jensen_reserve
    )
    closure_right = mean_xy ** 3 - (mean_x * mean_y) ** 3
    closure_slack = mean_x ** 3 * mean_xyz - mean_xy ** 3
    assert atom_failure_count == 82
    assert covariance > 0
    assert closure_left - closure_right == closure_slack > 0
    path_k0 = Fraction(totals[1] ** 2, totals[0] * totals[2])
    path_k1 = Fraction(totals[2] ** 2, totals[1] * totals[3])
    assert path_k0 > path_k1

    # Support audit for every reflected left window in the hard records.
    # This determines exactly where the clean mixture law needs the boundary
    # inflow terms b1,b2,b3.  No atom dies inside any required window.
    required_left_windows = 0
    birth_windows = 0
    birth_atom_window_incidences = 0
    death_windows = 0
    death_atom_window_incidences = 0
    active_atom_window_incidences = 0
    defect_room_failures = 0
    capacity_room_failures = 0
    maximum_capacity_room_slope = 0
    birth_window_minimum_quotient = None
    birth_window_minimum_metadata = None
    for record in hard["records"]:
        package = record["package"]
        parity = record["parity"]
        c_value = record.get("c", 0)
        m_value = record["m"]
        x_value = record["x"]
        source_coefficients = defaultdict(int)
        for monomial, coefficient in cores[package, parity].terms():
            p, q, c_power, m_power, x_power = monomial
            specialized = (
                int(coefficient)
                * c_value**c_power
                * m_value**m_power
                * x_value**x_power
            )
            source_coefficients[p, q] += specialized
        if package == "group":
            outer_a = 2 * c_value + m_value + x_value - 1
            outer_b = 2 * m_value + parity + 1
        else:
            outer_a = m_value + x_value - 1
            outer_b = 2 * m_value + parity
        for order in record["orders"]:
            if not order["negative_h"]:
                continue
            terminal_negative = max(order["negative_h"])
            if terminal_negative < 3:
                continue
            n = order["r"] + 1
            target = m_value + n + 4
            for ell in range(1, terminal_negative - 1):
                h = terminal_negative - ell - 1
                required_left_windows += 1
                births = 0
                deaths = 0
                for (p, q), coefficient in source_coefficients.items():
                    if not coefficient:
                        continue
                    for v in range(outer_b + 1):
                        alpha = target - p - v
                        beta = target - q - outer_b + v
                        if alpha < 0 or beta < 0:
                            continue
                        support_low = max(0, alpha - (outer_a + v)) + max(
                            0, beta - (outer_a + outer_b - v)
                        )
                        support_high = alpha + beta
                        if support_low <= h - 1 <= support_high:
                            active_atom_window_incidences += 1
                            minimum_source_degree = 8 if package == "group" else 9
                            source_defect = p + q - minimum_source_degree
                            room = n - 2 * h - 2
                            if source_defect > room - 1:
                                defect_room_failures += 1
                            total_excess = (
                                2 * outer_a + outer_b - alpha - beta
                            )
                            if total_excess > 2 * h + 28 * room:
                                capacity_room_failures += 1
                            if room:
                                capacity_slope = max(
                                    0,
                                    (total_excess - 2 * h + room - 1) // room,
                                )
                                maximum_capacity_room_slope = max(
                                    maximum_capacity_room_slope,
                                    capacity_slope,
                                )
                        if support_low in (h, h + 1, h + 2):
                            births += 1
                        if support_high in (h - 1, h, h + 1):
                            deaths += 1
                if births:
                    birth_windows += 1
                    birth_atom_window_incidences += births
                    weighted = [
                        choose(n, layer) * order["layers"][layer]["rho_h"]
                        for layer in range(h - 1, h + 3)
                    ]
                    if all(weighted):
                        quotient = Fraction(
                            weighted[1] ** 3 * weighted[3],
                            weighted[0] * weighted[2] ** 3,
                        )
                        assert quotient >= 1
                        if (
                            birth_window_minimum_quotient is None
                            or quotient < birth_window_minimum_quotient
                        ):
                            birth_window_minimum_quotient = quotient
                            birth_window_minimum_metadata = {
                                "package": package,
                                "parity": parity,
                                "c": c_value if package == "group" else None,
                                "m": m_value,
                                "x": x_value,
                                "n": n,
                                "terminal_negative": terminal_negative,
                                "h": h,
                                "birth_atom_count": births,
                            }
                if deaths:
                    death_windows += 1
                    death_atom_window_incidences += deaths

    assert required_left_windows == 953
    assert birth_windows == 209
    assert birth_atom_window_incidences == 28620
    assert death_windows == 0
    assert death_atom_window_incidences == 0
    assert active_atom_window_incidences == 4062983
    assert defect_room_failures == 0
    assert capacity_room_failures == 0
    assert maximum_capacity_room_slope == 11
    assert birth_window_minimum_metadata == {
        "package": "bottom",
        "parity": 1,
        "c": None,
        "m": 20,
        "x": 40,
        "n": 43,
        "terminal_negative": 8,
        "h": 6,
        "birth_atom_count": 14,
    }

    report = {
        "status": "PASS_AFFINE_BRIDGE_LAGUERRE_JENSEN_REDUCTION",
        "all_order_identities": {
            "exponential_diagonal": (
                "C_D(y)=[z^D w^D]XR exp(y(z+w)); "
                "[y^h]C_D=rho_h/h!"
            ),
            "jensen_transform": (
                "binom(n,h)rho_h=n^(falling h)[y^h]C_D, so the weighted "
                "reserve polynomial is the degree-n Jensen polynomial of C_D"
            ),
            "laguerre_atom": (
                "[z^N](1+z)^E exp(yz)=L_N^(E-N)(-y)"
            ),
            "two_colour_expansion": (
                "For source z^p w^q and T-branch v, the summand is "
                "binom(b,v)L_(D-p-v)^(a-D+p+2v)(-y) "
                "L_(D-q-b+v)^(a+2b-D+q-2v)(-y)"
            ),
            "reserve_degree": (
                "After extracting A^2T^5, min core degree is 8 (group) "
                "or 9 (bottom); with adjusted T exponent this gives "
                "deg C_D=2n-parity-1 in both packages"
            ),
        },
        "reserve_core_records": core_records,
        "laguerre_identity_check_count": laguerre_checks,
        "atom_jensen_identity_coefficient_check_count": atom_identity_checks,
        "hard_global_reflected_curvature_check_count": hard_checks,
        "hard_global_reflected_curvature_minimum": fraction_record(
            hard_minimum, hard_minimum_metadata
        ),
        "finite_two_colour_high_degree_curvature_check_count": atom_curvature_checks,
        "finite_two_colour_adjacent_left_half_check_count": (
            atom_adjacent_left_half_checks
        ),
        "finite_two_colour_scope": (
            "4<=n<=10, 0<=alpha,beta<=2n, alpha+beta>=2n-2, "
            "alpha<=A<=alpha+7, beta<=B<=beta+7"
        ),
        "lower_degree_counterexample": {
            **counterexample,
            "degree_alpha_plus_beta": counterexample["alpha"]
            + counterexample["beta"],
            "row": counterexample_row,
            "failure_indices": list(failure[:2]),
            "K_i": fraction_record(failure[2], {}),
            "K_j": fraction_record(failure[3], {}),
        },
        "high_degree_single_atom_counterexample": {
            **high_degree_atom_counterexample,
            "degree_alpha_plus_beta": high_degree_atom_counterexample["alpha"]
            + high_degree_atom_counterexample["beta"],
            "K_h": fraction_record(hd_k0, {}),
            "K_h_plus_1": fraction_record(hd_k1, {}),
            "quotient": fraction_record(hd_k0 / hd_k1, {}),
        },
        "one_colour_moderate_capacity_theorem": {
            "statement": (
                "For h>=1, n=2h+2+s, alpha=2n-2+r, A=alpha+t, "
                "s,r>=0 and 0<=t<=2h+29s, the one-colour Jensen atom "
                "a_j=binom(n,j)binom(A,alpha-j) has K_h>=K_(h+1)."
            ),
            "difference_numerator": "C0+C2*t*(t+2h+2)",
            "endpoint_t_zero_positive_monomial_count": len(
                endpoint_zero.terms()
            ),
            "endpoint_t_two_h_positive_monomial_count": len(
                endpoint_two_h.terms()
            ),
            "endpoint_t_two_h_plus_29s_positive_monomial_count": len(
                endpoint_wide_room.terms()
            ),
            "minimum_endpoint_coefficient": int(min(
                min(coefficient for _, coefficient in endpoint_zero.terms()),
                min(coefficient for _, coefficient in endpoint_two_h.terms()),
                min(coefficient for _, coefficient in endpoint_wide_room.terms()),
            )),
            "proof": (
                "If C2>=0 the quadratic is increasing on t>=0 and its "
                "minimum is t=0; if C2<0 it is decreasing and its minimum "
                "on [0,2h+29s] is t=2h+29s.  Both needed endpoint "
                "polynomials are coefficientwise positive in h,s,r."
            ),
        },
        "one_colour_degree_defect_theorem": {
            "statement": (
                "For h>=1, n=2h+2+s, alpha=2n-2+q-s, A=alpha+t, "
                "s,q>=0 and 0<=t<=2h+28s, the one-colour Jensen atom "
                "has K_h>=K_(h+1)."
            ),
            "endpoint_t_zero_positive_monomial_count": len(
                degree_room_endpoint_zero.terms()
            ),
            "endpoint_t_two_h_plus_28s_positive_monomial_count": len(
                degree_room_endpoint_wide.terms()
            ),
            "minimum_endpoint_coefficient": int(min(
                min(
                    coefficient
                    for _, coefficient in degree_room_endpoint_zero.terms()
                ),
                min(
                    coefficient
                    for _, coefficient in degree_room_endpoint_wide.terms()
                ),
            )),
        },
        "actual_path_mixture_closure_audit": {
            "package": "group",
            "parity": 0,
            "c": 30,
            "m": 3,
            "x": 0,
            "n": path_n,
            "h": path_h,
            "active_atom_count": len(atoms),
            "atom_adjacent_curvature_failure_count": atom_failure_count,
            "consecutive_ratio_covariance_positive": covariance > 0,
            "mixture_adjacent_curvature_quotient_decimal": float(path_k0 / path_k1),
            "closure_left_over_covariance_penalty_decimal": float(
                closure_left / closure_right
            ),
            "exact_identity": (
                "K_h>=K_(h+1) iff E(x)^3 E(xyz)>=E(xy)^3; "
                "equivalently E(x)^3{E[y(xz-y^2)]+E(y^3)-E(y)^3} "
                ">=E(xy)^3-(E(x)E(y))^3"
            ),
        },
        "reflected_left_window_support_audit": {
            "required_window_count": required_left_windows,
            "clean_active_atom_window_count": required_left_windows - birth_windows,
            "birth_window_count": birth_windows,
            "birth_atom_window_incidence_count": birth_atom_window_incidences,
            "death_window_count": death_windows,
            "death_atom_window_incidence_count": death_atom_window_incidences,
            "active_atom_window_incidence_count": active_atom_window_incidences,
            "source_defect_exceeds_room_failure_count": defect_room_failures,
            "total_excess_exceeds_two_h_plus_28_room_failure_count": (
                capacity_room_failures
            ),
            "maximum_observed_total_excess_room_slope": (
                maximum_capacity_room_slope
            ),
            "birth_window_minimum_adjacent_curvature_quotient": fraction_record(
                birth_window_minimum_quotient,
                birth_window_minimum_metadata,
            ),
            "boundary_inflow_identity": (
                "With b1,b2,b3 the normalized later-support contributions, "
                "K_h>=K_(h+1) iff (E(x)+b1)^3(E(xyz)+b3) "
                ">=(E(xy)+b2)^3."
            ),
        },
        "scope_warning": (
            "The Laguerre/Jensen representation and degree calculation are "
            "all-order identities, as is the mixture closure equation.  The "
            "two-colour curvature sweep, hard-record sweep, and actual-path "
            "mixture audit are exact finite evidence, not an all-order proof "
            "of reflected curvature for the positive source mixture."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "laguerre_identity_check_count": laguerre_checks,
        "atom_jensen_identity_coefficient_check_count": atom_identity_checks,
        "hard_global_reflected_curvature_check_count": hard_checks,
        "finite_two_colour_high_degree_curvature_check_count": atom_curvature_checks,
        "finite_two_colour_adjacent_left_half_check_count": (
            atom_adjacent_left_half_checks
        ),
        "output": OUTPUT.name,
        "sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
    }, indent=2))


if __name__ == "__main__":
    main()
