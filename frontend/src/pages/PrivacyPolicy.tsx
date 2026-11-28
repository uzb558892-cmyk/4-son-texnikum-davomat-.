import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800">
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Maxfiylik siyosati</h1>
          <p className="text-sm text-slate-500">4-son Texnikum Davomat tizimi • Yangilangan: 2026-yil</p>
        </div>
        <Link to="/" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Bosh sahifa
        </Link>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">1. Yig‘iladigan ma’lumotlar</h2>
          <p>
            Tizim o‘quvchilar davomatini yuritish, guruh hisobotlarini shakllantirish va foydalanuvchi akkauntlarini boshqarish maqsadida ism-sharif, guruh ma’lumotlari, davomat holatlari (keldi, sababli, sababsiz, qochdi) hamda tizimga kirish ma’lumotlarini qayta ishlaydi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">2. Ma’lumotlarni saqlash va lokalizatsiya</h2>
          <p>
            Shaxsiy ma’lumotlar O‘zbekiston Respublikasi qonunchiligi talablariga muvofiq himoyalanadi. Ruxsat etilgan shartlar asosida ayrim texnik/tahliliy ma’lumotlar belgilangan tartibda qayta ishlansa-da, <strong>biometrik ma’lumotlar</strong> (yuz tasviri, barmoq izi, ovoz) faqat O‘zbekiston hududida joylashgan serverlarda saqlanadi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">3. Cookie va analitika (Consent Mode v2)</h2>
          <p>
            Analitika va reklama cookie’lari faqat foydalanuvchi roziligi asosida ishga tushadi. Rozilikni istalgan vaqt brauzer ma’lumotlarini tozalash yoki banner orqali o‘zgartirish mumkin.
          </p>
        </section>
      </div>
    </main>
  );
}
