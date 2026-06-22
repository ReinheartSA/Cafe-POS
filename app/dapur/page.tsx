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
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ nama: string; role: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // States untuk form login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // 1. Cek sesi saat komponen dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setAuthChecking(false);
    });

    // 2. Berlangganan perubahan status login
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setAuthChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('karyawan')
      .select('nama, role')
      .eq('id', userId)
      .single();
      
    if (data) setUserProfile(data);
    setAuthChecking(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login gagal: ' + error.message);
    setIsLoggingIn(false);
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authChecking) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500 font-bold">Memeriksa Akses Autentikasi...</div>;
  }

  // Jika belum login, tampilkan laman login
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-sm w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 mb-1 text-center tracking-tight">Akses Internal Kafe</h1>
          <p className="text-slate-500 mb-6 text-sm text-center">Login sebagai Manager atau Karyawan</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="nama@kafe.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={isLoggingIn} className="w-full bg-slate-900 text-white font-bold py-3 mt-2 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors">
              {isLoggingIn ? 'Memproses...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Jika sudah login, render komponen dashboard
  return <DashboardContent userProfile={userProfile} onLogout={handleLogout} />;
}

// -------------------------------------------------------------
// KOMPONEN DASHBOARD UTAMA (HANYA DITAMPILKAN JIKA AUTH SUKSES)
// -------------------------------------------------------------
function DashboardContent({ userProfile, onLogout }: { userProfile: any, onLogout: () => void }) {
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
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new as Order;
          if (updatedOrder.status === 'paid') {
            setOrders((prev) => prev.filter((order) => order.id !== updatedOrder.id));
          } else {
            setOrders((prev) =>
              prev.map((order) => 
                order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Dapur</h1>
            <p className="text-slate-500 mt-1">Pesanan masuk akan otomatis muncul di sini</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{userProfile?.nama || 'Memuat...'}</p>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{userProfile?.role || 'User'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-semibold text-slate-600">Online</span>
            </div>
            <button onClick={onLogout} className="ml-2 text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">
              Keluar
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-md shadow-sm">
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

                  {/* Tombol Aksi Kasir / Dapur (Khusus yang berkaitan dengan peran Manager/Karyawan jika diperlukan, saat ini sama) */}
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
