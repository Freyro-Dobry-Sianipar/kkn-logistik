"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Activity, Download } from "lucide-react";
import * as XLSX from 'xlsx';

export default function OperationalLogs() {
  const [logs, setLogs] = useState([]);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    jenis_pengeluaran: "Bensin",
    kendaraan: "Yamaha Matic",
    nominal: "",
    deskripsi: ""
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const querySnapshot = await getDocs(collection(db, "operational_logs"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
    setLogs(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "operational_logs"), {
        ...formData,
        id_log: "LOG-" + Date.now()
      });
      setFormData({...formData, nominal: "", deskripsi: ""});
      fetchLogs();
    } catch (error) {
      console.error("Error adding log", error);
    }
  };

  const exportToExcel = () => {
    if (logs.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }

    const exportData = logs.map(log => ({
      "ID Log": log.id_log || "-",
      "Tanggal": log.tanggal,
      "Jenis Pengeluaran": log.jenis_pengeluaran,
      "Kendaraan": log.kendaraan,
      "Nominal (Rp)": Number(log.nominal),
      "Deskripsi": log.deskripsi || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Log Operasional");
    XLSX.writeFile(workbook, `Log_Operasional_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalPengeluaran = logs.reduce((acc, curr) => acc + Number(curr.nominal), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-500/10 rounded-xl"><Activity className="text-orange-500 w-8 h-8" /></div>
        <div>
          <h1 className="text-3xl font-bold">Log Operasional</h1>
          <p className="text-gray-500">Pencatatan biaya mobilitas dan distribusi logistik</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4">Catat Pengeluaran</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal</label>
              <input type="date" required className="input-field input-field-dark" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jenis Pengeluaran</label>
              <select className="input-field input-field-dark" value={formData.jenis_pengeluaran} onChange={e => setFormData({...formData, jenis_pengeluaran: e.target.value})}>
                <option>Bensin</option>
                <option>Parkir</option>
                <option>Sewa Pick-Up</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kendaraan</label>
              <input type="text" required className="input-field input-field-dark" value={formData.kendaraan} onChange={e => setFormData({...formData, kendaraan: e.target.value})} placeholder="Mobil Pickup" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nominal (Rp)</label>
              <input type="number" required className="input-field input-field-dark" value={formData.nominal} onChange={e => setFormData({...formData, nominal: e.target.value})} placeholder="50000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deskripsi Tambahan</label>
              <textarea className="input-field input-field-dark" value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} rows={2} placeholder="Tujuan survei, dll"></textarea>
            </div>
            <button type="submit" className="w-full btn-primary py-2 rounded-xl">
              <Plus className="w-4 h-4" /> Simpan Catatan
            </button>
          </form>
        </div>

        <div className="md:col-span-2 glass-card p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className="text-xl font-bold">Riwayat Pengeluaran</h2>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
              <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> Export Excel
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-orange-600">Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {logs.map(log => (
              <div key={log.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-white transition-colors">
                <div>
                  <p className="font-semibold text-lg">{log.jenis_pengeluaran} - {log.kendaraan}</p>
                  <p className="text-sm text-gray-500">{new Date(log.tanggal).toLocaleDateString('id-ID')} • {log.deskripsi}</p>
                </div>
                <div className="font-bold text-xl text-orange-600">
                  Rp {Number(log.nominal).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-center text-gray-500 py-10">Belum ada riwayat pengeluaran.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
