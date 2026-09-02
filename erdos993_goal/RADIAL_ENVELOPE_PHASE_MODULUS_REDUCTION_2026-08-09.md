# Radial-envelope phase/modulus reduction

This note continues `MESH_INTERVAL_RADIAL_ENVELOPE_2026-08-09.md`.  It is an
exact all-degree reduction of the remaining nonreal-crossing question, not a
proof of the final reachability inequality.

Let

```text
Q(w)=w^2-Sw+D,
z=X+iY,  Y>0,
X^2+Y^2=R=L(L+1)/16,
W=Q(z-1)/((z+L)Q(z)).                                  (1)
```

At a hypothetical next-stage crossing, the mesh-interval envelope replaces
the full positive-root factor by

```text
A_s(z)=(z-s)/(z+L),  s>=0,                              (2)
```

on the same ray and with no larger modulus.  The recurrence equation has a
parameter `0<tau<1`, so

```text
F_s=A_s(z)Q(z-1)/Q(z)=(z-s)W
```

must be positive real and satisfy

```text
0<F_s<=tau<1.                                           (3)
```

Write `W=A+iB`.  The imaginary part of `(z-s)W` is zero exactly when

```text
s=X+Y A/B.                                              (4)
```

At such a phase match,

```text
F_s=-Y(A^2+B^2)/B.                                      (5)
```

In particular, positivity forces `B<0`, and (3) forces

```text
B+Y(A^2+B^2)<0.                                        (6)
```

The denominator of the left side of (6) is

```text
|(z+L)Q(z)|^2>0.
```

Exact expansion, followed only by the circle identity `X^2+Y^2=R`, shows
that its numerator is `Y E`, where

```text
E =-2DL+DS-4DX+D+2LR+LS^2-2LSX+LS-2LX
    +RS+3R+S^2-4SX+2S-4X+1.                            (7)
```

Therefore the complete nonreal-crossing mechanism is excluded if one proves

```text
E>=0                                                     (8)
```

at every *reachable phase-compatible* point.  All positive roots and their
mesh have disappeared from (7); their only remaining role is to constrain
which `(S,D,X)` can actually occur together.

The transition-disk numerator is

```text
T=4D-4R-2S^2+4SX-2S+4X>0.                              (9)
```

On the target circle, (7) has the exact decomposition

```text
E =(-2L+S-4X+1)T/4
   +(S-2X+2)(L^2+L+4S^2-16SX+8S-16X+4)/8.             (10)
```

On the sharp previous-radius face

```text
D=(L+1)(L+2)/16,
```

it factors further as

```text
E=(L+8S+9)((L+1)S-2(L+2)X+1)/8.                       (11)
```

Equations (10)--(11) identify the exact extra information still needed from
reachability.  The induction bound on `D` and the transition disk alone do
not determine the sign of `E`; relaxing away the coupling produces explicit
counterexamples.  Thus (8) must be proved using either the reachable `N_1`
path or the codimension-two generalized-Vandermonde minor.

The independent symbolic replay is
`verify_window_radial_envelope_phase_modulus_reduction.py`; it reports
`PASS_EXACT_PHASE_MODULUS_REDUCTION` in
`window_radial_envelope_phase_modulus_reduction_exact_20260809.json`.
