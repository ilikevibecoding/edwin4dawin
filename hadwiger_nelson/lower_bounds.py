"""Lower bounds for the chromatic number of the plane.

* chi(R^2) >= 4:  the Moser spindle (1961) — 7 points, 11 unit edges,
  not 3-colorable.  Small enough to settle by exhaustive search, no SAT
  solver required.

* chi(R^2) >= 5:  a 5-chromatic unit-distance graph (de Grey's 2018
  breakthrough, minimised by Heule / Parts).  We verify, for the vertex
  data shipped in data/:
    1. every listed edge has euclidean length exactly 1
       (exact arithmetic in Q(sqrt3, sqrt5, sqrt11)),
    2. the edge list matches the unit-distance pairs recomputed from
       scratch from the coordinates,
    3. the graph has no proper 4-coloring — kissat reports UNSAT and the
       DRAT proof is independently validated by drat-trim,
    4. the graph *is* 5-colorable (kissat model, checked edge by edge),
  which pins its chromatic number to exactly 5 and gives chi(R^2) >= 5.
"""

from __future__ import annotations

import os
import time
from typing import Dict, List

from . import sat
from .graphs import (assert_proper_coloring, brute_force_colorings,
                     find_coloring_brute, load_edge_file, moser_spindle,
                     unit_distance_edges, verify_unit_edges)
from .vtx import load_vtx

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(_REPO_ROOT, "data")


def spindle_report() -> Dict[str, object]:
    points = moser_spindle()
    edges = unit_distance_edges(points)
    verify_unit_edges(points, edges)
    n = len(points)
    n3 = brute_force_colorings(n, edges, 3)
    coloring4 = find_coloring_brute(n, edges, 4)
    if n3 != 0 or coloring4 is None:
        raise AssertionError("Moser spindle should be 4- but not 3-colorable")
    assert_proper_coloring(edges, coloring4)
    return {
        "n": n,
        "edges": len(edges),
        "proper_3_colorings": n3,
        "coloring4": coloring4,
        "points": points,
        "edge_list": edges,
    }


def five_chromatic_report(name: str, work_dir: str,
                          recompute_edges: bool = True) -> Dict[str, object]:
    """Full certification pipeline for data/<name>.vtx + data/<name>.edge."""
    os.makedirs(work_dir, exist_ok=True)
    points = load_vtx(os.path.join(DATA_DIR, f"{name}.vtx"))
    n_declared, edges = load_edge_file(os.path.join(DATA_DIR, f"{name}.edge"))
    if len(points) != n_declared:
        raise AssertionError(f"{name}: {len(points)} vertices but header says {n_declared}")

    t0 = time.time()
    verify_unit_edges(points, edges)  # exact: every edge has length 1
    t_exact = time.time() - t0

    edges_match = None
    t_recompute = None
    if recompute_edges:
        t0 = time.time()
        recomputed = unit_distance_edges(points)
        t_recompute = time.time() - t0
        edges_match = set(recomputed) == set(edges)
        if not edges_match:
            raise AssertionError(
                f"{name}: published edges differ from recomputed unit pairs "
                f"({len(edges)} vs {len(recomputed)})"
            )

    n = len(points)

    # --- not 4-colorable (UNSAT + checked DRAT proof) ----------------------
    cnf4 = os.path.join(work_dir, f"{name}-4color.cnf")
    proof = os.path.join(work_dir, f"{name}-4color.drat")
    sat.write_dimacs(cnf4, n * 4, sat.coloring_cnf(n, edges, 4))
    t0 = time.time()
    status4, _ = sat.run_kissat(cnf4, proof)
    t_unsat = time.time() - t0
    if status4 != "UNSAT":
        raise AssertionError(f"{name}: expected UNSAT for 4 colors, got {status4}")
    t0 = time.time()
    proof_ok = sat.check_drat(cnf4, proof)
    t_drat = time.time() - t0
    if not proof_ok:
        raise AssertionError(f"{name}: drat-trim failed to verify the UNSAT proof")

    # --- 5-colorable (SAT model, verified edge by edge) ---------------------
    cnf5 = os.path.join(work_dir, f"{name}-5color.cnf")
    sat.write_dimacs(cnf5, n * 5, sat.coloring_cnf(n, edges, 5))
    t0 = time.time()
    status5, model = sat.run_kissat(cnf5)
    t_sat = time.time() - t0
    if status5 != "SAT":
        raise AssertionError(f"{name}: expected SAT for 5 colors, got {status5}")
    coloring5 = sat.coloring_from_model(model, n, 5)
    assert_proper_coloring(edges, coloring5)

    return {
        "name": name,
        "n": n,
        "edges": len(edges),
        "edges_match_recomputed": edges_match,
        "coloring5": coloring5,
        "points": points,
        "edge_list": edges,
        "time_exact_edge_check_s": round(t_exact, 2),
        "time_recompute_edges_s": None if t_recompute is None else round(t_recompute, 2),
        "time_unsat_s": round(t_unsat, 2),
        "time_drat_check_s": round(t_drat, 2),
        "time_5coloring_s": round(t_sat, 2),
    }
