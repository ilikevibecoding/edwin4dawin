# Scope lemma: the adjacent-k00 cell of the (geometry × K-mask) partition is empty

Erdős Problem #993 project, "ordinary parent" family (handoff section 8.4).
Exact proofs plus an exhaustive small-order census (n ≤ 10) with an independent audit.
Nothing here is floating point, randomised or heuristic.

Status: `PASS_EXACT_SCOPE_LEMMA_ADJACENT_K00_PRODUCER` and `PASS_INDEPENDENT_SCOPE_LEMMA_ADJACENT_K00`
(both reproduced on the frozen files listed in section 6).

## 1. Setting and conventions

* `H` is a forest (finite, simple, acyclic) with vertex set `V(H)`, `|V(H)| = n ≥ 2`, and connected
  components `C_1, …, C_m` (each a tree).
* `u, v ∈ V(H)` are two distinct marked vertices. The marks are **ordered**: the K-mask below
  distinguishes `u` from `v` (cells `k01` and `k10` are different), so every unordered pair `{u, v}` is
  examined with both role assignments `(u, v)` and `(v, u)`. Counts are therefore over the
  `n(n−1)` ordered pairs; the unordered-pair counts are recovered as `k00/2`, `k01 (= k10)`, `k11/2`.
* An **actual ordinary parent** is a new vertex `p ∉ V(H)` together with a nonempty set
  `S ⊆ V(H)`; `H + p` denotes the graph on `V(H) ∪ {p}` with edge set `E(H) ∪ {ps : s ∈ S}`, and
  `p` is admissible iff `H + p` is a forest. `S` is called **star-attachable** if
  `|S ∩ C_i| ≤ 1` for every component `C_i`.
* `K := H − S` (delete the parent's neighbours), equivalently `K = (H + p) − N[p]`, where
  `N[p] = S ∪ {p}`.
* **Geometry**: `adjacent` iff `uv ∈ E(H)`, otherwise `nonadjacent`.
* **K-mask** `k b_u b_v` with `b_u = 1` iff `u ∉ S` (`u` survives in `K`) and `b_v = 1` iff `v ∉ S`.
  So `k00` = both marks deleted (`u ∈ S` and `v ∈ S`), `k01` = `u` deleted and `v` retained,
  `k10` = `u` retained and `v` deleted, `k11` = both retained.
* A **cell** is a pair (geometry, mask); there are 2 × 4 = 8 cells.

## 2. Lemma A (star-attachability characterises admissible parents)

**Lemma A.** Let `H` be a forest and `S ⊆ V(H)` (empty or not). Then `H + p` is a forest if and only
if `S` contains at most one vertex of each component of `H`.

*Proof.* (⇒) Suppose some component `C` of `H` contains two distinct vertices `a, b ∈ S`. Since `C`
is a tree, there is a path `P` from `a` to `b` inside `C`; it has length ≥ 1 and avoids `p`. Then
`P` followed by the edges `bp` and `pa` is a cycle of length `|P| + 2 ≥ 3` in `H + p`, so `H + p` is
not a forest.

(⇐) Suppose `|S ∩ C_i| ≤ 1` for every `i`. Write `S = {s_1, …, s_r}` with `s_j ∈ C_{i_j}` and the
indices `i_1, …, i_r` pairwise distinct. Add the edges `ps_1, …, ps_r` one at a time. Before adding
`ps_j`, the vertex `s_j` lies in the component `C_{i_j}` of the current graph, which has not been
touched yet (no earlier `s_k` lies in `C_{i_j}`), while `p` lies in a different component
(`{p} ∪ C_{i_1} ∪ … ∪ C_{i_{j−1}}`). Adding an edge `xy` between two distinct components of a forest
yields a forest: a cycle in the new graph must use `xy` (the old graph is acyclic), and deleting `xy`
from that cycle leaves an `x`–`y` path in the old graph, contradicting that `x` and `y` were in
different components. By induction `H + p` is a forest. If `S = ∅`, `H + p` is `H` plus an isolated
vertex. ∎

Equivalently, in terms of the quantities checked by the scripts: `H + p` is a forest iff
`|E(H + p)| = |V(H + p)| − c(H + p)` (edges = vertices − number of components), and the set of
admissible `S` is exactly the set enumerated by "for each component choose nothing or one vertex".
The number of admissible nonempty `S` is `∏_i (1 + |C_i|) − 1`.

## 3. Lemma B (adjacent-k00 is impossible) and a corollary

**Lemma B.** If `uv ∈ E(H)` (adjacent geometry) then no admissible `S` satisfies `u ∈ S` and `v ∈ S`;
i.e. the cell (adjacent, k00) is empty.

*Proof.* Suppose `u, v ∈ S` and `uv ∈ E(H)`. Then `p u`, `u v`, `v p` are three edges of `H + p` on the
three distinct vertices `p, u, v`, i.e. `p–u–v–p` is a 3-cycle (a triangle) in `H + p`. A forest has
no cycles, so `H + p` is not a forest and `p` is not an admissible ordinary parent. ∎

(Lemma B is also the special case of Lemma A (⇒) in which the two vertices of `S` in one component
are joined by an edge, so the cycle has length exactly 3.)

**Corollary C.** In the nonadjacent geometry, `k00` forces `u` and `v` to lie in *different*
components of `H`: two marks in one component cannot both belong to an admissible `S` (Lemma A).
Hence the (nonadjacent, k00) cell consists exactly of the instances with `u ∈ C_i`, `v ∈ C_j`,
`i ≠ j`, `S ∩ C_i = {u}`, `S ∩ C_j = {v}`.

**Consequence for the case list.** For every forest `H`, every ordered pair of distinct marks and
every admissible parent, the instance lies in one of the seven cells
(adjacent, k01), (adjacent, k10), (adjacent, k11), (nonadjacent, k00), (nonadjacent, k01),
(nonadjacent, k10), (nonadjacent, k11). The cell (adjacent, k00) contains no instance at any
order, so it can be removed from the (geometry × mask) case list without loss.

## 4. Partition statement with minimal-order witnesses

Vertices are labelled `0, …, n−1`; `p` is the new vertex `n`. `P_3` is the path on three vertices
with centre `0` (edges `01`, `02`; canonical WROM level sequence `[0, 1, 1]`), `K_2` has edge `01`,
`2K_1` is two isolated vertices. Each witness is the first instance met by the producer in its
deterministic enumeration order (forest, then `u`, then `v`, then `S`); the audit re-verifies every
witness from its edge list.

| geometry | mask | realizable | min n | witness `(H, u, v, S)` | `H + p` | `K = H − S` |
|---|---|---|---|---|---|---|
| adjacent | k00 | **no** (Lemma B) | — | — | — | — |
| adjacent | k01 | yes | 2 | `H = K_2`, `u = 0`, `v = 1`, `S = {0}` | path `1–0–p` | `({1}, ∅)`: `u` deleted, `v` kept |
| adjacent | k10 | yes | 2 | `H = K_2`, `u = 0`, `v = 1`, `S = {1}` | path `0–1–p` | `({0}, ∅)`: `u` kept, `v` deleted |
| adjacent | k11 | yes | 3 | `H = P_3` (edges `01`, `02`), `u = 0`, `v = 1`, `S = {2}` | path `1–0–2–p` | edge `01`: both kept |
| nonadjacent | k00 | yes | 2 | `H = 2K_1`, `u = 0`, `v = 1`, `S = {0, 1}` | path `0–p–1` | empty graph: both deleted |
| nonadjacent | k01 | yes | 2 | `H = 2K_1`, `u = 0`, `v = 1`, `S = {0}` | edge `0p` + isolated `1` | `({1}, ∅)` |
| nonadjacent | k10 | yes | 2 | `H = 2K_1`, `u = 0`, `v = 1`, `S = {1}` | edge `1p` + isolated `0` | `({0}, ∅)` |
| nonadjacent | k11 | yes | 3 | `H = P_3` (edges `01`, `02`), `u = 1`, `v = 2`, `S = {0}` | star `K_{1,3}` with centre `0` | `({1, 2}, ∅)`: both kept |

Minimality: `n = 2` is the smallest order admitting two distinct marks, so the five cells realised
at `n = 2` are realised at the minimal possible order. The two `k11` cells need a vertex of `S`
outside `{u, v}`, hence `n ≥ 3`, and `n = 3` suffices as shown. The (adjacent, k00) cell is empty
for every `n` (Lemma B); the census confirms `0` instances for `2 ≤ n ≤ 10`.

## 5. Exhaustive census, n = 2 … 10 (ordered marks)

For every nonisomorphic forest `H` of order `n`, every ordered pair `(u, v)` of distinct vertices and
every admissible nonempty `S` (each verified to give a forest `H + p`), the instance `(H, u, v, S)` is
assigned to its cell. Forest counts are OEIS A005195 (`2, 3, 6, 10, 20, 37, 76, 153, 329` for
`n = 2..10`).

| n | forests | admissible `(H,S)` | all nonempty `S` tested | instances | adj k00 | adj k01 | adj k10 | adj k11 | non k00 | non k01 | non k10 | non k11 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | 2 | 5 | 6 | 10 | **0** | 2 | 2 | 0 | 2 | 2 | 2 | 0 |
| 3 | 3 | 15 | 21 | 90 | **0** | 8 | 8 | 6 | 16 | 20 | 20 | 12 |
| 4 | 6 | 49 | 90 | 588 | **0** | 40 | 40 | 50 | 84 | 122 | 122 | 130 |
| 5 | 10 | 130 | 310 | 2 600 | **0** | 124 | 124 | 220 | 344 | 536 | 536 | 716 |
| 6 | 20 | 375 | 1 260 | 11 250 | **0** | 450 | 450 | 948 | 1 312 | 2 238 | 2 238 | 3 614 |
| 7 | 37 | 971 | 4 699 | 40 782 | **0** | 1 312 | 1 312 | 3 308 | 4 436 | 7 992 | 7 992 | 14 430 |
| 8 | 76 | 2 639 | 19 380 | 147 784 | **0** | 4 130 | 4 130 | 11 634 | 14 636 | 28 204 | 28 204 | 56 846 |
| 9 | 153 | 6 813 | 78 183 | 490 536 | **0** | 11 740 | 11 740 | 37 308 | 45 180 | 91 776 | 91 776 | 201 016 |
| 10 | 329 | 18 014 | 336 567 | 1 621 260 | **0** | 34 376 | 34 376 | 119 670 | 137 476 | 295 788 | 295 788 | 703 786 |

Totals over `n = 2..10`: adjacent `k00 = 0`, `k01 = k10 = 52 182`, `k11 = 173 144`; nonadjacent
`k00 = 203 486`, `k01 = k10 = 426 678`, `k11 = 980 550`. In every row `k01 = k10` (swapping the roles
of `u` and `v`), and "instances" `= Σ_H n(n−1)(∏_i(1+|C_i|) − 1)`.

What was verified exhaustively for every forest of every order `2 ≤ n ≤ 10`:

1. every directly enumerated one-per-component `S` gives a forest `H + p`
   (producer: union-find, `|E| = |V| − c`);
2. over **all** `2^n − 1` nonempty `S ⊆ V(H)`: `H + p` is acyclic ⟺ `|S ∩ C_i| ≤ 1` for all `i`
   ⟺ `S` is in the directly enumerated list (producer: union-find; audit: DFS back-edge detection on
   an explicit adjacency structure of `H + p`, components by BFS). Lemma A is thus checked, not
   assumed, on 2 · 440 516 (`H, S`) pairs;
3. every `k00` instance is nonadjacent with `u, v` in different components (Corollary C);
4. the (adjacent, k00) count is `0` for every `n`.

Hand check of the first two rows. `n = 2`: `K_2` (one admissible `S` per endpoint) gives adjacent
`k01 = k10 = 2` over the two ordered pairs; `2K_1` (`S ∈ {{0}, {1}, {0, 1}}`) gives nonadjacent
`k01 = k10 = k00 = 2`. `n = 3`: `P_3` contributes adjacent `(k01, k10, k11) = (4, 4, 4)` and
nonadjacent `(0, 2, 2, 2)`; `K_2 + K_1` contributes adjacent `(4, 4, 2)` and nonadjacent
`(4, 6, 6, 4)`; `3K_1` contributes nonadjacent `(12, 12, 12, 6)`; the sums are the row `n = 3`.

Closed form (checked forest by forest by the producer). Let `c_i = |C_i|`, `P = ∏_i (1 + c_i)`,
`A_j = P/(1 + c_j)`, `B_{jl} = P/((1 + c_j)(1 + c_l))`. For an ordered pair inside one component
`C_j` (adjacent or not): `k00 = 0`, `k01 = k10 = A_j`, `k11 = (c_j − 1)A_j − 1`. For `u ∈ C_j`,
`v ∈ C_l`, `j ≠ l` (necessarily nonadjacent): `k00 = B_{jl}`, `k01 = c_l B_{jl}`, `k10 = c_j B_{jl}`,
`k11 = c_j c_l B_{jl} − 1`. There are `2(c_j − 1)` adjacent and `(c_j − 1)(c_j − 2)` nonadjacent ordered
pairs inside `C_j`, and `c_j c_l` ordered pairs `(C_j, C_l)`. Consequently the cell counts of a forest
depend only on its multiset of component sizes; the (adjacent, k00) count is identically `0`.

## 6. Verification artefacts (frozen)

All commands are run from `/workspace/erdos993`; both scripts are deterministic and their JSON
outputs are byte-identical across re-runs (no timestamps are stored).

| file | role | sha256 |
|---|---|---|
| `forest_indep.py` | core library (forest generator, unchanged) | `aeb9491e6cc066df99d3015e8d096daa3ec7f0c70f84121c4a5bf1c03afaa62b` |
| `scope_lemma_adjacent_k00_producer.py` | exact structural producer | `e37822f4eb25ba940dee8009c7ac82e929b01d8361f22d12cf0d73396798e13f` |
| `scope_lemma_adjacent_k00_audit_independent.py` | independent audit | `504e4f5c302b8c752d196ef0cee3d6f3f404450527be526ff45f57b1a695ebab` |
| `results/scope_lemma_adjacent_k00_producer.json` | census, witnesses, checks, hashes | `bd33ae2a5a115ed3d7b7a9ed4ae5c5b674340d7624afdbda57fd39ac7ebe624a` |
| `results/scope_lemma_adjacent_k00_audit.json` | recomputed census, comparison, hashes | `fe685f0533138a1809491a9cdab0ad6601da2446ad1c4e74891bea83a57535fd` |

* `python3 scope_lemma_adjacent_k00_producer.py` (default `NMAX = 10`, ~1.4 s; `NMAX = 9` ~0.3 s,
  `NMAX = 11` ~6 s). Uses `forest_indep.forests` (WROM level sequences, components concatenated
  with vertex offsets), union-find acyclicity, direct one-per-component enumeration, the exhaustive
  all-subsets equivalence check, the closed form above, and prints
  `PASS_EXACT_SCOPE_LEMMA_ADJACENT_K00_PRODUCER`.
* `python3 scope_lemma_adjacent_k00_audit_independent.py` (~1.9 s). Does not import the producer or
  `forest_indep`; trees from `networkx.nonisomorphic_trees` (counts vs OEIS A000055, pairwise
  `networkx.is_isomorphic`), forests as multisets of trees over integer partitions (counts vs OEIS
  A005195: `1, 2, 3, 6, 10, 20, 37, 76, 153, 329`), explicit adjacency structure of `H + p`,
  iterative-DFS acyclicity, BFS components, `K = H − N(p)` read off the adjacency of `H + p`,
  exact comparison of all cell counts with the producer JSON, re-verification of every producer
  witness, freshness check of the hashes recorded in the producer JSON, and prints
  `PASS_INDEPENDENT_SCOPE_LEMMA_ADJACENT_K00`.
* Sensitivity was exercised (scratch only, nothing kept in the repository): making either
  acyclicity test always return "forest", ignoring the `p`-edges, making the one-per-component
  predicate always true, truncating the direct enumeration, perturbing the closed form, and
  tampering one count or one witness in the producer JSON each turn the corresponding marker into
  `FAIL_…` with an explicit failure message.

## 7. Scope and limitation

Certified here: the graph-theoretic scope lemma (Lemma B), the attachability characterisation
(Lemma A) and Corollary C, with exact proofs, and the exhaustive census of the
(geometry × K-mask) partition for all forests of order `2 ≤ n ≤ 10` with two ordered distinct marks
and every admissible ordinary parent — seven nonempty cells with minimal-order witnesses, the
(adjacent, k00) cell empty.

Not certified here: this repository does not contain the project's 24 `j00` class polynomials or
their hashes, nor the table that maps (geometry, mask) cells to those classes. The step "remove
four of the 24 cores" therefore cannot be executed or audited from this repository; only the
statement that the (adjacent, k00) cell is empty is established, and whichever cores are indexed
exclusively by that cell must be identified against the project's own class list before deletion.
The census is finite (`n ≤ 10`) and serves as a consistency check of the proofs, not as a substitute
for them; the proofs are what cover all orders.
