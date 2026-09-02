#!/usr/bin/env python3
"""Exact ULC cone theorem for the rank-seven G1 sum-zero reduction.

This route is independent of the edge/wedge/tau moment producer.  It splits
the reduced quadratic by index sum and pays every outer product with the
sharp binomial-normalized log-concavity ratio.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT_SOURCE = HERE / "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py"
INPUT_SOURCE_SHA256 = "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D"
INPUT_REPORT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_REPORT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_ulc_cone_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ULC_CONE_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value-offset for offset in range(rank)) / sp.factorial(rank)


def main():
    assert sha256(INPUT_SOURCE) == INPUT_SOURCE_SHA256
    assert sha256(INPUT_REPORT) == INPUT_REPORT_SHA256
    source = json.loads(INPUT_REPORT.read_text(encoding="utf-8"))
    assert source["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G1_PARENT_MODES_RANK7_G4_PIECEWISE"

    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    expression = sp.expand(sp.sympify(
        source["modes"]["no_parent"]["expression"], locals=symbols
    ))
    shifts = {
        symbols[f"A{rank}"]: symbols[f"W{rank-1}"] for rank in range(4, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: symbols[f"W{rank-1}"] for rank in range(4, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: symbols[f"W{rank-2}"] for rank in range(5, 9)
    })
    reduced = sp.expand(expression.subs(shifts, simultaneous=True))
    w = {rank: symbols[f"W{rank}"] for rank in range(3, 9)}
    expected = sp.expand(
        8*w[3]**2 + 24*w[3]*w[4]
        - 64*w[3]*w[5] - 106*w[3]*w[6]
        - 51*w[3]*w[7] - 8*w[3]*w[8]
        + 80*w[4]**2 + 90*w[4]*w[5]
        - 12*w[4]*w[6] - 10*w[4]*w[7]
        + 39*w[5]**2 + 10*w[5]*w[6]
    )
    assert sp.expand(reduced-expected) == 0

    blocks = {
        "index_sum_6": 8*w[3]**2,
        "index_sum_7": 24*w[3]*w[4],
        "index_sum_8": 80*w[4]**2-64*w[3]*w[5],
        "index_sum_9": 90*w[4]*w[5]-106*w[3]*w[6],
        "index_sum_10": 39*w[5]**2-12*w[4]*w[6]-51*w[3]*w[7],
        "index_sum_11": 10*w[5]*w[6]-10*w[4]*w[7]-8*w[3]*w[8],
    }
    assert sp.expand(sum(blocks.values())-reduced) == 0

    degree = sp.Symbol("alpha", integer=True, positive=True)
    binomial = {rank: choose(degree, rank) for rank in range(3, 9)}
    ratios = {
        "W3W5_over_W4sq": sp.factor(binomial[3]*binomial[5]/binomial[4]**2),
        "W3W6_over_W4W5": sp.factor(binomial[3]*binomial[6]/(binomial[4]*binomial[5])),
        "W4W6_over_W5sq": sp.factor(binomial[4]*binomial[6]/binomial[5]**2),
        "W3W7_over_W5sq": sp.factor(binomial[3]*binomial[7]/binomial[5]**2),
        "W4W7_over_W5W6": sp.factor(binomial[4]*binomial[7]/(binomial[5]*binomial[6])),
        "W3W8_over_W5W6": sp.factor(binomial[3]*binomial[8]/(binomial[5]*binomial[6])),
    }
    expected_ratios = {
        "W3W5_over_W4sq": 4*(degree-4)/(5*(degree-3)),
        "W3W6_over_W4W5": 2*(degree-5)/(3*(degree-3)),
        "W4W6_over_W5sq": 5*(degree-5)/(6*(degree-4)),
        "W3W7_over_W5sq": 10*(degree-6)*(degree-5)/(21*(degree-4)*(degree-3)),
        "W4W7_over_W5W6": 5*(degree-6)/(7*(degree-4)),
        "W3W8_over_W5W6": 5*(degree-7)*(degree-6)/(14*(degree-4)*(degree-3)),
    }
    for label in ratios:
        assert sp.cancel(ratios[label]-expected_ratios[label]) == 0

    gaps = {
        "index_sum_8": sp.factor(80-64*ratios["W3W5_over_W4sq"]),
        "index_sum_9": sp.factor(90-106*ratios["W3W6_over_W4W5"]),
        "index_sum_10": sp.factor(
            39-12*ratios["W4W6_over_W5sq"]
            - 51*ratios["W3W7_over_W5sq"]
        ),
        "index_sum_11": sp.factor(
            10-10*ratios["W4W7_over_W5W6"]
            - 8*ratios["W3W8_over_W5W6"]
        ),
    }
    expected_gaps = {
        "index_sum_8": 16*(9*degree-11)/(5*(degree-3)),
        "index_sum_9": 2*(29*degree+125)/(3*(degree-3)),
        "index_sum_10": 3*(11*degree**2+173*degree-958)/(7*(degree-4)*(degree-3)),
        "index_sum_11": 20*(11*degree-45)/(7*(degree-4)*(degree-3)),
    }
    for label in gaps:
        assert sp.cancel(gaps[label]-expected_gaps[label]) == 0

    # Every numerator and denominator above is strictly positive for alpha>=8.
    tail = sp.Symbol("tail", nonnegative=True)
    positivity = {}
    for label, gap in gaps.items():
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(gap)))
        shifted_numerator = sp.Poly(numerator.subs(degree, tail+8), tail)
        shifted_denominator = sp.Poly(denominator.subs(degree, tail+8), tail)
        assert all(value > 0 for value in shifted_numerator.all_coeffs())
        assert all(value > 0 for value in shifted_denominator.all_coeffs())
        positivity[label] = {
            "gap": str(gap),
            "alpha8_shift_numerator": str(shifted_numerator.as_expr()),
            "alpha8_shift_denominator": str(shifted_denominator.as_expr()),
            "numerator_coefficients": [str(value) for value in shifted_numerator.all_coeffs()],
            "denominator_coefficients": [str(value) for value in shifted_denominator.all_coeffs()],
        }

    # Low degrees have truncated rows and are simpler.  Record the exact
    # nonnegative block payments that remain after W_k=0 for k>alpha.
    low_degree = {
        "alpha_0_2": "W3=...=W8=0, so R=0",
        "alpha_3": "R=8*W3^2",
        "alpha_4": "R=8*W3^2+24*W3*W4+80*W4^2",
        "alpha_5": "low positive blocks plus B8 paid by ULC; B9=90*W4*W5; B10=39*W5^2",
        "alpha_6": "B8,B9 use ULC; B10 uses only W4W6<=r46*W5^2; B11=10*W5*W6",
        "alpha_7": "B8,B9,B10 use ULC; B11 uses W4W7<=r47*W5W6 and W8=0",
    }
    assert gaps["index_sum_8"].subs(degree, 5) > 0
    assert gaps["index_sum_9"].subs(degree, 6) > 0
    partial_10_d6 = sp.factor(39-12*ratios["W4W6_over_W5sq"])
    partial_11_d7 = sp.factor(10-10*ratios["W4W7_over_W5W6"])
    assert partial_10_d6.subs(degree, 6) > 0
    assert gaps["index_sum_10"].subs(degree, 7) > 0
    assert partial_11_d7.subs(degree, 7) > 0

    report = {
        "marker": MARKER,
        "status": "PASS exact ULC cone theorem and max-degree-two forest application",
        "scope": "rank-seven G1, no-parent, nonadjacent common0/sum0 reduction",
        "sum0_shifts": {
            "A_k": "W_(k-1)", "B_k": "W_(k-1)", "Z_k": "W_(k-2)"
        },
        "reduced_expression": str(sp.factor(reduced)),
        "index_sum_blocks": {label: str(value) for label, value in blocks.items()},
        "ULC_definition": (
            "For degree alpha, q_k=W_k/C(alpha,k) is log-concave. "
            "Monotonicity of q_(k+1)/q_k gives each listed outer/inner product bound."
        ),
        "sharp_binomial_ratios": {label: str(value) for label, value in ratios.items()},
        "positive_block_gaps_alpha_ge_8": positivity,
        "low_degree_cases": low_degree,
        "theorem": (
            "Every finite nonnegative ultra-log-concave sequence W has R(W)>=0."
        ),
        "max_degree_two_application": {
            "component_structure": "Every max-degree<=2 forest is a disjoint union of paths.",
            "path_polynomial": "I(P_s;x)=sum_k C(s-k+1,k)x^k",
            "path_root_proof": (
                "At x=-1/(4*cos(theta)^2), the recurrence F_s=F_(s-1)+xF_(s-2) "
                "gives F_s=sin((s+2)theta)/((2cos(theta))^(s+1)sin(theta)); "
                "hence the roots theta=j*pi/(s+2) are all real and negative in x."
            ),
            "product": "Disjoint union multiplies independence polynomials, preserving real negative roots.",
            "Newton": "Newton inequalities make the coefficient sequence ULC.",
            "conclusion": "The rank-seven G1 common0/sum0 no-parent coefficient is nonnegative whenever the residual W forest has maximum degree at most 2, for every order.",
        },
        "scope_guard": (
            "This closes the ULC cone, including all max-degree<=2 residual forests. "
            "General branching forests need a separate case/coupling theorem."
        ),
        "pins": {
            "parent_mode_source": {"file": INPUT_SOURCE.name, "sha256": INPUT_SOURCE_SHA256},
            "parent_mode_report": {"file": INPUT_REPORT.name, "sha256": INPUT_REPORT_SHA256},
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "blocks": len(blocks),
        "ULC_gaps": {label: str(value) for label, value in gaps.items()},
        "max_degree_two_all_order": True,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
