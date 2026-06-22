import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scroll-smooth">
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-black text-2xl tracking-tighter text-slate-900">
            CAFE<span className="text-slate-500">POS</span>
          </div>
          <nav className="flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#our-cafe" className="hover:text-slate-900 transition-colors">Our Cafe</a>
            <Link href="/order" className="hover:text-slate-900 transition-colors">Order</Link>
            <a href="#location" className="hover:text-slate-900 transition-colors">Location & Review</a>
          </nav>
        </div>
      </header>

      <main>
        {/* OUR CAFE SECTION */}
        <section id="our-cafe" className="pt-24 pb-20 px-6 max-w-7xl mx-auto min-h-[80vh] flex flex-col justify-center items-center text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 drop-shadow-sm">
            Experience the Minimalist <br /> Coffee Culture
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Welcome to CAFE POS, a place where simplicity meets extraordinary taste. 
            Enjoy our carefully curated coffee beans and calm atmosphere. Order from your table 
            easily through our modern POS system, straight to our kitchen.
          </p>
          <div className="flex space-x-4">
            <Link 
              href="/order" 
              className="px-8 py-4 bg-slate-900 text-white rounded-md font-bold hover:bg-slate-800 transition-colors shadow-md"
            >
              Start Ordering
            </Link>
            <a 
              href="#location" 
              className="px-8 py-4 bg-white border border-slate-300 text-slate-700 rounded-md font-bold hover:bg-slate-50 transition-colors shadow-sm"
            >
              Find Us
            </a>
          </div>
        </section>

        {/* DETAILS SECTION / DECORATIVE */}
        <section className="bg-slate-100 py-16 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-3">Premium Beans</h3>
              <p className="text-slate-500 text-sm leading-relaxed">We source only the finest coffee beans from local farmers.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-3">Cozy Ambiance</h3>
              <p className="text-slate-500 text-sm leading-relaxed">A minimalist space designed for deep focus and relaxation.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-3">Fast Order</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Scan, order, and pay directly from your phone. No waiting in line.</p>
            </div>
          </div>
        </section>

        {/* LOCATION & REVIEW SECTION */}
        <section id="location" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Location & Reviews</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Visit us and enjoy the authentic taste of minimalist coffee. Leave us a review on Google Maps to help us grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            {/* Map Frame */}
            <div className="rounded-lg overflow-hidden border border-slate-200 shadow-inner h-80 bg-slate-100">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126907.08630048121!2d106.759477!3d-6.229728!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e945e34b9d%3A0x100c5e82dd4b820!2sJakarta%2C%20Daerah%20Khusus%20Ibukota%20Jakarta!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>

            {/* Address & Actions */}
            <div className="flex flex-col space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Jakarta, Indonesia</h3>
                <p className="text-slate-600 leading-relaxed">
                  Jl. Sudirman No. 123, Central Jakarta<br />
                  DKI Jakarta, 10220
                </p>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Opening Hours</p>
                <ul className="text-slate-600 space-y-2">
                  <li className="flex justify-between border-b border-slate-100 pb-2"><span>Monday - Friday</span> <span>08:00 AM - 10:00 PM</span></li>
                  <li className="flex justify-between border-b border-slate-100 pb-2"><span>Saturday - Sunday</span> <span>09:00 AM - 11:00 PM</span></li>
                </ul>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://maps.google.com/?q=Jakarta" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 text-white rounded-md font-bold text-center hover:bg-blue-700 transition-colors shadow-sm flex-1"
                >
                  Open in Maps
                </a>
                <a 
                  href="https://search.google.com/local/writereview?placeid=ChIJxWv9B--aZS4RMHwX3z7v8w" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-md font-bold text-center hover:bg-slate-50 transition-colors shadow-sm flex-1"
                >
                  Write a Review
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 text-center text-slate-400">
        <div className="max-w-7xl mx-auto px-6">
          <p className="mb-4 text-xl font-bold text-white tracking-tighter">CAFE<span className="text-slate-500">POS</span></p>
          <p className="text-sm">© {new Date().getFullYear()} Cafe POS System. Minimalist & Fast.</p>
        </div>
      </footer>
    </div>
  );
}
