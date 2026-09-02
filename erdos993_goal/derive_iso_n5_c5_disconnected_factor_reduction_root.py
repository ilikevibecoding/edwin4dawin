#!/usr/bin/env python3
"""Exact disconnected-mark factor reduction for the rank-five C5 reserve.

For marks in different forest components, remove the marked vertices and
write the two marked components as X=P+xP0 and Y=Q+xQ0, with an untouched
forest factor R.  The four-minor tuple is

  (E,U,V,W)=R*(XY, P Y, X Q, P Q).

The defect form factors exactly as

  R_defect=R(z)R(w)*Phi(P,P0)*Phi(Q,Q0),
  Phi(P,P0)=z X(w)P(z)+w X(z)P(w).

Consequently C5=[z^4w^4]R_defect-[z^3w^5]R_defect follows from central
unimodality of fixed-total slices.  This replay proves the needed common
forest factor property at all orders, checks the finite rooted-factor
evidence, verifies the finite-degree convolution closure, and records the
remaining six rooted Phi-slice inequalities exactly.  It is a reduction,
not yet an all-order C5 theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_g1_h_all_forest_root import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_disconnected_factor_reduction_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_C5_DISCONNECTED_FACTOR_REDUCTION_ROOT"
DEPENDENCIES = {
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def central_steps(values, maximum):
    for total in range(2, maximum + 1):
        for left in range(total // 2):
            yield total, left, (
                values(left + 1, total - left - 1)
                - values(left, total - left)
            )


def symbolic_factorization():
    z, w = sp.symbols("z w")
    # Treat the polynomial evaluations at z and w as algebraically
    # independent atoms.  This proves the identity for polynomials of every
    # degree without constructing an unnecessarily large generic expansion.
    pz, pw, hz, hw, qz, qw, kz, kw, rz, rw = sp.symbols(
        "Pz Pw Hz Hw Qz Qw Kz Kw Rz Rw"
    )
    xz, xw = pz + z * hz, pw + w * hw
    yz, yw = qz + z * kz, qw + w * kw

    # Tuple values at z and w.
    ez, ew = rz * xz * yz, rw * xw * yw
    uz, uw = rz * pz * yz, rw * pw * yw
    vz, vw = rz * xz * qz, rw * xw * qw
    wz, ww = rz * pz * qz, rw * pw * qw
    defect = sp.expand(
        z**2 * ew * wz + w**2 * ez * ww + z * w * (uw * vz + uz * vw)
    )
    phi_p = sp.expand(z * xw * pz + w * xz * pw)
    phi_q = sp.expand(z * yw * qz + w * yz * qw)
    claimed = sp.expand(rz * rw * phi_p * phi_q)
    assert sp.expand(defect - claimed) == 0

    # Record the six genuinely signed rooted Phi-slice steps.  The two
    # summands of Phi must remain coupled: the cross part alone can be
    # negative even when the full Phi step is nonnegative.
    p = sp.symbols("p0:7")
    h = sp.symbols("h0:7")
    phi_coefficient = lambda i, j: (
        at(p, i - 1) * at(p, j)
        + at(p, i) * at(p, j - 1)
        + at(p, i - 1) * at(h, j - 1)
        + at(h, i - 1) * at(p, j - 1)
    )
    remaining = {}
    for total, left in ((4, 1), (5, 1), (6, 1), (6, 2), (7, 1), (7, 2)):
        margin = sp.expand(
            phi_coefficient(left + 1, total - left - 1)
            - phi_coefficient(left, total - left)
        )
        remaining[f"{total}:{left}"] = str(sp.factor(margin))
    assert len(remaining) == 6
    return {
        "identity": (
            "R_defect(R*(XY,PY,XQ,PQ))="
            "R(z)R(w)*Phi(P,P0)*Phi(Q,Q0)"
        ),
        "Phi": "z*X(w)*P(z)+w*X(z)*P(w), X=P+x*P0",
        "symbolic_remainder_zero": True,
        "remaining_rooted_phi_slice_margins": remaining,
    }


def common_forest_theorem():
    checks = 0
    global_minimum = None
    rows = {}
    for order in range(13):
        count = 0
        local_minimum = None
        for graph in forest_graphs(order):
            count += 1
            row = tuple(poly_forest(graph))
            values = lambda i, j: at(row, i) * at(row, j)
            for _total, _left, margin in central_steps(values, 6):
                assert margin >= 0
                checks += 1
                local_minimum = margin if local_minimum is None else min(local_minimum, margin)
                global_minimum = margin if global_minimum is None else min(global_minimum, margin)
        assert count == KNOWN_FOREST_COUNTS[order]
        rows[str(order)] = {"forests": count, "minimum_step": local_minimum}
    assert global_minimum == 0

    # For n>=13, bipartiteness gives alpha>=7.  The pinned universal drops
    # delta0>=2, delta1>=0, delta2>=1 and the rank-4/rank-5 theorems give
    # delta3,delta4>=1.  Hence rho0>=...>=rho5.  Since
    # a_(j+1)/a_j=rho_j/(2(j+1)), all ordinary ratios through a6 decrease,
    # which is exactly the asserted central-slice monotonicity through six.
    return {
        "theorem": (
            "For every finite forest F, each fixed-total slice of "
            "I(F;z)I(F;w) through total degree six is centrally unimodal."
        ),
        "finite_branch": {
            "orders": [0, 12],
            "forests": sum(KNOWN_FOREST_COUNTS.values()),
            "slice_steps": checks,
            "global_minimum": global_minimum,
            "rows": rows,
        },
        "large_order_branch": {
            "orders": "n>=13",
            "alpha_floor": "alpha(F)>=ceil(n/2)>=7",
            "ratio_chain": "rho0>=rho1>=rho2>=rho3>=rho4>=rho5>=0",
            "coefficient_ratio": "a_(j+1)/a_j=rho_j/(2(j+1))",
            "conclusion": "a0,...,a6 have decreasing ordinary adjacent ratios",
        },
        "dependencies": DEPENDENCIES,
    }


def centered_interval(degree, layer):
    return [int(layer <= index <= degree - layer) for index in range(degree + 1)]


def convolve(left, right):
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return result


def convolution_closure():
    cases = 0
    minimum = None
    # Phi has minimum total degree one, so dP,dQ>=1 and the untouched common
    # factor contributes at most six to total degree eight.
    for d_r in range(7):
        for d_p in range(1, 8):
            d_q = 8 - d_r - d_p
            if not 1 <= d_q <= 7:
                continue
            for layer_r in range(d_r // 2 + 1):
                for layer_p in range(d_p // 2 + 1):
                    for layer_q in range(d_q // 2 + 1):
                        row = convolve(
                            convolve(
                                centered_interval(d_r, layer_r),
                                centered_interval(d_p, layer_p),
                            ),
                            centered_interval(d_q, layer_q),
                        )
                        assert len(row) == 9
                        margin = row[4] - row[3]
                        assert margin >= 0
                        minimum = margin if minimum is None else min(minimum, margin)
                        cases += 1
    return {
        "basis": (
            "Every nonnegative symmetric centrally-unimodal slice is a "
            "nonnegative sum of centered interval indicators."
        ),
        "degree_partitions": "d_R+d_P+d_Q=8, 0<=d_R<=6, 1<=d_P,d_Q<=7",
        "centered_interval_basis_products_checked": cases,
        "minimum_center_minus_neighbor": minimum,
        "exact_closure": True,
    }


def rooted_finite_probe(max_order=14):
    checks = 0
    roots = 0
    by_margin = {f"{total}:{left}": {"checks": 0, "negative": 0, "minimum": None}
                 for total in range(2, 8) for left in range(total // 2)}
    for order in range(1, max_order + 1):
        candidates = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            for root in tree:
                roots += 1
                deleted_root = tree.copy(); deleted_root.remove_node(root)
                deleted_closed = tree.copy()
                deleted_closed.remove_nodes_from({root, *tree.neighbors(root)})
                p = tuple(poly_forest(deleted_root))
                h = tuple(poly_forest(deleted_closed))
                phi_values = lambda i, j: (
                    at(p, i - 1) * at(p, j)
                    + at(p, i) * at(p, j - 1)
                    + at(p, i - 1) * at(h, j - 1)
                    + at(h, i - 1) * at(p, j - 1)
                )
                for total, left, margin in central_steps(phi_values, 7):
                    key = f"{total}:{left}"
                    row = by_margin[key]
                    row["checks"] += 1
                    row["negative"] += int(margin < 0)
                    row["minimum"] = margin if row["minimum"] is None else min(row["minimum"], margin)
                    assert margin >= 0
                    checks += 1
    return {
        "orders": [1, max_order],
        "rooted_trees": roots,
        "phi_slice_checks": checks,
        "negative": 0,
        "by_margin": by_margin,
        "role": "finite exact evidence only; not extrapolated",
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    report = {
        "marker": MARKER,
        "factorization": symbolic_factorization(),
        "common_forest_factor_theorem": common_forest_theorem(),
        "convolution_closure": convolution_closure(),
        "rooted_phi_slice_finite_evidence": rooted_finite_probe(),
        "conditional_theorem": (
            "If the six displayed rooted Phi-slice margins are nonnegative for "
            "every rooted tree, then C5>=0 whenever the two marks lie in distinct "
            "components of a finite forest."
        ),
        "remaining_gap": (
            "Prove the six rooted Phi-slice margins at all orders; the case where "
            "both marks lie in one component has a unique shared path component and "
            "is separate."
        ),
        "scope": (
            "Exact reduction plus one all-order factor theorem. This does not prove "
            "all C5, g1, g2, N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "common_finite_forests": report["common_forest_factor_theorem"]["finite_branch"]["forests"],
        "rooted_trees": report["rooted_phi_slice_finite_evidence"]["rooted_trees"],
        "rooted_checks": report["rooted_phi_slice_finite_evidence"]["phi_slice_checks"],
        "closure_basis_cases": report["convolution_closure"]["centered_interval_basis_products_checked"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
