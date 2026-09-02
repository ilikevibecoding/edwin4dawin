# Affine bridge: Euler transfer and compensated boundary blocks

The terminal planar layer of the affine bridge can be negative, but the
complete homogenizer at the same large parameter point is strongly positive.
This note gives an exact summation-by-parts normalization of the surviving
sum, audits the most natural positive cone, and isolates the sharper growing
weighted-prefix target.

It is a reduction and route audit, not an all-parameter proof of the affine
bridge.

## 1. Exact reassembled value at the layer counterexample

At the bottom-package point

\[
 (m,x,r)=(120,240,80),\qquad D=m+r+6=206,
\]

put

\[
 U_r=[z^Dw^{D-1}]A^aT^bV^r(B+rP),\qquad
 Z_r=[z^Dw^D]A^aT^bV^r(B+rP).
\]

Multiplication by `V=1+z+w` and symmetry give the exact recurrence

\[
 2U_r+Z_r=[z^Dw^D]A^aT^bV^{r+1}(B+rP).             \tag{1}
\]

Adding the next reserve gives

\[
 2U_r+Z_r+\mathcal R_{r+1}(D,D)
 =[z^Dw^D]A^aT^bV^{r+1}(B+(r+1)P).                 \tag{2}
\]

Although the unhomogenized terminal layer `D_(80,0)` is negative in both
parities, every quantity in (1)--(2) is positive.  The exact headline values
are as follows; the JSON replay also records `U_r` and `Z_r` separately.

Even parity:

```text
2U_r+Z_r =
38090848447135641913030239643143370112268844407072399454890291504537764543145353760628609821336465186994311117958293810619773898649677736466547833630839804675070890765274585628185221455165254010086950803731076756594575827080047587805584205472049375543941056736044424242276240

calR_(r+1)(D,D) =
4273630784370072799672506418759374752274128571954360291215270895413986853364362891329651809256752125385678380750597806461848327654548728553257676766436332927378841130804450736235773087544153107329204798788598530108420279527171769441949734019676375181067536591267639267790240

full boundary triple =
42364479231505714712702746061902744864542972979026759746105562399951751396509716651958261630593217312379989498708891617081622226304226465019805510397276137602449731896079036364420994542709407117416155602519675286702996106607219357247533939491725750725008593327312063510066480
```

Odd parity:

```text
2U_r+Z_r =
15333407088490234723368539381324350403494401940425404051519375193009164286830640388895148885911374555687486787232735461112390334653400017057949390220389768273191457332349982095020003204650299673030387751998350187954578150063005526977208213295825934454514409005893529566185872

calR_(r+1)(D,D) =
1700927709074115759751426559361942637943445469096149043279667410956350085037901994955579972211212431693816571819705376296500866408753751851314529061368330973351611195775924851692748033026167325772143335577527154207586365004576976832126815069201341488389084866862187723843728

full boundary triple =
17034334797564350483119965940686293041437847409521553094799042603965514371868542383850728858122586987381303359052440837408891201062153768909263919281758099246543068528125906946712751237676466998802531087575877342162164515067582503809335028365027275942903493872755717290029600
```

Thus the first exact counterexample to terminal-layer positivity is not a
counterexample to either the reassembled predecessor or the affine bridge.

## 2. Euler transfer eliminates the explicit reserve coefficient

Write

\[
 s=z+w,\quad V=1+s,\quad X=A^aT^b,
\]

and use the exact kernel decomposition, valid in the group and bottom
packages and in both parities,

\[
 B=VQ+sR,\qquad P=sR,\qquad R\succeq0.             \tag{3}
\]

For bridge order `k>=0`, let

\[
 D=m+k+5,
 \qquad
 F_k=[z^Dw^D]XV^k(B+kP).                            \tag{4}
\]

Let `E=z partial_z+w partial_w` be the total Euler operator.  Since

\[
 E(V^{k+1})=(k+1)sV^k,                              \tag{5}
\]

(3) gives

\[
 V^k(B+kP)=V^{k+1}Q+R E(V^{k+1}).                  \tag{6}
\]

For arbitrary polynomials `F,G`, the product rule and diagonal extraction
give the finite algebraic adjoint identity

\[
 [z^Dw^D]G E(F)
 =[z^Dw^D]F\{2DG-E(G)\}.                            \tag{7}
\]

Indeed, the coefficient of `z^D w^D` in `E(GF)` is exactly `2D` times
the same coefficient in `GF`.  Therefore there is no analytic integration
boundary and no limiting assumption in (7).

Apply (7) to `F=V^(k+1)` and `G=XR`.  Equations (4)--(7) yield the exact
Euler-transfer theorem

\[
 \boxed{
 F_k=[z^Dw^D]V^{k+1}\{XQ+(2D-E)(XR)\}.}             \tag{8}
\]

This removes the explicit factor `kP` and places the whole bridge under one
positive `V^(k+1)` convolution.

## 3. Exact homogeneous layers and weighted prefixes

Define

\[
 q_h=[z^Dw^D]s^hXQ,\qquad
 \rho_h=[z^Dw^D]s^hXR,
\]

and let `e_h` be the `s^h` layer of the transferred source in (8).  Applying
the product rule to `E(s^hXR)` gives

\[
 \boxed{e_h=q_h+h\rho_h.}                           \tag{9}
\]

Expanding `V^(k+1)=(1+s)^(k+1)` in (8) now gives

\[
 \boxed{
 F_k=\sum_{h=0}^{k+1}{k+1\choose h}(q_h+h\rho_h).} \tag{10}
\]

For `0<=H<=k+1`, put

\[
 P_H(k)=\sum_{h=0}^H{k+1\choose h}(q_h+h\rho_h).   \tag{11}
\]

A sufficient compensated-block statement is: for some `H`,

\[
 P_H(k)\ge0,
 \qquad q_h+h\rho_h\ge0\quad(H<h\le k+1).          \tag{12}
\]

Unlike termwise positivity, (12) permits the full weighted low-`h` boundary
block to pay its internal signed debt.

## 4. Two over-strong cones are false

The most attractive strengthening of (8) would make the transferred source

\[
 J_k=XQ+(2D-E)(XR)                                  \tag{13}
\]

coefficientwise nonnegative in the southwest square `0<=i,j<=D`.  This is
false.  An exact audit of 338,072 coefficients in 16 hard records finds a
failure in every record.  For example, in the even group package at
`(c,m,x,k)=(1,3,0,4)`, `D=12` and

\[
 [z^{12}w^{12}]J_k=-63,393,108.                    \tag{14}
\]

At the northeast corner the multiplier `2D-i-j` vanishes, so the positive
reserve cannot repair a negative `XQ` coefficient before the `V` convolution.

A fixed-size boundary block is also impossible as a route suggested by the
data.  On 20 hard records through `k=50`, the least successful `H` in (12)
reaches 14.  At the exact bottom ray `(m,x)=(120,240)`, it reaches 31 by
`k=100` in both parities.  Thus one cannot replace the complete homogenizer
by a universal block of, say, two or three terminal layers.

## 5. Surviving weighted-prefix pattern

The finite exact audits nevertheless expose a sharper pattern:

* all 20 hard records through `k=50` have `F_k>0`;
* on every audited order the negative `e_h` form an initial interval
  `h=0,1,...,h_*`, never a separated sign pattern;
* a larger weighted prefix `P_H(k)` becomes positive before all remaining
  layers become nonnegative;
* on `(m,x)=(120,240)` through `k=100`, both parities have no full-sum
  failure;
* at `k=81`, which is exactly the next central value associated with the
  `r=80` terminal-layer counterexample, the negative interval is `0<=h<=18`
  and the least successful block is `H=22` in both parities;
* the `k=81` values agree exactly with the independent direct recurrence
  computation in Section 1.

Consequently the viable theorem suggested by this normalization is not
coefficientwise positivity or a fixed local block.  It is a weighted-prefix
and single-crossing theorem for the sequence

\[
 e_h=q_h+h\rho_h.                                   \tag{15}
\]

Proving that theorem still requires a path-specific TP, ratio, or injection
argument.  The finite sign pattern is evidence, not an all-order proof.

## 6. Replays and hashes

Run:

```text
python verify_affine_bridge_reassembled_large_ray.py
python verify_affine_bridge_euler_transfer_identity.py
python probe_affine_bridge_euler_transfer_cone.py
python probe_affine_bridge_euler_transfer_blocks.py
python probe_affine_bridge_euler_transfer_large_ray.py
```

The exact identity replay checks (3) over all sparse source coefficients in
all four package/parity cases, nine Euler kernel identities, 108 diagonal
adjoint identities, and 756 homogeneous-layer identities.  It reports
`PASS_AFFINE_BRIDGE_EULER_TRANSFER_IDENTITY`.

SHA-256:

```text
verify_affine_bridge_reassembled_large_ray.py
FA60493584ACB84C9BD37B58DBBC3D3CECE7C2BA6F4CAAC24E4A02DB2A5E9FE0
affine_bridge_reassembled_large_ray_exact_20260811.json
0259B6FFE337F504CEF678C0422AFE390B8A02A90A81A71AE2E62DC04FC49174

verify_affine_bridge_euler_transfer_identity.py
AAA4B5F3821E7FA1F7C819C57A5C1AEE35326409E634D6FF39EA10657AF1F82E
affine_bridge_euler_transfer_identity_exact_20260812.json
18100460799C18BEEC55D041EAD20CF28FE4B81512E884D9E46DCC73F8C64955

probe_affine_bridge_euler_transfer_cone.py
534A61B81748B7A1A293084EDD047A5D0E2748CEA1CD017AA34816060EC17919
affine_bridge_euler_transfer_cone_probe_20260811.json
10A3546B926D1F7A64E5526DCA88ADFCDE20916A3900ADB0923422E04281BC8E

probe_affine_bridge_euler_transfer_blocks.py
8C962E47F0E648603A6558972322FE4B981422561624F32E48269F51198C966D
affine_bridge_euler_transfer_blocks_probe_20260812.json
67BBB0B8E7474327438DA5EDB76B8720948160DDE20E2CDEDDD559A1F714FB17

probe_affine_bridge_euler_transfer_large_ray.py
505B57D72FC0E99D82D87AC80DB92BFAF8DB7F95CE30E3FEB71E5241CED8C1A8
affine_bridge_euler_transfer_large_ray_exact_20260812.json
0058699A4C30BE93C91FD0ABA1BBFC0E04ECF9D2B0EF3E781EDAE4EDC7550788
```
