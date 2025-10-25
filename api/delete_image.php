<?php
header('Content-Type: application/json');
include 'koneksi.php'; // Sertakan file koneksi

$uploadDir = '../uploads/'; // Pastikan path ini benar
$response = ['status' => 'error', 'message' => 'ID TB tidak valid.'];

if (isset($_POST['id_tb']) && is_numeric($_POST['id_tb'])) {
    $id_tb = intval($_POST['id_tb']);
    $fotoLama = null;

    $koneksi->begin_transaction();

    try {
        // 1. Ambil nama file foto saat ini
        $stmtSelect = $koneksi->prepare("SELECT foto FROM terminal_box WHERE id = ?");
        if(!$stmtSelect) throw new Exception("Prepare select failed: " . $koneksi->error);

        $stmtSelect->bind_param("i", $id_tb);
        $stmtSelect->execute();
        $resultSelect = $stmtSelect->get_result();
        if ($row = $resultSelect->fetch_assoc()) {
            $fotoLama = $row['foto'];
        }
        $stmtSelect->close();

        if (empty($fotoLama)) {
             $koneksi->rollback(); // Tidak perlu transaksi jika memang tidak ada foto
            $response['status'] = 'success'; // Anggap sukses karena memang tidak ada
            $response['message'] = 'Tidak ada foto yang terpasang untuk dihapus.';
            echo json_encode($response);
            exit;
        }

        // 2. Update database, set foto ke NULL
        $stmtUpdate = $koneksi->prepare("UPDATE terminal_box SET foto = NULL WHERE id = ?");
         if(!$stmtUpdate) throw new Exception("Prepare update failed: " . $koneksi->error);

        $stmtUpdate->bind_param("i", $id_tb);

        if ($stmtUpdate->execute()) {
            // 3. Hapus file fisik jika update DB berhasil
            $filePath = $uploadDir . $fotoLama;
            if (file_exists($filePath)) {
                if (unlink($filePath)) {
                    // Berhasil hapus file dan update DB
                     $koneksi->commit();
                    $response['status'] = 'success';
                    $response['message'] = 'Foto berhasil dihapus.';
                } else {
                    // Gagal hapus file, batalkan update DB
                     $koneksi->rollback();
                    $response['message'] = 'Gagal menghapus file foto dari server, database tidak diubah.';
                    error_log("Failed to delete file: " . $filePath); // Log error
                }
            } else {
                // File tidak ditemukan di server, tapi DB tetap diupdate
                 $koneksi->commit();
                 $response['status'] = 'success';
                 $response['message'] = 'Foto dihapus dari database (file fisik tidak ditemukan).';
                 error_log("File not found for deletion: " . $filePath); // Log info
            }
        } else {
             $koneksi->rollback();
            $response['message'] = 'Gagal menghapus referensi foto di database: ' . $stmtUpdate->error;
        }
        $stmtUpdate->close();

    } catch (Exception $e) {
        $koneksi->rollback();
         error_log("Delete Image Error: " . $e->getMessage()); // Log error ke server log
        $response['message'] = 'Terjadi kesalahan internal server saat menghapus foto.';
    }

}

$koneksi->close();
echo json_encode($response);
?>
