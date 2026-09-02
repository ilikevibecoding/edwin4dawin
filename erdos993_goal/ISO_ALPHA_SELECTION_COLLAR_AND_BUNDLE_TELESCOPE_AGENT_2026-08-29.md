# Alpha-preserving selection, collars, and bundle telescope

Date: 2026-08-29

Status: **exact structural obstruction and exact telescope identity; the
bundle-payment sign remains open.**  Nothing in this note proves FML or the
Erdős conjecture.

## 1. Isolate stripping does not rescue a bounded collar

The isolate-padding argument in the earlier cutoff audit is not by itself
decisive if a final proof first removes every global factor `(1+x)`: adjoining
an isolated vertex preserves unimodality directly.  Thus a proof is allowed
to restrict its top-level ISO work to isolate-free forests or connected
trees.

That refinement does **not** make any fixed local-cutoff collar hereditary.
There is an isolate-free connected family with arbitrarily many forced
same-rank alpha drops.

## 2. The bundled-spider obstruction family

Let `T_(m,M)` have a center `c`, supports `s_1,...,s_m`, and `M` pendant
leaves adjacent to each support:

```text
c--s_i--{M pendant leaves},       1<=i<=m.
```

More generally, suppose support `s_i` currently has `t_i>=1` leaves.  An
independent set excluding `c` has size at most

```text
sum_i max(t_i,1)=sum_i t_i.
```

The set containing `c` and every pendant leaf has size

```text
1+sum_i t_i.
```

It is therefore the unique maximum independent set.  Every leaf is
essential, and deleting any leaf lowers alpha by one.  As long as all
bundles remain nonempty, the induced subgraph on nonleaf vertices is
`K_(1,m)`.  For `m>=3` it is not a path, so these states are outside even the
broad class containing paths, stars, and standard brooms/double brooms.

Starting with equal bundle size `M`, every possible leaf-selection strategy
must incur `M` consecutive alpha drops before one bundle becomes empty.
The number of unavoidable drops is unbounded.

An exhaustive nonisomorphic-tree check gives a sharp small obstruction to
the selection claim: no tree of order at most six has all leaves essential
while its one-round pruned core is not a path.  At order seven there is
exactly one, the spider with three arms of length two, graph6 `FqD?G` and
degree sequence

```text
1,1,1,2,2,2,3.
```

## 3. The obstruction occurs directly inside ordinary FML

Take `T_(3,M)` and mark one pendant leaf in each of the first two bundles.
Put

```text
W=B-{u,v}.
```

Then `B` and `W` are connected and isolate-free, with effective bundle
sizes

```text
M-1, M-1, M,
alpha(W)=3M-1.
```

Every eligible unmarked leaf has unmarked support, so every possible FML
step is ordinary.  Every such leaf is essential in `W`.  Before an effective
bundle empties, the same-rank child therefore lowers `alpha(W)` at every
step, while remaining connected and outside the terminal superset above.

This refutes an alpha-preserving third-leaf selection lemma even after all
ambient isolates are removed.

### The leak persists when the final proof bypasses rank four

There is already an immediate strict-cutoff leak at rank five.  Use bundle
sizes `(3,3,2)` before deleting the two marked leaves, marking one leaf in
each of the first two bundles.  Then `W` has effective bundle sizes
`(2,2,2)` and

```text
alpha(W)=7,          ambient outer alpha=9,
r=5<L(9)=6.
```

Deleting any eligible leaf lowers `alpha(W)` to six, so the same-rank child
has local cutoff

```text
L(6+2)=L(8)=5,
```

and `5<L(8)` is false.  The exact nonzero recurrence cell is

```text
83118 = 34200 + 11233 + 37685.
```

Thus a direct all-forest proof of `ISO_4`, while valuable, does not repair
the recomputed-local-cutoff strategy at the first remaining rank.

## 4. Exact one- and two-rank collar failures

Give a local theorem a collar of `c` ranks by allowing

```text
r < L(alpha(W)+2)+c.                                 (1)
```

The target rank of the initial marked `T_(3,M)` is

```text
R=L((3M-1)+2)-1=2M.
```

Two replayable examples are:

### One-rank collar

For `M=4`, the ambient outer alpha is `13` and `R=8`.  After two forced
ordinary deletions,

```text
alpha(W)=9,       L(alpha(W)+2)=L(11)=7.
```

Thus `8<L+1` is false.  The same-rank term is not a formal zero:

```text
N_8=420538.
```

The two exact FML decompositions are

```text
7904544 = 1903287 + 2100885 + 3900372,
1903287 =  420538 +  545110 +  937639.
```

### Two-rank collar

For `M=6`, the ambient outer alpha is `19` and `R=12`.  After four forced
ordinary deletions,

```text
alpha(W)=13,      L(alpha(W)+2)=L(15)=10.
```

Thus `12<L+2` is false, and the required same-rank term is

```text
N_12=7221390.
```

The last exact step is

```text
59099153 = 7221390 + 25218362 + 26659401.
```

For an arbitrary fixed collar `c`, take

```text
M=3c+4,          d=M-2.
```

After `d` forced deletions every effective bundle is still nonempty, while

```text
ambient alpha       =9c+13,
target R            =6c+8,
descendant alpha(W)+2=6c+11,
descendant L        =4c+7,
R-descendant L      =2c+1 >= c.
```

Hence **no bounded collar is hereditary**, even for connected isolate-free
trees and ordinary FML only.

## 5. Exact all-at-once leaf-bundle transform

The preceding obstruction suggests deleting a complete sibling bundle in
one step rather than demanding positivity of every same-rank child.

Let `(H;u,v)` be a marked forest, let `s` be unmarked, let `C=H-s`, and let
`B_M` be obtained from `H` by attaching `M` new leaves to `s`.  Write the
four-minor tuple as `F(G)=(E,U,V,W)`.  Componentwise leaf deletion gives

```text
F(B_M)=F(H)+h_M F(C),
h_M(x)=(1+x)^M-1.                                   (2)
```

For the bivariate nested kernel `N` and derivative-free form `R`, common
multiplication by an arbitrary polynomial `h` obeys the exact identity

```text
N(hF)=h(z)h(w)N(F)-(z-w)^2 H_h(z,w)R(F)/2,           (3)
R(hF)=h(z)h(w)R(F),
H_h=[h'(z)h(w)-h(z)h'(w)]/(w-z).
```

Equation (3) was verified directly from the symbolic definition of `N`, not
inferred from finite coefficient data.

Set

```text
A=(1+z)(1+w).
```

For `t` isolated vertices, (3) becomes

```text
N((1+x)^tF)=A^t N(F)-t(z-w)^2 A^(t-1)R(F)/2.         (4)
```

After deleting the `j`-th bundle leaf and its support, the other `j-1`
bundle leaves are isolates.  Therefore the exact aggregate bundle payment is

```text
Gamma_M
 =N(B_M)-N(H)-zw sum_(t=0)^(M-1) N(C union tK_1).    (5)
```

The diagonal coefficient of (5) is precisely

```text
N_r(B_M)-N_r(H)-sum_(t=0)^(M-1)N_(r-1)(C union tK_1).
```

Polarizing the quadratic form `N` and using (3)--(4) gives

```text
Gamma_M
 =2 B_N(H,h_M C)+P_M N(C)-(z-w)^2 J_M R(C)/2,        (6)
```

where

```text
P_M=h_M(z)h_M(w)-zw sum_(t=0)^(M-1)A^t,
J_M=H_(h_M)-zw sum_(t=1)^(M-1)tA^(t-1).              (7)
```

## 6. Both new scalar kernels are coefficientwise nonnegative

On either coordinate axis the coefficient of `P_M` is zero.  For `i,j>=1`,
with out-of-range binomial coefficients interpreted as zero,

```text
[z^i w^j]P_M
 =C(M,i)C(M,j)-sum_(t=0)^(M-1)C(t,i-1)C(t,j-1)
 >=0.                                                (8)
```

Indeed `C(t,j-1)<=C(M,j)` and the hockey-stick identity gives
`sum_t C(t,i-1)=C(M,i)`.

Similarly,

```text
[z^i w^j]J_M
 =M[C(M-1,i)C(M-1,j)+C(M-1,i+j+1)]
  -sum_(t=1)^(M-1)tC(t-1,i-1)C(t-1,j-1)
 >=0.                                                (9)
```

For `i,j>=1`, the subtracted sum is at most

```text
C(M-1,j) sum_t tC(t-1,i-1)
 =C(M-1,j) iC(M,i+1)
 <=M C(M-1,i)C(M-1,j).
```

This is already the first positive term in (9); the Vandermonde term is
unused.  If either index is zero, the subtracted sum vanishes.

Thus the binomial telescope introduces no negative scalar kernel.  The open
sign in (6) is concentrated in the coupled polarization and `R` terms, not
in the bundle summation itself.

## 7. The full-gap telescope is exact but circular

Let

```text
G_j=N(B_j)-N(B_(j-1))-zwN(C union (j-1)K_1)
```

be the complete ordinary FML gap for the `j`-th leaf.  Direct cancellation
gives

```text
Gamma_M=sum_(j=1)^M G_j.                             (10)
```

This is the desired positive-weight representation only if the individual
ordinary FML gaps are already known nonnegative, so by itself it is exactly
circular.

Moreover, endpoint cancellation makes the unit weights unique.  In a linear
combination `sum_j a_jG_j`, the coefficient of `N(B_M)` forces `a_M=1`, and
the coefficient of each intermediate `N(B_j)` forces
`a_j=a_(j+1)`.  Hence every `a_j=1`; the lower terms give the same condition.

Even allowing an additional nonnegative linear combination of the state
values `N(B_j)` and `N(C union jK_1)` does not help in a universal identity.
Indeed, the residual coefficients force

```text
a_M<=1,       a_1>=1,       a_(j+1)>=a_j,       a_j>=1,
```

so again all weights are one and every residual coefficient is zero.  A
binomial or hockey-stick reweighting must therefore introduce a signed
intermediate state (or a genuinely new inequality); it cannot turn (10)
into a noncircular positive telescope of complete gaps and terminal `N`
values alone.

## 8. Exact weaker inequality that would close the bundle

At diagonal rank `r`, define

```text
b=2[z^r w^r]B_N(H,h_M C),
p=[z^r w^r]P_MN(C),
c=[z^(r-1)w^(r-1)]J_MR(C)-[z^(r-2)w^r]J_MR(C).
```

Then (6) is exactly

```text
Gamma_(M,r)=b+p+c.                                   (11)
```

Consequently the necessary-and-sufficient quantitative replacement for
separate positivity is

```text
b >= -(p+c).                                         (12)
```

In words, the polar debt may be negative, but it must be bounded by the
weighted `N` reserve plus the weighted `R`-Schur curvature.  Requiring
`b>=0` is false even on the connected obstruction family.  For `M=6,r=12`
the exact three pieces are

```text
b =          -8502232,
p =        7183560875,
c =        1150115288,
Gamma =    8325173931.
```

Thus (12), rather than positivity of either signed source separately, is the
sharp bundle-payment target exposed by this decomposition.

## 9. Exact finite component census

For every nonisomorphic base tree of orders `3..7`, every marked pair, every
other support, every bundle size `1..4`, and every diagonal rank, an exact
component replay checked `53940` cells.  The results were:

```text
negative polar terms:          954,
negative P_M N(C) terms:         0,
negative R-curvature terms:      0,
negative complete payments:      0.
```

The largest observed polar-debt/reserve ratio was `317/1725`, on graph6
`DqO` with `M=4,r=4`.  This is finite evidence only.  In particular, the
weighted `R` curvature is not globally nonnegative: a larger exact random
witness has curvature `-6` above its supported prefix.  The general theorem
must retain the coupled inequality (12) and its cutoff-aware scope.

## 10. Exact finite sign audit of the aggregate

The replay checked:

- every rank for the marked bundled-spider family for `1<=M<=40`:
  `2700` aggregate coefficients, zero negatives, minimum positive value `9`;
- `1431` bundle instances over every nonisomorphic base tree of orders
  `3..6`, every pair of marks, every other support, and `1<=M<=3`:
  `14580` rank coefficients, zero negatives, minimum positive value `2`.

At the obstruction family's target ranks, selected aggregate payments are

```text
M=4,  r=8:    4965814,
M=6,  r=12:   8325173931,
M=20, r=40:   675194347773435511855259256437760,
M=40, r=80:   562541074169185354682878030993021030184401182643164799513706474290.
```

These are finite exact results.  They support, but do not prove, the
following possible replacement for stepwise FML:

> **Bundle Payment Lemma (open).** For every marked forest `(H;u,v)`, every
> unmarked support `s`, every `M>=1`, and every rank, the diagonal coefficient
> of `Gamma_M` in (5) is nonnegative.

If proved, this lemma deletes the entire obstruction bundle in one step and
lands on the broad broom/path terminal side without accumulating a cutoff
deficit.  The remaining proof obligation is the sign of the coupled right
side of (6); coefficientwise positivity of `P_M,J_M` alone does not establish
it.

## 11. Direct low-rank ISO versus the remaining auxiliary cutoff target

The independent rank-four top-collar classifications prove every FML mode
when `r=4=alpha(W)+2`.  In a fixed-rank recurrence this is a valid stopping
boundary at `alpha(W)=2`; rank-four interior states have `alpha(W)>=3`.

Separate all-forest three-halves reserves prove every required target
`ISO_4`, `ISO_5`, and `ISO_6` directly.  Thus the unresolved **target ISO
ranks** begin at seven.  This does not, however, remove the internal
low-rank auxiliaries from the current recurrence: proving `Q_7` via
`D_7,N_7` descends through `D_6,D_5,D_4,N_6,N_5,N_4`, and rank-five FML
itself has an `N_4` lower child.

Consequently the unresolved **FML auxiliary domain** still begins at rank
four unless a new cross-rank coupling is proved.  The explicit rank-five
cutoff leak above therefore remains relevant, and the unbounded-collar
family continues unchanged for higher ranks.  The exact dependency audit is
frozen in `ISO_DIRECT_Q45_BYPASS_DEPENDENCY_AUDIT_AGENT_2026-08-29.md`.

## 12. Replay

Run

```text
python audit_iso_alpha_preserving_collar_family_agent.py
python derive_iso_leaf_bundle_telescope_agent.py
```

The success markers are

```text
PASS_EXACT_CONNECTED_ALPHA_SELECTION_AND_COLLAR_OBSTRUCTION
PASS_EXACT_ISO_LEAF_BUNDLE_TELESCOPE_IDENTITY_AND_FINITE_AUDIT
```
