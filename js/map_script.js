document.addEventListener('DOMContentLoaded', function() {

    // 1. Inisialisasi Peta - Set view awal
    const map = L.map('map').setView([1.353, 102.152], 15); // Koordinat Sei Pakning & Zoom Level

    // --- Definisi Tile Layers ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, // Zoom maksimum yang didukung tile server
        attribution: '© OpenStreetMap contributors' // Atribusi wajib
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, // Zoom maksimum
        attribution: 'Tiles © Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' // Atribusi wajib
    });

    // Tambahkan layer SATELIT sebagai default ke peta
    satelliteLayer.addTo(map); // INI YANG MEMBUAT SATELIT JADI DEFAULT

    // --- Kontrol Layer (Tombol untuk ganti Peta Dasar) ---
    const baseMaps = {
        "Satelit": satelliteLayer,
        "OpenStreetMap": osmLayer
    };
    L.control.layers(baseMaps).addTo(map); // Tambahkan tombol switch layer
    // ----------------------

    let currentMarker = null; // Menyimpan marker popup yang sedang terbuka
    let currentTbData = null; // Menyimpan data TB yang sedang dilihat di sidebar/popup

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
    const editFormIdTb = document.getElementById('edit-form-id-tb'); // Input hidden ID di form edit
    const editFormDeskripsi = document.getElementById('edit-form-deskripsi');
    const editFormArahKabel = document.getElementById('edit-form-arah-kabel');
    const editFormFotoInput = document.getElementById('edit-form-foto');
    const deleteImageBtn = document.getElementById('delete-image-btn');

    // 3. Muat file KML
    const kmlLayer = omnivore.kml('peta_kabel.kml') // Pastikan path dan nama KML benar
        .on('ready', function() {
            // map.fitBounds(kmlLayer.getBounds()); // Sesuaikan zoom ke KML jika perlu
            console.log("KML Loaded"); // Cek di console browser

            // Iterasi setiap layer (marker, garis) dalam KML
            kmlLayer.eachLayer(function(layer) {
                // Proses hanya jika layer adalah Point (marker)
                if (layer.feature?.geometry?.type === 'Point') {
                    const props = layer.feature.properties;
                    const placemarkName = props.name || 'Titik Tanpa Nama'; // Ambil nama dari KML

                    // Konten popup awal yang simpel dengan tombol
                    const popupContent = `
                        <b>${placemarkName}</b><br>
                        <button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${placemarkName.replace(/'/g, "\\'")}')">Lihat/Edit Detail</button>
                        <button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${placemarkName.replace(/'/g, "\\'")}')">Tambah Riwayat</button>
                    `;
                    // .replace(/'/g, "\\'") untuk handle nama KML yang mengandung kutip satu

                    layer.bindPopup(popupContent);

                    // --- TAMBAHAN: Tooltip (Label) Permanen ---
                    layer.bindTooltip(placemarkName, {
                        permanent: true,     // Selalu tampil
                        direction: 'right',  // Posisi tooltip (bisa 'left', 'top', 'bottom', 'center')
                        offset: [10, 0],     // Jarak [horizontal, vertikal] dari titik anchor marker
                        className: 'kml-label' // Class CSS untuk styling (opsional)
                    });
                    // --- AKHIR TAMBAHAN ---

                    // Simpan referensi marker saat popup dibuka
                    layer.on('popupopen', function(e) {
                         console.log(`Popup opened for: ${placemarkName}`); // Debug
                         currentMarker = e.target;
                    });
                     // Hapus referensi saat popup ditutup
                     layer.on('popupclose', function() {
                         console.log(`Popup closed for: ${placemarkName}`); // Debug
                         currentMarker = null;
                     });
                }
                 // Anda bisa tambahkan styling untuk LineString jika omnivore tidak mengambil style KML
                // else if (layer.feature?.geometry?.type === 'LineString') {
                //    layer.setStyle({ color: 'yellow', weight: 3, opacity: 0.8 }); // Contoh override style garis
                // }
            });
        })
        .on('error', function(error) {
            console.error("Error loading KML:", error); // Tampilkan error jika KML gagal dimuat
            alert("Gagal memuat data KML. Periksa path file dan format KML.");
        })
        .addTo(map); // Tambahkan layer KML ke peta

    // Fungsi global untuk membuka sidebar
    window.openSidebar = function(mode, nama_tb) {
        console.log(`Opening sidebar: mode=${mode}, tb=${nama_tb}`); // Debug

        // Reset tampilan sidebar
        document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
        toggleEditMode(false); // Pastikan mode edit nonaktif
        historyForm.reset();
        editForm.reset();
        historyFormStatus.innerHTML = '';
        editFormStatus.innerHTML = '';
        historyFormStatus.className = 'form-status'; // Reset class status
        editFormStatus.className = 'form-status';   // Reset class status

        // Tampilkan loading di view yang sesuai
        if (mode === 'details') {
            detailsView.classList.add('active');
            document.getElementById('details-sidebar-tb-name').innerText = nama_tb;
            displayDeskripsi.innerHTML = "<i>Memuat...</i>";
            displayArahKabel.innerHTML = "<i>Memuat...</i>";
            displayImageContainer.innerHTML = "<i>Memuat...</i>";
            // Pastikan tombol edit awalnya disabled sampai data dimuat
            document.getElementById('toggle-edit-btn').disabled = true;
        } else if (mode === 'history') {
            historyFormView.classList.add('active');
            document.getElementById('history-sidebar-tb-name').innerText = nama_tb;
            // Pastikan tombol simpan riwayat awalnya disabled
             historyForm.querySelector('button[type="submit"]').disabled = true;
        }

        // Tampilkan sidebar dengan menambahkan class
        sidebar.classList.add('sidebar-open');
        console.log("Sidebar class added: sidebar-open"); // Debug

        // Ambil data terbaru untuk sidebar
        fetchDataForSidebar(nama_tb, mode);
    }

    // Fungsi untuk mengambil data & mengisi sidebar
    function fetchDataForSidebar(nama_tb, mode) {
        console.log(`Fetching data for: ${nama_tb}`); // Debug
        fetch(`api/get_data.php?nama_tb=${encodeURIComponent(nama_tb)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Data received:", data); // Debug
                currentTbData = data; // Simpan data terbaru
                const details = data.details || {}; // Fallback jika details null
                const idTb = details.id || ''; // Ambil ID, akan kosong jika data baru

                // Always enable "Edit Data Ini" button, as it's also used for initial creation
                // We will handle "new data" vs "existing data" in the PHP script
                document.getElementById('toggle-edit-btn').disabled = false; // <<< PERBAIKAN DI SINI

                if (mode === 'details') {
                    document.getElementById('details-view-id-tb').value = idTb; // Simpan ID untuk referensi
                    editFormIdTb.value = idTb; // Set ID juga di hidden input form edit

                    displayDeskripsi.innerText = details.deskripsi || 'Belum ada deskripsi.';
                    displayArahKabel.innerText = details.arah_kabel || 'Tidak ada data.';

                    if (details.foto) {
                        // Tambahkan timestamp unik untuk cache busting
                        displayImageContainer.innerHTML = `<img src="uploads/${details.foto}?t=${new Date().getTime()}" alt="Foto ${details.nama_tb || nama_tb}">`;
                        deleteImageBtn.style.display = 'block'; // Tampilkan tombol hapus
                    } else {
                        displayImageContainer.innerHTML = '<p><i>Foto tidak tersedia.</i></p>';
                        deleteImageBtn.style.display = 'none'; // Sembunyikan tombol hapus
                    }

                } else if (mode === 'history') {
                    document.getElementById('history-form-id-tb').value = idTb;
                    // Aktifkan tombol simpan riwayat HANYA jika ID ditemukan (data sudah ada di DB)
                    historyForm.querySelector('button[type="submit"]').disabled = !idTb;
                    if (!idTb) {
                        setFormStatus(historyFormStatus, 'info', 'Data TB ini belum ada di database. Edit detail terlebih dahulu untuk menambahkan ID.');
                    } else {
                        setFormStatus(historyFormStatus, '', ''); // Clear info jika sudah ada ID
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching data for sidebar:', error);
                currentTbData = null; // Reset data jika gagal
                if (mode === 'details') {
                    displayDeskripsi.innerText = 'Gagal memuat data.';
                    displayArahKabel.innerText = 'Gagal memuat data.';
                    displayImageContainer.innerHTML = '<p>Gagal memuat foto.</p>';
                    document.getElementById('toggle-edit-btn').disabled = true; // Nonaktifkan jika fetch gagal total
                    deleteImageBtn.style.display = 'none';
                } else if (mode === 'history') {
                     setFormStatus(historyFormStatus, 'error', 'Gagal mengambil ID TB dari server.');
                     historyForm.querySelector('button[type="submit"]').disabled = true;
                }
            });
    }

    // Fungsi global untuk menutup sidebar
    window.closeSidebar = function() {
        sidebar.classList.remove('sidebar-open');
        console.log("Sidebar class removed: sidebar-open"); // Debug
         // Reset state saat ditutup
         currentTbData = null;
         toggleEditMode(false); // Matikan mode edit jika aktif
         document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active')); // Sembunyikan semua view
    }

    // Fungsi global untuk toggle mode edit di sidebar
    window.toggleEditMode = function(enable) {
        if (enable && currentTbData?.details?.id) { // Hanya aktifkan jika ada data dan ID
            console.log("Enabling edit mode"); // Debug
            detailsView.classList.add('edit-mode');
            // Isi form dengan data saat ini
            editFormDeskripsi.value = currentTbData.details.deskripsi || '';
            editFormArahKabel.value = currentTbData.details.arah_kabel || '';
            editFormFotoInput.value = ''; // Reset input file setiap masuk mode edit
             // Tampilkan/sembunyikan tombol hapus berdasarkan foto saat ini
             deleteImageBtn.style.display = currentTbData.details.foto ? 'block' : 'none';
        } else {
             console.log("Disabling edit mode"); // Debug
            detailsView.classList.remove('edit-mode');
            setFormStatus(editFormStatus, '', ''); // Clear status
        }
    }

    // Fungsi helper untuk menampilkan status form
    function setFormStatus(element, type, message) {
        element.innerHTML = message ? `<span class="${type}">${message}</span>` : '';
        element.className = `form-status ${type}`; // Update class container juga
    }

    // --- Event Listener untuk Form ---

    // Submit form riwayat
    historyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        setFormStatus(historyFormStatus, 'info', 'Menyimpan Riwayat...');
        const formData = new FormData(historyForm);
        const nama_tb = document.getElementById('history-sidebar-tb-name').innerText; // Ambil nama TB untuk refresh popup

        fetch('api/tambah_riwayat.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setFormStatus(historyFormStatus, 'success', 'Riwayat berhasil disimpan!');
                // Reset form & tutup sidebar setelah delay
                historyForm.reset();
                setTimeout(() => { closeSidebar(); }, 1500);

                 // Refresh popup jika marker masih ada dan popupnya terbuka
                 if (currentMarker && currentMarker.isPopupOpen()) {
                    const newPopupContent = `
                        <b>${nama_tb}</b><br>
                        Riwayat diperbarui.<br>
                        <button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${nama_tb.replace(/'/g, "\\'")}')">Lihat/Edit Detail</button>
                        <button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${nama_tb.replace(/'/g, "\\'")}')">Tambah Riwayat</button>
                    `;
                    currentMarker.setPopupContent(newPopupContent);
                 }
            } else {
                setFormStatus(historyFormStatus, 'error', `Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('History form submit error:', error);
            setFormStatus(historyFormStatus, 'error', 'Error: Gagal menghubungi server.');
        });
    });

    // Submit form edit
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        setFormStatus(editFormStatus, 'info', 'Menyimpan Perubahan...');
        const formData = new FormData(editForm);
        // ID sudah ada di hidden input 'edit-form-id-tb' yang juga punya name='id_tb'
        const nama_tb = document.getElementById('details-sidebar-tb-name').innerText;

        fetch('api/update_tb.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setFormStatus(editFormStatus, 'success', 'Data berhasil diperbarui!');
                // Refresh data di sidebar (panggil lagi fetch) & matikan mode edit
                fetchDataForSidebar(nama_tb, 'details'); // Panggil lagi untuk refresh view
                toggleEditMode(false); // Kembali ke mode view setelah berhasil

                 // Refresh popup jika masih ada dan popupnya terbuka
                 if (currentMarker && currentMarker.isPopupOpen()) {
                    const newPopupContent = `
                        <b>${nama_tb}</b><br>
                        Data diperbarui.<br>
                        <button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${nama_tb.replace(/'/g, "\\'")}')">Lihat/Edit Detail</button>
                        <button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${nama_tb.replace(/'/g, "\\'")}')">Tambah Riwayat</button>
                    `;
                    currentMarker.setPopupContent(newPopupContent);
                 }
            } else {
                setFormStatus(editFormStatus, 'error', `Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Edit form submit error:', error);
            setFormStatus(editFormStatus, 'error', 'Error: Gagal menghubungi server.');
        });
    });

    // Fungsi global untuk menghapus gambar saat ini (dipanggil dari tombol)
    window.deleteCurrentImage = function() {
        if (!currentTbData?.details?.id || !currentTbData?.details?.foto) {
             setFormStatus(editFormStatus, 'info', 'Tidak ada gambar terpasang untuk dihapus.');
            return;
        }
         // Konfirmasi lagi sebelum menghapus
         if (!confirm('Anda yakin ingin menghapus foto ini secara permanen?')) {
            return;
         }

        setFormStatus(editFormStatus, 'info', 'Menghapus foto...');
        const id_tb = currentTbData.details.id;
        const nama_tb = currentTbData.details.nama_tb; // Nama TB untuk refresh

        fetch('api/delete_image.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // Kirim data sebagai form-encoded
            body: `id_tb=${id_tb}` // Kirim hanya ID
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                 setFormStatus(editFormStatus, 'success', 'Foto berhasil dihapus!');
                 // Refresh data sidebar untuk menampilkan perubahan
                 fetchDataForSidebar(nama_tb, 'details');
                  // Refresh popup jika masih ada dan popupnya terbuka
                  if (currentMarker && currentMarker.isPopupOpen()) {
                     const newPopupContent = `
                         <b>${nama_tb}</b><br>
                         Foto dihapus.<br>
                         <button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${nama_tb.replace(/'/g, "\\'")}')">Lihat/Edit Detail</button>
                         <button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${nama_tb.replace(/'/g, "\\'")}')">Tambah Riwayat</button>
                     `;
                     currentMarker.setPopupContent(newPopupContent);
                  }
            } else {
                setFormStatus(editFormStatus, 'error', `Error: ${data.message}`);
            }
        })
        .catch(error => {
             console.error('Delete image error:', error);
             setFormStatus(editFormStatus, 'error', 'Error: Gagal menghubungi server saat menghapus foto.');
        });
    }

}); // Akhir dari DOMContentLoaded