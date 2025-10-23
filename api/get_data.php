<?php
header('Content-Type: application/json');
include 'koneksi.php';

// Validasi input nama_tb
if (!isset($_GET['nama_tb']) || empty($_GET['nama_tb'])) {
    echo json_encode(['error' => 'Nama TB tidak disediakan.']);
    exit;
}

$nama_tb = $_GET['nama_tb'];

// --- 1. Ambil Detail Terminal Box ---
$tb_details = null;
$stmt = $koneksi->prepare("SELECT * FROM terminal_box WHERE nama_tb = ?");
$stmt->bind_param("s", $nama_tb);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $tb_details = $result->fetch_assoc();
} else {
    // Jika tidak ada di DB, kirim data minimal dari KML
    echo json_encode([
        'details' => ['nama_tb' => $nama_tb, 'deskripsi' => 'Data tidak ditemukan di database.', 'foto' => null, 'arah_kabel' => null],
        'history' => []
    ]);
    $stmt->close();
    $koneksi->close();
    exit;
}
$stmt->close();

// --- 2. Ambil Riwayat Perbaikan ---
$history = [];
$id_tb = $tb_details['id']; // Dapatkan ID dari data TB

$stmt = $koneksi->prepare("SELECT * FROM riwayat_perbaikan WHERE id_tb = ? ORDER BY tanggal DESC");
$stmt->bind_param("i", $id_tb);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $history[] = $row;
    }
}
$stmt->close();

// --- 3. Kirim Respon JSON ---
echo json_encode([
    'details' => $tb_details,
    'history' => $history
]);

$koneksi->close();
?>