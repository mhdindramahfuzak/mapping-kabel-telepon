<?php
header('Content-Type: application/json');
include 'koneksi.php';

if (!isset($_GET['id_tb'])) {
    echo json_encode(['status' => 'error', 'message' => 'ID TB tidak disediakan']);
    exit;
}

$id_tb = $_GET['id_tb'];
$data = [];

// 1. Ambil Modul milik TB ini
$sql = "SELECT * FROM tb_modules WHERE id_tb = ? ORDER BY id ASC";
$stmt = $koneksi->prepare($sql);
$stmt->bind_param("i", $id_tb);
$stmt->execute();
$result = $stmt->get_result();

while ($modul = $result->fetch_assoc()) {
    $modul_id = $modul['id'];
    
    // 2. Ambil detail pairs (kabel 0-9) untuk modul ini
    $pairs = [];
    $sql_pairs = "SELECT * FROM tb_module_pairs WHERE id_modul = ? ORDER BY pair_index ASC";
    $stmt_pairs = $koneksi->prepare($sql_pairs);
    $stmt_pairs->bind_param("i", $modul_id);
    $stmt_pairs->execute();
    $res_pairs = $stmt_pairs->get_result();
    
    while ($row = $res_pairs->fetch_assoc()) {
        $pairs[$row['pair_index']] = $row;
    }
    
    $modul['pairs'] = $pairs;
    $data[] = $modul;
}

echo json_encode(['status' => 'success', 'data' => $data]);
?>