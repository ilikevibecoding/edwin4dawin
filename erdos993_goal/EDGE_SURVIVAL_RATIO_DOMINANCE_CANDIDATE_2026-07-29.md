# Edge-survival ratio dominance candidate

Date: 2026-07-29

## Status

The inequality in this note is a **candidate lemma**, not yet a
theorem.  It survives the exact audits recorded below.  A natural
stronger covariance statement is false on Galvin trees, so it cannot
be used as a proof.

## Statement

For a forest \(F\), let

\[
E_q=\sum_{K\in\mathcal I_q(F)}e(F-N[K]),\qquad
S_q=(q+1)i_{q+1}(F).
\]

The candidate is

\[
\boxed{\frac{E_{q+1}}{S_{q+1}}\le
\frac{E_q}{S_q}.}
\tag{ESR}
\]

In the notation of the edge-survival payment reduction,

\[
x=\frac{(q+2)i_{q+2}}{(q+1)i_{q+1}},\qquad
z=\frac{(q+1)E_{q+1}}{E_q},
\]

(ESR) is exactly

\[
\boxed{z\le x.}
\]

## Token-sliding interpretation

Let \(\mathsf{TS}_k(F)\) be the graph whose vertices are independent
\(k\)-sets, with an edge when one token can slide along an edge of
\(F\).  If \(D_k\) is the sum of the degrees of
\(\mathsf{TS}_k(F)\), then

\[
D_k=2E_{k-1}.
\]

Indeed, an oriented token slide is an independent \((k-1)\)-set
together with an oriented residual edge.  Therefore

\[
\frac{2E_{k-1}}{k\,i_k(F)}
\]

is the average token-slide degree per token.  Candidate (ESR) says
that this quantity is nonincreasing in \(k\).

Equivalently, for an independent \(k\)-set \(I\), let \(d(I)\) be
the number of outside vertices having exactly one neighbor in \(I\).
Then \(d(I)\) is the token-slide degree of \(I\), and (ESR) compares
the rank averages of \(d(I)/k\).

## Why the first switching shortcut fails

Let \(h(I)\) be the number of vertices that extend \(I\).  Deleting a
token from a \((k+1)\)-set shows

\[
\sum_{I\in\mathcal I_k}h(I)d(I)
\ge k\sum_{J\in\mathcal I_{k+1}}d(J).
\]

It is tempting to finish by asserting
\(\operatorname{Cov}(h,d)\le0\) on \(\mathcal I_k\).  In exact edge
moments this stronger assertion is

\[
i_k\bigl(kE_k+W_{k-1}\bigr)
\le (k+1)i_{k+1}E_{k-1},
\]

where \(W_{k-1}\) is the sum of residual wedges.  The desired (ESR)
has the same inequality without \(W_{k-1}\).

The stronger covariance assertion fails at twelve ranks of Galvin's
tree \(T_{14,8}\), even though (ESR) remains positive at every rank.
Thus a successful switching must recover the residual-wedge
overcount rather than discard it through covariance.

## Exact evidence

`scan_edge_survival_ratio_dominance.py` checks (ESR) using integer
cross-products.  It audits all unlabeled trees through a requested
order, random disconnected forests, and several large Galvin trees.
It also records the failure of the stronger covariance shortcut.

The machine-readable replay is
`edge_survival_ratio_dominance_certificate_20260729.json`.

## Remaining obligation

Prove (ESR), most plausibly by an injection between

\[
\mathcal I_k\times
\{\text{oriented residual edges above a \(k\)-set}\}
\]

and the corresponding product at ranks \(k-1,k+1\), with a
canonical treatment of branching components in the symmetric
difference.  Even a proof of (ESR) will not by itself prove the full
denominator-free payment; a second quantitative relation is still
needed.
