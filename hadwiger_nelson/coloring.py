"""Colourability of finite unit-distance graphs: exact backtracking and SAT."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Sequence

Edges = Sequence[tuple[int, int]]


# ---------------------------------------------------------------------------------
# Direct backtracking (exact, no dependencies; intended for the small graphs)
# ---------------------------------------------------------------------------------


def brute_force_coloring(order: int, edges: Edges, k: int) -> list[int] | None:
    """A proper k-colouring found by backtracking, or None if the graph is not k-colourable.

    Colours are introduced in increasing order, which quotients out the k! colour
    permutations without affecting completeness.
    """
    adjacency: list[list[int]] = [[] for _ in range(order)]
    for u, v in edges:
        adjacency[u].append(v)
        adjacency[v].append(u)

    colors = [-1] * order

    def extend(v: int, used: int) -> bool:
        if v == order:
            return True
        for c in range(min(used + 1, k)):
            if all(colors[w] != c for w in adjacency[v] if w < v):
                colors[v] = c
                if extend(v + 1, max(used, c + 1)):
                    return True
                colors[v] = -1
        return False

    return list(colors) if extend(0, 0) else None


def brute_force_chromatic_number(order: int, edges: Edges, limit: int = 8) -> int:
    for k in range(1, limit + 1):
        if brute_force_coloring(order, edges, k) is not None:
            return k
    raise RuntimeError(f"chromatic number exceeds {limit}")


def is_proper(edges: Edges, colors: Sequence[int]) -> bool:
    return all(colors[u] != colors[v] for u, v in edges)


# ---------------------------------------------------------------------------------
# SAT
# ---------------------------------------------------------------------------------


@dataclass
class SatResult:
    k: int
    satisfiable: bool
    coloring: list[int] | None
    seconds: float
    variables: int
    clauses: int
    solver: str
    symmetry_broken_clique: list[int] = field(default_factory=list)

    def __str__(self) -> str:
        verdict = f"{self.k}-colourable" if self.satisfiable else f"NOT {self.k}-colourable"
        return (
            f"{verdict}  [{self.solver}, {self.variables} vars, {self.clauses} clauses, "
            f"{self.seconds:.2f}s]"
        )


def greedy_clique(order: int, edges: Edges) -> list[int]:
    """A clique found greedily from the highest-degree vertex; used for symmetry breaking."""
    neighbours: list[set[int]] = [set() for _ in range(order)]
    for u, v in edges:
        neighbours[u].add(v)
        neighbours[v].add(u)
    if order == 0:
        return []
    start = max(range(order), key=lambda v: len(neighbours[v]))
    clique = [start]
    candidates = set(neighbours[start])
    while candidates:
        nxt = max(candidates, key=lambda v: len(neighbours[v] & candidates))
        clique.append(nxt)
        candidates &= neighbours[nxt]
    return clique


def build_cnf(
    order: int,
    edges: Edges,
    k: int,
    at_most_one: bool = True,
    symmetry_break: bool = True,
) -> tuple[list[list[int]], int, list[int]]:
    """CNF for "this graph has a proper k-colouring".

    Variable x(v, c) = v*k + c + 1 means "vertex v has colour c".

    Two optional constraint groups are added.  Neither changes satisfiability:
    * `at_most_one` forbids a vertex carrying two colours; any proper colouring assigns
      exactly one, so no solution is lost.
    * `symmetry_break` pins the vertices of a clique to distinct colours 0, 1, 2, ...
      Colours are interchangeable, so any colouring can be permuted into this form.
    """

    def var(v: int, c: int) -> int:
        return v * k + c + 1

    clauses: list[list[int]] = [[var(v, c) for c in range(k)] for v in range(order)]

    if at_most_one:
        for v in range(order):
            for c1 in range(k):
                for c2 in range(c1 + 1, k):
                    clauses.append([-var(v, c1), -var(v, c2)])

    for u, v in edges:
        for c in range(k):
            clauses.append([-var(u, c), -var(v, c)])

    clique: list[int] = []
    if symmetry_break:
        clique = greedy_clique(order, edges)[:k]
        for c, v in enumerate(clique):
            clauses.append([var(v, c)])

    return clauses, order * k, clique


def _pick_solver(proof_path: str | None):
    """CaDiCaL is the fastest option here, but its python-sat binding cannot log DRAT,
    so fall back to Glucose whenever a proof is requested."""
    import pysat.solvers as solvers

    order = ("Glucose42", "Glucose4", "Lingeling") if proof_path else ("Cadical195", "Cadical153", "Glucose42")
    for name in order:
        cls = getattr(solvers, name, None)
        if cls is not None:
            return cls, name
    raise RuntimeError("no usable SAT solver found in python-sat")


def sat_k_colorable(
    order: int,
    edges: Edges,
    k: int,
    at_most_one: bool = True,
    symmetry_break: bool = True,
    proof_path: str | None = None,
) -> SatResult:
    """Decide k-colourability with a CDCL SAT solver, optionally emitting a DRAT proof."""
    from pysat.formula import CNF

    Solver, solver_name = _pick_solver(proof_path)

    clauses, nvars, clique = build_cnf(order, edges, k, at_most_one, symmetry_break)
    formula = CNF(from_clauses=clauses)

    start = time.perf_counter()
    with Solver(bootstrap_with=formula, with_proof=proof_path is not None) as solver:
        satisfiable = solver.solve()
        coloring = None
        if satisfiable:
            model = set(lit for lit in solver.get_model() if lit > 0)
            coloring = [next(c for c in range(k) if (v * k + c + 1) in model) for v in range(order)]
        elif proof_path is not None:
            proof = solver.get_proof() or []
            if not proof:
                raise RuntimeError(f"{solver_name} produced an empty DRAT proof")
            with open(proof_path, "w", encoding="utf-8") as handle:
                handle.write("\n".join(proof) + "\n")
    seconds = time.perf_counter() - start

    return SatResult(
        k=k,
        satisfiable=satisfiable,
        coloring=coloring,
        seconds=seconds,
        variables=nvars,
        clauses=len(clauses),
        solver=solver_name,
        symmetry_broken_clique=clique,
    )


def sat_chromatic_number(order: int, edges: Edges, lower: int = 1, upper: int = 8, **kwargs) -> int:
    for k in range(lower, upper + 1):
        if sat_k_colorable(order, edges, k, **kwargs).satisfiable:
            return k
    raise RuntimeError(f"chromatic number exceeds {upper}")


def write_dimacs(path: str, order: int, edges: Edges) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(f"p edge {order} {len(edges)}\n")
        for u, v in edges:
            handle.write(f"e {u + 1} {v + 1}\n")
