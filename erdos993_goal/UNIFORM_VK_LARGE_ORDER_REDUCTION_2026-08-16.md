# Uniform large-order theorem and finite-band reduction for `V_k`

Date: 2026-08-16

Status: **proved all-rank large-order theorem and exact finite-band
reduction**.  This note does not prove `V_k>=0` throughout the remaining
finite band, does not prove the separate `Q_k` reserve, and does not resolve
Erdos Problem 993.

## 1. Statement

Let `F` be an `n`-vertex forest and

```text
I(F;x)=sum_j b_j x^j.
```

For `k>=2`, put

```text
V_k(F)=(k+2)b_(k-2)b_(k-1)
       +k(2k+1)b_(k-2)b_k
       -2(k-1)^2 b_(k-1)^2,

rho_k=((5k+1)+sqrt(25k^2-38k-23))/6,

L_(n,k)=n-3k+6+2(k-2)/n.
```

Then

```text
alpha(F)>=k and L_(n,k)>=rho_k  ==>  V_k(F)>=0.             (1)
```

For the proposed stronger statement with `alpha(F)>=2k-2`, define the exact
integer cutoff

```text
N_k=min { n>=2k-2 : L_(n,k)>=rho_k }.                       (2)
```

The function `L_(n,k)` is strictly increasing over the eligible orders, so
every counterexample to

```text
alpha(F)>=2k-2  ==>  V_k(F)>=0                              (3)
```

must lie in the finite order band

```text
2k-2 <= alpha(F) <= n <= N_k-1.                             (4)
```

A slightly weaker closed-form cutoff, requiring no integer search, is

```text
n >= 3k-6+ceil(rho_k).                                      (5)
```

Thus (3) has been reduced to a finite forest problem separately at every
rank.  This is not yet a uniform disposal of all those rank-dependent finite
bands.

The first exact cutoffs are:

| `k` | `N_k` | possible counterexample orders under `alpha>=2k-2` |
|---:|---:|---:|
| 2 | 2 | empty |
| 3 | 7 | 4--6 |
| 4 | 12 | 6--11 |
| 5 | 17 | 8--16 |
| 6 | 22 | 10--21 |
| 7 | 26 | 12--25 |
| 8 | 31 | 14--30 |
| 9 | 36 | 16--35 |
| 10 | 40 | 18--39 |
| 11 | 45 | 20--44 |
| 12 | 50 | 22--49 |
| 13 | 54 | 24--53 |
| 14 | 59 | 26--58 |
| 15 | 64 | 28--63 |
| 16 | 68 | 30--67 |
| 17 | 73 | 32--72 |
| 18 | 78 | 34--77 |
| 19 | 82 | 36--81 |
| 20 | 87 | 38--86 |

## 2. Independent verification of the general `Q_k+V_k` decomposition

For a pendant step

```text
P=(1+x)B+xC
```

and

```text
H_k(r)=k^2(r_k^2-r_(k-1)r_(k+1))/r_(k-1)
       +k(r_k-r_(k+1)),

Q_k(P)=2k p_k^2-p_(k-1)p_k-2(k+1)p_(k-1)p_(k+1),
```

the new replay independently expands and verifies

```text
H_k(P)-H_(k-1)(B)
 = k Q_k(P)/(2p_(k-1))
   +3k c_(k-1)/2
   +V_k(B)/(2b_(k-2)).                                     (6)
```

Writing the consecutive extension means as

```text
u=mu_(k-2)=(k-1)b_(k-1)/b_(k-2),
v=mu_(k-1)=k b_k/b_(k-1),
```

also gives exactly

```text
V_k/(b_(k-2)b_(k-1))
 =(k+2)+(2k+1)v-2(k-1)u.                                   (7)
```

The independently replayed two-extension lower bound is

```text
v>=u-3+2/u                                                  (u>=2).
```

Substitution makes the sign lower bound equal to

```text
[3u^2-(5k+1)u+4k+2]/u.                                     (8)
```

The larger root of the numerator is `rho_k`.  The rational endpoint
`u=(5k-1)/3` lies to the right of the quadratic vertex and has exact
numerator `2(k+4)/3>0`, independently confirming the improved threshold in
`GENERAL_PGC_QV_DECOMPOSITION_2026-08-16.md`.

## 3. Exact residual-moment form

Choose an independent `(k-2)`-set `S` uniformly.  Let

```text
X(S)=|V(F-N[S])|,
C(S)=number of components of F-N[S],
u=E[X].
```

The residual graph is a forest.  If it has `X` vertices and `C` components,
then it has `X-C` edges, so its number of ordered independent vertex pairs is

```text
X(X-1)-2(X-C)=X^2-3X+2C.
```

Double counting extensions of `S` by two ordered vertices gives

```text
uv=E[X^2-3X+2C].                                            (9)
```

Consequently (7) is exactly

```text
V_k/(b_(k-2)b_(k-1))
 =3u-(5k+1)+(2k+1)(Var(X)+2E[C])/u.                         (10)
```

This is also a sharp description of what remains inside the finite band.  A
negative row must satisfy

```text
(2k+1)(Var(X)+2E[C]) < u(5k+1-3u).                          (11)
```

For completeness, (8) follows directly from (10).  Since `C>=1` whenever
`X>0`, one has

```text
Var(X)+2E[C]>=Var(X)+2 Pr(X>0)>=2                           (u>=2).
```

If `Pr(X=0)=0`, this is immediate.  Otherwise, writing
`p=Pr(X=0)`, conditional Jensen gives

```text
Var(X)>=p u^2/(1-p)>=4p/(1-p)>=2p,
```

which again yields the displayed bound.

## 4. A forest selected-degree theorem

The new all-order ingredient is the following coefficientwise statement.

### Lemma

For every forest `F`, every `s>=0`, and a uniform independent `s`-set `S`,

```text
E[sum_(v in S) d_F(v)] <= 2s.                               (12)
```

More precisely, roots may be selected so that the right side is at most

```text
2s-2s/n.                                                    (13)
```

### Proof by an explicit incidence injection

Fix `s`.  In each component choose a root and orient every edge away from
the root.  Consider all pairs consisting of an independent `s`-set and an
incident oriented edge.

An **upward incidence** is `c->p`, where the selected vertex `c` is a child
and `p` is its parent.  A **downward incidence** is `p->c`, where the selected
vertex `p` is the parent.  Independence makes the other endpoint unselected.

Map every downward source `(S,p->c)` to an upward target as follows.

1. If `c` has no selected child, replace `p` by `c`:

   ```text
   S'=(S-{p}) union {c}.
   ```

   This is independent, and the target is `(S',c->p)`.

2. If `c` has selected children, choose the least one `d` in a fixed vertex
   ordering and map to `(S,d->c)` without changing `S`.

The map is injective.  Within the first case the target uniquely recovers
the source by swapping `c` back to `p`.  Within the second case the target
uniquely determines the only possible source `(S,parent(c)->c)` and the
deterministic least selected child.  The two cases cannot collide: a target
charged in the second case still has `parent(c)` selected, whereas the
putative swapped preimage for the same target would contain both `c` and
`parent(c)` and would not be independent.

Hence the total number of downward incidences is at most the total number of
upward incidences.  Every selected nonroot vertex contributes exactly one
upward incidence, so there are at most `s b_s` upward incidences.  Summing
over all independent `s`-sets gives

```text
sum_S sum_(v in S)d(v)
 = (# upward)+(# downward)
 <=2(# upward)
 <=2s b_s,
```

proving (12).

For (13), write `a_v` for the number of independent `s`-sets containing
`v`, and in each component choose as root a vertex maximizing `a_v`.  If the
component orders are `n_i`, then

```text
sum_roots a_r
 >=sum_i [sum_(v in component i)a_v]/n_i
 >=[sum_v a_v]/n
 =s b_s/n.
```

There are exactly `s b_s-sum_roots a_r` upward incidences.  Repeating the
injection proves (13).

## 5. Extension-mean consequence and completion of (1)

For an independent `s`-set `S`, the number of one-vertex extensions is

```text
R(S)=n-s-|N(S)|.
```

Every vertex of `N(S)` accounts for at least one incident edge from `S`, so

```text
|N(S)|<=sum_(v in S)d(v).
```

Using (13), then double counting one-vertex extensions, gives the new
all-order forest inequality

```text
mu_s=(s+1)b_(s+1)/b_s=E[R(S)]
 >=n-3s+2s/n.                                               (14)
```

Set `s=k-2`.  Equation (14) says `u>=L_(n,k)`.  If
`L_(n,k)>=rho_k`, then `u>=rho_k>=2`, and the upward quadratic in (8) is
nonnegative.  Therefore `V_k(F)>=0`, proving (1).

Finally,

```text
L_(n+1,k)-L_(n,k)
 =1-2(k-2)/(n(n+1))>0
```

for `n>=2k-2`.  This proves that (2) is a genuine cutoff and establishes the
finite band (4).  Dropping the positive term `2(k-2)/n` gives the simpler
closed-form sufficient condition (5).

## 6. Replay and proof-versus-evidence audit

Run

```powershell
python .\verify_uniform_vk_large_order_reduction.py
```

It independently replays (6)--(10), the improved rational threshold, and
the exact cutoffs through rank 100.  It also constructs the incidence map
literally for every unlabeled forest through order 10:

```text
638 forests
114,615 independent-set states
168,057 downward sources
249,131 upward targets
zero injection collisions
1,768 eligible V_k checks
minimum V_k = 4
```

The finite audit is a sanity check on the explicit map.  The injection proof
in Section 4, not the order-10 computation, establishes the theorem for all
forests.

An additional exact structured probe is replayed by

```powershell
python .\probe_uniform_vk_forest_families.py
```

It found no negative eligible `V_k` in `3,055,248` rank checks, including
all three-arm spiders through order 140, a deterministic four-arm slice,
products and low-order extensions of all 15 known rank-seven `alpha=11`
negative rows, structured component products, and reproducible random
trees.  This is evidence only and is not used in the theorem.

The terminal theorem status is

```text
PASS_EXACT_UNIFORM_VK_LARGE_ORDER_REDUCTION
```

## 7. SHA-256

Hashes are recorded after the final replay in the accompanying JSON report
and handoff.
