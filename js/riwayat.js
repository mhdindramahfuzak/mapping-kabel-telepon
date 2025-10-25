document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('riwayat-table-body');
    const loadingMessage = document.querySelector('.loading');
    const riwayatContent = document.getElementById('riwayat-content');

    // Fungsi untuk memanggil API dan menampilkan data
    function loadRiwayatData() {
        fetch('api/get_all_riwayat.php') // Panggil API PHP yang baru dibuat
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
                loadingMessage.style.display = 'none'; // Sembunyikan pesan loading

                if (result.status === 'success' && result.data && result.data.length > 0) {
                    tableBody.innerHTML = ''; // Kosongkan isi tabel sebelum diisi baru

                    // Looping data riwayat dari hasil API
                    result.data.forEach(item => {
                        const row = tableBody.insertRow(); // Buat baris baru <tr>

                        // Buat sel <td> untuk setiap data
                        const cellNamaTb = row.insertCell();
                        cellNamaTb.textContent = item.nama_tb || 'N/A'; // Tampilkan nama TB

                        const cellTanggal = row.insertCell();
                        // Format tanggal (opsional, bisa disesuaikan)
                        try {
                             const date = new Date(item.tanggal);
                             // Format ke YYYY-MM-DD atau format lain yang diinginkan
                             cellTanggal.textContent = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                        } catch (e) {
                             cellTanggal.textContent = item.tanggal || '-'; // Fallback jika format tanggal aneh
                        }

                        const cellKeterangan = row.insertCell();
                        cellKeterangan.textContent = item.keterangan || '-';

                        const cellTeknisi = row.insertCell();
                        cellTeknisi.textContent = item.teknisi || '-'; // Tampilkan '-' jika teknisi kosong
                    });
                } else if (result.status === 'success' && (!result.data || result.data.length === 0)) {
                    // Jika sukses tapi tidak ada data riwayat
                    riwayatContent.innerHTML = '<p class="no-data">Tidak ada data riwayat perbaikan ditemukan.</p>';
                } else {
                    // Jika status dari API bukan 'success'
                    throw new Error(result.message || 'Gagal memuat data.');
                }
            })
            .catch(error => {
                console.error('Error fetching riwayat:', error);
                loadingMessage.style.display = 'none'; // Sembunyikan pesan loading
                riwayatContent.innerHTML = `<p class="no-data" style="color: red;">Terjadi kesalahan saat memuat data: ${error.message}</p>`;
            });
    }

    // Panggil fungsi untuk memuat data saat halaman siap
    loadRiwayatData();
});

//done