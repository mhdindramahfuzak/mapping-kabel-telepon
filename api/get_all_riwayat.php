<?php
header('Content-Type: application/json');
include 'koneksi.php'; // Panggil file koneksi database

$riwayatList = []; // Siapkan array kosong untuk hasil

// Query untuk mengambil semua riwayat dan menggabungkannya dengan nama TB
// Diurutkan berdasarkan tanggal terbaru, lalu nama TB
$sql = "SELECT
            rp.tanggal,
            rp.keterangan,
            rp.teknisi,
            tb.nama_tb
        FROM
            riwayat_perbaikan rp
        JOIN
            terminal_box tb ON rp.id_tb = tb.id
        ORDER BY
            rp.tanggal DESC, tb.nama_tb ASC";

$result = $koneksi->query($sql);

if ($result) {
    if ($result->num_rows > 0) {
        // Ambil semua baris hasil query dan masukkan ke array $riwayatList
        while($row = $result->fetch_assoc()) {
            $riwayatList[] = $row;
        }
    }
    // Jika tidak ada error query, kirim data (bisa jadi array kosong jika memang tidak ada riwayat)
    echo json_encode(['status' => 'success', 'data' => $riwayatList]);
} else {
    // Jika query gagal
    http_response_code(500); // Set status error server
    echo json_encode(['status' => 'error', 'message' => 'Gagal mengambil data riwayat dari database: ' . $koneksi->error]);
}

$koneksi->close(); // Tutup koneksi database
?>
