<?php
header('Content-Type: application/json');
include 'koneksi.php'; // Sertakan file koneksi database Anda

// Direktori untuk menyimpan file upload
$uploadDir = '../uploads/'; // Asumsi folder uploads sejajar dengan map.html, BUKAN di dalam folder api
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
    // Gagal membuat folder
     echo json_encode(['status' => 'error', 'message' => 'Gagal membuat direktori upload.']);
     exit;
}
// Pastikan direktori bisa ditulis
if (!is_writable($uploadDir)) {
     echo json_encode(['status' => 'error', 'message' => 'Direktori upload tidak dapat ditulis. Periksa izin folder.']);
     exit;
}


// Inisialisasi respon
$response = ['status' => 'error', 'message' => 'Terjadi kesalahan tidak diketahui.'];

// Cek apakah data POST ada
if (isset($_POST['id_tb']) && is_numeric($_POST['id_tb'])) {
    $id_tb = intval($_POST['id_tb']);
    // Ambil deskripsi dan arah_kabel, default ke string kosong jika tidak ada
    $deskripsi = isset($_POST['deskripsi']) ? trim($_POST['deskripsi']) : '';
    $arah_kabel = isset($_POST['arah_kabel']) ? trim($_POST['arah_kabel']) : '';
    $namaFileFotoBaru = null;
    $fotoLama = null; // Untuk menyimpan nama foto lama yang akan dihapus

    // --- Ambil Nama Foto Lama (jika ada file baru) ---
     if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        $stmtSelectOld = $koneksi->prepare("SELECT foto FROM terminal_box WHERE id = ?");
        if ($stmtSelectOld) {
            $stmtSelectOld->bind_param("i", $id_tb);
            $stmtSelectOld->execute();
            $resultOld = $stmtSelectOld->get_result();
            if ($rowOld = $resultOld->fetch_assoc()) {
                $fotoLama = $rowOld['foto'];
            }
            $stmtSelectOld->close();
        }
     }
    //------------------------------------------------

    // --- Proses Upload File Foto (jika ada) ---
    if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['foto']['tmp_name'];
        $fileName = basename($_FILES['foto']['name']); // Gunakan basename untuk keamanan
        $fileSize = $_FILES['foto']['size'];
        $fileType = $_FILES['foto']['type'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        // Validasi ekstensi (opsional tapi disarankan)
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        if (!in_array($fileExtension, $allowedExtensions)) {
            $response['message'] = 'Ekstensi file tidak diizinkan.';
            echo json_encode($response);
            exit;
        }

        // Sanitasi nama file dan buat nama unik
        $namaBersih = preg_replace("/[^a-zA-Z0-9_-]/", "_", pathinfo($fileName, PATHINFO_FILENAME));
        $namaFileFotoBaru = $namaBersih . '_' . time() . '.' . $fileExtension;

        // Tentukan path tujuan
        $dest_path = $uploadDir . $namaFileFotoBaru;

        // Pindahkan file yang diupload
        if (!move_uploaded_file($fileTmpPath, $dest_path)) {
             $response['message'] = 'Gagal memindahkan file yang diupload. Cek izin folder uploads.';
             echo json_encode($response);
             exit;
        }
         // Jika upload berhasil, hapus foto lama (jika ada)
         if ($fotoLama && file_exists($uploadDir . $fotoLama)) {
            unlink($uploadDir . $fotoLama);
         }

    } elseif (isset($_FILES['foto']) && $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE) {
        // Ada error saat upload selain 'tidak ada file'
        $response['message'] = 'Error saat upload file: code ' . $_FILES['foto']['error'];
        echo json_encode($response);
        exit;
    }
    // --- Akhir Proses Upload File ---

    // --- Update Database ---
    $koneksi->begin_transaction();

    try {
        $sqlSetParts = ["deskripsi = ?", "arah_kabel = ?"];
        $sqlTypes = "ss";
        $sqlParams = [$deskripsi, $arah_kabel];

        if ($namaFileFotoBaru !== null) {
            $sqlSetParts[] = "foto = ?";
            $sqlTypes .= "s";
            $sqlParams[] = $namaFileFotoBaru;
        }

        $sqlTypes .= "i";
        $sqlParams[] = $id_tb;

        $sql = "UPDATE terminal_box SET " . implode(", ", $sqlSetParts) . " WHERE id = ?";

        $stmt = $koneksi->prepare($sql);
        if (!$stmt) {
             throw new Exception("Prepare statement failed: " . $koneksi->error);
        }

        $stmt->bind_param($sqlTypes, ...$sqlParams);

        if ($stmt->execute()) {
            // Kita anggap sukses jika query berhasil dieksekusi,
            // affected_rows bisa 0 jika data yang diinput sama persis
             $koneksi->commit();
            $response['status'] = 'success';
            $response['message'] = 'Data Terminal Box berhasil diperbarui.';
            if($namaFileFotoBaru) {
                $response['new_photo'] = $namaFileFotoBaru;
            }
        } else {
             $koneksi->rollback();
            $response['message'] = 'Gagal memperbarui database: ' . $stmt->error;
        }
        $stmt->close();

    } catch (Exception $e) {
        $koneksi->rollback();
        error_log("Update TB Error: " . $e->getMessage()); // Log error ke server log
        $response['message'] = 'Terjadi kesalahan internal server saat update.'; // Pesan generik ke user
    }
    // --- Akhir Update Database ---

} else {
    $response['message'] = 'Data POST tidak valid atau ID TB tidak ditemukan.';
}

$koneksi->close();
echo json_encode($response);
?>