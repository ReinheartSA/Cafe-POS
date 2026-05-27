'use client';
import { supabase } from "@/lib/supabase";
import {useEffect, useState} from "react";

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
  
  // STEP 4: State lokal untuk menampung data keranjang
  const [cart, setCart] = useState<CartItem[]>([]);

  // STEP 5: State untuk menandai proses loading saat checkout
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fetching data menu (Dari Step 3)
  useEffect(() => {
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
    
    // Kunci tombol agar kasir tidak menekan 2 kali
    setIsCheckingOut(true); 

    try {
      // 1. Insert ke tabel 'orders' (Asumsi sementara menggunakan Meja No. 1)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          { 
            table_id: 1, 
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

      // 4. Jika semua sukses, bersihkan keranjang dan beri notifikasi
      alert('Berhasil! Pesanan telah dikirim ke dapur.');
      setCart([]);

    } catch (error: any) {
      alert(`Terjadi kesalahan: ${error.message}`);
      console.error('Checkout Error:', error);
    } finally {
      // Buka kembali kunci tombol, terlepas sukses atau gagal
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
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
