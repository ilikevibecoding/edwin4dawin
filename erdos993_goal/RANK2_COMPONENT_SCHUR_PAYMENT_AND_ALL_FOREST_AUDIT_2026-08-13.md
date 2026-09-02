# Rank-two component Schur payment and an all-forest audit

Date: 2026-08-13

Status: a fixed-rank, all-order forest theorem and an exact bounded audit of
the resulting all-rank conjecture.  This is not a proof of PGC, not a proof
of forest unimodality, and not a forest counterexample.  The master file was
not edited.

## 1. Outcome

The normalized Schur bracket isolated in the final-route audit has a clean
forest proof at the first nontrivial rank.  Let `G` be any forest on `n>=2`
vertices, let `l` be a leaf with support `p`, and put

\[
 P=I(G)=\sum_jp_jx^j,\qquad
 B=I(G-\{l,p\})=\sum_jb_jx^j.
\]

Then

\[
 \boxed{
  4\frac{p_2^2-p_1p_3}{p_1}
  \;\ge\;
  \frac{b_1^2-b_0b_2}{b_0}.}                         \tag{1}
\]

Equivalently, the normalized cross-rank two-row Schur margin

\[
  \frac{2^2\Delta_2(P)}{p_1}
  -\frac{1^2\Delta_1(B)}{b_0}
\]

is nonnegative.  The proof uses only literal forest counts; it does not use
PF-infinity, real-rootedness, strong log-concavity, negative association, or
log-concavity of the marked-count row.

In the component-root coordinates of the polarization note, (1) is exactly
the rank-two instance of the desired inequality coupling the three adjacent
`B`-ratios with the three zero-occupation probabilities.  The same inequality
has also now been checked, separately from PGC, at every required prefix rank
for every forest-polynomial pendant pair through order 16: 332,799 pair
instances and 1,511,925 rank checks, with no failure.  The all-rank statement
for `k>=3` remains a conjecture supported only by bounded evidence.

## 2. Exact six-scalar form

Retain

\[
 s=\frac{b_{k-1}}{b_{k-2}},\qquad
 u=\frac{b_k}{b_{k-1}},\qquad
 v=\frac{b_{k+1}}{b_k},\qquad
 q_j=\frac{c_j}{b_j},
\]

where `P=(1+x)B+xC`.  Direct substitution gives

\[
\begin{aligned}
&\frac{k^2\Delta_k(P)}{p_{k-1}}
 -\frac{(k-1)^2\Delta_{k-1}(B)}{b_{k-2}}\\
&\quad=b_{k-1}\,\mathcal S_k,                         \tag{2}
\end{aligned}
\]

with

\[
\boxed{
\mathcal S_k=
k^2\left\{
 \frac{s(1+u+q_{k-1})^2}{1+s+q_{k-2}}
 -u(1+v+q_k)
\right\}
-(k-1)^2(s-u).}                                       \tag{3}
\]

Thus the theorem proves, in every scalar instance coming from a forest
pendant edge,

\[
 4\left\{
 \frac{s(1+u+q_1)^2}{1+s+q_0}
 -u(1+v+q_2)
 \right\}\ge s-u.                                    \tag{4}
\]

Here `q_0=1`.  In the PGC prefix where rank two is required,
`alpha(P)>=4`, hence `alpha(B)>=3` and all ratios in (4) are defined.  The
coefficient form (1) remains meaningful without this ratio qualification.

Equation (3) is the all-rank **component Schur payment conjecture**.  It is
strictly more precise than asking for log-concavity of `P` or `B`: it compares
different polynomials at adjacent ranks and retains the three marked-root
zero atoms.

## 3. Proof of the rank-two theorem

Write

\[
 n=|V(G)|,\qquad m=|E(G)|,\qquad d=\deg_G(p),\qquad
 W=\sum_{z\in V(G)}{\deg_G(z)\choose2}.
\]

Because a forest is triangle-free, exact counting of independent sets of
sizes one, two, and three gives

\[
 p_1=n,
 \qquad p_2={n\choose2}-m,
 \qquad p_3={n\choose3}-m(n-2)+W.                     \tag{5}
\]

Deleting `l` and `p` removes exactly `d` edges, so

\[
 b_0=1,\qquad b_1=n-2,\qquad
 b_2={n-2\choose2}-(m-d).                             \tag{6}
\]

Let `L` be `n` times the left side of (1) minus `n` times its
right side.  Substitution of (5)--(6) yields the exact integer identity

\[
\begin{aligned}
6L={}&2n^4-3n^3+7n^2-6n+24m^2-30mn\\
    &\quad+6dn-24nW.                                  \tag{7}
\end{aligned}
\]

Every pair of adjacent edges is a pair of edges, hence

\[
 W\le {m\choose2}.                                    \tag{8}
\]

After applying (8), the right side of (7), as a polynomial in `m`, has
derivative

\[
 -6\{4m(n-2)+3n\}<0.                                  \tag{9}
\]

A forest with at least the displayed pendant edge has `m<=n-1` and `d>=1`.
Using these in the decreasing lower bound gives

\[
 6L\ge (n-4)(n-2)(2n^2-3n+3)\ge0                     \tag{10}
\]

for every `n>=4`.  The only pendant forests at orders two and three, up to
irrelevant labeling, are `K_2`, `P_3`, and `K_2` disjoint union `K_1`; their
exact normalized margins are respectively `0`, `1/3`, and `13/3`.  This
proves (1) for every possible order, and (2) proves the scalar form (4).

This argument is deliberately coarse at (8), so equality in the final lower
bound is not being classified.  Coarseness causes no gap in the sign proof.

## 4. Exact bounded audit of the all-rank conjecture

The replay performs a polynomial-complete forest audit, not merely a scan of
connected trees:

1. enumerate every unlabeled tree through order 16;
2. retain every distinct tree independence polynomial and every distinct
   `(tree polynomial, pendant-pair deletion polynomial)` pair;
3. recursively form every distinct forest independence polynomial as a
   product of tree polynomials;
4. multiply every pendant pair by every admissible common forest factor;
5. check (2), equivalently `S_k>=0`, at every required PGC prefix rank.

Graphs with identical relevant coefficient rows are intentionally merged,
because the inequality depends only on those rows.  This covers every
pendant edge in every forest through the stated order.

The exact result is:

```text
pair instances:              332,799
required prefix rank checks: 1,511,925
rank-two checks:              332,778
failures:                    0
minimum exact margin:        34/5
minimum location:            order 5, rank 2
```

The rank-two checks are consistency evidence for the theorem.  The checks at
`k>=3` are finite evidence only and do not prove the component Schur payment
conjecture.

The earlier connected-tree Schur audit counted 244,692 pendant instances and
1,103,823 ranks.  The larger counts here come from closing the untouched
common-forest-factor gap explicitly.  This matters because abstract
convolution had already failed for other cascade statements.

## 5. Relation to PGC and the remaining cut

The exact decomposition is

\[
 H_k(P)-H_{k-1}(B)
 =b_{k-1}\mathcal S_k
 +\{k(p_k-p_{k+1})-(k-1)(b_{k-1}-b_k)\}.              \tag{11}
\]

The theorem proves only the first term of (11) at `k=2`.  It does not by
itself pay a negative first-difference transport term, and therefore it is
not a proof of rank-two PGC.  Likewise, the bounded positivity of
`S_k` at higher ranks is not an all-order theorem.

The smallest honest next target is now unambiguous:

> Prove (3) for component-separated forests at every required `k>=3`, or
> find a literal forest counterexample; then quantify the surplus beyond
> zero needed to pay the negative part of the second bracket in (11).

The rank-two proof suggests that an all-rank proof, if true, should count
small forest configurations/fibres before applying a coarse global edge-pair
bound.  It gives no support to the disproved generic PF/SLC/negative-
association shortcuts.

## 6. Replay

Run

```text
python replay_rank2_component_schur_payment.py --max-order 16
```

It writes
`rank2_component_schur_payment_exact_20260813.json` and prints
`PASS_RANK2_THEOREM_AND_BOUNDED_ALL_RANK_AUDIT_NOT_PGC_PROOF`.

SHA-256:

```text
replay_rank2_component_schur_payment.py
8491624A3BA7AC7EA20006E3FBB827E66D41B6ACB05CF4620E8FED3DD014AF93

rank2_component_schur_payment_exact_20260813.json
E46E08EE391C9826B949C028CDE79190F7D09A17775C265A280265677BABFDDD
```
