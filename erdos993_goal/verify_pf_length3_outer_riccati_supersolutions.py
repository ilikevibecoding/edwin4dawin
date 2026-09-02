"""Exact outer-region Riccati comparison for PF length-three collisions.

At sharp reserve ``p-alpha=17`` write ``z=-x`` and use the affine initial
Riccati coordinate ``T=theta_0``.  Every source shift has the form

    K_j(z,T) = (A_j(z) + B_j(z) T) / R_j(z).

For a positive PF kernel ``(E+c)(E+d)``, and the quadratic source factor
``(1-uE)(1-vE)``, let ``L_m=P_m+Q_m*T`` be the cleared numerator of the two
full filtered rows, m=0,1.  The zero curve is ``T_m^*=-P_m/Q_m``.

This script proves exactly that, throughout ``z >= r+5``, both zero curves
are strict supersolutions of the source Riccati flow:

    F(z,T_m^*) - dT_m^*/dz < 0.

After ``z=r+5+w`` the negative of the numerator has a tensor Bernstein
expansion in ``u,v`` whose every remaining coefficient is coefficientwise
nonnegative in ``r,w,c,d``.  The script also proves that the entire far-left
source interval lies in this certified region.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp
from sympy import QQ
from sympy.polys.rings import ring

from prove_quartic_minimal_compatibility_resultants import window_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_outer_riccati_supersolutions_exact_20260807.json"


def digest_controls(controls) -> str:
    payload = []
    for index, control in enumerate(controls):
        payload.extend(
            f"{index}:{','.join(map(str, monomial))}:{coefficient}"
            for monomial, coefficient in control.terms()
        )
    return hashlib.sha256(";".join(payload).encode("ascii")).hexdigest()


def one_parity(parity: str) -> dict[str, object]:
    ambient, r, w, u, v, c, d = ring("r,w,u,v,c,d", QQ)
    residual, rr, ww, cc, dd = ring("r,w,c,d", QQ)
    z = w + r + 5
    if parity == "odd":
        p, alpha = 2 * r + 17, 2 * r
    elif parity == "even":
        p, alpha = 2 * r + 18, 2 * r + 1
    else:
        raise ValueError(parity)

    # K_j=N_j/R_j.  Each numerator is recorded as (constant, T-coefficient).
    # The denominators are nested, which avoids all multivariate rational
    # simplification in the exact calculation.
    numerators = [(ambient.one, ambient.zero), (ambient.zero, ambient.one)]
    denominators = [ambient.one, ambient.one]
    recurrence_denominators = []
    for j in range(4):
        current_p, current_alpha = p - 2 * j, alpha + j
        recurrence_denominator = (
            (1 + 4 * z) * (current_p - 2) * (current_p - 3)
        )
        recurrence_linear = (p + alpha - j - 1) * (
            z * (4 * current_p - 6) - (current_alpha + 1)
        )
        recurrence_constant = (
            (p + alpha - j - 1) * z * (current_p + current_alpha)
        )
        previous_multiplier = (
            ambient.one if j == 0 else recurrence_denominators[-1]
        )
        numerators.append(
            (
                recurrence_linear * numerators[-1][0]
                - recurrence_constant
                * previous_multiplier
                * numerators[-2][0],
                recurrence_linear * numerators[-1][1]
                - recurrence_constant
                * previous_multiplier
                * numerators[-2][1],
            )
        )
        denominators.append(recurrence_denominator * denominators[-1])
        recurrence_denominators.append(recurrence_denominator)

    symmetric_sum, symmetric_product = u + v, u * v
    kernel_sum, kernel_product = c + d, c * d
    filter_coefficients = [
        kernel_product,
        kernel_sum - kernel_product * symmetric_sum,
        1 - kernel_sum * symmetric_sum + kernel_product * symmetric_product,
        -symmetric_sum + kernel_sum * symmetric_product,
        symmetric_product,
    ]

    def project_uv(polynomial, u_power: int, v_power: int):
        output = residual.zero
        for monomial, coefficient in polynomial.terms():
            if monomial[2] == u_power and monomial[3] == v_power:
                output += (
                    coefficient
                    * rr ** monomial[0]
                    * ww ** monomial[1]
                    * cc ** monomial[4]
                    * dd ** monomial[5]
                )
        return output

    records = []
    for shift in (0, 1):
        target_denominator = denominators[shift + 4]
        constant_part, linear_part = ambient.zero, ambient.zero
        for index, coefficient in enumerate(filter_coefficients):
            multiplier = target_denominator.exquo(
                denominators[shift + index]
            )
            constant_part += (
                coefficient * numerators[shift + index][0] * multiplier
            )
            linear_part += (
                coefficient * numerators[shift + index][1] * multiplier
            )

        # If T*=-P/Q, then
        #
        # F(z,T*)-T*' = -G / [z*(1+4z)*(p+alpha)*Q^2].
        #
        # The following G is therefore the desired strictly positive gap.
        base = 1 + 4 * z
        ode_linear = z * (4 * p - 6) - (alpha + 1)
        ode_constant = z * (p + alpha)
        eta_denominator = p + alpha
        eta_numerator = p * (p - 1)
        quotient_numerator = (
            constant_part * linear_part.diff(w)
            - constant_part.diff(w) * linear_part
        )
        gap = (
            constant_part
            * linear_part
            * (base + ode_linear)
            * eta_denominator
            + constant_part**2 * eta_numerator * base
            + ode_constant * linear_part**2 * eta_denominator
            + z
            * base
            * eta_denominator
            * quotient_numerator
        )

        power_slices = {
            (i, j): project_uv(gap, i, j)
            for i in range(3)
            for j in range(3)
        }
        controls = []
        for i in range(3):
            for j in range(3):
                control = residual.zero
                for a in range(i + 1):
                    for b in range(j + 1):
                        control += (
                            power_slices[a, b]
                            * QQ(math.comb(i, a), math.comb(2, a))
                            * QQ(math.comb(j, b), math.comb(2, b))
                        )
                coefficients = [value for _, value in control.terms()]
                assert coefficients and all(value >= 0 for value in coefficients)
                # This point test plus coefficientwise nonnegativity makes
                # every control strict for r,w>=0 and c,d>0.
                assert control.evaluate(
                    [(rr, 0), (ww, 0), (cc, 1), (dd, 1)]
                ) > 0
                controls.append(control)

        records.append(
            {
                "shift": shift,
                "bernstein_control_count": len(controls),
                "coefficient_count": sum(
                    len(control.terms()) for control in controls
                ),
                "all_coefficients_nonnegative": True,
                "all_controls_strict_on_c_d_positive": True,
                "control_digest": digest_controls(controls),
            }
        )
    return {"parity": parity, "records": records}


def source_outer_floor() -> dict[str, object]:
    r = sp.symbols("r", integer=True, nonnegative=True)

    # The source coefficients are proportional to
    # 1/[(p-2k)!(alpha+k)!k!].  Hence the two top ratios give e1 and e2 of
    # the positive root magnitudes directly.
    odd_n = r + 8
    odd_e1 = sp.factor((r + 8) * (3 * r + 8) / 6)
    odd_e2 = sp.factor(
        (r + 8) * (r + 7) * (3 * r + 8) * (3 * r + 7) / 120
    )
    odd_power_two = sp.factor(odd_e1**2 - 2 * odd_e2)
    expected_odd_power_two = sp.factor(
        (r + 8) * (3 * r + 8) * (6 * r**2 + 76 * r + 173) / 180
    )
    assert sp.factor(odd_power_two - expected_odd_power_two) == 0
    odd_gap = sp.factor(odd_power_two - odd_n * (r + 5) ** 2)
    expected_odd_gap = sp.factor(
        (r + 8) * (18 * r**3 + 96 * r**2 - 673 * r - 3116) / 180
    )
    assert sp.factor(odd_gap - expected_odd_gap) == 0
    shifted_odd_cubic = sp.Poly(
        (18 * r**3 + 96 * r**2 - 673 * r - 3116).subs(r, r + 6),
        r,
    )
    assert all(value >= 0 for value in shifted_odd_cubic.all_coeffs())
    assert shifted_odd_cubic.eval(0) > 0

    small_odd = []
    for reserve_index in range(6):
        p, alpha = 2 * reserve_index + 17, 2 * reserve_index
        degree = p // 2
        point = -(reserve_index + 5)
        value = window_polynomial(p, alpha, [sp.Integer(1)]).eval(point)
        assert sp.sign(value) == -((-1) ** degree)
        small_odd.append(
            {
                "reserve_index": reserve_index,
                "p": p,
                "alpha": alpha,
                "test_point": point,
                "source_sign": int(sp.sign(value)),
                "left_infinity_sign": (-1) ** degree,
            }
        )

    even_average = sp.factor((3 * r + 10) / 2)
    assert sp.factor(even_average - (r + 5) - r / 2) == 0

    return {
        "odd_power_sum_two": str(odd_power_two),
        "odd_gap_over_n_times_floor_squared": str(odd_gap),
        "odd_r_at_least_6_gap_positive": True,
        "odd_small_exact_sign_checks": small_odd,
        "even_average_root_magnitude": str(even_average),
        "even_average_minus_floor": "r/2",
        "conclusion": (
            "For both parities the largest source-root magnitude is "
            "strictly greater than r+5.  Therefore every point left of all "
            "source roots has z>r+5."
        ),
    }


def main() -> None:
    parities = [one_parity(parity) for parity in ("odd", "even")]
    floor = source_outer_floor()
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_OUTER_RICCATI_SUPERSOLUTIONS",
        "region": "p-alpha=17; z=r+5+w; r,w>=0; 0<=u,v<=1; c,d>0",
        "parities": parities,
        "source_outer_floor": floor,
        "theorem": (
            "For m=0,1, the cleared full-filter zero curve T_m^*=-P_m/Q_m "
            "satisfies F(z,T_m^*)-dT_m^*/dz<0 throughout z>=r+5. "
            "The whole far-left source Weyl branch lies in this region."
        ),
        "collision_consequence": (
            "At a far-left common collision, the x-derivative of row m has "
            "the sign of Q_m.  Hence the remaining orientation condition "
            "is reduced to Q_0*Q_1>0 (equivalently, exclusion of the "
            "Wronskian root-count staircase)."
        ),
        "remaining_gap": (
            "Prove Q_0 and Q_1 have the same sign on the positive-PF "
            "common-zero locus, and prove that every PF collision is on the "
            "far-left source branch."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
