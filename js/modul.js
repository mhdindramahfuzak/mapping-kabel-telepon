document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const namaTb = params.get('nama_tb');
    const modulesContainer = document.getElementById('modules-container');
    const pageTbName = document.getElementById('page-tb-name');
    const loadingIndicator = document.getElementById('loading-indicator');
    const saveStatusEl = document.getElementById('autosave-status'); // Elemen status baru
    
    let currentIdTb = null;
    let isDragging = false;
    let dragStartStatus = null;
    let saveTimeout = null; // Timer untuk autosave

    // Optimasi tinggi container
    optimizeContainerHeight();
    window.addEventListener('resize', optimizeContainerHeight);

    function optimizeContainerHeight() {
        const header = document.querySelector('.header-modul');
        const controls = document.querySelector('.controls');
        const headerHeight = header ? header.offsetHeight : 100;
        const controlsHeight = controls ? controls.offsetHeight : 80;
        const availableHeight = window.innerHeight - headerHeight - controlsHeight - 50;
        modulesContainer.style.height = availableHeight + 'px';
    }

    if (!namaTb) {
        alert("Nama TB tidak ditemukan di URL!");
        window.location.href = 'map.html';
        return;
    }

    pageTbName.innerText = namaTb;

    // Load Data
    fetch(`api/get_data.php?nama_tb=${encodeURIComponent(namaTb)}`)
        .then(res => res.json())
        .then(data => {
            if (data.details && data.details.id) {
                currentIdTb = data.details.id;
                loadModulesData(currentIdTb);
            } else {
                loadingIndicator.innerText = "Data TB belum disimpan. Silakan simpan detail TB di peta terlebih dahulu.";
                document.querySelector('.controls').style.display = 'none';
            }
        })
        .catch(err => { console.error(err); loadingIndicator.innerText = "Error load data."; });

    function loadModulesData(id_tb) {
        fetch(`api/get_modules.php?id_tb=${id_tb}`)
            .then(res => res.json())
            .then(data => {
                loadingIndicator.style.display = 'none';
                modulesContainer.innerHTML = '';
                
                if (!data.data || data.data.length === 0) {
                    addFrameUI(1); 
                } else {
                    data.data.forEach(modul => {
                        const match = modul.nama_modul.match(/Frame (\d+)/i);
                        const frameNum = match ? parseInt(match[1]) : 1;
                        // Logika render frame (addFrameUI sudah menangani duplikasi via selector)
                        let frameEl = document.querySelector(`.lsa-frame-column[data-frame-num="${frameNum}"]`);
                        if (!frameEl) {
                            frameEl = addFrameUI(frameNum);
                        }
                        addModuleToFrame(frameEl, modul);
                    });
                    
                    // Urutkan tampilan frame jika acak (opsional, tapi API biasanya sudah urut)
                }
                setupKeyboardNavigation();
            });
    }

    // --- FUNGSI AUTOSAVE (DEBOUNCE) ---
    // Fungsi ini dipanggil setiap user mengetik/klik.
    // Dia akan menunggu 1 detik. Jika ada ketikan lagi, timer di-reset.
    function triggerAutosave() {
        // Ubah status jadi "Menyimpan..."
        if (saveStatusEl) {
            saveStatusEl.innerHTML = '<span style="color:#e67e22;">⟳ Sedang menyimpan...</span>';
        }

        clearTimeout(saveTimeout); // Hapus timer sebelumnya
        
        saveTimeout = setTimeout(() => {
            saveModulesData(true); // Jalankan simpan setelah 1 detik diam
        }, 1000); // Waktu tunda 1000ms (1 detik)
    }

    // --- FUNGSI SIMPAN REAL ---
    window.saveModulesData = function(silent = false) {
        if (!currentIdTb) return;

        const allFrames = document.querySelectorAll('.lsa-frame-column');
        const modulesToSave = [];

        allFrames.forEach((frameEl, fIndex) => {
            const frameNum = fIndex + 1;
            const modulesInFrame = frameEl.querySelectorAll('.module-card');

            modulesInFrame.forEach((modulEl, mIndex) => {
                const modulNum = mIndex + 1;
                const generatedName = `Frame ${frameNum} - Modul ${modulNum}`;
                
                const inputs = modulEl.querySelectorAll('.inp-data');
                const statuses = modulEl.querySelectorAll('.status-bar');
                const pairs = [];

                for(let i=0; i<10; i++) {
                    pairs.push({
                        pair_index: i,
                        label_in: inputs[i].value,  // Data disimpan di label_in
                        label_out: '',              // Kosong
                        status: statuses[i].dataset.val
                    });
                }
                modulesToSave.push({ nama_modul: generatedName, pairs: pairs });
            });
        });

        fetch('api/save_modules.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_tb: currentIdTb, modules: modulesToSave })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') { 
                // Update status jadi "Tersimpan"
                if (saveStatusEl) {
                    saveStatusEl.innerHTML = '<span style="color:#28a745;">✓ Semua perubahan tersimpan</span>';
                }
                // PENTING: Kita HAPUS location.reload() agar tidak refresh saat ngetik
                if(!silent) console.log("Data saved successfully.");
            } else { 
                if (saveStatusEl) {
                    saveStatusEl.innerHTML = '<span style="color:red;">✕ Gagal menyimpan!</span>';
                }
                if(!silent) alert('Gagal: ' + data.message); 
            }
        })
        .catch(err => {
            console.error(err);
            if (saveStatusEl) {
                saveStatusEl.innerHTML = '<span style="color:red;">✕ Error koneksi!</span>';
            }
        });
    }

    // --- RENDER FRAME ---
    window.addFrameUI = function(frameNum = null) {
        if (frameNum === null) {
            const existingFrames = document.querySelectorAll('.lsa-frame-column');
            frameNum = existingFrames.length + 1;
        }

        const div = document.createElement('div');
        div.className = 'lsa-frame-column';
        div.dataset.frameNum = frameNum;

        const isGanjil = (frameNum % 2 !== 0);
        const typeLabel = isGanjil ? "IN" : "OUT";
        const badgeColor = isGanjil ? "#17a2b8" : "#dc3545";

        div.innerHTML = `
            <div class="frame-header-title">
                <span class="frame-label-text">FRAME ${frameNum} <small style="background:${badgeColor}; padding:1px 5px; border-radius:3px;">${typeLabel}</small></span>
                <button type="button" onclick="hapusFrame(this)" style="background:none; border:none; color:#bbb; cursor:pointer; font-size:1.2em;">&times;</button>
            </div>
            <div class="frame-modules-list"></div>
            <div class="frame-footer">
                <button type="button" class="btn-submit btn-secondary" style="font-size:0.8em; padding:5px;" onclick="addModuleToFrame(this.closest('.lsa-frame-column'))">+ Modul</button>
            </div>
        `;

        modulesContainer.appendChild(div);
        
        // Simpan otomatis saat struktur berubah (tambah frame)
        // Gunakan timeout kecil agar DOM render dulu
        setTimeout(() => triggerAutosave(), 100);

        if(document.querySelectorAll('.lsa-frame-column').length > 1 && !loadingIndicator.style.display) {
             div.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
        }
        
        return div;
    }

    // --- RENDER MODUL ---
    window.addModuleToFrame = function(frameElement, data = null) {
        const listContainer = frameElement.querySelector('.frame-modules-list');
        const div = document.createElement('div');
        div.className = 'module-card';

        const existingModules = listContainer.querySelectorAll('.module-card');
        const modulNum = existingModules.length + 1;

        let headerCells = '';
        let inputCells = ''; 
        let statusCells = '';

        const frameText = frameElement.querySelector('.frame-label-text').innerText;
        const isFrameIn = frameText.includes("IN"); 
        const rowLabel = isFrameIn ? "IN" : "OUT";
        const labelColor = isFrameIn ? "#005bab" : "#d93025";

        for (let i = 1; i <= 10; i++) {
            const dataIndex = i - 1;
            const pairData = (data && data.pairs && data.pairs[dataIndex]) ? data.pairs[dataIndex] : {label_in:'', label_out:'', status:'good'};
            
            headerCells += `<div class="lsa-cell lsa-header">${i}</div>`;
            
            // Input Data: Tambahkan event listener 'input' untuk Autosave
            inputCells += `<div class="lsa-cell"><input type="text" class="lsa-input inp-data" value="${pairData.label_in}" placeholder="-" data-col="${i}" oninput="triggerAutosave()"></div>`;
            
            const statusClass = pairData.status === 'bad' ? 'status-bad' : 'status-good';
            statusCells += `<div class="lsa-cell" style="padding:0;"><div class="status-bar ${statusClass}" data-val="${pairData.status}" data-col="${i}" title="Klik/Drag untuk ubah status"></div></div>`;
        }

        div.innerHTML = `
            <div class="module-top-bar">
                <span>Modul ${modulNum}</span>
                <a href="#" onclick="removeModuleWithAnimation(this); return false;" style="color:#999; text-decoration:none;">&times;</a>
            </div>
            <div class="lsa-grid">
                <div class="lsa-cell"></div>
                ${headerCells}
                <div class="lsa-row-label" style="color:${labelColor};">${rowLabel}</div>
                ${inputCells}
                <div class="lsa-row-label" style="color:#555">S</div>
                ${statusCells}
            </div>
        `;

        listContainer.appendChild(div);
        setupStatusDrag(div);
        
        // Simpan otomatis saat struktur berubah (tambah modul), kecuali saat initial load
        if (loadingIndicator.style.display === 'none') {
            triggerAutosave();
        }

        setTimeout(() => setupKeyboardNavigation(), 100);
    }

    // --- BULK STATUS DRAG ---
    function setupStatusDrag(moduleElement) {
        const statusBars = moduleElement.querySelectorAll('.status-bar');
        
        statusBars.forEach(bar => {
            bar.addEventListener('mousedown', (e) => {
                isDragging = true;
                dragStartStatus = bar.dataset.val === 'good' ? 'bad' : 'good';
                toggleStatusBar(bar, dragStartStatus);
                triggerAutosave(); // Simpan saat klik status
                e.preventDefault();
            });

            bar.addEventListener('mouseenter', () => {
                if (isDragging) {
                    toggleStatusBar(bar, dragStartStatus);
                    triggerAutosave(); // Simpan saat drag status
                }
            });
        });
    }

    document.addEventListener('mouseup', () => { isDragging = false; });

    function toggleStatusBar(bar, newStatus) {
        if (newStatus === 'good') {
            bar.classList.remove('status-bad');
            bar.classList.add('status-good');
            bar.dataset.val = 'good';
        } else {
            bar.classList.remove('status-good');
            bar.classList.add('status-bad');
            bar.dataset.val = 'bad';
        }
    }

    // --- KEYBOARD NAV ---
    function setupKeyboardNavigation() {
        const allInputs = document.querySelectorAll('.lsa-input');
        allInputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.style.border = "1px solid #007bff";
            });
            input.addEventListener('blur', () => {
                input.parentElement.style.border = "none";
            });
        });
    }

    // --- GLOBAL FUNCTIONS ---
    window.addNewFrameManual = function() { addFrameUI(); }
    
    window.hapusFrame = function(btn) {
        if(confirm("Hapus Frame ini?")) {
            btn.closest('.lsa-frame-column').remove();
            triggerAutosave(); // Simpan otomatis saat hapus
        }
    }

    window.removeModuleWithAnimation = function(link) {
        if(confirm("Hapus Modul ini?")) {
            link.closest('.module-card').remove();
            triggerAutosave(); // Simpan otomatis saat hapus
        }
    }
    
    // Ekspor fungsi triggerAutosave ke global window agar bisa diakses oleh oninput di HTML string
    window.triggerAutosave = triggerAutosave;
});