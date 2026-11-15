"use client";

import { useState } from "react";
import {
  Headphones,
  AtSign,
  Clock,
  Send,
  ShieldCheck,
  Zap,
  Share2,
  CheckCircle2
} from "lucide-react";
import { PublicPage } from "@/components/classifieds/shared";
import { showToast } from "@/lib/toast";

export function ContactPageClient() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    // Simulate quick feedback or call contact api
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubmitted(true);
    setLoading(false);
    showToast("Müraciətiniz uğurla göndərildi!", "success");
    setName("");
    setContact("");
    setSubject("");
    setMessage("");
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight text-[#1B0A33]">
            Əlaqə
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 max-w-2xl leading-relaxed">
            Suallarınız, təklifləriniz və əməkdaşlıq müraciətləriniz üçün bizimlə əlaqə saxlaya bilərsiniz.
          </p>
        </div>

        {/* Main Grid: Left Dark Card + Right Form Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Dark Purple Card */}
          <div className="lg:col-span-5 bg-[#20073e] rounded-[24px] p-8 sm:p-10 text-white flex flex-col justify-between shadow-lg shadow-purple-950/15">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-wider mb-4">
                <Headphones className="w-4 h-4" />
                DƏSTƏK MƏRKƏZİ
              </div>

              <h2 className="text-2xl sm:text-[26px] font-bold text-white mb-3 leading-snug">
                Əlaqə məlumatları
              </h2>

              <p className="text-sm sm:text-[15px] text-purple-200/90 leading-relaxed font-normal mb-8">
                Platformadan istifadə ilə bağlı suallar, tərəfdaşlıq təklifləri və ümumi müraciətlər üçün aşağıdakı məlumatlardan istifadə edin.
              </p>

              {/* Items */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#FEDE47] shrink-0 mt-0.5">
                    <AtSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                      E-MAIL
                    </p>
                    <a
                      href="mailto:info@tranzit.az"
                      className="text-base font-semibold text-white hover:text-yellow-400 transition-colors mt-0.5 block"
                    >
                      info@tranzit.az
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#FEDE47] shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                      İŞ SAATLARI
                    </p>
                    <p className="text-base font-semibold text-white mt-0.5">
                      Hər gün 09:00 - 18:00
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom response time status badge */}
            <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEDE47] shrink-0"></span>
              <p className="text-xs text-purple-200">
                Gələn sorğular orta hesabla 30 dəqiqə ərzində cavablandırılır.
              </p>
            </div>
          </div>

          {/* Right White Form Card */}
          <div className="lg:col-span-7 bg-white rounded-[24px] p-6 sm:p-10 border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-bold text-[#1B0A33]">Bizə yazın</h2>
            <p className="mt-1 text-sm text-slate-500 mb-6 leading-relaxed">
              Formu doldurun, müraciətiniz qeydə alınsın. Komandamız ən qısa zamanda sizinlə əlaqə saxlayacaq.
            </p>

            {submitted ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-emerald-900">
                  Mesajınız qeydə alındı!
                </h3>
                <p className="text-xs text-emerald-700 mt-1 mb-4">
                  Ən qısa zamanda sizinlə əlaqə saxlayacağıq.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-xl bg-white text-emerald-800 text-xs font-bold border border-emerald-200 hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  Yeni mesaj göndər
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Ad & E-mail və ya telefon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ad *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Adınız və soyadınız"
                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      E-mail və ya telefon *
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="nümunə@tranzit.az və ya +994..."
                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Row 2: Mövzu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mövzu *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Müraciətin qısa məzmunu və ya növü"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Row 3: Mesaj */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mesaj *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Müraciətinizi ətraflı şəkildə qeyd edin..."
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors resize-none"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Submit CTA Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    <span>{loading ? "Göndərilir..." : "Göndər"}</span>
                    <Send className="w-4 h-4 fill-slate-900" />
                  </button>
                </div>

                <p className="text-center text-xs text-slate-400 pt-1">
                  Məlumatlarınızın təhlükəsizliyi Tranzit.AZ məxfilik siyasəti çərçivəsində təmin edilir.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Bottom 3 Feature Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#20073e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1B0A33]">Təhlükəsiz Əməkdaşlıq</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hər bir yük və daşıyıcı profili sistem tərəfindən verifikasiya edilir.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#20073e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1B0A33]">Operativ Həllər</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tranzit marşrutları üzrə suallarınız texniki komandamız tərəfindən həll olunur.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-[#20073e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1B0A33]">Vahid Ekosistem</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Yük sahibləri və logistika şirkətləri üçün şəffaf rəqəmsal platforma.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
