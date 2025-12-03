<?php
header('Content-Type: application/json');
include 'koneksi.php';

// Terima JSON raw data dari Javascript
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id_tb']) || !isset($input['modules'])) {
    echo json_encode(['status' => 'error', 'message' => 'Data tidak valid']);
    exit;
}

$id_tb = $input['id_tb'];
$modules = $input['modules'];

$koneksi->begin_transaction();

try {
    // Logic Simpan: Kita hapus modul lama dan insert ulang (cara paling aman untuk struktur dinamis ini)
    // 1. Hapus modul lama (Cascading delete akan menghapus pairs juga)
    $stmtDel = $koneksi->prepare("DELETE FROM tb_modules WHERE id_tb = ?");
    $stmtDel->bind_param("i", $id_tb);
    $stmtDel->execute();

    // 2. Insert Modul Baru
    $stmtModul = $koneksi->prepare("INSERT INTO tb_modules (id_tb, nama_modul) VALUES (?, ?)");
    $stmtPair = $koneksi->prepare("INSERT INTO tb_module_pairs (id_modul, pair_index, label_in, label_out, status) VALUES (?, ?, ?, ?, ?)");

    foreach ($modules as $mod) {
        $nama_modul = $mod['nama_modul'];
        $stmtModul->bind_param("is", $id_tb, $nama_modul);
        $stmtModul->execute();
        $new_modul_id = $koneksi->insert_id;

        // 3. Insert Pairs (0-9)
        foreach ($mod['pairs'] as $index => $pair) {
            $val_in = isset($pair['label_in']) ? $pair['label_in'] : '';
            $val_out = isset($pair['label_out']) ? $pair['label_out'] : '';
            $status = isset($pair['status']) ? $pair['status'] : 'good';

            $stmtPair->bind_param("iisss", $new_modul_id, $index, $val_in, $val_out, $status);
            $stmtPair->execute();
        }
    }

    $koneksi->commit();
    echo json_encode(['status' => 'success', 'message' => 'Data kabel berhasil disimpan']);

} catch (Exception $e) {
    $koneksi->rollback();
    echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan: ' . $e->getMessage()]);
}
?>