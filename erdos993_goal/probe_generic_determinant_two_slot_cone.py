"""Counterexample search for a generic two-slot determinant contraction.

Given a PSD pencil

    det(XI+A+z1 uu*+z2 vv*) = p+q1 z1+q2 z2+r z1 z2,

test the cone candidate

    S^d pp - S^(d-2)(q1q1+q2q2) + S^(d-4)rr.

If this fails while the defect-one target remains clean, the final theorem
must use its equal-single-slot and spectral-Rayleigh structure rather than a
generic determinant-input closure.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "generic_determinant_two_slot_cone_probe_20260804.json"
X, Y, z1, z2, t = sp.symbols("X Y z1 z2 t")


def S(expr, order: int):
    out = expr
    for _ in range(order):
        out = sp.diff(out, X) + sp.diff(out, Y)
    return sp.expand(out)


def determinant_states(diagonal, u, v):
    factors = [X + value for value in diagonal]
    p = sp.prod(factors)
    q1 = sum(
        sp.expand_complex(u[i] * sp.conjugate(u[i])) * sp.prod(factors[:i] + factors[i + 1 :])
        for i in range(len(diagonal))
    )
    q2 = sum(
        sp.expand_complex(v[i] * sp.conjugate(v[i])) * sp.prod(factors[:i] + factors[i + 1 :])
        for i in range(len(diagonal))
    )
    r = sum(
        sp.expand_complex(
            (u[i] * v[j] - u[j] * v[i])
            * sp.conjugate(u[i] * v[j] - u[j] * v[i])
        )
        * sp.prod([factors[k] for k in range(len(diagonal)) if k not in (i, j)])
        for i in range(len(diagonal))
        for j in range(i + 1, len(diagonal))
    )
    return tuple(map(sp.expand, (p, q1, q2, r)))


def sturm_real_root_count(poly: sp.Poly) -> int:
    return int(poly.count_roots(-sp.oo, sp.oo))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=80)
    parser.add_argument("--seed", type=int, default=993_991_20260804)
    parser.add_argument("--equal-singles", action="store_true")
    parser.add_argument("--target-gram", action="store_true")
    parser.add_argument("--target-gram-complex", action="store_true")
    parser.add_argument("--include-below-cone", action="store_true")
    parser.add_argument("--just-below-cone", action="store_true")
    parser.add_argument("--adversarial", action="store_true")
    parser.add_argument("--adversarial-spectrum", action="store_true")
    parser.add_argument("--concentrated-weights", action="store_true")
    parser.add_argument(
        "--weight-cap",
        help="Exact rational cap for target-Gram phase-group weights, e.g. 11/4",
    )
    parser.add_argument("--report-name", default=REPORT.name)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    records = []
    first_failure = None
    for trial in range(args.trials):
        N = (
            rng.choice((5, 8, 10, 13, 17))
            if args.target_gram_complex
            else rng.choice((9, 16)) if args.target_gram else rng.randint(5, 12)
        )
        minimum_d = max(4, (N + 6) // 2)
        d = (
            max(4, minimum_d - 1)
            if args.just_below_cone
            else rng.randint(4 if args.include_below_cone else minimum_d, N)
        )
        diagonal = (
            [0] + [10 ** index for index in range(N - 1)]
            if args.adversarial or args.adversarial_spectrum
            else sorted(rng.sample(range(1, 4 * N + 10), N))
        )
        if args.target_gram_complex:
            sum_of_squares = {
                5: (1, 2),
                8: (2, 2),
                10: (1, 3),
                13: (2, 3),
                17: (1, 4),
            }
            horizontal_difference, vertical_difference = sum_of_squares[N]
            horizontal_total = sp.Rational(horizontal_difference + N - vertical_difference, 2)
            vertical_total = N - horizontal_total
            phase_totals = [
                (horizontal_total + horizontal_difference) / 2,
                (horizontal_total - horizontal_difference) / 2,
                (vertical_total + vertical_difference) / 2,
                (vertical_total - vertical_difference) / 2,
            ]
            phases = [sp.Integer(1), -sp.Integer(1), sp.I, -sp.I]
            nonzero_groups = [(phase, total) for phase, total in zip(phases, phase_totals) if total > 0]
            cap = sp.Rational(args.weight_cap) if args.weight_cap else None
            group_sizes = (
                [int(sp.ceiling(total / cap)) for _, total in nonzero_groups]
                if cap is not None
                else [1] * len(nonzero_groups)
            )
            if sum(group_sizes) > N:
                raise ValueError(f"weight cap {cap} is infeasible for N={N}")
            for _ in range(N - sum(group_sizes)):
                group_sizes[rng.randrange(len(group_sizes))] += 1
            weights = []
            assigned_phases = []
            for (phase, total), group_size in zip(nonzero_groups, group_sizes):
                if cap is not None and (args.adversarial or args.concentrated_weights):
                    # Make the distribution as concentrated as the cap permits,
                    # while keeping every atom strictly positive and exact.
                    epsilon = sp.Rational(1, 10**6 * group_size)
                    group_weights = [epsilon] * group_size
                    remaining = total - group_size * epsilon
                    for index in range(group_size):
                        addition = min(cap - epsilon, remaining)
                        group_weights[index] += addition
                        remaining -= addition
                    assert remaining == 0
                    rng.shuffle(group_weights)
                else:
                    while True:
                        raw = [
                            rng.choice((1, 10**3, 10**6))
                            if args.adversarial or args.concentrated_weights
                            else rng.randint(1, 20)
                            for _ in range(group_size)
                        ]
                        group_weights = [total * value / sum(raw) for value in raw]
                        if cap is None or max(group_weights) <= cap:
                            break
                weights.extend(group_weights)
                assigned_phases.extend([phase] * group_size)
            order = list(range(N))
            rng.shuffle(order)
            weights = [weights[index] for index in order]
            assigned_phases = [assigned_phases[index] for index in order]
            u = [sp.sqrt(weight) for weight in weights]
            v = [phase * value for phase, value in zip(assigned_phases, u)]
        elif args.target_gram:
            positive_count = (N + int(N**0.5)) // 2
            signs = [1] * positive_count + [-1] * (N - positive_count)
            rng.shuffle(signs)
            positive_indices = [index for index, sign in enumerate(signs) if sign > 0]
            negative_indices = [index for index, sign in enumerate(signs) if sign < 0]
            positive_raw = [rng.randint(1, 20) for _ in positive_indices]
            negative_raw = [rng.randint(1, 20) for _ in negative_indices]
            positive_target = sp.Rational(N + int(N**0.5), 2)
            negative_target = sp.Rational(N - int(N**0.5), 2)
            weights = [sp.Rational(0)] * N
            for index, raw in zip(positive_indices, positive_raw):
                weights[index] = positive_target * raw / sum(positive_raw)
            for index, raw in zip(negative_indices, negative_raw):
                weights[index] = negative_target * raw / sum(negative_raw)
            u = [sp.sqrt(weight) for weight in weights]
            v = [sign * value for sign, value in zip(signs, u)]
        else:
            u = [rng.randint(1, 5) for _ in range(N)]
            v = (
                [value * rng.choice((-1, 1)) for value in u]
                if args.equal_singles
                else [rng.randint(-5, 5) or 1 for _ in range(N)]
            )
        p, q1, q2, r = determinant_states(diagonal, u, v)
        expression = (
            S(p * p.xreplace({X: Y}), d)
            - S(q1 * q1.xreplace({X: Y}) + q2 * q2.xreplace({X: Y}), d - 2)
            + S(r * r.xreplace({X: Y}), d - 4)
        )
        ax, ay = rng.randint(-30, 30), rng.randint(-30, 30)
        bx, by = rng.randint(1, 9), rng.randint(1, 9)
        restriction = sp.Poly(sp.expand(expression.subs({X: ax + bx * t, Y: ay + by * t})), t, domain=sp.QQ)
        real_roots = sturm_real_root_count(restriction)
        item = {
            "trial": trial,
            "N": N,
            "d": d,
            "two_d_minus_N": 2 * d - N,
            "diagonal": diagonal,
            "u": [str(value) for value in u],
            "v": [str(value) for value in v],
            "line": [ax, bx, ay, by],
            "degree": restriction.degree(),
            "real_roots": real_roots,
        }
        if args.target_gram or args.target_gram_complex:
            item["weights"] = [str(value) for value in weights]
            item["max_weight_float"] = max(float(value) for value in weights)
        records.append(item)
        if real_roots != restriction.degree():
            first_failure = item
            break
        print(f"trial={trial} N={N} d={d}", flush=True)

    report = {
        "status": "GENERIC_COUNTEREXAMPLE" if first_failure else "PASS_PROBE_ONLY",
        "seed": args.seed,
        "equal_single_slot_polynomials": args.equal_singles,
        "target_gram_normalization": args.target_gram,
        "target_gram_complex_phases": args.target_gram_complex,
        "records": records,
        "first_failure": first_failure,
        "scope": "A failure rules out generic determinant-input closure; a clean run would be evidence only.",
    }
    report_path = HERE / args.report_name
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "checks": len(records), "first_failure": first_failure, "report": str(report_path)}, indent=2))


if __name__ == "__main__":
    main()
