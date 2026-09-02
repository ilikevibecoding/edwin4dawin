#!/usr/bin/env python3
"""Exact large-parent theorem for all seven small-broom k=4 rows.

In parent partition coordinates put A=I(F-{p,v}) and let n,m,q be the
order, edge count, and two-edge-wedge count of that induced forest.  Let
nb,nc,nd be the orders of the other three coefficient blocks and eb,ec the
corresponding edge counts.  Exact forest identities reduce every k=4 row
to fourteen (adjacent) or fifteen (nonadjacent) motif monomials.

For n>=10 the proof uses only

    0<=nb,nc,nd<=n, 0<=m<=n-1, q<=binom(m,2), eb,ec>=0.

The nb block is nonnegative.  The nc block is bounded by its nc=n endpoint,
the m,q block is nonnegative, and the remaining quadratic has positive
coefficients.  The nonadjacent face differs from the adjacent face by
20*n+kappa-6*nd >= 14*n+kappa > 0.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k4_large_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K4_LARGE_ORDER_ROOT"
CUTOFF = 10


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def coefficient(expression, monomial, variables):
    powers = tuple(monomial.get(variable, 0) for variable in variables)
    return sp.Poly(expression, *variables).coeff_monomial(powers)


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        child_rules = {}
        for rank in range(1, 7):
            child_rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degree, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (k,)
        )
        assert degree == (6,)
        targets[ell] = coefficients[(4,)]

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, m, q, nb, eb, nc, ec, nd = sp.symbols(
        "n m q nb eb nc ec nd", integer=True, nonnegative=True
    )
    variables = (n, m, q, nb, eb, nc, ec, nd)
    motif_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - m,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * m + q,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
    }

    reduced = {}
    face_reports = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        rows_out = []
        for ell, target in sorted(targets.items()):
            value = sp.expand(target.subs(partition_rules).subs(motif_rules))
            assert value.free_symbols <= set(variables)
            reduced[(epsilon, ell)] = value
            polynomial = sp.Poly(value, *variables)

            beta = coefficient(value, {nb: 1}, variables)
            gamma = coefficient(value, {nc: 1}, variables)
            delta = coefficient(value, {m: 1}, variables)
            linear = coefficient(value, {n: 1}, variables)
            constant = coefficient(value, {}, variables)
            nd_coefficient = coefficient(value, {nd: 1}, variables)
            schema = sp.expand(
                6 * eb + 42 * ec
                + 28 * m * n + delta * m - 42 * q
                + 74 * n**2 + linear * n
                + 20 * n * nb - 3 * nb**2 + beta * nb
                + 14 * n * nc - 21 * nc**2 + gamma * nc
                + nd_coefficient * nd + constant
            )
            assert sp.expand(value - schema) == 0
            assert beta > 0
            assert gamma <= 9
            assert nd_coefficient == -6 * epsilon

            nb_slack = sp.expand(
                (20 * n * nb - 3 * nb**2 + beta * nb)
                - (17 * n * nb + beta * nb)
            )
            assert sp.expand(nb_slack - 3 * nb * (n - nb)) == 0

            nc_endpoint = sp.expand(-7 * n**2 + gamma * n)
            nc_slack = sp.factor(
                (14 * n * nc - 21 * nc**2 + gamma * nc)
                - nc_endpoint
            )
            assert sp.expand(
                nc_slack - (n - nc) * (7 * n + 21 * nc - gamma)
            ) == 0
            # n>=10 and gamma<=9 make every factor nonnegative.
            assert 7 * CUTOFF - gamma > 0

            mq_after_q = sp.expand(
                28 * m * n + delta * m - 42 * (m * (m - 1) / 2)
            )
            mq_factor = sp.factor(mq_after_q)
            assert sp.expand(
                mq_after_q - m * (28 * n + delta + 21 - 21 * m)
            ) == 0
            # For m<=n-1, the second factor is at least 7n+delta+42.
            assert 7 * CUTOFF + delta + 42 > 0

            adjacent_core = sp.expand(
                74 * n**2 + linear * n + constant + nc_endpoint
            )
            core_polynomial = sp.Poly(adjacent_core, n)
            assert all(coefficient_value > 0 for coefficient_value in core_polynomial.coeffs())

            stream = "".join(
                f"{powers}:{coefficient_value};"
                for powers, coefficient_value in polynomial.terms()
            )
            rows_out.append({
                "ell": ell,
                "beta": int(beta),
                "gamma": int(gamma),
                "delta": int(delta),
                "linear": int(linear),
                "constant": int(constant),
                "nd_coefficient": int(nd_coefficient),
                "nb_slack": sp.sstr(nb_slack),
                "nc_endpoint": sp.sstr(nc_endpoint),
                "nc_slack": sp.sstr(nc_slack),
                "mq_after_q": sp.sstr(mq_factor),
                "core_lower_bound": sp.sstr(adjacent_core),
                "ordered_motif_stream_sha256": hashlib.sha256(
                    stream.encode()
                ).hexdigest().upper(),
            })
        face_reports.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "rows": rows_out,
        })

    corrections = []
    for ell in range(1, 8):
        correction = sp.expand(reduced[(1, ell)] - reduced[(0, ell)])
        kappa = coefficient(correction, {}, variables)
        assert sp.expand(correction - (20 * n + kappa - 6 * nd)) == 0
        assert kappa > 0
        corrections.append({
            "ell": ell,
            "exact_correction": sp.sstr(correction),
            "nd_le_n_lower_bound": sp.sstr(14 * n + kappa),
            "kappa": int(kappa),
        })

    report = {
        "marker": MARKER,
        "theorem": (
            "For every ell=1..7, integer k>=0, parent forest with "
            "|F-{p,v}|>=10, and both parent-mark geometries, the k-Newton "
            "coefficient 4 of internal-spine/broom ordinary-parent g1 is "
            "nonnegative."
        ),
        "cutoff_A_order": CUTOFF,
        "lengths": [1, 7],
        "k_index": 4,
        "forest_bounds": [
            "0<=nb,nc,nd<=n",
            "0<=m<=n-1",
            "q<=m(m-1)/2",
            "eb,ec>=0",
        ],
        "faces": face_reports,
        "nonadjacent_corrections": corrections,
        "status": "exact large-parent theorem for all seven small-broom k=4 rows",
        "scope": (
            "Only k-Newton index 4 and A-order>=10.  The pinned finite base "
            "handles A-order<=9 separately; indices 0..3, the whole mode, "
            "other modes, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cutoff_A_order": CUTOFF,
        "lengths": report["lengths"],
        "k_index": 4,
        "adjacent_core_bounds": [
            {"ell": row["ell"], "bound": row["core_lower_bound"]}
            for row in face_reports[0]["rows"]
        ],
        "nonadjacent_corrections": corrections,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
