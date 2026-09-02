# ISO cutoff-domain closure audit

Date: 2026-08-29

Status: **scope theorem only.**  This note audits which ranks the existing
`Q -> D -> N -> FML` recurrences must cover.  It does not prove any new
positivity inequality.

## Verdict

The completion criterion

```text
2 <= r < L(alpha(B))
```

for the Four-Minor Leaf Lemma is not sufficient for the proof skeleton as
written.  There are two distinct issues.

1. For the direct occurrence of `N_r(B;u,v)`, the relevant independence
   number is not `alpha(B)`.  If

   ```text
   W = B-{u,v},
   ```

   then the graph with the two pending leaves has independence number
   `alpha(W)+2`.  Its direct prefix therefore requires

   ```text
   2 <= r < L(alpha(W)+2).                            (D0)
   ```

2. Even (D0) is not closed under repeated leaf deletion.  FML has a
   same-rank child `N_r(B-z)`, and deleting `z` can lower `alpha(W)` by one.
   The same rank can consequently lie outside the child's own local cutoff.
   The induction must keep the cutoff of the original ambient forest fixed.

The exact induction-closed formulation for a fixed ambient independence
number `A` is given below.  If one wants a single theorem covering all
ambient forests without an additional boundary-payment or leaf-selection
lemma, the FML rank range forced by this recurrence strategy is

```text
2 <= r <= alpha(B-{u,v})+2.                           (U-FML)
```

That is substantially broader than a strict local conjectural-prefix cutoff.

### Low-rank direct-ISO amendment

Independent all-forest reserves now prove every required target `Q_4`,
`Q_5`, and `Q_6` directly, so the unresolved target ISO ranks begin at
seven.  This does **not** shrink (U-FML) inside the present recurrence.  A
target `Q_7` proof through `D_7,N_7` still descends through
`D_6,D_5,D_4,N_6,N_5,N_4`; in particular, rank-five FML has an `N_4` lower
child.  Hence the current auxiliary FML domain still begins at rank four
unless a new cross-rank coupling is proved.
The exact dependency DAG and opposite-orientation obstruction are frozen in
`ISO_DIRECT_Q45_BYPASS_DEPENDENCY_AUDIT_AGENT_2026-08-29.md`.

## 1. Cutoff arithmetic

Write

```text
L(a)=ceil((2a-1)/3)=floor((2a+1)/3).
```

Thus

```text
a mod 3          0       1       2
L(a)            2q     2q+1    2q+1
```

with the evident interpretation of `q` in each residue class.

If a leaf is removed from a forest of independence number `a`, the
same-rank child has independence number `a` or `a-1`, while the link child
has independence number exactly `a-1`.  For every `r<L(a)`,

```text
r-1 < L(a-1).                                         (7)
```

So the lower-rank child is always inside its own strict prefix.  The
same-rank child is not: when its alpha is `a-1`, the rank

```text
r=L(a-1)
```

is required and lies below `L(a)` exactly when `a mod 3` is `0` or `1`.
This is the first local-cutoff leak.

## 2. Exact alpha identities at the two reductions

For a leaf `ell~v` in `F`, let

```text
A=F-ell,             C=F-{ell,v}.
```

Replacing `v` by `ell` in a maximum independent set shows

```text
alpha(F)=alpha(C)+1,
alpha(A) in {alpha(F)-1, alpha(F)}.                   (8)
```

Therefore prefix `Q_r(F)` directly needs `D_r(F,ell)` at

```text
2 <= r < L(alpha(C)+1).                               (9)
```

Now suppose `F` has two nonsibling leaves, one at each of distinct supports
`u,v`, and let `B` be the forest after deleting those two leaves.  Put

```text
W=B-{u,v},             w=alpha(W).
```

Both supports can be replaced simultaneously by their pending leaves, so

```text
alpha(F)=w+2.                                         (10)
```

The exact nested identity is

```text
D_r(F)=D_r(F-one pending leaf)
      +D_(r-1)(F-that leaf-and-its-support)
      +N_r(B;u,v).                                   (11)
```

Consequently the **minimal direct-use domain** of this occurrence of `N` is
(D0), not `r<L(alpha(B))`.  Since

```text
w <= alpha(B) <= w+2,
```

the proposed `L(alpha(B))` can be smaller than the correct outer cutoff.

## 3. Connected exact witness: the proposed domain is empty

Let `F` be the three-arm spider whose arms all have length two.  Its exact
independence polynomial is

```text
I(F;x)=1+7x+15x^2+11x^3+x^4,
alpha(F)=4,                 L(alpha(F))=3.
```

Rank `r=2` is therefore a required prefix rank.  Every leaf is in the unique
maximum independent set; deleting any leaf lowers alpha to `3`.  Hence there
is no alpha-preserving choice that repairs the same-rank `Q` induction.

For either choice of two nonsibling leaves, the marked core has

```text
alpha(B)=3,          alpha(W)=2.
```

Exact coefficient arithmetic gives

```text
Q_2(F) = 268 = 146 + 14 + 108,
D_2(F) = 108 = 68 + 3 + N_2(B;u,v),
N_2(B;u,v)=37.
```

But

```text
2 <= r < L(alpha(B)) = L(3)=2
```

contains no ranks.  In contrast,

```text
2 < L(alpha(W)+2)=L(4)=3.
```

Thus `N_2=37` is literally a summand required by a target prefix ISO
identity and is absent from the proposed theorem domain.

The first identity also exposes the parallel `Q` problem:
the same-rank child has alpha `3`, so its needed `Q_2=146` is at
`r=L(3)`, outside the child's strict local prefix.

## 4. Exact witness omitting two required ranks

Let `B` be the disjoint union of two marked copies of `K_(1,2)` (the marks
are their centers) and one unmarked `K_2`.  Then

```text
alpha(B)=alpha(W)=5.
```

Attach one pending leaf at each mark.  The outer forest has alpha `7`, so

```text
L(alpha(B))=L(5)=3,
L(alpha(W)+2)=L(7)=5.
```

The proposed domain covers only `r=2`; the target prefix needs `r=2,3,4`.
In particular, exact evaluation gives

```text
N_4(B;u,v)=2156.
```

This is an index counterexample, not a sign counterexample: it proves that
the stated theorem range omits two terms needed by the nested identity.

## 5. Why the corrected direct cutoff is still not hereditary

Take `B` to be a marked edge plus two unmarked isolated vertices.  Then
`w=alpha(W)=2`.  Delete one isolate to obtain `B'`, for which
`alpha(W')=1`.  At rank two, the exact isolate recurrence reads

```text
N_2(B)=24,
N_2(B')=17,
N_1(B')=0,
N_2(B)-N_2(B')-N_1(B')=7.
```

The parent rank is in its direct outer domain because

```text
2 < L(2+2)=3,
```

but the same-rank child is not in its own direct outer domain because

```text
2 < L(1+2)=2
```

is false.  Therefore replacing `alpha(B)` by `alpha(W)+2` fixes direct use
but does not justify the phrase "repeated leaf deletion" in the skeleton.

The same phenomenon occurs in ordinary and collision modes whenever the
same-rank child lowers `alpha(W)`.  The lower-rank child is harmless by (7).

## 6. The induction-closed ambient theorem domain

Fix the original ambient independence number and its largest target rank:

```text
A0 = alpha(F0),             R=L(A0)-1.
```

Do **not** recompute `R` after a deletion.  The following is the exact clean
rank envelope generated by the recurrences.

### Q level

For every descendant forest `G`, the same-rank and lower-rank branches can
require `Q_k(G)` for `1<=k<=R`.  Terms with `k>alpha(G)` are immediate:

```text
Q_alpha(G)(G) > 0,
Q_(alpha(G)+1)(G)=p_alpha(G)^2,
Q_k(G)=0 for k>alpha(G)+1.
```

Thus the leaf identity is invoked only while `k<alpha(G)`, but its cutoff is
the fixed ambient `R`, not `L(alpha(G))-1`.

### D level

The same-rank nested branch can require `D_k(G,ell)` up to

```text
k <= min(R,alpha(G)).
```

The boundary beyond that is elementary:

```text
D_1(G,ell)=3,
D_(alpha(G)+1)(G,ell)=2 A_alpha(G) C_(alpha(G)-1) >= 0,
D_k(G,ell)=0 for k>alpha(G)+1.
```

### N and FML level

For a marked core `(B;u,v)`, put `W=B-{u,v}` and `w=alpha(W)`.  The nested
identity and its same-rank descendants require

```text
2 <= k <= min(R,w+2).                                (12)
```

This range is closed under all three FML modes when `R` remains fixed:

- an ordinary lower child has rank `k-1` and four-minor alpha `w-1`;
- an isolate lower child has the same property;
- a same-rank child has four-minor alpha `w` or `w-1`;
- if the latter child is reached one rank above (12), the universal top
  identity

  ```text
  N_(w+3)=2 E_(w+2)W_w+2 U_(w+1)V_(w+1) >= 0
  ```

  closes it directly, and `N_k=0` for `k>w+3`.

Hence the corrected cutoff-aware theorem slot for a **fixed** ambient `A0`
is:

> For every marked forest `(B;u,v)` reached in the induction, with
> `W=B-{u,v}`, prove the appropriate FML inequality for every
> `2<=r<=min(L(A0)-1,alpha(W)+2)`.

Equivalently, a convenient statement not mentioning reachability is to
quantify over all marked `B` with `alpha(W)<=A0-2` in the same rank range.

## 7. Uniform consequence for all forests

If the proof is to work for every ambient forest using only the displayed
nonnegative recurrences, (12) for every `A0` becomes (U-FML).  This is not an
artifact of over-quantification.  Given any marked `B` and any
`r<=alpha(W)+2`, attach the two pending leaves and enough isolated vertices
to make `r<L(A0)`.  Repeated isolate FML steps retain rank `r` until the
original `B` is reached.  Thus that local pair `(B,r)` can occur inside a
genuine target-prefix calculation for a larger ambient forest.

There is one legitimate way not to use this particular isolate-padding
argument: strip every global `(1+x)` factor first, since adjoining an isolate
preserves unimodality directly.  That does not restore a bounded local
collar.  The connected isolate-free bundled-spider family in
`ISO_ALPHA_SELECTION_COLLAR_AND_BUNDLE_TELESCOPE_AGENT_2026-08-29.md` has
arbitrarily many forced same-rank alpha drops under ordinary FML, so every
fixed collar still fails without a bundle telescope or another new payment
theorem.

A narrower strict-prefix theorem could still be sufficient only if the proof
adds a new ingredient not presently in the skeleton, for example:

1. a leaf-selection theorem guaranteeing that every same-rank deletion
   preserves the relevant alpha until a terminal base is reached; or
2. an exact boundary-payment theorem that handles every rank exposed when
   alpha drops; or
3. a direct ambient inequality that telescopes isolate/ordinary deletions
   without requiring positivity of each same-rank child.

Without one of those additions, proving FML merely for
`2<=r<L(alpha(B))` does **not** complete Sections 4--6.

## 8. Replay

Run

```text
python audit_iso_cutoff_domain_closure_agent.py
```

The verifier checks the cutoff residue table, all three exact witnesses, and
both `Q` and `D` decompositions for the connected spider.  Its success marker
is

```text
PASS_EXACT_ISO_CUTOFF_DOMAIN_SCOPE_AUDIT
```
