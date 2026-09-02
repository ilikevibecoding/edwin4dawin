# ISO leaf remainder on a rooted star plus isolates

Date: 2026-08-29

Status: **proved for the stated terminal family.**  This is a terminal-base
lemma, not an all-forest ISO theorem and not a proof of Erdős Problem 993.

Let

\[
F=K_{1,m}\sqcup tK_1,\qquad m\ge1,\quad t\ge0,
\]

and distinguish one leaf \(\ell\) of the star, whose neighbour is the
centre \(v\).  For a coefficient row \(p\), put

\[
Q_r(p)=r p_r^2+p_{r-1}^2-(r+1)p_{r-1}p_{r+1}
\]

and define the exact leaf cross remainder

\[
D_r(F,\ell)=Q_r(F)-Q_r(F-\ell)-Q_{r-1}(F-\{\ell,v\}).
\]

Then

\[
\boxed{D_r(F,\ell)\ge0\quad\text{for every }r\ge2.}
\]

## Exact formula

The three independence polynomials are

\[
\begin{aligned}
I(F;x)&=(1+x)^{m+t}+x(1+x)^t,\\
I(F-\ell;x)&=(1+x)^{m+t-1}+x(1+x)^t,\\
I(F-\{\ell,v\};x)&=(1+x)^{m+t-1}.
\end{aligned}
\]

At rank two, direct expansion gives

\[
D_2=\frac{8mt+6m+5t^2+t-2}{2}>0.
\]

For \(r\ge3\), put

\[
N=m+t-1,\qquad b=\binom N{r-2},\qquad q=\binom t{r-2}.
\]

On the common support, exact adjacent-binomial cancellation gives

\[
D_r=\frac{b\{bA+qH\}}{r(r-1)^2},
\]

where

\[
A=(N+1)(2r-1)(N-r+2)
\]

and

\[
\begin{aligned}
H={}&-N^2r^2+N^2+2Nr^2t+Nr^2-2Nr+3N-r^2t^2+r^2t\\
&+2r^2-2rt-4r+t^2+3t+4.
\end{aligned}
\]

If \(q=0\) or \(H\ge0\), positivity is immediate.  Otherwise put
\(d=N-t\).  The exact shift is

\[
H=-(r^2-1)d^2+d(r^2-2r+2t+3)
  +2(t+1)\{r(r-2)+t+2\},
\]

so \(H\ge-(r^2-1)d^2\).  Also

\[
A\ge(2r-1)(N+1)d.
\]

Because \(q>0\), one has \(t\ge r-2\), and

\[
\frac qb
=\prod_{j=0}^{r-3}\frac{t-j}{N-j}
\le\left(\frac tN\right)^{r-2}.
\]

Writing \(x=d/t\) and \(k=r-2\),

\[
\left(\frac tN\right)^k\frac d{N+1}
<\frac{x}{(1+x)^{k+1}}
\le\frac1{k+1}
=\frac1{r-1}
\le\frac{2r-1}{r^2-1}.
\]

This proves \(bA+qH\ge0\), and hence the theorem.

## Scope

This enlarges the connected rooted-star base to allow every isolated
component left behind by a pruning argument.  Consequently an eventual
proof of the nonsibling nested-leaf recurrence would not also need an
independent isolate-pruning lemma at the first leaf-cross level.

The nonsibling recurrence itself is still open.  This note therefore does
not establish \(D_r\ge0\) for an arbitrary forest, does not establish the
all-forest ISO inequality, and does not solve the unimodality conjecture.

Replay with

```powershell
python .\verify_iso_leaf_star_isolate_terminal_agent.py
```

The verifier proves the symbolic identities and performs a literal replay
for \(1\le m\le120\), \(0\le t\le120\), including support boundaries.

An independent literal graph auditor (which enumerates independent sets from
the edge list, rather than using the displayed binomial rows) is
`audit_iso_leaf_star_isolate_terminal_agent.py`.  It pins the producer and
producer-report hashes and checks 357 graph/rank cells for
\(1\le m\le7\), \(0\le t\le5\).
