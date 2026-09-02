#!/usr/bin/env python3
"""Fail-closed read-only integration audit for the current connected-Q8 lane.

The script never rebuilds a long certificate.  It pins the completed rank-7
dependency, the rank-8 terminal coefficient packages, and both literal-family
finite splices, then derives the exact coefficient/order cells still missing
from the terminal-broom induction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent

EXPECTED = {
    "RANK7_PGC_ALL_ORDER_THEOREM_2026-08-20.md":
        "2C408B88932157B7F1BFDF0F548335D218F7683517D2F67B4B0DC2CFF1A677B6",
    "rank7_integration_readonly_20260820.json":
        "E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59",
    "rank7_final_integration_independent_audit_exact_20260820.json":
        "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
    "RANK8_Q8_TERMINAL_DELTA4_ALL_ORDER_THEOREM_2026-08-20.md":
        "46CD5154C668A97B0C2FCA904B22E1159654DC75F116FFF90EB326BBC6AF60FA",
    "rank8_delta5_delta4_full_branch_independent_audit_20260820.json":
        "55B91CF39CE16808C04BA64C6093CEEFEBF6DD244B9842ADE189D53EDE50D32D",
    "rank8_q8_terminal_delta5_all_order_replay_20260817.json":
        "E56F800A84E8E4A01A35EDEE75FF9C4F0ACF40EF9B9E14C71531C585CBD65569",
    "rank8_q8_terminal_delta6_all_order_replay_20260817.json":
        "C75A3305BE553C889624CF24EFBA36AB5DE84543852352A28B24AC288E0CF103",
    "rank8_q8_terminal_delta7_all_order_replay_20260817.json":
        "4F8C9368BB791096016C58E10312172A33062F4AF1B2809E09913D4AEFE0E4B2",
    "rank8_q8_terminal_delta8_exact_20260817.json":
        "DCB204A50F869531A59BD20CDF5DB90F735CB8C2A864677D9F144C0C9BB44FB6",
    "rank8_q8_terminal_delta9_11_exact_20260816.json":
        "8A20547DF9E018E524F9C55DDC3946A967AED4F0AB2F2D140C2573BB4305B34C",
    "rank8_q8_terminal_reduction_exact_20260816.json":
        "8B4EA1324E235415E0EF8FF753ED85B10A5BABA2F48A08A55ED4CB24978FC16F",
    "rank8_terminal_delta04_finite_n1_n22_exact_20260820.json":
        "4C8FD019F03D42208F56751BFB896021B1F4A02C699D5F26CE2636C80B59C4AB",
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N23_FINITE_THEOREM_2026-08-20.md":
        "E2055AB72D621CB0D78264002B5E93ED9E33F6811B6B5CE6F6DC7FC7BDA4F217",
    "verify_rank8_terminal_delta03_finite_n23.rs":
        "04637D9DAC26F23C0A7839C57D6BC3D7243D2A3D06240D17A5A18B84AE09788E",
    "verify_rank8_terminal_delta03_finite_n23.exe":
        "4C1EC4BFEA318F2B39910239F46B6A0E144A9AEA69D544E6FBF6745B3A7EEA79",
    "rank8_terminal_delta03_finite_n23_primary_20260820.log":
        "E092FBD72CE51C4AB55DE6C2A0BBFF69DEFC368D659A66CF9E013E6F176067D6",
    "rank8_terminal_delta03_finite_n23_primary_20260820.err.log":
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "audit_rank8_terminal_delta03_finite_n23.py":
        "F026F75B38DF3647ECF6DE04F479DE9CB006552925E2772AD7CB32135B4CEFA3",
    "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json":
        "6161599896A4E9991B9D6E0B131D4075EC3C4230B9DB0A038CAF6108747427F4",
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N24_FINITE_THEOREM_2026-08-20.md":
        "C362E3B89998E6AFB00D3A8575F8FCA88398C3EFE6D017DEEA0A08BFEBF5F725",
    "verify_rank8_terminal_delta03_finite_n24.rs":
        "02B51B72B4E75B332E3B4DFBC1497AD2C84E307B082EE49152D42D1B18E09468",
    "verify_rank8_terminal_delta03_finite_n24.exe":
        "398E61190A52F26ED961F04595CD3058BA5A85379DE49F5FD17A625C7253ECF1",
    "rank8_terminal_delta03_finite_n24_primary_20260820.log":
        "8FF4CE82AD545051D1259149CE4875D2CA5E6E3EDFF3314720FF00530CB9BFC4",
    "rank8_terminal_delta03_finite_n24_primary_20260820.err.log":
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "audit_rank8_terminal_delta03_finite_n24.py":
        "2BE60B8C9814F5F64E61B1FD68A4FE521CF2FC877D94E333BDC061811E9B8097",
    "rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json":
        "60F0DA73B3B6A749EE48E6D54DA2B044A97054235E5A0D04E12B4CD03B616428",
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N25_FINITE_THEOREM_2026-08-20.md":
        "EA3EA96E5626A354885382B936EC40075A2996938CA6AF2CE72170E092F0B7B1",
    "verify_rank8_terminal_delta03_finite_n25.rs":
        "431A54BC6C37EF884074D4ADBD805AE8614A78BB773F37AE4BC84EB0DF7E0E8A",
    "verify_rank8_terminal_delta03_finite_n25.exe":
        "4A91610ED7D468D62EA1FC81B1A199EE23338FE4F22E3AFDA7E198E3B04F7110",
    "rank8_terminal_delta03_finite_n25_primary_20260820.log":
        "030E2A06BCEF8A4FFA09B366BA699245C244F94298156993A0BC6411BFAE206F",
    "rank8_terminal_delta03_finite_n25_primary_20260820.err.log":
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "audit_rank8_terminal_delta03_finite_n25.py":
        "285A7623620B7697FDAF302C33EDD1D2AE4C3AAF5A56B240B020DBC643160F3B",
    "rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json":
        "EDC9574415B23BB596074536734F33123D909258E9BC2D1C713036E426687F72",
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N26_FINITE_THEOREM_2026-08-20.md":
        "1ED3E2206E8CC6F541437BC477CF5EE9C863DD535003EF8D4F9ACF0E2123A794",
    "verify_rank8_terminal_delta03_finite_n26.rs":
        "B9BA86D5FCA5A36438116670D0D937D076008F37B3FC7101D7653287F4B1B9FC",
    "verify_rank8_terminal_delta03_finite_n26.exe":
        "C9911356BE65E542BA15FF163DC277180B84E5C5C651931B63B9ABE4736C1A7F",
    "rank8_terminal_delta03_finite_n26_primary_20260820.log":
        "0A4E319110FB2937DE97595B24E4E4DFA5DBA7B2F2A6C0FAD3C46E523044DA61",
    "rank8_terminal_delta03_finite_n26_primary_20260820.err.log":
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "audit_rank8_terminal_delta03_finite_n26.py":
        "99593A501A92CDB692285E4D528B5C37CC302AFCAA05BE297DCD15C2460C016B",
    "rank8_terminal_delta03_finite_n26_independent_audit_exact_20260820.json":
        "8B167C350391FCE93887BE47E4327DD608E272553879669A0DCD3E32D66A1101",
    "rank8_terminal_delta0_negative_witnesses_exact_20260820.json":
        "E21B3430DBDC951705AF94E86838171BAB847E4B87824804B7C0473F7E08B768",
    "RANK8_Q8_TERMINAL_FULL_SHIFTED_FINITE_GUARD_2026-08-20.md":
        "D6AE22F9681F7C8AEC8022CF6F77D62920C55D7EA42E12D7E416C3A363B32858",
    "rank8_terminal_full_shifted_q8_n1_n20_exact_20260820.json":
        "8F4E342164068CD75B85486B4CA4CB562AAA7EDC9F53714F4E03601E13164060",
    "RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_THEOREM_2026-08-20.md":
        "897E3D7C26362111DD82BBC4BAECD31DF0AECB40472468870B7238CF4F959F44",
    "rank8_exceptional_shifted_matching_quotient_exact_20260820.json":
        "275FC6496850418042244524987238FCE05FA381440ECF40BAC90CB2EB66E724",
    "rank8_exceptional_shifted_matching_quotient_independent_audit_exact_20260820.json":
        "DE7D906401C3547C42900899CBB52B4E85A345340278BE72F226D7760F4C2DAC",
    "rank8_pgc_matching_quotient_boundary_exact_20260817.json":
        "E61C51E0D37569C617DBE23AC3E88BA1A89DD188B3FC629264303714D1679A85",
    "verify_rank8_q8_terminal_delta0_reduction.py":
        "7546765F0FCA4F5955019A8170893371B95AE4B532A8036B1659D6A478B91052",
    "rank8_q8_terminal_delta0_reduction_exact_20260820.json":
        "B3D1373A0DF158E55FABDD87A3C9033A745E5079D7AB813604CEBE1D5CC5B51C",
    "verify_rank8_q8_terminal_delta1_reduction.py":
        "9AFCB8440917BFE4B01D28987DE9055B09CA6B7A67E3D2DB3A2186BAB5AAEA70",
    "rank8_q8_terminal_delta1_reduction_exact_20260820.json":
        "8E7F4EB6AEA056B42A3570996287C8B5BD453C5F9E604368FB09E0F78D9530FF",
    "audit_rank8_delta0_delta1_structural_reductions.py":
        "4EE0E24A33A8A6CE26E52FBA807D0444E969B95E6740A9457286EE245DA8BF83",
    "rank8_delta0_delta1_structural_reductions_independent_audit_exact_20260820.json":
        "9AE03AA2F3AF793CD47E6B3679ACB25EBB200BDE5DEAD5692FF7C4A2097EA293",
    "verify_rank8_q8_terminal_delta2_reduction.py":
        "040A8556DA93BAD448802B9086DA2BE507C10A8836F4AE1ECC15DFFA24765C34",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json":
        "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
    "verify_rank8_delta2_path_forcing_and_face.py":
        "1B80D8D0B3A36A4289039A602349330C72519116B024026246E41D9D7CCA6299",
    "rank8_delta2_path_forcing_and_face_exact_20260820.json":
        "CDAC219760F73C37C7897B8564A28F0D5C473F294127B1E0ADDF742F5C340865",
    "audit_rank8_delta2_path_forcing_and_face.py":
        "607E477B4E641A8FEC486334F4C0804B25B4088B0C589260B16F808BB0F391FA",
    "rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json":
        "5AC6C802B94D02B9EC69F7318804CDA2953E3CD4CB09B197C5EAF1B78AFFAD55",
    "RANK8_DELTA2_E1_SUBDIVIDED_CLAW_ALL_ORDER_THEOREM_2026-08-20.md":
        "D374C2FCD30AA4D6D7C1E2CF5A400843CDE5F362C60AB239FF28EB022BC01489",
    "assemble_rank8_delta2_e1_all_order.py":
        "1A85FB61A066676D78ACF2594DFFAB7B9FFB90EC7457D456C6C5D376783F9EE1",
    "rank8_delta2_e1_all_order_exact_20260820.json":
        "755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E",
    "audit_rank8_delta2_e1_all_order.py":
        "7F2D9FEB80138E36491D0133CDFD78C27690B4DA3C1FEF65D244315F14AB587C",
    "rank8_delta2_e1_all_order_independent_audit_exact_20260820.json":
        "6E51683EB933CAD94B2E1EFA4E054476FAC097B2F0E99A4FC47D8EB0B2035FE3",
    "RANK8_E1_ALL_FOUR_RESIDUAL_RANKS_THEOREM_2026-08-20.md":
        "F0292C09EC8CCF420425FBBB4770324B0E52DCC55BBA49E6AC010B31F6A841FE",
    "assemble_rank8_delta013_e1_all_order.py":
        "F0F6FCCE979A2E65FBEE83B9728B58FF402FA274D70AB9AD9B561029BFAED6FE",
    "rank8_delta013_e1_all_order_exact_20260820.json":
        "B0996169B0A122F8A5D01B0573293604768BFF6A48A5CF2B1B06B7805323D14D",
    "audit_rank8_delta013_e1_all_order_independent.py":
        "DFA9A031D54CBB686FEA80AA170522219A0CF544E53FDA6A0842DDCB44AAD3EC",
    "rank8_delta013_e1_all_order_independent_audit_exact_20260820.json":
        "6A43F883A9FB3D46D64A42403FD53CA80B0CEE6204A06C69766263C0A2E05E5F",
    "RANK8_E2_DOUBLE_CLAW_N23_BOUNDARY_THEOREM_2026-08-20.md":
        "A17EF7533E72E91147FE0681A2B4D79E2B4124D5EF7AB34DE5D40D65CEB2DAB6",
    "scan_rank8_delta013_e2_double_claws_n23.py":
        "3FD0FCB77E1A3B09E30AA3E00DBA904D446B83E6502944EB4DA5B0404FCFEF5C",
    "rank8_delta013_e2_double_claws_n23_exact_20260820.json":
        "A2CA7228A172D5C8E1A1747014691F38A49BC0DE07C59D82400A80ED245A7AC9",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json":
        "BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027",
    "RANK8_E2_LENGTH_EXTENSION_FINITE_AND_THIN_THEOREMS_2026-08-20.md":
        "B82FF80537AAEBF59548C871641AA6931AB99C34FCBBC8AF3E4DE6CC1E2CE9A4",
    "probe_rank8_delta013_e2_length_extension.py":
        "C8BA8039C99D8273194DF3672E3E23EE4DB592F19AC57D3571EC47075D0DC38C",
    "rank8_delta013_e2_length_extension_scout_exact_20260820.json":
        "49D5B53516C07B7DE085D5586158F3674B523F01B4167E8BA972AA61118F16C4",
    "certify_rank8_delta013_e2_thin_bridge_extension_all_order.py":
        "F31EFBF365D25BF85713D0C9D5CBA37F44385CA463B24BE00245BDE039E69C9B",
    "rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json":
        "4308C23DC1EC19647B1B22F2D0FA21D1B3C243A72B0CF52F563F3550340DC4F5",
    "audit_rank8_delta013_e2_length_extension.py":
        "4E654621FC3AE9A8989764D8F284B49F87CF17038C7C0CE6B26B724977188E52",
    "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json":
        "FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2",
    "RANK8_DELTA013_E2_ALL_LONG_ROOT_CELLS_THEOREM_2026-08-20.md":
        "39A2BD00A4F10BC8764BD8D1F035EE965E51EE85A6E8D8EDA4881E254B3CBD80",
    "assemble_rank8_delta013_e2_all_long.py":
        "0A34A5C62D7BE89CED10BA00AB81F9C4D4CB4132A1A918BDF23AA9C6938D81AC",
    "rank8_delta013_e2_all_long_exact_20260820.json":
        "753DF4C499A78021C50E32C700B93FBCB16877003EF8265F4106D63C45AB5701",
    "RANK8_DELTA2_E2_BRANCH_ALL_ORDER_THEOREM_2026-08-20.md":
        "9EBF309B73FBF2D28D7D0B36FE4F1C73CED7ACE7581B6636D7835BEDC237CEA6",
    "run_rank8_delta2_e2_branch_short_long_cells.py":
        "DBC56B368C6033336568B05215EEC173DB428CF4AA16C477D123AE245391040B",
    "rank8_delta2_e2_branch_short_long_0coord_exact_20260820.json":
        "1D5700803A1371E9E19566147EA5E592A676C243766F92180640969AB5D3E7DD",
    "rank8_delta2_e2_branch_short_long_1coord_exact_20260820.json":
        "3BE314AF1A92FB3B4FA5F3467572598B390B5C64CAFED0B2B99C6666BA2BBF1D",
    "rank8_delta2_e2_branch_short_long_2coord_exact_20260820.json":
        "6E1F3A98E72E47B3E98A0E265AF16FD1FFC619BEDBE5C4A52FC0A9C2A635C590",
    "rank8_delta2_e2_branch_short_long_3coord_exact_20260820.json":
        "78F7ED3CCFD3C2E93CC3DBA71E349249D067AAA6D23C4A932265EF52FD97D6BF",
    "audit_rank8_delta2_e2_branch_all_order.py":
        "DB210D84ED07148F332E73630BBA758497EB29B5ACD98038A3A1D24A1027C528",
    "rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json":
        "5A82B58361B66DF210BC3BF5341632D022003CD4E5A320A230490DAC8D579708",
    "RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR_THEOREM_2026-08-20.md":
        "896EAA205EC8C8898E268C77EFB584A8809FB43ABA38022151C9B154EE763572",
    "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json":
        "383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266",
    "RANK8_DELTA2_E2_PENDANT_PAIRED1_BRIDGE_LONG_ALL_FAR_THEOREM_2026-08-20.md":
        "BF7264D958EFBB2D269C0C84B064D710B9A6881CDBD51FD93A17EA64752F5E97",
    "rank8_delta2_e2_pendant_paired1_bridge_long_all_far_exact_20260820.json":
        "4AA5057A376568698835A5D7008BD0113BC1DD04E8029A1ACCC40913DA42C157",
    "assemble_rank8_delta2_e2_pendant_bridge_long_all_arm_lengths.py":
        "3192F9F2EACC52AFCD861759F0BC105B6C5C9B82B2BB85B4EE80469F057A42B2",
    "rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json":
        "FFD224DEDDA5E15EE586B598F065F522F793464DBA8EC2E6209931BED6EA36A9",
    "RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS_THEOREM_2026-08-20.md":
        "F26DA88F3A4CB0B0E7E7EC4CE86991298533BC21846F5CEE4553965E88E6E3DE",
    "verify_rank8_delta013_all_root_path_faces.py":
        "33E1119097FA0FCFA572E600504F518E9C2003CBBBF101EFA19DD6FA0BF4E245",
    "rank8_delta013_all_root_path_faces_exact_20260820.json":
        "951CF842CEA1B6D6E6AED3D1EC940F582F489B53532899A1E7C3BF15A2118349",
    "audit_rank8_delta013_all_root_path_faces.py":
        "BF2AFE9DD2898CF4A33581148148D7B57E86F1879F0ADD17BAA51352271BE77B",
    "rank8_delta013_all_root_path_faces_independent_audit_20260820.json":
        "70F909F13A6E9510BC6F62860056C9C203D737F5099CDC487C9D1CF6B1F6F5FA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    mismatches = {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if actual[name] != EXPECTED[name]
    }
    require(not mismatches, f"immutable input hash mismatch: {mismatches}")

    rank7 = load("rank7_final_integration_independent_audit_exact_20260820.json")
    require(rank7["status"] == "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP", "rank7 audit status")
    require(all(rank7["dependency_chain"].values()), "rank7 terminal/connected/forest chain")

    d45 = load("rank8_delta5_delta4_full_branch_independent_audit_20260820.json")
    require(d45["status"] == "PASS_INDEPENDENT_SCOPE_AND_INTEGRITY_AUDIT", "Delta4/5 audit status")
    require(d45["delta4"]["remaining_boxes"] == [], "Delta4 boxes remain")
    require("unconditionally" in d45["delta4"]["all_order_conclusion"], "Delta4 not unconditional")
    require("dependency is discharged" in d45["delta5"]["scope"], "Delta5 rank7 dependency remains")

    d5 = load("rank8_q8_terminal_delta5_all_order_replay_20260817.json")
    d6 = load("rank8_q8_terminal_delta6_all_order_replay_20260817.json")
    d7 = load("rank8_q8_terminal_delta7_all_order_replay_20260817.json")
    d8 = load("rank8_q8_terminal_delta8_exact_20260817.json")
    d911 = load("rank8_q8_terminal_delta9_11_exact_20260816.json")
    d1215 = load("rank8_q8_terminal_reduction_exact_20260816.json")
    require(d5["status"] == "PASS", "Delta5 replay status")
    require("alpha(A)>=12" in d5["dependency"], "Delta5 dependency scope")
    require(d6["status"] == "PASS" and d6["theorem"] == "Delta^6 R_1>=0 for every rooted tree core", "Delta6 theorem")
    require(d7["status"] == "PASS" and d7["theorem"] == "Delta^7 R_1>=0 for every rooted tree core", "Delta7 theorem")
    require(d8["status"] == "PASS_EXACT_ALL_ORDER_RANK8_TERMINAL_DELTA8", "Delta8 theorem")
    require(d911["status"] == "PASS_EXACT_ALL_ORDER_RANK8_TERMINAL_DELTA9_11", "Delta9-11 theorem")
    require("j=12,13,14,15" in d1215["proved_all_order_subtheorem"]["statement"], "Delta12-15 theorem")

    finite = load("rank8_terminal_delta04_finite_n1_n22_exact_20260820.json")
    require(finite["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_4_FINITE_CENSUS_N1_N22", "finite Delta0-4 status")
    require(finite["totals"] == {"free_trees": 9114285, "rooted_cores": 194813361, "active_roots": 194810589}, "finite totals")
    require(finite["exact_control"]["Delta0_negative_orders"] == [11, 12, 13, 14], "Delta0 negative orders")
    require(finite["exact_control"]["Delta0_negative_rooted_rows"] == 950, "Delta0 negative count")
    for row in finite["rows"]:
        require(row["order"] in range(1, 23), "finite order outside 1..22")
        require(all(x == 0 for x in row["negative_counts_Delta0_through_Delta4"][1:]), "finite Delta1-4 negative")
        if row["order"] >= 15:
            require(row["negative_counts_Delta0_through_Delta4"][0] == 0, "finite Delta0 negative after order 14")

    finite_n23 = load("rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json")
    require(finite_n23["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N23", "finite n23 Delta0-3 audit status")
    require(finite_n23["scope"] == {
        "core_order": 23,
        "free_trees": 14828074,
        "all_rooted_pairs": 341045702,
        "ranks": [0, 1, 2, 3],
        "claim": "finite exact order-23 census only",
    }, "finite n23 scope/counts")
    require(finite_n23["primary"]["active_roots"] == 341045702, "finite n23 active-root count")
    require(finite_n23["primary"]["negative_counts"] == [0, 0, 0, 0], "finite n23 negative residual")
    require(finite_n23["primary"]["path_endpoint_witness"]["matches_all_global_minima"], "finite n23 minima witness")
    require(finite_n23["i128_safety"]["delta3_bound_bits"] == 88, "finite n23 i128 bound")

    finite_n24 = load("rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json")
    require(finite_n24["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N24", "finite n24 Delta0-3 audit status")
    require(finite_n24["scope"] == {
        "core_order": 24,
        "free_trees": 39299897,
        "all_rooted_pairs": 943197528,
        "ranks": [0, 1, 2, 3],
        "claim": "finite exact order-24 census only",
    }, "finite n24 scope/counts")
    require(finite_n24["source_successor"]["normalized_byte_for_byte_equal_to_n23"], "finite n24 source successor")
    require(finite_n24["primary"]["active_roots"] == 943197528, "finite n24 active-root count")
    require(finite_n24["primary"]["negative_counts"] == [0, 0, 0, 0], "finite n24 negative residual")
    require(finite_n24["primary"]["negative_witness_stream_empty"], "finite n24 witness stream")
    require(finite_n24["primary"]["path_endpoint_witness"]["matches_all_global_minima"], "finite n24 minima witness")
    require(finite_n24["i128_safety"]["delta3_bound_bits"] == 90, "finite n24 i128 bound")

    finite_n25 = load("rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json")
    require(finite_n25["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N25", "finite n25 Delta0-3 audit status")
    require(finite_n25["scope"] == {
        "core_order": 25,
        "free_trees": 104636890,
        "all_rooted_pairs": 2615922250,
        "ranks": [0, 1, 2, 3],
        "claim": "finite exact order-25 census only",
    }, "finite n25 scope/counts")
    require(finite_n25["source_successor"]["normalized_byte_for_byte_equal_to_n24"], "finite n25 source successor")
    require(finite_n25["primary"]["active_roots"] == 2615922250, "finite n25 active-root count")
    require(finite_n25["primary"]["negative_counts"] == [0, 0, 0, 0], "finite n25 negative residual")
    require(finite_n25["primary"]["negative_witness_stream_empty"], "finite n25 witness stream")
    require(finite_n25["primary"]["path_endpoint_witness"]["matches_all_global_minima"], "finite n25 minima witness")
    require(finite_n25["i128_safety"]["delta3_bound_bits"] == 92, "finite n25 i128 bound")

    finite_n26 = load("rank8_terminal_delta03_finite_n26_independent_audit_exact_20260820.json")
    require(finite_n26["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N26", "finite n26 Delta0-3 audit status")
    require(finite_n26["scope"] == {
        "core_order": 26,
        "free_trees": 279793450,
        "all_rooted_pairs": 7274629700,
        "ranks": [0, 1, 2, 3],
        "claim": "finite exact order-26 census only",
    }, "finite n26 scope/counts")
    require(finite_n26["source_successor"]["normalized_byte_for_byte_equal_to_n25"], "finite n26 source successor")
    require(finite_n26["primary"]["active_roots"] == 7274629700, "finite n26 active-root count")
    require(finite_n26["primary"]["negative_counts"] == [0, 0, 0, 0], "finite n26 negative residual")
    require(finite_n26["primary"]["negative_witness_stream_empty"], "finite n26 witness stream")
    require(finite_n26["primary"]["path_endpoint_witness"]["matches_all_global_minima"], "finite n26 minima witness")
    require(finite_n26["i128_safety"]["delta3_bound_bits"] == 94, "finite n26 i128 bound")

    small = load("rank8_terminal_full_shifted_q8_n1_n20_exact_20260820.json")
    require(small["status"] == "PASS_EXACT_RANK8_TERMINAL_FULL_SHIFTED_Q8_N1_N20", "small literal-family status")
    require(small["all_16_shifted_Newton_coefficients"] == "strictly positive in every rooted family", "small literal-family signs")
    require(small["totals"] == {"free_trees": 1346024, "rooted_families": 26056124}, "small literal-family totals")

    exceptional = load("rank8_exceptional_shifted_matching_quotient_exact_20260820.json")
    exceptional_audit = load("rank8_exceptional_shifted_matching_quotient_independent_audit_exact_20260820.json")
    require(exceptional["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_TEN_CELLS", "exceptional status")
    require(exceptional_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT", "exceptional audit")
    scanned = {(row["order"], row["alpha"]) for row in exceptional["cells"]}
    expected_scanned = {(21, 11), (22, 11), (21, 12), (22, 12), (23, 12), (24, 12), (23, 13), (24, 13), (25, 13), (26, 13)}
    require(scanned == expected_scanned and exceptional["cell_count"] == 10, "exceptional ten-cell key set")
    for row in exceptional["cells"]:
        require(row["quotient_processed"] == row["quotient_total"], "incomplete quotient cell")
        require(len(row["negatives"]) == 16 and not any(row["negatives"]), "negative exceptional shifted coefficient")
        require(len(row["minima"]) == 16 and min(row["minima"]) > 0, "nonpositive exceptional shifted minimum")
    omitted = {tuple(pair) for pair in exceptional["coverage"]["already_closed_conditional_on_Q7"]}
    require(omitted == {(21, 13), (22, 13)}, "exceptional omitted-cell key set")

    boundary = load("rank8_pgc_matching_quotient_boundary_exact_20260817.json")
    require(boundary["status"] == "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS", "matching boundary status")
    boundary_rows = {(row["order"], row["alpha"]): row for row in boundary["cells"]}
    for key in omitted:
        require(key in boundary_rows and boundary_rows[key]["q_negative"] == 0, f"missing Q8 boundary cell {key}")

    # The tree bound alpha(A)>=ceil(|A|/2) makes these the complete exceptional
    # core cells with 21<=|A|<=26 and alpha(A)<=13.
    full_exceptional = expected_scanned | omitted
    expected_exceptional = {
        (n, alpha)
        for n in range(21, 27)
        for alpha in range((n + 1) // 2, 14)
    }
    require(full_exceptional == expected_exceptional, "exceptional band has an order/alpha gap")

    d0_reduction = load("rank8_q8_terminal_delta0_reduction_exact_20260820.json")
    d1_reduction = load("rank8_q8_terminal_delta1_reduction_exact_20260820.json")
    d2_reduction = load("rank8_q8_terminal_delta2_reduction_exact_20260820.json")
    d2_path = load("rank8_delta2_path_forcing_and_face_exact_20260820.json")
    d2_path_audit = load("rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json")
    d2_e1 = load("rank8_delta2_e1_all_order_exact_20260820.json")
    d2_e1_audit = load("rank8_delta2_e1_all_order_independent_audit_exact_20260820.json")
    d013_e1 = load("rank8_delta013_e1_all_order_exact_20260820.json")
    d013_e1_audit = load("rank8_delta013_e1_all_order_independent_audit_exact_20260820.json")
    e2_n23 = load("rank8_delta013_e2_double_claws_n23_exact_20260820.json")
    e2_n23_audit = load("rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json")
    e2_extension = load("rank8_delta013_e2_length_extension_scout_exact_20260820.json")
    e2_extension_audit = load("rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json")
    e2_thin = load("rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json")
    e2_all_long = load("rank8_delta013_e2_all_long_exact_20260820.json")
    e2_delta2_branch = load("rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json")
    e2_delta2_pendant_one_short = load("rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json")
    e2_delta2_pendant_paired1 = load("rank8_delta2_e2_pendant_paired1_bridge_long_all_far_exact_20260820.json")
    e2_delta2_pendant_bridge_long = load("rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json")
    d013_path = load("rank8_delta013_all_root_path_faces_exact_20260820.json")
    d013_path_audit = load("rank8_delta013_all_root_path_faces_independent_audit_20260820.json")
    d01_audit = load("rank8_delta0_delta1_structural_reductions_independent_audit_exact_20260820.json")
    require(d0_reduction["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_REDUCTION_FOUR_LIVE_TENSORS", "Delta0 reduction status")
    require(d1_reduction["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA1_REDUCTION_FOUR_LIVE_TENSORS", "Delta1 reduction status")
    require(d2_reduction["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS", "Delta2 reduction status")
    require(d2_path["status"] == "PASS_EXACT_RANK8_DELTA2_PATH_FACE_AND_DEGREE_SURPLUS_SPLIT", "Delta2 path-face status")
    require(d2_path_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_PATH_FACE", "Delta2 path-face independent audit status")
    require(d2_e1["status"] == "PASS_EXACT_RANK8_DELTA2_E1_ALL_ORDER_N23_PLUS", "Delta2 e=1 theorem status")
    require(d2_e1_audit["status"] == "PASS_INDEPENDENT_STRUCTURAL_AUDIT_RANK8_DELTA2_E1_ALL_ORDER", "Delta2 e=1 independent audit status")
    require(d013_e1["status"] == "PASS_EXACT_RANK8_DELTA013_E1_ALL_ORDER_N23_PLUS", "Delta0/1/3 e=1 theorem status")
    require(d013_e1_audit["status"] == "PASS_INDEPENDENT_FAIL_CLOSED_AUDIT_RANK8_DELTA013_E1_ALL_ORDER", "Delta0/1/3 e=1 independent audit status")
    require(d013_e1_audit["arm_patterns_checked"] == 787, "Delta0/1/3 e=1 pattern count")
    require(d013_e1_audit["arm_cells_checked"] == 838, "Delta0/1/3 e=1 cell count")
    require(d013_e1_audit["delta2_pin"]["theorem_status"] == d2_e1["status"], "Delta2 e=1 theorem pin")
    require(d013_e1_audit["delta2_pin"]["independent_audit_status"] == d2_e1_audit["status"], "Delta2 e=1 audit pin")
    require(e2_n23["status"] == "PASS_EXACT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23", "e=2 n23 theorem status")
    require(e2_n23_audit["status"] == "PASS_INDEPENDENT_EXACT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23", "e=2 n23 independent audit status")
    require(e2_n23_audit["canonical_coverage"]["canonical_length_tuples"] == 920, "e=2 n23 core count")
    require(e2_n23_audit["independent_exact_scan"]["rooted_cases"] == 21160, "e=2 n23 root count")
    require(e2_n23_audit["independent_exact_scan"]["unique_coefficient_root_profiles"] == 11395, "e=2 n23 profile count")
    require(e2_extension["status"] == "PASS_EXACT_SCOUT_RANK8_DELTA013_E2_LENGTH_EXTENSION_ORDERS_23_29", "e=2 extension finite status")
    require(e2_extension_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_LENGTH_EXTENSION", "e=2 extension audit status")
    require(e2_extension_audit["finite_scout"]["orders"] == 7, "e=2 extension order count")
    require(e2_thin["status"] == "PASS_EXACT_RANK8_DELTA013_E2_THIN_BRIDGE_EXTENSION_ALL_ORDER", "e=2 thin bridge status")
    require(e2_extension_audit["thin_all_order_theorem"] == {"cells": 19, "rank_cells": 76, "constants_rebuilt": 76}, "e=2 thin bridge audit")
    require(e2_all_long["status"] == "PASS_EXACT_RANK8_DELTA013_E2_ALL_LONG_ROOT_CELLS", "e=2 all-long theorem status")
    require(len(e2_all_long["cells"]) == 12, "e=2 all-long cell count")
    require({row["rank"] for row in e2_all_long["cells"]} == {0, 1, 2, 3}, "e=2 all-long rank keys")
    require({row["root_type"] for row in e2_all_long["cells"]} == {"branch", "bridge_interior", "pendant"}, "e=2 all-long root keys")
    require(e2_delta2_branch["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_BRANCH_ALL_ORDER", "Delta2 e=2 branch theorem status")
    require(e2_delta2_branch["coverage"]["relevant_patterns"] == 3821, "Delta2 e=2 branch pattern count")
    require(e2_delta2_branch["coverage"]["positive_symbolic_cells"] == 3882, "Delta2 e=2 branch cell count")
    require(e2_delta2_pendant_one_short["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR", "Delta2 e=2 pendant at-most-one-short status")
    require(e2_delta2_pendant_one_short["theorem_scope"] == "every pendant-rooted e=2 double claw of order n>=23 with arbitrary selected arm/root, arbitrary paired arm, bridge>=8, and at most one far arm of length <=6", "Delta2 e=2 pendant at-most-one-short scope")
    require(e2_delta2_pendant_one_short["scope_guard"] == "two far arms both of length <=6 remain outside this theorem", "Delta2 e=2 pendant at-most-one-short guard")
    require(e2_delta2_pendant_paired1["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED1_BRIDGE_LONG_ALL_FAR", "Delta2 e=2 pendant paired1 status")
    require(e2_delta2_pendant_paired1["theorem_scope"] == "every pendant-rooted e=2 double claw of order n>=23 with arbitrary selected arm/root, paired arm length1, arbitrary positive far-arm lengths, and bridge>=8", "Delta2 e=2 pendant paired1 scope")
    require(e2_delta2_pendant_paired1["scope_guard"] == "paired arms >=2 and central bridges <=7 remain outside this theorem", "Delta2 e=2 pendant paired1 guard")
    require(e2_delta2_pendant_bridge_long["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS", "Delta2 e=2 pendant bridge-long status")
    require(e2_delta2_pendant_bridge_long["theorem_scope"] == "every pendant-rooted e=2 double claw of order n>=23 with arbitrary selected arm/root, arbitrary positive paired-arm and far-arm lengths, and central bridge>=8", "Delta2 e=2 pendant bridge-long scope")
    require(e2_delta2_pendant_bridge_long["scope_guard"] == "central bridges<=7 and non-pendant root types remain outside this theorem", "Delta2 e=2 pendant bridge-long guard")
    require(d013_path["status"] == "PASS_EXACT_RANK8_DELTA013_ALL_ROOT_PATH_FACES_N_GE_23", "Delta0/1/3 path-face status")
    require(d013_path_audit["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA013_PATH_FACE_AUDIT", "Delta0/1/3 path-face independent audit status")
    require(d013_path_audit["audited_source_sha256"] == actual["verify_rank8_delta013_all_root_path_faces.py"], "Delta0/1/3 path source audit pin")
    require(d013_path_audit["audited_report_sha256"] == actual["rank8_delta013_all_root_path_faces_exact_20260820.json"], "Delta0/1/3 path report audit pin")
    require(d01_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA0_DELTA1_FOUR_LIVE_TENSORS", "Delta0/1 independent audit status")
    require(d0_reduction["remaining_exact_analytic_tensors"] == 4, "Delta0 tensor count")
    require(d1_reduction["remaining_exact_analytic_tensors"] == 4, "Delta1 tensor count")
    require(d2_reduction["remaining_exact_analytic_tensors"] == 4, "Delta2 tensor count")

    closed_all_order_ranks = list(range(4, 16))
    missing_ranks = list(range(4))
    report = {
        "schema": "rank8-connected-q8-integration-readonly-v1",
        "status": "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS",
        "immutable_inputs_checked": len(EXPECTED),
        "immutable_input_hashes": actual,
        "rank7_dependency": {
            "status": "FINAL_PASS",
            "Q7_scope_used": "all forests H=A-q: alpha(H)>=12 in the two exceptional alpha(A)=13 cells, and alpha(H)>=13 in the induction range alpha(A)>=14",
            "dependency_chain": rank7["dependency_chain"],
        },
        "terminal_identity": d1215["terminal_identity"],
        "all_order_residual_coefficients": {
            "closed_ranks": closed_all_order_ranks,
            "missing_ranks": missing_ranks,
            "Delta4_5_audit_sha256": actual["rank8_delta5_delta4_full_branch_independent_audit_20260820.json"],
            "Delta6_replay_sha256": actual["rank8_q8_terminal_delta6_all_order_replay_20260817.json"],
            "Delta7_replay_sha256": actual["rank8_q8_terminal_delta7_all_order_replay_20260817.json"],
            "Delta8_report_sha256": actual["rank8_q8_terminal_delta8_exact_20260817.json"],
            "Delta9_11_report_sha256": actual["rank8_q8_terminal_delta9_11_exact_20260816.json"],
            "Delta12_15_report_sha256": actual["rank8_q8_terminal_reduction_exact_20260816.json"],
        },
        "finite_and_exceptional_splice": {
            "core_order_1_20": "literal shifted Q8 strictly positive from t0=max(1,14-alpha(A))",
            "core_order_21_26_alpha_at_most_13": sorted([list(x) for x in full_exceptional]),
            "ten_literal_matching_quotient_cells": sorted([list(x) for x in scanned]),
            "two_rank7_discharged_cells": sorted([list(x) for x in omitted]),
            "core_order_21_22_alpha_at_least_14": "Delta0-4 finite census plus all-order Delta5-15",
            "core_order_23_all_rooted_trees": "Delta0-3 exact WROM census plus all-order Delta4-15; 14,828,074 trees and 341,045,702 rooted pairs",
            "core_order_23_independent_audit": actual["rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json"],
            "core_order_24_all_rooted_trees": "Delta0-3 exact WROM census plus all-order Delta4-15; 39,299,897 trees and 943,197,528 rooted pairs",
            "core_order_24_independent_audit": actual["rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json"],
            "core_order_25_all_rooted_trees": "Delta0-3 exact WROM census plus all-order Delta4-15; 104,636,890 trees and 2,615,922,250 rooted pairs",
            "core_order_25_independent_audit": actual["rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json"],
            "core_order_26_all_rooted_trees": "Delta0-3 exact WROM census plus all-order Delta4-15; 279,793,450 trees and 7,274,629,700 rooted pairs",
            "core_order_26_independent_audit": actual["rank8_terminal_delta03_finite_n26_independent_audit_exact_20260820.json"],
            "negative_Delta0_controls": "exactly 950 rooted rows at orders 11..14; paid only by the literal shifted family, never discarded",
        },
        "exact_connected_Q8_gap": {
            "coefficient_ranks": missing_ranks,
            "minimal_scope": [
                "|A|>=27 (where alpha(A)>=ceil(|A|/2)>=14 automatically)",
            ],
            "equivalent_convenient_stronger_target": "Delta^j R_1>=0 for j=0,1,2,3 on every rooted tree core of order n>=27",
            "remaining_structural_layer_after_exact_faces": "the all-tree censuses close orders 23 through 26; e=0 paths and e=1 subdivided claws are closed for all four ranks; finite extension closes e=2 at orders 23..30 and the exact all-long branch/pendant/bridge-root e=2 cells are closed at every order, leaving e>=3 at orders 27..30 and short-boundary e>=2 cells from order 31",
            "reason_exact": "all literal small/exceptional families and every other residual rank are hash-pinned and no-gap; without Delta0-3 the nonnegative Newton reconstruction of R_t cannot be invoked",
        },
        "bounded_structural_progress_on_pending_ranks": {
            "Delta0": {
                "remaining_tensors": 4,
                "axes": "c8 endpoint {0,Q7} x root path {lower-cross,upper-capacity}; K,V,Z live",
                "independent_audit": actual["rank8_delta0_delta1_structural_reductions_independent_audit_exact_20260820.json"],
                "path_face": "closed exactly for every root of every P_n, n>=23",
                "path_face_independent_audit": actual["rank8_delta013_all_root_path_faces_independent_audit_20260820.json"],
                "first_nonpath_face": "degree surplus e=1 (every rooted subdivided claw) closed exactly for all n>=23",
                "first_nonpath_independent_audit": actual["rank8_delta013_e1_all_order_independent_audit_exact_20260820.json"],
                "second_nonpath_finite_band": "degree surplus e=2 closed exactly at orders 23..30 for every double claw and every root",
                "second_nonpath_independent_audit": actual["rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json"],
                "thin_all_order_subfamily": "pendant lengths (1,1,1,1), bridge g>=18, bridge extension; all root orbits",
                "all_long_e2_root_cells": "all 12 cells (Delta0..3 x branch/pendant/bridge-interior root) closed on their exact long-segment scopes",
                "all_long_e2_report": actual["rank8_delta013_e2_all_long_exact_20260820.json"],
                "remaining_nonpath_reduction": "the all-tree censuses close orders 23 through 26; e>=3 remains at orders 27..30; e>=2 remains from order 31",
            },
            "Delta1": {
                "remaining_tensors": 4,
                "axes": "c8 endpoint {0,Q7} x root path {lower-cross,upper-capacity}; K,V,Z live",
                "independent_audit": actual["rank8_delta0_delta1_structural_reductions_independent_audit_exact_20260820.json"],
                "path_face": "closed exactly for every root of every P_n, n>=23",
                "path_face_independent_audit": actual["rank8_delta013_all_root_path_faces_independent_audit_20260820.json"],
                "first_nonpath_face": "degree surplus e=1 (every rooted subdivided claw) closed exactly for all n>=23",
                "first_nonpath_independent_audit": actual["rank8_delta013_e1_all_order_independent_audit_exact_20260820.json"],
                "second_nonpath_finite_band": "degree surplus e=2 closed exactly at orders 23..30 for every double claw and every root",
                "second_nonpath_independent_audit": actual["rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json"],
                "thin_all_order_subfamily": "pendant lengths (1,1,1,1), bridge g>=18, bridge extension; all root orbits",
                "all_long_e2_root_cells": "all 12 cells (Delta0..3 x branch/pendant/bridge-interior root) closed on their exact long-segment scopes",
                "all_long_e2_report": actual["rank8_delta013_e2_all_long_exact_20260820.json"],
                "remaining_nonpath_reduction": "the all-tree censuses close orders 23 through 26; e>=3 remains at orders 27..30; e>=2 remains from order 31",
            },
            "Delta2": {
                "remaining_tensors": 4,
                "axes": "rank6 endpoint k={1,7} x root path {lower-cross,upper-capacity}; V,Z live",
                "representative_tight_box_result": "k=1/lower-cross direct-value Bernstein enclosure unresolved; no tree counterexample",
                "path_face": "closed exactly for every root of every P_n, n>=23",
                "path_face_independent_audit": actual["rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json"],
                "first_nonpath_face": "degree surplus e=1 (every rooted subdivided claw) closed exactly for all n>=23",
                "first_nonpath_independent_audit": actual["rank8_delta2_e1_all_order_independent_audit_exact_20260820.json"],
                "second_nonpath_finite_band": "degree surplus e=2 closed exactly at orders 23..30 for every double claw and every root",
                "second_nonpath_independent_audit": actual["rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json"],
                "thin_all_order_subfamily": "pendant lengths (1,1,1,1), bridge g>=18, bridge extension; all root orbits",
                "all_long_e2_root_cells": "all 12 cells (Delta0..3 x branch/pendant/bridge-interior root) closed on their exact long-segment scopes",
                "all_long_e2_report": actual["rank8_delta013_e2_all_long_exact_20260820.json"],
                "branch_root_e2_all_order": "every branch-rooted e=2 double claw of order n>=23, with 3,821 no-gap patterns and 3,882 positive symbolic cells",
                "branch_root_e2_independent_audit": actual["rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json"],
                "pendant_e2_bridge_ge8_all_arm_lengths": "arbitrary selected arm/root and arbitrary positive paired-arm and far-arm lengths",
                "pendant_e2_bridge_ge8_all_arm_lengths_report": actual["rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json"],
                "pendant_e2_remaining_scope_guard": "central bridge length <=7 remains outside the complete pendant-root theorem",
                "remaining_nonpath_reduction": "the all-tree censuses close orders 23 through 26; e>=3 remains at orders 27..30; e>=2 remains from order 31, subject to the exact branch/pendant/long-cell closures listed here; the next face must retain c5,c6,c7 and rooted deletion coupling",
            },
            "Delta3": {
                "reduction": "eight bounded analytic families remain in the nonpath lane",
                "path_face": "closed exactly for every root of every P_n, n>=23",
                "path_face_independent_audit": actual["rank8_delta013_all_root_path_faces_independent_audit_20260820.json"],
                "first_nonpath_face": "degree surplus e=1 (every rooted subdivided claw) closed exactly for all n>=23",
                "first_nonpath_independent_audit": actual["rank8_delta013_e1_all_order_independent_audit_exact_20260820.json"],
                "second_nonpath_finite_band": "degree surplus e=2 closed exactly at orders 23..30 for every double claw and every root",
                "second_nonpath_independent_audit": actual["rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json"],
                "thin_all_order_subfamily": "pendant lengths (1,1,1,1), bridge g>=18, bridge extension; all root orbits",
                "all_long_e2_root_cells": "all 12 cells (Delta0..3 x branch/pendant/bridge-interior root) closed on their exact long-segment scopes",
                "all_long_e2_report": actual["rank8_delta013_e2_all_long_exact_20260820.json"],
                "remaining_nonpath_reduction": "the all-tree censuses close orders 23 through 26; e>=3 remains at orders 27..30; e>=2 remains from order 31",
            },
        },
        "literal_path_family_closed_pending_ranks": [0, 1, 2, 3],
        "degree_surplus_zero_and_one_closed_pending_ranks": [0, 1, 2, 3],
        "degree_surplus_two_order23_closed_pending_ranks": [0, 1, 2, 3],
        "degree_surplus_two_orders23_30_closed_pending_ranks": [0, 1, 2, 3],
        "degree_surplus_two_exact_all_long_root_cells_closed_pending_ranks": [0, 1, 2, 3],
        "degree_surplus_two_branch_root_all_order_closed_pending_ranks": [2],
        "all_rooted_core_order23_closed_pending_ranks": [0, 1, 2, 3],
        "all_rooted_core_order24_closed_pending_ranks": [0, 1, 2, 3],
        "all_rooted_core_order25_closed_pending_ranks": [0, 1, 2, 3],
        "all_rooted_core_order26_closed_pending_ranks": [0, 1, 2, 3],
        "connected_Q8_complete": False,
        "scope_guard": [
            "This report does not claim connected Q8.",
            "It does not claim the forest convolution lift or rank-eight PGC.",
            "No negative relaxed/enclosure witness is classified as a tree counterexample.",
        ],
    }
    output = ROOT / "rank8_connected_q8_integration_readonly_20260820.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("pending_coefficient_ranks", ",".join(map(str, missing_ranks)))
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
