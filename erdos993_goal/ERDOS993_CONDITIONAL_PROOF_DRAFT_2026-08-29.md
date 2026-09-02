# Erdős Problem 993: conditional proof draft

Date: 2026-08-29

Status: **formal proof assembly conditional on the remaining rank-five-and-up
four-minor/payment chain.**
This is not yet a proof of the conjecture.  It records the proof in the form
that will become final if the boxed lemma in Section 5 is discharged (or if
an equivalent global payment theorem replaces it).

## Rank-four completion update (supersedes older rank-four status below)

The all-forest rank-four theorem is now proved:

```text
N_4(B;u,v)>=0
```

for every finite forest `B` and distinct marks `u,v`.  The proof roots marked
components at the marks, chooses a deepest eligible leaf support, and exhausts
five nonterminal modes.  A scope audit discovered and corrected the previously
missing protected-connector mode: its child side is the one-ended broom
`B_(ell,k)`, `ell>=1,k>=0`, not always a bare path.  All six bundle
coefficients are nonnegative in every mode; the no-support terminals are
double brooms or two rooted stars plus isolates.  The exact bundle telescope
and all-forest `N_3` theorem then close strong induction.

The primary assembly and two independent audits replay under markers

```text
PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_G1_BERNSTEIN
PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12
```

Accordingly, any later sentence in this chronological draft saying that all
`N_4` or noncanonical rank-four support cells remain open is obsolete.  The
conjecture is still open here because the analogous rank-five-and-up payment
and final propagation remain unfinished.

## Rank-six `G2` completion update

The rank-six whole-bundle coefficient `G2` is now nonnegative for every finite
forest in the canonical construction, every ordered pair of distinct marks,
and every canonical deletion-parent mode.  The exact partition first separates
adjacent from nonadjacent marks and then exhausts, in each geometry, no parent,
the two endpoint-parent modes, ordinary parent with no mark, and ordinary
parent on the marked spine.  The dependency-pinned assembly and its independent
fail-closed partition/hash audit replay under

```text
PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_ALL_PARENT_MODES_ROOT
PASS_EXACT_ISO_N6_BUNDLE_G2_COMPLETE_INDEPENDENT_AUDIT_ROOT
```

This removes the rank-six `G2` coefficient from the open whole-bundle payment.
It does not prove rank-six `G1`, rank-seven propagation, the remaining Newton
payment, or the conjecture.

Together with the previously frozen universal coefficient theorems for `g3`,
`g4`, and `g5,...,g10`, a dependency-pinned assembly now proves every
rank-six whole-bundle coefficient `g2,...,g10`.  An independent audit rebuilds
the disjoint coefficient blocks `{2}`, `{3}`, `{4}`, and `{5,...,10}` and
checks that their union has no gap.  The replay markers are

```text
PASS_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT
PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT
```

Accordingly, `g1` is the only coefficient still open inside the rank-six
whole-bundle polynomial.  Terminal scope and the all-`N6` induction remain
separate and must still be assembled after `g1` closes.

Within the singleton-ordinary ordinary-leaf part of that open coefficient, an
exact structural census now exhausts the distinct mark-only family.  The 24
labelled forests on `p,q,u,v` with `uv` forbidden collapse to exactly 15
symbolic leaf-increment expression classes, and every class has
coefficientwise nonpositive `k7` derivative.  After the separately frozen
edgeless class, there are exactly fourteen nonempty representatives; `pq` is
one of them.  The census replays under

```text
PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_MARK_ONLY_EXPRESSION_CLASS_EXHAUSTION_ROOT
```

This only bounds the residual exactly; it does not prove the thirteen classes
left after the edgeless and `pq` classes, any geometry sharing an unmarked core
vertex, or universal rank-six `G1`.

The complete independent `pq` replay is terminal and byte-identical.  The
source/report SHA-256 values are
`823BF71F729AD98159096AEF26C770277B10D23F1278355C34C1F980DADE04DA`
and
`C12168FE4DA2B4FA2B04E37935537EA5E6D4CF2E2EA6232EE2E9EAF2B8064CB2`.
Its high sector has 2,744 rows, 8,532,574 positive coefficients, zero negative
coefficients, minimum `11/42000`, and row hash
`CE5AD522AF448E7FD09503A19E20969ABB94A566773D840886774DA71A709E6D`.
Its low sector has 8,232 rows, 8,524,635 positive coefficients, zero negative
coefficients, minimum `1/1200`, and row hash
`7A84FC9C2E1BC5648BCCCDEA435A97BBA52BDD65B3615BB5388268A0A310AF78`,
under

```text
PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_PQ_MARK_ONLY_COMMON_FOREST_ROOT
```

This proves exactly the distinct-`pq` mark-only/common-forest leaf slice, not
universal rank-six `G1`, the collision replay, the thirteen residual classes,
or the theorem.

The thirteen exact residual expression classes are now partitioned into two
one-edge, six two-edge, and five three-edge classes, and each has one unique
dependency-pinned, compiling, fail-closed producer.  An independent static
auditor verifies the complete digest/representative partition, every source
hash and safe symbolic check, and that all twenty-six high/low sector records
remain `PENDING` behind gates which precede worker creation.  Its
source/report SHA-256 values are
`CC1F74244B19C5B685769799A6AE29303CE1F6D5EC27FB3693BD6CEF7A732ABD`
and
`15CC4BB343B15E48CCB695BB713503C55CB1F2BCCC56906DCD7787B928FD7740`,
under

```text
PASS_STATIC_QUEUE_SCAFFOLD_COMPLETENESS_ONLY_NOT_POSITIVITY_ISO_N6_BUNDLE_G1_DISTINCT_RESIDUAL_13_ROOT
```

A separate one-class-only queue runner, SHA-256
`B856BA486B7A959DC8EEC74A19131D6CFF1F546D711317D0FBF0022551856E96`,
refuses to launch while the protected `pq` replay is live or unless available
physical memory, commit, and disk meet 12, 16, and 20 GiB guards.  These are
execution safeguards and scaffold-completeness facts only; no one of the
thirteen classes is positive or removed from the rank-six residual until its
exact streams, replay, and independent audit pass.

This queue is exhaustive only in the nonadjacent `singleton_ordinary`
ordinary-leaf mark-only/common-forest slice.  Universal rank-six `G1` still
ranges over adjacent and nonadjacent mark geometries and all five canonical
modes (`no_mark_root_k0`, `singleton_ordinary`, `singleton_endpoint`,
`internal_spine_ordinary`, and `internal_spine_endpoint`), and no universal
ten-cell `G1` assembler or reduction is proved.  Shared-core configurations in
which a distinguished mark lies in a component containing an unmarked core
vertex are already outside the thirteen-class queue.

The strongest general reduction remains conditional on the unproved sign

```text
g1(C,D) >= g1(C-ell,D-ell)
```

for every marked forest `C`, every actual induced marked minor `D`, and every
unmarked vertex `ell` of degree at most one.  Its fail-closed report has
SHA-256
`9805A20F3D882968FE53CFD08A50C68F99D89DA09C8B85ACCCF75C3419B5B043`
under

```text
PENDING_EXACT_ISO_N6_BUNDLE_G1_LEAF_REDUCTION_G1_NONADJACENT
```

An independent exact reduction audit verifies that the five modes all use the
same raw `g1(C,D)` formula, that mark swap is an exact symmetry, and that the
adjacent geometry is the `Z_C=Z_D=0` occupation face of the nonadjacent
functional.  A simple monotone ordering by induced-minor inclusion is false:
fixed-`C` one-leaf enlargements of `D` have exact increments `-484` and
`115480` in two replayable witnesses.  The audit source/report SHA-256 values
are
`1BD8C69CE801B2CFABA22B24D77196D5DF96B4BE6A6D89A003FFBA665031601A`
and
`D0AD2530A919FFA4E5D64588AF54599893B152933587AA09B85E448A1155AB3B`,
under

```text
AUDIT_EXACT_ISO_N6_BUNDLE_G1_TEN_CELL_REDUCTION_AGENT
```

For ordinary-parent leaves the complete coupled target now reduces exactly
from four retention cases to two sign lemmas.  Define

```text
Lambda(H,K;J)=Q(H,J)+Q(K,J)+T(H,J).
```

Direct rank-six reconstruction proves

```text
Lambda(H,K;J)=P6((1+x)H+xK,xJ)=P6(C,xJ),
Delta01-Delta00=Delta11-Delta10=Lambda(H,K;J).
```

One sufficient split, in this ordinary-parent geometry, would be to prove on
genuine forest triples

```text
Lambda(H,K;J) >= 0,
g2_6(H,J)+F(H,K)+epsilon Q(H,L) >= 0  (epsilon in {0,1}, L=J intersect K).
```

The second inequality would equivalently be
`g2_6(H,J)+F(H,K)>=max(0,-Q(H,L))`.  It retains the complete coupled payment,
so it does not assume either false shortcut `Q>=0` or separate post-`G2`
residual positivity.  The reduction assembler/report SHA-256 values are
`103613CBD9B89B9EBE90062DAE14E4E9A6EB6251CA804D3527D5426F4D8DCEA7`
and
`183EDA0B4E3030FC60C7960938ABD0B7341E7F10419A7D52220D4C41DD95C64B`.
An independent direct symbolic audit has source/report SHA-256 values
`4F4FC97FEBB776CF8034D61E61494A5DC3286770D5089D6661DFBBA6040E7069`
and
`A4B3CA4F10F953120F17C0D85C83A813D540A3DD94BE8B2A34DFB68B98018E6F`,
under

```text
AUDIT_EXACT_ISO_N6_BUNDLE_G1_LEAF_COUPLED_MASTER_REDUCTION_ROOT
```

The standalone swapped response is false in another required leaf mode, as
recorded below, so the universally safe ordinary-parent formulation is the
complete four-cell square

```text
g2_6(H,J)+F(H,K)+epsilon Q(H,L)+eta Lambda(H,K;J) >= 0,
epsilon,eta in {0,1}.
```

The ordinary-specific `Lambda` sign is still unproved and unrefuted.  Isolated
and marked-parent leaf modes remain separate; this is not universal rank-six
`G1` closure.

The retention-polarization lemma itself is exactly a swapped rank-six `G2`
polarization:

```text
Lambda(H,K;J)=P6(C,xJ)=g2_6(J,C)-g2_6(J,0).
```

The identity follows at the isolate-operator level from
`(1+x)^2-2(1+x)+1=x^2` and symmetry of the bilinear polarization of `N6`;
the unswapped orientation is exactly unequal.  This suggests
swapped-superforest monotonicity `g2_6(J,C)>=g2_6(J,0)` for leaf-shaped
inclusions, but it is not a corollary of the completed
rank-six `G2` theorem, whose second argument must instead be an actual induced
minor of its first.  The exact source/report SHA-256 values are
`ABD9D803DB041222CAFB3A09856C058A90989F7387858C78574741495F5F832E`
and
`888F2FA51513715988DE53E08950EFE09B65D3B0828A2FE18789E5B647AF9E16`,
under

```text
DERIVED_EXACT_ISO_N6_BUNDLE_G1_LEAF_LAMBDA_SWAPPED_G2_ROOT
```

Standalone swapped-superforest nonnegativity is in fact false in a required
retained-isolate shape.  An independently reconstructed order-41 forest gives

```text
g2_6(B,(1+x)A)-g2_6(B,0) = -158221416,
g2_6(A,B)                  = 15446966506,
full retained increment   = 15288745090 > 0.
```

The verifier source/report SHA-256 values are
`6D62955BED8D1AC71878A6166CD72924183687234939A5E64403514219513AFD`
and
`0A5A7C530715A8FC1BA85BF2865AF1959EC5DEB935E671BF89ACE9D382F64DFE`,
under

```text
COUNTEREXAMPLE_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_SWAPPED_G2_SIGN_ROOT
```

The full increment remains positive because its frozen `G2` base pays the
negative response.  Therefore the response cannot be separated from its base;
this is not a counterexample to rank-six `G1` or to the conjecture.

For the still-open ordinary-specific response there is an exact corrected
vertex telescoping.  With
`Phi_J(D)=g2_6(J,D)-g2_6(J,0)`, an ordinary vertex `q` gives

```text
Phi_J(D)=Phi_J(D-q)+Q(J,D-N[q]).
```

The same uniform four-row recurrence cannot delete either distinguished mark;
exact endpoint operators `B_u,B_v` give those two boundary cases.  In the
ordinary-parent geometry one may stop at
`Jplus=H[V(J) union {u,v}]`, obtaining

```text
Lambda = Phi_J(Jplus) + sum_t Q(J,R_t) + Q(J,K) + Q(J,H).
```

The right side must be paid jointly.  Separate `Q>=0` is false by an exact
genuine witness, and connector vertices can join arbitrarily many prior forest
components, so no fixed bounded-arity local list follows from acyclicity.  The
symbolic source/report SHA-256 values are
`02A72D0722442F639EA8D2D770B53F24F7DA16FCF354D6555872A3E8CDCE02C0`
and
`610D0983EEE9CF9F7AD5B3326BF43ECD7A221AE934EC7781B1BAC6C5FF5A7CC3`.
This is a global-target reduction only; its sign remains open.

The stronger leaf-deletion inequality has also been checked exactly on the
complete connected order-eight layer.  The census contains 23 nonisomorphic
trees, 644 unordered marked pairs, 2,121 eligible unmarked-leaf instances, and
542,976 actual induced-minor cells.  Every increment is strictly positive;
the minimum is `108`.  The final guarded source/report SHA-256 values are
`31742B607F06EE45720035E477A2E8C8B20783C1AFFBD2C2BB256A08BB40CC52`
and
`7D471877BF239DABFA818EA4F8F846FAFBD59A4CA77FB697690B52B01B1574D2`,
under

```text
PASS_EXACT_ISO_N6_BUNDLE_G1_LEAF_DELETION_CONNECTED_N8_AGENT
```

An independent structural/class-count and minimum-witness audit has
source/report SHA-256 values
`22E3FBF5CD797B622D47FD5288D267E06F97606736BC9B091AB193AFADE59FC1`
and
`58FAA4623F7E88FE52BA85E99F837EDC4E4D2412A49BBC0BE99AD65F6DFFEDF2`.
Two full executions reproduce the same ordered 542,976-value stream, minimum,
signs, classes, and theorem payload; only the intentionally live resource
telemetry differs.  The replay-audit source/report SHA-256 values are
`5C1F32441756254F8965EE59E209C243D7DF5D2DB4B667111F28AA38F37CAC03`
and
`0FB004B51DE244571CF99201EE0F133E2C9E4F5F9799FE01E597A7B875D79178`,
under

```text
PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G1_LEAF_DELETION_CONNECTED_N8_ROOT
```

This is a finite connected order-eight sublemma only: disconnected order eight,
all larger orders, and the universal leaf theorem remain open.

The remaining non-ordinary leaf recurrences give one additional universal
submode closure.  For an isolated unmarked vertex `ell` excluded from `D`,

```text
g1_6((1+x)A,B)-g1_6(A,B)=g2_6(A,B),
```

so the completed universal rank-six `G2` theorem proves this case in both mark
geometries.  Retaining the isolated vertex in `D` produces the exact residual

```text
R_iso=P6((1+x)A,xB)=g2_6(B,(1+x)A)-g2_6(B,0),
```

which is the same swapped-superforest expression as ordinary-parent `Lambda`,
not a new residual family.  Its standalone sign is false by the witness above,
so it must remain coupled to `g2_6(A,B)`.  Its source/report SHA-256 values are
`3C62628E5C4A5516C8F94DF56D81B94CF114178FE92EEE3776F1EC607012CD4F`
and
`DFF5802C0758CF376744765A10D1EEF2C4E965D32827C410F6BA6CB0883486EA`.
For a leaf attached to either distinguished mark, the deleted and retained
cases are new oriented polarizations; the two endpoint orientations are exact
mark swaps and do not equal the natural frozen `G2` candidates.  The
identity source/report SHA-256 values are
`9BA12AC476425CCF6BB9252DDA58F0CC8E914E6BB2CAE256E0A95DA4CBE6DB4A`
and
`1C881A5DFABC76D7270D570F38C19D50971CFD800035293A97FBD354AA38FBBC`.
The independent reconstruction source/report SHA-256 values are
`2AC248EE923B5736BBFC831FBA87998C8295AD1946AA8B6755381218B1F97A0B`
and
`DF277F92B4D5A24CC4058576C728CB9CD710F82AF978C8F5DE0ADC38D2BB99BD`,
under

```text
AUDIT_EXACT_ISO_N6_BUNDLE_G1_ISOLATED_AND_MARK_PARENT_LEAF_INCREMENTS_ROOT
```

Only the isolated/deleted submode closes here.  Retained-isolate remains open
as a coupled `G2+response` payment; marked-parent signs remain open separately.

For a leaf attached to distinguished mark `u`, define
`S=A-u`, `T=B-u`, `C=A+xS`, and

```text
Omega_u(A,B)=g1_6(C,B)-g1_6(A,B).
```

Exact reconstruction gives

```text
Delta_u,deleted = Omega_u(A,B),
Delta_u,retained = Omega_u(A,B) + g2_6(T,C)-g2_6(T,0).
```

Thus the retained response is again the shared swapped-superforest expression,
but its possible negativity must stay coupled to `Omega_u`; the `v`
orientation is an exact mark swap.  The new base `Omega_u` is not an
ordinary-parent boundary specialization and lies outside the scalar span of
the frozen `G2,...,G10` cells on `(A,B)` and `(A-u,B-u)`.  The exact
source/report SHA-256 values are
`4C444732EB1B26D157B64D636A04E4A4097E6688C91FA406BF656BAE0B0FFA7E`
and
`F46AB5798AF8D15B0421545D4AFF5E0331EDB0E3EED0D379C89D4411133E0CFC`.

The universal unmarked degree-zero/one leaf inequality is therefore
exhaustively reduced to the following fixed three coupled sign families:

```text
1. g2_6(A,B)+Phi_B((1+x)A) >= 0 for a retained isolate;
2. g2_6(H,J)+F(H,K)+epsilon Q(H,L)+eta Phi_J(C) >= 0 for all
   epsilon,eta in {0,1} in the ordinary-parent square;
3. Omega_u(A,B)+eta Phi_T(A+x(A-u)) >= 0 for eta in {0,1}, with the
   v case supplied by mark swap.
```

The isolated/deleted case is already closed by `G2`.  There is no additional
leaf-mode formula outside this list, but none of the three coupled universal
families is proved here.

For the retained-isolate family, exact minor-coordinate linearity gives a
useful sufficient tail reduction.  Sign-splitting every minor-coordinate
derivative, applying the exact containment caps only to its negative part,
and then writing `q=e+t` with `0<=t<=n-e` produces a lower polynomial that is
independent of the minor order.  Retained-mark branch differences are
coefficientwise nonnegative.  It is therefore enough to prove two q-free
full-forest inequalities, one for adjacent marks and one for nonadjacent marks,
both with neither mark retained by the minor.  Every marked forest through
order ten satisfies them exactly, but that finite collar is not the proof of
the unbounded tail.  A separate reconstruction independently replays the
minor-coordinate linearity, all eight q-free branch formulas, and the
coefficientwise domination that makes the two zero-retention branches worst.

The following universal marked-neighborhood lemma strengthens the available
tail cone.  Let `H=F-{u,v}`, `m=|H|`, `U=N_H(v)`, and `V=N_H(u)`.
Because `F` is a forest, `U` and `V` are independent.  If `uv` is an edge,
then `U` and `V` are disjoint and no edge joins them: a common vertex would
form a triangle, and a joining edge would form a four-cycle.  Hence
`H[U union V]` is an independent set.  If `uv` is not an edge, two common
neighbors would form a four-cycle, two distinct edges between `U-V` and
`V-U` would form a cycle through `u` and `v`, and one such edge together with
a common neighbor would do the same.  Thus, for
`c=|U intersect V|` in `{0,1}`, the union spans at most `1-c` edges.

Writing `a=CA2`, `b=CB2`, and, in the nonadjacent case, `z=CZ3`, the exact
sizes are

```text
adjacent:    |U union V|=2m-a-b;
nonadjacent: c=m-a-b+z, |U union V|=m-z,
             |V-U|=a-z, |U-V|=b-z.
```

Every independent `d`-set supplies `binom(d,r)` independent `r`-sets.  A
`d`-vertex graph with at most one edge supplies at least
`binom(d,r)-binom(d,r-2)`.  Applying these observations for `r=2,3,4` yields
nine adjacent and fifteen nonadjacent polynomial inequalities in the
`W/A/B/Z` coordinates.  The symbolic implementation replays without a
negative cell, and a separate graph-level implementation performs 313,209
checks with zero structural failures and zero negative slacks.  This lemma is
unconditional, but a nonnegative combination proving either q-free target has
not yet been reconstructed.

For nonadjacent marks the one possible edge in `H[U union V]` can be lifted
exactly.  Inclusion-exclusion gives

```text
R=CW2-CA3-CB3+CZ4.
```

When `c=0`, `|U||V|-R` is the number of `U--V` edges; when `c=1`, acyclicity
forbids all such edges.  Therefore

```text
HX=(1-c)(|U||V|-R)
```

is in `{0,1-c}` and is exactly the induced-union edge count.  The exact
independent-subset lower bound is consequently

```text
W_r >= binom(m-z,r)-HX binom(m-z-2,r-2),  r=2,3,4.
```

This supplies degree-two, degree-three, and degree-four constraints together
with the zero identities `c(1-c)=0`, `HX(1-HX)=0`, and `c*HX=0`.  A direct
55,620-cell graph-level replay of the lifted bounds has no failure.  These are
unconditional atoms for the retained-isolate certificate; the certificate
itself remains to be found and replayed.

For adjacent marks there is a further actual induced minor.  Let
`R=H-(U union V)` and `M=C[R union {u,v}]`.  The marks form an isolated marked
edge inside `M`, so its deletion rows satisfy

```text
M_E=(1+2x)I(R;x),  M_U=M_V=(1+x)I(R;x),  M_W=I(R;x).
```

The induced-forest row of `R` supplies 20 linear, seven quadratic, two cubic,
and two quartic exact constraints.  More importantly, the already-proved
universal `G4,...,G10` theorem applies to every natural `C`-to-`M` deletion
pair and every internal deletion pair of `M`, giving 154 additional
nonnegative frozen cells.  A direct implementation replay finds no row
mismatch and no negative frozen cell.  A degree-four product cone using the
`R` constraints but not these 154 cells is infeasible; that rules out only the
smaller cone.  The enhanced cone with all `M` cells is the current adjacent
certificate search.

For nonadjacent marks, take `R` to be the vertices adjacent to neither mark.
Then `M=C[R union {u,v}]` is the disjoint union of `R` and two isolated marked
vertices, and `CZ_(r+2)=i_r(R)`.  Hence

```text
M_E=(1+x)^2 I(R;x),  M_U=M_V=(1+x)I(R;x),  M_W=I(R;x).
```

The already-present `CZ3,...,CZ7` coordinates therefore import 132 additional
frozen `G5,...,G10` cells, 54 between `C` and `M` and 78 internal to `M`.
Their exact direct-row replay has zero mismatches and zero negative cells.
They strengthen the active nonadjacent cone; they do not by themselves prove
the q-free target.

Adjoining `CR6=i_6(R)` also imports the missing 22 frozen `G4` cells.  The
universal supporting inequalities are

```text
CR6<=CA7,  CR6<=CB7,  CR6<=CW6,
CW6-CA7-CB7+CR6>=0,
6 CR6<=(CZ3-5)CZ7.
```

The first four are induced-family containment and union bounds; the last is
the forest independent-set extension inequality on `R`.  Exact replay on all
order-eight/nine nonadjacent marked forests has no failure.  Hence the
strengthened common-minor cone contains every frozen `G4,...,G10` cell, but
the target sign still requires a certificate in that cone or a different
argument.

The marked-parent base `Omega_u(A,B)` admits the same kind of exact
minor-coordinate elimination.  It is affine in every occupation coordinate
of `B`; sign-splitting each derivative and using the corresponding full-row
cap removes `B` completely.  The resulting expression has zero minor-order
slope, and all four possible mark-retention masks give the same polynomial in
each geometry.  Thus the deleted marked-parent case is reduced to two
q-free full-forest inequalities, with 68 adjacent and 81 nonadjacent
monomials.  An independent reconstruction matches every branch and performs
245,024 direct forest/minor lower-bound checks with no failure.  Both q-free
lowers are strictly positive through forest order ten, with exact minima 3378
and 3085.  These facts prove the reduction only; the two all-order signs are
still required, and the retained marked-parent target must keep its shared
response coupled to `Omega_u`.

That full coupled pair has now been reduced without separating the response.
For `eta=0,1` the literal targets are

```text
G1(A+x(A-u),B)-G1(A,B),
G1(A+x(A-u),B+x(B-u))-G1(A,B).
```

The sixteen geometry/state/mask branches collapse to eight q-free
full-forest classes: two deleted and six retained.  An independent literal
reconstruction matches both targets, all sixteen branches, and all eight
class hashes, and checks 490,048 direct forest/minor cells with zero
lower-bound failure.  Each class is strictly positive through forest order
ten, with exact collar minima between 1848 and 3378.  Thus the complete
marked-parent pair is now an exact list of eight all-order q-free inequalities;
their all-order nonnegativity remains to be proved.

There are only four genuine sign cores.  Within each geometry, both
one-retained-mark classes equal the retained mask-00 core plus the same
polynomial `D`, and the two-retained-marks class equals the core plus `2D`.
Every coefficient of `D` is strictly positive.  Therefore the occupation
coordinates' nonnegativity reduces the eight classes, at every order, to the
deleted and retained mask-00 cores for the adjacent and nonadjacent
geometries.  Independent coefficient-dictionary replay confirms both
identities.  The four remaining all-order signs are still open.

For the ordinary-parent square, eliminating all of `J,K,L` to obtain an
`H`-only lower is too coarse: its 56 expression classes have 142,913 negative
cells already on the exact order-eight-through-ten collar, with minimum
-155,576.  This rejects only that relaxation.  The ordinary-parent target
itself remains coupled and open, so a valid argument must preserve additional
`J,K,L` intersection information.

Keeping `K` while eliminating only `J<=H`, `L<=K`, and their order variables
gives 56 exact `H--K` lower classes.  These no longer suffer the finite
failure: over every order-eight forest and every induced `K` obtainable by an
ordinary parent (one deleted neighbor at most from each component), 745,564
applicable class evaluations are strictly positive, with exact minimum 2751.
This is finite evidence, not an all-order proof.

The `J` mark masks admit an exact all-order dominance reduction.  Relative to
the `j00` core, the `j10` and `j01` expressions add two coefficientwise
nonnegative polynomials, and `j11` adds their sum.  An independent
coefficient-dictionary audit passes all 32 geometry/state/`K`-mask families.
Consequently only 24 unique `H--K` core signs remain from the original 56;
their all-order nonnegativity is still required.

For the adjacent retained-isolate cone, adjoining the genuine coordinate
`CR7=i_7(R)` supplies `CR7<=CW7` and the forest extension inequality
`7 CR7<=(|R|-6)CR6`.  This imports the remaining 44 frozen `G2,G3` cells on
the common-compatible marked minor.  Together with the earlier 154 cells,
the active adjacent cone now uses every frozen `G2,...,G10` coefficient on
that minor.

Consequently, passing the collision replay and all thirteen queued
classes would close that special leaf slice only, not universal rank-six
`G1`.  The terminal `N6` base is already independently pinned; once a
universal `G1` theorem exists, rank six still needs a refreshed all-`N6`
integration/assembly, but no additional terminal positivity lemma is known to
be required.

At rank seven, the adjacent/no-parent `G3` branch with exactly five attachment
components all incident to the same mark (`5+0`) is now proved at every order,
including every isolated attachment-root pattern and arbitrary unrelated
isolates.  The exact universal marker is

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_UNIVERSAL_RANK7_G5_FINISH
```

This does not close the adjacent cell: unrelated-isolate padding for the
all-nonisolated split `4+1` and `3+2` cases, every split case with an isolated
attachment root (and its padding), and every configuration with at least six
attachment components remain separate.  Consequently no global rank-seven
`G3` symmetry cell is removed merely from the `5+0` closure.

For isolate-free `W`, the all-nonisolated `4+1` and `3+2` split branches are
also proved at every feasible order.  The `3+2` finite/tail assembly replays
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_32_ALL_NONISOLATED_UNIVERSAL_RANK7_G5_FINISH
```

These split theorems do not yet propagate across arbitrary unrelated isolates.

Together with the `5+0` producer, the three symmetry-reduced distributions
`5+0`, `4+1`, and `3+2` now give a gapless theorem for the whole exactly-five,
all-nonisolated, isolate-free branch.  A dependency-pinned assembly and an
independent distribution-partition audit replay under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_ALL_NONISOLATED_ISOLATE_FREE_ROOT
PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_ALL_NONISOLATED_ISOLATE_FREE_ROOT
```

This combined theorem retains both qualifiers: it does not cover unrelated
isolates or an isolated attachment root.

For the complementary split branch with isolated attachment roots, all twenty
symmetry-reduced patterns are now exact for isolate-free `H` and all total
orders `n>=12`.  The final `32_ix3_iy2` high chart has exact minimum 3072; the
complete low/high chart matrix and nested-sign audits replay under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_20PATTERN_N12_RANK7_G5_FINISH
```

The finite seam is independently assembled as well: the complete bundle census
covers `n=2,...,10`, while an `n=11` audit exhausts all twenty patterns and
every unrelated-isolate count (949 rooted/side instances, zero negatives,
minimum 500432).  It replays under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_FINITE_N2_11_ASSEMBLED_RANK7_G5_FINISH
```

Consequently finite `n<=11` is no longer open in this split isolated-root
branch.  The `n>=12` padding seam is now closed too: a shared exact one-isolate
increment for `4+1` and `3+2` has strict safe-lower minimum 332 and inducts
over arbitrary unrelated isolates.  The resulting all-order split theorem
replays under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_PADDING_INCREMENT_RANK7_G5_FINISH
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_UNIVERSAL_ASSEMBLED_RANK7_G5_FINISH
```

Thus the full exactly-five split branch is universal.  A final top-level
assembler joins it to the separately frozen same-mark `5+0` theorem and closes
all three distributions, all root-isolation patterns, arbitrary unrelated
isolates, and every feasible order under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_ALL_DISTRIBUTIONS_UNIVERSAL_ASSEMBLED_RANK7_G5_FINISH
```

The exact attachment-count residual is now only `>=6`; that residual must
still close before the adjacent/no-parent `G3` cell is complete.

The most direct add-one recurrence cannot supply that last step.  An exact
order-6-through-8 audit already has 351 negative same-mark increments among
433 rooted additions (first witness `-461`, global minimum `-6940`).  These are
negative differences, not negative `G3` values, so they rule out only monotone
propagation from five attachments; the remaining `>=6` branch needs a direct
count cone or a different coupled payment.

One direct count cone is now universal.  For edgeless `W`, every distribution
`a+b>=6` and arbitrary unrelated-isolate padding is nonnegative; seven exact
Bernstein controls cover 315 tail coefficients with minimum `6089/161280`.
The theorem replays under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGELESS_ALL_DISTRIBUTIONS_RANK7_G5_FINISH
```

Thus only `>=6` configurations whose `W` contains at least one edge remain in
this attachment-count branch.

The exactly-one-edge subbranch is universal as well.  Three exhaustive root
placements on `K2` each have exact all-distribution Bernstein minimum 1 for
every `a+b>=6` and arbitrary unrelated isolates, replaying under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_ONE_EDGE_ALL_DISTRIBUTIONS_RANK7_G5_FINISH
```

Hence the `>=6` residual now requires at least two edges in `W`.

Exactly two edges are universal too.  Exhausting the `2K2` and `P3` cores gives
eleven root-placement/distribution cases; every exact Bernstein certificate
has minimum coefficient 1 for arbitrary `a+b>=6` and unrelated isolates.  The
theorem replays under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_TWO_EDGES_ALL_DISTRIBUTIONS_RANK7_G5_FINISH
```

Hence the `>=6` residual now requires at least three edges in `W`.

A fail-closed top-level assembler joins the `e(W)=0,1,2` theorems with no
edge-count gap under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE2_ASSEMBLED_RANK7_G5_FINISH
```

The exact `>=6` boundary is therefore `e(W)>=3`.

Exactly three edges are universal too.  Exhausting `3K2`, `P3+K2`, `P4`, and
`K1,3` with every permissible root placement gives 35 exact certificates, all
with minimum coefficient 1 for arbitrary `a+b>=6` and unrelated isolates:

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_THREE_EDGES_ALL_DISTRIBUTIONS_RANK7_G5_FINISH
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE3_ASSEMBLED_RANK7_G5_FINISH
```

The second marker is the no-gap `e(W)=0,1,2,3` assembler.  The exact `>=6`
boundary is therefore `e(W)>=4`.

At four edges, four of the eight isolate-free forest core types are now closed:
`K1,4`, the `(3,2,1,1,1)` degree-sequence core, `P5`, and `K1,3 + K2`.
Their five, nine, seven, and fifteen permissible root-placement certificates,
respectively, all have exact minimum coefficient 1 across the full symbolic
attachment-distribution and unrelated-isolate parameters.  All use the
dependency-frozen source with SHA-256
`6B26B69B2ED5589B5845FAACA3E29AE3A89990B55640FC1F977DEEA274BB01FE`;
their independently replayed report SHA-256 values are
`9DE6D4B7FC09C76051F04E098917EE8EF9171796D5517B70F34B87AF98AE17D0`,
`A9E6B11447663EB37F632CED6285E82A0B0CB4E48335A791A730B065185BBF1E`,
`593B8743E9E95E2582DDB24EE9194203584A52A93CFD0E1103215E1E781D7D0A`,
and
`4774B201D02037EFDBB3A02D70CA663534A8C8217D87E7BE3D765C102ABD5C97`,
under the marker

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE_SHARD_RANK7_G5_FINISH
```

The four reports are also dependency-pinned by a cumulative 36-certificate
assembler with source/report SHA-256 values
`661000C738612057A3725A30A4CE9E4C15FBAE0649273BEE7984ACE01900198F`
and
`0C74A50C0FA8C7CDDC9F4996F7020333D0C4051EAADC0919BE62DD2A0EEC7012`:

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORES0_3_ASSEMBLED_RANK7_G5_FINISH
```

The core partition has a separate exhaustive audit: all 28,035 labelled
four-edge graphs on orders 5 through 8 yield 875 isolate-free forest witnesses
and exactly the same eight isomorphism classes.  The component identity
`c=m-4` rules out every other isolate-free order.  Its source/report SHA-256
values are
`7AEE0C42004F69D60695EE545B29567E7D8F307854F38DEF6660BDE2CE668C38`
and
`EC45F3B45C24E55A6E7F25048BAA322C11455186DFE4D769007B020BE2772887`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_EDGE_CORE_CLASSIFIER_INDEPENDENT_AUDIT_RANK7_G5_FINISH
```

Core 4 (`P4 + K2`) is now closed by all fifteen exact deleted-row pattern
classes, covering all 45 raw root placements.  Every pattern has minimum tail
coefficient 1, and a fail-closed assembler pins the fifteen dual-replayed
reports.  The pattern-producer SHA-256 is
`D816B88BF0B0BA782B43BD7FC5BA29ADCE25A3BE9851DD7FC2AD9A81BB29825A`;
the assembler source/report SHA-256 values are
`6BF4C87C8261C97DCDC135506DA45726D22DD4B934F71FFCDEF5B8B845859086`
and
`312B0D734E816B694E1B1420D0C548ED70A14110F8E25E3CE45BDE9F94AEB4E4`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE4_PATTERN_SHARDS_ASSEMBLED_RANK7_G5_FINISH
```

Core 5 (`P3 + P3`) is also closed.  Its fifteen pattern classes cover 49 raw
root placements, all with minimum coefficient 1, and its assembler
source/report SHA-256 values are
`EAF680A5F12D10F19A8A610E712D6063EAE3DEBF5CF83C8A2D4C5A86495A3021`
and
`F1144EAD88477BCC8D39E62C47EC0EE57B78646AFDD00C1DA3510A687AE1EB60`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE5_PATTERN_SHARDS_ASSEMBLED_RANK7_G5_FINISH
```

A first top-level assembler joins universal `e(W)<=3` to cores 0 through 5,
pins the independent eight-core classifier, and carries 66 covered certificate
classes.  Its source/report SHA-256 values are
`8218477CFD716497E4AC062FCDB4B0BB890BDE6E24E567EA471A8261BB853236`
and
`8B8E650D4B0965C67C9A93BFA70A0976C3340D78977FB0851DB2CA4C953BDE89`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE3_OR_E4_CORES0_5_ASSEMBLED_RANK7_G5_FINISH
```

Core 7 (four disjoint edges) is now closed too.  Its fifteen exact pattern
classes cover 625 raw root placements, all with minimum coefficient 1 and
byte-identical replay.  Its fail-closed assembler source/report SHA-256 values
are
`DC7FC1DCAFD9BDDF4897179F18B98D099CC958008EC07CCD423B3B17E66D6856`
and
`9182F2B7F441DD446D8ACB9B7C0DCB8294C3157FF33A91165C823DA966179CC7`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE7_PATTERN_SHARDS_ASSEMBLED_ROOT
```

The current top-level assembly covers universal `e(W)<=3` and cores
`0,1,2,3,4,5,7` at `e(W)=4`, for 81 exact certificate classes.  Its
source/report SHA-256 values are
`3607C94B23736F2B4D8F22FD171E710C31DD148DBAEFB76EE847308603D1871A`
and
`96877D177CA935E2E774F09CDF1AE445C3F324FC94EC1C84C864F85BBEF4E6B4`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE3_OR_E4_CORES0_5_7_ASSEMBLED_ROOT
```

Core 6 (`P3 + 2K2`) closes the final four-edge type.  Its thirty exact classes
cover 175 raw root placements, all with minimum coefficient 1 and
byte-identical replay.  The assembler source/report SHA-256 values are
`CA2ECD1F4064F35DB0C531ED9508F9D8C00E98DCB5ED3A60B61F736008551528`
and
`F2575343E0AB30DB0DB8FB9D16082A42DC60DE35B4654DD152D54A4671A7E897`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FOUR_EDGES_CORE6_PATTERN_SHARDS_ASSEMBLED_RANK7_G5_FINISH
```

The universal `e(W)<=4` assembly pins all eight exact four-edge cores and 111
deleted-row certificates.  Its source/report SHA-256 values are
`4A4F7F7294CF0D09D93E87A8938778AA24B10E22FA24D570BF68D0CE3694701B`
and
`11E996A376C22CEF60492DB5A90918DA3A3737349215C1203FF10480A912639A`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE4_UNIVERSAL_ASSEMBLED_RANK7_G5_FINISH
```

The exact edge-count residual is now only `e(W)>=5`.

For `e(W)=5`, the isolate-free core universe is now classified exactly into 16
isomorphism types on orders 6 through 10.  The component-edge partition counts
are `5:6`, `4+1:3`, `3+2:2`, `3+1+1:2`, `2+2+1:1`, `2+1+1+1:1`, and
`1+1+1+1+1:1`; Prüfer enumeration independently recovers the connected
tree-type counts `1,1,2,3,6`.  The classifier source/report SHA-256 values are
`53A5CDF697DEC7E9A3BF67FE9A08098928646976A8C63F792D61CC3962970B91`
and
`1B6F2ED09DE5A70ECF6225397F061E3F2036C94010D697A93B771A97CB0DAEA3`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_EDGE_CORE_CLASSIFIER_RANK7_G5_FINISH
```

This reduces the five-edge positivity task to 16 explicit cores but proves no
one of them positive by itself.

For those 16 cores, 5,064 raw compatible root assignments collapse to exactly
335 deleted-row certificate classes after deduplicating only equal `X/Y` root
counts and equal `X`-deleted and `Y`-deleted independent-set rows.  The exact
census source/report SHA-256 values are
`FEB2CDF22E52ADA7D7F69B958F23E0EC593D3C51561A21C3E9EF55EAEBEC9764`
and
`BEAE2FB394DD18C03F52A0E2583068157D62DCE2B6D47E0837C28040DF09AC69`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_EDGE_ROOTED_PATTERN_CENSUS_RANK7_G5_FINISH
```

This is a complete workload census, not a positivity certificate.

Five-edge core 0 (`K1,5`) is now closed.  Its five exact deleted-row pattern
classes cover all 13 raw root placements, every class has minimum coefficient
1, and two full runs are byte-identical.  The generic producer and core-0
report SHA-256 values are
`A9F56F21B23A8D669BEC4D05A2A82C3A149F4DE375AADB2724E8B4AA279C2133`
and
`60672DAF85EA37E05F806185868AB377AB5DEE7E13F31C73481F555DF5CFA474`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORE_SHARD_RANK7_G5_FINISH
```

Five-edge core 1 (degree sequence `(4,2,1,1,1,1)`) is also closed.  Its nine
exact classes cover all 13 raw root placements, have minimum coefficient 1,
and replay byte-identically.  Its report SHA-256 is
`F8539C679F4E3AF590C39283D8AFBBF34D4403BAAB02E5EEF99BB5FA7C73346C`
under the same producer and marker.

Cores 2 through 6 are also closed by `5,9,11,7,15` exact certificate classes,
all with minimum coefficient 1 and byte-identical replay.  A fail-closed
contiguous assembly pins cores 0 through 6, covering 133 raw root placements
and 61 exact certificate classes.  Its source/report SHA-256 values are
`B9326997C860F715452A66020DD5BB4078DC9EF28BF5606AFC455CDC54E19E21`
and
`6D45A69AE15FB7CAF4EC605325F24145E5E62DBBD2EA050B6AAB9B424F9DC39A`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORES0_6_ASSEMBLED_ROOT
```

Cores 7 through 10 are also closed by `27,21,25,25` exact classes, all with
minimum coefficient 1 and byte-identical replay.  A fail-closed contiguous
assembly now pins cores 0 through 10, covering 369 raw root placements and 159
certificate classes.  Its source/report SHA-256 values are
`826DB0627F8B35E6DCFF2D1E5408079834E301B92A9BDA06C0A8C85CAE59800C`
and
`908844A3722611CAAA89D6308D393706BE9BE61E757524964A8EEC9622D05D2F`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_CORES0_10_ASSEMBLED_ROOT
```

Cores 11 through 15 close the remaining five-edge G3 work by
`30,30,45,50,21` exact classes.  The universal assembly pins all 16 cores,
5,064 raw root assignments, and all 335 exact certificate classes.  Its
source/report SHA-256 values are
`5C541F57D54EC124D16C04FC320528860423F336787AEBC7943E54DA40BD3948`
and
`3EFEE4709F17FD0F0238968A78B80EE13E5911050CCEFA0A1901FC45E8E5A74D`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_FIVE_EDGES_UNIVERSAL_ASSEMBLED_ROOT
```

The independent all-shard audit source/report SHA-256 values are
`BF9AC40251D89135B5F9C5DEB1F9ACD3B7ED45A11F9B34C3A10C2301EA138FD6`
and
`6EC078CE3C48C0E35B6FD46B989F9683F22E9F103C1CCF13D62AB72F2EBA8A15`.

Joining this to the exact `e(W)<=4` union gives a universal `e(W)<=5`
assembly for the adjacent/no-parent `>=6`-attachment G3 branch.  Its
source/report SHA-256 values are
`ED6859DEFDE1426AE3F9D41A589EF0900A29580252D203F99B29639CC3224D35`
and
`E563BCE8565ED380250B1C1A4F0FE8CA63F2C5FD670E1503FFCCEEAAF4474484`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGES_LE5_UNIVERSAL_ASSEMBLED_ROOT
```

Its independent audit source/report SHA-256 values are
`7225BBD215AD681521099D4A66E7AFAB8F2F1EB3F0B7539B67EADC04616D1B68`
and
`856B62504E73BC5C7275100361848666DD768332DDCC04DB9888A0A0842226A2`.
The exact G3 edge-count residual of this branch is now only `e(W)>=6`.

That first residual layer is nevertheless classified completely.  An
isolate-free six-edge forest has order 7 through 12, and exact componentwise
Prüfer enumeration gives 34 isomorphism types.  Their component-edge
partition multiplicities are `6:11`, `5+1:6`, `4+2:3`, `4+1+1:3`,
`3+3:3`, `3+2+1:2`, `3+1+1+1:2`, and one each for `2+2+2`,
`2+2+1+1`, `2+1+1+1+1`, and `1+1+1+1+1+1`.  The classifier
source/report SHA-256 values are
`936DD8D10D1926E648EEEE9D736F9102EFA7F60B0F3D84DFDB04ACAC454018DE`
and
`21CF5ACEA04E0905230EA4B15A790E0B6775911EF7A038E68CF7893DABD23FD7`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_SIX_EDGE_CORE_CLASSIFIER_RANK7_G5_FINISH
```

The exhaustive compatible-root census then reduces 26,302 raw placements to
exactly 1,007 distinct deleted-row certificate classes.  Its source/report
SHA-256 values are
`9D96F2AF7016ED693F02F7917A7AEEEA403E2720D2AF8BCD0A88D53F347A2BC8`
and
`17A8FF817F1C8F612D66FD1C3962777EA0EAE604C91BED1A990A71FC7617108C`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_SIX_EDGE_ROOTED_PATTERN_CENSUS_RANK7_G5_FINISH
```

This is a complete finite workload census, not a positivity theorem.  None of
the 1,007 classes is promoted by the census itself, so the exact G3 residual
remains `e(W)>=6` pending the bounded shard certificates and independent
assembly.

Separately, rank-seven `G2` is universally closed for every exactly-five-edge
forest, every ordered distinct marked pair, and every compatible parent mode.
Across the 16 cores, 9,412 literal role cases reduce to 2,411 row signatures;
all exact finite values and shifted tails pass, with zero failures.  The
source/report SHA-256 values are
`5097C7C3B459C7AD49B0AF6BAB054DE3174B4C67C9A830AA7462DE1675C22CB0`
and
`A55078FA722F81458C3B735D0E22E0CBB65FE8B7535685A8E69471D173DE53E0`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G2_FIVE_EDGE_ALL_MARKED_ALL_PARENT_RANK7_G4_PIECEWISE
```

The exact G2 residual begins at `e(W)>=6`.  Its isolated-mark/all-parent
six-edge seam is already frozen over 34 cores and 416 literal cases, while the
full all-marked/all-parent six-edge audit remains in progress.

The most direct leaf-deletion induction is false.  Across an exact 55,644-case
audit of all one-through-five-edge cores, leaf edges, compatible roots,
attachment totals 6 through 9, and zero through two unrelated isolates,
`G3(with edge)-G3(edge deleted)` is always negative, with minimum `-47125116`.
No actual `G3` value is negative; its minimum is `98925`.  The source/report
SHA-256 values are
`2EFD393332BAD5F56234E9CCD4FB1E11D0484B69F2B1CE4FB6C015CE2EAD97CC`
and
`764CA84D41B84D546DF0D269700D55AB43C5CF932C4D665D51C8E3C5DAD7DF3A`.
This rules out only the simple monotonicity proof, not the target inequality.

In the actual connected rank-seven `G1` common0/sum0 no-parent high-degree
cell, the exact tail has been lowered to `m>=32`.  The order-32 boundary and
the prior `m>=33` tail assemble without an integer gap and have an independent
hash, stream, count, and order-partition audit:

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N32PLUS_RANK7_G4_PIECEWISE
PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N32PLUS_ROOT
```

The bottom finite interval `m=11,...,20` is now closed by an exact census of
1,214,223 eligible connected trees: zero negatives, minimum `G1=952616`, and
296 independent recurrence crosschecks.  It replays under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N11_20_CENSUS_RANK7_G4_PIECEWISE
```

Together with the `m>=32` theorem, the exact finite residual for this cell is
now `m=21..31`.  This is not a claim about its other parent or marked
geometries.

An independent `gentree`/signed-128-bit engine now closes `m=21,22` as well:
7,350,094 eligible trees, zero negatives, minimum `G1=2513302245`, exact
bridges to the frozen Python census, and two byte-identical full runs under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N21_22_GENTREE_CENSUS_RANK7_G4_PIECEWISE
```

The exact finite residual for this cell is therefore `m=23..31`.  This remains
qualified to the stated common0/sum0 no-parent connected high-degree geometry.

Order `m=23` is now closed by four disjoint canonical-generation shards over
all 14,828,074 free trees: 14,218,916 eligible, zero negatives, minimum
`G1=7464262405`, and two byte-identical full runs under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N23_GENTREE_SHARDS_RANK7_G4_PIECEWISE
```

The exact finite residual for this cell is therefore `m=24..31`, with the same
geometry qualifiers.

Order `m=24` is now closed by four disjoint canonical-generation shards over
all 39,299,897 free trees: 37,970,804 eligible, zero negatives, minimum
`G1=12333021972`, 9,268 reroot crosschecks, and two byte-identical corrected
full runs under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N24_GENTREE_SHARDS_RANK7_G4_PIECEWISE
```

The exact finite residual for this cell is therefore `m=25..31`, with the same
geometry qualifiers.

Order `m=25` is now closed by four exact canonical-generation streams over all
104,636,890 free trees: 101,703,325 eligible, zero negatives, minimum
`G1=19817975778`, and 24,828 reroot crosschecks.  The original evaluator and an
independently implemented binary-stream evaluator agree on the aggregate and
minimum certificates, and two authoritative v2 runs are byte-identical.  The
theorem source/report SHA-256 values are
`8F591FE6BABBBA2A458346C5BBF1C10E17CDCAFB08A7468E7A3A5FE90F93D5FD`
and
`8CABC6621CDC3A5BA8CB86318DB740997A186F403798140FF5A26B9B3A84BA92`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N25_GENTREE_SHARDS_V2_RANK7_G4_PIECEWISE
```

An independent Python reconstruction of the v2 binary record and recurrence
has source/report SHA-256 values
`3893CFED799DDEBD7C0279CF955EA41C6981A4E1072649F815489AFA2070EB71`
and
`6E4BC045AF5692AE201369FB92A40B9DEFBFF5A43841B562875449752FB277A2`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_GENTREE_STREAM_V2_BINARY_INDEPENDENT_AUDIT_RANK7_G4_PIECEWISE
```

The exact finite residual initially becomes `m=26..31`, with the same geometry
qualifiers.  Order 26 is now closed for every eligible tree containing a
degree-two vertex.  Suppression gives an eligible order-25 tree, and exact
normalized-shadow substitution over 1,002 profiles, 1,958 split-endpoint
cases, and 123,354 Bernstein controls bounds the subdivision increment below
by `-1748196305/42`.  Paying this from the frozen order-25 minimum gives the
strictly positive lower bound `830606786371/42`.  The theorem source/report
SHA-256 values are
`544E238B73845979E1303D98F2D96CD589CD11BFEC889F1D9413F32BDCCEEF65`
and
`415636952D93008B3B2DA15673A1BD20231F7D757B9D12A64518C553E4A373E2`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_DEGREE2_SUBDIVISION_RANK7_G4_PIECEWISE
```

The complementary degree-two-free order-26 lane is closed by deleting all
leaves and enumerating the resulting branching core.  Across 985 unlabeled
cores and 327,864 ordered leaf assignments (327,729 eligible), the exact
rooted DP has zero negatives, minimum `G1=31516391921`, and 320 independent
explicit crosschecks.  The source/report SHA-256 values are
`B303AB0DCEFB83D8EF74C8CADBE75801F12B936F37EEF0297E08E37DB24919D9`
and
`25870F1532D012C78340ED3602A809EAA130D5FBFD57EA49C50DCE22E16D942E`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_DEGREE2FREE_CORE_LEAF_CENSUS_RANK7_G4_PIECEWISE
```

The two lanes assemble gaplessly under source/report SHA-256 values
`047EC9DAEBA8C6F1CBE5072FC33AD5B8EEA92CBB24CDA2E567BAB3E773D1B5CB`
and
`6DA22678C1C15973F9E45EE33AD5A64DCBBA102422DD5F324A238F9BD7C40AA9`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_COMPLETE_RANK7_G4_PIECEWISE
```

The degree-two-free orders 27 through 31 are simultaneously closed by the same
branching-core/leaf parameterization.  Their exact eligible assignment counts
are `646210,1279420,2545377,5083376,10193853`, with zero negatives.  The batch
source/report SHA-256 values are
`0EC3C28AA33174F23611AA31E96F81D4CB7424BD97268D8FBBFDE806CF597926`
and
`E6986EDF9E64C9F6F9786FAEF4D287CA5268A296473E4CA4986886C16844F114`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N27_31_DEGREE2FREE_CORE_LEAF_BATCH_RANK7_G4_PIECEWISE
```

The complementary degree-two subdivision/payment batch stays positive through
order 31, where its exact lower bound is `29401386223/14`.  Its source/report
SHA-256 values are
`94AB169428838AB1E54A53202DE27881152AFB9D2538E70C3E5FE721FDF023C9`
and
`84F7B9D4F29004D29B3618F9FF0DCC11A1796F8D0EA1965C226647492F891775`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N27_31_DEGREE2_SUBDIVISION_BATCH_RANK7_G4_PIECEWISE
```

The gapless universal-in-order assembly covers `11..20`, `21..22`, `23`,
`24`, `25`, `26`, `27..31`, and `32+`, and pins the independent high-tail
audit.  Its source/report SHA-256 values are
`C6CFF34564F5007459046ACFA750321E4FAE856EF69A0828BAA3C9203B1D29E7`
and
`61D1ED66746A71E17B3DB99A37E88CB9A45DB56ADD403E75DADB7C77C980A2A6`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_N11PLUS_COMPLETE_RANK7_G4_PIECEWISE
```

Thus this exact connected high-degree common0/sum0 no-parent `G1` cell has no
remaining order for `m>=11`.

For connected trees, an exact line-graph-distance charging argument now gives
the stronger universal support inequality

```text
-E5 >= J4.
```

An independent audit over 2,283 trees has minimum slack zero and replays under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_J4_E5_DISTANCE_COUPLING_RANK7_G4_PIECEWISE
```

This improves the previous `-E5>=J4/2` face but does not by itself close the
rank-seven `G1` cone: exact relaxed negative corners remain at both `m=11` and
`m=31`.

Its exact subdivision transfer is also known.  For subdivision of `uv` in an
`m`-vertex tree, with endpoint degrees `a,b`, wedge count
`Omega=sum_x C(d(x),2)`, and local excess sums
`alpha=sum_{x in N(u)-v}(d(x)-1)` and `beta` at `v`, one has

```text
Delta J4 = m+1+ab-2a-2b,
Delta P5 = (a-1)(b-1)-(b-2)alpha-(a-2)beta,
Delta(P3+K2) = Omega+m+2ab-4a-4b+4.
```

The source/report SHA-256 values are
`B80888C18B74C4F94CAE1B543840AC5EDD8798BF0E5F9356DC40AD5A63610FB2`
and
`863AC3465251728F82DC1CBCFFE3DDE33486345DD3107C1533FAE23A6592D48F`,
under

```text
PASS_EXACT_ISO_N7_BUNDLE_G1_EDGE_SUBDIVISION_J4_L5_TRANSFER_RANK7_G4_PIECEWISE
```

The 146-vertex double-center tree with `a=b=10`, `Omega=594`, and
`alpha=beta=63` gives `Delta(L5-J4)=-270` at its central subdivision.  Hence
the support margin itself is not subdivision-monotone, and this exact transfer
does not yet prove monotonicity of the full `q/G1` increment.

The full `q` contraction is nevertheless exact.  With `H=I(T/uv)` and
`G=BC+AD-BD`, the latter a downward-closed union inside `AC`, one has

```text
I(T)=H+xG,
I(T')=(1+x)H+xG,
I(T')-I(T)=xI(T/uv),
Delta q=G2_7^(isolated,no-parent)(H)+F(H,G).
```

The source/report SHA-256 values are
`3337E701EAE2E534F78E013F93FE3AA2437978794A3849FA44E7D67C4A9C8DB9`
and
`84CFD187FD13E8445E40129C83B11A5FBC69E62B2EDBC2F9803E0E08F4381A90`,
under

```text
DERIVED_EXACT_ISO_N7_BUNDLE_G1_EDGE_SUBDIVISION_Q_INCREMENT_SHADOW_OBSTRUCTION_RANK7_G4_PIECEWISE
```

The natural normalized-shadow relaxation still admits exact value
`-274744349`, but this witness is infeasible: `H6=33649` forces at least
`14173` five-faces by Kruskal--Katona, contradicting its listed `H5=10626`.
It is only a relaxation obstruction, never a tree counterexample.

The exact split-edge identity

```text
G2 = C(m-2,2) - (m-3) - (a-2)(b-2)
```

does not by itself repair that cone.  Even after adding the pinned
degree/motif support constraints, 497 profiles and 1,763 Bernstein controls
remain negative.  The worst relaxed point, `-1983847014` at degree increments
`(7,7,6,1,1)`, is infeasible because its `H8=1045170` exceeds
`C(24,8)=735471`.  The source/report SHA-256 values are
`0023B1FDAE66FF2B446ABA956E4573B2E1DCAB1EC43436795DD697EA3CC6CA51`
and
`1F62A92CD0D19132942097FB020A04FEEBC210F7FB021ECC533CB0A6CEC7E65C`,
under

```text
DERIVED_EXACT_ISO_N7_BUNDLE_G1_EDGE_SUBDIVISION_G2_PROFILE_CONE_OBSTRUCTION_RANK7_G4_PIECEWISE
```

A universal coefficientwise subdivision-sign theorem remains open as a
structural lemma, but no order in this `G1` cell now depends on it.

The natural pendant-leaf shortcut has also been audited exactly and is not a
consequence of the completed rank-six `G2` theorem.  For `T=H+xK`, adjoining
a leaf at the root gives the exact decomposition

```text
q((1+x)H+xK)-q(H+xK)=G2_7^(isolated,no-parent)(H)+F(H,K).
```

The displayed `G2` is a rank-seven specialization.  Neither it nor `F` is
coefficientwise nonnegative (7 negative scalar coefficients among 14 terms,
and 18 among 33, respectively), and the naive rank-six substitution has a
nonzero 47-term residual.  Consequently this decomposition is only a
fail-closed reduction; a structural payment for the coupled `H,K` rows is
still required before it can remove any part of `m=11..31`.

The same fail-closed policy now freezes four other insufficient relaxations:
the dense `W5,...,W8` blocked-extension moment box, the `H1` isolate-padding
free moment box, the coarse `J4/E5` cone even after exact Bernstein
subdivision, and the present `J4/E5`-to-`E7/E8` incidence caps by themselves.
Their exact negative points or coefficients are relaxation witnesses, not
actual forest counterexamples.  They therefore remove no target order but
prevent these four routes from being retried without a genuinely new topology
constraint.  The obstruction catalog replays under

```text
PASS_EXACT_ISO_N7_BUNDLE_FAILED_MOMENT_SUPPORT_CONES_RANK7_G4_PIECEWISE
```

## Literature-status update

A fresh 2026-08-31 search of the official Erdős Problems record and current
2026 papers/preprints located no prior complete proof and no finite
nonunimodal tree or forest.  The checked sources continue to describe the
conjecture as open.  The exact source list, false-positive exclusions, and the
necessary absence-of-evidence caveat are recorded in
`LITERATURE_STATUS_REFRESH_2026-08-31.md` and integrity-checked under

```text
PASS_LITERATURE_STATUS_REFRESH_2026_08_31_INTEGRITY_AND_SCOPE_AUDIT
```

This literature conclusion is current search evidence, not a proof that no
unpublished or unindexed resolution exists, and it must be refreshed again
immediately before a public resolution claim.

## 1. Statement and notation

Let `F` be a finite forest and write

```text
I(F;x)=sum_(r=0)^alpha p_r x^r,
alpha=alpha(F),
L(alpha)=ceil((2alpha-1)/3)=floor((2alpha+1)/3).
```

We must prove that `(p_0,...,p_alpha)` is unimodal.

The known bipartite decreasing-tail theorem gives

```text
p_r>=p_(r+1)  for every r>=L(alpha).                (T)
```

For `r>=1` define

```text
WR_r:   p_(r-1)<=r p_r,

ISO_r:  r p_r^2+p_(r-1)^2
        -(r+1)p_(r-1)p_(r+1)>=0.                    (I)
```

The exact pointed-Hall argument proves `WR_r` for every forest and every
`1<=r<L(alpha)`.

## 2. Prefix lemma

**Lemma 1.**  If `(WR_r)` and `(ISO_r)` hold for every
`2<=r<L(alpha)`, then the independent-set sequence of `F` is unimodal.

**Proof.**  Suppose a descent occurs in the strict prefix:
`p_(r-1)>p_r`.  Put

```text
x=p_r/p_(r-1),       y=p_(r+1)/p_r.
```

The coefficients are positive on their support.  `WR_r` gives
`1/r<=x<1`, and `ISO_r` gives

```text
(r+1)y<=r x+1/x.
```

But

```text
r x+1/x-(r+1)=(x-1)(r-1/x)<=0
```

for `1/r<=x<1`.  Hence `y<=1`, so a descent in the strict prefix cannot be
followed by an ascent.  Iteration reaches the cutoff, after which `(T)`
keeps the sequence nonincreasing.  Therefore the sequence is unimodal. `□`

Thus it is enough to prove `(I)` at every strict-prefix rank.

## 3. Certified fixed ranks

Define the stronger reserve

```text
S_r=2r p_r^2-p_(r-1)p_r
    -2(r+1)p_(r-1)p_(r+1).
```

Exact algebra gives

```text
ISO_r=S_r/2+p_(r-1)^2+p_(r-1)p_r/2.                (2)
```

Hence `S_r>=0` implies `(ISO_r)`.  The completed fixed-rank packages cover
every strict-prefix target at ranks three through eight:

```text
rank  first relevant alpha       certified reserve
  3             6               S_3>=0
  4             7               S_4>=0
  5             9               S_5>=0
  6            10               S_6>=0
  7            12               S_7>=0
  8            13               S_8>=0
```

Ranks three through six are joined by the exact bridge assembler.  Rank
seven has a completed dependency assembler and an independent no-scope-gap
audit.  At rank eight, the matching-quotient boundary covers `alpha=13`,
and the completed forest theorem covers `alpha>=14`; its independent audit
rehashes all 21 immutable inputs and checks that the forest partition has no
gap or overlap.

Rank two follows from the leaf induction below because all three rank-two
four-minor modes and all terminal bases are already proved.  Therefore the
only unresolved target ranks are `r>=9`.

## 4. Two exact leaf identities

Let `ell` be a leaf of `F`, with support `v`, and put

```text
A=I(F-ell),       C=I(F-{ell,v}),       I(F)=A+xC.
```

Direct coefficient expansion gives

```text
ISO_r(F)=ISO_r(F-ell)
         +ISO_(r-1)(F-{ell,v})+D_r(F,ell).           (3)
```

The terminal rooted-star-plus-isolates cases satisfy `D_r>=0` at every rank.

Choose a second nonsibling leaf.  After deleting the two leaves, write the
remaining marked forest as `(B;u,v)` and set

```text
E=I(B),       U=I(B-u),
V=I(B-v),     W=I(B-{u,v}).
```

There is an explicit symmetric bivariate kernel `N(E,U,V,W;z,w)` such that
the difference of consecutive first-leaf remainders is its diagonal
coefficient `N_r(B;u,v)`.  The identity is exact over the integers and is
independently cross-checked against the closed coefficient formula in all
finite classification cells used below.

Consequently, `N_r>=0` for every marked forest implies `D_r>=0`; then (3)
and strong induction imply `(ISO_r)`.

There is also a proved cross-orientation stopping payment.  With

```text
P=U+xW,       C_k(B;u,v)=ISO_k(P)+D_k(V,W),
```

exact certificates give `C_k>=0` for every marked forest at `k=4,5,6`.
For two nonsibling leaves `a,b`, with supports `u,v`, this yields the exact
reassembly

```text
ISO_r(F)=ISO_r(F-a)+D_r(F-b,a)
         +N_r(B;u,v)+C_(r-1)(B;u,v),                (3a)
B=F-{a,b}.
```

At target ranks five through seven this closes the paired lower `ISO/D`
branch without separate sign claims for its two terms.  It does not close the
independent recurrence for `N_r`, whose rank-lowering branch still gives
`N_7 -> N_6 -> N_5 -> N_4`.  Therefore the cross-orientation theorem is a
strictly certified simplification, but it does not remove the uniform FML (or
equivalent payment) assumed below.

## 5. The remaining uniform lemma

Let `z` be an unmarked leaf of `(B;u,v)` and let `s` be its support.

**Four-Minor Leaf Lemma (FML).**  On the induction-closed domain

```text
2<=r<=alpha(B-{u,v})+2,                              (4)
```

the following inequalities hold.

Ordinary support (`s` is neither mark):

```text
N_r(B;u,v)-N_r(B-z;u,v)
 >=N_(r-1)(B-{z,s};u,v).                             (FML-o)
```

Isolated `z`:

```text
N_r(B;u,v)-N_r(B-z;u,v)
 >=N_(r-1)(B-z;u,v).                                 (FML-i)
```

Marked-support collision (`s` is a mark):

```text
N_r(B;u,v)>=N_r(B-z;u,v).                            (FML-c)
```

This boxed lemma is the unproved input in this draft.

The domain (4) cannot be replaced by the tempting local prefix condition.
A same-rank deletion can lower the four-minor independence number, and a
connected bundled-spider family forces arbitrarily long runs of such
deletions.  Thus either FML must be proved on (4), or an exact bundle payment
must replace the leaking termwise induction.

## 6. Conditional completion

**Lemma 2 (conditional).**  FML on (4) implies `N_r(B;u,v)>=0` for every
marked forest and every rank required by the ambient ISO induction.

**Proof.**  Induct on `|B|`, keeping the original ambient rank ceiling fixed.
If `B` has an eligible unmarked leaf, apply the appropriate one of
`(FML-o)`, `(FML-i)`, or `(FML-c)`.  Every right-hand marked forest has fewer
vertices, and every rank-lowered term remains in the fixed-ambient envelope.
Repeated deletion ends at the already certified path, disconnected-star, or
marked-collision terminal bases.  Every added term is nonnegative. `□`

**Lemma 3 (conditional).**  FML on (4) implies `D_r(F,ell)>=0` for every
first-leaf cell required by the ambient ISO induction.

**Proof.**  Choose the second leaf and telescope the exact second-leaf
difference.  Lemma 2 pays every `N_r` term.  The terminal first-leaf base is
nonnegative. `□`

**Theorem (conditional resolution of Erdős Problem 993).**  If FML holds on
(4), then every forest has a unimodal independent-set sequence.

**Proof.**  Lemma 3 and the first-leaf identity (3), by strong induction on
the number of vertices and rank, prove `(ISO_r)` throughout the strict
prefix.  (The already certified ranks two through eight provide the low-rank
boundary and may also be used directly.)  The pointed-Hall theorem supplies
`WR_r`.  Lemma 1 and the decreasing-tail theorem `(T)` finish the proof. `□`

## 7. Current exact boundary around FML

The following parts of FML or its needed auxiliary consequences are already
theorems:

- all three FML modes at ranks two and three;
- all three modes at `r=4, alpha(W)=2`;
- direct `N_4>=0` for every `2<=alpha(W)<=5`, so the rank-four auxiliary
  route now needs FML only for `alpha(W)>=6`;
- all three modes at rank five for `alpha(W)=3,4,5`, so the rank-five route
  also begins at `alpha(W)>=6`;
- no negative FML gap in the complete all-rank census through forest order
  thirteen (`10,045,774` exact cells), which is evidence rather than a proof;
- exact upper-triangular common-component and whole-bundle identities that
  isolate the remaining coupled sign;
- the cross-orientation stopping payment `C_k>=0` at `k=4,5,6`; this removes
  the paired lower `ISO/D` branch at target ranks five through seven, while an
  exact dependency audit confirms that the separate `N` chain still reaches
  rank four.

The rank-four whole-bundle identity has now been expanded exactly as

```text
Gamma_M=sum_(j=1)^6 g_j binom(M,j).
```

The top coefficients `g_4,g_5,g_6` are universally nonnegative on every
forest bundle cell (`g_4>=33n+12`, `g_5=50`, `g_6=0`), and `g_3>=0` is also
proved universally with an independent exact audit.  The remaining two
coefficients are now proved for every canonical deepest-ordinary
singleton-parent placement.  When the unique non-bundle parent `p` is
distinct from both marks `u,v`, exact theorems and independent audits give
`g_2,g_1>=0`; the `g_1` proof uses a universal high-motif payment, a
parent-rooted degree-excess cone, 17 exact degree-three simplex Bernstein
branches for `n>=12`, and a complete 526,680-cell census for `3<=n<=11`.
When `p=u` or `p=v`, an independent endpoint audit reconstructs both row
orientations, includes the algebraically admissible order-two core, and proves
both coefficients using five exact simplex branches per coefficient plus a
complete 17,720-cell endpoint census for `2<=n<=9`.

For the canonical no-parent root-star classification, `k=1` has the same row
as the endpoint-parent theorem and is therefore covered.  The `k=2` mode is
independently proved using the isolated-mark row reduction, exact univariate
Bernstein certificates, and a direct replay of all 80 unlabeled residual
forests through order seven.  The `k=0` mode is now independently audited as
well: its `D=C` reduction has five exact simplex branches per coefficient,
100 `g_1` and 50 `g_2` Bernstein coefficients, and a complete 147-cell census
for orders two through five.  Thus all canonical no-parent modes `k=0,1,2`
are proved.  Noncanonical supports remain open, so neither rank-four FML nor
the whole Bundle Payment Lemma is proved.  The independent
configuration-provenance audit verifies that the two `i_5` formulas used in
the distinct-parent proof agree under

```text
Q35=S(e-2)-2R3-H,
```

with `S,R3,H,Q35` respectively denoting wedges, connected three-edge
subtrees, three-edge stars, and three-edge subsets spanning five vertices.

Independently, the connected double-broom terminal calculation is now exact
on every mixed Newton diagonal `i+j<=11`; the first unclassified diagonal is
`i+j=12`.  The corrected generating denominator is exact.  Every nontrivial
hard-state bipartition of its order-six recurrence numerator fails, and both
a constant scalar transfer and an index-dependent but rank-independent
scalar `lambda_j` are exactly obstructed.  These are proof-route obstructions,
not negative double-broom gaps.  A surviving uniform proof must be
rank-sensitive/operator-valued, use a non-hard cone, or use another diagonal
argument.

The finite collar work is therefore no longer the conceptual obstacle.  The
single mathematical task is to prove the coupled full gap uniformly once
`alpha(W)` is unbounded, or to prove the equivalent whole-bundle payment.

## 8. Replay anchors

```text
assemble_pointed_hall_full_payment_forest_wr_root.py
assemble_fixed_rank_three_halves_to_iso_bridge_r3_r6_root.py
assemble_rank7_integration_readonly.py
audit_rank7_final_integration.py
audit_rank8_forest_q8_pgc_complete_root.py
prove_iso_n4_low_alpha_root.py
prove_iso_compact_ordinary_r5_alpha5_root.py
prove_iso_isolate_collision_r5_alpha5_root.py
prove_iso_cross_orientation_r4_r6_agent.py
audit_iso_cross_orientation_dependency_consequence_agent.py
derive_iso_n4_bundle_polynomial_root.py
derive_iso_n4_bundle_g3_invariants_root.py
audit_iso_n4_bundle_g3_independent_bundle_g3.py
prove_iso_n4_bundle_g2_deepest_ordinary_root.py
audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent.py
prove_iso_n4_bundle_g1_deepest_ordinary_root.py
audit_iso_n4_bundle_g1_parent_cone_complete_g1_bernstein.py
audit_iso_n4_bundle_g1_i5_root_configuration_equivalence_agent.py
prove_iso_n4_bundle_g1_endpoint_parent_agent.py
prove_iso_n4_bundle_g2_endpoint_parent_agent.py
audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein.py
audit_iso_n4_bundle_g12_no_parent_k1_endpoint_import_agent.py
prove_iso_n4_bundle_g12_no_parent_k2_root.py
audit_iso_n4_bundle_g12_no_parent_k2_independent_g1_bernstein.py
prove_iso_n4_bundle_g12_no_parent_k0_root.py
audit_iso_n4_bundle_g12_no_parent_k0_independent_agent.py
assemble_iso_n4_bundle_g12_no_parent_root_star_all_modes_agent.py
verify_double_broom_h11_freeze_double_broom_tail_agent.py
verify_double_broom_even_odd_recurrence_cone_obstruction_double_broom_tail_agent.py
probe_iso_four_minor_third_leaf_root.py --max-n 13
```

The newest independently checked source/report pairs are frozen at

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

No replay marker in this document is promoted beyond its stated scope.
