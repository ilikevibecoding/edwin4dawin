#!/usr/bin/env python3
"""Degree-two H--K frozen-cell cone screen for the 24 ordinary-parent j00 cores.

Domain.  H is a finite forest with two distinct marks u,v (adjacent or not),
K=H-S where S is the neighbour set of an actual ordinary parent p (p is not a
mark), so S contains at most one vertex from each component of H.  The
K-mask k{ku}{kv} records which marks are retained in K.  Every coordinate is
a marked occupation count: HW_r, HA_r (v only), HB_r (u only), HZ_r (both)
of H, the analogous KW_r, KA_r, KB_r, KZ_r of K, the order n=s+8 (s>=0) of
H and the order k of K.

Generators (all nonnegative on the domain; each family carries a written
justification in the report):
  1. monomials of total degree <=2 in the coordinates;
  2. containment K<=H, order and deleted-mark constraints, isolate-multiply
     upper bounds of H rows by K rows;
  3. star-attachable consequences (k>=e(H), nonadjacent k00 equality c=0);
  4. forest extension / pair / mark-neighbourhood constraints separately on H
     and on K;
  5. frozen G2..G10 cells on cross pairs (H,K) whose theorem domain is
     documented per coefficient;
  6. frozen G2..G10 cells internal to H (and to K when both marks survive).
A generator is admitted only after it evaluates >=0 on every realizable
order-8 (and order-9) instance; violated generators are removed and listed.

Verdicts.  LP infeasibility is only an obstruction to this cone.  LP
feasibility is not a theorem; it is promoted only by a separate exact replay.
"""

from __future__ import annotations

from array import array
from collections import defaultdict
from fractions import Fraction
import hashlib
import itertools
import json
import os
from pathlib import Path
import resource
import sys
import time

os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")

import networkx as nx  # noqa: E402
import numpy as np  # noqa: E402
from scipy.optimize import linprog  # noqa: E402
from scipy.sparse import csc_matrix  # noqa: E402
import sympy as sp  # noqa: E402

from audit_rank8_forest_root_deletion_attachment_floor_root import (  # noqa: E402
    nonisomorphic_forests,
    tree_catalog,
)
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (  # noqa: E402
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct  # noqa: E402


HERE = Path(__file__).resolve().parent
HK_LOWER = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json"
JMASK = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json"
FROZEN_G2_G10 = HERE / "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json"
CENSUS_N8 = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_parent_hk_degree2_frozen_screen_root_20260902.json"
EXPECTED_HK_LOWER_SHA256 = "22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF"
EXPECTED_JMASK_SHA256 = "7B25D57EBEE367C236AA48CB9565877898BA093C27DE68ACB46CA46710D349D6"
EXPECTED_FROZEN_SHA256 = "6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1"
EXPECTED_CENSUS_SHA256 = "08CD091C18BFEE1C87C42E7B4872D23C6CFF2B84BE4414F5C50FA47C54CF95BE"
MARKER_SEARCHED = "SEARCHED_EXACT_GENERATORS_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_DEGREE2_FROZEN_SCREEN_ROOT"
MARKER_FOUND = "FOUND_FLOAT_FEASIBLE_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_DEGREE2_FROZEN_SCREEN_ROOT"
MEMORY_LIMIT_BYTES = 6 * 1024**3
VALIDATION_ORDERS = tuple(
    int(value) for value in os.environ.get("HK_SCREEN_VALIDATION_ORDERS", "8,9").split(",")
)
TARGET_ORDERS = tuple(range(2, max(VALIDATION_ORDERS) + 1))
MAX_RANK = 7


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rss_bytes() -> int:
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024


def guard_memory(stage: str) -> None:
    if rss_bytes() > MEMORY_LIMIT_BYTES:
        raise MemoryError(f"RSS above 6 GiB during {stage}; aborting fail-closed")


def powers(count: int, maximum: int):
    for degree in range(maximum + 1):
        for indices in itertools.combinations_with_replacement(range(count), degree):
            result = [0] * count
            for index in indices:
                result[index] += 1
            yield tuple(result)


def terms(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    expression = sp.expand(expression)
    if expression == 0:
        return {}
    return {
        power: sp.Rational(coefficient)
        for power, coefficient in sp.Poly(expression, *variables).terms()
        if coefficient != 0
    }


def shifted(values: dict, shift: tuple[int, ...]) -> dict:
    return {
        tuple(left + right for left, right in zip(power, shift)): coefficient
        for power, coefficient in values.items()
    }


def multiplied(left: dict, right: dict) -> dict:
    answer: dict = {}
    for lp, lc in left.items():
        for rp, rc in right.items():
            power = tuple(a + b for a, b in zip(lp, rp))
            answer[power] = answer.get(power, sp.Integer(0)) + lc * rc
    return {power: coefficient for power, coefficient in answer.items() if coefficient != 0}


def binomial(expression, count: int):
    answer = sp.Integer(1)
    for index in range(count):
        answer *= (expression - index)
    return sp.expand(answer / sp.factorial(count))


def integerize(expression: sp.Expr) -> sp.Expr:
    """Scale a polynomial with rational coefficients by the lcm of its
    denominators; the sign of the generator is unchanged."""
    expression = sp.expand(expression)
    if expression == 0:
        return expression
    denominators = [sp.Rational(coefficient).q for coefficient in sp.Poly(expression, *expression.free_symbols).coeffs()] \
        if expression.free_symbols else [sp.Rational(expression).q]
    scale = sp.Integer(1)
    for value in denominators:
        scale = sp.ilcm(scale, value)
    return sp.expand(scale * expression)


def has_placeholder(expression: sp.Expr) -> bool:
    return any(str(symbol).startswith("MISSING_") for symbol in expression.free_symbols)


# ---------------------------------------------------------------------------
# Coordinates and marked rows
# ---------------------------------------------------------------------------


def coordinate_names(geometry: str, mask: tuple[int, int]) -> list[str]:
    ku, kv = mask
    names = ["s", "k"]
    for family in "ABW":
        names.extend(f"H{family}{rank}" for rank in range(2, MAX_RANK + 1))
    if geometry == "nonadjacent":
        names.extend(f"HZ{rank}" for rank in range(3, MAX_RANK + 1))
    k_top = MAX_RANK
    names.extend(f"KW{rank}" for rank in range(2, k_top + 1))
    if kv:
        names.extend(f"KA{rank}" for rank in range(2, k_top + 1))
    if ku:
        names.extend(f"KB{rank}" for rank in range(2, k_top + 1))
    if geometry == "nonadjacent" and ku and kv:
        names.extend(f"KZ{rank}" for rank in range(3, k_top + 1))
    return names


def marked_rows(prefix: str, names: dict, order, geometry: str, mask: tuple[int, int]):
    """Return the (E,U,V,W) rows (ranks 0..7) of the marked forest with the
    given prefix, expressed through the occupation coordinates.

    order is the vertex count; mask records which of the two marks are vertices
    of the forest.  Categories of an absent mark are identically zero.
    """
    ku, kv = mask
    nonadjacent = geometry == "nonadjacent"
    zero = sp.Integer(0)

    def coordinate(family: str, rank: int):
        name = f"{prefix}{family}{rank}"
        if name not in names:
            # Placeholder for a rank that is not a coordinate of this cone; every
            # kept generator is checked to be free of placeholders.
            return sp.Symbol(f"MISSING_{name}")
        return names[name]

    w = [sp.Integer(1), sp.expand(order - ku - kv)] + [coordinate("W", r) for r in range(2, 8)]
    a = [zero, sp.Integer(kv)] + [coordinate("A", r) if kv else zero for r in range(2, 8)]
    b = [zero, sp.Integer(ku)] + [coordinate("B", r) if ku else zero for r in range(2, 8)]
    both = ku and kv and nonadjacent
    z = [zero, zero, sp.Integer(1) if both else zero] + [
        coordinate("Z", r) if both else zero for r in range(3, 8)
    ]
    e = tuple(sp.expand(w[r] + a[r] + b[r] + z[r]) for r in range(8))
    u = tuple(sp.expand(w[r] + a[r]) for r in range(8))
    v = tuple(sp.expand(w[r] + b[r]) for r in range(8))
    return e, u, v, tuple(w)


def deletion_states(rows):
    e, u, v, w = rows
    return {
        "E": (e, u, v, w),
        "U": (u, u, w, w),
        "V": (v, w, v, w),
        "W": (w, w, w, w),
        "0": tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in range(4)),
    }


# ---------------------------------------------------------------------------
# Valid constraints
# ---------------------------------------------------------------------------


def single_forest_constraints(prefix: str, names: dict, order, geometry: str, mask: tuple[int, int]):
    """Linear and quadratic constraints valid for one marked forest."""
    ku, kv = mask
    linear: list[tuple[str, sp.Expr, str]] = []
    quadratic: list[tuple[str, sp.Expr, str]] = []
    top = max(int(name[2:]) for name in names if name.startswith(f"{prefix}W"))
    m = sp.expand(order - ku - kv)  # vertices other than the surviving marks
    nonadjacent = geometry == "nonadjacent"

    def c(family: str, rank: int):
        return names[f"{prefix}{family}{rank}"]

    for family, present, other_present in (("A", kv, ku), ("B", ku, kv)):
        if not present:
            continue
        linear.append((
            f"{prefix}_order_{family}",
            sp.expand(m - c(family, 2)),
            f"{prefix}{family}2 counts vertices other than the marks that are not "
            f"adjacent to the relevant mark; there are at most {m} of them.",
        ))
        for rank in range(3, top + 1):
            linear.append((
                f"{prefix}_cross_W_{family}{rank}",
                sp.expand(c("W", rank - 1) - c(family, rank)),
                "Deleting the retained mark from an independent set of its category "
                "gives a distinct independent set avoiding both marks.",
            ))
            quadratic.append((
                f"{prefix}_extension_{family}{rank}",
                sp.expand((c(family, 2) - rank + 2) * c(family, rank - 1) - (rank - 1) * c(family, rank)),
                "Double count: each independent r-set of the category has r-1 "
                "non-mark elements chosen among the available vertices; an "
                "(r-1)-set extends by at most (available - (r-2)) vertices.",
            ))
        quadratic.append((
            f"{prefix}_pair_lower_{family}",
            sp.expand(2 * c(family, 3) - c(family, 2) * (c(family, 2) - 3)),
            "The available set of the mark induces a forest on a vertices, hence has "
            "at most a-1 edges and at least binom(a,2)-(a-1)>=a(a-3)/2 independent pairs.",
        ))
        quadratic.append((
            f"{prefix}_pair_upper_{family}",
            sp.expand(c(family, 2) * (c(family, 2) - 1) - 2 * c(family, 3)),
            "Independent pairs inside the available set are at most binom(a,2).",
        ))
    for rank in range(3, top + 1):
        quadratic.append((
            f"{prefix}_extension_W{rank}",
            sp.expand((m - rank + 1) * c("W", rank - 1) - rank * c("W", rank)),
            "Double count independent r-sets avoiding both marks against their "
            "(r-1)-subsets in a graph on m vertices.",
        ))
    if prefix == "H":
        quadratic.append((
            f"{prefix}_W_pair_lower",
            sp.expand(2 * c("W", 2) - (m - 1) * (m - 2)),
            "The forest on the m>=6 non-mark vertices has at most m-1 edges, so "
            "W2>=binom(m,2)-(m-1)=(m-1)(m-2)/2.",
        ))
    else:
        quadratic.append((
            f"{prefix}_W_pair_lower",
            sp.expand(2 * c("W", 2) - m * (m - 3)),
            "The forest on the m non-mark vertices has at most max(m-1,0) edges; the "
            "safe form W2>=m(m-3)/2 is valid for every m>=0 including m=0.",
        ))
    quadratic.append((
        f"{prefix}_W_pair_upper",
        sp.expand(m * (m - 1) - 2 * c("W", 2)),
        "Independent pairs are at most binom(m,2).",
    ))
    if ku and kv:
        a, b = c("A", 2), c("B", 2)
        if not nonadjacent:
            linear.append((
                f"{prefix}_marked_neighbour_lower",
                sp.expand(a + b - m),
                "For an edge uv the neighbourhoods N(u), N(v) inside the m other "
                "vertices are disjoint, so (m-|N(v)|)+(m-|N(u)|)>=m.",
            ))
            union = 2 * m - a - b
            quadratic.append((
                f"{prefix}_W_adjacent_neighbour_union",
                sp.expand(2 * c("W", 2) - union * (union - 1)),
                "For an edge uv, N(u) and N(v) are disjoint and their union is "
                "independent (any edge would close a cycle), so W2>=binom(|N(u)|+|N(v)|,2).",
            ))
            quadratic.append((
                f"{prefix}_A_contains_V",
                sp.expand(2 * c("A", 3) - (m - b) * (m - b - 1)),
                "Every pair inside N(u) together with v is independent (edge uv, forest).",
            ))
            quadratic.append((
                f"{prefix}_B_contains_U",
                sp.expand(2 * c("B", 3) - (m - a) * (m - a - 1)),
                "Every pair inside N(v) together with u is independent (edge uv, forest).",
            ))
        else:
            z = c("Z", 3)
            common = sp.expand(m - a - b + z)  # |N(u) cap N(v)| in {0,1}
            linear.extend([
                (
                    f"{prefix}_marked_neighbour_lower",
                    sp.expand(a + b - z - (m - 1)),
                    "z=|vertices adjacent to neither mark|=m-|N(u) cup N(v)|; two "
                    "nonadjacent vertices of a forest have at most one common neighbour, "
                    "so a+b-z=m-|N(u) cap N(v)|>=m-1.",
                ),
                (
                    f"{prefix}_marked_neighbour_upper",
                    sp.expand(m - a - b + z),
                    "|N(u) cap N(v)|>=0.",
                ),
            ])
            for rank in range(3, top + 1):
                wcap = m if rank == 3 else c("W", rank - 2)
                linear.extend([
                    (
                        f"{prefix}_cross_W_Z{rank}",
                        sp.expand(wcap - c("Z", rank)),
                        "Deleting both marks from an independent set containing both gives "
                        "an independent set avoiding both marks.",
                    ),
                    (
                        f"{prefix}_cross_A_Z{rank}",
                        sp.expand(c("A", rank - 1) - c("Z", rank)),
                        "Deleting u from an independent set containing both marks gives a "
                        "distinct independent set containing v only.",
                    ),
                    (
                        f"{prefix}_cross_B_Z{rank}",
                        sp.expand(c("B", rank - 1) - c("Z", rank)),
                        "Deleting v from an independent set containing both marks gives a "
                        "distinct independent set containing u only.",
                    ),
                ])
            for rank in range(2, top - 1):
                linear.append((
                    f"{prefix}_AB_union_W{rank}",
                    sp.expand(c("W", rank) - c("A", rank + 1) - c("B", rank + 1) + c("Z", rank + 2)),
                    "Inclusion-exclusion: independent r-sets avoiding both marks that "
                    "avoid N(v) or avoid N(u) number A_(r+1)+B_(r+1)-Z_(r+2)<=W_r.",
                ))
            for rank in range(4, top + 1):
                quadratic.append((
                    f"{prefix}_extension_Z{rank}",
                    sp.expand((z - rank + 3) * c("Z", rank - 1) - (rank - 2) * c("Z", rank)),
                    "Double count independent sets containing both marks: the other r-2 "
                    "elements lie among the z vertices adjacent to neither mark.",
                ))
            quadratic.extend([
                (
                    f"{prefix}_Z_pair_lower",
                    sp.expand(2 * c("Z", 4) - z * (z - 3)),
                    "The z vertices adjacent to neither mark induce a forest with at most "
                    "z-1 edges.",
                ),
                (
                    f"{prefix}_Z_pair_upper",
                    sp.expand(z * (z - 1) - 2 * c("Z", 4)),
                    "Independent pairs among the z vertices are at most binom(z,2).",
                ),
                (
                    f"{prefix}_W_contains_U",
                    sp.expand(2 * c("W", 2) - (m - a) * (m - a - 1)),
                    "N(v) is an independent set of size m-a avoiding both marks.",
                ),
                (
                    f"{prefix}_W_contains_V",
                    sp.expand(2 * c("W", 2) - (m - b) * (m - b - 1)),
                    "N(u) is an independent set of size m-b avoiding both marks.",
                ),
                (
                    f"{prefix}_W_nonadjacent_neighbour_union",
                    sp.expand(2 * c("W", 2) - (m - z) * (m - z - 1) + 2 * (1 - common)),
                    "N(u) cup N(v) has m-z vertices and induces at most 1-|N(u) cap N(v)| "
                    "edges (a second edge or an edge with a common neighbour closes a cycle).",
                ),
                (
                    f"{prefix}_A_contains_V_minus_U",
                    sp.expand(2 * c("A", 3) - (a - z) * (a - z - 1)),
                    "N(u)-N(v) has a-z vertices, each nonadjacent to v, and is independent.",
                ),
                (
                    f"{prefix}_B_contains_U_minus_V",
                    sp.expand(2 * c("B", 3) - (b - z) * (b - z - 1)),
                    "N(v)-N(u) has b-z vertices, each nonadjacent to u, and is independent.",
                ),
            ])
    elif ku or kv:
        family = "A" if kv else "B"
        a = c(family, 2)
        quadratic.append((
            f"{prefix}_W_contains_mark_neighbourhood",
            sp.expand(2 * c("W", 2) - (m - a) * (m - a - 1)),
            "The neighbourhood of the surviving mark is an independent set of size m-a "
            "avoiding the mark.",
        ))
    return linear, quadratic


def coupling_constraints(names: dict, n, geometry: str, mask: tuple[int, int]):
    """Constraints coupling K=H-S to H under the ordinary-parent relation."""
    ku, kv = mask
    k = names["k"]
    d = sp.expand(n - k)
    nonadjacent = geometry == "nonadjacent"
    linear: list[tuple[str, sp.Expr, str]] = []
    quadratic: list[tuple[str, sp.Expr, str]] = []
    equalities: list[tuple[str, sp.Expr, str]] = []
    k_top = max(int(name[2:]) for name in names if name.startswith("KW"))

    linear.append((
        "order_H_minus_K",
        sp.expand(d - (1 - ku) - (1 - kv)),
        "S=H-K contains every deleted mark, so |S|=n-k is at least the number of deleted marks.",
    ))
    for family, present in (("W", True), ("A", kv), ("B", ku), ("Z", nonadjacent and ku and kv)):
        if not present:
            continue
        for rank in range(3 if family == "Z" else 2, k_top + 1):
            linear.append((
                f"containment_{family}{rank}",
                sp.expand(names[f"H{family}{rank}"] - names[f"K{family}{rank}"]),
                "K is an induced subforest of H containing the surviving marks, so each "
                "independent set of K of a mark category is one of H of the same category.",
            ))
    z2 = 1 if nonadjacent else 0
    i2 = names["HW2"] + names["HA2"] + names["HB2"] + z2
    quadratic.append((
        "star_attachable_k_ge_edges",
        sp.expand(2 * k - n * (n - 1) + 2 * i2),
        "S has at most one vertex per component of H, so |S|<=c(H)=n-e(H) where "
        "e(H)=binom(n,2)-i_2(H); equivalently k>=e(H).",
    ))

    # Isolate-multiply upper bounds: an independent set of H whose mark part is T
    # splits as T cup R_K cup R_S with R_K inside K-{u,v} and R_S inside S'=S-{u,v}.
    hrows_by_family = {"W": (), "A": ("v",), "B": ("u",), "Z": ("u", "v")}
    retained = {"u": bool(ku), "v": bool(kv)}
    d_prime = sp.expand(d - (1 - ku) - (1 - kv))
    kmark = (ku, kv)
    _, _, _, kw = marked_rows("K", names, k, geometry, kmark)
    krows = {
        "W": kw,
        "A": tuple(sp.expand(x - y) for x, y in zip(marked_rows("K", names, k, geometry, kmark)[1], kw)),
        "B": tuple(sp.expand(x - y) for x, y in zip(marked_rows("K", names, k, geometry, kmark)[2], kw)),
    }
    ke, ku_row, kv_row, _ = marked_rows("K", names, k, geometry, kmark)
    krows["Z"] = tuple(sp.expand(ke[r] - ku_row[r] - kv_row[r] + kw[r]) for r in range(8))
    for family, marks in hrows_by_family.items():
        if family == "Z" and not nonadjacent:
            continue
        surviving = tuple(mark for mark in marks if retained[mark])
        target_family = {(): "W", ("v",): "A", ("u",): "B", ("u", "v"): "Z"}[surviving]
        for rank in range(2, 8):
            if f"H{family}{rank}" not in names:
                continue
            bound = sp.Integer(0)
            for j in range(0, rank - len(marks) + 1):
                remaining = rank - len(marks) - j + len(surviving)
                if remaining < 0 or remaining > 7:
                    continue
                bound += binomial(d_prime, j) * krows[target_family][remaining]
            expression = sp.expand(bound - names[f"H{family}{rank}"])
            if expression == 0 or has_placeholder(expression):
                continue
            if sp.Poly(expression, *names.values()).total_degree() > 2:
                continue
            quadratic.append((
                f"isolate_multiply_{family}{rank}",
                expression,
                "Write an independent set of H with mark part T as T cup R_K cup R_S, "
                "R_K inside K-{u,v}, R_S inside S'=S-{u,v}; (T cap K) cup R_K is an "
                "independent set of K and R_S is any j-subset of S', so the count is at most "
                "sum_j binom(|S'|,j) K_(r-|T|-j) with the K category of T cap K.",
            ))
    if nonadjacent and mask == (0, 0):
        m = n - 2
        a, b, z = names["HA2"], names["HB2"], names["HZ3"]
        equalities.append((
            "k00_no_common_neighbour",
            sp.expand(a + b - z - m),
            "Both marks lie in S, hence in distinct components of H; a common neighbour "
            "would join them, so |N(u) cap N(v)|=m-a-b+z=0.",
        ))
        quadratic.append((
            "k00_W_neighbour_union_edgeless",
            sp.expand(2 * names["HW2"] - (m - z) * (m - z - 1)),
            "Both marks lie in distinct components, so N(u) cup N(v) (m-z vertices) is "
            "independent and W2>=binom(m-z,2).",
        ))
    return linear, quadratic, equalities


# ---------------------------------------------------------------------------
# Frozen G2..G10 cells
# ---------------------------------------------------------------------------

FROZEN_DOMAIN_NOTES = {
    "G2": (
        "Certified G2 (PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_ALL_PARENT_MODES_ROOT) is "
        "proved by parent modes: D=C (no parent), D=C-u, D=C-v (endpoint parents) and D=C-p "
        "for a single ordinary vertex p.  Only these single-deletion pairs are imported; "
        "(H,K) with |S|>=2 and every multi-vertex minor are excluded for G2."
    ),
    "G3": (
        "Certified G3 (PASS_EXACT_ISO_N6_BUNDLE_G3_MARKED_EDGE_BERNSTEIN_G1_NONADJACENT) is "
        "stated for every finite marked forest C and every induced marked minor D of C, "
        "including the empty minor; all induced pairs with two-marked C are imported."
    ),
    "G4..G10": (
        "Certified G4 and G5..G10 are stated for every forest-realizable marked sibling-bundle "
        "cell (C,D)=(B-s,B-N[s]) with s an unmarked vertex of a forest B whose marks are in "
        "B-s.  A pair (C,C-T) is such a cell iff T meets each component of C at most once: "
        "attach a new vertex s to T.  (H,K) qualifies with s=p; (C,C) and (C,C-mark) qualify; "
        "(H,H-u-v) qualifies only when u,v lie in distinct components, which is forced in the "
        "nonadjacent k00 mask.  Other minors are excluded even though the underlying "
        "certificates only use containment of D in C."
    ),
    "degenerate_states": (
        "Every certified theorem requires C to carry two distinct marks that are vertices of "
        "C.  The mark-deletion states H-u, H-v, H-u-v and any K with a deleted mark have an "
        "absent mark (E-row equal to U-row), so cells with such a first argument -- the "
        "(U,U),(U,W),(V,V),(V,W),(W,W) pairs of the older q-free scripts and K-internal cells "
        "outside mask k11 -- are excluded as not literally in any certified domain."
    ),
}


def frozen_cells(names: dict, n, geometry: str, mask: tuple[int, int], coefficients: dict):
    ku, kv = mask
    nonadjacent = geometry == "nonadjacent"
    k = names["k"]
    hrows = marked_rows("H", names, n, geometry, (1, 1))
    hstates = deletion_states(hrows)
    krows = marked_rows("K", names, k, geometry, mask)
    kstates = deletion_states(krows)
    cells: list[tuple[str, sp.Expr, str]] = []

    def add(label: str, index: int, crows, drows, justification: str):
        expression = sp.expand(substitute(coefficients[index], crows, drows))
        if expression == 0:
            return
        if has_placeholder(expression):
            raise RuntimeError(f"frozen cell G{index}{label} needs a coordinate outside the cone")
        cells.append((f"G{index}{label}", expression, justification))

    for index in range(2, 9):
        # H-internal: single-vertex or no deletion, literal in every certified domain.
        add("(H,H)", index, hstates["E"], hstates["E"],
            "D=C: no-parent mode / induced minor / bundle cell with isolated support.")
        if index <= 7:
            add("(H,H-u)", index, hstates["E"], hstates["U"],
                "D=C-u: endpoint-u parent mode / induced minor / bundle cell with s~u.")
            add("(H,H-v)", index, hstates["E"], hstates["V"],
                "D=C-v: endpoint-v parent mode / induced minor / bundle cell with s~v.")
        if index == 3 or (4 <= index <= 7 and nonadjacent and mask == (0, 0)):
            add("(H,H-u-v)", index, hstates["E"], hstates["W"],
                "G3: induced minor.  G4..G7 only in nonadjacent k00, where u,v lie in distinct "
                "components so s~{u,v} realizes the bundle cell.")
        if index == 3:
            add("(H,0)", index, hstates["E"], hstates["0"], "G3: the empty induced minor.")
        # Cross cells (H,K).
        if 3 <= index <= 7:
            add("(H,K)", index, hstates["E"], kstates["E"],
                "G3: K is an induced minor of H.  G4..G7: (H,K)=(B-p,B-N[p]) for B=H+p, a "
                "forest because S meets each component of H at most once.")
        if index == 3:
            if ku:
                add("(H,K-u)", index, hstates["E"], kstates["U"], "G3: K-u is an induced minor of H.")
            if kv:
                add("(H,K-v)", index, hstates["E"], kstates["V"], "G3: K-v is an induced minor of H.")
            if ku and kv:
                add("(H,K-u-v)", index, hstates["E"], kstates["W"], "G3: K-u-v is an induced minor of H.")
        # K-internal cells: only when K carries both marks.
        if ku and kv:
            add("(K,K)", index, kstates["E"], kstates["E"],
                "K is a two-marked forest; D=C is the no-parent mode / induced minor / bundle cell.")
            if index <= 7:
                add("(K,K-u)", index, kstates["E"], kstates["U"],
                    "K two-marked; D=C-u endpoint mode / induced minor / bundle cell.")
                add("(K,K-v)", index, kstates["E"], kstates["V"],
                    "K two-marked; D=C-v endpoint mode / induced minor / bundle cell.")
            if index == 3:
                add("(K,K-u-v)", index, kstates["E"], kstates["W"], "G3: induced minor of K.")
                add("(K,0)", index, kstates["E"], kstates["0"], "G3: empty induced minor of K.")
    return cells


# ---------------------------------------------------------------------------
# Cone assembly
# ---------------------------------------------------------------------------


def build_cone(geometry: str, mask: tuple[int, int], coefficients: dict):
    start = time.time()
    variable_names = coordinate_names(geometry, mask)
    variables = tuple(sp.Symbol(name, integer=True, nonnegative=True) for name in variable_names)
    names = {str(variable): variable for variable in variables}
    s, k = names["s"], names["k"]
    n = s + 8
    linear, quadratic, equalities = [], [], []
    h_linear, h_quadratic = single_forest_constraints("H", names, n, geometry, (1, 1))
    k_linear, k_quadratic = single_forest_constraints("K", names, k, geometry, mask)
    c_linear, c_quadratic, c_equalities = coupling_constraints(names, n, geometry, mask)
    linear.extend(h_linear + k_linear + c_linear)
    quadratic.extend(h_quadratic + k_quadratic + c_quadratic)
    equalities.extend(c_equalities)
    frozen = frozen_cells(names, n, geometry, mask, coefficients)
    for group in (linear, quadratic, equalities, frozen):
        for position, (name, value, why) in enumerate(group):
            if has_placeholder(value):
                raise RuntimeError(f"generator {name} uses a coordinate outside the cone")
            group[position] = (name, integerize(value), why)
    seen_names = set()
    for name, _, _ in linear + quadratic + equalities + frozen:
        if name in seen_names:
            raise RuntimeError(f"duplicate generator name {name}")
        seen_names.add(name)

    basis = tuple(sorted(powers(len(variables), 2), reverse=True))
    rows = {power: index for index, power in enumerate(basis)}
    columns: list[dict] = []
    column_names: list[str] = []
    column_family: list[str] = []
    justifications: dict[str, str] = {}

    def add(name: str, family: str, values: dict):
        if not values or max(map(sum, values)) > 2:
            return
        column_names.append(name)
        column_family.append(family)
        columns.append(values)

    for power in powers(len(variables), 2):
        add("monomial:" + ",".join(map(str, power)), "monomial", {power: sp.Integer(1)})
    linear_terms = []
    for name, value, why in linear:
        justifications[name] = why
        linear_terms.append((name, terms(value, variables)))
    degree_one = tuple(powers(len(variables), 1))
    for name, values in linear_terms:
        for multiplier in degree_one:
            add(f"linear:{name}*" + ",".join(map(str, multiplier)), "linear", shifted(values, multiplier))
    for left in range(len(linear_terms)):
        for right in range(left, len(linear_terms)):
            add(
                f"product:{linear_terms[left][0]}*{linear_terms[right][0]}",
                "linear_product",
                multiplied(linear_terms[left][1], linear_terms[right][1]),
            )
    for name, value, why in quadratic:
        justifications[name] = why
        add(f"quadratic:{name}", "quadratic", terms(value, variables))
    for name, value, why in frozen:
        justifications[name] = why
        add(f"frozen:{name}", "frozen", terms(value, variables))
    for name, value, why in equalities:
        justifications[name] = why
        values = terms(value, variables)
        for multiplier in degree_one:
            shifted_values = shifted(values, multiplier)
            if shifted_values and max(map(sum, shifted_values)) <= 2:
                suffix = ",".join(map(str, multiplier))
                add(f"equality:+{name}*{suffix}", "equality", shifted_values)
                add(f"equality:-{name}*{suffix}", "equality",
                    {power: -coefficient for power, coefficient in shifted_values.items()})

    row_indices = array("i")
    col_indices = array("i")
    data = array("d")
    integer_data = []
    for column, values in enumerate(columns):
        for power, coefficient in values.items():
            row_indices.append(rows[power])
            col_indices.append(column)
            data.append(float(coefficient))
            integer_data.append(coefficient)
    matrix = csc_matrix(
        (np.frombuffer(data, dtype=np.float64), (np.frombuffer(row_indices, dtype=np.int32),
                                                np.frombuffer(col_indices, dtype=np.int32))),
        shape=(len(basis), len(columns)),
    )
    if any(coefficient.q != 1 for coefficient in integer_data):
        raise RuntimeError("non-integer generator coefficient; integer validation impossible")
    integer_matrix = csc_matrix(
        (np.array([int(c) for c in integer_data], dtype=np.int64),
         (np.frombuffer(row_indices, dtype=np.int32), np.frombuffer(col_indices, dtype=np.int32))),
        shape=(len(basis), len(columns)),
    )
    return {
        "geometry": geometry,
        "mask": mask,
        "variables": variables,
        "variable_names": variable_names,
        "names": names,
        "basis": basis,
        "rows": rows,
        "columns": columns,
        "column_names": column_names,
        "column_family": column_family,
        "matrix": matrix,
        "integer_matrix": integer_matrix,
        "linear": linear,
        "quadratic": quadratic,
        "equalities": equalities,
        "frozen": frozen,
        "justifications": justifications,
        "build_seconds": time.time() - start,
    }


# ---------------------------------------------------------------------------
# Realizable (H,K) instance census
# ---------------------------------------------------------------------------


def independent_sets(graph: nx.Graph):
    order = len(graph)
    adjacency = np.zeros(order, dtype=np.int64)
    for a, b in graph.edges():
        adjacency[a] |= 1 << b
        adjacency[b] |= 1 << a
    masks = np.arange(1 << order, dtype=np.int64)
    ok = np.ones(1 << order, dtype=bool)
    for vertex in range(order):
        has = ((masks >> vertex) & 1).astype(bool)
        ok &= ~(has & ((masks & adjacency[vertex]) != 0))
    sets = masks[ok]
    sizes = np.zeros(len(sets), dtype=np.int64)
    for vertex in range(order):
        sizes += (sets >> vertex) & 1
    return sets, sizes


def attachable_deletion_sets(graph: nx.Graph):
    components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
    for choices in itertools.product(*[(None, *component) for component in components]):
        yield tuple(vertex for vertex in choices if vertex is not None)


def census_instances(orders, catalog):
    """Return {(geometry,mask): {"names": [...], "rows": int64 array, "orders": array,
    "witness": list}} for every forest H of the given orders, every ordered marked
    pair, and every attachable deletion set S (K=H-S)."""
    groups: dict = {}
    counts = {"forests": 0, "relation_instances": 0, "marked_instances": 0}
    for order in orders:
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            counts["forests"] += 1
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            sets, sizes = independent_sets(graph)
            hasbit = [((sets >> vertex) & 1).astype(bool) for vertex in range(order)]
            for deleted in attachable_deletion_sets(graph):
                counts["relation_instances"] += 1
                smask = 0
                for vertex in deleted:
                    smask |= 1 << vertex
                keep = (sets & smask) == 0
                k = order - len(deleted)
                for u in range(order):
                    for v in range(order):
                        if u == v:
                            continue
                        counts["marked_instances"] += 1
                        geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                        ku = int(u not in deleted)
                        kv = int(v not in deleted)
                        mask = (ku, kv)
                        key = (geometry, mask)
                        if key not in groups:
                            variable_names = coordinate_names(geometry, mask)
                            groups[key] = {
                                "names": variable_names,
                                "index": {name: i for i, name in enumerate(variable_names)},
                                "rows": [],
                                "orders": [],
                                "witness": [],
                            }
                        group = groups[key]
                        hu, hv = hasbit[u], hasbit[v]
                        category_masks = {
                            "W": ~hu & ~hv,
                            "A": hv & ~hu,
                            "B": hu & ~hv,
                            "Z": hu & hv,
                        }
                        row = np.zeros(len(group["names"]), dtype=np.int64)
                        row[group["index"]["s"]] = order - 8
                        row[group["index"]["k"]] = k
                        for family, cmask in category_masks.items():
                            hcount = np.bincount(sizes[cmask], minlength=8)
                            kcount = np.bincount(sizes[cmask & keep], minlength=8)
                            for rank in range(2, 8):
                                hname = f"H{family}{rank}"
                                kname = f"K{family}{rank}"
                                if family == "Z" and rank == 2:
                                    # Structural constant: {u,v} is independent iff nonadjacent.
                                    expected_h = 1 if geometry == "nonadjacent" else 0
                                    if hcount[2] != expected_h or kcount[2] != expected_h * ku * kv:
                                        raise RuntimeError(("Z2 constant mismatch", graph6, deleted, u, v))
                                    continue
                                if hname in group["index"]:
                                    row[group["index"][hname]] = hcount[rank]
                                elif hcount[rank] != 0:
                                    raise RuntimeError(("nonzero absent H coordinate", hname, graph6, u, v))
                                if kname in group["index"]:
                                    row[group["index"][kname]] = kcount[rank]
                                elif kcount[rank] != 0:
                                    raise RuntimeError(("nonzero absent K coordinate", kname, graph6, deleted, u, v))
                        group["rows"].append(row)
                        group["orders"].append(order)
                        group["witness"].append((order, forest_index, graph6, u, v, list(deleted)))
    for group in groups.values():
        group["rows"] = np.array(group["rows"], dtype=np.int64)
        group["orders"] = np.array(group["orders"], dtype=np.int64)
    return groups, counts


def monomial_matrix(values: np.ndarray, basis) -> np.ndarray:
    count = values.shape[0]
    result = np.empty((count, len(basis)), dtype=np.int64)
    for column, power in enumerate(basis):
        product = np.ones(count, dtype=np.int64)
        for variable, exponent in enumerate(power):
            for _ in range(exponent):
                product = product * values[:, variable]
        result[:, column] = product
    return result


def validate_generators(cone: dict, group: dict, minimum_order: int = 8, chunk: int = 4000):
    """Exact integer evaluation of every generator on every realizable instance."""
    selected = group["rows"][group["orders"] >= minimum_order]
    if len(selected) == 0:
        return None
    matrix = cone["integer_matrix"]
    minima = np.full(matrix.shape[1], np.iinfo(np.int64).max, dtype=np.int64)
    argmin = np.zeros(matrix.shape[1], dtype=np.int64)
    positions = np.nonzero(group["orders"] >= minimum_order)[0]
    for start in range(0, len(selected), chunk):
        block = selected[start:start + chunk]
        mono = monomial_matrix(block, cone["basis"])
        values = np.asarray((matrix.T @ mono.T).T)
        block_min = values.min(axis=0)
        block_arg = values.argmin(axis=0)
        better = block_min < minima
        minima[better] = block_min[better]
        argmin[better] = positions[start + block_arg[better]]
        guard_memory("generator validation")
    return minima, argmin


def evaluate_targets(cone: dict, group: dict, target_term_dicts: list[dict], chunk: int = 4000):
    """Exact integer evaluation of several degree-two targets on all instances
    of a group (all census orders, including n<8 where s=n-8 is negative)."""
    values = group["rows"]
    coefficient_matrix = np.zeros((len(cone["basis"]), len(target_term_dicts)), dtype=np.int64)
    for column, target_terms in enumerate(target_term_dicts):
        for power, coefficient in target_terms.items():
            if sp.Rational(coefficient).q != 1:
                raise RuntimeError("non-integer target coefficient")
            coefficient_matrix[cone["rows"][power], column] = int(coefficient)
    orders = group["orders"]
    distinct_orders = sorted(set(int(order) for order in orders))
    minima = {order: np.full(len(target_term_dicts), np.iinfo(np.int64).max, dtype=np.int64)
              for order in distinct_orders}
    argmin = {order: np.zeros(len(target_term_dicts), dtype=np.int64) for order in distinct_orders}
    negatives = {order: np.zeros(len(target_term_dicts), dtype=np.int64) for order in distinct_orders}
    for start in range(0, len(values), chunk):
        block = monomial_matrix(values[start:start + chunk], cone["basis"]) @ coefficient_matrix
        block_orders = orders[start:start + chunk]
        for order in set(block_orders.tolist()):
            rows_of_order = np.nonzero(block_orders == order)[0]
            sub = block[rows_of_order]
            sub_min = sub.min(axis=0)
            sub_arg = sub.argmin(axis=0)
            better = sub_min < minima[order]
            minima[order][better] = sub_min[better]
            argmin[order][better] = start + rows_of_order[sub_arg[better]]
            negatives[order] += (sub < 0).sum(axis=0)
    return minima, argmin, negatives


# ---------------------------------------------------------------------------
# LP and reconstruction
# ---------------------------------------------------------------------------


def prepare_target(expression: sp.Expr, cone: dict, geometry: str, mask: tuple[int, int]) -> sp.Expr:
    ku, kv = mask
    names = cone["names"]
    n, k = sp.Symbol("n"), sp.Symbol("k")
    replacements = {}
    for symbol in expression.free_symbols:
        text = str(symbol)
        if text == "n":
            replacements[symbol] = names["s"] + 8
        elif text == "k":
            replacements[symbol] = names["k"]
        elif text in names:
            replacements[symbol] = names[text]
        elif text.startswith(("HZ", "KZ")) and geometry == "adjacent":
            replacements[symbol] = 0
        elif text.startswith("KB") and not ku:
            replacements[symbol] = 0
        elif text.startswith("KA") and not kv:
            replacements[symbol] = 0
        elif text.startswith("KZ") and not (ku and kv):
            replacements[symbol] = 0
        else:
            raise RuntimeError(f"unexpected target symbol {text} for {geometry} {mask}")
    return sp.expand(expression.xreplace(replacements))


def exact_reconstruction(cone: dict, active: np.ndarray, solution: np.ndarray, target_terms: dict):
    """Rational reconstruction of a floating LP solution on its support."""
    support = [index for index in np.nonzero(active)[0] if solution[index] > 1e-9]
    basis = cone["basis"]
    columns = cone["columns"]
    result = {"support_size": len(support), "method": None, "exact": False, "multipliers": None}
    if not support:
        return result

    def residual(multipliers):
        reconstructed = {power: sp.Integer(0) for power in basis}
        for index, coefficient in multipliers:
            for power, value in columns[index].items():
                reconstructed[power] += coefficient * value
        return max(abs(reconstructed[power] - target_terms.get(power, 0)) for power in basis)

    # Attempt 1: limited denominators.
    guesses = []
    for index in support:
        fraction = Fraction(float(solution[index])).limit_denominator(1_000_000)
        guesses.append((index, sp.Rational(fraction.numerator, fraction.denominator)))
    if residual(guesses) == 0 and all(value >= 0 for _, value in guesses):
        result.update({"method": "limit_denominator", "exact": True,
                       "multipliers": [(cone["column_names"][i], str(v)) for i, v in guesses]})
        return result
    # Attempt 2: exact rational solve on the support (free variables fixed at
    # their rational approximations).
    involved_rows = sorted({row for index in support for row in
                            (cone["rows"][power] for power in columns[index])} |
                           {cone["rows"][power] for power in target_terms})
    matrix = sp.zeros(len(involved_rows), len(support))
    rhs = sp.zeros(len(involved_rows), 1)
    row_position = {row: position for position, row in enumerate(involved_rows)}
    for column, index in enumerate(support):
        for power, value in columns[index].items():
            matrix[row_position[cone["rows"][power]], column] = value
    for power, coefficient in target_terms.items():
        rhs[row_position[cone["rows"][power]], 0] = coefficient
    try:
        solved, parameters = matrix.gauss_jordan_solve(rhs)
    except ValueError as error:
        result.update({"method": "gauss_jordan_solve", "error": str(error)})
        return result
    substitution = {}
    if parameters.shape[0]:
        free_columns = [
            column for column in range(len(support))
            if any(solved[column].has(parameter) for parameter in parameters)
        ]
        # Fix each free parameter through the rational approximation of the
        # corresponding support value where the solution is a bare parameter.
        for parameter in parameters:
            for column in free_columns:
                if solved[column] == parameter:
                    fraction = Fraction(float(solution[support[column]])).limit_denominator(1_000_000)
                    substitution[parameter] = sp.Rational(fraction.numerator, fraction.denominator)
                    break
            else:
                substitution[parameter] = sp.Integer(0)
    exact = [(index, sp.Rational(sp.expand(solved[column].subs(substitution)))) for column, index in enumerate(support)]
    if residual(exact) == 0 and all(value >= 0 for _, value in exact):
        result.update({"method": "gauss_jordan_solve", "exact": True,
                       "multipliers": [(cone["column_names"][i], str(v)) for i, v in exact]})
    else:
        result.update({"method": "gauss_jordan_solve", "exact": False,
                       "residual": str(residual(exact)),
                       "negative_multipliers": sum(1 for _, v in exact if v < 0)})
    return result


def solve_core(cone: dict, active: np.ndarray, label: str, expression: sp.Expr):
    geometry, mask = cone["geometry"], cone["mask"]
    target = prepare_target(expression, cone, geometry, mask)
    target_terms = terms(target, cone["variables"])
    if any(sum(power) > 2 for power in target_terms):
        raise RuntimeError(f"target degree above two for {label}")
    rhs = np.zeros(len(cone["basis"]))
    for power, coefficient in target_terms.items():
        rhs[cone["rows"][power]] = float(coefficient)
    matrix = cone["matrix"][:, active]
    start = time.time()
    result = linprog(
        np.zeros(matrix.shape[1]), A_eq=matrix, b_eq=rhs, bounds=(0, None),
        method="highs-ds", options={"presolve": True},
    )
    if result.status not in (0, 2):
        result = linprog(
            np.zeros(matrix.shape[1]), A_eq=matrix, b_eq=rhs, bounds=(0, None),
            method="highs-ipm", options={"presolve": True},
        )
    runtime = time.time() - start
    summary = {
        "label": label,
        "geometry": geometry,
        "K_mark_mask": list(mask),
        "target_terms": len(target_terms),
        "target_sha256": hashlib.sha256(sp.srepr(target).encode()).hexdigest().upper(),
        "atoms": int(matrix.shape[1]),
        "rows": int(matrix.shape[0]),
        "nonzeros": int(matrix.nnz),
        "lp_status": int(result.status),
        "lp_message": result.message,
        "feasible": bool(result.success),
        "objective": float(result.fun) if result.success else None,
        "max_float_residual": None,
        "runtime_seconds": runtime,
        "verdict": None,
        "reconstruction": None,
    }
    if result.success:
        full = np.zeros(cone["matrix"].shape[1])
        full[np.nonzero(active)[0]] = result.x
        summary["max_float_residual"] = float(np.max(np.abs(matrix @ result.x - rhs)))
        summary["positive_atoms"] = [
            (cone["column_names"][index], float(full[index]))
            for index in np.nonzero(full > 1e-9)[0]
        ]
        summary["reconstruction"] = exact_reconstruction(cone, active, full, target_terms)
        summary["verdict"] = (
            "FLOAT_FEASIBLE_EXACT_RATIONAL_CANDIDATE_PENDING_SEPARATE_REPLAY"
            if summary["reconstruction"]["exact"]
            else "FLOAT_FEASIBLE_RATIONAL_RECONSTRUCTION_FAILED"
        )
    else:
        summary["verdict"] = "INFEASIBLE_CONE_OBSTRUCTION_ONLY"
        summary["l1_residual_diagnostic"] = l1_residual_diagnostic(cone, matrix, rhs)
    return summary


def l1_residual_diagnostic(cone: dict, matrix, rhs: np.ndarray, top: int = 40) -> dict:
    """Closest cone point in the L1 sense: min sum|r| over A lambda - r = rhs,
    lambda>=0.  The surviving residual monomials show which part of the target
    the degree-two cone cannot match (diagnostic only, no sign claim)."""
    from scipy.sparse import eye, hstack

    rows, atoms = matrix.shape
    identity = eye(rows, format="csc")
    big = hstack([matrix, -identity, identity], format="csc")
    cost = np.concatenate([np.zeros(atoms), np.ones(2 * rows)])
    start = time.time()
    result = linprog(cost, A_eq=big, b_eq=rhs, bounds=(0, None), method="highs", options={"presolve": True})
    if not result.success:
        return {"status": int(result.status), "message": result.message}
    residual = result.x[atoms:atoms + rows] - result.x[atoms + rows:]
    inverse = {index: power for power, index in cone["rows"].items()}
    names = cone["variable_names"]

    def monomial_name(power):
        return "*".join(
            f"{names[i]}^{e}" if e > 1 else names[i] for i, e in enumerate(power) if e
        ) or "1"

    order = np.argsort(-np.abs(residual))
    return {
        "l1_norm": float(np.abs(residual).sum()),
        "target_l1_norm": float(np.abs(rhs).sum()),
        "residual_support": int((np.abs(residual) > 1e-7).sum()),
        "largest_residual_monomials": [
            (monomial_name(inverse[int(index)]), float(residual[index]))
            for index in order[:top] if abs(residual[index]) > 1e-7
        ],
        "runtime_seconds": time.time() - start,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    wall = time.time()
    for path, expected in ((HK_LOWER, EXPECTED_HK_LOWER_SHA256), (JMASK, EXPECTED_JMASK_SHA256),
                           (FROZEN_G2_G10, EXPECTED_FROZEN_SHA256), (CENSUS_N8, EXPECTED_CENSUS_SHA256)):
        observed = sha256(path)
        if observed != expected:
            raise RuntimeError(f"input drift for {path.name}: {observed}")
    frozen_assembly = json.loads(FROZEN_G2_G10.read_text(encoding="utf-8"))
    if frozen_assembly["marker"] != "PASS_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT":
        raise RuntimeError("frozen G2..G10 assembly marker mismatch")
    hk = json.loads(HK_LOWER.read_text(encoding="utf-8"))
    jmask = json.loads(JMASK.read_text(encoding="utf-8"))
    if jmask["marker"] != "PASS_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_JMASK_DOMINANCE_ROOT":
        raise RuntimeError("J-mask dominance marker mismatch")
    core_labels = list(jmask["remaining_core_labels"])
    if len(core_labels) != 32 or jmask["remaining_unique_class_count"] != 24:
        raise RuntimeError("expected 32 j00 labels forming 24 unique core classes")
    cores = {}
    class_members: dict[str, list[str]] = defaultdict(list)
    for label in core_labels:
        branch = hk["branches"][label]
        digest = branch["class_sha256"]
        class_members[digest].append(label)
        cores[label] = {
            "geometry": branch["geometry"],
            "mask": tuple(branch["K_mark_mask"]),
            "class_sha256": digest,
            "expression": sp.sympify(hk["classes"][digest]["lower_expression"]),
        }
    if len(class_members) != 24:
        raise RuntimeError("expected 24 unique core classes")

    print("reconstructing frozen G2..G10 coefficient polynomials", flush=True)
    coefficients = {index: reconstruct(index) for index in range(2, 11)}
    coefficient_hashes = {
        f"G{index}": hashlib.sha256(sp.srepr(value).encode()).hexdigest().upper()
        for index, value in coefficients.items()
    }
    probe_names = {name: sp.Symbol(name) for name in coordinate_names("nonadjacent", (1, 1))}
    probe_rows = marked_rows("H", probe_names, probe_names["s"] + 8, "nonadjacent", (1, 1))
    if substitute(coefficients[10], probe_rows, probe_rows) != 0 or \
            substitute(coefficients[9], probe_rows, probe_rows) != 630:
        raise RuntimeError("unexpected top frozen coefficients G9, G10")

    print(f"enumerating realizable (H,K) instances at orders {TARGET_ORDERS}", flush=True)
    catalog = tree_catalog(max(TARGET_ORDERS))
    groups, counts = census_instances(TARGET_ORDERS, catalog)
    print("census", counts, {f"{g}_k{m[0]}{m[1]}": int(len(v["rows"])) for (g, m), v in groups.items()}, flush=True)
    guard_memory("census")

    cones = {}
    validation = {}
    results = {}
    for geometry in ("adjacent", "nonadjacent"):
        for mask in ((0, 0), (0, 1), (1, 0), (1, 1)):
            key = f"{geometry}_k{mask[0]}{mask[1]}"
            print(f"building cone {key}", flush=True)
            cone = build_cone(geometry, mask, coefficients)
            group = groups.get((geometry, mask))
            active = np.ones(cone["matrix"].shape[1], dtype=bool)
            entry = {
                "variables": cone["variable_names"],
                "atoms_before_validation": int(cone["matrix"].shape[1]),
                "rows": len(cone["basis"]),
                "linear_constraints": len(cone["linear"]),
                "quadratic_constraints": len(cone["quadratic"]),
                "equality_constraints": len(cone["equalities"]),
                "frozen_cells": len(cone["frozen"]),
                "frozen_cell_names": [name for name, _, _ in cone["frozen"]],
                "families": dict(sorted(
                    (family, cone["column_family"].count(family))
                    for family in set(cone["column_family"])
                )),
                "build_seconds": cone["build_seconds"],
                "validation_orders": list(VALIDATION_ORDERS),
                "validation_instances": 0,
                "violated_generators": [],
                "scope": "actual ordinary-parent domain",
            }
            if geometry == "adjacent" and mask == (0, 0):
                entry["scope"] = (
                    "scope-pending: adjacent marks cannot both be deleted by an ordinary parent "
                    "(triangle), so this mask has no realizable instance; the census cannot "
                    "validate its generators and the four cores are solved for completeness only"
                )
            if group is not None:
                selected = group["orders"] >= min(VALIDATION_ORDERS)
                entry["validation_instances"] = int(selected.sum())
                validated = validate_generators(cone, group, min(VALIDATION_ORDERS))
                if validated is not None:
                    minima, argmin = validated
                    for index in np.nonzero(minima < 0)[0]:
                        active[index] = False
                        entry["violated_generators"].append({
                            "atom": cone["column_names"][index],
                            "minimum": int(minima[index]),
                            "witness": group["witness"][int(argmin[index])],
                        })
                    entry["generator_minimum_over_census"] = int(minima.min())
                    entry["frozen_cell_minima"] = {
                        cone["column_names"][index][len("frozen:"):]: int(minima[index])
                        for index in range(len(minima))
                        if cone["column_family"][index] == "frozen"
                    }
            else:
                entry["validation_instances"] = 0
                entry["note"] = "no realizable instance exists for this (geometry, mask)"
            entry["atoms_after_validation"] = int(active.sum())
            validation[key] = entry
            print(f"  {key}: atoms {entry['atoms_before_validation']} -> {entry['atoms_after_validation']}, "
                  f"violated {len(entry['violated_generators'])}, instances {entry['validation_instances']}", flush=True)
            guard_memory("validation")

            group_labels = [
                label for label in core_labels
                if cores[label]["geometry"] == geometry and cores[label]["mask"] == mask
            ]
            if group is not None:
                target_dicts = [
                    terms(prepare_target(cores[label]["expression"], cone, geometry, mask), cone["variables"])
                    for label in group_labels
                ]
                minima, argmin, negatives = evaluate_targets(cone, group, target_dicts)
            for position, label in enumerate(group_labels):
                core = cores[label]
                summary = solve_core(cone, active, label, core["expression"])
                summary["class_sha256"] = core["class_sha256"]
                summary["scope"] = entry["scope"]
                if group is not None:
                    in_domain = [order for order in minima if order >= 8]
                    summary["target_census"] = {
                        "orders": list(TARGET_ORDERS),
                        "instances": int(len(group["rows"])),
                        "by_order": {
                            str(order): {
                                "minimum": int(minima[order][position]),
                                "minimum_witness": group["witness"][int(argmin[order][position])],
                                "negative_instances": int(negatives[order][position]),
                            }
                            for order in minima
                        },
                        "minimum_orders_ge_8": int(min(minima[order][position] for order in in_domain)),
                        "negative_instances_orders_ge_8": int(sum(negatives[order][position] for order in in_domain)),
                        "note": (
                            "The lower classes are stated for n>=8 (s>=0); values at orders 2..7 are "
                            "recorded as finite evidence only and carry no claim."
                        ),
                    }
                results[label] = summary
                print(f"  {label}: {summary['verdict']} ({summary['lp_message']}; {summary['runtime_seconds']:.1f}s)", flush=True)
            cones[key] = cone
            guard_memory("solve")

    feasible = [label for label, row in results.items() if row["feasible"]]
    exact_candidates = [
        label for label in feasible
        if results[label]["reconstruction"] and results[label]["reconstruction"]["exact"]
    ]
    marker = MARKER_FOUND if feasible else MARKER_SEARCHED
    core_summary = {}
    for digest, members in class_members.items():
        verdicts = sorted({results[label]["verdict"] for label in members})
        core_summary[digest] = {
            "member_labels": members,
            "geometry": cores[members[0]]["geometry"],
            "verdicts_by_label": {label: results[label]["verdict"] for label in members},
            "core_verdict": verdicts[0] if len(verdicts) == 1 else "MIXED_" + "|".join(verdicts),
            "scope": results[members[0]]["scope"],
        }
    report = {
        "marker": marker,
        "date": "2026-09-02",
        "target_family": hk["target_family"],
        "cores": len(class_members),
        "labels_solved": len(core_labels),
        "core_summary": core_summary,
        "domain": (
            "H a finite forest with two distinct marks u,v, n=|H|=8+s with s>=0; K=H-S with S the "
            "neighbour set of an actual ordinary parent (at most one vertex per component of H); "
            "all occupation coordinates nonnegative integers"
        ),
        "generator_families": {
            "monomial": "products of nonnegative coordinates (total degree <=2)",
            "linear": "valid linear constraint times a nonnegative monomial of degree <=1",
            "linear_product": "product of two valid linear constraints",
            "quadratic": "valid quadratic constraint (extension, pair, mark-neighbourhood, star-attachable, isolate-multiply)",
            "equality": "exact structural identity times +/- monomial (nonadjacent k00 only)",
            "frozen": "certified rank-six G2..G10 cells on documented literal domain pairs",
        },
        "frozen_domain_notes": FROZEN_DOMAIN_NOTES,
        "excluded_generators": {
            "star_attachable_beyond_k_ge_edges": (
                "The only rigorous coordinate consequences found are k>=e(H), |S|>=#deleted marks, "
                "and for nonadjacent k00 the equality |N(u) cap N(v)|=0 and edgeless N(u) cup N(v); "
                "no other star-attachable inequality was derivable in the coordinates and none was added."
            ),
            "isolate_multiply_degree_three": "Isolate-multiply bounds whose expansion exceeds degree two are omitted.",
            "frozen_G2_cross_and_multi_vertex": FROZEN_DOMAIN_NOTES["G2"],
            "frozen_degenerate_states": FROZEN_DOMAIN_NOTES["degenerate_states"],
            "frozen_G4_G10_non_realizable_minors": FROZEN_DOMAIN_NOTES["G4..G10"],
            "frozen_G9_G10": "G9=630 is a positive constant (covered by the constant monomial); G10=0.",
        },
        "constraint_justifications": {
            key: {name: cone["justifications"][name] for name in cone["justifications"]}
            for key, cone in cones.items()
        },
        "census": {
            "orders": list(TARGET_ORDERS),
            **counts,
            "validation_orders": list(VALIDATION_ORDERS),
            "rows_by_group": {f"{g}_k{m[0]}{m[1]}": int(len(v["rows"])) for (g, m), v in groups.items()},
        },
        "cones": validation,
        "results": results,
        "feasible_cores": feasible,
        "exact_rational_candidates": exact_candidates,
        "infeasible_cores": [label for label in core_labels if label not in feasible],
        "frozen_coefficient_sha256": coefficient_hashes,
        "hk_lower_input_sha256": sha256(HK_LOWER),
        "jmask_input_sha256": sha256(JMASK),
        "frozen_g2_g10_assembly_sha256": sha256(FROZEN_G2_G10),
        "n8_census_input_sha256": sha256(CENSUS_N8),
        "source_sha256": sha256(Path(__file__).resolve()),
        "peak_rss_bytes": rss_bytes(),
        "wall_seconds": time.time() - wall,
        "scope_guard": (
            "LP infeasibility obstructs only this degree-two generator cone; it is not a negative "
            "forest cell.  LP feasibility is not a theorem until the separate exact rational replay "
            "passes.  n>=8 is assumed through s>=0; orders 2..7 are covered only by the recorded "
            "finite target census, which is falsification evidence."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True, default=str) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": marker,
        "feasible_cores": feasible,
        "exact_rational_candidates": exact_candidates,
        "violated_generators": {key: len(v["violated_generators"]) for key, v in validation.items()},
        "peak_rss_gib": round(rss_bytes() / 1024**3, 3),
        "wall_seconds": round(report["wall_seconds"], 1),
    }, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(marker)


if __name__ == "__main__":
    main()
