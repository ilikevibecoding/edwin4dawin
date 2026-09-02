# Affine bridge layer pairing and diagonal reduction

Let

\[
 H_r=A^aT^b(B+rP),\qquad s=z+w,qquad L=m+5,
\]

and define the two outer-homogenizer layers

\[
 U_{r,j}=[z^{L+r+1}w^{L+r}]s^{r-j}H_r,
\]

\[
 Z_{r,j}=[z^{L+r+1}w^{L+r+1}]s^{r-j}H_r,
 \qquad 0\le j\le r.                               \tag{1}
\]

The kernels and outer factors are symmetric in `z,w`.

## Exact pairing

For any symmetric polynomial `F` and any `D`,

\[
 [z^Dw^D](z+w)F
 =[z^{D-1}w^D]F+[z^Dw^{D-1}]F
 =2[z^Dw^{D-1}]F.                                  \tag{2}
\]

Apply (2) to `F=s^(r-j-1)H_r`.  For `0<=j<r`,

\[
 \boxed{Z_{r,j}=2U_{r,j+1}.}                       \tag{3}
\]

Thus the diagonal and adjacent layer families are not independent.

## Boundary assembly

The outer expansion gives

\[
 U_r=\sum_{j=0}^r{r\choose j}U_{r,j},\qquad
 Z_r=\sum_{j=0}^r{r\choose j}Z_{r,j}.              \tag{4}
\]

Use (3) in the second sum and then Pascal's identity.  One obtains

\[
 \boxed{
 2U_r+Z_r
 =2\sum_{j=0}^r{r+1\choose j}U_{r,j}+Z_{r,r}.}     \tag{5}
\]

This halves the independent layer inequalities and isolates the one terminal
diagonal selector `Z_(r,r)`.

There is an equivalent all-diagonal form.  Put

\[
 D_{r,h}=[z^{L+r+1}w^{L+r+1}]s^hH_r,
 \qquad 0\le h\le r+1.                             \tag{6}
\]

Then

\[
 D_{r,0}=Z_{r,r},\qquad
 D_{r,h}=2U_{r,r+1-h}\quad(1\le h\le r+1),         \tag{7}
\]

and (5) becomes

\[
 \boxed{
 2U_r+Z_r=\sum_{h=0}^{r+1}{r+1\choose h}D_{r,h}.}  \tag{8}
\]

Consequently the surviving planar-layer lemma can be stated with one family:

\[
 \boxed{D_{r,h}\ge0\quad(0\le h\le r+1).}         \tag{9}

Together with the positive next reserve, (8) proves the affine bridge.

## Correct adjacent-package form

The exact affine kernels have

\[
 B=VQ+P=(1+s)Q+sR,qquad P=sR,quad R\succeq0.
\]

Therefore

\[
 D_{r,h}
 =[z^{L+r+1}w^{L+r+1}]A^aT^b
 \left\{s^hQ+s^{h+1}\bigl(Q+(r+1)R\bigr)\right\}. \tag{10}
\]

Formula (10) explains both the successful finite pattern and the failure of
the cleaner full homogenization: the signed `s^hQ` layer must remain paired
with the immediately following reserve-bearing layer.  Separating them is
false in exact examples.

## Replay and status

Run

```text
python verify_affine_bridge_layer_pairing_recurrence.py
```

The record is `affine_bridge_layer_pairing_recurrence_exact_20260810.json`.
It checks (2) as a formal identity in independent symmetric coefficient
labels through degree 64 and checks every Pascal assembly through order 64.

The recurrence and reductions above are exact theorems.  Inequality (9), or
equivalently the adjacent-package inequality (10), remains unproved.
