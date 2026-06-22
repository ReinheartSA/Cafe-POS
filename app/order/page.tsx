'use client';
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Scanner } from '@yudiel/react-qr-scanner';

type Menu = {
  id: string | number;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  category?: string;
};

// Tipe data untuk item di dalam keranjang (menggabungkan data menu + quantity)
type CartItem = Menu & { 
  quantity: number; 
};

export default function POSPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk menyimpan nomor meja dari QR Code (URL param)
  const [tableId, setTableId] = useState<number>(0);

  // STEP 4: State lokal untuk menampung data keranjang
  const [cart, setCart] = useState<CartItem[]>([]);

  // Mengelola Status Order Aktif setelah checkout
  const [activeOrder, setActiveOrder] = useState<any>(null);

  // STEP 5: State untuk menandai proses loading saat checkout
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fungsi untuk menangani scan QR Code
  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      try {
        // Coba parsing jika QR code berupa URL (misal: https://domain.com/order?table=5)
        const url = new URL(code);
        const tableParam = url.searchParams.get('table');
        if (tableParam) {
          setTableId(parseInt(tableParam, 10));
          window.history.replaceState(null, '', `?table=${tableParam}`);
        } else {
          alert('QR code tidak dikenali sebagai meja valid.');
        }
      } catch {
        // Jika bukan URL, anggap QR code isinya hanya angka
        if (!isNaN(Number(code))) {
          setTableId(parseInt(code, 10));
          window.history.replaceState(null, '', `?table=${code}`);
        } else {
          alert('QR code tidak dikenali.');
        }
      }
    }
  };

  // Mengambil parameter meja dari URL & Fetch Menu
  useEffect(() => {
    // Mendapatkan nomor meja dari URL parameter (misal: /order?table=5)
    // Digunakan window.location.search agar tidak perlu Suspense Next.js
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      setTableId(parseInt(tableParam, 10));
    }

    const fetchMenus = async () => {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('is_available', true);
      
      if (data) setMenus(data);
      setIsLoading(false);
    };
    fetchMenus();
  }, []);

  // Memonitor perubahan order secara realtime
  useEffect(() => {
    if (!activeOrder) return;

    // Berlangganan (Subscribe) ke perubahan row spesifik milik pelanggan ini
    const channel = supabase
      .channel(`realtime-order-${activeOrder.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${activeOrder.id}` 
        },
        (payload) => {
          setActiveOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  // STEP 4: Fungsi untuk menambah menu ke keranjang
  const addToCart = (menu: Menu) => {
    setCart((prevCart) => {
      // Cek apakah item sudah ada di dalam keranjang
      const isItemExist = prevCart.find((item) => item.id === menu.id);

      if (isItemExist) {
        // Jika sudah ada, naikkan jumlahnya (quantity + 1)
        return prevCart.map((item) =>
          item.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // Jika belum ada, masukkan sebagai item baru dengan quantity = 1
      return [...prevCart, { ...menu, quantity: 1 }];
    });
  };

  // STEP 4: Fungsi untuk mengubah jumlah item (+1 atau -1)
  const updateQuantity = (id: string | number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + delta;
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        // Filter untuk menghapus item jika jumlahnya menjadi 0 atau kurang
        .filter((item) => item.quantity > 0)
    );
  };

  // STEP 4: Menghitung total harga secara otomatis
  const totalPrice = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  // STEP 5: Fungsi Proses Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Pastikan meja telah terdeteksi, jika order memerlukan meja.
    if (tableId === 0) {
      alert("Sistem tidak mendeteksi meja Anda! Pastikan Anda melakukan scan QR Code dari meja yang benar.");
      return;
    }

    // Kunci tombol agar kasir tidak menekan 2 kali
    setIsCheckingOut(true); 

    try {
      // 1. Insert ke tabel 'orders' menggunakan tableId yang didapat dari QR
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          { 
            table_id: tableId, 
            total_price: totalPrice, 
            status: 'pending' 
          }
        ])
        .select() // Wajib ada agar Supabase mengembalikan data yang baru di-insert
        .single(); // Ambil satu baris saja

      if (orderError || !orderData) {
        console.error("Order Insert Error:", orderError);
        throw new Error(orderError?.message || 'Gagal membuat ID Pesanan');
      }

      // 2. Siapkan format data untuk tabel 'order_items'
      const itemsToInsert = cart.map((item) => ({
        order_id: orderData.id, // ID ini didapat dari langkah 1
        menu_id: item.id,
        quantity: item.quantity,
      }));

      // 3. Insert massal (bulk insert) ke tabel 'order_items'
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Items Insert Error:", itemsError);
        throw new Error(itemsError.message || 'Gagal menyimpan detail menu pesanan');
      }

      // 4. Jika semua sukses, bersihkan keranjang dan masuk ke status pelacakan
      setCart([]);
      setActiveOrder(orderData);

    } catch (error: any) {
      alert(`Terjadi kesalahan: ${error.message}`);
      console.error('Checkout Error:', error);
    } finally {
      // Buka kembali kunci tombol, terlepas sukses atau gagal
      setIsCheckingOut(false);
    }
  };

  // Jika pelanggan sedang melacak pesanan (Setelah Checkout)
  if (activeOrder) {
    const statusMap: Record<string, string> = {
      'pending': 'Belum Dibayar / Menunggu',
      'preparing': 'Sedang Diproses Dapur',
      'served': 'Siap Diambil / Selesai'
    };
    
    // Status visual
    const statusColor = 
      activeOrder.status === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
      activeOrder.status === 'preparing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
      'bg-green-100 text-green-700 border-green-200';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 text-center border-b border-slate-100">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Status Pesanan Anda</h1>
            <p className="text-slate-500 text-sm">Nomor Meja: <span className="font-bold text-slate-800">#{activeOrder.table_id}</span></p>
          </div>
          <div className="p-8 flex flex-col items-center space-y-6">
            <div className={`px-6 py-4 rounded-lg border-2 ${statusColor} text-center w-full`}>
              <p className="text-xs uppercase tracking-widest font-bold opacity-80 mb-1">Status Saat Ini</p>
              <h2 className="text-xl font-black">{statusMap[activeOrder.status] || activeOrder.status}</h2>
            </div>
            
            <div className="w-full text-center space-y-2">
              <p className="text-sm text-slate-500">Order ID: <span className="font-mono">{activeOrder.id.slice(0,8)}</span></p>
              <p className="text-sm text-slate-500">Total: <span className="font-bold text-slate-800">Rp {activeOrder.total_price.toLocaleString('id-ID')}</span></p>
            </div>

            {activeOrder.status === 'served' && (
              <p className="text-sm font-bold text-green-600 bg-green-50 px-4 py-3 rounded-lg border border-green-100 mt-4 text-center">
                Minuman kamu sudah siap! Silakan ambil di konter.
              </p>
            )}

            <button 
              onClick={() => setActiveOrder(null)}
              className="mt-6 w-full py-3 bg-slate-900 text-white rounded-md font-bold hover:bg-slate-800 transition-colors"
            >
              Order Makanan Lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Jika tableId belum ada, tampilkan halaman verifikasi (Scanner QR)
  if (tableId === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="p-8 text-center border-b border-slate-100">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verifikasi Meja</h1>
            <p className="text-slate-500 mt-3 text-sm leading-relaxed">
              Silakan arahkan kamera Anda ke QR Code yang berada di sudut meja untuk mulai memesan.
            </p>
          </div>
          <div className="p-6 bg-slate-50">
            <div className="rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-200 mix-blend-multiply aspect-square flex items-center justify-center relative">
              <Scanner 
                onScan={handleScan}
                onError={(err) => console.log('Scan error:', err)}
              />
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400 font-medium">Beri izin akses kamera jika diminta browser.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* Header dengan Info Meja */}
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pemesanan Makanan</h2>
          <p className="text-sm text-slate-500">Silakan pilih menu yang tersedia lalu checkout</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-md">
          <span className="text-xs uppercase tracking-widest font-bold opacity-80 block text-right">Meja</span>
          <span className="text-xl font-black block text-right">#{tableId}</span>
        </div>
      </div>

      {/* Grid Layout: Membagi layar menjadi Katalog (Kiri) dan Keranjang (Kanan) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ================= AREA KATALOG MENU (2 Kolom) ================= */}
        <div className="lg:col-span-2">
          <div className="mb-6 border-b border-slate-200 pb-4">
            <h1 className="text-3xl font-bold text-slate-800">Katalog Menu</h1>
            <p className="text-slate-500 mt-1">Klik pada menu untuk memasukkan ke keranjang</p>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-slate-500">Memuat menu...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {menus.map((menu) => (
                <div 
                  key={menu.id} 
                  onClick={() => addToCart(menu)} // Trigger tambah ke keranjang saat kartu di-klik
                  className="bg-white rounded-md border border-slate-200 overflow-hidden hover:border-slate-400 active:border-blue-500 transition-colors cursor-pointer group"
                >
                  <div className="bg-slate-100 h-32 w-full">
                    <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{menu.category}</span>
                    <h3 className="text-base font-bold text-slate-900 truncate">{menu.name}</h3>
                    <p className="text-slate-700 font-semibold text-sm mt-1">Rp {menu.price ? menu.price.toLocaleString('id-ID') : '0'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= AREA KERANJANG PESANAN (1 Kolom) ================= */}
        <div className="bg-white border border-slate-200 rounded-md p-5 h-fit sticky top-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4">
              Keranjang Pesanan
            </h2>

            {/* Kondisi jika keranjang masih kosong */}
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic text-sm">
                Belum ada menu yang dipilih.
              </div>
            ) : (
              /* Daftar Item di Keranjang */
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border border-slate-100 bg-slate-50 p-3 rounded-md">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-slate-500">Rp {((item.price || 0) * item.quantity).toLocaleString('id-ID')}</p>
                    </div>
                    
                    {/* Tombol Pengatur Jumlah (Quantity) */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-7 h-7 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-100 active:bg-slate-200 font-bold flex items-center justify-center text-xs transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-slate-800 w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-100 active:bg-slate-200 font-bold flex items-center justify-center text-xs transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bagian Total Harga & Tombol Aksi */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center text-slate-900 mb-4">
              <span className="text-sm font-medium text-slate-500">Total Pembayaran:</span>
              <span className="text-xl font-black">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>

            {/* STEP 5: Sambungkan fungsi handleCheckout ke tombol ini */}
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-sm text-center flex items-center justify-center"
            >
              {isCheckingOut ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                'Proses Pesanan'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
