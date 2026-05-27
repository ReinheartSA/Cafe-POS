'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string;
  table_id: number;
  total_price: number;
  status: 'pending' | 'preparing' | 'served' | 'paid';
  created_at: string;
};

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // 1. Fetching pesanan yang sedang berjalan (pending & preparing)
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'preparing'])
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
          // Ketika ada pesanan baru, otomatis tambahkan ke state tanpa refresh
          const newOrder = payload.new as Order;
          setOrders((prev) => [...prev, newOrder]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          // Ketika status pesanan diubah, perbarui UI secara otomatis
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
          );
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
                className={`bg-white rounded-md border-t-4 border-slate-200 p-5 shadow-sm 
                  ${order.status === 'pending' ? 'border-t-orange-500' : 'border-t-blue-500'}`}
              >
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Meja {order.table_id}</h2>
                    <p className="text-xs text-slate-400 mt-1">ID: {order.id.slice(0, 8)}...</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded-sm 
                    ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {order.status}
                  </span>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-500">Total Tagihan:</p>
                  <p className="text-lg font-bold text-slate-900">Rp {order.total_price.toLocaleString('id-ID')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}