# Graph data provenance

The vertex (`*.vtx`, Mathematica expression format) and edge (`*.edge`,
DIMACS format) files in this directory are copied unmodified from
Marijn Heule's repository <https://github.com/marijnheule/CNP-SAT>,
which accompanies the post-de-Grey effort (Polymath16) to find small
5-chromatic unit-distance graphs.

- `529.vtx` / `529.edge` — G_529: 529 vertices, 2670 edges. Constructed by
  Marijn Heule via clausal proof trimming; see M. J. H. Heule,
  *Trimming Graphs Using Clausal Proof Optimization*, CP 2019
  (arXiv:1907.00929).
- `510.vtx` / `510.edge` — 510 vertices. Product of the Heule–Parts
  minimization race (2019–2020); see J. Parts, *Graph minimization,
  focusing on the example of 5-chromatic unit-distance graphs in the
  plane*, Geombinatorics 29 (2020) 137–166 (arXiv:2010.12665).

The current world record for the smallest known 5-chromatic
unit-distance graph is 509 vertices / 2442 edges (Jaan Parts, 2020).
All of these descend from Aubrey de Grey's original 1581-vertex graph,
*The chromatic number of the plane is at least 5*, Geombinatorics 28
(2018) 18–31 (arXiv:1804.02385).

Nothing in this repository takes the data on faith: `verify.py` re-checks
in exact arithmetic over ℚ(√3, √5, √11) that every listed edge has length
exactly 1, recomputes the full unit-distance edge set from the coordinates
alone, and re-establishes non-4-colorability with a SAT solver plus an
independently checked DRAT proof.
