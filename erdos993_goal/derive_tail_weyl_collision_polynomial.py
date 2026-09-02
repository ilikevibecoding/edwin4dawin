"""Derive the exact finite tail-Weyl collision polynomial.

This is the numerator of m_A(y)-m_H(y), where A is the final 3x3
Darboux tail and H is the final 2x2 adjacent-row tail.  Small fixed-order
specializations are factored first to expose any reusable structure.
"""

import argparse
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
R, U, V, C, Y = sp.symbols("r u v c y")


def load_symbolic(parity, r_value=None):
    local = {"r": R, "u": U, "v": V, "c": C}
    tail = json.loads((HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json").read_text())
    expr = json.loads((HERE / f"one_sided_darboux_{parity}_expression_cache_20260806.json").read_text())
    current = {k: sp.sympify(v, locals=local) for k, v in tail["current"].items()}
    adjacent = {k: sp.sympify(v, locals=local) for k, v in tail["adjacent"].items()}
    expressions = {k: sp.sympify(v, locals=local) for k, v in expr["expressions"].items()}
    if r_value is not None:
        current = {k: sp.cancel(v.subs(R, r_value)) for k, v in current.items()}
        adjacent = {k: sp.cancel(v.subs(R, r_value)) for k, v in adjacent.items()}
        expressions = {k: sp.cancel(v.subs(R, r_value)) for k, v in expressions.items()}
    q1 = expressions["current_penultimate_cholesky_pivot"]
    q2 = expressions["current_last_cholesky_pivot"]
    b0, b1 = current["b_previous"], current["terminal"]
    q0 = sp.cancel(b0 / (current["d_previous"] - q1))
    da = [sp.cancel(q0 + b0 / q0), sp.cancel(q1 + b1 / q1), q2]
    ba = [sp.cancel(q1 * b0 / q0), sp.cancel(q2 * b1 / q1)]
    dh = [adjacent["d_previous"], adjacent["d_last"]]
    bh = adjacent["terminal"]
    na = sp.cancel((Y - da[1]) * (Y - da[2]) - ba[1])
    qa = sp.cancel((Y - da[2]) * ((Y - da[1]) * (Y - da[0]) - ba[0]) - ba[1] * (Y - da[0]))
    nh = Y - dh[1]
    qh = sp.cancel((Y - dh[1]) * (Y - dh[0]) - bh)
    return sp.cancel(na * qh - nh * qa)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), required=True)
    parser.add_argument("--r", type=int)
    args = parser.parse_args()
    collision = load_symbolic(args.parity, args.r)
    numerator, denominator = sp.fraction(collision)
    polynomial = sp.Poly(sp.expand(numerator), Y, U, V, C)
    factored = sp.factor(numerator)
    record = {
        "parity": args.parity,
        "r_specialization": args.r,
        "degrees_y_u_v_c": [polynomial.degree(z) for z in (Y, U, V, C)],
        "term_count": len(polynomial.terms()),
        "factored_numerator": str(factored),
        "denominator": str(sp.factor(denominator)),
    }
    suffix = "symbolic" if args.r is None else f"r{args.r}"
    out = HERE / f"tail_weyl_collision_{args.parity}_{suffix}_20260806.json"
    out.write_text(json.dumps(record) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in record.items() if k != "factored_numerator"}, indent=2))
    print("factor_length", len(record["factored_numerator"]))


if __name__ == "__main__":
    main()
