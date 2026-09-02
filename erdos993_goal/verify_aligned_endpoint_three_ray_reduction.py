"""Exact replay for the aligned endpoint three-ray reduction.

The identities are all-order algebra.  The root checks below are deliberately
labelled as finite evidence for the two remaining positive-compatibility
pencils.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb, lcm
from pathlib import Path
from itertools import combinations

from flint import ctx, fmpz_poly


HERE = Path(__file__).resolve().parent
REPORT = HERE / "aligned_endpoint_three_ray_exact_20260812.json"
ctx.prec = 160


def p(M: int, i: int) -> Fraction:
    return Fraction(comb(2 * M - i - 1, i)) if 0 <= i < M else Fraction(0)


def add(a: list[Fraction], b: list[Fraction], scale: Fraction = Fraction(1)) -> list[Fraction]:
    return [
        (a[i] if i < len(a) else 0) + scale * (b[i] if i < len(b) else 0)
        for i in range(max(len(a), len(b)))
    ]


def raw_slice(a: list[Fraction], b: list[Fraction], s: int) -> list[Fraction]:
    return [
        (a[i] if i < len(a) else 0)
        * (b[s - i] if 0 <= s - i < len(b) else 0)
        for i in range(s + 1)
    ]


def gamma_from_palindromic(a: list[Fraction]) -> list[Fraction]:
    degree = len(a) - 1
    rem = list(a)
    out: list[Fraction] = []
    for h in range(degree // 2 + 1):
        value = rem[h]
        out.append(value)
        for j in range(degree - 2 * h + 1):
            rem[h + j] -= value * comb(degree - 2 * h, j)
    assert all(x == 0 for x in rem)
    return out


def mixed_gamma(a: list[Fraction], b: list[Fraction], s: int) -> list[Fraction]:
    row = raw_slice(a, b, s)
    return gamma_from_palindromic([(x + y) / 2 for x, y in zip(row, reversed(row))])


def roots_with_forced_zeros(q: list[Fraction]) -> list:
    q = list(q)
    forced = 0
    while len(q) > 1 and q[0] == 0:
        q.pop(0)
        forced += 1
    while len(q) > 1 and q[-1] == 0:
        q.pop()
    denominator = 1
    for x in q:
        denominator = lcm(denominator, x.denominator)
    integer_poly = fmpz_poly([
        x.numerator * (denominator // x.denominator) for x in q
    ])
    roots = integer_poly.complex_roots()
    assert all(z.imag == 0 for z, _ in roots)
    return sorted([z.real for z, _ in roots] + [0] * forced)


def common_gap(a: list[Fraction], b: list[Fraction]) -> bool:
    ra = roots_with_forced_zeros(a)
    rb = roots_with_forced_zeros(b)
    assert len(ra) == len(rb)
    return all(max(ra[i], rb[i]) <= min(ra[i + 1], rb[i + 1])
               for i in range(len(ra) - 1))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    identity_checks = 0
    pairwise_checks = 0
    four_leaf_checks = 0
    ef_good_leaf_checks = 0
    ef_bad_leaf_failures = 0
    u_values = [Fraction(1, 1000), Fraction(1), Fraction(1000)]
    endpoint_values = [Fraction(0), Fraction(1, 10), Fraction(1), Fraction(10)]

    # Here x=a+1 and y=b+1, so x,y are nonnegative endpoint weights.
    for N in range(5, 26):
        P = [p(N, i) for i in range(N)]
        C = [p(N - 1, i) for i in range(N - 1)]
        D = [p(N - 2, i) for i in range(N - 2)]
        T = [p(N - 3, i) for i in range(N - 3)]
        V = add(P, C, Fraction(-1))
        W = add(C, D, Fraction(-1))

        # P_N-P_(N-1)=v S_(N-1), S_M=2P_M-vP_(M-1).
        expected_V = [Fraction(0)] + add([2 * z for z in C], [Fraction(0)] + D, Fraction(-1))
        expected_W = [Fraction(0)] + add([2 * z for z in D], [Fraction(0)] + T, Fraction(-1))
        assert V == expected_V
        assert W == expected_W
        identity_checks += 2

        for s in range(2, 2 * N - 5):
            for u in u_values:
                E = add(mixed_gamma(C, C, s), mixed_gamma(D, D, s), u)
                F = add(mixed_gamma(C, V, s), mixed_gamma(D, W, s), u)
                G = add(mixed_gamma(V, V, s), mixed_gamma(W, W, s), u)

                for left, right in ((E, F), (F, G), (E, G)):
                    assert common_gap(left, right)
                    pairwise_checks += 1

                # The F/G side separates into a four-leaf common-interlacer
                # target.  The E/F side has exactly one exceptional cross.
                e1 = mixed_gamma(C, C, s)
                e2 = mixed_gamma(D, D, s)
                f1 = mixed_gamma(C, V, s)
                f2 = mixed_gamma(D, W, s)
                g1 = mixed_gamma(V, V, s)
                g2 = mixed_gamma(W, W, s)
                if u == u_values[0]:
                    for left, right in combinations((f1, f2, g1, g2), 2):
                        assert common_gap(left, right)
                        four_leaf_checks += 1
                    for left, right in ((e1, f1), (e1, f2), (e2, f2)):
                        assert common_gap(left, right)
                        ef_good_leaf_checks += 1
                    if not common_gap(e2, f1):
                        ef_bad_leaf_failures += 1

                # One changing endpoint pair per cell is enough to audit the
                # transcription; (4) itself is the displayed bilinear identity.
                x = endpoint_values[(N + s) % len(endpoint_values)]
                y = endpoint_values[(N + 2 * s + 1) % len(endpoint_values)]
                Aa = add(V, C, x)
                Ab = add(V, C, y)
                Ba = add(W, D, x)
                Bb = add(W, D, y)
                direct = add(mixed_gamma(Aa, Ab, s), mixed_gamma(Ba, Bb, s), u)
                expanded = add(add(G, F, x + y), E, x * y)
                assert direct == expanded
                identity_checks += 1

    # Exact obstruction to replacing the two directed deletion arms by their
    # reciprocal sum.  Coefficients are ascending in z.
    sym_target = [Fraction(11007, 10000), Fraction(6506, 625), Fraction(11007, 10000)]
    sym_separator = [Fraction(1001, 5000), Fraction(0), Fraction(1001, 5000)]
    bad = add(sym_target, sym_separator, Fraction(1000))
    discriminant = bad[1] ** 2 - 4 * bad[0] * bad[2]
    assert discriminant == Fraction(-809897637549, 5000000)

    # Joint stability of the diagonal self-slice is false.  This is the
    # exact univariate restriction supplied in the note.
    lam_restriction = [
        Fraction(-139328, 25), Fraction(-96593, 20),
        Fraction(8639, 20), Fraction(805),
    ]
    a, b, c, d = lam_restriction[3], lam_restriction[2], lam_restriction[1], lam_restriction[0]
    cubic_discriminant = (
        b * b * c * c - 4 * a * c * c * c - 4 * b * b * b * d
        - 27 * a * a * d * d + 18 * a * b * c * d
    )
    assert cubic_discriminant == Fraction(-4862854658107221643, 800000)

    payload = {
        "status": "PASS_EXACT_ALIGNED_ENDPOINT_THREE_RAY_REDUCTION",
        "range": "5<=N<=25, 2<=s<=2N-6",
        "u_values": ["1/1000", "1", "1000"],
        "endpoint_shift_values": ["0", "1/10", "1", "10"],
        "exact_identity_checks": identity_checks,
        "certified_pairwise_common_gap_checks": pairwise_checks,
        "four_leaf_FG_common_gap_checks": four_leaf_checks,
        "three_good_EF_leaf_cross_checks": ef_good_leaf_checks,
        "bad_E2_F1_leaf_cross_failures": ef_bad_leaf_failures,
        "symmetrized_separator_counterexample": {
            "cell": {"N": 5, "s": 2, "a": "-1", "b": "-9/10", "u": "1/1000"},
            "pencil_weight": "1000",
            "discriminant": "-809897637549/5000000",
        },
        "joint_stability_counterexample": {
            "cell": {"N": 5, "s": 2, "u": "1/100"},
            "line": "(t,x)=(-6,8)+lambda*(2,5)",
            "restriction_coefficients_ascending": [
                "-139328/25", "-96593/20", "8639/20", "805"
            ],
            "discriminant": "-4862854658107221643/800000",
        },
        "scope": (
            "The endpoint-shift and three-ray identities are all-order.  "
            "The common-gap checks are finite evidence only.  The remaining "
            "all-order target is that F is positively compatible with E and G "
            "(equivalently, the aligned direct-sum mixed-slice lemma)."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    payload["source_sha256"] = sha256(Path(__file__).resolve())
    payload["report_sha256"] = sha256(REPORT)
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
