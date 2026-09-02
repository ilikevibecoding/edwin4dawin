$ErrorActionPreference = 'Stop'
$workspace = 'C:\Users\chris\erdos993_goal'
$geng = Join-Path $workspace 'nauty2_8_9\geng.exe'
$scanner = Join-Path $workspace 'scan_tree_v7_stream.exe'
$modulus = 8

for ($residue = 0; $residue -lt $modulus; $residue++) {
    $output = Join-Path $workspace ("rank7_v7_connected_n23_part_{0}_of_{1}.txt" -f $residue, $modulus)
    $command = '"{0}" -cq 23 22:22 {1}/{2} | "{3}" 23 > "{4}"' -f $geng, $residue, $modulus, $scanner, $output
    Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/d', '/c', $command | Out-Null
}

Write-Output "started $modulus exact order-23 residue scans"
