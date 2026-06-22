"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Filter, PackageCheck, AlertCircle, HandHeart, QrCode, Clock } from "lucide-react";
import Link from "next/link";

export default function CatalogPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("Semua");
  const [activeTab, setActiveTab] = useState("katalog");

  const [borrowModal, setBorrowModal] = useState({ open: false, item: null });
  const [returnModal, setReturnModal] = useState({ open: false, transaction: null, item: null });
  const [catatan, setCatatan] = useState("");
  const [kondisiKembali, setKondisiKembali] = useState("Baik");

  useEffect(() => {
    fetchItems();
    if (user) fetchMyTransactions();
  }, [user]);

  const fetchItems = async () => {
    const querySnapshot = await getDocs(collection(db, "items"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setItems(data);
    setLoading(false);
  };

  const fetchMyTransactions = async () => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("id_pengguna", "==", user.uid), where("status", "in", ["Aktif", "Menunggu"]));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setMyTransactions(data);
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    if (!borrowModal.item || !user) return;
    
    try {
      await updateDoc(doc(db, "items", borrowModal.item.id), { status: "Menunggu Persetujuan" });
      await addDoc(collection(db, "transactions"), {
        id_transaksi: "TRX-" + Date.now(),
        id_barang: borrowModal.item.id,
        nama_barang: borrowModal.item.nama_barang,
        id_pengguna: user.uid,
        nama_peminjam: user.nama,
        tanggal_pinjam: new Date().toISOString(),
        tanggal_kembali: null,
        status: "Menunggu",
        catatan: catatan
      });
      setBorrowModal({ open: false, item: null });
      setCatatan("");
      fetchItems();
      fetchMyTransactions();
      alert("Pengajuan pinjaman berhasil dikirim! Menunggu persetujuan Admin.");
    } catch (error) {
      console.error("Error borrowing", error);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!returnModal.transaction || !returnModal.item) return;

    try {
      await updateDoc(doc(db, "transactions", returnModal.transaction.id), {
        status: "Selesai",
        tanggal_kembali: new Date().toISOString(),
        kondisi_akhir: kondisiKembali
      });
      await updateDoc(doc(db, "items", returnModal.item.id), {
        status: kondisiKembali === "Baik" ? "Tersedia" : "Rusak",
        kondisi: kondisiKembali
      });
      setReturnModal({ open: false, transaction: null, item: null });
      setKondisiKembali("Baik");
      fetchItems();
      fetchMyTransactions();
      alert("Barang berhasil dikembalikan.");
    } catch (error) {
      console.error("Error returning", error);
    }
  };

  const filteredItems = items.filter(item => {
    if (item.status === "Dibutuhkan") return false;
    const matchesSearch = item.nama_barang?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterKat === "Semua" || item.kategori === filterKat;
    return matchesSearch && matchesFilter;
  });

  const categories = ["Semua", ...new Set(items.filter(i => i.status !== "Dibutuhkan").map(i => i.kategori).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Halo, {user?.nama?.split(' ')[0] || 'Anggota'}!</h1>
          <p className="text-gray-500">Jelajahi dan pinjam perlengkapan KKN dengan mudah.</p>
        </div>
        <Link href="/member/scan" className="btn-primary">
          <QrCode className="w-5 h-5" /> Scan Kardus
        </Link>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
        <button 
          className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'katalog' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-800'}`}
          onClick={() => setActiveTab('katalog')}
        >
          Katalog Barang
        </button>
        <button 
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'pinjaman' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-800'}`}
          onClick={() => setActiveTab('pinjaman')}
        >
          Pinjaman Saya {myTransactions.length > 0 && <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{myTransactions.length}</span>}
        </button>
      </div>

      {activeTab === 'katalog' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Cari alat masak, ATK, dll..." className="input-field input-field-dark pl-12" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
              <select className="input-field input-field-dark pl-12 appearance-none" value={filterKat} onChange={(e) => setFilterKat(e.target.value)}>
                {categories.map(kat => <option key={kat} value={kat}>{kat}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center">Memuat katalog...</div>
            ) : filteredItems.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-card text-gray-500">Barang tidak ditemukan.</div>
            ) : (
              filteredItems.map(item => (
                <div key={item.id} className="glass-card overflow-hidden flex flex-col group">
                  <div className="h-48 bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center overflow-hidden">
                    {item.url_foto ? (
                      <img src={item.url_foto} alt={item.nama_barang} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <PackageCheck className="w-16 h-16 text-gray-300" />
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${item.status === 'Tersedia' ? 'bg-green-500 text-white' : item.status === 'Menunggu Persetujuan' ? 'bg-orange-500 text-white' : item.status === 'Dipinjam' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-xs text-primary font-bold mb-1 uppercase tracking-wider">{item.kategori}</p>
                    <h3 className="font-bold text-lg mb-2 leading-tight">{item.nama_barang}</h3>
                    <p className="text-sm text-gray-500 mb-4 flex-1">Kondisi: {item.kondisi}</p>
                    <button disabled={item.status !== "Tersedia"} onClick={() => setBorrowModal({ open: true, item })} className="w-full btn-primary py-2.5 rounded-xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed">
                      {item.status === "Tersedia" ? "Ajukan Pinjaman" : (item.status === "Menunggu Persetujuan" ? "Sedang Diajukan" : "Tidak Tersedia")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myTransactions.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-card text-gray-500">Anda tidak memiliki barang pinjaman aktif.</div>
          ) : (
            myTransactions.map(trx => {
              const itemDetails = items.find(i => i.id === trx.id_barang);
              return (
                <div key={trx.id} className="glass-card p-6 border-l-4 border-primary flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl mb-1">{trx.nama_barang}</h3>
                      <p className="text-sm text-gray-500">{trx.status === "Menunggu" ? "Diajukan: " : "Dipinjam: "} {new Date(trx.tanggal_pinjam).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="p-2 bg-primary/10 text-primary rounded-full">
                      {trx.status === "Menunggu" ? <Clock className="w-5 h-5" /> : <HandHeart className="w-5 h-5"/>}
                    </div>
                  </div>
                  {trx.status === "Menunggu" && (
                    <p className="text-sm text-orange-600 font-medium mb-2 border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-lg inline-block w-fit">Menunggu Persetujuan Admin</p>
                  )}
                  {trx.catatan && <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-4 italic">"{trx.catatan}"</p>}
                  {trx.status === "Aktif" && (
                    <button onClick={() => setReturnModal({ open: true, transaction: trx, item: itemDetails })} className="mt-auto w-full bg-white dark:bg-gray-800 border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold py-2.5 rounded-xl transition-all">
                      Kembalikan Barang
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Borrow Modal */}
      {borrowModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-2">Konfirmasi Peminjaman</h2>
            <p className="text-gray-500 mb-6">Anda akan meminjam <strong className="text-foreground">{borrowModal.item.nama_barang}</strong>.</p>
            <form onSubmit={handleBorrow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Keperluan / Tujuan</label>
                <textarea className="input-field input-field-dark" rows={3} placeholder="Untuk survei, dll..." value={catatan} onChange={e => setCatatan(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setBorrowModal({ open: false, item: null })} className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" className="btn-primary">Kirim Pengajuan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-2">Pengembalian Barang</h2>
            <p className="text-gray-500 mb-6">Kembalikan <strong className="text-foreground">{returnModal.item?.nama_barang}</strong>.</p>
            <form onSubmit={handleReturn} className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30 flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <p className="text-sm text-orange-700 dark:text-orange-400">Pastikan kondisi barang jujur dilaporkan agar sistem pemeliharaan berjalan lancar.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kondisi Barang Saat Dikembalikan</label>
                <select className="input-field input-field-dark" value={kondisiKembali} onChange={e => setKondisiKembali(e.target.value)}>
                  <option value="Baik">Baik (Tidak ada kerusakan)</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setReturnModal({ open: false, transaction: null, item: null })} className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" className="bg-primary text-white font-semibold px-6 py-2 rounded-xl hover:bg-emerald-600">Kembalikan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
