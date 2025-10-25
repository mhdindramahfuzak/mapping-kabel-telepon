<?php
header('Content-Type: application/json');
include 'koneksi.php';

// Cek apakah data POST ada
if (isset($_POST['id_tb']) && isset($_POST['tanggal']) && isset($_POST['keterangan'])) {
    
    $id_tb = $_POST['id_tb'];
    $tanggal = $_POST['tanggal'];
    $keterangan = $_POST['keterangan'];
    // Ambil teknisi, set ke string kosong jika tidak ada
    $teknisi = isset($_POST['teknisi']) ? $_POST['teknisi'] : '';

    // Validasi sederhana
    if (empty($id_tb) || empty($tanggal) || empty($keterangan)) {
        echo json_encode(['status' => 'error', 'message' => 'Data tidak lengkap.']);
        exit;
    }

    // Prepare statement untuk insert
    $stmt = $koneksi->prepare("INSERT INTO riwayat_perbaikan (id_tb, tanggal, keterangan, teknisi) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $id_tb, $tanggal, $keterangan, $teknisi);

    // Eksekusi dan kirim respon
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Riwayat berhasil ditambahkan.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan ke database: ' . $stmt->error]);
    }

    $stmt->close();

} else {
    echo json_encode(['status' => 'error', 'message' => 'Data POST tidak valid.']);
}

$koneksi->close();
?>
