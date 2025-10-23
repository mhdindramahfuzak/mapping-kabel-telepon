document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Inisialisasi Peta
    // Atur koordinat tengah dan zoom awal (sesuaikan dengan area RU II)
    const map = L.map('map').setView([1.353, 102.152], 15);
    let currentMarker = null; // Menyimpan marker yang sedang aktif

    // 2. Tambahkan Tile Layer (Peta Dasar)
    // Menggunakan OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 3. Muat file KML
    // Menggunakan leaflet-omnivore untuk mem-parsing KML
    const kmlLayer = omnivore.kml('peta_kabel.kml')
        .on('ready', function() {
            // Peta di-zoom agar pas dengan semua data KML
            map.fitBounds(kmlLayer.getBounds());

            // Loop setiap layer di KML (titik dan garis)
            kmlLayer.eachLayer(function(layer) {
                // Cek apakah layer adalah TITIK (Placemark dengan <Point>)
                if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === 'Point') {
                    
                    const placemarkName = layer.feature.properties.name;
                    
                    // Beri popup awal
                    layer.bindPopup(`<b>${placemarkName}</b><br><i>Mengambil data...</i>`);

                    // Tambahkan event 'click' pada setiap titik
                    layer.on('click', function(e) {
                        currentMarker = e.target; // Simpan marker yang di-klik
                        const nama_tb = currentMarker.feature.properties.name;
                        
                        // Panggil fungsi untuk mengambil data dari database
                        fetchDataForPlacemark(nama_tb);
                    });
                }
            });
        })
        .addTo(map);

    // 4. Fungsi untuk mengambil data dari API
    function fetchDataForPlacemark(nama_tb) {
        if (!currentMarker) return;

        fetch(`api/get_data.php?nama_tb=${encodeURIComponent(nama_tb)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Buat konten HTML untuk popup
                const popupContent = createPopupContent(data);
                
                // Update konten popup
                currentMarker.setPopupContent(popupContent);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                currentMarker.setPopupContent(`<b>${nama_tb}</b><br><i>Gagal mengambil data.</i>`);
            });
    }

    // 5. Fungsi untuk membuat HTML konten popup
    function createPopupContent(data) {
        const details = data.details || {};
        const history = data.history || [];

        // Bagian Gambar (jika ada)
        let imageHtml = '';
        if (details.foto) {
            imageHtml = `<img src="uploads/${details.foto}" alt="${details.nama_tb}" class="popup-image">`;
        } else {
            imageHtml = `<div class="popup-image" style="text-align:center; padding-top: 80px; color: #888;">Foto tidak tersedia</div>`;
        }

        // Bagian Riwayat
        let historyHtml = '<div class="popup-section-title">Riwayat Perbaikan:</div>';
        if (history.length > 0) {
            history.forEach(item => {
                historyHtml += `
                    <div class="popup-history-item">
                        <div class="history-date">${item.tanggal}</div>
                        <div class="history-keterangan">${item.keterangan}</div>
                        <div class="history-teknisi">Teknisi: ${item.teknisi || '-'}</div>
                    </div>
                `;
            });
        } else {
            historyHtml += '<p style="font-size:0.9em; color:#777;">Belum ada riwayat perbaikan.</p>';
        }

        // Konten Lengkap
        return `
            <div class="popup-header">
                <h3>${details.nama_tb}</h3>
                <p>${details.deskripsi || ''}</p>
            </div>
            ${imageHtml}
            <div class="popup-section-title">Informasi Kabel:</div>
            <p style="font-size:0.9em;">${details.arah_kabel || 'Tidak ada data.'}</p>
            
            ${historyHtml}
            
            ${details.id ? `<button class="popup-action-btn" onclick="showHistoryForm(${details.id}, '${details.nama_tb}')">Tambah Riwayat</button>` : ''}
        `;
    }

    // 6. Fungsi untuk form sidebar
    const sidebar = document.getElementById('sidebar');
    const form = document.getElementById('history-form');
    const formStatus = document.getElementById('form-status');

    // Fungsi global untuk membuka sidebar
    window.showHistoryForm = function(id_tb, nama_tb) {
        document.getElementById('form-id-tb').value = id_tb;
        document.getElementById('sidebar-tb-name').innerText = nama_tb;
        sidebar.classList.add('sidebar-open');
        formStatus.innerHTML = '';
        form.reset();
    }

    // Fungsi global untuk menutup sidebar
    window.closeSidebar = function() {
        sidebar.classList.remove('sidebar-open');
    }

    // Event listener untuk submit form
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Mencegah form submit default
        formStatus.innerHTML = '<i>Menyimpan...</i>';
        
        const formData = new FormData(form);

        fetch('api/tambah_riwayat.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                formStatus.innerHTML = '<span style="color:green;">Riwayat berhasil disimpan!</span>';
                
                // Tutup sidebar setelah 2 detik
                setTimeout(() => {
                    closeSidebar();
                }, 1500);

                // Refresh konten popup jika marker masih ada
                if (currentMarker) {
                    currentMarker.setPopupContent(`<b>${currentMarker.feature.properties.name}</b><br><i>Data diperbarui, klik lagi untuk melihat.</i>`);
                }

            } else {
                formStatus.innerHTML = `<span style="color:red;">Error: ${data.message}</span>`;
            }
        })
        .catch(error => {
            console.error('Form submit error:', error);
            formStatus.innerHTML = '<span style="color:red;">Error: Gagal menghubungi server.</span>';
        });
    });

});