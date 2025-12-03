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
    const moduleView = document.getElementById('module-view'); // --- BARU: View Modul ---
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
    
    // --- Elemen Modul (BARU) ---
    const modulesContainer = document.getElementById('modules-container'); 
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
                    popupContent += `<img src="uploads/${details.foto}?t=${new Date().getTime()}" alt="Foto ${placemarkName}" class="popup-image"><br>`; 
                } else {
                    popupContent += `<small><i>Foto tidak tersedia.</i></small><br>`;
                }

                // --- UPDATE: Menambahkan Tombol "Lihat Isi Kabel" ---
                popupContent += `
                    <button class="popup-main-btn view-details-btn" onclick="openSidebar('details', '${placemarkName.replace(/'/g, "\\'")}', ${lat}, ${lng})">Lihat Detail</button>
                    <button class="popup-main-btn add-history-btn" onclick="openSidebar('history', '${placemarkName.replace(/'/g, "\\'")}', ${lat}, ${lng})">Tambah Riwayat</button>
                    <a href="modul.html?nama_tb=${encodeURIComponent(placemarkName)}" target="_blank" class="popup-main-btn btn-kabel" style="margin-top:5px; width:100%; display:block; text-decoration:none; line-height:30px; text-align:center;">Lihat Isi Kabel</a>
                `;

                // Update popup yang sudah terbuka
                if (currentMarker && currentMarker.isPopupOpen()) {
                    currentMarker.setPopupContent(popupContent);
                } else {
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

                    // === KODE MODIFIKASI IKON ===
                    let iconColor = 'cadetblue'; 
                    let iconGlyph = 'info';      

                    if (placemarkName.startsWith('RK')) {
                        iconColor = 'red';
                        iconGlyph = 'network-wired'; 
                    } else if (placemarkName.startsWith('TB')) {
                        iconColor = 'blue';
                        iconGlyph = 'box'; 
                    } else if (placemarkName.startsWith('Telepon')) { 
                        iconColor = 'green';
                        iconGlyph = 'phone'; 
                    } else if (placemarkName.startsWith('Terminal Center')) {
                         iconColor = 'orange'; 
                         iconGlyph = 'server';
                    }

                    const customIcon = L.AwesomeMarkers.icon({
                        icon: iconGlyph,
                        prefix: 'fa', 
                        markerColor: iconColor
                    });

                    if (layer.setIcon) {
                       layer.setIcon(customIcon);
                    }
                    // === AKHIR KODE MODIFIKASI IKON ===

                    layer.on('click', function(e) {
                        L.DomEvent.stopPropagation(e);
                        showPopupWithDetails(e.target, placemarkName, lat, lng);
                    });

                    layer.bindTooltip(placemarkName, {
                        permanent: true,
                        direction: 'right',
                        offset: [10, 0],
                        className: 'kml-label'
                    });

                    layer.off('popupopen');
                    layer.off('popupclose');

                    layer.on('popupclose', function() {
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
        console.log(`Opening sidebar: mode=${mode}, tb=${nama_tb}`);

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

        // --- UPDATE: Menangani Mode 'modules' ---
        if (mode === 'details') {
            detailsView.classList.add('active');
            document.getElementById('details-sidebar-tb-name').innerText = nama_tb;
            displayDeskripsi.innerHTML = "<i>Memuat...</i>";
            displayArahKabel.innerHTML = "<i>Memuat...</i>";
            displayImageContainer.innerHTML = "<i>Memuat...</i>";
            toggleEditBtn.disabled = true;
            deleteImageBtn.style.display = 'none';
            // Ambil data sidebar biasa
            fetchDataForSidebar(nama_tb, mode);

        } else if (mode === 'history') {
            historyFormView.classList.add('active');
            document.getElementById('history-sidebar-tb-name').innerText = nama_tb;
            saveHistoryBtn.disabled = true;
            // Ambil data sidebar biasa
            fetchDataForSidebar(nama_tb, mode);

        } else if (mode === 'modules') {
            // Logika baru untuk Modul
            if (moduleView) {
                moduleView.classList.add('active');
                document.getElementById('module-sidebar-tb-name').innerText = nama_tb;
                
                // Cek apakah data TB sudah ada di cache (dari klik popup)
                if (currentTbData && currentTbData.details && currentTbData.details.id) {
                    loadModulesData(currentTbData.details.id); // Panggil fungsi load modul
                } else {
                    // Jika belum tersimpan di DB
                    alert("Data TB ini belum disimpan di database. Silakan buka 'Lihat Detail' -> 'Edit Data' -> 'Simpan' terlebih dahulu.");
                    closeSidebar();
                    return;
                }
            } else {
                console.error("Elemen module-view tidak ditemukan di HTML!");
            }
        }

        sidebar.classList.add('sidebar-open');
    }

    // Fungsi untuk mengambil data & mengisi sidebar (Detail & History)
    function fetchDataForSidebar(nama_tb, mode) {
        fetch(`api/get_data.php?nama_tb=${encodeURIComponent(nama_tb)}`)
            .then(response => {
                if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
                return response.json();
            })
            .then(data => {
                currentTbData = data;
                const details = data.details || {};
                const idTb = details.id || '';

                toggleEditBtn.disabled = false; 

                if (mode === 'details') {
                    detailsViewIdTbInput.value = idTb;
                    editFormIdTbInput.value = idTb;
                    displayDeskripsi.innerText = details.deskripsi || (idTb ? 'Belum ada deskripsi.' : 'Data belum ada di database.');
                    displayArahKabel.innerText = details.arah_kabel || (idTb ? 'Tidak ada data.' : 'Data belum ada di database.');

                    if (details.foto) {
                        displayImageContainer.innerHTML = `<img src="uploads/${details.foto}?t=${new Date().getTime()}" alt="Foto ${details.nama_tb || nama_tb}">`;
                        deleteImageBtn.style.display = 'block'; 
                    } else {
                        displayImageContainer.innerHTML = `<p><i>Foto tidak tersedia.</i></p>`;
                        deleteImageBtn.style.display = 'none'; 
                    }

                } else if (mode === 'history') {
                    historyFormIdTbInput.value = idTb;
                    saveHistoryBtn.disabled = !idTb; 
                    if (!idTb) {
                        setFormStatus(historyFormStatus, 'info', 'Data TB ini belum ada di database. Silakan edit detail terlebih dahulu untuk menambahkannya.');
                    } else {
                        setFormStatus(historyFormStatus, '', ''); 
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching data for sidebar:', error);
                // Error handling...
            });
    }

    // Fungsi global untuk menutup sidebar
    window.closeSidebar = function() {
        sidebar.classList.remove('sidebar-open');
        toggleEditMode(false);
        document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));
    }

    // Fungsi global untuk toggle mode edit di sidebar
    window.toggleEditMode = function(enable) {
        const idExists = currentTbData?.details?.id;
        if (enable) {
            detailsView.classList.add('edit-mode');
            editFormDeskripsi.value = currentTbData?.details?.deskripsi || '';
            editFormArahKabel.value = currentTbData?.details?.arah_kabel || '';
            editFormFotoInput.value = ''; 
            deleteImageBtn.style.display = (idExists && currentTbData?.details?.foto) ? 'block' : 'none';
        } else {
            detailsView.classList.remove('edit-mode');
            setFormStatus(editFormStatus, '', ''); 
        }
    }

    // Fungsi helper untuk menampilkan status form
    function setFormStatus(element, type, message) {
        element.innerHTML = message ? `<span class="${type}">${message}</span>` : '';
        element.className = `form-status ${type}`; 
    }

    // --- Event Listener untuk Form History & Edit (Sama seperti sebelumnya) ---
    historyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        setFormStatus(historyFormStatus, 'info', 'Menyimpan Riwayat...');
        const formData = new FormData(historyForm);

        fetch('api/tambah_riwayat.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setFormStatus(historyFormStatus, 'success', 'Riwayat berhasil disimpan!');
                historyForm.reset(); 
                setTimeout(() => { closeSidebar(); }, 1500);
            } else {
                setFormStatus(historyFormStatus, 'error', `Error: ${data.message || 'Gagal menyimpan riwayat.'}`);
            }
        })
        .catch(error => {
            setFormStatus(historyFormStatus, 'error', 'Error: Gagal menghubungi server.');
        });
    });

    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        setFormStatus(editFormStatus, 'info', 'Menyimpan Perubahan...');
        const formData = new FormData(editForm);
        const nama_tb = document.getElementById('details-sidebar-tb-name').innerText;
        formData.append('nama_tb_kml', nama_tb);

        if (!formData.get('id_tb') && currentKmlCoords.lat !== null && currentKmlCoords.lng !== null) {
            formData.append('latitude', currentKmlCoords.lat);
            formData.append('longitude', currentKmlCoords.lng);
        } else if (!formData.get('id_tb')) {
             setFormStatus(editFormStatus, 'error', 'Error: Koordinat KML tidak ditemukan untuk entri baru.');
             return; 
        }

        fetch('api/update_tb.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setFormStatus(editFormStatus, 'success', data.message || 'Data berhasil disimpan!');
                const newId = data.new_id || editFormIdTbInput.value; 
                if (data.new_id) {
                     editFormIdTbInput.value = data.new_id;
                     detailsViewIdTbInput.value = data.new_id;
                     if (currentTbData) {
                         if(!currentTbData.details) currentTbData.details = {}; 
                         currentTbData.details.id = data.new_id;
                     }
                }
                if (data.new_photo && currentTbData && currentTbData.details) {
                    currentTbData.details.foto = data.new_photo;
                } else if (data.new_photo === null && currentTbData && currentTbData.details) {
                     currentTbData.details.foto = null;
                }

                setTimeout(() => {
                    fetchDataForSidebar(nama_tb, 'details'); 
                    toggleEditMode(false); 
                }, 1000); 

                 if (currentMarker && currentMarker.feature.properties.name === nama_tb && currentMarker.isPopupOpen()) {
                    if(currentKmlCoords.lat !== null && currentKmlCoords.lng !== null){
                       showPopupWithDetails(currentMarker, nama_tb, currentKmlCoords.lat, currentKmlCoords.lng);
                    }
                 }
            } else {
                setFormStatus(editFormStatus, 'error', `Error: ${data.message || 'Gagal menyimpan data.'}`);
            }
        })
        .catch(error => {
            setFormStatus(editFormStatus, 'error', 'Error: Gagal menghubungi server.');
        });
    });

    window.deleteCurrentImage = function() {
        const id_tb = editFormIdTbInput.value;
        const nama_tb = document.getElementById('details-sidebar-tb-name').innerText;

        if (!id_tb) return;
        if (!confirm('Anda yakin ingin menghapus foto ini secara permanen?')) return;

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
                 if(currentTbData && currentTbData.details) {
                     currentTbData.details.foto = null; 
                 }
                 editFormFotoInput.value = ''; 
                 deleteImageBtn.style.display = 'none'; 
                 setTimeout(() => { fetchDataForSidebar(nama_tb, 'details'); }, 500);
                 if (currentMarker && currentMarker.feature.properties.name === nama_tb && currentMarker.isPopupOpen()) {
                    if(currentKmlCoords.lat !== null && currentKmlCoords.lng !== null){
                       showPopupWithDetails(currentMarker, nama_tb, currentKmlCoords.lat, currentKmlCoords.lng);
                    }
                 }
            } else {
                setFormStatus(editFormStatus, 'error', `Error: ${data.message || 'Gagal menghapus foto.'}`);
            }
        })
        .catch(error => {
             setFormStatus(editFormStatus, 'error', 'Error: Gagal menghubungi server saat menghapus foto.');
        });
    }


    // ==========================================================
    // --- LOGIKA BARU: MANAJEMEN MODUL KABEL (LSA) ---
    // ==========================================================

    // Fungsi ambil data modul dari server
    function loadModulesData(id_tb) {
        if (!modulesContainer) return;
        modulesContainer.innerHTML = '<p><i>Memuat konfigurasi kabel...</i></p>';
        
        fetch(`api/get_modules.php?id_tb=${id_tb}`)
            .then(res => res.json())
            .then(data => {
                modulesContainer.innerHTML = '';
                
                if (!data.data || data.data.length === 0) {
                    // Jika kosong, tambah 1 modul default
                    addModuleUI(); 
                } else {
                    // Render modul yang ada
                    data.data.forEach(modul => {
                        addModuleUI(modul);
                    });
                }
            })
            .catch(err => {
                console.error(err);
                modulesContainer.innerHTML = '<p style="color:red">Gagal memuat modul.</p>';
            });
    }

    // Fungsi render UI Modul (10 kolom)
    window.addModuleUI = function(data = null) {
        const div = document.createElement('div');
        div.className = 'module-card';
        
        const existingModules = modulesContainer.querySelectorAll('.module-card');
        const namaModul = data ? data.nama_modul : `Modul ${existingModules.length + 1}`;
        
        // Header Tabel (0-9)
        let headerCells = '';
        let inCells = '';
        let outCells = '';
        let statusCells = '';
        
        for (let i = 0; i < 10; i++) {
            // Data per kolom
            const pairData = (data && data.pairs && data.pairs[i]) ? data.pairs[i] : {label_in:'', label_out:'', status:'good'};
            
            headerCells += `<div class="lsa-cell lsa-header">${i}</div>`;
            
            inCells += `<div class="lsa-cell"><input type="text" class="lsa-input inp-in" value="${pairData.label_in}" placeholder="-"></div>`;
            
            outCells += `<div class="lsa-cell"><input type="text" class="lsa-input inp-out" value="${pairData.label_out}" placeholder="-"></div>`;
            
            const statusClass = pairData.status === 'bad' ? 'status-bad' : 'status-good';
            statusCells += `<div class="lsa-cell"><button type="button" class="status-toggle ${statusClass}" onclick="toggleStatus(this)" data-val="${pairData.status}"></button></div>`;
        }

        div.innerHTML = `
            <div class="module-header">
                <input type="text" class="module-title-input" value="${namaModul}">
                <button type="button" class="btn-remove-modul" onclick="this.parentElement.parentElement.remove()">Hapus</button>
            </div>
            <div class="lsa-grid">
                <div class="lsa-cell"></div> ${headerCells}

                <div class="lsa-row-label">IN</div>
                ${inCells}

                <div class="lsa-row-label">OUT</div>
                ${outCells}

                <div class="lsa-row-label">STS</div>
                ${statusCells}
            </div>
        `;
        
        modulesContainer.appendChild(div);
    }

    // Fungsi ganti warna status (Hijau/Merah)
    window.toggleStatus = function(btn) {
        if (btn.classList.contains('status-good')) {
            btn.classList.remove('status-good');
            btn.classList.add('status-bad');
            btn.dataset.val = 'bad';
        } else {
            btn.classList.remove('status-bad');
            btn.classList.add('status-good');
            btn.dataset.val = 'good';
        }
    }

    // Fungsi Simpan ke Server
    window.saveModulesData = function() {
        if (!currentTbData || !currentTbData.details.id) return;
        
        const id_tb = currentTbData.details.id;
        const moduleCards = document.querySelectorAll('.module-card');
        const modulesData = [];
        
        moduleCards.forEach(card => {
            const namaModul = card.querySelector('.module-title-input').value;
            const inputsIn = card.querySelectorAll('.inp-in');
            const inputsOut = card.querySelectorAll('.inp-out');
            const statuses = card.querySelectorAll('.status-toggle');
            
            const pairs = [];
            for(let i=0; i<10; i++) {
                pairs.push({
                    label_in: inputsIn[i].value,
                    label_out: inputsOut[i].value,
                    status: statuses[i].dataset.val
                });
            }
            
            modulesData.push({
                nama_modul: namaModul,
                pairs: pairs
            });
        });
        
        // Kirim JSON
        fetch('api/save_modules.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_tb: id_tb, modules: modulesData })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                alert('Konfigurasi kabel berhasil disimpan!');
                closeSidebar();
            } else {
                alert('Gagal menyimpan: ' + data.message);
            }
        })
        .catch(err => console.error(err));
    }

});