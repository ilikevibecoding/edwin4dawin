# Path–isolate P4: direct quotient-coefficient identity

Fix \(c,m,x,\epsilon\), put
\[
f_i=
\frac{D_\epsilon(c,m,i-1,x)}
{\binom{2m+\epsilon}{m}}
\qquad(i\ge0),
\]
and let
\[
A_r=\Delta^r f_0,\qquad
F(z)=\sum_{r\ge0}A_rz^r.
\]
Write the formal quotient
\[
F(z)=(1+z)^E P(z),\qquad
E=2c+2m+x-1,
\]
where
\[
P(z)=\sum_{r\ge0}B_rz^r.
\]
Then, without assuming that the division has zero remainder,
\[
\boxed{
B_r=\sum_{i=0}^{r}
(-1)^{r-i}\binom{E+r}{r-i}f_i.
}
\tag{1}
\]

## Proof

The ordinary generating function of the values \(f_i\) is related to
the Newton polynomial by
\[
H(y):=\sum_{i\ge0}f_i y^i
=\frac1{1-y}F\!\left(\frac{y}{1-y}\right).
\]
Set \(y=z/(1+z)\).  Then
\[
P(z)
=(1+z)^{-E-1}
H\!\left(\frac{z}{1+z}\right)
=\sum_{i\ge0}
f_i z^i(1+z)^{-E-1-i}.
\]
Taking the coefficient of \(z^r\) gives
\[
[z^{r-i}](1+z)^{-E-1-i}
=(-1)^{r-i}\binom{E+r}{r-i},
\]
which proves (1).

## Significance

Formula (1) removes the recursive formal division by the large factor
\((1+z)^E\).  Every quotient coefficient is a single explicit
weighted boundary transform of the support-diagonal values.  For
\(r=5\),
\[
B_5=
-\binom{E+5}{5}f_0
+\binom{E+5}{4}f_1
-\binom{E+5}{3}f_2
+\binom{E+5}{2}f_3
-(E+5)f_4+f_5.
\]
This identity enabled the exact sparse certificate for the sixth
quotient coefficient without expanding the complete Newton
polynomial.

