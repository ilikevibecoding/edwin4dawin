# Exact rank-2 pendant-hub CWF certificate

This note proves the rank-2 case of the pendant-hub closure inequality
needed in the current attack on Erdős Problem 993.  It is a local lemma,
not a proof of the full conjecture.

## Setup

Let an old planted root have \(Q\ge2\) children.  Deleting the root leaves
a forest \(B\) with \(Q\) components.  Write

\[
N=Q+z,
\]

so \(B\) has \(N\) vertices and \(z\) edges.  Let \(H\) be the induced
forest obtained by deleting the \(Q\) component roots as well, and put
\(D=xI(H;x)\).

Two elementary statistics are useful:

- \(W\) is the number of unordered adjacent pairs among the \(z\) edges
  of \(B\);
- \(c\) is the number of edges of \(B\) incident with one of its \(Q\)
  component roots.

The first coefficients are exactly

\[
\begin{aligned}
b_1&=N,\\
b_2&=\binom N2-z,\\
b_3&=\binom N3-z(N-2)+W,\\
d_1&=1,\\
d_2&=z,\\
d_3&=\binom z2-z+c.
\end{aligned}
\]

The formula for \(b_3\) is inclusion-exclusion on edges.  The graph \(H\)
has \(z\) vertices and \(z-c\) edges, which gives the formula for \(d_3\).

Attach a new hub above the old root and give it \(R\ge2\) leaf children.
Its excluded and included contributions are

\[
P=(1+x)^R(B+D),\qquad S=xB.
\]

In factorial coordinates let

\[
p_k=k![x^k]P,\qquad s_k=k![x^k]S.
\]

The rank-2 child-weighted factorial reserve is

\[
T=(R-1)(p_2^2-p_3p_1)
 +(R+1)(2p_2s_2-p_3s_1-s_3p_1).
\tag{1}
\]

## The bound

Direct exact expansion of (1) shows that \(W\) and \(c\) have the same
coefficient,

\[
-6\left(Q(R-1)+R^2+R+z(R-1)\right),
\tag{2}
\]

which is negative.  The forest gives the universal bounds

\[
W\le\binom z2,\qquad c\le z.
\tag{3}
\]

The first holds because adjacent edge pairs are a subset of all pairs of
the \(z\) edges; the second holds because the \(c\) root-incident edges are
a subset of the edge set.

Substituting the upper bounds (3), justified by (2), gives

\[
\begin{aligned}
T\ge{}&
6Q^2R^2+6Q^2Rz-Q^2R-6Q^2z-3Q^2\\
&+6QR^3+18QR^2z+12QR^2+6QRz^2+4QRz+9QR\\
&-6Qz^2+6Qz+3Q\\
&+6R^3z+6R^2z^2+12R^2z-Rz^2+15Rz\\
&+9z^2+9z.
\tag{4}
\end{aligned}
\]

After writing \(R=r+2\) and \(Q=q+2\), the right side of (4) is

\[
\begin{aligned}
{}&
6r^3q+6r^3z+12r^3\\
&+6r^2q^2+18r^2qz+72r^2q+6r^2z^2+84r^2z+120r^2\\
&+6rq^2z+23rq^2+6rqz^2+100rqz+221rq\\
&+35rz^2+311rz+350r\\
&+6q^2z+19q^2+6qz^2+110qz+193q\\
&+43z^2+331z+310.
\end{aligned}
\tag{5}
\]

Every coefficient in (5) is positive.  Hence \(T>0\) for
\(R,Q\ge2\) and \(z\ge0\).

## Independent replay

Run:

```powershell
python .\verify_rank2_pendant_cwf_certificate.py
```

The script reconstructs (1) from the independence-count formulas, checks
the coefficient (2), applies (3), and verifies the positivity of every
coefficient in (5) using exact SymPy arithmetic.

