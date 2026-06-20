"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Trash2, Printer, Box } from "lucide-react";

export default function BoxesPage() {
  const [boxes, setBoxes] = useState([]);
  const [namaKardus, setNamaKardus] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    const querySnapshot = await getDocs(collection(db, "boxes"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBoxes(data);
    setLoading(false);
  };

  const handleAddBox = async (e) => {
    e.preventDefault();
    if (!namaKardus) return;
    try {
      await addDoc(collection(db, "boxes"), {
        id_kardus: "BOX-" + Math.floor(Math.random() * 10000), // Random ID simple
        nama_kardus: namaKardus,
        deskripsi: deskripsi
      });
      setNamaKardus("");
      setDeskripsi("");
      fetchBoxes();
    } catch (error) {
      console.error("Error adding box", error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Hapus kardus ini?")) {
      await deleteDoc(doc(db, "boxes", id));
      fetchBoxes();
    }
  };

  const printQR = (boxId) => {
    const printContents = document.getElementById(`qr-${boxId}`).innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100vh;">${printContents}</div>`;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); 
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-500/10 rounded-xl"><Box className="text-blue-500 w-8 h-8" /></div>
        <div>
          <h1 className="text-3xl font-bold">Manajemen Kardus & QR</h1>
          <p className="text-gray-500">Buat dan cetak QR Code untuk pengelompokan barang</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4">Tambah Kardus Baru</h2>
          <form onSubmit={handleAddBox} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Kardus</label>
              <input type="text" required className="input-field input-field-dark" value={namaKardus} onChange={e => setNamaKardus(e.target.value)} placeholder="Kardus A - Dapur" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deskripsi</label>
              <textarea className="input-field input-field-dark" value={deskripsi} onChange={e => setDeskripsi(e.target.value)} placeholder="Isi singkat" rows={3} />
            </div>
            <button type="submit" className="w-full btn-primary py-2 rounded-xl">
              <Plus className="w-4 h-4" /> Generate QR Code
            </button>
          </form>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full text-center py-10">Memuat data...</div>
          ) : boxes.length === 0 ? (
             <div className="col-span-full text-center py-10 glass-card text-gray-500">Belum ada kardus.</div>
          ) : (
            boxes.map(box => (
              <div key={box.id} className="glass-card p-6 flex flex-col items-center text-center">
                <div id={`qr-${box.id}`} className="p-4 bg-white rounded-xl shadow-sm mb-4">
                  <QRCodeSVG value={box.id_kardus} size={120} level="H" includeMargin={true} />
                  <p className="mt-2 text-xs font-mono text-gray-600">{box.id_kardus}</p>
                </div>
                <h3 className="font-bold text-lg leading-tight">{box.nama_kardus}</h3>
                <p className="text-xs text-gray-500 mb-4 mt-1">{box.deskripsi}</p>
                <div className="flex gap-2 w-full mt-auto">
                  <button onClick={() => printQR(box.id)} className="flex-1 flex justify-center items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-xl transition-colors text-sm font-medium">
                    <Printer className="w-4 h-4" /> Cetak
                  </button>
                  <button onClick={() => handleDelete(box.id)} className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
