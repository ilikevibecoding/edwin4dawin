# The full signed-reciprocal endpoint bridge is false

For the `F/G` pencil write

```text
V=vS, W=vT, A=C+cV, B=D+cW,
R=F_(s-1)(A,S)+uF_(s-1)(B,T).
```

After removing the forced common power `z^ell`, the desired
palindromization is

```text
R_0(z)+z^(m+1)R_0(1/z).
```

It was tempting to prove the stronger statement that every signed pencil

```text
R_0(z)-q z^(m+1)R_0(1/z), q>0,
```

is real-rooted.  That statement is false even in the strict `u>0` regime.

At

```text
(N,s,c,u,q)=(6,6,12,1/1000,9/10)
```

there is one forced raw power and

```text
R_0(z)=192+(603071/100)z+(2034392/125)z^2+(273783/50)z^3.
```

The discriminant of the quartic signed pencil is exactly

```text
-125853587816677788406356208825767/12207031250000000 < 0.
```

Thus neither full reciprocal proper position nor the equivalent all-signed
Hurwitz/self-interlacing route can prove the endpoint lemma.

This obstruction does **not** invalidate the required `F/G` target.  In the
same cell the positive palindromization has gamma coefficients

```text
(192,1073837/100,2480383/250)
```

and gamma discriminant

```text
1076928536809/10000 > 0.
```

Hence the surviving theorem must use the one-sign palindromization or the
direct gamma common-gap geometry; it cannot pass through all signed
reciprocal pencils.

The independent exact replay is
`verify_endpoint_signed_reciprocal_counterexample.py` and writes
`endpoint_signed_reciprocal_counterexample_exact_20260812.json`.
