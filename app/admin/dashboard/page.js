"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Edit, Trash2, AlertTriangle, Package, Calendar, Box, Activity } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventaris");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nama_barang: "", kategori: "", url_foto: "", status: "Tersedia",
    kondisi: "Baik", tipe_kepemilikan: "Aset Beli", kontak_vendor: "",
    tenggat_pengembalian: "", lokasi_saat_ini: "", id_kardus: ""
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const querySnapshot = await getDocs(collection(db, "items"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setItems(data);
    setLoading(false);
  };

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

  const maintenanceItems = items.filter(isMaintenanceNeeded);
  const inventarisItems = items.filter(item => item.status !== "Dibutuhkan");
  const kebutuhanItems = items.filter(item => item.status === "Dibutuhkan");

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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        id_barang: editingItem ? editingItem.id_barang : "ITM-" + Date.now()
      };

      if (editingItem) {
        await updateDoc(doc(db, "items", editingItem.id), dataToSave);
      } else {
        await addDoc(collection(db, "items"), dataToSave);
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (error) {
      console.error("Error saving item", error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Hapus barang ini?")) {
      await deleteDoc(doc(db, "items", id));
      fetchItems();
    }
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
      </div>

      {/* Content Table */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {activeTab === 'inventaris' ? 'Daftar Semua Barang' : 
             activeTab === 'kebutuhan' ? 'Daftar Kebutuhan (Belum Ada)' : 
             'Peringatan Perawatan & Pengembalian'}
          </h2>
          {(activeTab === 'inventaris' || activeTab === 'kebutuhan') && (
            <button onClick={() => handleOpenModal()} className="btn-primary py-2 px-4 text-sm">
              <Plus className="w-4 h-4" /> Tambah Barang
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <tr>
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
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors inline-block mr-1"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
                <input required type="text" className="input-field input-field-dark" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})} placeholder="Alat Tulis, Dapur, dll" />
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
              
              <div className="sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" className="btn-primary">Simpan Barang</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
