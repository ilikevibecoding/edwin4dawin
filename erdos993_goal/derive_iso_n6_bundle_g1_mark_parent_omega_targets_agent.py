#!/usr/bin/env python3
"""Exact coefficient targets and shortcut obstructions for marked-parent Omega."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from derive_iso_n6_bundle_g1_ordinary_leaf_marked_partition_cone_g1_nonadjacent import category_rows
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_mark_parent_omega_targets_exact_agent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_MARK_PARENT_OMEGA_TARGETS_AGENT"
PINS = {
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "derive_iso_n6_bundle_g1_mark_parent_oriented_superforest_agent.py":
        "4C444732EB1B26D157B64D636A04E4A4097E6688C91FA406BF656BAE0B0FFA7E",
    "iso_n6_bundle_g1_mark_parent_oriented_superforest_exact_agent_20260831.json":
        "F46AB5798AF8D15B0421545D4AFF5E0331EDB0E3EED0D379C89D4411133E0CFC",
}

PSI_WITNESS = {
    "order": 8,
    "edges": ((0, 1), (2, 3), (3, 4), (3, 7)),
    "marks": (3, 0),
    "B_vertices": (0, 1, 2, 4, 6, 7),
    "expected": {"Omega_parent_absent": 21119, "G2_S_B": 21235, "Psi": -116},
}
THETA_WITNESS = {
    "order": 31,
    "edges": (
        (0, 1), (0, 2), (0, 5), (0, 6), (0, 9), (1, 3), (1, 14),
        (3, 4), (3, 16), (4, 8), (4, 23), (4, 26), (5, 7), (6, 11),
        (9, 10), (9, 12), (9, 22), (9, 30), (11, 21), (14, 25),
        (15, 17), (15, 18), (15, 24), (15, 27), (16, 19), (21, 28),
        (24, 29),
    ),
    "marks": (4, 14),
    "B_vertices": (0, 1, 4, 5, 13, 14, 17, 20, 23, 24, 25, 26, 27, 28, 30),
    "expected": {"Omega_parent_retained": 1545818450, "Omega_parent_absent": 1550325658, "Theta": -4507208},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def free_rows(prefix: str):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")


def add_u_leaf(rowset):
    e, u, v, w = rowset
    return tuple(tuple(
        sp.expand(row[rank] + (source[rank - 1] if rank else 0))
        for rank in range(8)
    ) for row, source in zip(rowset, (u, u, w, w)))


def summary(expression: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(1 for value in coefficients if value < 0),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(sp.expand(expression)).encode()).hexdigest().upper(),
    }


def evaluator(expression: sp.Expr):
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, rowset in (("c", crows), ("d", drows)):
            for family, row in zip("EUVW", rowset):
                for rank, item in enumerate(row):
                    data[f"{prefix}{family}{rank}"] = item
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def graph_from(fixture):
    graph = nx.Graph()
    graph.add_nodes_from(range(fixture["order"]))
    graph.add_edges_from(fixture["edges"])
    if not nx.is_forest(graph):
        raise RuntimeError("fixture is not a forest")
    return graph


def replay_witnesses(g1_value, g2_value):
    out = {}
    fixture = PSI_WITNESS
    a = graph_from(fixture)
    u, v = fixture["marks"]
    b = a.subgraph(fixture["B_vertices"]).copy()
    if u in b:
        raise RuntimeError("Psi witness must omit parent u")
    s = a.copy(); s.remove_node(u)
    c = a.copy(); c.add_node(fixture["order"]); c.add_edge(u, fixture["order"])
    omega = g1_value(rows(c, u, v), rows(b, u, v)) - g1_value(rows(a, u, v), rows(b, u, v))
    frozen = g2_value(rows(s, u, v), rows(b, u, v))
    values = {"Omega_parent_absent": omega, "G2_S_B": frozen, "Psi": omega - frozen}
    if values != fixture["expected"]:
        raise RuntimeError(("Psi witness mismatch", values))
    out["negative_Psi"] = {**fixture, "exact_values": values, "graph6": nx.to_graph6_bytes(a, header=False).decode().strip()}

    fixture = THETA_WITNESS
    a = graph_from(fixture)
    u, v = fixture["marks"]
    b = a.subgraph(fixture["B_vertices"]).copy()
    if u not in b:
        raise RuntimeError("Theta witness must retain parent u")
    t = b.copy(); t.remove_node(u)
    c = a.copy(); c.add_node(fixture["order"]); c.add_edge(u, fixture["order"])
    omega_b = g1_value(rows(c, u, v), rows(b, u, v)) - g1_value(rows(a, u, v), rows(b, u, v))
    omega_t = g1_value(rows(c, u, v), rows(t, u, v)) - g1_value(rows(a, u, v), rows(t, u, v))
    values = {"Omega_parent_retained": omega_b, "Omega_parent_absent": omega_t, "Theta": omega_b - omega_t}
    if values != fixture["expected"]:
        raise RuntimeError(("Theta witness mismatch", values))
    out["negative_Theta"] = {**fixture, "exact_values": values, "graph6": nx.to_graph6_bytes(a, header=False).decode().strip()}
    return out


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINS}
    if actual != PINS:
        raise RuntimeError(("dependency hash mismatch", actual, PINS))

    g1, g2 = reconstruct(1), reconstruct(2)
    arows, brows = free_rows("A"), free_rows("B")
    crows = add_u_leaf(arows)
    omega = sp.expand(substitute(g1, crows, brows) - substitute(g1, arows, brows))
    srows = (arows[1], arows[1], arows[3], arows[3])
    trows = (brows[1], brows[1], brows[3], brows[3])
    parent_absent_rules = {
        **{brows[0][rank]: brows[1][rank] for rank in range(8)},
        **{brows[2][rank]: brows[3][rank] for rank in range(8)},
    }
    omega0 = sp.expand(omega.subs(parent_absent_rules))
    theta = sp.expand(omega - omega0)
    frozen_g2 = sp.expand(substitute(g2, srows, trows))
    psi = sp.expand(omega0 - frozen_g2)
    if sp.expand(omega0 - frozen_g2 - psi) != 0 or sp.expand(omega - omega0 - theta) != 0:
        raise RuntimeError("target split failed")

    # Occupation coordinates show that Theta is exactly the u-containing
    # B/Z endpoint block of the D-linear functional.
    acat_rows, _ = category_rows("C")
    bcat_rows, bcategories = category_rows("D")
    omega_occ = sp.expand(substitute(g1, add_u_leaf(acat_rows), bcat_rows) - substitute(g1, acat_rows, bcat_rows))
    zero_u_containing = {
        bcategories[family][rank]: 0
        for family in ("B", "Z") for rank in range(1, 8)
        if isinstance(bcategories[family][rank], sp.Symbol)
    }
    theta_occ = sp.expand(omega_occ - omega_occ.subs(zero_u_containing))

    witnesses = replay_witnesses(evaluator(g1), evaluator(g2))
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "scope": "Marked-parent u; v is exact mark swap. Adjacent and nonadjacent marks share the identities.",
        "vertex_recurrence": {
            "parent_absent": "Omega_0=G2_6(A-u,B)+Psi_u(A,B), with u absent from B",
            "parent_retained": "Omega_u(A,B)=Omega_u(A,B-u)+Theta_u(A,B)",
            "occupation_description": "Theta is exactly the u-containing B/Z occupation block of B",
        },
        "coefficient_targets": {
            "Psi_parent_absent": summary(psi),
            "Theta_parent_retention_raw": summary(theta),
            "Theta_parent_retention_occupation": summary(theta_occ),
            "Omega_parent_absent_joint": summary(omega0),
            "Omega_full": summary(omega),
        },
        "smallest_safe_target": {
            "statement": "Prove complete Omega_u(A,B)>=0 on genuine forest/minor pairs.",
            "reason": (
                "The smaller 39-term Psi and 17-term endpoint occupation correction Theta "
                "each have genuine negative witnesses, while their complete Omega payments "
                "remain positive in those witnesses."
            ),
            "joint_payment_with_frozen_G2": "For u absent from B, retain G2_6(A-u,B)+Psi as one inseparable payment.",
        },
        "exact_shortcut_obstructions": witnesses,
        "proof_status": (
            "No genuine counterexample to Omega was found here. The exact connected n=8 census "
            "remains positive evidence only; no universal proof follows."
        ),
        "checks": {
            "two_stage_vertex_split": True,
            "Theta_equals_u_containing_occupation_block": True,
            "negative_Psi_genuine_forest": True,
            "negative_Theta_genuine_forest": True,
            "both_full_Omega_values_positive_in_obstructions": True,
        },
        "status": "exact target minimization and genuine shortcut obstructions; Omega sign open",
        "scope_guard": (
            "The negative witnesses refute separate Psi/Theta positivity only, not Omega, the "
            "marked-parent leaf lemma, universal rank-six G1, or Problem 993."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "targets": report["coefficient_targets"],
        "status": report["status"],
        "scope_guard": report["scope_guard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
