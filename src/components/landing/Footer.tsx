export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#020816] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[1.8rem] border border-white/8 bg-white/4 p-6 text-sm text-slate-400 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-lg">
          <p className="text-xl font-bold text-white">
            Tranzit.<span className="text-[#f97316]">AZ</span>
          </p>
          <p className="mt-3 leading-7">
            Yük sahibləri və daşıyıcıları eyni premium marketplace təcrübəsində birləşdirən müasir logistika platforması.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-8">
          <FooterColumn title="Platforma" items={["Ana səhifə", "Necə işləyir", "Canlı yüklər"]} />
          <FooterColumn title="Axınlar" items={["Elan yerləşdir", "Təklif ver", "FAQ"]} />
          <FooterColumn title="Əlaqə" items={["Bakı", "+994 12 555 44 33", "hello@tranzit.az"]} />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}
