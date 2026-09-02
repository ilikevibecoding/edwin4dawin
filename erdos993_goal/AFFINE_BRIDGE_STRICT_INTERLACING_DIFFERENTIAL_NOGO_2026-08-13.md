# Affine bridge: strict-interlacing differential no-go and extended path replay

The direct reserve target remains

\[
 Q_h={a_h^3a_{h+2}\over a_{h-1}a_{h+1}^3}\ge1,
 \qquad a_j={n\choose j}\rho_j,                    \tag{1}
\]

and the stronger Euler-coupled candidate is

\[
 Q_h\ge1-{g_{h+2}\over hn},
 \qquad g_j={e_j\over\rho_j}.                     \tag{2}
\]

This note gives two exact results.  First, a new 208-record replay finds no
failure of (1) or (2) in any genuine reflection window it reaches.  Second,
there is a theorem-level abstract counterexample even when the reserve and
Euler polynomials strictly interlace and are coupled by a literal Euler
differential operator.  Thus proper position is still not the missing path
input.

## 1. Extended exact path replay

The replay covers both parities and the parameter lattice

```text
group: 1<=c<=3, 3<=m<=8, x in {0,1,2,2m};
bottom: 3<=m<=10, x in {0,1,2,2m};
0<=k<=20.
```

For every order it reconstructs the literal path-source layers

\[
 \rho_j=[z^Dw^D](z+w)^jXR,
 \qquad e_j=[z^Dw^D](z+w)^jX\{Q+jR\}.
\]

If `t` is the last negative Euler layer, only the genuine outward-reflection
left windows

\[
 1\le h\le t-2                                             \tag{3}
\]

are retained.  Hence `e_(h+2)<0` is asserted from the actual reconstructed
source, not imposed as a free sign condition.

There are `64` such windows among the `208` records.  Exact integer/rational
arithmetic gives

```text
failures of Q_h>=1:                         0
failures of Q_h>=1-g_(h+2)/(hn):           0
least Q_h:                                  1.1204419343344445...
least hn(Q_h-1)/(-g_(h+2)):                 4.401023703086073...
```

The least direct quotient occurs in the bottom/odd record
`(m,x,n,h,t)=(10,20,19,2,4)`.  The least coupled ratio occurs in the
bottom/odd record `(m,x,n,h,t)=(10,20,20,1,4)`.  This is independent exact
finite evidence on a broad small-parameter lattice; it is not an all-order
proof and does not supersede the earlier 953-window hard census.

## 2. A strict-interlacing differential counterexample

Let

\[
 \mathcal R(y)=\prod_{i=1}^{18}(1+r_i y),
\]

where the distinct positive rational parameters are

\[
\begin{split}
\{r_i\}={}&\{1,101/100,3,301/100,5,10,20,2001/100,\\
&1/1000,2/1000,\ldots,10/1000\}.
\end{split}                                                \tag{4}
\]

Write `rho_j=[y^j]R(y)` and define the literal Euler companion

\[
 \mathcal E(y)=y\mathcal R'(y)-8\mathcal R(y).              \tag{5}
\]

Then

\[
 q_j=-8\rho_j,
 \qquad e_j=q_j+j\rho_j=(j-8)\rho_j,
 \qquad g_j=j-8.                                           \tag{6}
\]

Consequently:

* `rho` is a strictly positive PF-infinity row of degree `18`;
* the negative Euler indices are exactly `0,...,7` and `e_8=0`;
* for `t=7`, `n=18=2t+4`, so the genuine endpoint slack is retained;
* at `h=5`, `e_(h+2)=e_7<0`;
* `g` is strictly increasing and has zero discrete curvature.

The polynomial relation is substantially stronger than the abstract sign
assignment in the previous no-go.  Put `alpha_i=-1/r_i`, the distinct
negative roots of `R`.  At each root,

\[
 \mathcal E(\alpha_i)=\alpha_i\mathcal R'(\alpha_i).        \tag{7}
\]

These nonzero values alternate in sign at consecutive `alpha_i`.  Therefore
`E` has one root in every consecutive negative-root gap of `R`.  Moreover
`E(0)=-8R(0)<0`, while the leading coefficient of `E` is positive, so its
remaining root lies in `(0,infinity)`.  Degree counting proves that these are
all its roots.  Thus `E` strictly interlaces `R` and has exactly one positive
root.

Nevertheless, for the binomially weighted reserve row with `n=18`,

\[
 Q_5=
 {107786091578648196731981298616054230236285663505570142386639160255562024668727588414145
 \over
 114241284718582335236002778501194756434941073859516471133434671411562099706493884340148}
 =0.943495093250784\ldots<1.                              \tag{8}
\]

Since `-g_7=1`, the normalized coupled ratio is

\[
 90(Q_5-1)=-5.085441607429447\ldots<1,                    \tag{9}
\]

so (2) fails as well.

## 3. Consequence

Euler negativity, endpoint slack, PF-infinity, distinct reserve roots,
strict reserve/Euler interlacing with one positive Euler root, determinant
orientation, affine negative-side convexity, and even the literal
differential relation `E=yR'-8R` do not imply (1) or (2).

This preserves and strengthens the abstract PF no-go.  An all-order proof
must use the exact finite-support path relation between the actual `Q` and
`R` kernels (or an equivalent path-specific coefficient identity), not only
univariate proper position or a generic Euler differential coupling.

## 4. Replay

Run:

```text
python verify_affine_bridge_direct_curvature_extended_lattice.py
```

It writes
`affine_bridge_direct_curvature_extended_lattice_exact_20260813.json` and
reports

```text
PASS_EXACT_EXTENDED_PATH_LATTICE_AND_STRICT_INTERLACING_NO_GO
```

SHA-256:

```text
verify_affine_bridge_direct_curvature_extended_lattice.py
E05A97F734C89CEEE78EAEF2EB9FB4103672E7F6D80D159E779E36FB9FCACEDB

affine_bridge_direct_curvature_extended_lattice_exact_20260813.json
4FA882719A674DA967072086FA791FCCDAF191458DE55567DAE45CAF20625EB0
```

The counterexample and interlacing certificate are all-order exact.  The
64-window path replay is exact finite evidence only.  No genuine path-source
counterexample was found, and the affine bridge remains open.
