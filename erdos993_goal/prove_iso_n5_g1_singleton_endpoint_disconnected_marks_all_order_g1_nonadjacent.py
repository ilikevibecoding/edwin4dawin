#!/usr/bin/env python3
"""Exact all-order g1 theorem for disconnected singleton-endpoint marks.

This is the arbitrary-common-forest extension of the rooted-star-system
certificate.  In the canonical singleton_endpoint mode p=u, when u and v are
in different components, deepestness forces every child component at either
mark to be a centred star.  Components containing neither mark form an
arbitrary common forest K.

For u-side factors F_d=(1+x)^d+x and L_d=(1+x)^d, write
P=prod F_d and H=prod L_d, and define Q,J analogously at v.  If X=I(K), then

 U=X P(Q+xJ), W=XPQ, QE=X H(Q+xJ), QV=XHQ.

The corrected endpoint residual is

 F=N4(D)+B(QE,W)+B(U,QV),
 B(A,B)=a2*b3-2*a3*b2+a4*b1.

Its total Newton degree in all star parameters is at most six.  Hence only the
28 distributions of at most six positive-index star variables are needed;
zero-index stars become leaves and are paid by binomial translation.  After
global deduplication these distributions give 1,884 polynomial rows in the
first five independence coefficients of K.

This program checks those rows on every unlabeled forest through order 12 and
then proves every row for all orders at least 13 using the pinned exact
high/low forest-ratio parameterization and rational Bernstein/simplex
homogenization.  It fails closed on any negative coefficient or finite value.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import (
    ratio_parameterization,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_disconnected_marks_all_order_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_DISCONNECTED_MARKS_ALL_ORDER_G1_NONADJACENT"
KNOWN_FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
    7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}
PINS = {
    "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":
        "8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
    "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":
        "5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
    "assemble_iso_n5_s_all_marked_forests_root.py":
        "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "iso_n5_s_all_marked_forests_exact_root_20260830.json":
        "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "assemble_iso_all_forest_n4_bundle_induction_root.py":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":
        "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":
        "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
    "probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent.py":
        "72795F07C3C0A30CF0B6E05C2980AA97367763EEC6AC8B43514F873AA23D6CFF",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}

ONE = (1, 0, 0, 0, 0, 0, 0, 0)
XX = (0, 1, 0, 0, 0, 0, 0, 0)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def block(A, B):
    return A[2]*B[3] - 2*A[3]*B[2] + A[4]*B[1]


def n4_deleted(U, W):
    return sp.expand(
        2*U[2]*W[2] - U[2]*W[3] - 5*U[2]*W[4]
        + 2*U[3]*W[1] + 2*U[3]*W[2] + 3*U[3]*W[3]
        - U[4]*W[1] + 3*U[4]*W[2] - 5*U[5]*W[1]
        - W[1]*W[4] + W[2]*W[3]
    )


def add(left, right):
    return tuple(sp.expand(a+b) for a,b in zip(left,right))


def shift(row):
    return tuple(at(row,rank-1) for rank in range(8))


def conv(left, right):
    return tuple(sp.expand(sum(at(left,j)*at(right,rank-j) for j in range(rank+1))) for rank in range(8))


def isolate(row, count):
    return tuple(sp.expand(sp.expand_func(sum(
        sp.binomial(count,j)*at(row,rank-j) for j in range(rank+1)
    ))) for rank in range(8))


def newton(expression, variable):
    degree=sp.degree(expression,variable)
    rows=[sp.expand(sum(
        (-1)**(rank-j)*sp.binomial(rank,j)*expression.subs(variable,j)
        for j in range(rank+1)
    )) for rank in range(degree+1)]
    assert sp.expand(expression-sp.expand(sp.expand_func(sum(
        sp.binomial(variable,rank)*row for rank,row in enumerate(rows)
    ))))==0
    return rows


def residual(U, W, QE, QV):
    return sp.expand(n4_deleted(U, W) + block(QE, W) + block(U, QV))


def fixed_active_rows(mu: int, mv: int):
    """Newton rows for fixed numbers of displayed u/v star variables."""
    k, ell = sp.symbols("u_leaves_k v_leaves_l", nonnegative=True)
    common = (sp.Integer(1), *sp.symbols("x1:8"))
    u_degrees = sp.symbols(f"u_star_degree_0:{mu}", nonnegative=True)
    v_degrees = sp.symbols(f"v_star_degree_0:{mv}", nonnegative=True)

    P, H = isolate(ONE, k), ONE
    for degree in u_degrees:
        lower = isolate(ONE, degree)
        P, H = conv(P, add(lower, XX)), conv(H, lower)
    Q, J = isolate(ONE, ell), ONE
    for degree in v_degrees:
        lower = isolate(ONE, degree)
        Q, J = conv(Q, add(lower, XX)), conv(J, lower)

    Y = add(Q, shift(J))
    U = conv(common, conv(P, Y))
    W = conv(common, conv(P, Q))
    QE = conv(common, conv(H, Y))
    QV = conv(common, conv(H, Q))
    expression = residual(U, W, QE, QV)
    variables = (k, ell, *u_degrees, *v_degrees)
    assert sp.Poly(expression, *variables).total_degree() <= 6
    records = [((), expression)]
    for variable in variables:
        records = [
            (index + (rank,), row)
            for index, value in records
            for rank, row in enumerate(newton(value, variable))
            if row != 0
        ]
    return common, [(index, sp.expand(row)) for index, row in records]


def collect_rows():
    """All 28 active distributions, globally deduplicated deterministically."""
    unique = {}
    stats = []
    expected_raw = [21, 56, 126, 252, 462, 792, 1287]
    for total in range(7):
        for mu in range(total + 1):
            mv = total - mu
            common, records = fixed_active_rows(mu, mv)
            assert len(records) == expected_raw[total]
            before = len(unique)
            for index, row in records:
                unique.setdefault(row, (mu, mv, index))
            stats.append({
                "u_active": mu,
                "v_active": mv,
                "raw_rows": len(records),
                "new_unique_rows": len(unique) - before,
                "cumulative_unique_rows": len(unique),
            })
            print("COLLECT", mu, mv, len(records), len(unique) - before, len(unique), flush=True)
    rows = list(unique)
    assert len(stats) == 28 and len(rows) == 1884
    assert all(
        not row.has(common[6]) and not row.has(common[7])
        for row in rows
    )
    assert all(
        coefficient.q == 1
        for row in rows
        for coefficient in sp.Poly(row, *common[1:6]).coeffs()
    )
    return common, rows, unique, stats


def finite_certificate(common, rows):
    """Evaluate every core row on all 2,949 forests of order at most 12."""
    evaluator = sp.lambdify(common[1:6], rows, modules="math", cse=True)
    digest = hashlib.sha256()
    total_forests = total_checks = 0
    global_minimum = None
    witness = None
    orders = {}
    for order in range(13):
        forest_count = 0
        order_minimum = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            forest_count += 1
            independence = poly_forest(graph)
            values = tuple(
                int(value)
                for value in evaluator(*[
                    independence[rank] if rank < len(independence) else 0
                    for rank in range(1, 6)
                ])
            )
            assert len(values) == len(rows)
            digest.update((",".join(map(str, values)) + "\n").encode())
            minimum = min(values)
            if minimum < 0:
                bad = next(index for index, value in enumerate(values) if value < 0)
                raise AssertionError(("negative finite row", order, forest_index, bad, values[bad]))
            if order_minimum is None or minimum < order_minimum:
                order_minimum = minimum
            if global_minimum is None or minimum < global_minimum:
                global_minimum = minimum
                witness = {"order": order, "forest_index": forest_index, "row": values.index(minimum)}
        assert forest_count == KNOWN_FOREST_COUNTS[order]
        total_forests += forest_count
        total_checks += forest_count * len(rows)
        orders[str(order)] = {"forests": forest_count, "checks": forest_count * len(rows), "minimum": order_minimum}
        print("FINITE", order, forest_count, order_minimum, flush=True)
    assert total_forests == 2949 and total_checks == 5_555_916
    return {
        "orders": orders,
        "forests": total_forests,
        "rows": len(rows),
        "checks": total_checks,
        "minimum": global_minimum,
        "minimum_witness": witness,
        "value_stream_hash": digest.hexdigest().upper(),
    }


def large_certificate(common, rows):
    """Exact high/low ratio-cone certificate for every N>=13 core row."""
    N, A, B = sp.symbols("N A B", nonnegative=True)
    branch_records = []
    global_minimum = None
    coefficient_count = power_term_count = cube_row_count = 0
    digest = hashlib.sha256()
    for sector in ("high", "low"):
        cubes, simplex, substitutions, cone, rho1 = ratio_parameterization(
            sector, N, A, B, common, 5
        )
        for row_index, row in enumerate(rows):
            expression = row.subs(common[1], N).subs(substitutions)
            numerator, denominator = sp.fraction(sp.together(expression))
            assert denominator.is_Rational and denominator > 0
            polynomial = sp.Poly(numerator, N, *cubes, *simplex)
            degrees, bernstein = tensor_bernstein_sparse(polynomial, len(cubes))
            homogeneous, terms, minimum = shift_and_simplex_homogenize(
                bernstein, len(simplex)
            )
            if minimum < 0:
                raise AssertionError(("negative large branch", sector, row_index, minimum))
            power_hash = polynomial_hash(polynomial)
            homogeneous_hash = coefficient_rows_hash(homogeneous)
            record = {
                "sector": sector,
                "row": row_index,
                "positive_denominator": str(denominator),
                "power_terms": len(polynomial.terms()),
                "power_hash": power_hash,
                "cube_degrees": degrees,
                "cube_rows": len(bernstein),
                "homogeneous_coefficients": terms,
                "minimum": str(minimum),
                "homogeneous_hash": homogeneous_hash,
            }
            branch_records.append(record)
            digest.update((json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n").encode())
            coefficient_count += terms
            power_term_count += len(polynomial.terms())
            cube_row_count += len(bernstein)
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
            if (row_index + 1) % 50 == 0 or row_index + 1 == len(rows):
                print("LARGE", sector, row_index + 1, len(rows), minimum, coefficient_count, flush=True)
    assert len(branch_records) == 2 * len(rows)
    return {
        "threshold": "N>=13",
        "sectors": ["high", "low"],
        "branches": len(branch_records),
        "power_terms": power_term_count,
        "cube_rows": cube_row_count,
        "homogeneous_coefficients": coefficient_count,
        "minimum": str(global_minimum),
        "branch_record_hash": digest.hexdigest().upper(),
        "ratio_cones": {
            sector: {
                "cone": ratio_parameterization(sector, N, A, B, common, 5)[3],
                "rho1_edge_identity": str(ratio_parameterization(sector, N, A, B, common, 5)[4]),
            }
            for sector in ("high", "low")
        },
        "rows": branch_records,
    }


def main():
    assert {name: sha(HERE / name) for name in PINS} == PINS
    common, rows, origins, stats = collect_rows()
    finite = finite_certificate(common, rows)
    large = large_certificate(common, rows)
    corrected = json.loads((HERE / "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json").read_text())
    scalar = json.loads((HERE / "iso_n5_s_all_marked_forests_exact_root_20260830.json").read_text())
    n4 = json.loads((HERE / "iso_all_forest_n4_bundle_induction_exact_root_20260829.json").read_text())
    assert corrected["marker"].startswith("DERIVED_EXACT")
    assert scalar["marker"].startswith("PASS_EXACT") and n4["marker"].startswith("PASS_EXACT")

    origin_records = [
        {"row": index, "u_active": origins[row][0], "v_active": origins[row][1], "newton_index": list(origins[row][2])}
        for index, row in enumerate(rows)
    ]
    report = {
        "marker": MARKER,
        "theorem": "Rank-five g1 is nonnegative in the entire disconnected-mark singleton_endpoint mode p=u (and p=v by symmetry), with arbitrary components containing neither mark.",
        "canonical_geometry": {
            "reason": "Maximum-depth support selection forces every child component at u and v to be a centred star. Components containing neither mark are an arbitrary forest K and enter all four rows through the common factor I(K).",
            "star_factors": "F_d=(1+x)^d+x and L_d=(1+x)^d",
            "rows": "U=I(K)P(Q+xJ), W=I(K)PQ, QE=I(K)H(Q+xJ), QV=I(K)HQ",
        },
        "identity": "g1=S(C)+N4(C)+F; F=N4(D)+B(QE,W)+B(U,QV), B(A,B)=a2*b3-2a3*b2+a4*b1",
        "active_support_argument": "F has total Newton degree at most six in the leaf/star-degree parameters. Every positive star-degree Newton index costs at least one, so at most six stars are active. A zero-index u-star has F_0=1+x,L_0=1 and shifts the u-leaf count; analogously at v. The binomial translation identity C(k+z,r)=sum_j C(z,r-j)C(k,j) is coefficientwise nonnegative. Thus 28 active distributions cover arbitrary star counts.",
        "core_rows": {
            "active_distributions": 28,
            "unique_rows": len(rows),
            "variables": [str(symbol) for symbol in common[1:6]],
            "collection": stats,
            "origins": origin_records,
        },
        "finite": finite,
        "large": large,
        "sign_payment": "Every core row is nonnegative on every forest K by the finite N<=12 census and exact N>=13 high/low forest-ratio certificate. Hence F>=0. Universal S(C)>=0 and all-forest N4(C)>=0 are pinned, so g1>=0.",
        "dependencies_sha256": PINS,
        "scope": "Exactly the disconnected-mark singleton_endpoint mode p=u, and p=v by symmetry. Connected nonadjacent marks, other canonical modes, g2, all N5, and Problem 993 are not claimed.",
        "source_sha256": sha(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "core_rows": len(rows),
        "finite": finite,
        "large": {key: value for key, value in large.items() if key != "rows"},
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
