export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#0E0D10] px-6 py-16 text-[#F7F3EC]" dir="rtl">
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <div className="grid h-24 w-24 place-items-center rounded-[2rem] border border-[#C9A86A]/25 bg-[#C9A86A]/10 text-5xl shadow-[0_24px_80px_rgba(0,0,0,0.35)]" aria-hidden="true">
          🌙
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-[#C9A86A]/72" dir="ltr">FadFada offline</p>
        <h1 className="mt-3 font-arserif text-3xl text-[#F7F3EC]/95">فضفضة تحتاج اتصالاً الآن</h1>
        <p className="mt-3 font-arsans text-sm leading-7 text-[#F7F3EC]/60">
          يبدو أن الاتصال انقطع. يمكنك العودة عندما يتوفر الإنترنت، وسنحافظ على التجربة هادئة قدر الإمكان.
        </p>
        <a href="/" className="mt-6 rounded-full border border-[#C9A86A]/35 bg-[#C9A86A]/10 px-5 py-3 font-arsans text-sm font-semibold text-[#C9A86A] transition-colors hover:bg-[#C9A86A] hover:text-[#0E0D10]">
          إعادة المحاولة
        </a>
      </section>
    </main>
  );
}
