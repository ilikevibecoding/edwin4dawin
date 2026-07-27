"""SAT encoding of graph k-colorability, solved with kissat and
(for UNSAT results) certified with the drat-trim proof checker.

Encoding: variable x[v][c] means "vertex v gets color c".
  * one clause per vertex:  x[v][1] | ... | x[v][k]        (some color)
  * per edge {u,v}, color c:  ~x[u][c] | ~x[v][c]          (no clash)

If the formula is satisfiable, picking the lowest true color of each vertex
yields a proper k-coloring (a shared chosen color would violate an edge
clause).  If it is unsatisfiable, no proper k-coloring exists (a proper
coloring would satisfy the formula directly).  So the encoding is exact.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from typing import List, Optional, Sequence, Tuple

Edge = Tuple[int, int]

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _find_tool(name: str, env_var: str, *extra: str) -> str:
    for candidate in (os.environ.get(env_var), *extra, shutil.which(name)):
        if candidate and os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    raise FileNotFoundError(
        f"{name} not found; run tools/get_solvers.sh or set ${env_var}"
    )


def kissat_path() -> str:
    return _find_tool("kissat", "KISSAT", os.path.join(_REPO_ROOT, "tools", "kissat", "build", "kissat"))


def drat_trim_path() -> str:
    return _find_tool("drat-trim", "DRAT_TRIM", os.path.join(_REPO_ROOT, "tools", "drat-trim", "drat-trim"))


def coloring_cnf(n: int, edges: Sequence[Edge], k: int) -> List[List[int]]:
    def var(v: int, c: int) -> int:  # v in 0..n-1, c in 0..k-1
        return v * k + c + 1

    clauses: List[List[int]] = []
    for v in range(n):
        clauses.append([var(v, c) for c in range(k)])
    for u, v in edges:
        for c in range(k):
            clauses.append([-var(u, c), -var(v, c)])
    return clauses


def write_dimacs(path: str, nvars: int, clauses: Sequence[Sequence[int]]) -> None:
    with open(path, "w") as f:
        f.write(f"p cnf {nvars} {len(clauses)}\n")
        for cl in clauses:
            f.write(" ".join(map(str, cl)) + " 0\n")


def run_kissat(cnf_path: str, proof_path: Optional[str] = None,
               timeout: int = 3600) -> Tuple[str, Optional[List[int]]]:
    """Returns ('SAT', model) or ('UNSAT', None)."""
    cmd = [kissat_path(), "-q", cnf_path]
    if proof_path:
        cmd.append(proof_path)
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    out = res.stdout
    if res.returncode == 10:
        model: List[int] = []
        for line in out.splitlines():
            if line.startswith("v "):
                model.extend(int(x) for x in line[2:].split())
        model = [lit for lit in model if lit != 0]
        return "SAT", model
    if res.returncode == 20:
        return "UNSAT", None
    raise RuntimeError(f"kissat failed (rc={res.returncode}):\n{out}\n{res.stderr}")


def check_drat(cnf_path: str, proof_path: str, timeout: int = 3600) -> bool:
    """Validate an UNSAT proof with drat-trim; True iff 's VERIFIED'."""
    res = subprocess.run(
        [drat_trim_path(), cnf_path, proof_path],
        capture_output=True, text=True, timeout=timeout,
    )
    return "s VERIFIED" in res.stdout


def coloring_from_model(model: Sequence[int], n: int, k: int) -> List[int]:
    true_vars = {lit for lit in model if lit > 0}
    coloring: List[int] = []
    for v in range(n):
        for c in range(k):
            if v * k + c + 1 in true_vars:
                coloring.append(c)
                break
        else:
            raise AssertionError(f"vertex {v} received no color in the model")
    return coloring
