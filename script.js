// Data Initialization
const kategoriDonatur = {
  kategori1: ["Mas Ani", "Pak Kholis", "Pak Hasyim"],
  kategori2: ["Pak A", "Pak B", "Pak C"],
  kategori3: ["Pak A", "Pak B", "Pak C"],
};
const kategoriLabel = {
  kategori1: "RT Tengah",
  kategori2: "RT Kulon",
  kategori3: "RT Kidul",
};

let dataDonasi = {
  kategori1: [],
  kategori2: [],
  kategori3: [],
};

let sudahUploadHariIni = {
  kategori1: false,
  kategori2: false,
  kategori3: false,
};

let donaturTerinput = {
  kategori1: new Set(),
  kategori2: new Set(),
  kategori3: new Set(),
};

// Backend upload URL (ubah sesuai kebutuhan)
const UPLOADURL = "https://api.pnakote.my.id/upload";

let cachedElements = {};
let uploadController = null;

document.addEventListener("DOMContentLoaded", function () {
  cachedElements = {
    tanggalHariIni: document.getElementById("tanggalHariIni"),
    notifikasi: document.getElementById("notifikasi"),
    kategoriDonatur: document.getElementById("kategoriDonatur"),
    donatur: document.getElementById("donatur"),
    pemasukan: document.getElementById("pemasukan"),
    btnTambah: document.getElementById("btnTambah"),
    btnUpload: document.getElementById("btnUpload"),
    btnHapus: document.getElementById("btnHapus"),
    tabelDonasi: document.getElementById("tabelDonasi"),
    totalDonasi: document.getElementById("totalDonasi"),
    uploadStatus: document.getElementById("uploadStatus"),
    uploadInfo: document.getElementById("uploadInfo"),
  };

  // Set current date display
  const tanggalHariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  cachedElements.tanggalHariIni.textContent = tanggalHariIni;

  loadDataDariLocal();

  muatDropdownKategori(cachedElements.kategoriDonatur.value);
  renderTabelTerurut(cachedElements.kategoriDonatur.value);
  updateTotalDisplay();
  checkUploadStatus();
  updateUploadButtonState();

  // Event listeners
  cachedElements.btnTambah.addEventListener("click", tambahData);
  cachedElements.btnUpload.addEventListener("click", uploadToGoogleSheets);
  cachedElements.kategoriDonatur.addEventListener("change", function () {
    const kategori = this.value;
    muatDropdownKategori(kategori);
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    checkUploadStatus();
    updateUploadButtonState();
    resetNominalInput(kategori);
  });
  cachedElements.btnHapus.addEventListener("click", hapusData);
});

// Load dataDonasi dan donaturTerinput dari localStorage yang sudah terstruktur per kategori
function loadDataDariLocal() {
  const savedData = localStorage.getItem("dataDonasi");
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      // Pastikan yang dimuat per kategori
      Object.keys(kategoriDonatur).forEach((kategori) => {
        dataDonasi[kategori] = parsedData[kategori] || [];
        donaturTerinput[kategori] = new Set(
          dataDonasi[kategori].map((item) => item.donatur)
        );
      });
    } catch (e) {
      console.error("Gagal memuat data lokal:", e);
    }
  }
}

// Simpan dataDonasi dalam localStorage per kategori
function simpanDataKeLocal() {
  localStorage.setItem("dataDonasi", JSON.stringify(dataDonasi));
}

// Fungsi hapus data manual
function hapusData() {
  if (confirm("Yakin ingin menghapus semua data yang sudah dimasukkan?")) {
    Object.keys(kategoriDonatur).forEach((kategori) => {
      dataDonasi[kategori] = [];
      donaturTerinput[kategori] = new Set();
    });
    simpanDataKeLocal();
    const kategori = cachedElements.kategoriDonatur.value;
    renderTabelTerurut(kategori);
    muatDropdownKategori(kategori);
    updateTotalDisplay();
    updateUploadButtonState();
    resetNominalInput(kategori);
    showNotification("Data donasi berhasil dihapus.", true);
  }
}

// Fungsi notifikasi
function showNotification(message, isSuccess = true) {
  const notif = cachedElements.notifikasi;
  notif.textContent = message;
  notif.className =
    "mb-4 md:mb-6 text-center p-3 md:p-4 rounded-xl transition-all duration-300 opacity-100 show";
  if (isSuccess) {
    notif.classList.add("bg-green-50", "border-green-200", "text-green-700");
  } else {
    notif.classList.add("bg-red-50", "border-red-200", "text-red-700");
  }
  setTimeout(() => {
    notif.classList.remove("show");
    notif.textContent = "";
    notif.className =
      "mb-4 md:mb-6 text-center p-3 md:p-4 rounded-xl transition-all duration-300";
  }, 3000);
}

// Muat dropdown berdasarkan kategori yang terpilih, hanya nama donatur yang belum input
function muatDropdownKategori(kategori) {
  const select = cachedElements.donatur;
  const names = kategoriDonatur[kategori];
  const donaturBelumDiinput = names.filter(
    (nama) => !donaturTerinput[kategori].has(nama)
  );
  select.innerHTML = "";
  if (donaturBelumDiinput.length === 0) {
    const option = new Option("Semua nominal sudah diinput", "");
    option.disabled = true;
    select.appendChild(option);
    cachedElements.btnTambah.disabled = true;
    cachedElements.btnTambah.querySelector("#btnText").textContent = "Selesai";
    cachedElements.pemasukan.disabled = true;
    resetNominalInput(kategori);
    showNotification("Semua nominal sudah diinput.", true);
  } else {
    donaturBelumDiinput.forEach((nama) => {
      const option = new Option(nama, nama);
      select.appendChild(option);
    });
    cachedElements.btnTambah.disabled = false;
    cachedElements.btnTambah.querySelector("#btnText").textContent = "Tambah";
    cachedElements.pemasukan.disabled = false;
    resetNominalInput(kategori);
    select.selectedIndex = 0;
    setTimeout(() => {
      cachedElements.pemasukan.focus();
    }, 100);
  }
  updateUploadButtonState();
}

// Reset form nominal input ke 0 ketika semua donatur sudah diinput
// atau kosongkan jika belum semua input
function resetNominalInput(kategori) {
  if (semuaDonaturTerinput(kategori)) {
    cachedElements.pemasukan.value = "0";
  } else {
    cachedElements.pemasukan.value = "";
  }
}

// Cek apakah semua donatur sudah diinput untuk kategori
function semuaDonaturTerinput(kategori) {
  return donaturTerinput[kategori].size === kategoriDonatur[kategori].length;
}

// Render tabel daftar donasi sesuai kategori
function renderTabelTerurut(kategori) {
  const tbody = cachedElements.tabelDonasi.querySelector("tbody");
  tbody.innerHTML = "";
  const sortedData = getSortedDataDonasi(kategori);

  sortedData.forEach((item) => {
    const row = tbody.insertRow();
    row.className = "table-row";

    const donaturCell = row.insertCell(0);
    donaturCell.className = "py-3 md:py-4 px-4 md:px-6";
    donaturCell.textContent = item.donatur;

    const nominalCell = row.insertCell(1);
    nominalCell.className = "py-3 md:py-4 px-4 md:px-6 text-right font-mono";
    nominalCell.textContent =
      "Rp " + Number(item.nominal).toLocaleString("id-ID");

    const aksiCell = row.insertCell(2);
    aksiCell.className = "py-3 md:py-4 px-4 md:px-6 text-center";

    // Tombol Edit
    const editBtn = document.createElement("button");
    editBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-label="Edit" width="20" height="20">
        <path d="M12.854 1.146a.5.5 0 0 1 .146.354v11a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.354-.146l-1.5-1.5a.5.5 0 0 1 0-.708l9-9a.5.5 0 0 1 .708 0l3 3zm-2.207 2.207L2.5 11.5V13h1.5l8.147-8.146-2.5-2.5z"/>
      </svg>`;
    editBtn.className = "btn-icon editBtn";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", () =>
      editRow(row, kategori, item.donatur)
    );
    aksiCell.appendChild(editBtn);
  });

  updateTotalDisplay();
}

// Dapatkan data donasi sorted sesuai urutan donatur kategori
function getSortedDataDonasi(kategori) {
  const dataMap = new Map();
  dataDonasi[kategori].forEach((item) => dataMap.set(item.donatur, item));
  const sortedData = [];
  kategoriDonatur[kategori].forEach((nama) => {
    if (dataMap.has(nama)) sortedData.push(dataMap.get(nama));
  });
  return sortedData;
}

// Update display total donasi sesuai kategori
function updateTotalDisplay() {
  const kategori = cachedElements.kategoriDonatur.value;
  let total = 0;
  dataDonasi[kategori].forEach((item) => {
    total += Number(item.nominal);
  });
  cachedElements.totalDonasi.textContent =
    "Rp " + total.toLocaleString("id-ID");
}

// Tambah atau update data donasi
function tambahData() {
  const donatur = cachedElements.donatur.value;
  let nominal = cachedElements.pemasukan.value;
  const kategori = cachedElements.kategoriDonatur.value;

  if (!donatur || nominal === "") {
    showNotification("Nama dan nominal tidak boleh kosong.", false);
    return;
  }

  nominal = Number(nominal);
  if (isNaN(nominal) || nominal < 0) {
    showNotification("Nominal harus angka 0 atau lebih.", false);
    return;
  }

  const tanggal = new Date().toLocaleDateString("id-ID");

  const existingIndex = dataDonasi[kategori].findIndex(
    (item) => item.donatur === donatur
  );

  if (existingIndex !== -1) {
    dataDonasi[kategori][existingIndex].nominal = nominal;
    dataDonasi[kategori][existingIndex].tanggal = tanggal;
  } else {
    dataDonasi[kategori].push({ donatur, nominal, tanggal });
  }

  donaturTerinput[kategori].add(donatur);
  simpanDataKeLocal();
  renderTabelTerurut(kategori);
  muatDropdownKategori(kategori);
  updateUploadButtonState();
  resetNominalInput(kategori);

  setTimeout(() => {
    cachedElements.pemasukan.focus();
  }, 100);
}

// Edit baris di tabel
function editRow(row, kategori, donaturLama) {
  const nominalCell = row.cells[1];
  const aksiCell = row.cells[2];

  const currentNominal = nominalCell.textContent
    .replace("Rp", "")
    .replace(/\./g, "")
    .trim();

  nominalCell.innerHTML = `<input type="number" id="editInput" class="w-full p-1 rounded border border-gray-300" value="${currentNominal}" min="0" />`;

  aksiCell.innerHTML = "";

  // Tombol Save
  const saveBtn = document.createElement("button");
  saveBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-label="Save" width="20" height="20">
      <path d="M13.485 1.929a.75.75 0 0 1 1.06 1.06l-7.07 7.07a.75.75 0 0 1-1.06 0L3.454 7.086a.75.75 0 0 1 1.06-1.06L6 7.51l6.485-6.485z"/>
    </svg>`;
  saveBtn.className = "btn-icon btn-save";
  saveBtn.title = "Save";
  saveBtn.addEventListener("click", () => saveRow(row, kategori, donaturLama));
  aksiCell.appendChild(saveBtn);

  // Tombol Cancel
  const cancelBtn = document.createElement("button");
  cancelBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-label="Cancel" width="20" height="20">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
    </svg>`;
  cancelBtn.className = "btn-icon btn-cancel";
  cancelBtn.title = "Cancel";
  cancelBtn.addEventListener("click", () => renderTabelTerurut(kategori));
  aksiCell.appendChild(cancelBtn);
}

// Save data setelah edit
function saveRow(row, kategori, donaturLama) {
  const newValueInput = document.getElementById("editInput");
  if (!newValueInput) return;

  const newValue = newValueInput.value.trim();
  if (newValue === "") {
    showNotification("Nominal tidak boleh kosong.", false);
    return;
  }

  const nominalBaru = Number(newValue);
  if (isNaN(nominalBaru) || nominalBaru < 0) {
    showNotification("Nominal harus angka 0 atau lebih.", false);
    return;
  }

  const index = dataDonasi[kategori].findIndex(
    (item) => item.donatur === donaturLama
  );

  if (index !== -1) {
    dataDonasi[kategori][index].nominal = nominalBaru;
    simpanDataKeLocal();
    renderTabelTerurut(kategori);
    updateUploadButtonState();
    resetNominalInput(kategori);
    showNotification(`Donasi ${donaturLama} berhasil diperbarui.`, true);
  }
}

// Upload ke backend
async function uploadToGoogleSheets() {
  const kategori = cachedElements.kategoriDonatur.value;
  if (sudahUploadHariIni[kategori]) {
    showUploadStatus(
      `Anda sudah melakukan upload hari ini untuk kategori ${kategoriLabel[kategori]}. Upload hanya dapat dilakukan sekali per hari.`,
      false
    );
    return;
  }
  if (!UPLOADURL) {
    showUploadStatus("URL backend belum diset.", false);
    return;
  }
  if (dataDonasi[kategori].length === 0) {
    showUploadStatus("Tidak ada data untuk diupload.", false);
    return;
  }

  // Cek jika semua donatur sudah input
  if (!semuaDonaturTerinput(kategori)) {
    showUploadStatus(
      "Masih ada sisa data yang belum diinput. Harap lengkapi terlebih dahulu.",
      false
    );
    return;
  }

  showUploadStatus("Mengupload data...", null);
  cachedElements.btnUpload.disabled = true;

  if (uploadController) {
    uploadController.abort();
  }
  uploadController = new AbortController();
  const timeoutId = setTimeout(() => uploadController.abort(), 45000);

  try {
    const sortedDataForUpload = getSortedDataDonasi(kategori);

    const response = await fetch(UPLOADURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ kategori, data: sortedDataForUpload }),
      signal: uploadController.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    const data = JSON.parse(text);

    if (data.result.success) {
      // Tandai upload sukses hari ini
      sudahUploadHariIni[kategori] = true;
      localStorage.removeItem("dataDonasi");
      dataDonasi[kategori] = [];
      donaturTerinput[kategori] = new Set();

      renderTabelTerurut(kategori);
      updateTotalDisplay();
      muatDropdownKategori(kategori);
      resetNominalInput(kategori);
      showUploadStatus(data.message, true);
    } else {
      showUploadStatus(data.message || "Upload gagal", false);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    let errorMessage = "Gagal mengirim data.";
    if (err.name === "AbortError") {
      errorMessage = "Upload dibatalkan karena timeout. Silakan coba lagi.";
    } else if (err.message.includes("Failed to fetch")) {
      errorMessage =
        "Tidak dapat terhubung ke server. Periksa koneksi internet dan server.";
    } else if (err.message.includes("NetworkError")) {
      errorMessage = "Server tidak aktif.";
    } else if (err.message.includes("CORS")) {
      errorMessage =
        "Masalah CORS. Pastikan server mengizinkan request dari domain ini.";
    } else {
      errorMessage = err.message;
    }
    showUploadStatus(errorMessage, false);
    console.error("Upload Error:", err);
  } finally {
    uploadController = null;
    updateUploadButtonState();
  }
}

// Update tombol Upload berdasarkan kondisi dan kategori
function updateUploadButtonState() {
  const kategori = cachedElements.kategoriDonatur.value;
  const semuaSudahDiinput = semuaDonaturTerinput(kategori);
  const sudahUpload = sudahUploadHariIni[kategori];
  const adaData = dataDonasi[kategori].length > 0;
  const shouldEnable = semuaSudahDiinput && !sudahUpload && adaData;

  cachedElements.btnUpload.disabled = !shouldEnable;

  if (shouldEnable) {
    cachedElements.btnUpload.classList.remove("upload-disabled", "bg-gray-400");
    cachedElements.btnUpload.classList.add(
      "bg-green-600",
      "hover:bg-green-700"
    );
    cachedElements.uploadInfo.textContent = "";
  } else if (sudahUpload) {
    cachedElements.uploadInfo.textContent = `Anda sudah melakukan upload hari ini untuk kategori ${kategoriLabel[kategori]}. Upload hanya dapat dilakukan sekali per hari.`;
  } else if (!semuaSudahDiinput) {
    const totalDonatur = kategoriDonatur[kategori].length;
    const sudahDiinput = donaturTerinput[kategori].size;
    const sisa = totalDonatur - sudahDiinput;
    cachedElements.uploadInfo.textContent = `${sisa} data belum diinput. Upload akan aktif setelah semua data diinput.`;
  } else if (!adaData) {
    cachedElements.uploadInfo.textContent = "Tidak ada data untuk diupload.";
  }
}

// Cek dan tampilkan status upload sebelumnya per kategori jika ada
function checkUploadStatus() {
  const kategori = cachedElements.kategoriDonatur.value;
  // Simulasi cek tanggal upload bisa ditambahkan disini
}

// Tampilkan status upload di UI
function showUploadStatus(message, isSuccess = null) {
  const status = cachedElements.uploadStatus;
  status.textContent = message;
  status.className =
    "text-center p-4 rounded-xl transition-all duration-300 opacity-100 show";

  if (isSuccess === true) {
    status.classList.add("bg-green-50", "border-green-200", "text-green-700");
  } else if (isSuccess === false) {
    status.classList.add("bg-red-50", "border-red-200", "text-red-700");
  } else {
    status.classList.add("bg-blue-50", "border-blue-200", "text-blue-700");
  }
}

// Simpan data ke localStorage
function simpanDataOffline(data) {
  localStorage.setItem("dataHarian", JSON.stringify(data));
}

// Ambil data saat aplikasi dibuka kembali
function ambilDataOffline() {
  return JSON.parse(localStorage.getItem("dataHarian")) || [];
}
