document.addEventListener('DOMContentLoaded', function() {

    // 1. Inisialisasi Peta
    const map = L.map('map').setView([1.353, 102.152], 15);
    let currentMarker = null; // Menyimpan marker popup yang sedang terbuka
    let currentTbData = null; // Menyimpan data TB yang sedang dilihat di sidebar/popup

    // --- Definisi Tile Layers ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri &mdash; Esri, i-cubed, USDA, USGS, etc.'
    });

    // Tambahkan layer default ke peta
    satelliteLayer.addTo(map); // Mulai dengan satelit

    // --- Kontrol Layer ---
    const baseMaps = {
        "Satelit": satelliteLayer,
        "OpenStreetMap": osmLayer
    };
    L.control.layers(baseMaps).addTo(map);
    // ----------------------

    // 3. Muat file KML
    const kmlLayer = omnivore.kml('peta_kabel.kml') // Pastikan nama KML benar
        .on('ready', function() {
            map.fitBounds(kmlLayer.getBounds());
            kmlLayer.eachLayer(function(layer) {
                if (layer.feature?.geometry?.type === 'Point') {
                    const props = layer.feature.properties;
                    const placemarkName = props.name || 'Titik Tanpa Nama';

                    // Hanya bind popup awal yang simpel
                    layer.bindPopup(`<b>${placemarkName}</b><br><button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${placemarkName}')">Lihat/Edit Detail</button><button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${placemarkName}')">Tambah Riwayat</button>`);

                    layer.on('popupopen', function(e) {
                         currentMarker = e.target; // Set marker saat popup dibuka
                         // Ambil data awal untuk 'currentTbData' jika diperlukan saat popup dibuka
                         // fetchDataForSidebar(placemarkName); // Opsi: Preload data saat popup dibuka
                    });
                     layer.on('popupclose', function() {
                         currentMarker = null; // Reset saat popup ditutup
                     });
                }
            });
        })
        .addTo(map);

     // Elemen Sidebar & Form
    const sidebar = document.getElementById('sidebar');
    const detailsView = document.getElementById('details-view');
    const historyFormView = document.getElementById('history-form-view');
    const historyForm = document.getElementById('history-form');
    const editForm = document.getElementById('edit-form');
    const historyFormStatus = document.getElementById('history-form-status');
    const editFormStatus = document.getElementById('edit-form-status');
    const displayImageContainer = document.getElementById('display-image-container');
    const displayDeskripsi = document.getElementById('display-deskripsi');
    const displayArahKabel = document.getElementById('display-arah-kabel');
    const editFormDeskripsi = document.getElementById('edit-form-deskripsi');
    const editFormArahKabel = document.getElementById('edit-form-arah-kabel');
    const editFormFotoInput = document.getElementById('edit-form-foto');
    const deleteImageBtn = document.getElementById('delete-image-btn');

    // Fungsi global untuk membuka sidebar
    window.openSidebar = function(mode, nama_tb) {
        // Reset tampilan sidebar
        document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
        toggleEditMode(false); // Pastikan mode edit nonaktif saat sidebar dibuka
        historyForm.reset();
        editForm.reset();
        historyFormStatus.innerHTML = '';
        editFormStatus.innerHTML = '';

        // Tampilkan loading di sidebar
        if (mode === 'details') {
            detailsView.classList.add('active');
            document.getElementById('details-sidebar-tb-name').innerText = nama_tb;
            displayDeskripsi.innerHTML = "<i>Memuat...</i>";
            displayArahKabel.innerHTML = "<i>Memuat...</i>";
            displayImageContainer.innerHTML = "<i>Memuat...</i>";
        } else if (mode === 'history') {
            historyFormView.classList.add('active');
            document.getElementById('history-sidebar-tb-name').innerText = nama_tb;
        }

        sidebar.classList.add('sidebar-open'); // Tampilkan sidebar

        // Ambil data terbaru untuk sidebar
        fetchDataForSidebar(nama_tb, mode);
    }

    // Fungsi untuk mengambil data & mengisi sidebar
    function fetchDataForSidebar(nama_tb, mode) {
        fetch(`api/get_data.php?nama_tb=${encodeURIComponent(nama_tb)}`)
            .then(response => response.json())
            .then(data => {
                currentTbData = data; // Simpan data terbaru
                const details = data.details || {};
                const history = data.history || []; // Riwayat tetap diambil untuk info ID

                if (mode === 'details') {
                    document.getElementById('details-view-id-tb').value = details.id || ''; // Simpan ID untuk form edit
                    displayDeskripsi.innerText = details.deskripsi || 'Belum ada deskripsi.';
                    displayArahKabel.innerText = details.arah_kabel || 'Tidak ada data.';

                    if (details.foto) {
                        // Tambahkan timestamp untuk cache busting
                        displayImageContainer.innerHTML = `<img src="uploads/${details.foto}?t=${new Date().getTime()}" alt="${details.nama_tb}">`;
                        deleteImageBtn.style.display = 'block'; // Tampilkan tombol hapus jika ada foto
                    } else {
                        displayImageContainer.innerHTML = '<p><i>Foto tidak tersedia.</i></p>';
                        deleteImageBtn.style.display = 'none'; // Sembunyikan tombol hapus
                    }
                     // Aktifkan/nonaktifkan tombol edit berdasarkan ketersediaan ID
                    document.getElementById('toggle-edit-btn').disabled = !details.id;

                } else if (mode === 'history') {
                    // Set ID untuk form riwayat (jika ada)
                    document.getElementById('history-form-id-tb').value = details.id || '';
                     // Nonaktifkan tombol submit jika ID tidak ada
                     historyForm.querySelector('button[type="submit"]').disabled = !details.id;
                     if (!details.id) {
                        historyFormStatus.innerHTML = '<span style="color:orange;">Data TB ini belum ada di database. Edit detail terlebih dahulu untuk menambahkan ID.</span>';
                     }
                }
            })
            .catch(error => {
                console.error('Error fetching data for sidebar:', error);
                if (mode === 'details') {
                    displayDeskripsi.innerText = 'Gagal memuat data.';
                    displayArahKabel.innerText = 'Gagal memuat data.';
                    displayImageContainer.innerHTML = '<p>Gagal memuat foto.</p>';
                    document.getElementById('toggle-edit-btn').disabled = true;
                    deleteImageBtn.style.display = 'none';
                } else if (mode === 'history') {
                     historyFormStatus.innerHTML = '<span style="color:red;">Gagal mengambil ID TB.</span>';
                     historyForm.querySelector('button[type="submit"]').disabled = true;
                }
            });
    }

    // Fungsi global untuk menutup sidebar
    window.closeSidebar = function() {
        sidebar.classList.remove('sidebar-open');
         // Reset state saat ditutup
         currentTbData = null;
         toggleEditMode(false); // Matikan mode edit
         document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
    }

    // Fungsi global untuk toggle mode edit di sidebar
    window.toggleEditMode = function(enable) {
        if (enable && currentTbData?.details) {
            detailsView.classList.add('edit-mode');
            // Isi form dengan data saat ini
            editFormDeskripsi.value = currentTbData.details.deskripsi || '';
            editFormArahKabel.value = currentTbData.details.arah_kabel || '';
            editFormFotoInput.value = ''; // Reset input file
             // Tampilkan/sembunyikan tombol hapus berdasarkan foto saat ini
             deleteImageBtn.style.display = currentTbData.details.foto ? 'block' : 'none';
        } else {
            detailsView.classList.remove('edit-mode');
            editFormStatus.innerHTML = ''; // Clear status
        }
    }

    // Event listener untuk submit form riwayat
    historyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        historyFormStatus.innerHTML = '<i>Menyimpan Riwayat...</i>';
        const formData = new FormData(historyForm);
        const nama_tb = document.getElementById('history-sidebar-tb-name').innerText; // Ambil nama TB

        fetch('api/tambah_riwayat.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                historyFormStatus.innerHTML = '<span style="color:green;">Riwayat berhasil disimpan!</span>';
                setTimeout(() => { closeSidebar(); }, 1500);
                 // Refresh popup jika masih terbuka
                 if (currentMarker && currentMarker.isPopupOpen()) {
                    currentMarker.setPopupContent(`<b>${nama_tb}</b><br>Riwayat diperbarui.<br><button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${nama_tb}')">Lihat/Edit Detail</button><button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${nama_tb}')">Tambah Riwayat</button>`);
                 }
            } else {
                historyFormStatus.innerHTML = `<span style="color:red;">Error: ${data.message}</span>`;
            }
        })
        .catch(error => {
            console.error('History form submit error:', error);
            historyFormStatus.innerHTML = '<span style="color:red;">Error: Gagal menghubungi server.</span>';
        });
    });

    // Event listener untuk submit form edit
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        editFormStatus.innerHTML = '<i>Menyimpan Perubahan...</i>';
        const formData = new FormData(editForm);
        const id_tb = document.getElementById('details-view-id-tb').value;
        const nama_tb = document.getElementById('details-sidebar-tb-name').innerText;
        formData.append('id_tb', id_tb); // Pastikan ID terkirim

        fetch('api/update_tb.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                editFormStatus.innerHTML = '<span style="color:green;">Data berhasil diperbarui!</span>';
                // Refresh data di sidebar dan matikan mode edit
                fetchDataForSidebar(nama_tb, 'details'); // Panggil lagi untuk refresh view
                toggleEditMode(false); // Kembali ke mode view
                 // Refresh popup jika masih terbuka
                 if (currentMarker && currentMarker.isPopupOpen()) {
                    currentMarker.setPopupContent(`<b>${nama_tb}</b><br>Data diperbarui.<br><button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${nama_tb}')">Lihat/Edit Detail</button><button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${nama_tb}')">Tambah Riwayat</button>`);
                 }
            } else {
                editFormStatus.innerHTML = `<span style="color:red;">Error: ${data.message}</span>`;
            }
        })
        .catch(error => {
            console.error('Edit form submit error:', error);
            editFormStatus.innerHTML = '<span style="color:red;">Error: Gagal menghubungi server.</span>';
        });
    });

    // Fungsi global untuk menghapus gambar
    window.deleteCurrentImage = function() {
        if (!currentTbData?.details?.id || !currentTbData?.details?.foto) {
             alert('Tidak ada gambar untuk dihapus.');
            return;
        }
         if (!confirm('Anda yakin ingin menghapus foto ini? Tindakan ini tidak dapat dibatalkan.')) {
            return;
         }

        editFormStatus.innerHTML = '<i>Menghapus foto...</i>';
        const id_tb = currentTbData.details.id;
        const nama_tb = currentTbData.details.nama_tb;

        fetch('api/delete_image.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id_tb=${id_tb}` // Kirim ID
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                 editFormStatus.innerHTML = '<span style="color:green;">Foto berhasil dihapus!</span>';
                 // Refresh data sidebar
                 fetchDataForSidebar(nama_tb, 'details');
                  // Refresh popup jika masih terbuka
                  if (currentMarker && currentMarker.isPopupOpen()) {
                     currentMarker.setPopupContent(`<b>${nama_tb}</b><br>Foto dihapus.<br><button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${nama_tb}')">Lihat/Edit Detail</button><button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${nama_tb}')">Tambah Riwayat</button>`);
                  }
            } else {
                editFormStatus.innerHTML = `<span style="color:red;">Error: ${data.message}</span>`;
            }
        })
        .catch(error => {
             console.error('Delete image error:', error);
             editFormStatus.innerHTML = '<span style="color:red;">Error: Gagal menghubungi server.</span>';
        });
    }

});