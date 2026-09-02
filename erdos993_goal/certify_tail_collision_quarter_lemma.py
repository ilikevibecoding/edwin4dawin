"""Exact Bernstein certificate for the finite tail-collision quarter lemma.

Each rational ingredient is cleared into a numerator and denominator.
For u,v in [0,1], the coefficients are converted to the tensor Bernstein
basis.  The coefficient of c^k is simultaneously the Bernstein coefficient
after compactifying c=t/(1-t) and homogenizing to the full c-degree.  Every
remaining coefficient is certified on r>=0 by nonnegative power
coefficients.  Zero controls are retained explicitly.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_tail_collision_quarter_lemma import C, R, U, V, iter_ingredients, load_values
from prove_one_sided_adjacent_cubic_darboux_inertia import bernstein_uv_coefficients
from prove_two_outlier_one_negative_factor import positive_rational_on_nonnegative_axis


HERE = Path(__file__).resolve().parent


def digest_controls(controls):
    payload = ";".join(f"{index}:{sp.cancel(value)}" for index, value in controls)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def certify_polynomial(value: sp.Expr):
    value = sp.expand(value)
    polynomial = sp.Poly(value, U, V, C, domain=sp.QQ.frac_field(R))
    _, controls = bernstein_uv_coefficients(value, R, U, V, C)
    zero_indices = []
    certificates = []
    for index, coefficient in controls:
        coefficient = sp.cancel(coefficient)
        if coefficient == 0:
            zero_indices.append(list(index))
            continue
        certificate = positive_rational_on_nonnegative_axis(coefficient, R)
        certificates.append(
            {
                "index_u_v_c": list(index),
                "numerator_digest": certificate["numerator_digest"],
                "denominator_digest": certificate["denominator_digest"],
                "numerator_degree_r": len(certificate["numerator_coefficients_descending"]) - 1,
                "denominator_degree_r": len(certificate["denominator_coefficients_descending"]) - 1,
            }
        )
    return {
        "degrees_u_v_c": [polynomial.degree(variable) for variable in (U, V, C)],
        "power_term_count": len(polynomial.terms()),
        "bernstein_control_count": len(controls),
        "strictly_positive_control_count": len(certificates),
        "zero_control_indices": zero_indices,
        "control_digest": digest_controls(controls),
        "controls": certificates,
    }


def certify_rational(value: sp.Expr):
    numerator, denominator = sp.fraction(sp.cancel(value))
    numerator_record = certify_polynomial(numerator)
    denominator_record = certify_polynomial(denominator)
    assert denominator_record["strictly_positive_control_count"] == denominator_record["bernstein_control_count"]
    return {
        "numerator": numerator_record,
        "denominator": denominator_record,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--r", type=int)
    parser.add_argument(
        "--skip-lower-square-gap",
        action="store_true",
        help="Checkpoint every independent ingredient without forming the large square gap.",
    )
    parser.add_argument(
        "--skip-interval-controls",
        action="store_true",
        help="Checkpoint the structural signs and scaling factors only.",
    )
    args = parser.parse_args()
    suffix = "exact" if args.r is None else f"r{args.r}_exact"
    output = HERE / f"tail_collision_quarter_lemma_{args.parity}_{suffix}_20260806.json"
    if output.exists():
        previous = json.loads(output.read_text(encoding="utf-8"))
        if (
            previous.get("status") == "IN_PROGRESS"
            and previous.get("parity") == args.parity
            and previous.get("r_specialization") == args.r
        ):
            report = previous
        else:
            report = {}
    else:
        report = {}
    if not report:
        report = {
            "status": "IN_PROGRESS",
            "parity": args.parity,
            "r_specialization": args.r,
            "method": (
                "Tensor Bernstein in u,v and compactified c=t/(1-t); each nonzero "
                "control has a nonnegative-power rational certificate in r."
            ),
            "records": {},
        }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("loading exact tail values", flush=True)
    values = load_values(args.parity, args.r)
    print("tail values loaded", flush=True)
    skip_names = set(report["records"])
    if args.skip_lower_square_gap:
        skip_names.add("lower_tail_square_gap")
    if args.skip_interval_controls:
        skip_names.update(f"quarter_interval_bernstein_{index}" for index in range(4))
    for name, value in iter_ingredients(values, skip_names=skip_names):
        if name in report["records"]:
            print(f"reusing {name}", flush=True)
            continue
        print(f"certifying {name}", flush=True)
        report["records"][name] = certify_rational(value)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    required_names = {
        "delta",
        "d1_minus_a2",
        "d1_inside_trailing_spectrum",
        "trailing_trace_gap",
        "lower_tail_square_gap",
        "z_minus_a1_scaled",
        "z_minus_a2_scaled",
        "z_characteristic_scaled",
        "quarter_interval_scale_d0",
        "quarter_interval_scale_d1",
        "quarter_interval_scale_d2",
        *(f"quarter_interval_bernstein_{index}" for index in range(4)),
    }
    if not required_names.issubset(report["records"]):
        report["status"] = "IN_PROGRESS"
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(output, flush=True)
        return
    report["status"] = "EXACT_TAIL_COLLISION_QUARTER_LEMMA_INGREDIENTS"
    report["logical_implication"] = (
        "The certified signs give delta>=0, d1>a2, lambda1(B)<d1<lambda2(B), "
        "lambda1(B)<lambda1(H), and z=d1+f/delta to the right of lambda2(B) "
        "(with the delta=0 case immediate).  Hence an equal-tail-inertia "
        "collision on the lower interval is below both tail ground roots, "
        "while the upper equal-count interval contains no Weyl collision.  "
        "The three positive interval scaling factors and four positive scaled "
        "cubic Bernstein controls exclude a collision on "
        "[1/4,a2].  Therefore every equal-tail-inertia collision is a tail "
        "ground-branch collision below 1/4."
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(output, flush=True)


if __name__ == "__main__":
    main()
