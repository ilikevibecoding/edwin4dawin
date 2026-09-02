# Direct PGC attack: real-rooted no-go and protected-bridge audit

Date: 2026-08-13

Status: exact abstract obstruction and dependency audit, not a proof of PGC
and not a forest counterexample.

## 1. Outcome

The pendant cascade remains the shortest sufficient target:

\[
H_k(I(G))\ge H_{k-1}(I(F)),\qquad
2\le k<\left\lfloor\frac{2\alpha(G)+1}{3}\right\rfloor,
\quad F=G-\{\ell,p\}.
\]

No exact forest counterexample was found.  The existing exhaustive
polynomial-state census through forest order 16 remains the strongest exact
finite certificate in this lane: 332,799 pendant/common-factor instances and
1,511,925 required-prefix ranks, with no failure.  This is finite evidence,
not a theorem.

The clean new result is a stronger no-go for a direct real-rooted proof.
Even the literal abstract leaf relation, full PF-infinity on all three rows,
and strict interlacing of the compared rows do not imply PGC.  Consequently a
successful real-rooted, injection, or Markov-chain proof must use additional
forest/path coupling; it cannot depend only on those polynomial properties.

## 2. Exact strictly interlacing PF-infinity counterexample

Put

\[
\begin{aligned}
P(x)&=(1+400x+2x^2)(1+2x)(1+8x),\\
Q(x)&=(1+380x+4x^2)(1+7x),\\
A(x)&=P(x)-xQ(x).
\end{aligned}
\]

Then, exactly,

\[
\begin{aligned}
P={}&1+410x+4018x^2+6420x^3+32x^4,\\
Q={}&1+387x+2664x^2+28x^3,\\
A={}&1+409x+3631x^2+3756x^3+4x^4.
\end{aligned}
\]

Thus every coefficient is positive and

\[
\boxed{P=A+xQ}.
\]

The two quadratic discriminants are positive, so the displayed
factorizations prove that $P$ and $Q$ are PF-infinity.  Exact root
isolators, with the three linear roots written as singleton intervals, are

\[
(-200,-199),\quad(-95,-94),\quad\{-1/2\},\quad\{-1/7\},
\quad\{-1/8\},\quad(-1/379,-1/380),\quad(-1/399,-1/400).
\]

In particular, $Q$ strictly interlaces $P$.  The remaining row $A$ is
also PF-infinity.  Indeed,

\[
A(x)=4x^4+3756x^3+3631x^2+409x+1,
\]

and exact Sturm counts give one root in each of

\[
(-939,-938),\quad(-1,-4/5),\quad(-13/100,-3/25),\quad
(-3/1000,-1/500).
\]

These four disjoint negative intervals exhaust its degree.

Nevertheless, with

\[
G_j(R)=jr_j^2+r_{j-1}r_j-(j+1)r_{j-1}r_{j+1},\qquad
H_j(R)=\frac{jG_j(R)}{r_{j-1}},
\]

exact arithmetic gives

\[
H_2(P)=\frac{635108}{5},\qquad
H_1(Q)=144828,
\]

and hence

\[
\boxed{
H_2(P)-H_1(Q)
=-\frac{89032}{5}<0.
}
\]

This is in the formal prefix range: $\deg P=4$, so

\[
2<\left\lfloor\frac{2\deg P+1}{3}\right\rfloor=3.
\]

This is not a counterexample to forest PGC.  In fact they are provably not
forest independence rows.  If a forest has $n=i_1$ vertices, then

\[
i_2=\binom n2-|E|\ge\binom{n-1}{2}.
\]

For $P$, $n=410$ but $i_2=4018<\binom{409}{2}=83436$; the analogous
violations for $Q,A$ are $2664<74305$ and $3631<83028$.
It is a counterexample to the proposed abstract theorem

> $P=A+xQ$, $A,P,Q$ PF-infinity, and $Q\prec P$ imply the PGC margin.

Thus real-rootedness and even strict proper position do not pay the
between-class variance term in the leaf mixture.  A generic spectral or
birth-death-chain argument based only on these data is insufficient.

## 3. The earlier PF-convolution no-go is preserved

The wave-3 obstruction remains valid and logically independent.  Put

\[
A_0=(1+x/3)^3,\qquad Q_0=(1+2x)(1+3x),\qquad
P_0=A_0+xQ_0.
\]

The base margins are

\[
H_2(P_0)-H_1(Q_0)=\frac{40}{3}>0,
\qquad
H_3(P_0)-H_2(Q_0)=\frac{83837}{2160}>0.
\]

After multiplying both compared rows by the benign PF factor (1+x),

\[
H_2((1+x)P_0)-H_1((1+x)Q_0)=-\frac{50}{27}<0.
\]

The new counterexample strengthens a different premise: it shows that even
making the resulting top row PF-infinity and placing the compared rows in
strict interlacing position still does not prove the margin.  Neither example
is a forest counterexample.

## 4. Protected and Lambda identities do not already imply PGC

The named sources were audited as a dependency chain rather than by treating
their identities as sign theorems.

`PROTECTED_LEAF_PHASE_INDUCTION_REDUCTION_2026-07-29.md` proves a conditional
induction theorem.  It assumes P1--P4, their rank-four plain versions, and
the distance-one collision variants; the note explicitly states that its
computations do not prove P1--P4.

`SHARP_MIXED_LAMBDA_BRIDGE_CANDIDATE_2026-07-29.md` proves defining identities
and factorial reductions, but explicitly leaves:

1. the sharp forest Lambda leaf recursion, equivalently the deletion-fibre
   Poincare inequality;
2. the sharp nested bridge increment;
3. the complete mixed bracket.

Its later rank-three boundary theorems do not close the uniform $q\ge4$
protected induction.  Finally, no proved statement in these notes derives
PGC from the protected/Lambda conclusions.  The missing
protected-to-PGC implication in
`GLOBAL_PROOF_CHAIN_WAVE3_AUDIT_2026-08-13.md` is therefore genuine, not a
clerical omission.

The honest dependency status is

```text
P1--P4 + rank-four/collision variants             open
sharp Lambda leaf recursion / deletion fibre      open
sharp nested increment                            open
complete mixed bracket                            open
explicit protected-to-PGC implication             open
PGC                                                open
```

## 5. Direct injection and Markov-chain scope

The exact leaf-mixture identity in the pendant reduction writes PGC as
nonnegativity of the leaf-absent slack after the squared difference of the
two conditional extension means is paid.  This remains the right direct
combinatorial/Markov target.

The no-go above does not rule out:

* a switching or injection on pairs of independent sets that uses acyclicity;
* a comparison of the actual up-down chains on (I_{k-1}(T)) and
  (I_{k-2}(F)) retaining the marked support vertex;
* a real-rooted representation carrying additional forest-source data.

It does rule out replacing those structures by the one-variable facts
"PF-infinity plus interlacing".  Any successful direct proof must retain an
observable that distinguishes the abstract rows above from realizable forest
pendant fibres.

## 6. Exact replay and finite-evidence boundary

Run

```text
python replay_direct_pgc_real_rooted_nogo.py
```

It verifies the polynomial relation, coefficient lists, strict root
interlacing, four exact Sturm isolations for $A$, the negative prefix
margin, and the earlier PF-convolution no-go.  It also audits the durable
order-16 forest census and the explicit hypothesis language in the protected,
Lambda, and wave-3 notes.  It writes

`direct_pgc_real_rooted_nogo_exact_20260813.json`.

The census replay reads the existing exact certificate rather than rerunning
the expensive enumeration.  Its 1,511,925 zero-failure ranks are finite
evidence only and are not used to assert PGC in any unbounded family.
