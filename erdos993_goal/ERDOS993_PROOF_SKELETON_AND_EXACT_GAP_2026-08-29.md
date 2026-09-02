# Erdős Problem 993: proof skeleton and exact remaining lemma

Date: 2026-08-29

Status: **rigorous proof framework with proved major inputs; not yet a proof of
the conjecture.**  Every statement labelled "proved" below has a replayable
exact certificate in this directory.  The all-forest rank-four four-minor
theorem is now complete; the remaining gap begins at rank five.  Until that
higher-rank payment chain (or an equivalent global ISO argument) is proved,
this document must not be presented as a resolution of Erdős Problem 993.

## Rank-four completion update (supersedes older rank-four status below)

The exact theorem

```text
N_4(B;u,v)>=0
```

now holds for every finite forest with distinct marks.  The completed bundle
induction includes singleton ordinary/endpoint supports, the no-mark root
`k=0` support, and the corrected protected internal-spine geometry.  In that
last mode the child component is the full one-ended broom `B_(ell,k)` for all
`ell>=1,k>=0`; this correction was forced by an exact counterexample to the
older mode-exhaustiveness claim.  Terminal forests are double brooms or two
rooted stars, with arbitrary isolates.

Primary and independent markers:

```text
PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_G1_BERNSTEIN
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12
```

Later chronological passages that call all `N_4` open are retained as route
history but are superseded by this update.  The exact live gap is the
rank-five-and-up bundle/payment propagation, followed by final assembly.

## 1. Target and cutoff

For a finite forest `F`, write

```text
I(F;x)=sum_(r=0)^alpha p_r x^r,       alpha=alpha(F),
L(alpha)=ceil((2alpha-1)/3).
```

The target is that `(p_0,...,p_alpha)` is unimodal.

The known decreasing-tail theorem gives

```text
p_r >= p_(r+1) for every r >= L(alpha).                 (TAIL)
```

Thus it remains to prevent a descent followed by a later ascent before the
cutoff.

## 2. Two prefix inequalities

Define

```text
WR_r(F):  p_(r-1) <= r p_r,

ISO_r(F): Q_r(F)
 = r p_r^2+p_(r-1)^2-(r+1)p_(r-1)p_(r+1) >= 0.
```

The weak-prefix ratio is now proved for every forest and every
`1 <= r < L(alpha)`.  Its exact assembler is
`assemble_pointed_hall_full_payment_forest_wr_root.py`, with marker

```text
PASS_EXACT_POINTED_HALL_FULL_PAYMENT_AND_FOREST_WEAK_PREFIX_RATIO.
```

The all-forest ISO inequality remains the global gap.

## 3. Why WR + ISO + TAIL proves unimodality

Assume `2 <= r < L(alpha)`, `p_(r-1)>p_r`, and both prefix inequalities.
Put

```text
x=p_r/p_(r-1),       y=p_(r+1)/p_r.
```

Then `WR_r` gives `1/r <= x < 1`, while `ISO_r` gives

```text
(r+1)y <= r x+1/x.
```

But

```text
r x+1/x-(r+1)=(x-1)(r-1/x) <= 0
```

on `1/r <= x < 1`.  Hence `y<=1`: once the sequence descends in the
prefix, it cannot rise at the next index.  Repeating this observation through
the prefix and then applying `(TAIL)` proves unimodality.

Consequently, proving `ISO_r(F)` for every forest and every
`2 <= r < L(alpha(F))` completes the conjecture.

### Direct fixed-rank ISO bases

The required target ISO cells at ranks three through eight are already
supplied by stronger fixed-rank forest reserve theorems.  Define

```text
S_r=2r p_r^2-p_(r-1)p_r-2(r+1)p_(r-1)p_(r+1).
```

The exact bridge is

```text
ISO_r=S_r/2+p_(r-1)^2+p_(r-1)p_r/2.                 (B)
```

Thus `S_r>=0` implies strict `ISO_r>0` on every nontrivial supported cell.
The proved forest reserve theorems and exact prefix thresholds through rank
six are

```text
r=3: alpha>=6,
r=4: alpha>=7,
r=5: alpha>=9,
r=6: alpha>=10.
```

At rank five the forest theorem is stated for order at least ten.  The only
prefix-relevant smaller case is `9K1`; its coefficients
`(p_4,p_5,p_6)=(126,126,84)` give `S_5=15876` and `ISO_5=31752` directly.
The assembly is replayed by
`assemble_fixed_rank_three_halves_to_iso_bridge_r3_r6_root.py`, ending with

```text
PASS_EXACT_FIXED_RANK_THREE_HALVES_TO_ISO_BRIDGE_R3_R6.
```

Rank seven is now independently replayed as a complete all-order forest
theorem.  Its read-only dependency assembler has no missing input and its
independent audit checks the exact 756-cell finite partition and 43 immutable
input hashes:

```text
PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER
PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP.
```

It proves the stronger reserve `S_7>=0` for `alpha>=12`, exactly the first
independence number at which rank seven can lie in the strict prefix.

Rank eight is also complete in the required target range.  The exact
matching-quotient boundary proves `S_8>=0` for every forest with `alpha=13`,
and the connected-tree theorem, three convolution cones, fixed-exceptional
classification, and first-crossing classification prove it for every forest
with `alpha>=14`.  The final fail-closed replay ends with

```text
PASS_EXACT_AND_INDEPENDENT_RANK8_FOREST_Q8_AND_PGC_COMPLETE
PASS_INDEPENDENT_FAIL_CLOSED_RANK8_FOREST_Q8_AND_PGC_NO_PARTITION_GAP.
```

The rank-seven and rank-eight packages call this stronger reserve `Q_r`; it
is the quantity denoted `S_r` here.  Identity `(B)` converts both packages to
the target `ISO_r`.  Together with the rank-two FML base below, this moves
the unresolved **target ISO ranks** to `r>=9`.

The previously missing cross-orientation payment is now proved at ranks four
through six.  For a marked forest `(B;u,v)`, put

```text
U=I(B-u),  V=I(B-v),  W=I(B-{u,v}),  P=U+xW,
C_k(B;u,v)=Q_k(P)+D_k(V,W).
```

The exact theorem `C_k>=0` holds for every marked forest at `k=4,5,6`.
Consequently, for two nonsibling leaves `a,b`, with respective supports
`u,v`, the first- and second-leaf identities reassemble as

```text
Q_r(F)=Q_r(F-a)+D_r(F-b,a)+N_r(B;u,v)+C_(r-1)(B;u,v),
B=F-{a,b}.                                             (C)
```

Thus at target ranks `r=5,6,7` the paired lower `Q/D` branch in `(C)` is a
single nonnegative terminal.  This is a genuine truncation of that branch,
but it does **not** truncate the separate four-minor recurrence

```text
N_r(B)=N_r(B-z)+N_(r-1)(B-{z,s})+G_r(B,z).
```

In particular the current proof of `N_7` still descends through
`N_6,N_5,N_4`; eliminating the remaining rank-four-to-six FML burden would
require either direct all-forest theorems for those `N` cells or a second
coupling that absorbs the lower `N` branch.  The old dependency audit and the
new exact consequence audit deliberately record both sides of this scope
boundary, with markers

```text
PASS_EXACT_DIRECT_Q45_DO_NOT_TRUNCATE_STANDARD_DN_DEPENDENCY
PASS_EXACT_CROSS_ORIENTATION_COUPLING_R4_R6
PASS_EXACT_C456_TRUNCATES_QD_BRANCH_NOT_N_FML_CHAIN.
```

## 4. Exact first leaf reduction

Let `ell` be a leaf of `F`, with support `v`, and put

```text
A=I(F-ell),       C=I(F-{ell,v}),       I(F)=A+xC.
```

For every rank, exact coefficient algebra gives

```text
Q_r(F)=Q_r(F-ell)+Q_(r-1)(F-{ell,v})+D_r(F,ell),       (1)
```

where

```text
D_r = c_(r-1)^2
      +2r a_r c_(r-1)+2a_(r-1)c_(r-2)
      -(r+1)a_(r-1)c_r-(r+1)c_(r-2)a_(r+1)
      -c_(r-2)c_r.                                    (2)
```

The rooted-star-plus-isolates terminal case `D_r>=0` is proved for every
order and rank.  Therefore an all-forest proof of `D_r>=0`, together with
strong induction in (1), proves ISO.

The identities and terminal theorem are replayed by
`verify_iso_leaf_nested_path_bases_root.py`.

## 5. Exact second leaf reduction

Choose a second nonsibling leaf.  After deleting the two leaves, let the
remaining marked forest be `(B;u,v)` and define its four minors

```text
E=I(B),       U=I(B-u),       V=I(B-v),
W=I(B-{u,v}).
```

The exact difference of consecutive first-leaf remainders is the diagonal
coefficient `N_r(B;u,v)` of a symmetric bivariate quadratic kernel `N`.
In coefficient form,

```text
N_r = 2r E_r W_(r-2)
      -(r+1)E_(r+1)W_(r-3)
      +E_(r-1)(2W_(r-3)-(r+1)W_(r-1))
      +U_r(-(r+1)V_(r-2)-W_(r-3))
      +U_(r-1)(2rV_(r-1)+2W_(r-2))
      +U_(r-2)(-(r+1)V_r+2V_(r-2)-W_(r-1))
      -V_rW_(r-3)+2V_(r-1)W_(r-2)-V_(r-2)W_(r-1).
```

The following terminal bases are proved for every order and rank:

1. a bare path joining the two marks;
2. two disconnected rooted stars;
3. the BB/common-path Newton sector of a connected two-ended broom.

Every mixed diagonal layer through Newton total eleven of the connected double
broom is now closed at every path order.  In the terminal Newton indices,
every cell with `i+j<=11` has an exact positive-denominator proof for all four
carrier operators and both parities.  The remaining mixed double-broom residue
is precisely `i+j>=12`.  The corrected order-six recurrence numerator has
also been analyzed exactly: every nontrivial hard-state bipartition fails, and
neither a constant scalar transfer nor an index-dependent but rank-independent
scalar `lambda_j` can repair it.  These are route obstructions, not negative
gaps.  A uniform proof must retain rank-sensitive/operator-valued information,
use a genuinely non-hard cone, or use a different diagonal argument.

## 6. Four-Minor Leaf Lemma -- the exact missing theorem

Let `z` be an unmarked leaf of `(B;u,v)` and let `s` be its support.  The
following three statements constitute the missing global lemma.

### Ordinary support

If `s` is neither mark, then

```text
N_r(B;u,v)-N_r(B-z;u,v)
 >= N_(r-1)(B-{z,s};u,v).                            (FML-ordinary)
```

### Isolate

If `z` is an unmarked isolated vertex, then

```text
N_r(B;u,v)-N_r(B-z;u,v)
 >= N_(r-1)(B-z;u,v).                                (FML-isolate)
```

### Marked-support collision

If `s` is one of the marks, then

```text
N_r(B;u,v) >= N_r(B-z;u,v).                          (FML-collision)
```

All three FML modes are now proved for every marked forest at ranks
`r=2,3`.  The ordinary theorem proves both compact pieces separately; the
isolate and collision theorems prove their exact coupled gaps.  Replays:

```text
prove_iso_compact_ordinary_prefix_r2_r3_root.py
prove_iso_isolate_r2_r3_root.py
prove_iso_collision_r2_r3_root.py
```

with respective success markers

```text
PASS_EXACT_ALL_FOREST_COMPACT_ORDINARY_PREFIX_R2_R3_SPLIT
PASS_EXACT_ALL_FOREST_ISOLATE_FML_R2_R3
PASS_EXACT_ALL_FOREST_COLLISION_FML_R2_R3.
```

Thus the universal FML obligation begins at rank `r=4`.  The complete
rank-four top-collar layer `r=4=alpha(W)+2` is also now proved for all three
modes: the ordinary classification has minimum doubled gap `126`, while a
complete labelled-graph classification gives minimum isolate and collision
gaps `2` and `4` in `N_r` units.  Consequently the unresolved rank-four
domain has `alpha(W)>=3`.

The two lowest binomial bundle coefficients are now theorems for every
canonical deepest singleton-parent placement.  For a deepest sibling bundle
whose unique non-bundle parent `p` is distinct from both marks `u,v`, the
first coefficient `g_1` is exactly the ordinary rank-four FML gap and is
nonnegative.  Its proof combines an exact high-motif payment with a
parent-rooted degree-excess cone; the large-order certificate has 17 exact
degree-three simplex Bernstein branches and 595 coefficients, while a
complete exact census covers all 526,680 marked-parent cells on the 1,344
unlabeled forests of orders 3 through 11.  Independent audits reconstruct
every Bernstein expansion for both `g_1` and `g_2`.  For `p=u` or `p=v`, a
separate independent endpoint audit includes the order-two core and proves
both coefficients with five exact simplex branches per coefficient and a
complete 17,720-cell census for orders two through nine.

The canonical no-parent root-star mode `k=1` has the endpoint row and is
covered by the same theorem.  The `k=2` mode is independently proved from the
isolated-mark row reduction, exact univariate Bernstein certificates, and a
direct replay of all 80 unlabeled residual forests through order seven.  The
`k=0` mode is independently audited from its `D=C` row, five exact simplex
branches per coefficient, and all 147 marked-forest cells of orders two
through five.  Hence all canonical no-parent modes `k=0,1,2` are proved.
Noncanonical supports and the other FML modes remain open; consequently these
results do not prove rank-four FML.

If these inequalities hold at the needed ranks, repeated leaf deletion ends
at the proved path/star terminal bases and gives `N_r>=0` for every marked
forest.  Repeating the second-leaf reduction gives `D_r>=0`; (1) then gives
ISO; Sections 2--3 then give unimodality.

This is a complete algebraic dependency chain.  It is conditional precisely
at FML **on an induction-closed rank domain**.  The rank-domain audit in
Section 9 shows that recomputing a strict local cutoff after every deletion is
not closed under the same-rank child in FML.

## 7. Compact operator and the new truncated Schur route

For the quadratic Newton kernel `K`, exact symbolic algebra gives

```text
K(XP)=zw K(P)-(z-w)^2 P(z)P(w)/2.
```

For the nested kernel this yields a derivative-free symmetric form

```text
R(T)=z^2 E(w)W(z)+w^2 E(z)W(w)
     +zw[U(w)V(z)+U(z)V(w)].                         (3)
```

Under multiplication of all four minors by `(1+x)` (adjoining an isolate),

```text
N+ = (1+z)(1+w)N-(z-w)^2R/2,
R+ = (1+z)(1+w)R.                                   (4)
```

Define

```text
M_r=2[z^(r-1)w^r]N,
C_r=R_(r-1,r-1)-R_(r-2,r),
J_r=R_(r-2,r-1)-R_(r-3,r),
H_r=2[N_(r-2,r)+N_(r-1,r-1)]+J_r.
```

Then exact coefficient extraction from (4) gives

```text
C_r(+)-C_r-C_(r-1)=J_r,
M_r(+)-M_r-M_(r-1)=H_r,

(M_r+C_r)(+)-(M_r+C_r)-(M_(r-1)+C_(r-1))
 =2[N_(r-2,r)+N_(r-1,r-1)+J_r].                    (5)
```

Moreover, the isolate FML gap is exactly `M_r+C_r`.

The first two isolate layers are now proved on the full marked-forest domain:

```text
M_2=6,                 C_2=1,
M_3>=6,                C_3>=n^2-n>=2.
```

The rank-three statement follows from an exact forest-invariant formula and
elementary degree/edge-pair bounds.  It is replayed by
`prove_iso_isolate_r2_r3_root.py`, with marker

```text
PASS_EXACT_ALL_FOREST_ISOLATE_FML_R2_R3.
```

The differences `C_r` and `J_r` are the two innermost Schur coefficients of
the homogeneous slices of the symmetric polynomial `R`.  This converts the
isolate mode into a **truncated two-variable Schur-positivity problem**.

Exact finite evidence currently shows:

- `M_r`, `C_r`, and the isolate gap are strictly positive in 48,591
  supported marked-forest cells;
- the ordinary, collision, and isolate deletion recurrences for `M_r` and
  `C_r` have zero negatives in 36,371, 13,990, and 4,178 supported cells;
- the complete leaf-remainder Schur cone has zero negatives in 103,378
  ordinary, 38,870 collision, and 11,471 isolate supported coefficients
  (153,719 total);
- a full, untruncated Schur-positivity claim is too strong: exactly 36
  negative distance-two coefficients occur in this census, all above the
  supported rank.  The proof must retain the rank cutoff rather than claim
  global Schur positivity.

An independent exact twelve-vertex witness now makes that last warning
theorem-level rather than merely diagnostic.  For that marked forest,

```text
C_8=R_(7,7)-R_(6,8)=-3,
M_8+C_8=2033.
```

Hence global componentwise `C_r>=0` is false even though the coupled isolate
payment remains positive.  This witness is above the conjecture's prefix
cutoff, so it does not refute a cutoff-aware coupled proof.

For an ordinary third leaf, write `A=C+xH` and `Full=A+xC`.  A sharper exact
polarization identity is

```text
N(Full)-N(A)-zwN(C)
 = (z+w)N(C)+2zw B_N(H,C)
   -(z-w)^2[R(C+H)-R(H)]/2.                         (6)
```

The only clean two-part split found is

```text
A_r = diagonal of (z+w)N(C)+2zw B_N(H,C),
B_r = diagonal of -(z-w)^2[R(C+H)-R(H)]/2.
```

In 49,776 exact strict-prefix cells from 249 forests, `A_r`, `B_r`, and
`A_r+B_r` have zero negatives and respective positive minima `12`, `6`, and
`18` in doubled units.  This split is not cosmetic: the nested polarization
alone has 1,215 negatives (minimum `-976`), and nested polarization plus the
`R` term has 27 negatives (minimum `-246`) in the same census.

The first two rank layers of this split are now theorem-level for the full
ordinary-cell domain, with no cutoff assumption.  Exact coefficient
extraction gives

```text
A_2=12,                 B_2=6,
```

for every ordinary cell.  At rank three, elementary forest invariant bounds
give strictly positive floors for both pieces for every possible size of the
two-mark minor (including the small orders `n=2,3`).  The replay
`prove_iso_compact_ordinary_prefix_r2_r3_root.py` ends with

```text
PASS_EXACT_ALL_FOREST_COMPACT_ORDINARY_PREFIX_R2_R3_SPLIT.
```

Thus the ordinary compact-split problem begins at `r=4`.

The two compact pieces admit a more structural source-paired form.  If `B_N`
and `B_R` denote the symmetric polarizations of `N` and `R`, and
`delta=(z-w)^2/2`, then

```text
L_N(C)=N((1+x)C)-N(C)-zwN(C)=(z+w)N(C)-delta R(C),
B_N(xC,xH)=zw B_N(C,H)-delta B_R(C,H),
G_N(C,H)=L_N(C)+2 B_N(xC,xH).                         (6a)
```

This exposes the exact isolate/cross compensation, but the two source-paired
terms are not separately positive: an exact seven-vertex rank-four witness
has isolate reserve `950`, cross term `-112`, and full gap `838` in doubled
units.  Hence any rank-four proof must keep those sources coupled as well.

One complete rank-four boundary layer is now theorem-level.  At the top collar

```text
r=4=alpha(W)+2,
```

we have `alpha(W)=2`, hence `|W|<=4` by bipartiteness.  Adding the two marks
leaves a core of order at most six, so every case is covered by a finite exact
classification of all forest cores, all marked pairs, and all acyclic support
attachments.  Across all `1,453` reconstructed cells,

```text
G_4>=126,       A_4>=120,       B_4>=0
```

in doubled units.  Thus ordinary FML is proved universally on the entire
rank-four top collar.  The exact replay is
`prove_iso_compact_ordinary_top_collar_r4_root.py`, with marker

```text
PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_TOP_COLLAR_R4.
```

The isolate and collision modes admit the same finite reduction on this
boundary layer.  Direct enumeration of every labelled simple graph on at most
six vertices, filtered exactly to forests and all ordered marked roles, checks
`1,008` isolate and `2,016` collision cells.  Their minimum `N_r` gaps are
respectively `2` and `4`; every value is independently cross-checked against
the doubled bivariate kernel evaluator.  The replay
`prove_iso_isolate_collision_top_collar_r4_root.py` ends with

```text
PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_TOP_COLLAR_R4.
```

Therefore **all three** FML modes are proved on the rank-four top collar, and
the remaining rank-four range is `alpha(W)>=3`.

For the actual auxiliary dependency, a stronger direct base now bypasses the
next three rank-four FML layers.  Exact generation of all `2,947` forest
types through order twelve and all `25,897` marked pairs proves

```text
N_4(B;u,v)>=0  whenever 2<=alpha(B-{u,v})<=5.
```

The minima for `alpha(W)=2,3,4,5` are respectively `4,45,225,701`, and a
closed coefficient formula is independently cross-checked against the
bivariate kernel in every cell.  The replay ends with

```text
PASS_EXACT_ALL_FOREST_ISO_N4_ALPHA_W_2_TO_5.
```

This does not prove those FML inequalities themselves, but it supplies the
needed `N_4` induction base directly.  Consequently the unresolved
rank-four auxiliary route now needs FML only for `alpha(W)>=6`.

The next boundary layer is also completely closed.  At

```text
r=5=alpha(W)+2
```

we have `alpha(W)=3`, hence `|W|<=6`.  The ordinary classification covers
`12,955` reconstructed support cells and has minimum doubled full gap `108`
(although its separate `B` piece is negative in eight cells).  A second
complete classification covers `432` isolate and `588` collision cells,
with respective minimum doubled gaps `0` and `4`.  Therefore all three FML
modes hold universally on the rank-five top collar.  The two replays end with

```text
PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_TOP_COLLAR_R5
PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_TOP_COLLAR_R5.
```

The immediately adjacent rank-five layer is also completely closed.  When
`alpha(W)=4`, bipartiteness gives `|W|<=8`, so every cell is again finitely
classifiable.  The ordinary theorem checks `102,347` reconstructed cells and
has minimum doubled full gap `784`.  The isolate/collision theorem checks
`2,270` and `3,174` cells with respective minima `50` and `118`.  Hence all
three FML modes hold at `r=5, alpha(W)=4`.

The next layer `r=5, alpha(W)=5` is now completely closed as well.  For the
ordinary mode, exhaustive generation of every forest core through order
twelve, every marked pair, and every acyclic support attachment checks
`749,890` reconstructed cells.  The minimum doubled full gap is `3,650`;
both compact pieces are positive on this layer, although the isolate/cross
source split has `2,212` negative cross terms, so the coupling remains
essential.  The isolate and collision classifications check `11,574` and
`16,800` cells with respective minimum gaps `548` and `834`.  The replays
end with

```text
PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_R5_ALPHA5
PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_R5_ALPHA5.
```

Thus all three FML modes are closed through `alpha(W)=5` at rank five, and
the unresolved rank-five FML range is now exactly `alpha(W)>=6`.

The corresponding broad `R`-polarization search has 4,841 negatives among
373,769 coefficients, but zero negatives in all 6,058 coefficients whose
target ranks satisfy the strict conjectural prefix cutoff.  Thus separate
positivity of the two pieces was a clean local-prefix diagnostic, not a
global coefficientwise assertion.

This last sentence describes the cleanest observed local sign range; it is
not by itself an induction domain.  Same-rank leaf deletion can lower the
four-minor independence number and expose a child rank outside that child's
recomputed local cutoff.  Any proof using only nonnegative FML steps must use
the fixed-ambient envelope in Section 9, or add a new boundary-payment,
alpha-preserving leaf-selection, or telescoping theorem.

On the corrected induction-closed domain, separate positivity of the two
pieces is now exactly refuted.  The smallest witness is an eight-vertex path
with an ordinary marked-leaf configuration at

```text
r=5=alpha(W)+2,
B_5=-2,                 A_5=390,
A_5+B_5=388.
```

An independent exact census of 118,752 induction-domain cells through tree
order ten finds 50 negative `B` cells (minimum `-12`), but zero negative or
zero `A` cells and zero negative or zero full gaps.  Therefore the separate
truncated-Schur route cannot close the recurrence.  The viable target is the
full coupled inequality `A_r+B_r>=0`, or a cross-rank telescope that pays the
negative `B` cells from the `A` reserve.

There is also an exact product rule for stripping an unmarked component that
multiplies all four rows by the same independence polynomial `P`.  With

```text
J(P)=(z-w)[P'(z)P(w)-P(z)P'(w)]/2,
```

the ordinary `N`- and `R`-gaps satisfy

```text
G_N(P*C,P*H)=P(z)P(w)G_N(C,H)+J(P)G_R(C,H),
G_R(P*C,P*H)=P(z)P(w)G_R(C,H).                       (CF)
```

Here `G_R` is coefficientwise nonnegative; the unresolved common-component
effect is isolated entirely in the `J(P)` correction.  This upper-triangular
two-form module is proved symbolically in
`derive_iso_fml_common_factor_product_rule_root.py` and documented in
`ISO_FML_COMMON_FACTOR_MODULE_ROOT_2026-08-29.md`.  It is a reduction, not a
sign proof.

These are finite diagnostics, not proofs of FML.  The exact formulas are in
`derive_iso_isolate_recurrence_hierarchy_root.py`; the censuses are in
`probe_iso_isolate_adjacent_coupling_root.py`,
`probe_iso_adjacent_curvature_third_leaf_root.py`, and
`probe_iso_r_leaf_schur_remainder_root.py`.  The corrected-domain split
census is replayed by
`probe_iso_compact_ordinary_component_signs_induction_domain_root.py`.
The exact obstruction and the new compact split are documented in
`ISO_R_CENTRAL_UNIMODALITY_ROUTE_COUNTEREXAMPLE_ROOT_2026-08-29.md` and
`ISO_TRUNCATED_SCHUR_COMPACT_SPLIT_ROOT_2026-08-29.md`.

## 8. What the last computation did and did not establish

The most recent exact work established:

- all-order WR for forests;
- direct strict ISO at every prefix-relevant target cell of ranks three
  through eight, via the stronger fixed-rank reserve theorems, the exact
  bridge `(B)`, and independently replayed no-gap rank-seven and rank-eight
  integrations;
- the bare-path Christoffel--Darboux quotient with coefficientwise positive
  all-order expansion;
- all-order short- and long-`S` low-Newton terminal sectors for `N>=31`;
- the complementary exact finite `N=13..30` audit, which together with
  those `N>=31` sectors closes the supported no-isolate disconnected-forest
  terminal row `m=1,j=3` (and no broader row);
- an all-order stable-`B` canonical-`J` leaf base in its stated parameter
  range;
- the all-order BB/common-path sector and every mixed diagonal `i+j<=11` of
  the connected double broom;
- the exact isolate/Schur hierarchy (3)--(5);
- the exact ordinary-leaf compact split (6), with both surviving pieces
  clean in a 49,776-cell strict-prefix census;
- all-cell positivity of both ordinary compact pieces at ranks `r=2,3`;
- all-cell positivity of the coupled isolate gap at ranks `r=2,3`;
- all-cell positivity of both marked-support collision orientations at ranks
  `r=2,3`, so every FML mode is closed through rank three;
- universal positivity of all three FML modes at the rank-four top collar
  `r=4=alpha(W)+2`, by exhaustive finite classifications forced by
  `alpha(W)=2`;
- universal nonnegativity of all three FML modes at the rank-five top collar
  `r=5=alpha(W)+2`, by exhaustive finite classifications forced by
  `alpha(W)=3`;
- universal positivity of all three FML modes on the next rank-five layer
  `r=5, alpha(W)=4`;
- universal positivity of all three FML modes at `r=5, alpha(W)=5`, leaving
  only `alpha(W)>=6` at rank five;
- direct `N_4>=0` for every marked forest with `2<=alpha(W)<=5`, leaving
  only `alpha(W)>=6` in the rank-four auxiliary route;
- the exact source-paired compensation identity `(6a)` and an exact witness
  showing that its isolate and cross summands cannot be proved separately;
- the exact upper-triangular common-component module `(CF)`;
- the exact degree-six rank-four bundle polynomial, with universal forest
  theorems for `g_4,g_5,g_6` and independently audited universal positivity
  of `g_3`;
- exact independently audited `g_2,g_1>=0` for every canonical deepest
  singleton-parent placement, including the two endpoint-parent orientations;
- exact independently audited `g_2,g_1>=0` in every canonical no-parent
  root-star mode `k=0,1,2`, together with the exact configuration equivalence
  `Q35=S(e-2)-2R3-H`;
- an exact induction-domain obstruction to separate `B_r>=0`, while the
  coupled full gap remains strictly positive in all 118,752 audited cells;
- an exact cutoff-domain audit showing that the previously proposed local
  condition `r<L(alpha(B))` is not hereditary and is not a valid completion
  criterion;
- a connected bundled-spider obstruction to every fixed cutoff collar, plus
  the exact whole-bundle telescope `(BT)` with coefficientwise positive scalar
  kernels but one remaining coupled polar/`R` sign;
- an exact obstruction to every nontrivial hard-state partition of the
  corrected double-broom recurrence numerator and to every index-dependent
  but rank-independent scalar transfer (a route obstruction only);
- an exact counterexample to the tempting untruncated componentwise
  `C_r>=0` route, which fixes the proof's necessary cutoff-aware scope;
- no counterexample in a depth-20 beam of 28,302 products of nine hard
  component families (finite evidence only);
- no negative FML gap in an all-rank exact forest census through order thirteen:
  `10,045,774` cells (`8,294,614` ordinary, `1,744,760` collision, and
  `6,400` isolate), with minimum doubled gap `12` (finite evidence only).

It did **not** establish FML, the mixed double-broom residue `i+j>=12`, the
target ISO inequalities at ranks nine and above, or a counterexample.
Therefore the conjecture is not yet resolved.

The finite audit is replayed by
`audit_terminal_q3_m1_forest_j3_exact_u1_finite_fast_agent.py`.  Its frozen
report covers `16,371` structural cells, `873,942` supported integer-`W`
cells, and `1,787,452` exact endpoint/crossing candidates, all strictly
positive.  The dependency and scope audit is frozen in
`exact_certificate_dependency_assembly_20260829.json`; in particular it does
not promote this terminal row to FML or to all-forest ISO.

## 9. Correct induction domain and completion criterion

The earlier candidate domain

```text
2 <= r < L(alpha(B))
```

is **insufficient**.  If `W=B-{u,v}`, direct use of `N_r(B;u,v)` is governed
by the outer forest, whose independence number is `alpha(W)+2`, not by
`alpha(B)`.  More importantly, an FML same-rank child can lower `alpha(W)` by
one, so even the corrected local condition
`r<L(alpha(W)+2)` is not hereditary.

Fix an original ambient forest `F0` and put

```text
A0=alpha(F0),             R0=L(A0)-1.
```

Keeping `R0` fixed through every deletion gives the exact induction-closed
four-minor envelope

```text
2 <= r <= min(R0,alpha(B-{u,v})+2).                  (7)
```

Ranks above the displayed support close by the exact top identities for
`Q`, `D`, and `N`.  Uniformly over all ambient forests, the present recurrence
strategy therefore requires FML for every marked forest at

```text
2 <= r <= alpha(B-{u,v})+2.                          (8)
```

This is not merely an artifact of isolated-vertex padding.  A connected
three-bundle spider family forces arbitrarily many consecutive deletions that
all lower the relevant independence number, no matter which eligible leaf is
chosen.  Exact connected witnesses refute both one-rank and two-rank collars;
the general family makes every fixed collar fail.  Therefore stripping
top-level isolates or choosing a different leaf does not repair the local
cutoff strategy.

There is, however, a precise bundle-telescoping candidate.  If `B_M` is formed
by adding `M` leaves at one unmarked support, with `C` the support-deleted
four-minor tuple and `h_M=(1+x)^M-1`, exact algebra gives an aggregate payment

```text
Gamma_M
 =2 B_N(H,h_M C)+P_M N(C)-(z-w)^2 J_M R(C)/2,        (BT)
```

where both scalar kernels `P_M` and `J_M` are proved coefficientwise
nonnegative.  The remaining polar/`R` coupling in `(BT)` is open, but exact
audits have zero negative aggregate ranks on the bundled-spider family
through `M=40` and on the exhaustive small-base census.  A proof of this
Bundle Payment Lemma would delete an entire forced bundle at once and avoid
the cutoff drift.  The connected obstruction and `(BT)` are documented in
`ISO_ALPHA_SELECTION_COLLAR_AND_BUNDLE_TELESCOPE_AGENT_2026-08-29.md`.

At rank four this aggregate has the exact binomial expansion

```text
Gamma_M=sum_(j=1)^6 g_j binom(M,j).
```

The coefficients `g_4,g_5,g_6` are nonnegative for every forest bundle cell,
with `g_4>=33n+12`, `g_5=50`, and `g_6=0`.  The coefficient `g_3` is also
universally nonnegative and has an independent exact audit.  The remaining
coefficients `g_2,g_1` are proved for every canonical deepest singleton-parent
placement, including both endpoint-parent orientations.  In the canonical
no-parent root-star classification, `k=1` is covered by the endpoint row and
`k=2` has a separate independent exact theorem, while `k=0` has an independent
exact `D=C` cone/simplex audit.  Thus all three canonical no-parent modes are
proved.  Noncanonical-support cells remain open, so these coefficient theorems
do not yet prove the Bundle Payment Lemma or rank-four FML.

The newest source/report pairs are frozen at

```text
PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_ORDINARY
DA33E9F2C461AF57F3C4000955CFD1687F6EDEB5682ABE2A898EB9E9632D7FEA
EF8A3E68E821B51B46744B508D6C1C846686BDFE6C9CCFFC0625C1CDF5343351

PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_PARENT_CONE_COMPLETE_G1_BERNSTEIN
7BEAE7422441A07491B27C7A979A3AB56E1DB436DC506ABBF503CB352C872BAE
AA6149DB846DA052CAF61D6C1971EAC0C78A51188208C2474172148B735241C8

PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_I5_ROOT_CONFIGURATION_EQUIVALENCE_AUDIT_AGENT
DAB6590BC2EF3ACFD335FBAB4219C72598C9846C46015F1120310F4E0BC9B9CE
D8027B321FD72DB8C8D7908D7749C27E9AB4EB7C470E519B5A55D55B3D6EE743

PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_G1_G2_AUDIT_G1_BERNSTEIN
DE8A182E15D9624E3C2F492C177F94AD66064DD2BC8D9048C6026A5F7B3CB363
6BD3EEA426C08AA1C65DCC0A5EB74635A7849BA7011BA8C6AB60BD2ADC74CE05

PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K1_ENDPOINT_IMPORT_AGENT
1611AE278C65CA3438C26BD2E6484BE0DD76BFE9D47C12E267E9B366095E0A74
AE4D05895B23E5EDE072B4283FB8B77F2AD7ADBB8575486D44FCBC5F21E430F8

PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K2_AUDIT_G1_BERNSTEIN
9498FAA64C8DF0DA7022BACDDC6C3D22E05B39290F3D668E61A867068E85210C
F05D18C688FC1F9524F15E538849AB0C80A287DD2A7933D5CE8955D198B17497

PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_ROOT
ACAF7C560FD700B3049CEC947738202E3578685789CAAFA01EB93EF96737CE9D
72A41633D56D727A25C565DA146A7376E878B8C10C3F2B43DF139A84C800E911

PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_AUDIT_AGENT
BE7F1A401BCA0BAB69F81FD2B1FAC5C97ED53F663909C34A433902A968E6FC3C
0644F23004A3EDCEED1D3147C7AD18F9F0FF2B5B55C0E4BA602C43C2A3D007DE

PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_ROOT_STAR_ALL_MODES_AGENT
3EACDAED44CC0B009B57BDFFF8435DB8C0670FE21E0FFF159AADBFCE116D1306
2D58A12FDAD694E9E741DDAD62B9F237E8425AB484CB041E145A6BFC0277CF17

PASS_EXACT_FRESH_REPLAY_FREEZE_DOUBLE_BROOM_NEWTON_TOTAL_H_11
CE95C3DFE1706789213EDA46E6C32ED6437797F62F398383A80A26A793FE49EE
3E2DABBD099922B9D72B134DDA05F2A5FC89F3E0A5F980B20DC3B0A6BDF0B2B6

FOUND_EXACT_DOUBLE_BROOM_ALL_HARD_STATE_PARTITIONS_AND_INDEX_SCALAR_RECURRENCE_CONE_OBSTRUCTIONS
3705888C24A4D82A25942E0366C6FC5AE766744CD19E443F99876BD6DD74AAAF
F13AD1D4C872F8F204FF824C220061D51281A56154B8E2D4FB3ED8ED9BC974F4
```

A legitimate final proof can now be completed in either of two ways:

1. prove all three FML modes on the uniform domain (8); or
2. prove them on the fixed-ambient domain (7) together with a new theorem
   that prevents or pays every cutoff leak (for example an alpha-preserving
   leaf selection, an exact boundary payment, or a telescoping deletion).

The exact witness and residue-class audit are in
`ISO_CUTOFF_DOMAIN_CLOSURE_AUDIT_AGENT_2026-08-29.md`; replaying
`audit_iso_cutoff_domain_closure_agent.py` ends with

```text
PASS_EXACT_ISO_CUTOFF_DOMAIN_SCOPE_AUDIT.
```

After either valid completion route is independently proved, Sections 1--6
assemble the full unimodality theorem with no additional conjectural input.
