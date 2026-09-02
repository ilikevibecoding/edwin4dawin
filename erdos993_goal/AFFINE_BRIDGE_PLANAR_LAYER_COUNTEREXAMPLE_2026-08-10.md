# Counterexample to affine planar-layer positivity

The planar-layer strengthening proposed after the affine boundary-triple
reduction is false.  The counterexample is exact and occurs in both parities
of the bottom package.

## Refuted statement

Put

\[
 H_r=A^aT^b(B+rP),\qquad L=m+5,qquad s=z+w,
\]

and

\[
 D_{r,h}=[z^{L+r+1}w^{L+r+1}]s^hH_r,
 \qquad 0\le h\le r+1.                             \tag{1}
\]

The layer-pairing recurrence shows that coefficientwise positivity of every
`D_(r,h)` is equivalent to the proposed adjacent/diagonal planar-layer cone.
It would imply the affine boundary triple.  It is not true.

## Exact counterexamples

Take the bottom package with

\[
 m=120,\qquad x=240,\qquad r=80,
 \qquad h=0.                                       \tag{2}
\]

The original diagonal target is

\[
 L+r+1=m+r+6=206.                                  \tag{3}
\]

In even parity, exact extraction gives

\[
\begin{split}
D_{80,0}={}&-
9380274628598606819490937483958039740527654789082542720569494307432081689950729902852467002074290885427357407560623984457583652273352326216834345553862375264617488003386669351541787765543585633997375988357418308451500999375948463168541236954751340498348765385408.
\end{split}                                        \tag{4}
\]

In odd parity,

\[
\begin{split}
D_{80,0}={}&-
4595801545117901759872196933194100211798905986188053630845725737493937201311587292795687112250695935544689591676873457997826596816153587362056235791441682999840760813430700489589859966712528074272382035403302932172195978735798881333316183160420138107869739610012.
\end{split}                                        \tag{5}
\]

Thus the terminal diagonal layer `Z_(r,r)` is negative in both parities.

## Independent adjacent-package replay

Write

\[
 B=(1+s)Q+sR,\qquad P=sR,qquad R\succeq0.
\]

If

\[
 q_h=[z^{206}w^{206}]A^aT^bs^hQ,qquad
 \rho_h=[z^{206}w^{206}]A^aT^bs^hR,
\]

then

\[
 D_{80,0}=q_0+q_1+81\rho_1.                        \tag{6}
\]

The exact signed debt divided by the positive reserve payment is

\[
 1.002850486695209\ldots\quad\hbox{(even)},
\]

\[
 1.0029121593943036\ldots\quad\hbox{(odd)}.        \tag{7}
\]

The decimals are only displays; the replay stores both exact integer
numerators and denominators and asserts the strict cross-multiplied
inequality.

## Logical consequence

Equations (4)--(5) refute:

* positivity of every `D_(r,h)`;
* positivity of every `L_(r,j,eta)` in the earlier outer-layer notation;
* any injection proving the affine bridge by paying every homogenizer layer
  separately.

They do **not** refute either shifted predecessor or the affine bridge.  The
actual predecessor is a positive-binomial sum of all layers, and a negative
terminal block may still be absorbed by preceding layers.  The proof target
must therefore retain at least a boundary block or the complete homogenizer
sum.

## Exact replay

Run

```text
python verify_affine_bridge_planar_layer_counterexample.py
```

The record is
`affine_bridge_planar_layer_counterexample_exact_20260810.json`.  It checks
the value in three ways: direct extraction from `B+rP`, the adjacent
`Q,R` decomposition (6), and target-relevant sparse-kernel reconstruction.
