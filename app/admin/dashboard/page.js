"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Plus, Edit, Trash2, AlertTriangle, Package, Calendar, Box, Activity, Download, Image as ImageIcon, Check, X, History } from "lucide-react";
import Link from "next/link";
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventaris");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    nama_barang: "", kategori: "", url_foto: "", status: "Tersedia",
    kondisi: "Baik", tipe_kepemilikan: "Aset Beli", kontak_vendor: "",
    tenggat_pengembalian: "", lokasi_saat_ini: "", id_kardus: ""
  });

  const daftarKategori = [
    "Peralatan Kegiatan",
    "Peralatan Kebersihan",
    "Peralatan Listrik",
    "Peralatan Dapur",
    "Alat Tulis Kantor (ATK)",
    "P3K & Obat-obatan",
    "Dekorasi",
    "Lainnya"
  ];

  useEffect(() => {
    fetchItems();
    fetchTransactions();
  }, []);

  const fetchItems = async () => {
    const querySnapshot = await getDocs(collection(db, "items"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setItems(data);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    const querySnapshot = await getDocs(collection(db, "transactions"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    data.sort((a, b) => new Date(b.tanggal_pinjam) - new Date(a.tanggal_pinjam));
    setTransactions(data);
  };

  const pendingApprovals = transactions.filter(t => t.status === "Menunggu");

  const isMaintenanceNeeded = (item) => {
    if ((item.tipe_kepemilikan === "Sewa Vendor" || item.tipe_kepemilikan === "Pinjam UNIMED") && item.tenggat_pengembalian) {
      const today = new Date();
      const tenggat = new Date(item.tenggat_pengembalian);
      const diffTime = tenggat - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 1;
    }
    return item.kondisi !== "Baik";
  };

  const filteredItems = items.filter(item => 
    item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.id_kardus && item.id_kardus.toLowerCase().includes(searchQuery.toLowerCase())) ||
    item.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maintenanceItems = filteredItems.filter(isMaintenanceNeeded);
  const inventarisItems = filteredItems.filter(item => item.status !== "Dibutuhkan");
  const kebutuhanItems = filteredItems.filter(item => item.status === "Dibutuhkan");

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item, tenggat_pengembalian: item.tenggat_pengembalian || "" });
    } else {
      setEditingItem(null);
      setFormData({
        nama_barang: "", kategori: "", url_foto: "", status: "Tersedia",
        kondisi: "Baik", tipe_kepemilikan: "Aset Beli", kontak_vendor: "",
        tenggat_pengembalian: "", lokasi_saat_ini: "", id_kardus: ""
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    
    return new Promise((resolve, reject) => {
      console.log("Mulai memproses foto (Base64)...");
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          // Kompresi Gambar agar ukuran database tidak bengkak
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Ubah ke format JPEG dengan kualitas 60%
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
          console.log("Foto berhasil dikompres dan diubah ke teks Base64!");
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(new Error("Gagal membaca gambar"));
      };
      reader.onerror = (error) => reject(new Error("Gagal membaca file"));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let finalUrlFoto = formData.url_foto;
      
      if (imageFile) {
        console.log("Memanggil uploadImage()...");
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) finalUrlFoto = uploadedUrl;
      }

      const dataToSave = {
        ...formData,
        url_foto: finalUrlFoto,
        id_barang: editingItem ? editingItem.id_barang : "ITM-" + Date.now()
      };

      if (editingItem) {
        await updateDoc(doc(db, "items", editingItem.id), dataToSave);
      } else {
        await addDoc(collection(db, "items"), dataToSave);
      }
      setIsModalOpen(false);
      setImageFile(null);
      fetchItems();
    } catch (error) {
      console.error("Error saving item", error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Hapus barang ini?")) {
      await deleteDoc(doc(db, "items", id));
      fetchItems();
    }
  };

  const handleApprove = async (trx) => {
    try {
      await updateDoc(doc(db, "transactions", trx.id), { status: "Aktif" });
      await updateDoc(doc(db, "items", trx.id_barang), { status: "Dipinjam" });
      fetchItems();
      fetchTransactions();
    } catch(err) {
      alert("Gagal menyetujui: " + err.message);
    }
  };

  const handleReject = async (trx) => {
    try {
      await updateDoc(doc(db, "transactions", trx.id), { status: "Ditolak" });
      await updateDoc(doc(db, "items", trx.id_barang), { status: "Tersedia" });
      fetchItems();
      fetchTransactions();
    } catch(err) {
      alert("Gagal menolak: " + err.message);
    }
  };

  const exportToExcel = () => {
    const dataToExport = activeTab === 'inventaris' ? inventarisItems 
      : activeTab === 'kebutuhan' ? kebutuhanItems 
      : maintenanceItems;
      
    if (dataToExport.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }

    const exportData = dataToExport.map(item => ({
      "ID Barang": item.id_barang,
      "Nama Barang": item.nama_barang,
      "Kategori": item.kategori,
      "Status": item.status,
      "Kondisi": item.kondisi,
      "Tipe Kepemilikan": item.tipe_kepemilikan,
      "Tenggat Pengembalian": item.tenggat_pengembalian || "-",
      "Lokasi Saat Ini": item.lokasi_saat_ini || "-",
      "ID Kardus": item.id_kardus || "-",
      "Link Foto": (item.url_foto && item.url_foto.startsWith('data:image')) ? "Ada Foto (Tersimpan di Sistem)" : (item.url_foto || "Tidak ada")
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Barang");
    XLSX.writeFile(workbook, `Data_Barang_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl"><Package className="text-primary w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Barang</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4 cursor-pointer hover:bg-white/40" onClick={() => setActiveTab("maintenance")}>
          <div className="p-3 bg-red-500/10 rounded-xl"><AlertTriangle className="text-red-500 w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Perlu Perhatian</p>
            <p className="text-2xl font-bold text-red-500">{maintenanceItems.length}</p>
          </div>
        </div>
        <Link href="/admin/boxes" className="glass-card p-6 flex items-center gap-4 hover:bg-white/40">
          <div className="p-3 bg-blue-500/10 rounded-xl"><Box className="text-blue-500 w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Manajer Kardus</p>
            <p className="text-lg font-semibold text-blue-600">Buat QR →</p>
          </div>
        </Link>
        <Link href="/admin/logs" className="glass-card p-6 flex items-center gap-4 hover:bg-white/40">
          <div className="p-3 bg-orange-500/10 rounded-xl"><Activity className="text-orange-500 w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Log Operasional</p>
            <p className="text-lg font-semibold text-orange-600">Catat Biaya →</p>
          </div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
        <button 
          className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'inventaris' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-800'}`}
          onClick={() => setActiveTab('inventaris')}
        >
          Katalog Inventaris
        </button>
        <button 
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'kebutuhan' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-800'}`}
          onClick={() => setActiveTab('kebutuhan')}
        >
          Daftar Kebutuhan {kebutuhanItems.length > 0 && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{kebutuhanItems.length}</span>}
        </button>
        <button 
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'maintenance' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-800'}`}
          onClick={() => setActiveTab('maintenance')}
        >
          Maintenance {maintenanceItems.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{maintenanceItems.length}</span>}
        </button>
        <button 
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'persetujuan' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-800'}`}
          onClick={() => setActiveTab('persetujuan')}
        >
          Persetujuan {pendingApprovals.length > 0 && <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>}
        </button>
        <button 
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'riwayat' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-800'}`}
          onClick={() => setActiveTab('riwayat')}
        >
          Riwayat Pinjaman
        </button>
      </div>

      {/* Content Table */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold">
            {activeTab === 'inventaris' ? 'Daftar Semua Barang' : 
             activeTab === 'kebutuhan' ? 'Daftar Kebutuhan (Belum Ada)' : 
             activeTab === 'persetujuan' ? 'Persetujuan Pinjaman' :
             activeTab === 'riwayat' ? 'Riwayat Semua Pinjaman' :
             'Peringatan Perawatan & Pengembalian'}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Cari nama, ID, atau kategori..." 
              className="input-field input-field-dark py-2 px-4 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={exportToExcel} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Export Excel
            </button>
            {(activeTab === 'inventaris' || activeTab === 'kebutuhan') && (
              <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none btn-primary py-2 px-4 text-sm flex justify-center items-center gap-2">
                <Plus className="w-4 h-4" /> Tambah Barang
              </button>
            )}
          </div>
        </div>

        {activeTab === 'persetujuan' ? (
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-10 text-gray-500 border border-dashed rounded-xl border-gray-300 dark:border-gray-800">
                Tidak ada pengajuan pinjaman yang menunggu persetujuan.
              </div>
            ) : (
              pendingApprovals.map(trx => (
                <div key={trx.id} className="p-4 border border-orange-100 dark:border-orange-900/30 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-orange-50/50 dark:bg-orange-900/10">
                  <div>
                    <h3 className="font-bold text-lg">{trx.nama_barang}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Diajukan oleh: <span className="font-semibold text-gray-900 dark:text-white">{trx.nama_peminjam}</span></p>
                    <p className="text-xs text-gray-500">Tanggal: {new Date(trx.tanggal_pinjam).toLocaleDateString('id-ID')}</p>
                    {trx.catatan && <p className="text-sm italic text-gray-700 dark:text-gray-300 mt-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-md border border-gray-100 dark:border-gray-700 shadow-sm">Keperluan: {trx.catatan}</p>}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => handleApprove(trx)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                      <Check className="w-4 h-4" /> Setujui
                    </button>
                    <button onClick={() => handleReject(trx)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                      <X className="w-4 h-4" /> Tolak
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'riwayat' ? (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-10 text-gray-500 border border-dashed rounded-xl border-gray-300 dark:border-gray-800">
                Belum ada riwayat transaksi pinjaman.
              </div>
            ) : (
              transactions.map(trx => (
                <div key={trx.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg">{trx.nama_barang}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Peminjam: <span className="font-semibold text-gray-900 dark:text-white">{trx.nama_peminjam}</span></p>
                    <p className="text-xs text-gray-500 mt-1">
                      Mulai: {new Date(trx.tanggal_pinjam).toLocaleDateString('id-ID')}
                      {trx.tanggal_kembali && ` • Selesai: ${new Date(trx.tanggal_kembali).toLocaleDateString('id-ID')}`}
                    </p>
                    {trx.catatan && <p className="text-xs text-gray-400 mt-1">Keperluan: {trx.catatan}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      trx.status === 'Aktif' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      trx.status === 'Selesai' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      trx.status === 'Menunggu' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {trx.status}
                    </span>
                    {trx.kondisi_akhir && <span className="text-[10px] text-gray-400">Kondisi Akhir: {trx.kondisi_akhir}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 w-16">Foto</th>
                <th className="px-4 py-3">Nama Barang</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Kondisi</th>
                <th className="px-4 py-3">Kepemilikan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(activeTab === 'inventaris' ? inventarisItems : activeTab === 'kebutuhan' ? kebutuhanItems : maintenanceItems).map(item => (
                <tr key={item.id} className="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-4">
                    {item.url_foto ? (
                      <img src={item.url_foto} alt={item.nama_barang} className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 font-medium">{item.nama_barang}</td>
                  <td className="px-4 py-4">{item.kategori}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Tersedia' ? 'bg-green-100 text-green-700' : 
                      item.status === 'Dibutuhkan' ? 'bg-gray-100 text-gray-700' :
                      item.status === 'Dipinjam' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>{item.kondisi}</span>
                  </td>
                  <td className="px-4 py-4">
                    {item.tipe_kepemilikan}
                    {item.tenggat_pengembalian && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> {item.tenggat_pengembalian}</div>}
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors inline-block mr-1"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Nama Barang</label>
                <input required type="text" className="input-field input-field-dark" value={formData.nama_barang} onChange={e => setFormData({...formData, nama_barang: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategori</label>
                <input 
                  required 
                  list="kategori-list"
                  type="text" 
                  className="input-field input-field-dark" 
                  value={formData.kategori} 
                  onChange={e => setFormData({...formData, kategori: e.target.value})} 
                  placeholder="Ketik atau pilih kategori" 
                />
                <datalist id="kategori-list">
                  {daftarKategori.map((kategori, index) => (
                    <option key={index} value={kategori} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="input-field input-field-dark" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option>Dibutuhkan</option>
                  <option>Tersedia</option>
                  <option>Dipinjam</option>
                  <option>Rusak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kondisi</label>
                <select className="input-field input-field-dark" value={formData.kondisi} onChange={e => setFormData({...formData, kondisi: e.target.value})}>
                  <option>Baik</option>
                  <option>Rusak Ringan</option>
                  <option>Rusak Berat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipe Kepemilikan</label>
                <select className="input-field input-field-dark" value={formData.tipe_kepemilikan} onChange={e => setFormData({...formData, tipe_kepemilikan: e.target.value})}>
                  <option>Aset Beli</option>
                  <option>Sewa Vendor</option>
                  <option>Pinjam UNIMED</option>
                  <option>Pinjam Desa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tenggat Pengembalian</label>
                <input type="date" className="input-field input-field-dark" value={formData.tenggat_pengembalian} onChange={e => setFormData({...formData, tenggat_pengembalian: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lokasi Saat Ini</label>
                <input type="text" className="input-field input-field-dark" value={formData.lokasi_saat_ini} onChange={e => setFormData({...formData, lokasi_saat_ini: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID Kardus</label>
                <input type="text" className="input-field input-field-dark" value={formData.id_kardus} onChange={e => setFormData({...formData, id_kardus: e.target.value})} placeholder="BOX-123" />
              </div>

              {/* Upload Foto */}
              <div className="sm:col-span-2 mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-medium mb-2">Foto Barang</label>
                <div className="flex items-center gap-4">
                  {(formData.url_foto || imageFile) && (
                    <img 
                      src={imageFile ? URL.createObjectURL(imageFile) : formData.url_foto} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300" 
                    />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setImageFile(e.target.files[0])}
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Unggah foto barang untuk mengetahui kondisi dan memverifikasi keberadaannya.</p>
              </div>
              
              <div className="sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isUploading} className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">Batal</button>
                <button type="submit" disabled={isUploading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {isUploading ? (
                    <>Mengunggah...</>
                  ) : (
                    <>Simpan Barang</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
