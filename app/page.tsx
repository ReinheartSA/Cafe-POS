'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Tipe Data Menu sesuai skema database
type Menu = { 
  id: string; 
  name: string; 
  price: number; 
  image_url: string; 
  category: string;
};

export default function POSPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // STEP 3: Fetching data dari Supabase
  useEffect(() => {
    const fetchMenus = async () => {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('is_available', true);
      
      if (error) {
        console.error('Error fetching menus:', error);
      } else if (data) {
        setMenus(data);
      }
      setIsLoading(false);
    };
    
    fetchMenus();
  }, []);

  return (
    // Background warna solid (abu-abu sangat terang) khas flat design
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header sederhana dan tegas */}
        <div className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-800">Katalog Menu</h1>
          <p className="text-slate-500 mt-1">Pilih menu untuk ditambahkan ke pesanan</p>
        </div>
        
        {/* State Loading */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <p className="text-slate-500 font-medium">Memuat data menu...</p>
          </div>
        ) : (
          /* Grid Katalog Menu */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {menus.map((menu) => (
              <div 
                key={menu.id} 
                // Card flat: background putih solid, border tipis, tanpa shadow tebal
                className="bg-white rounded-md border border-slate-200 overflow-hidden hover:border-blue-500 transition-colors cursor-pointer group"
              >
                {/* Gambar Menu */}
                <div className="bg-slate-100 h-40 w-full">
                  <img 
                    src={menu.image_url} 
                    alt={menu.name} 
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" 
                  />
                </div>
                
                {/* Info Menu */}
                <div className="p-4">
                  <span className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-1 block">
                    {menu.category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">
                    {menu.name}
                  </h3>
                  <p className="text-slate-700 font-semibold">
                    Rp {menu.price.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}