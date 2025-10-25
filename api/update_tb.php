<?php
header('Content-Type: application/json');
include 'koneksi.php'; // Sertakan file koneksi database Anda

// Direktori untuk menyimpan file upload
$uploadDir = '../uploads/';
// Buat direktori jika belum ada
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
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

// Ambil data POST
$id_tb_input = isset($_POST['id_tb']) ? trim($_POST['id_tb']) : '';
$nama_tb = isset($_POST['nama_tb_kml']) ? trim($_POST['nama_tb_kml']) : ''; // Ambil dari JS
$latitude = isset($_POST['latitude']) ? trim($_POST['latitude']) : null; // Ambil dari JS
$longitude = isset($_POST['longitude']) ? trim($_POST['longitude']) : null; // Ambil dari JS
$deskripsi = isset($_POST['deskripsi']) ? trim($_POST['deskripsi']) : '';
$arah_kabel = isset($_POST['arah_kabel']) ? trim($_POST['arah_kabel']) : '';

$namaFileFotoBaru = null;
$fotoLama = null;
$isNewEntry = empty($id_tb_input) || intval($id_tb_input) === 0;

// Validasi minimal untuk INSERT baru
if ($isNewEntry && (empty($nama_tb) || $latitude === null || $longitude === null)) {
    $response['message'] = 'Data tidak lengkap untuk membuat entri baru (nama TB/koordinat).';
    echo json_encode($response);
    exit;
}

// Konversi ID ke integer jika ada
$id_tb = $isNewEntry ? null : intval($id_tb_input);

// --- Proses Upload File Foto (jika ada) ---
if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {

    // Ambil Nama Foto Lama (hanya jika UPDATE dan ada ID)
    if (!$isNewEntry && $id_tb) {
        $stmtSelectOld = $koneksi->prepare("SELECT foto FROM terminal_box WHERE id = ?");
        if ($stmtSelectOld) {
            $stmtSelectOld->bind_param("i", $id_tb);
            if ($stmtSelectOld->execute()) {
                $resultOld = $stmtSelectOld->get_result();
                if ($rowOld = $resultOld->fetch_assoc()) {
                    $fotoLama = $rowOld['foto'];
                }
            } else {
                 error_log("Gagal execute select foto lama: " . $stmtSelectOld->error);
            }
            $stmtSelectOld->close();
        } else {
            error_log("Gagal prepare select foto lama: " . $koneksi->error);
        }
    }

    $fileTmpPath = $_FILES['foto']['tmp_name'];
    $fileName = basename($_FILES['foto']['name']); // Gunakan basename untuk keamanan
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));

    // Validasi ekstensi
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    if (!in_array($fileExtension, $allowedExtensions)) {
        $response['message'] = 'Ekstensi file foto tidak diizinkan.';
        echo json_encode($response);
        exit;
    }

    // Buat nama unik
    $namaBersih = preg_replace("/[^a-zA-Z0-9_-]/", "_", pathinfo($fileName, PATHINFO_FILENAME));
    $namaFileFotoBaru = $namaBersih . '_' . time() . '.' . $fileExtension;
    $dest_path = $uploadDir . $namaFileFotoBaru;

    // Pindahkan file
    if (!move_uploaded_file($fileTmpPath, $dest_path)) {
         error_log("Gagal memindahkan file upload ke: " . $dest_path);
         $response['message'] = 'Gagal memindahkan file yang diupload. Periksa izin folder.';
         echo json_encode($response);
         exit;
    }
     // Jika upload berhasil dan ini UPDATE, hapus foto lama jika ada
     if (!$isNewEntry && $fotoLama && file_exists($uploadDir . $fotoLama)) {
        unlink($uploadDir . $fotoLama);
     }

} elseif (isset($_FILES['foto']) && $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE) {
    // Ada error saat upload selain 'tidak ada file'
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE   => 'Ukuran file melebihi upload_max_filesize di php.ini.',
        UPLOAD_ERR_FORM_SIZE  => 'Ukuran file melebihi MAX_FILE_SIZE di form HTML.',
        UPLOAD_ERR_PARTIAL    => 'File hanya terupload sebagian.',
        UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary tidak ditemukan.',
        UPLOAD_ERR_CANT_WRITE => 'Gagal menulis file ke disk.',
        UPLOAD_ERR_EXTENSION  => 'Ekstensi PHP menghentikan upload file.',
    ];
    $errorCode = $_FILES['foto']['error'];
    $response['message'] = 'Error saat upload file: ' . ($uploadErrors[$errorCode] ?? 'Kode error tidak diketahui: ' . $errorCode);
    error_log("Upload error code: " . $errorCode); // Log error asli
    echo json_encode($response);
    exit;
}
// --- Akhir Proses Upload File ---

// --- Simpan ke Database (INSERT atau UPDATE) ---
$koneksi->begin_transaction();

try {
    if ($isNewEntry) {
        // *** INSERT DATA BARU ***
        $sql = "INSERT INTO terminal_box (nama_tb, latitude, longitude, deskripsi, arah_kabel, foto) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $koneksi->prepare($sql);
        if (!$stmt) throw new Exception("Prepare INSERT gagal: " . $koneksi->error);

        // Bind parameter (s = string)
        $stmt->bind_param("ssssss", $nama_tb, $latitude, $longitude, $deskripsi, $arah_kabel, $namaFileFotoBaru);

        if ($stmt->execute()) {
            $newId = $koneksi->insert_id; // Dapatkan ID dari data yang baru dimasukkan
            $koneksi->commit();
            $response['status'] = 'success';
            $response['message'] = 'Data Terminal Box baru berhasil ditambahkan.';
            $response['new_id'] = $newId; // Kirim ID baru kembali ke JS
            if($namaFileFotoBaru) {
                $response['new_photo'] = $namaFileFotoBaru;
            }
        } else {
             $koneksi->rollback();
            // Cek jika error karena nama_tb sudah ada (UNIQUE constraint)
            if ($koneksi->errno == 1062) { // Kode error MySQL untuk duplicate entry
                 $response['message'] = 'Gagal menyimpan: Nama TB "' . htmlspecialchars($nama_tb) . '" sudah terdaftar di database.';
            } else {
                $response['message'] = 'Gagal menyimpan data baru ke database: ' . $stmt->error;
                 error_log("INSERT execute error: " . $stmt->error); // Log error asli
            }
        }

    } else {
        // *** UPDATE DATA LAMA ***
        if (!$id_tb) { // Double check ID ada untuk update
             throw new Exception("ID TB tidak valid untuk proses update.");
        }

        $sqlSetParts = ["deskripsi = ?", "arah_kabel = ?"];
        $sqlTypes = "ss"; // Tipe data untuk deskripsi dan arah_kabel
        $sqlParams = [$deskripsi, $arah_kabel]; // Nilai parameter awal

        // Jika ada foto baru yang diupload, tambahkan ke query update
        if ($namaFileFotoBaru !== null) {
            $sqlSetParts[] = "foto = ?";
            $sqlTypes .= "s"; // Tambah tipe string untuk foto
            $sqlParams[] = $namaFileFotoBaru; // Tambah nama file foto baru
        }

        $sqlTypes .= "i"; // Tambahkan tipe integer untuk ID di klausa WHERE
        $sqlParams[] = $id_tb; // Tambahkan nilai ID

        // Gabungkan bagian SET
        $sql = "UPDATE terminal_box SET " . implode(", ", $sqlSetParts) . " WHERE id = ?";

        $stmt = $koneksi->prepare($sql);
        if (!$stmt) {
             throw new Exception("Prepare UPDATE gagal: " . $koneksi->error);
        }

        // Bind parameter menggunakan variadic function (...) untuk unpack array $sqlParams
        $stmt->bind_param($sqlTypes, ...$sqlParams);

        if ($stmt->execute()) {
            // affected_rows bisa 0 jika data yang diinput sama persis, jadi cek execute saja
             $koneksi->commit();
            $response['status'] = 'success';
            $response['message'] = 'Data Terminal Box berhasil diperbarui.';
            if($namaFileFotoBaru) {
                $response['new_photo'] = $namaFileFotoBaru;
            }
        } else {
             $koneksi->rollback();
            $response['message'] = 'Gagal memperbarui database: ' . $stmt->error;
             error_log("UPDATE execute error: " . $stmt->error); // Log error asli
        }
    }
    $stmt->close();

} catch (Exception $e) {
    $koneksi->rollback();
    error_log("Update/Insert TB Error: " . $e->getMessage()); // Log error ke server log
    $response['message'] = 'Terjadi kesalahan internal server saat menyimpan data.'; // Pesan generik ke user
}
// --- Akhir Simpan Database ---

$koneksi->close();
echo json_encode($response);
?>
<!-- done -->