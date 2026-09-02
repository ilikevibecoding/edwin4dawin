# Rank-8 Delta1 inserted-new-leaf gate for source order at least 38

Date: 2026-08-25

## Theorem

Let A be a tree with order at least 38, let v be a vertex of A, and
obtain A+w by attaching a new leaf w at v. The rank-8 Newton Delta1
terminal residual at the new root w is nonnegative.

Equivalently, with D=A-v, the full four-endpoint gate is nonnegative
for every forest D of order at least 37.

## Exact order-37 chain

The previously sealed source-order-39 gate handles D orders at least
38. Masks 0, 1, and 2 are already independently certified for every D
order at least 26. The new work is mask 3 at D order 37.

The sharp path-ratio chain gives

    mu4(D) >= (37-7)(37-8)/(37-3) = 435/17 = 25 + 10/17.

For a forest residual on q vertices, the independent-pair floor is
h(q)=C(q-1,2). Convex interpolation therefore gives

    Phi(435/17)
      = (7/17) C(24,2) + (10/17) C(25,2)
      = 4932/17.

The exact two-extension double count gives

    mu5(D) >= 2 Phi(mu4(D))/mu4(D) >= 3288/145.

The bound auditor independently proves that 2 Phi(t)/t is increasing
on every interpolation interval: on [q,q+1], its derivative multiplied
by t squared has numerator (q-1)(q+2), which is positive. It also
checks the exact improvement over the smooth transfer:

    3288/145 - (435/17 - 3 + 2/(435/17)) = 14/1479 > 0.

Thus the normalized variables satisfy

    3/16 <= x=d5/d6 <= 145/548,
    5/33 <= y=d4/d5 <= 17/87,

as well as the all-forest compatibility inequality
y <= 10x/(x+12).

## Exact F-order partition

The integer M=order(F), where F=A-N[v], is covered without gaps:

- M=0 through 20: edge-union floors, absolute caps, the rank-6
  shadow inequality, and exact rational Bernstein boxes.
- M=21,22,23: dedicated exact cap-ratio bridges. Each bridge uses the
  same exact M simultaneously in the edge-count floors,
  f4 <= (5/mu4(F)) f5, and 6 f6 <= (M-5) f5. The x-slab-dependent
  rank-6 switch is independently reconstructed.
- M=24 through 36: exact-M rank-4 ratio, rank-6 shadow, missing
  shadow, Q5 compatibility, four x slabs, and eight y slabs.

The final partition contains 850 rational regions and 1,018,200
tensor Bernstein coefficients. Every coefficient is strictly
positive; the negative and zero counts are both zero.

## First coarse failure

The independent-cap relaxation first fails at M=21, with five
negative coefficients and two negative vertices. Its minimum vertex
has u5=f5=0 but f4>0, contradicting the exact forest constraint
f4 <= (45/91)f5. The split-diagnostic audit reconstructs that vertex
exactly and proves it is not a realizable counterexample.

## Independent reconstruction and full gate

Every primary region is replayed by code that imports neither the
producer nor a probe. The auditor reconstructs the canonical endpoint
numerator with SHA-256
5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E
and checks the positive cleared denominator 2744 d5^4 (d6+f5).

The gate audit independently checks order-37 mask 3, the masks-0/1/2
containment certificate, the source-order-39 upper gate, and separate
concavity in the two top variables. Since order(D)=order(A)-1, the
source cutoff is order(A)>=38.

## Sealed artifacts

| Artifact | SHA-256 |
|---|---|
| small producer | 473B49227528DF77F873B7E611F485D0A1F1EF40422343FB53E4FEC36A727B27 |
| small report | 4588038446273FF703AB59F43472DC8BA2EEF1E5E9EC2FDD7553D8852BFD07DD |
| small auditor | F1D7567DD55B92BB00306504D089E3828A417D63DA46561F44B4F8037C2FD1F6 |
| small independent audit | BC4B6038DE3B94E2C3060417E495DCA674978D44D1FAC08A073B9F4493C49342 |
| M21 bridge producer / report | F54FF3C4308192BD232E09AA29CDB05D94A4F396C1BC33D40B39B7FABD55C4B1 / 1EC9699A830E9B4F0727568BD975D83270CBA4F7B947B4EEB3A54A2FB025AFCC |
| M21 bridge auditor / audit | 38B613C175E5B81CB26EE94A86AEE419C96065A11329F4619FAF31D868C95CCF / BE8A89377A719040B518AB6FC96A13E0C8ACCB775AC73A7702314DAFECD6CCF5 |
| M22 bridge producer / report | D6575903DB49781562A023D7FFA41D977E48637F37D2ABA2617063A971339B00 / 7322332BA25F07C212468357CF94B6F8D1A41D3834C0440F0B14127180B7BCD9 |
| M22 bridge auditor / audit | C0682B71B38210927301B3BF7A32DF19CD990488F3F42C49A81CDD23E64FE10E / B2A9384EFB633454BC99A79732EC44ABBBDB24BCCCAC3A5EB50C6A9423B34B39 |
| M23 bridge producer / report | 12D8ECE6CBAC73F99412374ABADAA88FFA57C186CB54E4E3EC2BC7479E07C78E / 2A51A4130950473F81C88C6106C0D20303C0B9CDAEEAEFC9F0697EE2D943587E |
| M23 bridge auditor / audit | DF6E3E8F6A73C098E7241B8F0286E19ACCE861E39223E1F7C383D6969EA3B803 / 8F826B180E8697AF3A68265BED2D6DF59DC755BE11045299A632E65172A6B6A4 |
| ordinary exact producer / auditor | 1FA8893C50D9C0FBD18839BA9C630E5B6A1A5A7DC6775C759AD557F1762EA1ED / 1166C4ADA71D136C4E41E820039888144549199200B80A5E9B6381111B3149C0 |
| bound-chain source / report | 5F3E848DC823033ACFA23335F39DCDD7B28C76135B3AB96C72DCF7FBDA21AAD8 / EBA3CC04FCEA010905624CC15BD3D4F927BF0E0B6571ABD1D63403BEDCA6C3AB |
| split diagnostic source / report | 20E31D8E906AECD04629D90278EB49FBBDCAD836F3469AB37030CE979659EE15 / 1C77F20BC936894147BFBB57170916E40F991450BB933998E67FB576029F3A86 |
| mask-3 assembler / report | 130A33A0A48A299DE9583C0A214C1295764518EBD65830A2AFA3B9FBC2466726 / 2211E11221BD888678A85A058067C82C5E991E606AE7BDC8A8B376D3D5F961BE |
| mask-3 assembly auditor / audit | AA449FE997407222BA752A88F634A942BCBB76A3BE870F8C4ECE2F85D0C94B65 / 22CB24B2FFB5DEAF4E6D258A6726B96FED261743369EEAB2787D3C38B23EB96C |
| source-38 gate assembler / report | D9E68B55FFD0C8C03D2B39C252A7CBF4BA57A56EB9B87C1B54639BCC171A9B1D / 5F54DF5D79678E62F2D079479028309918B849EEADD3ADBBA2D230DD91A989AD |
| source-38 gate auditor / audit | ED7292C9BB81F2F8A65F8DDB92A76C7722B41B412A7FEC377C68AD25FE063339 / C684C41F9E2635B661468545F924E490C4F3660DA0803F86A9216B99A18F870E |

The analytic chain pins:

- FOREST_V6_ALPHA10 theorem/source/report:
  D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF /
  2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947 /
  5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4.
- TREE_RANK45_PATH_RATIO theorem/verifier:
  7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528 /
  AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C.
- RANK5_FOREST_THREE_HALVES theorem/verifiers:
  CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D /
  56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE /
  06BD1AA9355B1C07DE5B9087AFEE0477D9C583E0ED943EA86FC332FB692A8194.

## Scope

This theorem closes only the Delta1 inserted-new-leaf gate for source
order at least 38. It does not itself settle the remaining Delta2/3,
old-root increment, connected-Q8, forest-Q8, rank-eight PGC, or full
Erdos Problem 993 obligations.
