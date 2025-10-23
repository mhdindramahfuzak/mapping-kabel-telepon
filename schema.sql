-- Buat ulang tabel terminal_box
CREATE TABLE `terminal_box` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nama_tb` VARCHAR(100) NOT NULL COMMENT 'Nama unik dari KML',
  `latitude` VARCHAR(30) NULL COMMENT 'Koordinat Latitude dari KML',
  `longitude` VARCHAR(30) NULL COMMENT 'Koordinat Longitude dari KML',
  `deskripsi` TEXT NULL,
  `arah_kabel` TEXT NULL COMMENT 'Penjelasan singkat arah kabel',
  `foto` VARCHAR(255) NULL COMMENT 'Nama file foto',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama_tb_unique` (`nama_tb`) -- Pastikan nama TB unik
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Buat ulang tabel riwayat_perbaikan
CREATE TABLE `riwayat_perbaikan` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_tb` INT(11) NOT NULL,
  `tanggal` DATE NOT NULL COMMENT 'Tanggal perbaikan',
  `keterangan` TEXT NOT NULL COMMENT 'Deskripsi perbaikan',
  `teknisi` VARCHAR(100) NULL COMMENT 'Nama teknisi',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu data dimasukkan',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_riwayat_ke_tb`
    FOREIGN KEY (`id_tb`)
    REFERENCES `terminal_box`(`id`)
    ON DELETE CASCADE -- Jika TB dihapus, riwayatnya ikut terhapus
    ON UPDATE CASCADE -- Jika ID TB berubah, ID di riwayat ikut berubah
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;