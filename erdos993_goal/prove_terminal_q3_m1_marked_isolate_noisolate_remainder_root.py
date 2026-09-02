#!/usr/bin/env python3
"""All-order terminal-q3 Newton m=1 for a marked isolate over a no-isolate remainder.

Let G=K1(w) disjoint_union R, where w is marked and every component of R is
nontrivial.  This script certifies the exact correlated lower for every
supported target j>=3.  It uses the smaller-forest q_j<=q_2 input in exactly
the same direction as the frozen general-forest m=1 certificates.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import build, C


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_marked_isolate_noisolate_remainder_exact_root_20260831.json"

PINS = {
    "derive_terminal_q3_m1_general_forest_agent.py":
        "348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C",
    "prove_all_forest_q3_q2_component_lift_root.py":
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json":
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
    "audit_all_forest_q3_q2_component_lift_independent_agent.py":
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815",
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D",
    "prove_terminal_q3_forest_anchor_lift_agent.py":
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D",
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json":
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF",
    "audit_terminal_q3_low_newton_m1_forest_finite_agent.py":
        "20F3FA5F42CB28D255CDC6F3D3CB3DD6E94FF384A056AC45858101E3A03FC1D4",
    "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json":
        "63E52E6956A2B1B84C79B5E5893097151A1ADFC357683345B13965AE4732F29A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    indices = list(itertools.product(*[range(degree + 1) for degree in degrees]))
    output = {index: sp.Integer(0) for index in indices}
    for powers, coefficient in polynomial.terms():
        for index in itertools.product(*[
            range(power, degrees[k] + 1) for k, power in enumerate(powers)
        ]):
            output[index] += coefficient * sp.prod(
                sp.binomial(index[k], powers[k]) / sp.binomial(degrees[k], powers[k])
                for k in range(len(variables))
            )
    return degrees, [sp.factor(output[index]) for index in indices]


@lru_cache(maxsize=1)
def exact_tests():
    numerator, denominator, mnum, mden, variables = build()
    j, r, h, d, Rroot, W, y = variables
    N = j + r

    # Marked root w is isolated: d=Rroot=0 and H=F, hence y=1.
    marked = {d: 0, Rroot: 0, y: 1}
    specialized = sp.expand(numerator.subs(marked))
    wpoly = sp.Poly(specialized, W)
    assert wpoly.degree() == 2
    w2 = sp.expand(wpoly.coeff_monomial(W**2))
    linear = sp.expand(specialized - w2*W**2)

    # If R has h nontrivial components, N vertices and N-h edges, then
    # Q=N-2h, Q<=W<=C(Q+1,2).  The lower is sum(n_i-2); the upper follows
    # by concentrating all edge excess in one star component.
    Q = N - 2*h
    Wlow = Q
    Whigh = C(Q + 1, 2)
    linear_low = sp.expand(linear.subs(W, Wlow))
    linear_high = sp.expand(linear.subs(W, Whigh))
    full_low = sp.expand(specialized.subs(W, Wlow))
    full_high = sp.expand(specialized.subs(W, Whigh))
    mcoefficient = sp.expand(mnum.subs(marked))

    expected_den = 12*r*(r + 1)*(N**2 - 3*N + 2*h)*(N**2 + N + 2*h + 2)
    assert sp.expand(denominator.subs(marked) - expected_den) == 0
    assert sp.expand(mden - 2*r*(r + 1)) == 0
    return variables, {
        "linear_W_low": linear_low,
        "linear_W_high": linear_high,
        "full_W_low": full_low,
        "full_W_high": full_high,
        "discarded_q32_reserve_coefficient": mcoefficient,
    }, expected_den


def cone_certificate():
    variables, tests, denominator = exact_tests()
    j, r, h, _d, _Rroot, _W, _y = variables
    E, u, w = sp.symbols("E u w", nonnegative=True)

    # Write q=r-h>=0.  Since N>=2h, h<=j+q.  The simplex map is
    # j=3+Ew, q=E(1-w), h=1+(E+2)u.
    substitution = {
        j: 3 + E*w,
        h: 1 + (E + 2)*u,
        r: 1 + (E + 2)*u + E*(1 - w),
    }

    records = {}
    stream = hashlib.sha256()
    total_bernstein = total_power = zeros = 0
    minimum_positive = None
    for name, expression in tests.items():
        transformed = sp.expand(expression.subs(substitution, simultaneous=True))
        degrees, coefficients = tensor_bernstein(transformed, (u, w))
        powers_all = []
        for index, coefficient in enumerate(coefficients):
            powers = sp.Poly(coefficient, E).all_coeffs()
            if not powers or any(value < 0 for value in powers):
                raise AssertionError((name, index, coefficient))
            powers_all.extend(powers)
            stream.update(f"{name}|{index}|{coefficient}\n".encode())
        positives = [value for value in powers_all if value > 0]
        if not positives:
            raise AssertionError((name, "no positive coefficient"))
        local_min = min(positives)
        minimum_positive = local_min if minimum_positive is None else min(
            minimum_positive, local_min
        )
        records[name] = {
            "degrees_u_w": list(degrees),
            "bernstein_coefficients": len(coefficients),
            "power_coefficients_in_E": len(powers_all),
            "zero_power_coefficients": sum(value == 0 for value in powers_all),
            "minimum_positive_power_coefficient": str(local_min),
        }
        total_bernstein += len(coefficients)
        total_power += len(powers_all)
        zeros += sum(value == 0 for value in powers_all)
        print(name, "PASS", len(coefficients), flush=True)

    transformed_denominator = sp.factor(
        denominator.subs(substitution, simultaneous=True)
    )
    return {
        "parameterization": (
            "E=(j-3)+(r-h)>=0; j=3+E*w; r-h=E*(1-w); "
            "h=1+(E+2)*u; 0<=u,w<=1"
        ),
        "domain_mapping": {
            "target": "j>=3",
            "support_component_bound": "r=N-j>=h",
            "no_isolate_order_bound": "N>=2h iff h<=j+(r-h)",
            "wedge_interval": "Q=N-2h; Q<=W<=C(Q+1,2)",
        },
        "denominator_after_mapping": str(transformed_denominator),
        "tests": records,
        "total_bernstein_coefficients": total_bernstein,
        "total_power_coefficients_in_E": total_power,
        "zero_power_coefficients": zeros,
        "minimum_positive_power_coefficient": str(minimum_positive),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
    }


def main():
    observed = {name: sha256(HERE / name) for name in PINS}
    if observed != PINS:
        raise AssertionError(("pinned dependency mismatch", observed, PINS))
    q32 = json.loads((HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json").read_text())
    anchor = json.loads((HERE / "terminal_q3_forest_anchor_lift_exact_agent_20260829.json").read_text())
    finite = json.loads((HERE / "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json").read_text())
    assert q32["status"] == "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    assert anchor["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_FOREST_BASE_ANCHOR_LIFT"
    assert finite["status"] == "PASS_DIRECT_CANONICAL_ALL_FOREST_M1_FINITE_ORDER13"
    certificate = cone_certificate()
    report = {
        "schema": "terminal-q3-m1-marked-isolate-noisolate-remainder-exact-root-v1",
        "date": "2026-08-31",
        "status": "PASS_EXACT_TERMINAL_Q3_M1_MARKED_ISOLATE_NOISOLATE_REMAINDER",
        "claim": (
            "Let G=K1(w) disjoint_union R, with w marked and every component of R "
            "nontrivial. For every supported j>=3, the canonical terminal-q3 Newton "
            "coefficient m=1 is nonnegative, conditional on the strictly-smaller-forest "
            "input q_j(R)<=q_2(R)."
        ),
        "exact_reduction": {
            "marked_root": "d=0, root-neighbor excess Rroot=0, H=F, y=1",
            "wedge_quadratic": (
                "Write the cleared lower as a*W^2+L(W), with L affine. Both "
                "endpoints of L and of the full quadratic are nonnegative. If a>=0, "
                "use a*W^2+L(W); if a<0, concavity puts the minimum at an endpoint."
            ),
            "reserve_use": (
                "The all-forest q3<=q2 reserve is discarded only after its exact "
                "coefficient is separately certified nonnegative."
            ),
        },
        "certificate": certificate,
        "finite_canonical_crosscheck": {
            "status": finite["status"],
            "maximum_G_order": finite["finite_census"]["maximum_G_order"],
            "supported_cells_all_j": finite["finite_census"]["supported_cells_all_j"],
            "minimum_m1": finite["finite_census"]["minimum_m1"],
        },
        "pins": PINS,
        "scope_guard": (
            "This theorem covers the supported marked-isolate lane after all other "
            "isolated components have been removed. Restoring permanent isolates, "
            "support activation, Newton m=0, and the final global assembly are separate."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
