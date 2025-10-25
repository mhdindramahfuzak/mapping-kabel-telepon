<?php
// Konfigurasi Database
$DB_HOST = 'localhost';
$DB_USER = 'root';      // User default XAMPP
$DB_PASS = '';          // Password default XAMPP (kosong)
$DB_NAME = 'db_mapping_telepon'; // Nama database Anda

// Membuat koneksi
$koneksi = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

// Cek koneksi
if ($koneksi->connect_error) {
    die("Koneksi ke database gagal: " . $koneksi->connect_error);
}

// Mengatur charset ke utf8
$koneksi->set_charset("utf8mb4");

?>
<!-- done -->