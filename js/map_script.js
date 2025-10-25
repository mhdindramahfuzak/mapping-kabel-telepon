document.addEventListener('DOMContentLoaded', function() {

    // 1. Inisialisasi Peta
    const map = L.map('map').setView([1.353, 102.152], 15);

    // --- Definisi Tile Layers ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Tiles © Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    satelliteLayer.addTo(map); // Default layer

    // --- Kontrol Layer ---
    const baseMaps = {
        "Satelit": satelliteLayer,
        "OpenStreetMap": osmLayer
    };
    L.control.layers(baseMaps).addTo(map);

    let currentMarker = null;
    let currentTbData = null; // Cache data terakhir yg dibuka popupnya
    let currentKmlCoords = { lat: null, lng: null };

    // --- Elemen Sidebar & Form ---
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
    const detailsViewIdTbInput = document.getElementById('details-view-id-tb');
    const editFormIdTbInput = document.getElementById('edit-form-id-tb');
    const historyFormIdTbInput = document.getElementById('history-form-id-tb');
    const editFormDeskripsi = document.getElementById('edit-form-deskripsi');
    const editFormArahKabel = document.getElementById('edit-form-arah-kabel');
    const editFormFotoInput = document.getElementById('edit-form-foto');
    const deleteImageBtn = document.getElementById('delete-image-btn');
    const toggleEditBtn = document.getElementById('toggle-edit-btn');
    const saveHistoryBtn = historyForm.querySelector('button[type="submit"]');
    // -----------------------------------------------------------

    // Fungsi untuk menampilkan popup setelah data diambil
    function showPopupWithDetails(layer, placemarkName, lat, lng) {
        currentMarker = layer; // Simpan marker yang diklik
        currentKmlCoords = { lat, lng }; // Simpan koordinat

        // Tampilkan popup loading sementara
        layer.bindPopup(`<b>${placemarkName}</b><br><i>Memuat detail...</i>`, { minWidth: 200 }).openPopup();

        fetch(`api/get_data.php?nama_tb=${encodeURIComponent(placemarkName)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Data fetched for popup:", data);
                currentTbData = data; // Simpan data untuk mungkin digunakan sidebar
                const details = data.details || {};
                let popupContent = `<b>${placemarkName}</b><br>`;

                // Tambahkan gambar jika ada (DENGAN CACHE BUSTING)
                if (details.foto) {
                    popupContent += `<img src="uploads/${details.foto}?t=${new Date().getTime()}" alt="Foto ${placemarkName}" class="popup-image"><br>`; // Tambahkan class CSS
                } else {
                    popupContent += `<small><i>Foto tidak tersedia.</i></small><br>`;
                }

                // Tambahkan tombol
                popupContent += `
                    <button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${placemarkName.replace(/'/g, "\\'")}', ${lat}, ${lng})">Lihat/Edit Detail</button>
                    <button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${placemarkName.replace(/'/g, "\\'")}', ${lat}, ${lng})">Tambah Riwayat</button>
                `;

                // Update popup yang sudah terbuka
                if (currentMarker && currentMarker.isPopupOpen()) {
                    currentMarker.setPopupContent(popupContent);
                } else {
                    // Jika popup terlanjur ditutup, bind ulang
                    layer.bindPopup(popupContent, { minWidth: 200 });
                }
            })
            .catch(error => {
                console.error('Error fetching data for popup:', error);
                currentTbData = null; // Reset cache jika gagal
                const errorContent = `
                    <b>${placemarkName}</b><br>
                    <i>Gagal memuat data.</i><br>
                    <button class="popup-main-btn btn-secondary" onclick="retryFetchPopup('${placemarkName.replace(/'/g, "\\'")}', ${lat}, ${lng})">Coba Lagi</button>
                `;
                 if (currentMarker && currentMarker.isPopupOpen()) {
                    currentMarker.setPopupContent(errorContent);
                } else {
                    layer.bindPopup(errorContent, { minWidth: 200 });
                }
            });
    }

    // Fungsi global untuk mencoba lagi fetch data popup
    window.retryFetchPopup = function(placemarkName, lat, lng) {
        if (currentMarker) {
            showPopupWithDetails(currentMarker, placemarkName, lat, lng);
        }
    }

    // Muat file KML
    const kmlLayer = omnivore.kml('peta_kabel.kml')
        .on('ready', function() {
            console.log("KML Loaded");

            kmlLayer.eachLayer(function(layer) {
                if (layer.feature?.geometry?.type === 'Point') {
                    const props = layer.feature.properties;
                    const placemarkName = props.name || 'Titik Tanpa Nama';
                    const coordinates = layer.feature.geometry.coordinates; // [lng, lat, alt]
                    const lat = coordinates[1];
                    const lng = coordinates[0];

                    // === AWAL KODE MODIFIKASI IKON ===
                    let iconColor = 'cadetblue'; // Warna default jika tidak cocok
                    let iconGlyph = 'info';      // Ikon default (nama ikon Font Awesome tanpa fa-)

                    if (placemarkName.startsWith('RK')) {
                        iconColor = 'red';
                        iconGlyph = 'network-wired'; // Ikon untuk RK
                    } else if (placemarkName.startsWith('TB')) {
                        iconColor = 'blue';
                        iconGlyph = 'box'; // Ikon untuk TB
                    } else if (placemarkName.startsWith('Telepon')) { // Cek "Telepon" karena ada di KML
                        iconColor = 'green';
                        iconGlyph = 'phone'; // Ikon untuk Telepon
                    } else if (placemarkName.startsWith('Terminal Center')) {
                         iconColor = 'orange'; // Warna lain untuk Terminal Center
                         iconGlyph = 'server';
                    }
                    // Tambahkan 'else if' lain jika perlu

                    // Buat ikon baru dengan Leaflet.awesome-markers
                    const customIcon = L.AwesomeMarkers.icon({
                        icon: iconGlyph,
                        prefix: 'fa', // Prefix untuk Font Awesome (biasanya 'fa' atau 'fas')
                        markerColor: iconColor
                    });

                    // Terapkan ikon baru ke layer marker
                    if (layer.setIcon) {
                       layer.setIcon(customIcon);
                    }
                    // === AKHIR KODE MODIFIKASI IKON ===


                    // Tambahkan event listener untuk klik (Kode Asli)
                    layer.on('click', function(e) {
                        L.DomEvent.stopPropagation(e);
                        showPopupWithDetails(e.target, placemarkName, lat, lng);
                    });


                    // Tooltip (Label) Permanen (Kode Asli)
                    layer.bindTooltip(placemarkName, {
                        permanent: true,
                        direction: 'right',
                        offset: [10, 0],
                        className: 'kml-label'
                    });

                    // Hapus event listener lama untuk popupopen/close jika ada (Kode Asli)
                    layer.off('popupopen');
                    layer.off('popupclose');

                     // Event saat popup ditutup (untuk mereset currentMarker) (Kode Asli)
                     layer.on('popupclose', function() {
                        console.log(`Popup closed for: ${placemarkName}`);
                        if (currentMarker === layer) {
                            currentMarker = null;
                            currentTbData = null;
                            currentKmlCoords = { lat: null, lng: null };
                        }
                     });
                }
            });
        })
        .on('error', function(error) {
            console.error("Error loading KML:", error);
            alert("Gagal memuat data KML. Periksa path file dan format KML.");
        })
        .addTo(map);

    // Fungsi global untuk membuka sidebar
    window.openSidebar = function(mode, nama_tb, lat, lng) {
        console.log(`Opening sidebar: mode=${mode}, tb=${nama_tb}, coords=[${lat}, ${lng}]`);

        // Simpan koordinat dari KML saat sidebar dibuka (untuk INSERT baru)
        currentKmlCoords.lat = lat;
        currentKmlCoords.lng = lng;

        // Reset tampilan sidebar
        document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
        toggleEditMode(false);
        historyForm.reset();
        editForm.reset();
        historyFormStatus.innerHTML = '';
        editFormStatus.innerHTML = '';
        historyFormStatus.className = 'form-status';
        editFormStatus.className = 'form-status';

        // Tampilkan loading & set nama TB
        if (mode === 'details') {
            detailsView.classList.add('active');
            document.getElementById('details-sidebar-tb-name').innerText = nama_tb;
            displayDeskripsi.innerHTML = "<i>Memuat...</i>";
            displayArahKabel.innerHTML = "<i>Memuat...</i>";
            displayImageContainer.innerHTML = "<i>Memuat...</i>";
            toggleEditBtn.disabled = true;
            deleteImageBtn.style.display = 'none';
        } else if (mode === 'history') {
            historyFormView.classList.add('active');
            document.getElementById('history-sidebar-tb-name').innerText = nama_tb;
            saveHistoryBtn.disabled = true;
        }

        sidebar.classList.add('sidebar-open');
        console.log("Sidebar class added: sidebar-open");

        // Ambil data terbaru untuk mengisi sidebar
        fetchDataForSidebar(nama_tb, mode);
    }

    // Fungsi untuk mengambil data & mengisi sidebar
    function fetchDataForSidebar(nama_tb, mode) {
        console.log(`Fetching data for sidebar: ${nama_tb}`);
        fetch(`api/get_data.php?nama_tb=${encodeURIComponent(nama_tb)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Data received for sidebar:", data);
                currentTbData = data;
                const details = data.details || {};
                const idTb = details.id || '';

                toggleEditBtn.disabled = false; // Selalu aktifkan tombol edit setelah data (atau info tidak ada) didapat

                if (mode === 'details') {
                    detailsViewIdTbInput.value = idTb;
                    editFormIdTbInput.value = idTb;

                    displayDeskripsi.innerText = details.deskripsi || (idTb ? 'Belum ada deskripsi.' : 'Data belum ada di database.');
                    displayArahKabel.innerText = details.arah_kabel || (idTb ? 'Tidak ada data.' : 'Data belum ada di database.');

                    // Tampilkan gambar (DENGAN CACHE BUSTING)
                    if (details.foto) {
                        displayImageContainer.innerHTML = `<img src="uploads/${details.foto}?t=${new Date().getTime()}" alt="Foto ${details.nama_tb || nama_tb}">`;
                        deleteImageBtn.style.display = 'block'; // Tampilkan tombol hapus jika ada foto
                    } else {
                        displayImageContainer.innerHTML = `<p><i>Foto tidak tersedia.</i></p>`;
                        deleteImageBtn.style.display = 'none'; // Sembunyikan tombol hapus jika tidak ada foto
                    }

                } else if (mode === 'history') {
                    historyFormIdTbInput.value = idTb;
                    saveHistoryBtn.disabled = !idTb; // Aktifkan tombol simpan HANYA jika ID ada
                    if (!idTb) {
                        setFormStatus(historyFormStatus, 'info', 'Data TB ini belum ada di database. Silakan edit detail terlebih dahulu untuk menambahkannya.');
                    } else {
                        setFormStatus(historyFormStatus, '', ''); // Hapus pesan jika ID ada
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching data for sidebar:', error);
                if (mode === 'details') {
                    displayDeskripsi.innerText = 'Gagal memuat data.';
                    displayArahKabel.innerText = 'Gagal memuat data.';
                    displayImageContainer.innerHTML = '<p>Gagal memuat foto.</p>';
                    toggleEditBtn.disabled = true;
                    deleteImageBtn.style.display = 'none';
                    editFormIdTbInput.value = '';
                    detailsViewIdTbInput.value = '';
                } else if (mode === 'history') {
                     setFormStatus(historyFormStatus, 'error', 'Gagal mengambil data TB dari server.');
                     saveHistoryBtn.disabled = true;
                     historyFormIdTbInput.value = '';
                }
            });
    }

    // Fungsi global untuk menutup sidebar
    window.closeSidebar = function() {
        sidebar.classList.remove('sidebar-open');
        console.log("Sidebar class removed: sidebar-open");
         toggleEditMode(false);
         document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
    }

    // Fungsi global untuk toggle mode edit di sidebar
    window.toggleEditMode = function(enable) {
        const idExists = currentTbData?.details?.id;
        if (enable) {
            console.log("Enabling edit mode");
            detailsView.classList.add('edit-mode');
            // Isi form dengan data saat ini dari cache
            editFormDeskripsi.value = currentTbData?.details?.deskripsi || '';
            editFormArahKabel.value = currentTbData?.details?.arah_kabel || '';
            editFormFotoInput.value = ''; // Kosongkan input file
            // Tampilkan tombol hapus hanya jika ada ID dan ada foto
            deleteImageBtn.style.display = (idExists && currentTbData?.details?.foto) ? 'block' : 'none';
        } else {
             console.log("Disabling edit mode");
            detailsView.classList.remove('edit-mode');
            setFormStatus(editFormStatus, '', ''); // Bersihkan status form edit
        }
    }

    // Fungsi helper untuk menampilkan status form
    function setFormStatus(element, type, message) {
        element.innerHTML = message ? `<span class="${type}">${message}</span>` : '';
        element.className = `form-status ${type}`; // Set kelas untuk styling
    }

    // --- Event Listener untuk Form ---

    // Submit form riwayat
    historyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        setFormStatus(historyFormStatus, 'info', 'Menyimpan Riwayat...');
        const formData = new FormData(historyForm);

        fetch('api/tambah_riwayat.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setFormStatus(historyFormStatus, 'success', 'Riwayat berhasil disimpan!');
                historyForm.reset(); // Kosongkan form
                // Tutup sidebar setelah beberapa saat
                setTimeout(() => { closeSidebar(); }, 1500);
            } else {
                setFormStatus(historyFormStatus, 'error', `Error: ${data.message || 'Gagal menyimpan riwayat.'}`);
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
        const nama_tb = document.getElementById('details-sidebar-tb-name').innerText;

        // Tambahkan nama_tb dari KML (penting untuk INSERT baru)
        formData.append('nama_tb_kml', nama_tb);

        // Tambahkan koordinat jika belum ada ID (untuk INSERT baru)
        if (!formData.get('id_tb') && currentKmlCoords.lat !== null && currentKmlCoords.lng !== null) {
            formData.append('latitude', currentKmlCoords.lat);
            formData.append('longitude', currentKmlCoords.lng);
        } else if (!formData.get('id_tb')) {
             console.warn("Koordinat KML tidak tersedia saat menyimpan entri baru.");
             // Mungkin beri peringatan ke user atau batalkan submit
             setFormStatus(editFormStatus, 'error', 'Error: Koordinat KML tidak ditemukan untuk entri baru.');
             return; // Hentikan proses submit jika koordinat penting
        }


        fetch('api/update_tb.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setFormStatus(editFormStatus, 'success', data.message || 'Data berhasil disimpan!');

                const newId = data.new_id || editFormIdTbInput.value; // Ambil ID baru atau ID lama
                if (data.new_id) {
                     editFormIdTbInput.value = data.new_id;
                     detailsViewIdTbInput.value = data.new_id;
                     // Update data cache jika ada
                     if (currentTbData) {
                         if(!currentTbData.details) currentTbData.details = {}; // Buat objek details jika belum ada
                         currentTbData.details.id = data.new_id;
                     }
                     console.log("New entry created with ID:", data.new_id);
                }

                // Update data foto di cache jika ada foto baru
                if (data.new_photo && currentTbData && currentTbData.details) {
                    currentTbData.details.foto = data.new_photo;
                } else if (data.new_photo === null && currentTbData && currentTbData.details) {
                     // Jika response menandakan foto dihapus (misalnya `delete_image.php` dipanggil terpisah)
                     // Atau jika update_tb.php mengembalikan null/kosong untuk foto
                     currentTbData.details.foto = null;
                }


                // Tunggu sebentar lalu refresh data sidebar & matikan mode edit
                setTimeout(() => {
                    fetchDataForSidebar(nama_tb, 'details'); // Refresh view sidebar dengan data terbaru
                    toggleEditMode(false); // Kembali ke mode view
                }, 1000); // Tunggu 1 detik

                 // Refresh popup jika marker yang sesuai masih aktif dan terbuka
                 if (currentMarker && currentMarker.feature.properties.name === nama_tb && currentMarker.isPopupOpen()) {
                    console.log("Refreshing active popup after save...");
                    // Panggil ulang showPopupWithDetails agar popup ikut terupdate
                    // Pastikan koordinat masih tersimpan di currentKmlCoords
                    if(currentKmlCoords.lat !== null && currentKmlCoords.lng !== null){
                       showPopupWithDetails(currentMarker, nama_tb, currentKmlCoords.lat, currentKmlCoords.lng);
                    } else {
                       console.warn("Cannot refresh popup: KML coordinates lost.");
                    }
                 }

            } else {
                setFormStatus(editFormStatus, 'error', `Error: ${data.message || 'Gagal menyimpan data.'}`);
            }
        })
        .catch(error => {
            console.error('Edit form submit error:', error);
            setFormStatus(editFormStatus, 'error', 'Error: Gagal menghubungi server.');
        });
    });

    // Fungsi global untuk menghapus gambar saat ini
    window.deleteCurrentImage = function() {
        const id_tb = editFormIdTbInput.value;
        const nama_tb = document.getElementById('details-sidebar-tb-name').innerText;

        if (!id_tb) {
             setFormStatus(editFormStatus, 'info', 'Tidak bisa menghapus foto karena data TB belum tersimpan di database.');
            return;
        }
        if (!currentTbData?.details?.foto){
            setFormStatus(editFormStatus, 'info', 'Tidak ada foto yang terpasang untuk dihapus.');
            return;
        }

         if (!confirm('Anda yakin ingin menghapus foto ini secara permanen?')) {
            return;
         }

        setFormStatus(editFormStatus, 'info', 'Menghapus foto...');

        fetch('api/delete_image.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id_tb=${id_tb}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                 setFormStatus(editFormStatus, 'success', 'Foto berhasil dihapus!');

                 // Update data cache
                 if(currentTbData && currentTbData.details) {
                     currentTbData.details.foto = null; // Set foto jadi null di cache
                 }

                 // Langsung update tampilan di form edit dan tombol hapus
                 editFormFotoInput.value = ''; // Kosongkan input file
                 deleteImageBtn.style.display = 'none'; // Sembunyikan tombol hapus

                 // Refresh data sidebar setelah jeda singkat
                 setTimeout(() => {
                    fetchDataForSidebar(nama_tb, 'details');
                 }, 500);


                 // Refresh popup jika marker yang sesuai masih aktif dan terbuka
                 if (currentMarker && currentMarker.feature.properties.name === nama_tb && currentMarker.isPopupOpen()) {
                    console.log("Refreshing active popup after delete...");
                    if(currentKmlCoords.lat !== null && currentKmlCoords.lng !== null){
                       showPopupWithDetails(currentMarker, nama_tb, currentKmlCoords.lat, currentKmlCoords.lng);
                    } else {
                       console.warn("Cannot refresh popup: KML coordinates lost.");
                    }
                 }

            } else {
                setFormStatus(editFormStatus, 'error', `Error: ${data.message || 'Gagal menghapus foto.'}`);
            }
        })
        .catch(error => {
             console.error('Delete image error:', error);
             setFormStatus(editFormStatus, 'error', 'Error: Gagal menghubungi server saat menghapus foto.');
        });
    }

}); 

// done