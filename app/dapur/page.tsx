'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type OrderItem = {
  id: string;
  quantity: number;
  menus: {
    name: string;
    price: number;
  };
};

type Order = {
  id: string;
  table_id: number;
  total_price: number;
  status: 'pending' | 'preparing' | 'served' | 'paid';
  created_at: string;
  order_items?: OrderItem[];
};

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  // Fungsi untuk mengupdate status pesanan
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Gagal mengupdate status: ' + error.message);
    }
  };

  useEffect(() => {
    // 1. Fetching pesanan yang sedang berjalan (pending & preparing & served) beserta detail order items dan nama menu
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            menus (
              name,
              price
            )
          )
        `)
        .in('status', ['pending', 'preparing', 'served'])
        .order('created_at', { ascending: true }); // Urutkan dari yang paling lama

      if (data) setOrders(data);
    };

    fetchOrders();

    // 2. Berlangganan (Subscribe) ke perubahan tabel orders secara realtime
    const channel = supabase
      .channel('realtime-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          // Ketika ada pesanan baru, ambil ulang dari database agar join order_items terbawa
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new as Order;
          // Periksa apakah status menjadi paid, jika iya, hilangkan dari daftar
          if (updatedOrder.status === 'paid') {
            setOrders((prev) => prev.filter((order) => order.id !== updatedOrder.id));
          } else {
            // Update data namun pertahankan order_items yang sudah ada
            setOrders((prev) =>
              prev.map((order) => 
                order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
              )
            );
          }
        }
      )
      .subscribe();

    // Bersihkan channel saat komponen dilepas untuk menghemat memori
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Dapur</h1>
            <p className="text-slate-500 mt-1">Pesanan masuk akan otomatis muncul di sini</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-600">Realtime Aktif</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-md">
            <p className="text-slate-500 font-medium">Belum ada pesanan yang masuk.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className={`bg-white rounded-md border-t-4 border-slate-200 p-5 shadow-sm flex flex-col justify-between 
                  ${order.status === 'pending' ? 'border-t-orange-500' : 
                    order.status === 'preparing' ? 'border-t-blue-500' : 'border-t-green-500'}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">Meja {order.table_id}</h2>
                      <p className="text-xs text-slate-400 mt-1">ID: {order.id.slice(0, 8)}...</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-sm 
                      ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  
                  {/* Detail Item Menu */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Daftar Pesanan</p>
                    <ul className="space-y-2">
                      {order.order_items?.map((item) => (
                        <li key={item.id} className="flex justify-between text-sm items-center border-b border-slate-50 pb-1">
                          <span className="font-medium text-slate-700">
                            <span className="text-slate-900 font-bold mr-2">{item.quantity}x</span> 
                            {item.menus?.name || 'Menu tidak diketahui'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-medium text-slate-500">Total Tagihan:</p>
                    <p className="text-lg font-bold text-slate-900">Rp {order.total_price.toLocaleString('id-ID')}</p>
                  </div>

                  {/* Tombol Aksi Kasir / Dapur */}
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700 transition"
                      >
                        Konfirmasi & Proses
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'paid')}
                        className="flex-1 bg-slate-800 text-white py-2 rounded text-sm font-bold hover:bg-slate-900 transition"
                      >
                        Tandai Terbayar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}