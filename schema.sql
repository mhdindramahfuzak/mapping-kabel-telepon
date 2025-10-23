--
-- Database: `db_mapping_telepon`
--
-- Anda bisa membuat database-nya terlebih dahulu di phpMyAdmin
-- atau jalankan perintah ini:
CREATE DATABASE IF NOT EXISTS `db_mapping_telepon` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_general_ci;

-- Gunakan database yang baru dibuat
USE `db_mapping_telepon`;

-- --------------------------------------------------------

--
-- Struktur Tabel untuk `terminal_box`
--
-- Tabel ini akan menyimpan semua data inti untuk setiap titik Terminal Box (TB)
-- yang akan Anda tandai di peta.
--

CREATE TABLE `terminal_box` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nama_tb` VARCHAR(100) NOT NULL,
  `latitude` VARCHAR(30) NOT NULL,
  `longitude` VARCHAR(30) NOT NULL,
  `deskripsi` TEXT NULL,
  `arah_kabel` TEXT NULL COMMENT 'Penjelasan singkat arah kabel, misal: Dari PABX ke TB-Klinik',
  `foto` VARCHAR(255) NULL COMMENT 'Hanya menyimpan nama file, misal: tb_klinik.jpg',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama_tb_unique` (`nama_tb`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- --------------------------------------------------------

--
-- Struktur Tabel untuk `riwayat_perbaikan`
--
-- Tabel ini akan menyimpan catatan riwayat perbaikan.
-- Tabel ini terhubung dengan `terminal_box` menggunakan `id_tb`.
--

CREATE TABLE `riwayat_perbaikan` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_tb` INT(11) NOT NULL,
  `tanggal` DATE NOT NULL COMMENT 'Tanggal perbaikan dilakukan',
  `keterangan` TEXT NOT NULL COMMENT 'Deskripsi detail perbaikan yang dilakukan',
  `teknisi` VARCHAR(100) NULL COMMENT 'Nama teknisi atau tim yang mengerjakan',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Tanggal data ini dimasukkan ke sistem',
  PRIMARY KEY (`id`),
  
  -- Membuat relasi (Foreign Key)
  -- Ini akan menghubungkan `id_tb` di tabel ini ke `id` di tabel `terminal_box`
  CONSTRAINT `fk_riwayat_ke_tb`
    FOREIGN KEY (`id_tb`) 
    REFERENCES `terminal_box`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

