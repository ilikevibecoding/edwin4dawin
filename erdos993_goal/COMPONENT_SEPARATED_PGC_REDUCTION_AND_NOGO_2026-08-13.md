# Component-separated forest reduction and nested PF no-go for PGC

Date: 2026-08-13

Status: an exact forest-specific equivalence and a stronger abstract no-go,
not a proof of PGC and not a forest counterexample.

## 1. Outcome

The shortest sufficient target remains

\[
H_k(I(G))\ge H_{k-1}(I(F)),\qquad
2\le k<\left\lfloor\frac{2\alpha(G)+1}{3}\right\rfloor,
\quad F=G-\{\ell,p\}.
\]

The useful new result is an exact characterization of the forest coupling
which the earlier one-variable no-gos discard.  Every pendant instance is
equivalent to

\[
B=I(F),\qquad C=I(F-S),\qquad
A=B+xC,\qquad P=A+xB=(1+x)B+xC,                 \tag{CS}
\]

where `S` contains at most one vertex from each component of `F`.
Conversely every such component-separated pair `(F,S)` constructs a forest
pendant instance.  Thus PGC is exactly a rooted-product inequality, not an
inequality of unconstrained polynomial rows.

Even the full two-stage algebra (CS), PF-infinity of all four rows, and
strict interlacing at both deletion comparisons do not imply the PGC
margin abstractly.  The exact counterexample below has

\[
H_2(P)-H_1(B)=-\frac{1544450}{59}<0.
\]

It is not forest-realizable.  The remaining input must therefore use the
literal component-separated deletion coupling, or an equivalent forest
observable.

## 2. Component-separated equivalence theorem

Let `ell-p` be a pendant edge of a forest `G`, put

\[
F=G-\{\ell,p\},\qquad S=N_G(p)\setminus\{\ell\}.
\]

Two vertices of `S` cannot belong to one component of `F`: a path between
them in `F`, together with their two edges to `p`, would make a cycle.
Hence `S` meets every component of `F` at most once.  Splitting first on
`p` and then on `ell` gives (CS).

Conversely, let `F` be any forest and let `S` meet each component at most
once.  Add a new vertex `p` adjacent to every vertex of `S`, and add a new
leaf `ell` adjacent to `p`.  Component separation ensures the result is a
forest, and the same deletion calculation gives (CS).  Also

\[
\alpha(G)=\alpha(F)+1,
\]

because a maximum independent set of `F` together with `ell` attains the
lower bound, while sets containing `p` have size at most
`1+alpha(F-S)<=1+alpha(F)`.

Writing the components as `F_i`, with a marked vertex `s_i` in the touched
components, the coupling is the product replacement

\[
B=\prod_i I(F_i),\qquad
C=\prod_{i\ \mathrm{touched}} I(F_i-s_i)
  \prod_{i\ \mathrm{untouched}} I(F_i).          \tag{RP}
\]

Therefore forest PGC is equivalent to proving

\[
H_k((1+x)B+xC)\ge H_{k-1}(B),\qquad
2\le k<\left\lfloor\frac{2\alpha(F)+3}{3}\right\rfloor,              \tag{CS-PGC}
\]

for every rooted product (RP).  This is a reduction theorem, not a proof
of the inequality.

## 3. Exact nested PF-infinity counterexample

Put

\[
\begin{aligned}
B(x)&=(1+344x)(1+8x+4x^2)
     =1+352x+2756x^2+1376x^3,\\
C(x)&=1+33x+67x^2,\\
A(x)&=B(x)+xC(x)
     =1+353x+2789x^2+1443x^3,\\
P(x)&=A(x)+xB(x)
     =1+354x+3141x^2+4199x^3+1376x^4.
\end{aligned}
\]

Thus both stages of (CS) hold exactly.  Exact Sturm counts put one root of
`P` in each of

\[
(-2,-19/10),\ (-1,-9/10),\ (-133/1000,-1328/10000),\
(-29/10000,-289/100000),
\]

one root of `B` in each of

\[
(-189/100,-9/5),\ (-1341/10000,-267/2000),\
(-291/100000,-2905/1000000),
\]

and one root of `C` in each of

\[
(-1/2,-2/5),\ (-1/25,-3/100).
\]

These disjoint rational intervals prove

\[
C\prec B\prec P.
\]

Three further exact Sturm intervals exhaust the negative roots of `A`.
Consequently `A,B,C,P` are all PF-infinity, and both adjacent deletion
comparisons are in strict proper position.  Nevertheless

\[
H_2(P)=\frac{5461446}{59},\qquad H_1(B)=118744,
\]

so

\[
\boxed{H_2(P)-H_1(B)=-\frac{1544450}{59}<0.}
\]

The formal prefix condition also holds because `deg(P)=4` and
`2<floor((2*4+1)/3)=3`.

This is not a forest counterexample.  If a forest row has `i_1=n`, then

\[
i_2=\binom n2-|E|\ge\binom{n-1}{2}.
\]

Already `B` violates this necessary condition:

\[
2756<\binom{351}{2}=61425.
\]

The other three displayed rows violate the same test as well.

## 4. What the no-go preserves and what remains

The example strictly strengthens the previous real-rooted obstruction.  It
preserves not only `P=A+xB`, PF-infinity, and `B prec P`, but also a second
deletion identity `A=B+xC`, PF-infinity of `C`, and `C prec B`.

It does not refute (CS-PGC), because arbitrary PF rows need not be
independence rows and need not arise by deleting one marked vertex per
forest component.  A successful proof must retain at least one invariant
which detects (RP), for example a switching on component-labelled
independent sets, a deletion-fibre variance decomposition, or a
minimal-counterexample argument which uses the fact that different
neighbours of `p` lie in different components after `p` is removed.

The earlier no-gos remain in force: benign PF convolution, abstract
PF-infinity plus proper position, and stable homogeneous rows do not imply
PGC.  The present example does not recycle any of those invalid
implications.

## 5. Exact replay and finite-evidence boundary

Run

```text
python replay_component_separated_pgc_nogo.py
```

It verifies all coefficient identities, exact Sturm root counts, both
strict interlacings, the negative rational margin, the non-realizability
bounds, and the durable order-16 forest census checksum.  It writes
`component_separated_pgc_nogo_exact_20260813.json`.

The replay confirms that the existing order-16 census contains 332,799
pendant-pair instances and 1,511,925 required-prefix ranks with no failure.
That census is finite evidence only.  Neither it nor the present abstract
no-go proves or disproves forest PGC in unbounded order.

Hashes are recorded in
`component_separated_pgc_nogo_sha256_20260813.txt`.  No master file was
edited.
