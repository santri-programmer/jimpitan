// ======= PRODUCTION MODE CHECK =======
const IS_PRODUCTION =
  !window.location.hostname.includes("localhost") &&
  !window.location.hostname.includes("127.0.0.1");

// Simple logger yang non-blocking di dev
const logger = {
  log: (...a) => !IS_PRODUCTION && console.log(...a),
  error: (...a) => console.error(...a),
  warn: (...a) => console.warn(...a),
  info: (...a) => !IS_PRODUCTION && console.info(...a),
  time: (l) => !IS_PRODUCTION && console.time(l),
  timeEnd: (l) => !IS_PRODUCTION && console.timeEnd(l),
};

// ======= DATA & CACHE STRUCTURES =======
const kategoriDonatur = {
  kategori1: [
    "Bpk. H Musta'ani",
    "Bpk. H Cholis",
    "Ibu Istriyah",
    "Bpk. Hasyim",
    "Bpk. Mamat",
    "Bpk. Chanafi",
    "Bpk. Ipin",
    "Bpk. Agus B Z",
    "Bpk. KH. Fatchurrohman",
    "Bpk. Asrofi",
    "Bpk. Umam",
    "Bpk. Yanto",
    "Bpk. Faizin",
    "Bpk. Agus Fauzi",
    "Bpk. Asrohan",
    "Bpk. Kholiq",
    "Bpk. Jubaedi",
    "Ibu Cholis",
    "Bpk. Abror",
    "Bpk. Gustaf",
    "Bpk. Maftukin",
    "Bpk. Ngari",
    "Bpk. Rofiq",
    "Bpk. Syafak",
    "Bpk. Pardi",
    "Bpk. Salam",
    "Bpk. Sofyan",
    "Bpk. Ibin",
    "Bpk. Idiq",
    "Bpk. Slamet",
    "Bpk. Dani",
    "Bpk. Kisman",
  ],
  kategori2: [
    "Sdr. Acin",
    "Bpk. Hambali",
    "Bpk. Andi",
    "Mbah H Lasin",
    "Bpk. H Soleh",
    "Bpk. Ishadi",
    "Bpk. Yahya",
    "Bpk. Mansur",
    "Bpk. Bulkin",
    "Bpk. Yasin",
    "Bpk. Bandi",
    "Bpk. Moko",
    "Bpk. Tambi",
    "Bpk. Dikin",
    "Bpk. Kasin",
    "Bu Mun",
    "Bpk. H Topa",
    "Bpk. Nur",
    "Bpk. Slamet",
    "Bpk. Enal",
    "Bpk. Mauludin",
    "Ibu. Atin",
    "Bpk. Tato",
    "Bpk. Mu'i",
    "Bpk. Robi",
    "Bpk. Yuliyanto",
    "Bpk. Dulbasir",
    "Bpk. Miftah",
    "Bpk. Mulyani",
    "Bpk. Irtadhi",
    "Ibu Sinto",
  ],
  kategori3: [
    "Bpk. Muslih",
    "Bpk. Farkhan",
    "Bpk. Hanif",
    "Bpk. Waluyo",
    "Bpk Indra",
    "Bpk Muhdi",
    "Bpk. Takim",
    "Bpk. Hadi",
    "Bpk. Bali",
    "Bpk. A'an",
    "Bpk. H Ismail",
    "Bpk. H Sobichan",
    "Bpk. Eko Wardoyo",
    "Bpk. Fajar",
    "Bpk. Yanto",
    "Bpk. Suryono",
    "Bpk. Bayu",
    "Bpk. Wari",
    "Bpk. Herman",
    "Bpk. Slamet Riyadi",
    "Sdr. Wahyu Sanjaya",
    "Bpk. Untung",
    "Bpk. Samsudin",
    "Bpk. Imang",
    "Bpk. Supoyo",
    "Bpk. Eko (Kipli)",
    "Bpk. Sani",
    "Bpk. Syarif",
    "Ibu. Mur",
    "Bpk. Sigit",
    "Sdr. Bogi Prabowo",
    "Ibu Sarni",
  ],
};

const kategoriLabel = {
  kategori1: "RT Tengah",
  kategori2: "RT Kulon",
  kategori3: "RT Kidul",
};

// State in-memory super cepat
let dataDonasi = [];
let dataCache = {
  kategori1: new Map(),
  kategori2: new Map(),
  kategori3: new Map(),
  timestamp: new Map(),
};
let donaturTerinput = {
  kategori1: new Set(),
  kategori2: new Set(),
  kategori3: new Set(),
};

// DOM cache
const cachedElements = {};
let db = null;

// ======= INIT =======
document.addEventListener("DOMContentLoaded", async () => {
  logger.time("AppInitialization");

  try {
    db = jimpitanDB;
    await db.init();

    // ⚡ Preload semua kategori ke RAM agar switching instan
    await preloadAllKategori();

    // Tampilkan kategori default (RT Tengah)
    await Promise.all([
      initializeCachedElements(),
      loadDataHariIni("kategori1"),
      muatDropdown("kategori1"),
    ]);

    setupEventListeners();
  } catch (err) {
    logger.error("❌ DB init failed:", err);
    showNotification("Gagal menginisialisasi penyimpanan offline", false);
  }

  requestAnimationFrame(() => {
    document.querySelectorAll(".critical-hidden").forEach((el) => {
      el.classList.remove("critical-hidden");
      el.classList.add("critical-show");
    });
  });

  logger.timeEnd("AppInitialization");
});

// ======= DOM CACHING =======
function initializeCachedElements() {
  const map = {
    tanggalHariIni: "tanggalHariIni",
    notifikasi: "notifikasi",
    kategoriDonatur: "kategoriDonatur",
    donatur: "donatur",
    pemasukan: "pemasukan",
    btnTambah: "btnTambah",
    btnExport: "btnExport",
    btnHapus: "btnHapus",
    tabelDonasi: "tabelDonasi",
    totalDonasi: "totalDonasi",
    dataCount: "dataCount",
    btnRefresh: "btnRefresh",
  };
  Object.keys(map).forEach((k) => {
    cachedElements[k] = document.getElementById(map[k]);
  });

  if (cachedElements.tanggalHariIni) {
    const tanggalHariIni = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    cachedElements.tanggalHariIni.textContent = tanggalHariIni;
  }
}

// ======= PRELOAD SEMUA DATA =======
async function preloadAllKategori() {
  try {
    const kategoriList = Object.keys(kategoriDonatur);
    const today = new Date().toLocaleDateString("id-ID");

    await Promise.all(
      kategoriList.map(async (kategori) => {
        const saved = await db.getDailyInputs(kategori, today).catch(() => []);
        dataCache[kategori] = new Map(saved.map((it) => [it.donatur, it]));
        donaturTerinput[kategori] = new Set(saved.map((it) => it.donatur));
        dataCache.timestamp.set(kategori, Date.now());
      })
    );

    logger.log("✅ Semua kategori telah di-preload ke memori");
  } catch (err) {
    logger.error("⚠️ Gagal preload semua kategori:", err);
  }
}

// ======= EVENT LISTENERS =======
function setupEventListeners() {
  // quick amount clicks (delegated)
  document.addEventListener("click", (e) => {
    const target = e.target.closest && e.target.closest(".quick-amount");
    if (target) {
      const amount = target.getAttribute("data-amount") || "0";
      if (cachedElements.pemasukan) {
        cachedElements.pemasukan.value = amount;
        // cachedElements.pemasukan.focus(); // Dihapus untuk mobile
      }
    }
  });

  if (cachedElements.btnTambah)
    cachedElements.btnTambah.addEventListener("click", tambahData);
  if (cachedElements.btnExport)
    cachedElements.btnExport.addEventListener("click", exportData);
  if (cachedElements.btnHapus)
    cachedElements.btnHapus.addEventListener("click", hapusDataHariIni);

  if (cachedElements.kategoriDonatur) {
    cachedElements.kategoriDonatur.addEventListener(
      "change",
      debounce(async function () {
        const kategori = this.value;
        // Tidak ada loading lagi di sini!
        await loadDataHariIni(kategori);
        await muatDropdown(kategori);
      }, 100)
    );
  }

  if (cachedElements.pemasukan) {
    cachedElements.pemasukan.addEventListener(
      "input",
      debounce(function (e) {
        const v = e.target.value.replace(/\D/g, "");
        if (v.length > 8) e.target.value = v.slice(0, 8);
        else e.target.value = v;
      }, 120)
    );
  }

  if (cachedElements.btnRefresh) {
    cachedElements.btnRefresh.addEventListener("click", () => {
      window.location.reload();
    });
  }

  // ===== event delegation for table actions (edit / delete / save / cancel)
  // ensure we have tbody
  const tbody = cachedElements.tabelDonasi?.querySelector("tbody");
  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const kategori = btn.dataset.kategori;
      const id = btn.dataset.id ? Number(btn.dataset.id) : null;
      const donatur = btn.dataset.donatur; // original string

      if (action === "edit") {
        handleEdit(btn, kategori, donatur, id);
      } else if (action === "delete") {
        await handleDelete(kategori, donatur, id);
      } else if (action === "save") {
        await handleSave(btn, kategori, donatur, id);
      } else if (action === "cancel") {
        // reload the table for that kategori (cancel editing)
        await loadDataHariIni(kategori);
      }
    });
  }
}

// ======= LOAD & RENDER DATA =======
async function loadDataHariIni(kategori) {
  const today = new Date().toLocaleDateString("id-ID");

  // ⚡ Langsung tampil dari RAM tanpa tunggu DB
  const cachedMap = dataCache[kategori];
  if (cachedMap && cachedMap.size > 0) {
    dataDonasi = Array.from(cachedMap.values()).filter(
      (it) => it.tanggal === today
    );
    donaturTerinput[kategori] = new Set(dataDonasi.map((it) => it.donatur));
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    updateDataCount();

    // Sinkron background (tidak mengganggu UI)
    db.getDailyInputs(kategori, today)
      .then((savedData) => {
        dataCache[kategori] = new Map(savedData.map((it) => [it.donatur, it]));
        dataCache.timestamp.set(kategori, Date.now());
      })
      .catch(() => {});
    return;
  }

  // fallback jika cache kosong
  try {
    const savedData = await db.getDailyInputs(kategori, today);
    dataCache[kategori] = new Map(savedData.map((it) => [it.donatur, it]));
    donaturTerinput[kategori] = new Set(savedData.map((it) => it.donatur));
    dataDonasi = savedData;
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    updateDataCount();
  } catch (error) {
    logger.error("❌ loadDataHariIni error:", error);
    dataDonasi = [];
    donaturTerinput[kategori] = new Set();
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    updateDataCount();
  }
}

// ======= CORE ACTIONS =======
async function tambahData() {
  const donatur = cachedElements.donatur?.value;
  const nominal = cachedElements.pemasukan?.value;
  const kategori = cachedElements.kategoriDonatur?.value || "kategori1";

  if (!donatur || nominal === "") {
    showNotification("Nama dan nominal tidak boleh kosong", false);
    return;
  }

  const tanggal = new Date().toLocaleDateString("id-ID");

  try {
    const existing = dataCache[kategori].get(donatur);
    if (existing) {
      await db.updateDailyInput(existing.id, { nominal, tanggal });
      existing.nominal = nominal;
      showNotification(`✏️ Data ${donatur} diperbarui`, true);
    } else {
      const newData = { donatur, nominal, tanggal, kategori };
      const newId = await db.saveDailyInput(newData);
      newData.id = newId;
      dataCache[kategori].set(donatur, newData);
      donaturTerinput[kategori].add(donatur);
      showNotification(`✅ Data ${donatur} berhasil disimpan`, true);
    }

    dataDonasi = Array.from(dataCache[kategori].values());
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    updateDataCount();
    await muatDropdown(kategori);

    cachedElements.pemasukan.value = "";
    // cachedElements.pemasukan.focus(); // Dihapus untuk mobile
  } catch (e) {
    logger.error("❌ tambahData error:", e);
    showNotification("Gagal menyimpan data", false);
  }
}

async function exportData() {
  const kategori = cachedElements.kategoriDonatur?.value || "kategori1";
  if (!dataDonasi.length) {
    showNotification("Tidak ada data untuk diexport", false);
    return;
  }

  try {
    await generatePDF(kategori);
    showNotification(
      `✅ PDF berhasil di-generate untuk ${kategoriLabel[kategori]}`,
      true
    );
  } catch (error) {
    logger.error("❌ PDF generation error:", error);
    showNotification("Gagal membuat PDF", false);
  }
}

// ======= HANDLERS FOR EDIT/DELETE/SAVE (delegated) =======
function handleEdit(btn, kategori, donatur, id) {
  // ambil row
  const tr = btn.closest("tr");
  if (!tr) return;
  const nominalCell = tr.children[1];
  const aksiCell = tr.children[2];

  // ambil nominal dari cache
  const cachedData = dataCache[kategori].get(donatur);
  const current = cachedData ? cachedData.nominal : "0";

  // buat input dan tombol save/cancel
  const input = document.createElement("input");
  input.type = "number";
  input.id = `editInput-${id}`;
  input.value = current;
  input.className = "border p-1 w-24 text-right";

  // clear nominal cell and append input
  nominalCell.textContent = "";
  nominalCell.appendChild(input);

  // create save button
  const saveBtn = document.createElement("button");
  saveBtn.className = "bg-emerald-500 text-white p-2 rounded-lg mx-1";
  saveBtn.dataset.action = "save";
  saveBtn.dataset.kategori = kategori;
  saveBtn.dataset.donatur = donatur;
  saveBtn.dataset.id = String(id);
  saveBtn.innerHTML = `<i class="fas fa-check"></i>`;

  // create cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "bg-gray-500 text-white p-2 rounded-lg mx-1";
  cancelBtn.dataset.action = "cancel";
  cancelBtn.dataset.kategori = kategori;
  cancelBtn.innerHTML = `<i class="fas fa-times"></i>`;

  // replace aksiCell content
  aksiCell.textContent = "";
  aksiCell.appendChild(saveBtn);
  aksiCell.appendChild(cancelBtn);

  // focus input
  input.focus();
}

async function handleSave(btn, kategori, donatur, id) {
  const inputEl = document.getElementById(`editInput-${id}`);
  if (!inputEl) return;
  const nominalBaru = inputEl.value;
  const tanggal = new Date().toLocaleDateString("id-ID");

  try {
    await db.updateDailyInput(id, { nominal: nominalBaru, tanggal });

    // update cache
    const cached = dataCache[kategori].get(donatur);
    if (cached) cached.nominal = nominalBaru;

    dataDonasi = Array.from(dataCache[kategori].values());
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    showNotification(`✅ Data ${donatur} diperbarui`, true);
  } catch (error) {
    logger.error("❌ handleSave error:", error);
    showNotification("Gagal memperbarui data", false);
  }
}

async function handleDelete(kategori, donatur, id) {
  const originalDonatur = donatur;
  if (!confirm(`Hapus data ${originalDonatur}?`)) return;

  try {
    await db.deleteDailyInput(id);

    // hapus dari cache
    dataCache[kategori].delete(originalDonatur);
    donaturTerinput[kategori].delete(originalDonatur);

    dataDonasi = Array.from(dataCache[kategori].values());
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    updateDataCount();
    await muatDropdown(kategori);
    showNotification(`🗑️ Data ${originalDonatur} dihapus`, true);
  } catch (error) {
    logger.error("❌ handleDelete error:", error);
    showNotification("Gagal menghapus data", false);
  }
}

// ======= PDF EXPORT FUNCTION =======
async function generatePDF(kategori) {
  return new Promise((resolve, reject) => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const sortedData = getSortedDataDonasi(kategori);
      const today = new Date().toLocaleDateString("id-ID");
      const total = sortedData.reduce(
        (sum, item) => sum + Number(item.nominal),
        0
      );

      // === HEADER ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("LAPORAN DATA JIMPITAN", 105, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${kategoriLabel[kategori]} - ${today}`, 105, 27, {
        align: "center",
      });

      // Garis pemisah
      doc.setDrawColor(0);
      doc.line(20, 32, 190, 32);

      // === SUMMARY ===
      const summaryY = 40;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const leftX = 20; // kolom kiri
      const rightX = 120; // kolom kanan
      const lineGap = 6;

      doc.text(`Total Data: ${sortedData.length} Iuran`, leftX, summaryY);
      doc.text(
        `Total Nominal: Rp ${total.toLocaleString("id-ID")}`,
        rightX,
        summaryY
      );

      doc.text(`RT: ${kategoriLabel[kategori]}`, leftX, summaryY + lineGap);
      doc.text(`Tanggal: ${today}`, rightX, summaryY + lineGap);

      let y = summaryY + lineGap + 10;

      // === TABEL HEADER ===
      doc.setFont("helvetica", "bold");
      doc.text("No", 20, y);
      doc.text("Nama Donatur", 35, y);
      doc.text("Nominal", 120, y);

      y += 5;
      doc.line(20, y, 190, y);

      // === TABEL BODY ===
      doc.setFont("helvetica", "normal");
      y += 6;

      sortedData.forEach((item, index) => {
        const nominal = Number(item.nominal);
        doc.text(String(index + 1), 20, y);
        doc.text(item.donatur, 35, y);
        doc.text(
          nominal === 0 ? "-" : `Rp ${nominal.toLocaleString("id-ID")}`,
          120,
          y
        );
        y += 6;
      });

      // === TOTAL ===
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 35, y);
      doc.text(`Rp ${total.toLocaleString("id-ID")}`, 120, y);

      // Garis bawah akhir
      y += 4;
      doc.setDrawColor(0);
      doc.line(20, y, 190, y);

      // === FOOTER ===
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Sistem Jimpitan — Halaman ${i} dari ${pageCount}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }

      // === SAVE PDF ===
      const fileName = `Laporan-Jimpitan-${
        kategoriLabel[kategori]
      }-${today.replace(/\//g, "-")}.pdf`;
      doc.save(fileName);

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function hapusDataHariIni() {
  const kategori = cachedElements.kategoriDonatur?.value || "kategori1";
  const today = new Date().toLocaleDateString("id-ID");
  if (!confirm(`Hapus semua data hari ini untuk ${kategoriLabel[kategori]}?`))
    return;

  try {
    await db.deleteDailyInputsByDate(kategori, today);
    dataCache[kategori].clear();
    donaturTerinput[kategori].clear();
    dataDonasi = [];
    renderTabelTerurut(kategori);
    updateTotalDisplay();
    updateDataCount();
    await muatDropdown(kategori);
    showNotification("🗑️ Data hari ini berhasil dihapus", true);
  } catch (e) {
    logger.error("❌ hapusDataHariIni error:", e);
    showNotification("Gagal menghapus data", false);
  }
}

// ======= HELPERS =======
function debounce(fn, wait = 150) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function showNotification(message, isSuccess = true) {
  const notif = cachedElements.notifikasi;
  if (!notif) return;
  notif.textContent = message;
  notif.className = `mb-4 md:mb-6 text-center p-3 md:p-4 rounded-xl transition-all duration-300 ${
    isSuccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
  }`;
  setTimeout(() => {
    notif.textContent = "";
    notif.className =
      "mb-4 md:mb-6 text-center p-3 md:p-4 rounded-xl transition-all duration-300";
  }, 2500);
}

async function muatDropdown(kategori = "kategori1") {
  const select = cachedElements.donatur;
  const names = kategoriDonatur[kategori] || [];
  const sudahInput = donaturTerinput[kategori] || new Set();

  // Donatur yang belum diinput
  const belum = names.filter((n) => !sudahInput.has(n));

  // Kosongkan dropdown
  select.innerHTML = "";
  const frag = document.createDocumentFragment();

  if (belum.length === 0) {
    // Semua donatur sudah diinput ✅
    const opt = new Option("🎉 Semua donatur sudah diinput", "");
    opt.disabled = true;
    frag.appendChild(opt);
    cachedElements.btnTambah.disabled = true;
    cachedElements.pemasukan.disabled = true;

    // 🔹 Tampilkan tombol export data
    if (cachedElements.btnExport) {
      cachedElements.btnExport.classList.remove("hidden");
      cachedElements.btnExport.style.display = "inline-block";
    }
  } else {
    // Masih ada donatur belum diinput
    for (const n of belum) frag.appendChild(new Option(n, n));
    cachedElements.btnTambah.disabled = false;
    cachedElements.pemasukan.disabled = false;

    // 🔹 Sembunyikan tombol export data
    if (cachedElements.btnExport) {
      cachedElements.btnExport.classList.add("hidden");
      cachedElements.btnExport.style.display = "none";
    }
  }

  select.appendChild(frag);
}

function getSortedDataDonasi(kategori) {
  const map = new Map(dataDonasi.map((it) => [it.donatur, it]));
  const ordered = [];
  (kategoriDonatur[kategori] || []).forEach((n) => {
    if (map.has(n)) ordered.push(map.get(n));
  });
  return ordered;
}

function renderTabelTerurut(kategori) {
  const tabel = cachedElements.tabelDonasi;
  if (!tabel) return;
  const tbody = tabel.querySelector("tbody");
  const sorted = getSortedDataDonasi(kategori);

  tbody.innerHTML = "";
  if (!sorted.length) {
    const r = document.createElement("tr");
    r.innerHTML = `<td colspan="3" class="py-6 text-center text-gray-500"><i class="fas fa-inbox text-3xl mb-2"></i><div>Tidak ada data</div></td>`;
    tbody.appendChild(r);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const item of sorted) {
    const tr = document.createElement("tr");

    // Nama donatur cell (textContent to avoid HTML injection)
    const tdName = document.createElement("td");
    tdName.className = "py-3 px-4";
    tdName.textContent = item.donatur;

    // Nominal cell
    const tdNominal = document.createElement("td");
    tdNominal.className = "py-3 px-4 text-right font-mono";
    if (parseInt(item.nominal) === 0) {
      const span = document.createElement("span");
      span.className = "text-gray-400 italic";
      span.textContent = "Tidak Mengisi";
      tdNominal.appendChild(span);
    } else {
      tdNominal.textContent =
        "Rp " + Number(item.nominal).toLocaleString("id-ID");
    }

    // Aksi cell (buttons)
    const tdAksi = document.createElement("td");
    tdAksi.className = "py-3 px-4 text-center";

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "bg-amber-500 text-white p-2 rounded-lg mx-1";
    editBtn.dataset.action = "edit";
    editBtn.dataset.kategori = kategori;
    editBtn.dataset.donatur = item.donatur;
    editBtn.dataset.id = String(item.id);
    editBtn.setAttribute("aria-label", `Edit ${item.donatur}`);
    editBtn.innerHTML = `<i class="fas fa-edit"></i>`;

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "bg-red-500 text-white p-2 rounded-lg mx-1";
    delBtn.dataset.action = "delete";
    delBtn.dataset.kategori = kategori;
    delBtn.dataset.donatur = item.donatur;
    delBtn.dataset.id = String(item.id);
    delBtn.setAttribute("aria-label", `Hapus ${item.donatur}`);
    delBtn.innerHTML = `<i class="fas fa-trash"></i>`;

    tdAksi.appendChild(editBtn);
    tdAksi.appendChild(delBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdNominal);
    tr.appendChild(tdAksi);

    frag.appendChild(tr);
  }

  tbody.appendChild(frag);
}

// ======= UTILITY / CSV / DOWNLOAD =======
function updateTotalDisplay() {
  const total = dataDonasi.reduce((s, it) => s + Number(it.nominal), 0);
  cachedElements.totalDonasi.textContent =
    "Rp " + total.toLocaleString("id-ID");
}

function updateDataCount() {
  cachedElements.dataCount.textContent = `${dataDonasi.length} data`;
}

function generateCSVContent(sortedData, kategori) {
  let csv = "Nama,Nominal,Tanggal,Kategori\n";
  sortedData.forEach((item) => {
    const nominal =
      item.nominal === "0"
        ? "Tidak Mengisi"
        : `Rp ${Number(item.nominal).toLocaleString("id-ID")}`;
    csv += `"${item.donatur}","${nominal}","${item.tanggal}","${kategoriLabel[kategori]}"\n`;
  });
  const total = sortedData.reduce((s, it) => s + Number(it.nominal), 0);
  csv += `\n"Total","Rp ${total.toLocaleString("id-ID")}","",""`;
  return csv;
}

function downloadCSV(csvContent, kategori) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
  link.href = url;
  link.download = `data-jimpitan-${kategoriLabel[kategori]}-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// NOTE: old escape/unescape are removed because we no longer build inline JS strings.
// If you need them for other parts, implement proper encoding (e.g. encodeURIComponent).

// ======= Backwards-compatible globals (optional) =======
// Keep function names as aliases so external callers still work
window.editRow = function (btn, kategori, donatur, id) {
  // In case something still calls inline, try to find the button in DOM closest to btn
  // but prefer using delegation. Here we just call handler directly:
  handleEdit(btn, kategori, donatur, id);
};
window.hapusRow = function (kategori, donatur, id) {
  handleDelete(kategori, donatur, id);
};
window.simpanEdit = function (kategori, donatur, id) {
  // find a button to pass to handleSave - but direct call works too
  handleSave(null, kategori, donatur, id);
};

// ======= END OF FILE =======
