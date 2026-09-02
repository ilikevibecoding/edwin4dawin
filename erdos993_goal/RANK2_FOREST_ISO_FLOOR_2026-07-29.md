# Sharp rising rank-two ISO floor for forests

Date: 2026-07-29

## Theorem

Let

\[
I(F;x)=\sum_{j\ge0}i_jx^j
\]

be the independence polynomial of a forest.  If \(i_2>i_1\), then

\[
\boxed{
\frac{i_1^2+2i_2^2-3i_1i_3}{i_1^2}
\ge \frac{37}{25}.
}
\tag{1}
\]

Equality holds for the star \(K_{1,4}\).  Thus the minimum found in
the exhaustive forest-polynomial audit through order 19 is a rigorous
sharp rank-two theorem, not a finite-search artifact.

The same proof also gives the unconditional companion bound

\[
\frac{i_1^2+2i_2^2-3i_1i_3}{i_1^2}\ge1
\tag{1a}
\]

for every nonempty forest, without the rising assumption.

More importantly for down-link induction, if \(c\) is the number of
components, then

\[
\boxed{
\frac{i_1^2+2i_2^2-3i_1i_3}{i_1^2}
\ge
\frac{c\{4n^2-3n(c+1)+4c\}}{2n^2}
\ge \frac c2.
}
\tag{1b}
\]

## Proof

Write \(n=|V(F)|\), \(m=|E(F)|\), and

\[
S=\sum_{v\in V(F)}\binom{\deg(v)}2.
\]

Since a forest is triangle-free,

\[
i_1=n,\qquad
i_2=\binom n2-m,\qquad
i_3=\binom n3-m(n-2)+S.
\tag{2}
\]

Substitution into the numerator of (1) gives

\[
\begin{aligned}
N={}&i_1^2+2i_2^2-3i_1i_3\\
={}&\frac12\{
-6Sn+4m^2+2mn^2-8mn+n^3+n^2
\}.
\end{aligned}
\tag{3}
\]

The statistic \(S\) counts pairs of incident edges, so

\[
S\le\binom m2.
\tag{4}
\]

Consequently

\[
N\ge L_n(m):=
\frac12\{
-3m(m-1)n+4m^2+2mn^2-8mn+n^3+n^2
\}.
\tag{5}
\]

For \(n\ge2\), \(L_n(m)\) is concave in \(m\), because its second
derivative is \(4-3n<0\).  When \(n\ge5\), every forest has
\(0\le m\le n-1\), and hence

\[
L_n(0)=\frac{n^2(n+1)}2,
\qquad
L_n(n-1)=2n^2-3n+2.
\tag{6}
\]

The first endpoint is larger than \(37n^2/25\).  At the second,

\[
L_n(n-1)-\frac{37}{25}n^2
=\frac{(n-5)(13n-10)}{25}\ge0.
\tag{7}
\]

For the unconditional bound (1a), the two endpoint gaps over \(n^2\)
are

\[
L_n(0)-n^2=\frac{n^2(n-1)}2,\qquad
L_n(n-1)-n^2=(n-1)(n-2),
\]

so concavity proves (1a) for every \(n\ge1\).

To obtain (1b), substitute \(m=n-c\) into the lower bound (5).  The
gap between its first expression and \(c/2\) is

\[
\frac{c\{3n(n-c-1)+4c\}}{2n^2}\ge0.
\]

If \(P=\binom m2-S\) is the number of unordered pairs of disjoint
edges, the exact reserve has the sharper decomposition

\[
\frac{i_1^2+2i_2^2-3i_1i_3}{i_1^2}
=
\frac{c\{4n^2-3n(c+1)+4c\}}{2n^2}
+\frac{3P}{n}.
\tag{8}
\]

Thus components and disjoint edge pairs are the precise rank-two
forest reserve that a down-link argument can retain.

For \(n\le3\), rank two is not strictly rising.  When \(n=4\), strict
rise forces \(m\le1\); the two endpoint values on \(0\le m\le1\) are
\(40\) and \(42\), both larger than \(37n^2/25\).  This proves (1).

Equality in (7) forces \(n=5\) and \(m=4\).  Equality in (4) says
every pair of edges is incident.  A four-edge forest with that
property is \(K_{1,4}\), which directly attains \(37/25\).

The symbolic replay is
`rank2_forest_iso_floor_certificate_20260729.json`, produced by
`verify_rank2_forest_iso_floor.py`.

## Scope

This theorem supplies a sharp rank-two base reserve for the common
down-link/PFSR program.  It does not prove the corresponding floor at
arbitrary rank and does not by itself solve Erdős Problem 993.
