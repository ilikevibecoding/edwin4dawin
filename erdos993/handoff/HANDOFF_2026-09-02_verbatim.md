# Erdős Problem #993 — complete working handoff for another model

> Preserved verbatim as received on 2026-09-02. It describes a workspace
> (`C:\Users\chris\erdos993_goal`) that is **not present** in this repository;
> none of the producers, JSON reports, or hashes named below could be replayed
> here. See `../STATUS_2026-09-02.md` for what was and was not verifiable.

**Snapshot:** 2026-09-02, America/New_York  
**Proof workspace:** `C:\Users\chris\erdos993_goal`  
**Persistent goal/thread ID:** `019f91b9-4f16-7941-9963-bb5ab47a4218`  
**Status:** not solved; exact progress is preserved below.  
**Current process state:** no proof solver and no subagent is running at this snapshot.

This is the one-file entry point for continuing the project. Read this file
fully before launching searches. The repository contains a long chronological
research record; older passages frequently describe gaps that were closed by
later addenda. Prefer the exact dependencies and current boundaries stated
here, then consult the canonical documents named below.

## 0. Non-negotiable correctness rules

1. The bar is an **exact, independently replayable proof** or a finite,
   independently verifiable nonunimodal tree/forest.
2. A floating LP solution is not a theorem until rational reconstruction and
   exact symbolic replay pass.
3. LP infeasibility is only an obstruction to that selected cone. It is not a
   negative forest cell, a counterexample, or evidence that the conjecture is
   false.
4. Finite enumeration, random testing, and positive collars are falsification
   evidence only. They never prove an unbounded tail.
5. Never promote a boundary theorem, a special leaf slice, or a terminal base
   into the universal statement without a gapless scope/partition audit.
6. Preserve the fixed checklist below. Do not increase its denominator or
   reopen a certified gate unless a named replay actually fails.
7. The user-facing `94%` is a frozen bookkeeping estimate, not a mathematical
   probability of success. The auditable status is **4 of 6 gates closed**.

## 1. Fixed six-gate checklist

- [x] **Gate 1 — rank-4/rank-5 foundation**
- [x] **Gate 2 — universal `C5` case**
- [x] **Gate 3 — rank-5 `G1`**
- [x] **Gate 4 — rank-5 `G2`**
- [ ] **Gate 5 — universal rank-6 `G1`, all-`N6` integration, rank-6/7
  propagation, and Newton-tail join**
- [ ] **Gate 6 — final proof assembly, independent replay, and current
  literature audit**

The active mathematical bottleneck is Gate 5. Within the rank-six
whole-bundle polynomial, `G2,...,G10` are certified; `G1` is the only open
coefficient. The terminal `N6` base has been pinned in the relevant exact
work, but the universal all-`N6` integration/assembly is still downstream of
`G1` and must not be called complete prematurely.

## 2. The target and why the framework would finish it

For a finite forest `F`, write

```text
I(F;x)=sum_(r=0)^alpha p_r x^r,    alpha=alpha(F).
```

The goal is to prove that `(p_0,...,p_alpha)` is unimodal. The proof framework
uses:

```text
L(alpha)=ceil((2alpha-1)/3)

WR_r(F):   p_(r-1) <= r p_r

ISO_r(F):  Q_r(F)
         = r p_r^2 + p_(r-1)^2 - (r+1)p_(r-1)p_(r+1) >= 0
```

The decreasing-tail theorem gives `p_r>=p_(r+1)` for `r>=L(alpha)`. The weak
prefix ratio `WR` is already proved on the required prefix. If a descent
occurs before the cutoff, put

```text
x=p_r/p_(r-1),  y=p_(r+1)/p_r.
```

Then `WR` gives `1/r<=x<1`, while `ISO` gives

```text
(r+1)y <= r x + 1/x <= r+1.
```

Thus `y<=1`: a descent cannot be followed by an ascent. Repetition through
the prefix plus the known tail proves unimodality. Therefore the global task
is an all-forest ISO/payment theorem. The current route attacks its remaining
rank-six whole-bundle payment.

Canonical framework file:

```text
C:\Users\chris\erdos993_goal\ERDOS993_PROOF_SKELETON_AND_EXACT_GAP_2026-08-29.md
```

## 3. Canonical current documents

Read these after this handoff:

1. `ERDOS993_MONOTONE_PROGRESS_LEDGER_2026-08-29.md`
   - theorem-level chronological ledger;
   - latest addenda supersede older status passages;
   - now includes the retained-isolate, marked-parent, and `H--K`
     ordinary-parent reductions from 2026-09-01.
2. `ERDOS993_CONDITIONAL_PROOF_DRAFT_2026-08-29.md`
   - conditional final assembly;
   - not a proof yet.
3. `ERDOS993_PROOF_SKELETON_AND_EXACT_GAP_2026-08-29.md`
   - `WR+ISO+TAIL` logic and dependency architecture.
4. `ERDOS993_LITERATURE_REFRESH_2026-08-25.md`
5. `ERDOS993_LITERATURE_STATUS_2026-08-27.md`
   - both literature files are older than this snapshot; refresh only after
     the mathematics is actually closed or if a new paper may supersede it.

## 4. Frozen upstream theorem chain

The following are genuine exact closures and should be treated as immutable
unless their own replays fail.

### 4.1 Rank four

The all-forest four-minor theorem

```text
N_4(B;u,v)>=0
```

is complete for every finite forest and distinct marks. Primary markers:

```text
PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_G1_BERNSTEIN
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12
```

### 4.2 Rank-six `G2,...,G10`

`G2` is complete across both mark geometries and all five canonical
deletion-parent modes. Together with the previously frozen `G3`, `G4`, and
`G5,...,G10` blocks, this yields a gapless assembly for every coefficient
`G2,...,G10`:

```text
PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_ALL_PARENT_MODES_ROOT
PASS_EXACT_ISO_N6_BUNDLE_G2_COMPLETE_INDEPENDENT_AUDIT_ROOT
PASS_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT
PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT
```

Top-level report hashes:

```text
G2 assembly:              775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645
G2 independent audit:     139408F0ACA2F7E6BC605AF245A335B8136D233EC8310737A70FFD8F8F771D70
G2..G10 assembly:         6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1
G2..G10 independent audit: DEA1F857E6AD61ACE3035E6D1BA93E09E363B0A86706458FB85EA029200F2C82
```

This means a rank-six `G1` proof may freely use frozen `G2,...,G10` cells on
any legitimate actual forest/minor pair.

### 4.3 Terminal/Newton side results

- The zero-slack face is verified.
- The terminal `q3` theorem controls Newton indices `m>=8`.
- The low join `m=0,...,7`, full `q3` extension, all-`N6` integration, and
  final dependency assembly are not all closed merely by that tail result.
- The alpha-only heuristic has an exact counterexample and must not be used.

## 5. Exact rank-six `G1` leaf-mode decomposition

The isolated/deleted leaf mode is paid by the frozen `G2` theorem. The three
coupled families still requiring universal sign proofs are:

```text
1. retained isolate:
   g2_6(A,B) + Phi_B((1+x)A) >= 0

2. ordinary parent:
   g2_6(H,J) + F(H,K)
   + epsilon Q(H,L)
   + eta Phi_J((1+x)H+xK) >= 0,
   epsilon,eta in {0,1},
   K induced in H, J induced in H, L=J intersect K

3. marked parent:
   Omega_u(A,B) + eta Phi_T(A+x(A-u)) >= 0,
   eta in {0,1}
```

Random coupled testing found no negative complete increments, but the response
terms alone are often negative. Do not separate a response from its base
payment unless an exact dominance identity permits it.

## 6. Retained-isolate family — exact current boundary

### 6.1 Reduction to two q-free cores

Affine induced-minor elimination, exact order-interval elimination, and
retained-mark dominance reduce the entire retained-isolate family to exactly
two all-order polynomials:

```text
adjacent_u0_v0
nonadjacent_u0_v0
```

Primary artifacts:

```text
derive_iso_n6_bundle_g1_retained_isolate_coarse_q_lower_root.py
  SHA256 A2855A1190CC31B82F59F069870FEE43DAE977C1C5049CF94D89CC7EC4012CEB

iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json
  SHA256 239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE

audit_iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_root.py
  SHA256 86433DC48E4E79C55E73AEC683C9FEBAA6C98A5D8158AAEA212A45F10983CB23

iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_audit_root_20260901.json
  SHA256 44C73A646B5DD55ACB38B92689481C6F6A0217C47897575385FCE36004E368F2
  marker PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_REDUCTION_ROOT
```

The independent audit verifies exact `D`-linearity, all eight branch
replays, the order elimination, and coefficientwise domination by the two
zero-retention branches.

### 6.2 Finite collar

Every nonisomorphic forest of orders 8, 9, and 10 and every marked pair is
strictly positive:

```text
22,441 exact cells
adjacent minimum:    2712
nonadjacent minimum: 1976
```

Artifact:

```text
iso_n6_bundle_g1_retained_isolate_qfree_n8_n10_root_20260901.json
  SHA256 4FC3CDF022AF3F9F5264F26E5865D2A1E269CCCE7B1AC7880478F3631319375A
```

This does not prove order `>=11`.

### 6.3 Common-compatible minor structure

Adjacent marks:

- Let `R` be the vertices compatible with both marks.
- The induced minor is `M=K2(u,v)` disjoint union `R`.
- Exact rows:

```text
M_E=(1+2x)I(R),  M_U=M_V=(1+x)I(R),  M_W=I(R).
```

- `154` frozen `G4,...,G10` cells were imported first.
- Adding `CR7=i_7(R)` and

```text
CR7<=CW7,
7 CR7 <= (|R|-6) CR6
```

  imports the remaining `44` frozen `G2,G3` cells.
- The strongest adjacent cone therefore contains all `315` relevant frozen
  cells from `G2,...,G10`.

Artifacts:

```text
derive_iso_n6_bundle_g1_adjacent_common_frozen_cells_root.py
  3653B79E63F0D2B7DFD256BE8C0E91A5D018DFD1E7BBA72C31129952DCC6BC4B
iso_n6_bundle_g1_adjacent_common_frozen_cells_exact_root_20260901.json
  2BF5BB129F661D8B8FA10F217CC7F1AE6B66117F9ECCAB5A786672BEEFEA7D9B

derive_iso_n6_bundle_g1_adjacent_common_low_frozen_cells_root.py
  969751DD71872B1B4FD4FE56E6EA40EBAA067FED02C416D7FDB4309E16EE300C
iso_n6_bundle_g1_adjacent_common_low_frozen_cells_exact_root_20260901.json
  A96A62F64CA19405FAF79C4FC50F455C11AD5CDE1B94FEF4C80FBC62C24A9753
```

Nonadjacent marks:

- Let `R` be vertices adjacent to neither mark.
- `M` is two isolated marks disjoint union `R`.
- `CZ_(r+2)=i_r(R)`.
- Exact rows:

```text
M_E=(1+x)^2 I(R),  M_U=M_V=(1+x)I(R),  M_W=I(R).
```

- Existing coordinates import `132` frozen `G5,...,G10` cells.
- New coordinate `CR6=i_6(R)` imports all `22` missing `G4` cells using:

```text
CR6<=CA7,
CR6<=CB7,
CR6<=CW6,
CW6-CA7-CB7+CR6>=0,
6 CR6 <= (CZ3-5) CZ7.
```

Artifacts:

```text
derive_iso_n6_bundle_g1_nonadjacent_common_frozen_cells_root.py
  4FF5F0E24697D3FBB7B33A574B52960640EFEF444769AE8F3FA84FBD3ECB7628
iso_n6_bundle_g1_nonadjacent_common_frozen_cells_exact_root_20260901.json
  9232A6DACB9FAB74278A1D4532FE983144233DBCA3FE8E4CD109BBCA7209EBF6

derive_iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_root.py
  EDF3FDE4DF9633805221A63634A386E96945892186AD493AF678F360233BB4E9
iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_exact_root_20260901.json
  D9A60761BF7590BBA2E662E7D9BF960F2DAAA2CA669C9F34FEF114037642152F
  marker PASS_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_COMMON_G4_FROZEN_CELLS_ROOT
```

The `G4` producer's order-8/9 implementation replay has zero row failures and
zero negative cells. Its universal validity comes from induced-family
containment, the union bound, the forest extension inequality, and the frozen
`G4` theorem.

### 6.4 Final retained-isolate cone verdicts

The strongest completed adjacent search is infeasible:

```text
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_low_frozen_ipm_search_root_20260901.json
  SHA256 DD61D212DF795F37AD931628D60A3FBB664DA0353F1CC1BA3261EDB74A0EDE75
  490,989 atoms, 43,834,351 nonzeros, 315 frozen cells
```

The completed nonadjacent search using the older `G5,...,G10` common-minor
cells is also infeasible:

```text
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_search_root_20260901.json
  SHA256 0E020A4977A48C61F5A132E9DDDD56D696D0EFA50981F672530A42D4C33E3D4D
  433,700 atoms, 249 frozen cells
```

Neither result refutes either target. The strengthened nonadjacent search
including the new `G4` coordinate is prepared but has **not** been run:

```text
search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_root.py
  SHA256 130A63B41776C4FD009FF495942996304D502AFE83E5C0CC4DBAF246C9D1E000
```

Recommended immediate command:

```powershell
Set-Location C:\Users\chris\erdos993_goal
python .\search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_root.py
```

If it is feasible, do not report success until an exact rational replay is
written and passes. If infeasible, record only a cone obstruction and move to
a higher-degree semiring, stronger actual-minor relations, or a structural
induction argument.

## 7. Marked-parent family — exact current boundary

### 7.1 Full pair reduction

The deleted and retained targets were reconstructed together:

```text
eta=0:
G1(A+x(A-u),B)-G1(A,B)

eta=1:
G1(A+x(A-u),B+x(B-u))-G1(A,B)
```

The retained response remains coupled. Sixteen
geometry/state/mark-retention branches collapse to eight q-free full-forest
classes: two deleted and six retained. Every class is strictly positive on
the exact order-8/10 collar, with minima between `1848` and `3378`.

Artifacts:

```text
derive_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_root.py
  8CB2E7F5A386062A0DA4492257222B86A14F4FEEC921EF5FA45B15C1BA326128
iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json
  715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F

audit_iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_root.py
  276C8FD0DE982F0CAFC6688E8859B25E4B20B891FAAE5DB2D50379A37B2E728D
iso_n6_bundle_g1_marked_parent_pair_qfree_lower_independent_audit_root_20260901.json
  E5008550DB27119C99142F1007B69C37C57D509D9538D1F2AA958EC1864821B2
  marker PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_QFREE_LOWER_ROOT
```

The independent audit matches both literal targets, all 16 branches, all
eight class hashes, and `490,048/490,048` direct forest/minor checks, with
minimum exact-minus-lower `0`.

### 7.2 Mask dominance: eight classes reduce to four sign cores

In each geometry, the two one-retained-mark expressions equal the retained
mask-00 core plus the same coefficientwise positive polynomial `D`; the
two-retained-marks expression equals the core plus `2D`. Therefore the only
genuine all-order signs are:

```text
adjacent_t0_u0_v0
adjacent_t1_u0_v0
nonadjacent_t0_u0_v0
nonadjacent_t1_u0_v0
```

Artifacts:

```text
derive_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_root.py
  84F60823AFF822D8C4B244AAA4913AD6E34E01739097059F0D9A0A8968CBEACE
iso_n6_bundle_g1_marked_parent_pair_mask_dominance_exact_root_20260901.json
  C6A4BE2F13B3D2DED11AAFA753F44CB717BB709AF530518583A1CF1454E56602

audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py
  F5BB6F98DC989FABB6340BE2C3858BB44D5CE026114C642EC64C5D67721F5755
iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_audit_root_20260901.json
  00CF63EF72E4C8A1E60F6A3732D58492E167BDA4210519878F3C5D94A1D76411
```

### 7.3 Search status

A degree-two screen containing the natural valid generators is infeasible for
all six q-free leaf cores (the two retained-isolate targets and four
marked-parent targets):

```text
search_iso_n6_bundle_g1_leaf_qfree_degree2_screen_root.py
  68C4ED310A3E9627189426566F5934D94BC864C53261169A3B71048F8A2566B6
iso_n6_bundle_g1_leaf_qfree_degree2_screen_root_20260901.json
  6FD1784393ECFA25C2B49F59BFD9355715B552E47169A31B37C9A5EA0BA9418F
```

The strongest degree-four adjacent deleted-core search is also infeasible:

```text
iso_n6_bundle_g1_marked_parent_pair_t0_adjacent_common_low_frozen_ipm_search_root_20260901.json
  0233E280B524319E3DB738BEF42FFB7C5B6A64F59EE2022154D521326DB586B3
  490,989 atoms, 315 frozen cells
```

Prepared but not run:

```text
search_iso_n6_bundle_g1_marked_parent_pair_t1_adjacent_common_low_frozen_ipm_root.py
search_iso_n6_bundle_g1_marked_parent_pair_t0_nonadjacent_common_frozen_ipm_root.py
search_iso_n6_bundle_g1_marked_parent_pair_t1_nonadjacent_common_frozen_ipm_root.py
```

Before running the nonadjacent marked searches, adapt them to import the new
`CR6=i_6(R)` and `G4` cells from Section 6.3. Running the older weaker cone is
unlikely to add information.

## 8. Ordinary-parent family — exact current boundary

### 8.1 Rejected `H`-only relaxation

Sequentially eliminating `J`, `L`, and `K` produced 56 `H`-only expression
classes but destroyed essential coupling. On the exact order-8/10 collar it
has:

```text
142,913 negative lower cells
minimum -155,576
```

Artifacts:

```text
derive_iso_n6_bundle_g1_ordinary_parent_hfree_lower_root.py
  26F78EA8929113CD38A3C79137FD451902B77F08AAAD2B9228CC8022A72700EA
iso_n6_bundle_g1_ordinary_parent_hfree_lower_exact_root_20260901.json
  EC422B288A9C35103E1FD2B705D5BAC801D7BE3E8190BBBDCD59218BCE228110
```

This is not a counterexample to the original square. Do not retry this
relaxation without preserving new coupling information.

### 8.2 Valid `H--K` reduction

Keeping the actual induced subforest `K` while eliminating only `J<=H`,
`L<=K`, and the two order intervals gives 56 exact sufficient `H--K` lower
classes. `K` and its order remain explicit.

Artifacts:

```text
derive_iso_n6_bundle_g1_ordinary_parent_hk_lower_root.py
  EF7F91649A15386DB33EF8B4472ADB5072F7799246F6627ADAABC9C2ABAA3713
iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json
  22F1F54F597B2CBA68CD24BC547D1C36075B2BE73DCC0416699CEADEF4E02CDF
```

For an actual ordinary parent, `K` is obtained from `H` by deleting the
parent's neighbors. Because the completed graph is a forest, that deletion
set contains at most one vertex from each component of `H`.

An exact order-eight census over every nonisomorphic `H`, every marked pair,
and every such realizable `K` found:

```text
76 forests
2,715 attachable H--K relation instances
745,564 applicable class cells
0 negative cells
global minimum 2751
```

Artifacts:

```text
census_iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_root.py
  A3A989C7BF526D9612B0A1C5873AE6AF2FA2DCEC2E318BCB7F650D14497D9274
iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json
  08CD091C18BFEE1C87C42E7B4872D23C6CFF2B84BE4414F5C50FA47C54CF95BE
```

This is strong evidence that preserving `K` repaired the false relaxation,
but it is still only an order-eight census.

### 8.3 `J`-mask dominance: 56 classes reduce to 24 cores

For every geometry, `epsilon`, `eta`, and `K` mask, the `j10` and `j01`
classes equal the `j00` core plus respective coefficientwise nonnegative
polynomials; `j11` adds their sum. Hence only 24 unique `j00` class hashes
remain.

Artifacts:

```text
derive_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_root.py
  03B83FBBE630B1FFFBEB8DD42F88A43609029114CE23A46B0FCCB5F1D4441D72
iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json
  7B25D57EBEE367C236AA48CB9565877898BA093C27DE68ACB46CA46710D349D6

audit_iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_root.py
  FA0292895A0CFF3C104A961372A39C11FB405280747000CF2D022995C5C194EE
iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_independent_audit_root_20260901.json
  338225DD6409F8107C3967267F9ABF6C734BD494E7F62A8BFC9A7DFA0978222C
```

### 8.4 Important next structural reduction

This observation was identified but has **not yet been frozen as a producer
and independent audit**:

- If the marks `u,v` are adjacent in `H`, an actual ordinary parent cannot
  delete both of them when forming `K`; otherwise the parent, `u`, and `v`
  form a cycle/triangle.
- Equivalently, the adjacent `K`-mask `k00` is impossible in the actual
  ordinary-parent domain.
- Freezing this scope lemma should remove four of the 24 `j00` cores, leaving
  20 actual cores.

Do not simply delete the four classes from an assembly. Write a tiny exact
structural producer and independent partition audit first.

### 8.5 Highest-value proposed search

The best unimplemented next route is a degree-two `H--K` cone for the 24 (or
20 after the structural audit) cores. Build it around the actual relation,
not the rejected `H`-only lower.

Recommended generators:

1. nonnegative monomials in the `H` and `K` marked occupation coordinates;
2. exact order constraints and category containment `K<=H`;
3. the star-attachable condition: the deleted set has at most one vertex per
   component of `H`;
4. forest extension/pair constraints separately on `H` and `K`;
5. every frozen `G2,...,G10` cell on legitimate pairs
   `H_state -> K_state`;
6. internal frozen cells on the mark-deletion states of `H` and of `K`.

For each index `2,...,10`, the valid cross pairs are

```text
(E,E), (E,U), (E,V), (E,W),
(U,U), (U,W),
(V,V), (V,W),
(W,W).
```

The internal state/zero pairs are the usual 13-pair list already used in the
q-free search scripts. Cache the cone by `(geometry,K-mask)` and solve the
four `(epsilon,eta)` right-hand sides against the same matrix. This is far
smaller and more structurally faithful than the 490k-atom q-free cones.

If a floating support is found, reconstruct its rational coefficients and
replay the exact polynomial identity before declaring any core closed.

## 9. Cone obstructions and routes not to repeat blindly

All of the following are cone/no-go results, not target counterexamples:

```text
iso_n6_bundle_g1_retained_isolate_qfree_handelman_frozen_monomial_obstruction_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_mark_neighborhood_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_compatible_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_mark_cross_edge_lifted_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_low_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_marked_parent_pair_t0_adjacent_common_low_frozen_ipm_search_root_20260901.json
iso_n6_bundle_g1_leaf_qfree_degree2_screen_root_20260901.json
```

Interpretation:

- adding more monomial multiples of the same insufficient constraints is
  unlikely to help;
- seek a missing structural coordinate/relation, a more faithful coupled
  domain, a higher-degree semiring with genuinely new products, or a direct
  induction/telescoping identity;
- the ordinary-parent `H--K` route is especially promising because its first
  exact collar repaired the only known coarse negative cells.

## 10. Concrete continuation order

Use this order unless new exact evidence changes it:

1. **Freeze and independently audit the adjacent-`k00` impossibility** in the
   ordinary-parent actual domain. Update the core list from 24 to 20 only if
   the audit passes.
2. **Build the cached `H--K` frozen-cell degree-two screen** described in
   Section 8.5. This is the highest-value new computation.
3. **Run the prepared strengthened nonadjacent retained-isolate `G4...G10`
   search**. Its output is new information; the older nonadjacent cone is
   already exhausted.
4. **Adapt the nonadjacent marked-parent core searches to the new `CR6/G4`
   coordinate** before running them.
5. If any search is floating-feasible, immediately write a separate exact
   rational replay and a separate independent auditor.
6. If all faithful cones fail, move to a direct leaf-induction or component
   convolution proof while preserving the exact three-family coupling.
7. Once all three rank-six `G1` families are proved, build a fail-closed
   universal `G1` assembler that checks the leaf-mode partition and every
   dependency hash.
8. Re-run the all-`N6` integration, propagate ranks 6 and 7, and connect the
   low Newton indices `m=0,...,7` to the already frozen terminal `m>=8` tail.
9. Assemble `WR+ISO+TAIL`, independently replay the whole proof, and only then
   refresh the current literature and state that Problem #993 is solved.

## 11. Replay and hash commands

PowerShell examples:

```powershell
Set-Location C:\Users\chris\erdos993_goal

# Re-run a producer/audit.
python .\derive_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_root.py
python .\audit_iso_n6_bundle_g1_marked_parent_pair_mask_dominance_independent_root.py

# Verify bytes.
Get-FileHash .\iso_n6_bundle_g1_marked_parent_pair_mask_dominance_exact_root_20260901.json -Algorithm SHA256

# Start the prepared new nonadjacent retained-isolate search.
python .\search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_root.py

# Inspect only relevant running jobs.
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -like 'python*' -and $_.CommandLine -match 'iso_n6_bundle_g1|erdos993_goal' } |
  Select-Object ProcessId,CommandLine
```

Do not overwrite a certified source after recording its source hash. Prefer a
new versioned producer/report if a derivation is strengthened.

## 12. Current machine/task state at handoff

- No proof Python process is running.
- No subagent is running; the previously named agents are completed or
  usage-errored historical entries.
- The three long jobs that had been running all finished with cone
  infeasibility:
  - strongest adjacent retained-isolate cone;
  - older nonadjacent retained-isolate common-minor cone;
  - strongest adjacent deleted marked-parent core cone.
- No theorem gate was closed by those verdicts.
- The exact new progress immediately before this handoff is:
  - full marked-parent pair independently audited;
  - marked-parent eight-to-four mask dominance independently audited;
  - nonadjacent common-minor `G4` layer proved and replayed;
  - ordinary-parent `H--K` reduction derived;
  - its entire exact order-eight realizable collar strictly positive;
  - ordinary-parent 56-to-24 `J`-mask dominance independently audited.

## 13. What a legitimate final proof still has to contain

A final document must explicitly include, or dependency-pin exact files that
include:

1. the frozen rank-four/rank-five foundation;
2. universal rank-six `G2,...,G10`;
3. universal rank-six `G1` with a gapless proof of all three leaf families;
4. a leaf-mode scope audit proving no geometry/state is omitted;
5. all-`N6` integration and rank-6/7 propagation;
6. the low-index Newton join and the terminal `m>=8` tail;
7. the `WR+ISO+TAIL` assembly;
8. an independent replay of all algebra, partitions, and dependency hashes;
9. a current primary-source literature check showing no known prior proof or
   counterexample was missed.

Until all nine are present, the correct status is **substantial exact
progress, theorem still open**.
