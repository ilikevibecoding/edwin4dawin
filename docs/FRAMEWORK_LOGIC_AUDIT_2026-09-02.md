# Erdős #993 framework: exact logic audit (2026-09-02)

Scope. This audit covers the `WR + ISO + TAIL` framework in
`erdos993_goal/ERDOS993_PROOF_SKELETON_AND_EXACT_GAP_2026-08-29.md` (cited
below as `Skeleton L<line>`), the ledger
`ERDOS993_MONOTONE_PROGRESS_LEDGER_2026-08-29.md` (`Ledger L<line>`), the
conditional draft `ERDOS993_CONDITIONAL_PROOF_DRAFT_2026-08-29.md`
(`Draft L<line>`), the handoff `docs/HANDOFF_2026-09-02.md` (`Handoff L<line>`),
and the frozen Gate-5 JSON reports of 2026-08-30/31 in `erdos993_goal/`.

Method. Every identity that can be checked without the workspace's own replay
scripts was re-derived independently in
`scripts/verify_framework_identities.py` (sympy 1.14.0, networkx 3.6.1,
Python 3.12.3, seed 20260902, 8.7 s, one core). Its output is
`reports/framework_identities_20260902.json`; the `all_pass` flag is `true`.
Nothing in `erdos993_goal/` was modified or executed. Statuses below use three
labels:

- `proved-by-replay`: re-derived or recomputed today in the verification script.
- `claimed-in-ledger`: a theorem asserted in the workspace documents with a
  named `PASS_*` marker that I did **not** replay today.
- `OPEN`: the documents themselves say the statement is unproved.

---

## (a) Identities verified exactly today

| # | Statement | How verified | Result |
|---|---|---|---|
| 1 | Prefix (descent-propagation) lemma, Skeleton L81-107 | sympy factorisation `r x + 1/x - (r+1) = (x-1)(r x-1)/x`; integer brute force over `1 <= p_{r-1},p_r,p_{r+1} <= 40`, `r=2..6`, plus boundary cases | exact; 0 failures; witnesses show each hypothesis is needed |
| 2 | Bridge `(B)`: `ISO_r = S_r/2 + p_{r-1}^2 + p_{r-1}p_r/2`, Skeleton L113-121 | sympy `simplify` on symbols `r, p_{r-1}, p_r, p_{r+1}` | exact identity; `9K1` numbers `(126,126,84)`, `S_5=15876`, `ISO_5=31752` match Skeleton L135-137 |
| 3 | First-leaf identity `(1)` with remainder `(2)`, Skeleton L212-233 | sympy: with `I(F)=A+xC`, `Q_r(A+xC) - Q_r(A) - Q_{r-1}(C) - D_r` is identically `0` in `r` and the six coefficients; then exact integers on 240 random forests (orders 2-18), every leaf, every `r` from `1` to `alpha+2`: 11,679 cells | exact; 0 failures |
| 4 | `N_r` coefficient formula, Skeleton L252-263 | reconstructed definition `N_r(B;u,v) := D_r(F,a) - D_r(F-b,a) - D_{r-1}(F-{b,v},a)` for `F = B + a@u + b@v` (nonsibling leaves, `u != v`); sympy shows it equals the printed formula identically; `U <-> V` symmetry checked; 12,222 pair-rank cells on 240 forests | exact; 0 failures; identity `(C)` (Skeleton L186-189) also 0 failures |
| 5 | `ISO_2` for all forests (Handoff implies rank 2 done; Ledger L1614) | sympy: `Q_2 = -3 S n + 2 m^2 + m n^2 - 4 m n + n^3/2 + n^2/2` (+`3Tn` for triangles) with `S = sum_v C(deg v,2)`; since `S <= C(m,2)` and `m <= n-1`, `Q_2 >= f(n,m) = (n^2(n+1) + m n(2n-5) - m^2(3n-4))/2`, concave in `m`, `f(n,0) > 0`, `f(n,n-1) = 2n^2-3n+2 > 0` | elementary proof of strict `ISO_2 > 0` for every forest (indeed every graph with `<= n-1` edges); 0 numeric failures, min `Q_2 = 4` on random forests |
| 6 | Sanity census | all 32,508 trees `n <= 16` (networkx generator): unimodal; `TAIL`, `WR` (`1 <= r < L`), `ISO` (`2 <= r < L`) all hold; `S_r >= 0` at every prefix cell with `3 <= r <= 8`; 13 prefix cells with `S_2 < 0` (stars `K_{1,m}`), consistent with the framework starting `S_r` claims at `r=3` (Skeleton L128) | consistent |
| 7 | Kadrawi-Levit `n=26` trees `T_{3,4,4}`, `T*_{3,3,4}` | LC fails at `k=13`; `ISO_r >= 0` at **all** ranks, `WR` holds on the prefix, `S_13 < 0` (outside prefix, `L=9`) | consistent; shows `ISO` is strictly weaker than LC and survives where LC fails |

Details worth recording for item 1 (minimal hypothesis set, answering the
question in the task):

- `TAIL` (Levit-Mandrescu, König-Egerváry graphs, hence forests):
  `p_r >= p_{r+1}` for `r >= L(alpha)`, `L(alpha) = ceil((2alpha-1)/3) = floor((2alpha+1)/3) <= alpha`.
- `ISO_r` is needed **only** at ranks `r0 <= r <= L(alpha)-1` where `r0` is the
  first index with `p_{r0-1} >= p_{r0}` (a descent or a tie). At a tie `x=1`
  and `ISO_r` alone gives `(r+1) y <= r+1`, so `WR` is not needed there.
- `WR_r` is needed only at strict descents `p_{r-1} > p_r` with
  `2 <= r <= L(alpha)-1`, to guarantee `x >= 1/r`. Brute force gives explicit
  witnesses that neither hypothesis can be dropped: `(p_{r-1},p_r,p_{r+1}) = (6,1,2)`
  satisfies `ISO_2` but not `WR_2` and ascends; `(2,1,2)` satisfies `WR_2` but
  not `ISO_2` and ascends.
- `r = 1` is never a descent (`p_0 = 1 <= n = p_1`), so no hypothesis is needed
  at `r=1`; the skeleton's range `2 <= r < L(alpha)` (Skeleton L83) is right.
- `p_{r+1} = 0` makes the conclusion trivial and cannot occur for
  `r+1 <= L(alpha) <= alpha`.
- For `alpha <= 3`, `L(alpha) <= 2` and the prefix range is empty: `TAIL`
  plus `p_0 <= p_1` already give unimodality.
- The first `alpha` at which rank `r` lies in the strict prefix is
  `ceil((3r+2)/2)`, matching the table at Ledger L1612-1621 (`4,6,7,9,10,12,13`).

The framework proves far more `ISO` than the lemma consumes (all prefix cells
rather than descent/tie cells). This is forced by the induction in identity
`(1)`, not by the lemma; see (d) item 4.

Reconstruction note for item 4: the skeleton describes `N_r` as "the diagonal
coefficient of a symmetric bivariate quadratic kernel" (Skeleton L251-253)
but never prints the kernel. The coefficient-level definition above is
unambiguous (it is exactly "the difference of consecutive first-leaf
remainders", Skeleton L251-252) and reproduces the printed formula
symbolically, so no guessing was required at the coefficient level; only the
bivariate kernel itself is not reproduced here.

Not replayed today (would require running the workspace's own scripts):
the `WR` theorem (`PASS_EXACT_POINTED_HALL_FULL_PAYMENT_AND_FOREST_WEAK_PREFIX_RATIO`,
Skeleton L71-77), the fixed-rank `S_r` theorems `r=3..8`, all `N_k` theorems,
and all bundle-coefficient theorems. `WR` is a genuine theorem, not a
triviality: it fails for general graphs (`K_13` minus a `K_4`,
`p=(1,13,6,4,1)`, `p_1 = 13 > 12 = 2 p_2` at `r=2 < L=3`), so it is
load-bearing and must be kept in the replay set.

---

## (b) Dependency graph: from rank-six `G1` to unimodality of all forests

Notation: `N_k` = "all-forest rank-`k` four-minor theorem", i.e.
`N_k(B;u,v) >= 0` for every finite forest `B` and distinct marks `u,v`
(all orders, all `alpha`). `ISO_r(all)` = `Q_r(F) >= 0` for every forest `F`
(every `alpha`). `ISO_r(prefix)` = `Q_r(F) >= 0` whenever `2 <= r < L(alpha(F))`.

### Layer 0 - inputs that need no further work

| Node | Status | Evidence |
|---|---|---|
| D0 `TAIL` for forests | proved (literature: Levit-Mandrescu; Basit-Galvin Thm 1.2/1.3 for KE graphs) | `docs/LITERATURE_STATUS_2026-09-02.md`; general-graph counterexample `3K_10` shows the KE hypothesis is essential |
| D1 Prefix lemma `WR + ISO + TAIL => unimodal` | proved-by-replay | (a) item 1; Skeleton L81-107 |
| D2 Identities `(1)`,`(2)`,`(B)`,`(C)`, `N_r` formula | proved-by-replay | (a) items 2-4 |
| D3 `ISO_2(all)` | proved-by-replay (elementary) | (a) item 5; also Ledger L1614 |
| D4 `WR_r` for every forest, `1 <= r < L(alpha)` | claimed-in-ledger | Skeleton L71-77; Ledger L1605 |
| D5 `ISO_r(prefix)` for `r = 3..8` via `S_r >= 0` on prefix-relevant `alpha` | claimed-in-ledger | Skeleton L109-172; Ledger L1615-1620 |

### Layer 1 - the four-minor tower below rank six

| Node | Status | Evidence |
|---|---|---|
| T2 FML all three modes at `r=2,3` for every marked forest, hence `N_2`,`N_3` | claimed-in-ledger | Skeleton L314-330; Ledger L1627 |
| T3 Terminal `N_r` bases: bare path; two rooted stars; BB/common-path sector of the double broom; mixed diagonals `i+j <= 11` | claimed-in-ledger | Skeleton L266-273; Ledger L1688-1692 |
| T3' Double-broom mixed diagonals `i+j >= 12` (all-rank terminal base) | **OPEN** (route obstructions recorded, not sign failures) | Skeleton L274-281; Ledger L1693-1700 |
| T4 `N_4` (all forests, all marks) via rank-four bundle telescope, five rooted deepest-support modes, terminal double broom/two stars + isolates | claimed-in-ledger (two independent assemblies) | Skeleton L12-38; Ledger L1629, L1646-1675 |
| T5 `N_5` (all forests) via rank-five bundle `g1..g8` all five modes + terminal `N_5` + `N_4` | claimed-in-JSON `PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT` (2026-08-30) and independent audit `..._G2_TRANSFER_AUDIT`; Handoff Gates 1,3,4 | **not reflected** in the ledger tables: Ledger L1630 and Draft L1587-1588 still list rank-five FML open at `alpha(W) >= 6` |
| T6 Cross-orientation payment `C_k >= 0`, `k=4,5,6` (truncates the paired `Q/D` branch in `(C)`, not the `N` chain) | claimed-in-ledger | Skeleton L174-210; Ledger L1631 |

### Layer 2 - rank six (Gate 5, the active bottleneck)

| Node | Status | Evidence |
|---|---|---|
| R6.0 Terminal `N_6` base (double broom or two rooted stars, plus isolates), producer + independent audit | claimed-in-JSON `PASS_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_G1_NONADJACENT`, `PASS_INDEPENDENT_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_RANK5_G2_ALT` | Ledger L695-697 |
| R6.1 Rank-six whole-bundle coefficients `g2,...,g10`, both mark geometries, five canonical parent modes, independent partition audit | claimed-in-ledger | Ledger L44-77; Handoff L120-136 |
| R6.2 `G1`, isolated/deleted leaf submode (`= g2_6(A,B)`) | claimed-in-ledger (paid by R6.1) | Ledger L345-353 |
| R6.3 `G1`, **retained isolate** family `g2_6(A,B) + Phi_B((1+x)A) >= 0` | **OPEN**. Reduced exactly to two all-order polynomials `adjacent_u0_v0`, `nonadjacent_u0_v0`; finite collar orders 8-10 (22,441 cells, minima 2712/1976); strongest adjacent and nonadjacent cone searches **infeasible**; standalone response sign is **false** (order-41 witness, `-158,221,416`) | Handoff L171-247; Ledger L257-281, L431-455 |
| R6.4 `G1`, **ordinary parent** family `g2_6(H,J) + F(H,K) + eps Q(H,L) + eta Phi_J(C) >= 0` | **OPEN**. `H`-only relaxation rejected (142,913 negative cells); valid `H--K` reduction to 56 classes, `J`-mask dominance to 24 cores; order-8 census 0 negatives; degree-two screen infeasible; the `Lambda` sign unproved and unrefuted | Handoff L300-358; Ledger L184-233, L283-309 |
| R6.5 `G1`, **marked parent** family `Omega_u(A,B) + eta Phi_T(A + x(A-u)) >= 0` | **OPEN**. Eight q-free classes to four sign cores; collar 8/10 positive (minima 1848-3378); degree-two and degree-four searches infeasible; three searches prepared, not run | Handoff L249-298; Ledger L391-415 |
| R6.6 Leaf-mode scope audit for `G1` (gapless partition into geometries x modes x families) | **OPEN**. The three-family reduction is exact (Ledger L416-429) but "no corresponding all-geometry/all-mode `G1` assembler exists" and cases where a mark shares a component with an unmarked core vertex lie outside the 13-class queue | Ledger L147-155; Handoff L397 item 4 |
| R6.7 Universal rank-six `G1` assembler (fail-closed) | **OPEN** (depends on R6.3-R6.6) | Handoff L384-385 |
| R6.8 All-`N_6` integration: bundle telescope + strong induction + terminal base + `N_5` lower branch | **OPEN**; marker `PENDING_EXACT_ALL_MARKED_FOREST_N6_BUNDLE_INDUCTION_G1_NONADJACENT`; lower-rank branch is discharged by T5 | `iso_gate5_rank6_rank7_propagation_readonly_exact_..._20260830.json`; Handoff L46-48 |
| R6.9 Consequence: `ISO_6(all)` and `D_6 >= 0` for every first-leaf cell | **OPEN** (needs R6.8 plus the all-`alpha` terminal `D` base of Skeleton L235-236, claimed) | Skeleton L362-366; Draft L1562-1576 |

### Layer 3 - rank seven

| Node | Status | Evidence |
|---|---|---|
| R7.0 Terminal `N_7` base | claimed-in-JSON `PASS_EXACT_ISO_N7_TERMINAL_BROOMS_ISOLATES_RANK7_TERMINAL` | `rank7_propagation_terminal_newton_bridge_exact_20260831.json` |
| R7.1 Rank-seven bundle `g4..g12` | claimed-in-JSON (`assemble_iso_n7_bundle_g4_g12_rank7_propagation.py`) | same report |
| R7.2 Rank-seven bundle `g1,g2,g3` across 5 marked geometries x 4 parent modes | **OPEN** | same report: `open: ['g1','g2','g3']` |
| R7.3 All-`N_7` assembly (needs R6.8 and R7.2) | **OPEN** | same report: `all_N7_assembly.status: OPEN`; Ledger L1642-1645 |
| R7.4 `ISO_7(all)` | **OPEN** (`ISO_7(prefix)` is separately claimed via `S_7`, D5) | Skeleton L144-155 |

### Layer 4 - Newton join (terminal `q3` payment route)

| Node | Status | Evidence |
|---|---|---|
| Q0 Definition: token-sliding envelope `q_{j+1}(F) = C_{F,j}/D_{F,j}`, exact terminal-support recurrence | derived (exact identity) | `TERMINAL_SUPPORT_Q3_ENVELOPE_RECURRENCE_INDEPENDENT_2026-08-28.md` L1-52 |
| Q1 Terminal payment Newton tail `m >= 8` (coefficients `[binom(s,m)]`, `s = t-1` leaves) for terminal-support tree cells covered by the pinned anchor theorem | claimed-in-JSON `PASS_EXACT_ALL_ORDER_TERMINAL_PAYMENT_NEWTON_TAIL_M8_PLUS_REDUCTION` | `terminal_q3_payment_newton_tail_independent_20260828.json`; Handoff L141 |
| Q2 Low join `m = 0..7`: only `m=0` for isolated-marked-root distance-six double brooms (all `j`) and distance-seven middle region `b >= j-2` are closed; distance-seven tail `j >= b+3`, all other remainder forests, nonisolated marked roots, `m = 1..7` | **OPEN** | Ledger L10-43; Handoff L142-143 |
| Q3 Full `q3` envelope for all trees / averaged surplus theorem | **OPEN** | JSON scope lines: "does not prove ... the full q3 envelope, the averaged surplus target" |
| Q4 Logical connection of Q1-Q3 to the `WR + ISO + TAIL` chain | **not written down** in the skeleton or the draft; the Newton join appears only as a Gate-5 obligation in Handoff L39-40, L142-143, L387-388 and L398. The skeleton's "Newton" (Skeleton L272-281) is a different object (mixed Newton diagonals `i+j` of the double-broom terminal base). Treat as **OPEN documentation**: nothing in the framework files shows what `ISO` statement the Newton join delivers | Skeleton (no occurrence of `q3`); Ledger L12-28 |

### Layer 5 - ranks nine and beyond, and the uniform lemma

| Node | Status | Evidence |
|---|---|---|
| U1 `N_8` (all forests) | **OPEN, not started**; `ISO_8(prefix)` is covered by `S_8` (D5) but the induction for `ISO_9` via `(1)` consumes `Q_8(F-{l,v})` at **all** `alpha`, which `S_8 >= 0` (`alpha >= 13` only) does not supply | Skeleton L158-166, L221-223 |
| U2 `N_r` for every `r >= 9` (all forests), hence `ISO_r(all)` for `r >= 9` | **OPEN, uniformly**. Ledger L1621: "9+ ... open uniformly"; Ledger L1606: "every `r>=9`"; Skeleton L748-750 | no all-rank theorem exists |
| U3 Four-Minor Leaf Lemma on the uniform domain `(8)` `2 <= r <= alpha(B-{u,v})+2`, or on `(7)` plus a cutoff-leak theorem, or the Bundle Payment Lemma at every rank | **OPEN**; this is the **only** rank-uniform mechanism the documents describe | Skeleton L283-311, L760-801, L885-890; Draft L1510-1548, L1704-1707 |
| U4 Induction-domain closure: local cutoff `r < L(alpha(B))` or `r < L(alpha(W)+2)` is **not hereditary**; connected bundled-spider family defeats every fixed collar | exact obstruction (claimed-in-ledger) | Skeleton L762-801; `PASS_EXACT_ISO_CUTOFF_DOMAIN_SCOPE_AUDIT` |
| U5 Noncanonical supports | at rank 4: resolved by the corrected rooting (`u-s-b-v` witness forced the protected internal-spine mode; Ledger L1653-1660). At rank 6: the five canonical modes are used (Ledger L150-152); whether the rank-six deepest-support rooting is exhaustive is part of R6.6 and is **OPEN** until the assembler's partition audit exists | Skeleton L360-361, L834-835 (rank-four language, superseded); Ledger L1653-1663 |

### Layer 6 - assembly

| Node | Status | Evidence |
|---|---|---|
| A1 `ISO_r(prefix)` for every forest and every `2 <= r < L(alpha)` | **OPEN** (requires U2 or U3) | Skeleton L105-107 |
| A2 Unimodality of all forests (`D0 + D1 + D4 + A1`) | **OPEN** | Draft L1569-1576 |
| A3 Independent replay of all algebra, partitions, hashes (Gate 6) | **OPEN** | Handoff L41-42, L400 |
| A4 Literature check | done 2026-09-02: #993 open; nothing supersedes or contradicts the framework | `docs/LITERATURE_STATUS_2026-09-02.md` |

### Critical path in one line

```text
G1 (R6.3, R6.4, R6.5) -> R6.6 -> R6.7 -> R6.8 (all-N6) -> R7.2 -> R7.3 (all-N7)
   -> [U1 N8, U2 N9, N10, ... : no mechanism]  OR  [U3 FML on (8) / all-rank Bundle Payment]
   -> A1 ISO(prefix) -> A2 unimodality -> A3 replay -> A4 literature
```

Everything left of the bracket is finite, rank-by-rank work with growing
coefficient counts (`2r-2` bundle coefficients at rank `r`: 6 at rank 4, 8 at
rank 5, 10 at rank 6, 12 at rank 7). Everything inside the bracket is the
actual theorem.

---

## (c) Blunt assessment: "do we only have ranks 6-7 left?"

**No.** Ranks 6-7 are what is left of *Gate 5* as the handoff defines it
(Handoff L39-40). They are not what is left of the *proof*. The documents
themselves say so:

1. Ledger L1621 (Fixed target ranks table): rank `9+`, first relevant
   `alpha = ceil((3r+2)/2)`, status **"open uniformly"**. Ledger L1606: target
   `ISO_r` certified for `2 <= r <= 8`, exact open boundary **"every `r>=9`"**.
2. Skeleton L748-750: the last computation "did **not** establish FML, the
   mixed double-broom residue `i+j>=12`, the target ISO inequalities at ranks
   nine and above, or a counterexample. Therefore the conjecture is not yet
   resolved."
3. Skeleton L885-890 gives exactly two legitimate completion routes, both of
   which are **rank-uniform lemmas** (FML on `(8)`, or FML on `(7)` plus a
   cutoff-leak theorem). Neither is "prove `N_6` and `N_7`".
4. Draft L1704-1707: "Its sole boxed unproved input is FML on the
   induction-closed uniform domain, with the whole-bundle payment listed as
   the precise alternative." The whole-bundle payment at rank 6 is `G1`; but
   the alternative is the Bundle Payment Lemma at **every** rank
   (Skeleton L814-817), not at rank six.
5. The rank-by-rank bundle programme has produced `N_4` (Skeleton L12-38),
   `N_5` (JSON 2026-08-30), most of `N_6`, part of `N_7`. Each rank was a
   separate project with its own bundle polynomial, its own parent-mode
   partition, its own terminal base, and its own cone/Bernstein/census proofs.
   There is **no** statement anywhere in the skeleton, ledger, or draft of an
   all-rank theorem, an induction on `r`, or a rank-generic payment; the
   rank-seven bridge report explicitly refuses to promote anything beyond
   `N_7` ("no all-N7 or full-Newton promotion").
6. Closing Gate 5 exactly as written (universal `G1`, all-`N_6`, rank-6/7
   propagation, Newton join) would yield at most `ISO_6(all)` and
   `ISO_7(all)` plus a terminal payment lemma of unwritten logical role. It
   would not yield `ISO_9(prefix)` for a single forest with `alpha >= 15`,
   because identity `(1)` at rank 9 descends to `Q_9` and `Q_8` of subforests
   at all `alpha`, which need `N_9` and `N_8` (all forests) - neither of which
   has a bundle polynomial, a terminal base, or a coefficient theorem in the
   workspace.

So the honest statement is: **the finite, fixed-rank frontier is at rank six
(coefficient `G1`), and after rank seven there is an infinite tail of ranks
with no proof mechanism other than the still-open uniform FML / Bundle Payment
Lemma.** The gate checklist (4 of 6) measures progress on the *chosen route's
finite prefix*, not distance to the theorem. Handoff L30-31 already warns that
the `94%` is bookkeeping, not probability; the same caveat applies to "4 of 6
gates".

What Gate 5 *does* buy: if the rank-six and rank-seven bundle proofs reveal
a rank-generic pattern (e.g. a coefficient formula in `r` with a uniform
positivity certificate), that pattern is the natural candidate for the
rank-uniform lemma. Nothing in the documents claims such a pattern has been
found; on the contrary, the ordinary-parent `Lambda` telescoping "does not
reduce the sum to a fixed bounded-arity list" (Ledger L300-303) and the
double-broom recurrence cannot be repaired by any rank-independent scalar
(Skeleton L276-281).

---

## (d) Logical gaps and overclaims noticed

1. **"Only ranks 6-7 left" framing (Handoff L39-40, L386-388).** The Gate-5
   text lists rank-6/7 propagation and the Newton join as the last
   mathematical gate before "final proof assembly". As shown in (c), the
   uniform `r >= 9` problem is not in any gate. Gate 6 as written would fail
   at its first step. Recommend adding an explicit gate (or an explicit
   sub-item of Gate 5) "rank-uniform four-minor/bundle theorem for all
   `r >= 8`" so the checklist cannot read as "two more ranks and done".

2. **Ledger tables are stale on rank five.** Ledger L1630 ("rank-five FML ...
   open boundary `alpha(W)>=6`") and Draft L1587-1588 contradict the frozen
   2026-08-30 theorem `PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT`
   and Handoff Gates 1, 3, 4 (checked). This is documentation drift, not a
   mathematical gap, but the ledger's own rule ("a row moves only from open to
   certified", Ledger L5-8) means the table should be updated with the
   marker, otherwise a replayer cannot tell which document is authoritative.

3. **Draft L1573-1574: "The already certified ranks two through eight provide
   the low-rank boundary and may also be used directly."** The certified
   fixed-rank theorems for `r = 3..8` are `S_r >= 0` theorems restricted to
   prefix-relevant `alpha` (`alpha >= 6,7,9,10,12,13`; Skeleton L128-132,
   L154-155, L158-162). Inside the induction on identity `(1)`, `Q_r` of a
   subforest is needed at **all** `alpha` (the induction keeps the ambient
   ceiling `R0` fixed, Skeleton L774-785). `S_r` is genuinely negative at
   non-prefix cells (`S_2 = -6` for `K_{1,4}`; `S_13 < 0` for both
   Kadrawi-Levit trees at `alpha = 14`, `L = 9`), so `S_r`-based theorems
   cannot be "used directly" at arbitrary cells. Only `ISO_2(all)` (elementary)
   and the all-`alpha` `N_k` theorems (`k <= 5`) are usable as induction
   bases. The sentence should be restricted to prefix-relevant cells or
   deleted.

4. **The framework needs `ISO` far outside the prefix.** Skeleton L105-107
   says proving `ISO_r` for `2 <= r < L(alpha(F))` completes the conjecture -
   true for the *lemma*, but the *proof strategy* (identity `(1)` + fixed
   ambient `R0`) requires `Q_r(F') >= 0` for subforests `F'` at ranks up to
   `min(R0, alpha(F')+1)`, i.e. at ranks `r >= L(alpha(F'))` too. Section 9
   (Skeleton L760-801) states this correctly for `N_r`, but Sections 3 and 6
   (L105-107, L362-366) read as if only prefix `ISO` were ever needed. The
   census today shows `Q_r >= 0` at all ranks for all trees `n <= 16` and both
   `n=26` KL trees, so the stronger target is plausible, but it is a stronger
   target and should be named as such (it is exactly why domain `(8)` and not
   `(7)` is required).

5. **Skeleton L266-271: "The following terminal bases are proved for every
   order and rank: ... 3. the BB/common-path Newton sector of a connected
   two-ended broom."** Only a *sector* of the connected double-broom terminal
   base is all-rank; the mixed diagonals `i+j >= 12` are open (Skeleton
   L274-275, Ledger L1693). At fixed ranks 4-7 the double-broom base is
   separately closed (T4, T5, R6.0, R7.0), so the fixed-rank programme is
   unaffected, but the all-rank terminal base needed by a uniform FML proof
   is **not** complete. A reader of L266 alone would conclude otherwise.

6. **Newton join has no written logical role (Q4).** Handoff L141-143 and
   L387-388 treat "connect the low Newton indices `m=0..7` to the frozen
   terminal `m>=8` tail" as a proof obligation, but neither the skeleton nor
   the draft explains what `ISO`/`N`/`D` statement the terminal `q3` payment
   proves, or on which cells. The `q3` documents describe it as a
   token-sliding ratio envelope whose all-tree version is open
   (`TERMINAL_SUPPORT_Q3_ENVELOPE_RECURRENCE_INDEPENDENT_2026-08-28.md`
   L5-7). Until its role is written down, it cannot be counted toward the
   theorem, and closing it cannot be counted as progress on `ISO`.

7. **Finite collars and special families described next to universal
   language.** The handoff is generally careful ("This does not prove order
   `>=11`", Handoff L197; "Not a counterexample to the original square",
   L304). Places where the guard is weaker: Skeleton L235-236 ("The
   rooted-star-plus-isolates terminal case `D_r>=0` is proved for every order
   and rank" - claimed via `verify_iso_leaf_nested_path_bases_root.py`; I
   checked only 864 cells, all nonnegative, so this is claimed-in-ledger, not
   replayed); Ledger L310-322 (connected order-eight leaf-deletion exhaustion,
   correctly guarded at L343-344); Skeleton L742-746 (beam/census "finite
   evidence only" - guarded). No outright universal overclaim was found in
   these passages, but the volume of `PASS_*` markers for finite censuses
   makes the document hard to read; a reader skimming markers cannot
   distinguish a finite census from an all-order theorem without reading the
   scope sentence.

8. **Rank-four language superseded but retained.** Skeleton L360-361 and
   L834-835 say noncanonical supports leave rank-four FML open; Skeleton
   L12-38 supersedes this with the completed `N_4`. The skeleton flags the
   supersession (L36-38), but the retained text still contains the phrase
   "do not yet prove ... rank-four FML" (L835). Note that `N_4 >= 0` for all
   marked forests is **not** the same statement as rank-four FML (the three
   difference inequalities); the ledger correctly keeps FML `r=4+` open at
   L1627 even though `N_4` is closed at L1629. This distinction matters for
   route U3: the all-forest `N_k` theorems do not give the FML *increments*,
   so they cannot be fed into a uniform FML induction as base cases of the
   increment inequalities.

9. **`WR` is load-bearing and not elementary.** It fails for general graphs
   below `L(alpha)` (`K_13 - K_4`), so its proof
   (`POINTED_HALL_FULL_PAYMENT`) belongs in the independent replay set with
   the same weight as the `N_k` theorems. Draft L1575 cites it in one clause;
   it deserves a dependency-hash pin in the final assembly table.

10. **The lemma consumes less than the framework proves.** The prefix lemma
    only needs `ISO_r` at descent/tie indices with `p_{r-1} >= p_r`, where
    (by the chain `S_r >= 0 => OLC_r => GSB_r => ISO_r`, verified in (a) item
    2) any of the stronger classical inequalities suffices. The framework
    proves universal `Q_r >= 0`, including ascending cells where `ISO` can
    fail for non-forest graphs. This is not an error, but it means the
    framework's target is stronger than the conjecture requires, which is a
    legitimate place to look for a weaker, rank-uniform hypothesis if the
    bundle programme does not generalise.

---

## Summary of OPEN nodes between rank-six `G1` and the theorem

- R6.3 retained-isolate family (two q-free polynomials; cones infeasible)
- R6.4 ordinary-parent family (24 `H--K` cores; `Lambda` sign)
- R6.5 marked-parent family (four sign cores)
- R6.6 leaf-mode scope audit / all-geometry all-mode `G1` partition
- R6.7 universal `G1` assembler
- R6.8 all-`N_6` integration (`PENDING_EXACT_ALL_MARKED_FOREST_N6_BUNDLE_INDUCTION_G1_NONADJACENT`)
- R7.2 rank-seven bundle `g1,g2,g3`; R7.3 all-`N_7`
- Q2/Q3/Q4 Newton join `m=0..7` beyond the two double-broom slices, the `q3` envelope, and its unwritten logical role
- T3' double-broom mixed diagonals `i+j >= 12` (all-rank terminal base)
- U1 `N_8`, U2 `N_r` for all `r >= 9` - no mechanism; **or** U3 FML on domain `(8)` / all-rank Bundle Payment Lemma
- A1 `ISO(prefix)` for all forests; A2 unimodality; A3 independent replay

Nodes proved today by independent replay: D1 (prefix lemma, minimal
hypotheses), D2 (identities `(1)`,`(2)`,`(B)`,`(C)`, `N_r` formula), D3
(`ISO_2` for all forests, elementary).
