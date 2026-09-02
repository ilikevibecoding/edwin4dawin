# Conditional global bridge for the terminal `q3` envelope

Date: 2026-08-29

Status: **exact conditional induction and exact downstream consequence; two
forest-extension hypotheses and the final unimodality bridge remain open.**

This note answers a precise scope question.  Suppose the remaining terminal
payment is proved.  What else is needed to propagate

```text
q_r(F) <= q_3(F),  r>=4,
```

from terminal cells to all forests, and what does that statement actually
imply?

The answer is:

1. the terminal recurrence does give a clean strong induction, but only when
   the anchor and payment are available for **forest bases**, not merely tree
   bases;
2. the resulting tree envelope immediately proves the all-rank averaged
   component-surplus inequality;
3. no proved implication currently carries that component-surplus theorem to
   the prefix pendant cascade `PGC` or to unimodality.

Thus a tree-base terminal payment, by itself, would not finish the global
proof.

## 1. Exact two-block propagation

Let `T` be obtained from a marked forest `(G,w)` by adjoining `w-v` and then
`t>=1` leaves at `v`.  Split the exact recurrence into the `v`-excluded and
`v`-included blocks:

```text
(I0,C0)=((1+x)^t I_G,(1+x)^t C_G),
(I1,C1)=(x I_(G-w),x C_(G-w)+I_(G-N[w])+t I_(G-w)).
```

At coefficient index two (rank three), write the block denominator/numerator
pairs as `(d0,c0),(d1,c1)`.  At target coefficient index `j>=3`, write them
as `(D0,C0),(D1,C1)`, and put

```text
M0=c0 D0-d0 C0,
M1=c1 D1-d1 C1,
M =(c0+c1)(D0+D1)-(d0+d1)(C0+C1),
U =c1 d0-c0 d1,
W =d0 D1-d1 D0.
```

Direct expansion gives

```text
d0 d1 M=(d0+d1)(d1 M0+d0 M1)-U W.             (1)
```

Also

```text
q3(T)>=q3((1+x)^t I_G)  iff  U>=0.              (2)
```

Consequently, if `M0,M1,U>=0`, then the only adverse case is `W>0`, and the
included payment

```text
(d0+d1)d0 M1 >= U max(W,0)                      (3)
```

proves `M>=0`.  This is exactly the sufficient payment being attacked in the
terminal-payment work.  Equations (1)--(3) are all-order algebra, not finite
evidence.

## 2. Why the included block closes conditionally

Put

```text
F=G-w, H=G-N[w],
f_k=i_k(F), h_k=i_k(H), z_k=s_k(F).
```

The included block has

```text
c1=z2+h2+t f2,       d1=3f2,
C1=zj+hj+t fj,       D1=(j+1)fj.
```

Its self-margin satisfies the exact identity

```text
2M1
 =3(j z2 fj-2f2 zj)
  +{[2(j+1)h2+(j-2)(2f2-z2)]fj-6hjf2}
  +2(j-2)(t-1)f2fj.                               (4)
```

The braced term is the independently assembled all-rank rooted-forest
reserve.  The last term is nonnegative.  The first term is nonnegative if
the smaller forest satisfies `q_j(F)<=q_2(F)`.

Therefore the included block is closed by:

```text
smaller-forest q_j<=q3
 + all-forest q3<=q2
 + proved rooted-forest reserve
 -> M1>=0.                                        (5)
```

The important scope point is that `F=G-w` is generally disconnected.  The
audited `q3<=q2` theorem currently covers trees, not all forests.

## 3. The exact strong induction, conditional on forest hypotheses

Every forest containing a component of order at least three has a terminal
decomposition of the form above.  In such a component, take an endpoint of a
longest path and its neighbor `v`; every neighbor of `v` off the path is a
leaf.  For a star, retain one leaf as `w`.  Forests whose components all have
order at most two are matchings plus isolates.

The latter base class is closed all-order.  If

```text
F=m K2 disjoint-union l K1,
```

then

```text
I_F=(1+2x)^m(1+x)^l,
C_F=m(1+2x)^(m-1)(1+x)^l.
```

For `m,l>=1`, after removing the common factor
`A=(1+2x)^(m-1)(1+x)^(l-1)`, the coefficient ratio is

```text
m(1+u)/[(2m+l)+(2m+2l)u],  u=A_(k-1)/A_k.
```

Its derivative in `u` is negative.  The real-rooted polynomial `A` has a
log-concave coefficient row, so `u` is nondecreasing with `k`.  Thus the
`q_r` are nonincreasing.  If `l=0`, every supported `q_r=1/2`; if `m=0`, they
are zero.

Now induct on total vertex count.  For a terminal extension `T`:

- the excluded block is `Q=G disjoint-union t K1`, which has `|T|-1`
  vertices, so `M0>=0` by strong induction;
- `F=G-w` is smaller, so (4)--(5) give `M1>=0`;
- the forest-base anchor gives `U>=0`;
- the forest-base payment (3) gives `M>=0`.

Hence the following is a proved conditional theorem:

> If `q3<=q2`, the terminal anchor ordering, and the terminal payment hold
> for every finite forest base in their displayed ranges, then
> `q_r(F)<=q3(F)` for every finite forest and every supported `r>=4`.

The structural decomposition was reconstructed on all 80 forest graphs in
the NetworkX graph atlas.  That bounded replay audits the decomposition; the
longest-path argument is the all-order proof.

## 4. Exact forest gaps

Three obligations are therefore visible.

### FQ32: the low anchor for forests

Prove

```text
q3(F)<=q2(F)
```

for every forest.  The current all-order theorem is tree-only.  This input is
needed in (5).

### FA: terminal anchor ordering for forest bases

Prove

```text
q3(T)>=q3(G disjoint-union t K1)
```

when `G` is an arbitrary marked forest.  The current audited theorem proves
this when `G` is a tree.  By (2), this is exactly `U>=0`.

### FP: terminal payment for forest bases

Prove (3) for arbitrary marked forest bases.  A tree-base proof does not
automatically survive multiplication by other component polynomials.

This forest scope cannot be avoided merely by saying that the final target
is a tree.  If `F` is any forest with one root chosen in each component, add
a new vertex adjacent to those roots.  The result is a tree `G` with
`F=G-w`.  Thus the deletion forests appearing in (4) range over all rooted
forests.

An alternative to FA+FP would be a proved common-factor/disjoint-union
closure theorem strong enough to lift the tree-base anchor and payment.
No such theorem is presently in the dependency chain.

## 5. What the tree envelope does prove

For an `n`-vertex tree, put

```text
W=C(n-2,2),
e=sum_v C(deg(v)-1,2),
m2=W-e,
i2=C(n-1,2).
```

The audited theorem gives `q3<=q2=m2/i2`.  Hence `q_r<=q3` gives, for every
supported `r>=3`,

```text
r m2 i_r >= W s_r.                                  (6)
```

There is an exact nonnegative decomposition:

```text
r m2 i_r-W s_r
 = W/(3i3) (r i_r s3-3i3 s_r)
  +W r i_r/(3i3 i2) (3m2 i3-i2 s3)
  +r m2 i_r(i2-W)/i2.                               (7)
```

For an independent `(r-1)`-set `S`, put `R_S=T-N[S]`, and sum

```text
A_(r-1)=sum_S |R_S|=r i_r,
C_(r-1)=sum_S c(R_S).
```

Because every `R_S` is a forest,

```text
C_(r-1)=A_(r-1)-s_r.
```

Thus (6) is equivalently the all-rank averaged component-surplus theorem

```text
W C_(r-1) >= e A_(r-1).                             (8)
```

This is a genuine and useful consequence.  It subsumes the separate
rank-four and rank-five component-surplus targets once the envelope is known.

## 6. Why (8) is not yet unimodality

Let a uniform independent `(r-1)`-set have residual statistics

```text
X=|R_S|, C=c(R_S), mu=E[X].
```

Then

```text
q_r=1-E[C]/mu.                                      (9)
```

So a `q` envelope controls a component-to-extension **mean ratio**.  The
known PGC identity depends on

```text
D=Var(X)+2E[C]
```

and, after splitting by whether the pendant leaf is selected, on the exact
payment

```text
z(4mu_Z-D_Z)
 >= az/(a+z)(mu_A-mu_Z)^2.                          (10)
```

Equation (10), or an equally strong forest-specific replacement, is still
missing.  In particular, (9) has no variance information.  Two exact
abstract residual laws can have the same `mu=4`, `E[C]=1`, and `q=3/4`:

```text
X=4,C=1 deterministically:       Var(X)=0,
(X,C)=(0,0),(8,2) equally:       Var(X)=16.
```

But the normalized three-halves statistic

```text
5-2(Var(X)+2E[C])/mu
```

is respectively `4` and `-4`.

There are also literal tree guards.  The seven-vertex trees

```text
graph6 FpOGG, I=(1,7,15,10,1), Q4=-2,
graph6 FqD?G, I=(1,7,15,11,1), Q4=-3
```

satisfy their complete supported `q3` envelopes, yet have negative `Q4`.
They lie outside the rank-four PGC prefix, so they are not counterexamples to
the forest program; they do prove that no unconditional algebraic
`q-envelope -> Q_k` implication exists.

Finally, acyclicity is indispensable.  The complete multipartite graph with
parts

```text
(6,1,1,1,1,1,1,1,1,1,1)
```

has independence row

```text
(1,16,15,20,15,6,1),
```

which is nonunimodal (`16>15<20`).  Every induced set of size at least three
has either zero or at least two edges, so `q_r=0` for every `r>=2`.  This is
an actual graph, not a forest; it is a fail-closed demonstration that the
`q` envelope alone does not imply unimodality without a new forest-specific
bridge.

The currently proved global spine remains

```text
PGC in the required prefix
 -> prefix GSB
 -> first descent meets the bipartite decreasing tail
 -> forest independence-sequence unimodality.
```

The terminal `q3` program has not yet supplied PGC.

## Replay

Run

```powershell
python .\verify_terminal_q3_global_bridge_conditional_agent.py
```

It checks:

- the mixture, anchor, included-margin, and surplus identities symbolically;
- the matching-plus-isolates base formula and 415 exact rank cells;
- the terminal decomposition on all 80 atlas forests;
- both negative-`Q4` tree guards by literal subset enumeration;
- the 16-vertex complete-multipartite nonunimodal guard by all `65,536`
  vertex subsets;
- all pinned theorem hashes and statuses.

Expected status:

```text
PASS_EXACT_CONDITIONAL_BRIDGE_AUDIT_UNRESOLVED_FOREST_AND_UNIMODALITY_GAPS
```

Primary report:

```text
terminal_q3_global_bridge_conditional_audit_20260829.json
```

This status is intentionally conditional.  It is not a proof of FA, FP,
FQ32, PGC, unimodality, or Erdős Problem 993.
