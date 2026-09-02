# Forest terminal-q3 m=1, j=3: independent y-slope theorem

Date: 2026-08-29

Status: `PASS_INDEPENDENT_EXACT_ALL_ORDER_FOREST_M1_J3_BOTH_Y_SLOPES_NONPOSITIVE`

For the two exact-`U1` retained lower branches used in the forest-base
target-`j=3` reduction, let `L_c` use the coupled extension floor

```
U0_c=(N-3+2y)/4+3y/(N-3)
```

and let `L_t` use the root-neighbour tangent four-set floor

```
U0_t=1+y+(h2+f4_tangent)/b.
```

The common q-envelope remainder has derivative

```
-3 p1(2p0+a+p1).
```

Since the anchor coefficient `A1` is nonnegative, the exact branch slopes
are

```
dL_c/dy = 2A1(N+3)/(N-3)-3p1(2p0+a+p1),
dL_t/dy = 4A1-3p1(2p0+a+p1),
dL_t/dy-dL_c/dy = 2A1(N-9)/(N-3)>=0.              (1)
```

It therefore suffices to prove the larger tangent slope nonpositive.  Put

```
G=-dL_t/dy=3p1(2p0+a+p1)-4A1.
```

The independent verifier reconstructs every row and obtains

```
dG/dW=14p1-12a=N^2+25N-12d+2h+14>0.              (2)
```

The structural wedge lower bound is `W>=C(d,2)+R`.  Substitute that lower
endpoint and parameterize the complete forest cone by

```
h=1+H,
d=1+D,
N=2h+d+R+L,
H,D,R,L>=0.
```

The resulting polynomial `G(C(d,2)+R)` has 126 power coefficients, all
strictly positive; its multidegree is `(5,5,5,5)` and its smallest
coefficient is `1/6`.  Its ordered exact coefficient stream has SHA-256

`292531D1552ECD853051F2D2C10718C207E073CA86CB966C767CD33FC7FC679F`.

Thus `G>=0`, so both branches are nonincreasing in `y` on every supported
`N>=31` structural cell.  The continuous `y` problem reduces rigorously to
the single upper-cap face.

This theorem does not prove that cap face, Newton degree `m=0`, the full
terminal payment, unimodality, or Erdos Problem 993.

Frozen artifacts:

- verifier: `prove_terminal_q3_m1_forest_j3_y_slope_independent_agent.py`
- verifier SHA-256:
  `DBB3FFAB587A581F7B87B5B4FD41709F7165EE919D38B66CDC7BED15B2162EB2`
- report: `terminal_q3_m1_forest_j3_y_slope_independent_20260829.json`
- report SHA-256:
  `DA388A15F27F77AAE4306925EBA770AE6AF052365B468D85686CD02CB5D9FDD5`

