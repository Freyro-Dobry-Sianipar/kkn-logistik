"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Box, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function QRScannerPage() {
  const searchParams = useSearchParams();
  const [scannedId, setScannedId] = useState(null);
  const [boxItems, setBoxItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Cek apakah ada parameter ID di URL (jika di-scan dari kamera bawaan HP)
    const urlId = searchParams.get('id');
    if (urlId) {
      setScannedId(urlId);
      fetchBoxContents(urlId);
      return; // Tidak perlu menyalakan kamera web jika sudah dapat dari URL
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, 
        rememberLastUsedCamera: true,
        videoConstraints: { facingMode: "environment" }
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.pause(true);
        // Jika QR berisi full URL, ekstrak ID-nya. Jika berisi text biasa, langsung pakai.
        let finalId = decodedText;
        if (decodedText.includes('/member/scan?id=')) {
          finalId = new URL(decodedText).searchParams.get('id');
        }
        setScannedId(finalId);
        fetchBoxContents(finalId);
      },
      (errorMessage) => {
        // ignore ongoing scanning errors
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [searchParams]);

  const fetchBoxContents = async (boxId) => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "items"), where("id_kardus", "==", boxId));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (data.length === 0) {
        setError(`Kardus dengan ID ${boxId} kosong atau tidak terdaftar di sistem.`);
      }
      setBoxItems(data);
    } catch (err) {
      setError("Gagal mengambil data dari database.");
    }
    setLoading(false);
  };

  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Link href="/member/catalog" className="inline-flex items-center gap-2 text-primary hover:text-emerald-700 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </Link>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Pemindai Kardus Logistik</h1>
        <p className="text-gray-500">Arahkan kamera ke stiker QR Code di fisik kardus untuk memeriksa isi barang di dalamnya.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="glass-card p-6 overflow-hidden">
          <div id="qr-reader" className="w-full bg-white rounded-xl overflow-hidden [&>div]:border-none [&>div]:shadow-none"></div>
        </div>

        <div className="glass-card p-6 min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : scannedId ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <p className="font-bold">QR Terbaca!</p>
                  <p className="text-sm opacity-80 font-mono">{scannedId}</p>
                </div>
              </div>

              {error ? (
                <div className="p-4 bg-red-50 text-red-500 rounded-xl font-medium text-center">{error}</div>
              ) : (
                <>
                  <h3 className="font-bold text-lg border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Checklist Isi Kardus:</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {boxItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-gray-800/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{item.nama_barang}</p>
                          <p className="text-xs text-gray-500">Kondisi: {item.kondisi}</p>
                        </div>
                        <div className="ml-auto">
                          {item.status === "Tersedia" ? (
                            <span className="w-3 h-3 rounded-full bg-green-500 block shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Ada di dalam kardus"></span>
                          ) : (
                            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded-full border border-red-200">Sedang Dipinjam</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button onClick={handleReset} className="w-full mt-auto py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold transition-colors">
                Pindai Kardus Lain
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-8">
              <Box className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-medium text-gray-500">Kamera Siap</p>
              <p className="text-sm mt-1">Daftar barang akan muncul setelah QR berhasil dipindai.</p>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        #qr-reader { border: none !important; border-radius: 1rem; overflow: hidden; background: transparent; }
        #qr-reader img { margin: 0 auto; }
        #qr-reader__dashboard_section_csr span { margin: 10px 0; display: block; font-family: inherit; font-size: 14px; }
        #qr-reader__dashboard_section_csr button { 
          background: var(--primary) !important; color: white !important; border: none !important; 
          padding: 8px 16px !important; border-radius: 8px !important; cursor: pointer; font-family: inherit; font-weight: 600;
          transition: all 0.2s;
        }
        #qr-reader__dashboard_section_csr button:hover { opacity: 0.9; transform: scale(1.02); }
      `}} />
    </div>
  );
}
