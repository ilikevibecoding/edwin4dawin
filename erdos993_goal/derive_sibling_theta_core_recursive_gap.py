#!/usr/bin/env python3
"""Derive the cross-phase identity for recursive sibling Theta pruning.

Let B be a forest rooted at v, let s != v be a vertex of B, and let
S=B+z where z is a new leaf supported by s.  Put L=B-s.  In unscaled
coordinates define d_q(B,v) by

    q!^2 d_q(B,v) = D_q(B+w,v,w),

where w is a new distinguished leaf supported by v and D is the
sibling Theta core.  The recursive pruning margin, divided by q!^2,
is

    R_q(B;v,s) = d_q(S,v)-d_q(B,v)-d_(q-1)(L,v).

For q>=4 this is exactly the factorial recursive margin used in the
pruning candidate.  At q=3 the implementation intentionally omits
the out-of-scope rank-two core, so that boundary rank is audited
separately.  This script proves symbolically that all pure L phases
cancel and prints the resulting cross polynomial.  It also replays
the q>=4 identity against direct exact forest calculations.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_sibling_theta_core_pruning import theta_core
from verify_sibling_uniform_three_phase_identity import (
    three_phase_polynomial,
)
from verify_two_copy_sharp_lambda_leaf_identity import (
    independent_sets,
    residual_h_c,
)


def theta_core_polynomial(
    q,
    N,
    S1,
    H,
    C,
    X,
    Y,
    HX,
    M,
    T,
    J2,
    D,
    P,
    U,
    K2,
    E,
):
    """Return the unscaled sibling Theta core d_q."""
    corrected_sibling_surplus = three_phase_polynomial(
        q,
        N,
        S1,
        H,
        C,
        X,
        Y,
        HX,
        M,
        T,
        J2,
        D,
        P,
        U,
        K2,
        E,
    )
    lower_theta = (
        (q - 4) * M * M
        + D * M
        - J2 * M
        + T * T
    )
    return sp.expand(corrected_sibling_surplus - lower_theta)


def symbolic_recursive_gap() -> tuple[sp.Expr, dict[str, sp.Symbol]]:
    q = sp.symbols("q")

    # Rank-q data in B, rooted at v.
    N, S1, H, C, X, Y, HX = sp.symbols(
        "N S1 H C X Y HX"
    )
    # For K in I_q(B), a=1[s notin K], b records whether the
    # unselected new leaf becomes an isolated residual component.
    A, Bc, HA, AX = sp.symbols("A Bc HA AX")

    # Rank-(q-1) data in L=B-s, rooted at v.
    n, s1, h, c, x, y, hx = sp.symbols(
        "n s1 h c x y hx"
    )

    # Rank-(q-1) data in J=B-v and its leaf-at-s indicators.
    M, T, J2, D = sp.symbols("M T J2 D")
    A1, B1, HA1 = sp.symbols("A1 B1 HA1")

    # Rank-(q-2) data in K=L-v=J-s.
    m, u, k2, e = sp.symbols("m u k2 e")

    # Rank-(q-2) data in J and its leaf-at-s indicators.
    P, U, K2, E = sp.symbols("P U K2 E")
    A2, B2, HA2 = sp.symbols("A2 B2 HA2")

    # Rank-(q-3) data in K.
    p, V, L2, F = sp.symbols("p V L2 F")

    old = theta_core_polynomial(
        q,
        N,
        S1,
        H,
        C,
        X,
        Y,
        HX,
        M,
        T,
        J2,
        D,
        P,
        U,
        K2,
        E,
    )

    # The absent-z phase gains one residual vertex whenever s is not
    # selected; it gains one component exactly when s is dominated.
    # The selected-z phase is I_(q-1)(L).
    new = theta_core_polynomial(
        q,
        N + n,
        S1 + A + s1,
        H + 2 * HA + A + h,
        C + Bc + c,
        X + x,
        Y + y,
        HX + AX + hx,
        M + m,
        T + A1 + u,
        J2 + 2 * HA1 + A1 + k2,
        D + B1 + e,
        P + p,
        U + A2 + V,
        K2 + 2 * HA2 + A2 + L2,
        E + B2 + F,
    )

    lower = theta_core_polynomial(
        q - 1,
        n,
        s1,
        h,
        c,
        x,
        y,
        hx,
        m,
        u,
        k2,
        e,
        p,
        V,
        L2,
        F,
    )
    gap = sp.expand(new - old - lower)
    symbols = {
        symbol.name: symbol
        for symbol in (
            q,
            N,
            S1,
            H,
            C,
            X,
            Y,
            HX,
            A,
            Bc,
            HA,
            AX,
            n,
            s1,
            h,
            c,
            x,
            y,
            hx,
            M,
            T,
            J2,
            D,
            A1,
            B1,
            HA1,
            m,
            u,
            k2,
            e,
            P,
            U,
            K2,
            E,
            A2,
            B2,
            HA2,
            p,
            V,
            L2,
            F,
        )
    }
    return gap, symbols


def symbolic_phase_split(
    gap: sp.Expr,
    z: dict[str, sp.Symbol],
) -> dict[str, sp.Expr]:
    """Prove the five-block phase split of twice the gap."""

    def blocks(q, a_data, m_data, p_data):
        N, S1, H, C, X, Y, HX = a_data
        M, T, J2, D = m_data
        P, U, K2, E = p_data
        return {
            "root": -4 * X * (N - X),
            "phi": 4
            * (
                2 * M * (S1 - HX)
                - 2 * (N - X) * T
                + M * (X + Y)
            ),
            "psi": 2
            * (
                2 * (q - 3) * N * P
                + P * C
                + 2 * P * Y
                + N * E
                - P * (H + 4 * HX + 4 * X)
                - N * K2
                + 2 * (S1 + 2 * X) * U
            ),
            "chi": 2
            * (
                (2 * q - 6) * M * P
                + P * D
                + M * E
                - P * J2
                - M * K2
                - 2 * P * T
                + 2 * T * U
                + 2 * M * U
            ),
            "mass": 8 * M * M,
        }

    q = z["q"]
    old_a = tuple(
        z[name] for name in ("N", "S1", "H", "C", "X", "Y", "HX")
    )
    old_m = tuple(z[name] for name in ("M", "T", "J2", "D"))
    old_p = tuple(z[name] for name in ("P", "U", "K2", "E"))
    lower_a = tuple(
        z[name] for name in ("n", "s1", "h", "c", "x", "y", "hx")
    )
    lower_m = tuple(z[name] for name in ("m", "u", "k2", "e"))
    lower_p = tuple(z[name] for name in ("p", "V", "L2", "F"))
    new_a = (
        z["N"] + z["n"],
        z["S1"] + z["A"] + z["s1"],
        z["H"] + 2 * z["HA"] + z["A"] + z["h"],
        z["C"] + z["Bc"] + z["c"],
        z["X"] + z["x"],
        z["Y"] + z["y"],
        z["HX"] + z["AX"] + z["hx"],
    )
    new_m = (
        z["M"] + z["m"],
        z["T"] + z["A1"] + z["u"],
        z["J2"] + 2 * z["HA1"] + z["A1"] + z["k2"],
        z["D"] + z["B1"] + z["e"],
    )
    new_p = (
        z["P"] + z["p"],
        z["U"] + z["A2"] + z["V"],
        z["K2"] + 2 * z["HA2"] + z["A2"] + z["L2"],
        z["E"] + z["B2"] + z["F"],
    )
    old = blocks(q, old_a, old_m, old_p)
    lower = blocks(q - 1, lower_a, lower_m, lower_p)
    new = blocks(q, new_a, new_m, new_p)
    delta = {
        name: sp.expand(new[name] - old[name] - lower[name])
        for name in old
    }
    assert sp.expand(sum(delta.values()) - 2 * gap) == 0

    # The phi kernel itself is linear because x is an indicator:
    # phi=2(h_K-h_U)(1-x)+x+y.
    d, x, y = sp.symbols("d x y")
    phi = y + 1 - (d + 2 * x - 1) ** 2 + (d + x) ** 2
    phi_linear = 2 * d * (1 - x) + x + y
    assert sp.rem(
        sp.Poly(sp.expand(phi - phi_linear), x),
        sp.Poly(x * (x - 1), x),
    ).as_expr() == 0
    return delta


def rooted_phase_data(
    graph: nx.Graph,
    root: int,
    rank: int,
    support: int | None = None,
) -> dict[str, int]:
    sets = independent_sets(graph, rank)
    root_neighbors = set(graph[root])
    result = {
        "count": 0,
        "mass": 0,
        "square": 0,
        "components": 0,
        "root_absent": 0,
        "root_hit": 0,
        "root_absent_mass": 0,
        "support_absent": 0,
        "support_hit": 0,
        "support_absent_mass": 0,
        "root_support_absent": 0,
    }
    support_neighbors = (
        set(graph[support]) if support is not None else set()
    )
    for chosen in sets:
        h_value, c_value = residual_h_c(graph, chosen)
        root_absent = int(root not in chosen)
        root_hit = int(
            root_absent and bool(chosen & root_neighbors)
        )
        result["count"] += 1
        result["mass"] += h_value
        result["square"] += h_value * h_value
        result["components"] += c_value
        result["root_absent"] += root_absent
        result["root_hit"] += root_hit
        result["root_absent_mass"] += root_absent * h_value
        if support is not None:
            support_absent = int(support not in chosen)
            support_hit = int(
                support_absent
                and bool(chosen & support_neighbors)
            )
            result["support_absent"] += support_absent
            result["support_hit"] += support_hit
            result["support_absent_mass"] += (
                support_absent * h_value
            )
            result["root_support_absent"] += (
                root_absent * support_absent
            )
    return result


def direct_symbol_substitution(
    base: nx.Graph,
    root: int,
    support: int,
    rank_q: int,
    symbols: dict[str, sp.Symbol],
) -> dict[sp.Symbol, int]:
    lower = base.subgraph(set(base) - {support}).copy()
    j_graph = base.subgraph(set(base) - {root}).copy()
    k_graph = base.subgraph(
        set(base) - {root, support}
    ).copy()

    bq = rooted_phase_data(base, root, rank_q, support)
    lr = rooted_phase_data(lower, root, rank_q - 1)
    jr = rooted_phase_data(
        j_graph, root if root in j_graph else next(iter(j_graph), root),
        rank_q - 1, support
    ) if j_graph else {
        "count": 0, "mass": 0, "square": 0, "components": 0,
        "support_absent": 0, "support_hit": 0,
        "support_absent_mass": 0,
    }
    # The root statistics requested above are irrelevant for J.  If J
    # is nonempty, passing an arbitrary present vertex only lets the
    # common moment collector be reused.
    kp = rooted_phase_data(
        k_graph,
        root if root in k_graph else next(iter(k_graph), root),
        rank_q - 2,
    ) if k_graph else {
        "count": int(rank_q - 2 == 0),
        "mass": 0, "square": 0, "components": 0,
    }
    jp = rooted_phase_data(
        j_graph, next(iter(j_graph)), rank_q - 2, support
    ) if j_graph else {
        "count": 0, "mass": 0, "square": 0, "components": 0,
        "support_absent": 0, "support_hit": 0,
        "support_absent_mass": 0,
    }
    km = rooted_phase_data(
        k_graph, next(iter(k_graph)), rank_q - 3
    ) if k_graph else {
        "count": int(rank_q - 3 == 0),
        "mass": 0, "square": 0, "components": 0,
    }

    def put(name: str, value: int, target: dict[sp.Symbol, int]):
        target[symbols[name]] = value

    sub: dict[sp.Symbol, int] = {symbols["q"]: rank_q}
    for name, key in (
        ("N", "count"), ("S1", "mass"), ("H", "square"),
        ("C", "components"), ("X", "root_absent"),
        ("Y", "root_hit"), ("HX", "root_absent_mass"),
        ("A", "support_absent"), ("Bc", "support_hit"),
        ("HA", "support_absent_mass"),
        ("AX", "root_support_absent"),
    ):
        put(name, bq[key], sub)
    for name, key in (
        ("n", "count"), ("s1", "mass"), ("h", "square"),
        ("c", "components"), ("x", "root_absent"),
        ("y", "root_hit"), ("hx", "root_absent_mass"),
    ):
        put(name, lr[key], sub)
    for name, key in (
        ("M", "count"), ("T", "mass"), ("J2", "square"),
        ("D", "components"), ("A1", "support_absent"),
        ("B1", "support_hit"), ("HA1", "support_absent_mass"),
    ):
        put(name, jr[key], sub)
    for name, key in (
        ("m", "count"), ("u", "mass"), ("k2", "square"),
        ("e", "components"),
    ):
        put(name, kp[key], sub)
    for name, key in (
        ("P", "count"), ("U", "mass"), ("K2", "square"),
        ("E", "components"), ("A2", "support_absent"),
        ("B2", "support_hit"), ("HA2", "support_absent_mass"),
    ):
        put(name, jp[key], sub)
    for name, key in (
        ("p", "count"), ("V", "mass"), ("L2", "square"),
        ("F", "components"),
    ):
        put(name, km[key], sub)
    return sub


def finite_audit(
    gap: sp.Expr,
    symbols: dict[str, sp.Symbol],
    maximum_order: int,
) -> dict:
    checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    ordered_symbols = list(symbols.values())
    gap_function = sp.lambdify(ordered_symbols, gap, "math")
    for order in range(3, maximum_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            base = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                base, header=False
            ).decode("ascii").strip()
            for root in base:
                for support in base:
                    if support == root:
                        continue
                    lower = base.subgraph(
                        set(base) - {support}
                    ).copy()
                    if root not in lower:
                        continue
                    extended = base.copy()
                    leaf = order
                    extended.add_edge(support, leaf)
                    distinguished = order + 1
                    full = extended.copy()
                    full.add_edge(root, distinguished)
                    old = base.copy()
                    old.add_edge(root, distinguished)
                    lower_full = lower.copy()
                    lower_full.add_edge(root, distinguished)
                    d_full = theta_core(
                        full, root, distinguished
                    )
                    d_old = theta_core(old, root, distinguished)
                    d_lower = theta_core(
                        lower_full, root, distinguished
                    )
                    ranks = (
                        set(d_full)
                        | set(d_old)
                        | {rank + 1 for rank in d_lower}
                    )
                    for q in ranks:
                        if q < 4:
                            continue
                        direct = (
                            d_full.get(q, 0)
                            - d_old.get(q, 0)
                            - q * q * d_lower.get(q - 1, 0)
                        )
                        sub = direct_symbol_substitution(
                            base, root, support, q, symbols
                        )
                        formula_unscaled = int(
                            gap_function(
                                *[
                                    sub[symbol]
                                    for symbol in ordered_symbols
                                ]
                            )
                        )
                        formula = (
                            formula_unscaled
                            * int(sp.factorial(q)) ** 2
                        )
                        record = {
                            "order": order,
                            "graph6": code,
                            "root": root,
                            "support": support,
                            "rank_q": q,
                            "direct_factorial_margin": direct,
                            "cross_polynomial_factorial_margin": formula,
                        }
                        if direct != formula:
                            failures.append(record)
                        if (
                            minimum is None
                            or direct < minimum[0]
                        ):
                            minimum = (direct, record)
                        checks += 1
    return {
        "maximum_unlabeled_tree_order": maximum_order,
        "checked_root_support_rank_instances": checks,
        "identity_failure_count": len(failures),
        "identity_failures": failures[:20],
        "minimum_recursive_margin": (
            minimum[1] if minimum is not None else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=7)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_theta_core_recursive_gap_identity_"
            "certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    gap, symbols = symbolic_recursive_gap()
    phase_blocks = symbolic_phase_split(gap, symbols)
    audit = finite_audit(gap, symbols, args.maximum_order)
    report = {
        "status": (
            "PASS_SIBLING_THETA_CORE_RECURSIVE_GAP_IDENTITY"
            if not audit["identity_failure_count"]
            else "FAIL_SIBLING_THETA_CORE_RECURSIVE_GAP_IDENTITY"
        ),
        "symbolic_identity": True,
        "valid_ranks": "q>=4",
        "rank_three_boundary": (
            "At q=3 the pruning definition omits the formal "
            "rank-two core and is a separate boundary inequality."
        ),
        "expanded_term_count": len(sp.Add.make_args(gap)),
        "factored_cross_polynomial": str(sp.factor(gap)),
        "doubled_phase_block_term_counts": {
            name: len(sp.Add.make_args(expression))
            for name, expression in phase_blocks.items()
        },
        "two_nonnegative_subtargets": {
            "shadow_phi": (
                "Delta(root)+Delta(phi)+Delta(8M^2) >= 0"
            ),
            "component_square": "Delta(psi)+Delta(chi) >= 0",
        },
        **audit,
        "warning": (
            "The identity is proved algebraically. Nonnegativity of "
            "the cross polynomial remains a proof obligation."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
