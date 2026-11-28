import { Link } from 'react-router-dom';

export default function TermsOfUse() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800">
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Foydalanish shartlari</h1>
          <p className="text-sm text-slate-500">4-son Texnikum Davomat tizimi • Yangilangan: 2026-yil</p>
        </div>
        <Link to="/" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Bosh sahifa
        </Link>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">1. Umumiy qoidalar</h2>
          <p>
            Ushbu platforma 4-son texnikum ma’muriyati, o‘qituvchilar, guruh rahbarlari, navbatchilar va ota-onalar uchun davomat hisobini yuritish va nazorat qilish maqsadida taqdim etiladi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">2. Foydalanuvchi majburiyatlari</h2>
          <p>
            Foydalanuvchilar o‘z login va parollarini uchinchi shaxslarga bermasligi, davomat ma’lumotlariga noto‘g‘ri yoki soxta yozuv kiritmasligi hamda tizim xavfsizligiga zarar yetkazuvchi harakatlardan tiyilishi shart.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">3. Javobgarlik chegarasi</h2>
          <p>
            Ma’muriyat tizimning uzluksiz ishlashi uchun texnik choralarni ko‘radi, biroq internet aloqasi uzilishlari yoki foydalanuvchi qurilmasidagi nosozliklar uchun javobgarlik qonunchilik doirasida belgilanadi.
          </p>
        </section>
      </div>
    </main>
  );
}
