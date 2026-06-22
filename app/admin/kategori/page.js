"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Download, FolderTree, Package, Image as ImageIcon } from "lucide-react";
import * as XLSX from 'xlsx';

export default function KategoriPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const querySnapshot = await getDocs(collection(db, "items"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Group categories
    const catMap = new Map();
    data.forEach(item => {
      const cat = item.kategori || "Tanpa Kategori";
      if (!catMap.has(cat)) {
        catMap.set(cat, []);
      }
      catMap.get(cat).push(item);
    });

    const categoryList = Array.from(catMap.entries()).map(([name, items]) => ({
      name,
      items,
      count: items.length
    })).sort((a, b) => b.count - a.count);

    setItems(data);
    setCategories(categoryList);
    if (categoryList.length > 0) {
      setSelectedCategory(categoryList[0].name);
    }
    setLoading(false);
  };

  const exportAllToExcel = () => {
    if (items.length === 0) return;
    
    const workbook = XLSX.utils.book_new();
    
    // Create a sheet for each category
    categories.forEach(cat => {
      const exportData = cat.items.map(item => ({
        "ID Barang": item.id_barang,
        "Nama Barang": item.nama_barang,
        "Status": item.status,
        "Kondisi": item.kondisi,
        "Tipe Kepemilikan": item.tipe_kepemilikan,
        "Lokasi Saat Ini": item.lokasi_saat_ini || "-",
        "Link Foto": (item.url_foto && item.url_foto.startsWith('data:image')) ? "Ada Foto (Tersimpan di Sistem)" : (item.url_foto || "Tidak ada")
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Make sheet name safe (max 31 chars, no special chars)
      const safeSheetName = cat.name.replace(/[\\/*?:[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || "Data");
    });
    
    XLSX.writeFile(workbook, `Rekap_Per_Kategori_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const currentItems = selectedCategory ? categories.find(c => c.name === selectedCategory)?.items || [] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl"><FolderTree className="text-purple-500 w-8 h-8" /></div>
          <div>
            <h1 className="text-3xl font-bold">Kategori Barang</h1>
            <p className="text-gray-500">Rekapitulasi inventaris berdasarkan kelompok kategori</p>
          </div>
        </div>
        <button onClick={exportAllToExcel} className="flex items-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full md:w-auto justify-center">
          <Download className="w-4 h-4" /> Export Semua Kategori (Excel)
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-gray-500">Memuat data...</div>
      ) : categories.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500">Belum ada data barang.</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Categories */}
          <div className="lg:w-1/4">
            <div className="glass-card p-4 space-y-2 sticky top-8">
              <h3 className="font-semibold px-2 mb-4 text-gray-700 dark:text-gray-300">Daftar Kategori</h3>
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                    selectedCategory === cat.name 
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-medium' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  <span className={`text-xs py-0.5 px-2 rounded-full ${
                    selectedCategory === cat.name ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Items Content */}
          <div className="lg:w-3/4">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {selectedCategory}
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {currentItems.length} Barang
                  </span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {currentItems.map(item => (
                  <div key={item.id} className="border border-gray-100 dark:border-gray-800 p-4 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-gray-900">
                    <div className="flex gap-4">
                      {item.url_foto ? (
                        <img src={item.url_foto} alt={item.nama_barang} className="w-16 h-16 object-cover rounded-lg bg-gray-50" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-300">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm leading-tight mb-1">{item.nama_barang}</h4>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                            item.status === 'Tersedia' ? 'bg-green-50 text-green-600' : 
                            item.status === 'Dipinjam' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                          }`}>{item.status}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                            item.kondisi === 'Baik' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                          }`}>{item.kondisi}</span>
                        </div>
                        <p className="text-xs text-gray-500">{item.id_barang}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
