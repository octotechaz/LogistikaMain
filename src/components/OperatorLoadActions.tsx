"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type MatchDriver = {
  id: string;
  name: string;
  phone: string;
  whatsappPhone: string;
  vehicleType: string;
  capacityTons: number;
  routes: string[];
  activityScore: number;
  whatsappLink: string;
};

type MatchDispatcher = {
  id: string;
  name: string;
  phone: string;
  whatsappPhone: string;
  companyName: string;
  vehicleCount: number;
  vehicleTypes: string[];
  routes: string[];
  activityScore: number;
  whatsappLink: string;
};

const loadStatuses = [
  "NEW",
  "CHECKING",
  "MATCHING",
  "CONTACTING",
  "WAITING_RESPONSE",
  "DRIVER_ACCEPTED",
  "DISPATCHER_ACCEPTED",
  "PRICE_TOO_LOW",
  "NEGOTIATION",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
];

const responseStatuses = ["ACCEPTED", "DECLINED", "PRICE_TOO_LOW", "NO_ANSWER", "CALL_LATER"];

export function OperatorLoadActions({
  loadId,
  currentStatus,
  operatorNote,
  whatsappMessage,
  smsMessage,
  drivers,
  dispatchers
}: {
  loadId: string;
  currentStatus: string;
  operatorNote?: string | null;
  whatsappMessage: string;
  smsMessage: string;
  drivers: MatchDriver[];
  dispatchers: MatchDispatcher[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState(operatorNote ?? "");
  const [responseStatus, setResponseStatus] = useState("ACCEPTED");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function updateLoad(payload: Record<string, unknown>, message: string) {
    setIsLoading(true);
    setFeedback(null);
    const response = await fetch(`/api/loads/${loadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setFeedback(result.message ?? "Əməliyyat alınmadı.");
      return;
    }

    setFeedback(message);
    router.refresh();
  }

  async function runOperatorAction(action: string, payload: Record<string, unknown>, message: string) {
    setIsLoading(true);
    setFeedback(null);
    const response = await fetch(`/api/operator/loads/${loadId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setFeedback(result.message ?? "Əməliyyat alınmadı.");
      return;
    }

    setFeedback(message);
    router.refresh();
  }

  async function recordAttempt(input: { driverId?: string; dispatcherId?: string; channel: "WHATSAPP" | "SMS" | "CALL"; message: string }) {
    setIsLoading(true);
    setFeedback(null);
    const response = await fetch(`/api/operator/loads/${loadId}/contact-attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: input.driverId,
        dispatcherId: input.dispatcherId,
        channel: input.channel,
        messageText: input.message,
        responseStatus,
        note
      })
    });
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setFeedback(result.message ?? "Nəticə yazılmadı.");
      return;
    }

    setFeedback("Əlaqə nəticəsi yazıldı.");
    router.refresh();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Mesaj kopyalandı.");
    } catch {
      setFeedback("Kopyalama alınmadı. Mətn əl ilə seçilə bilər.");
    }
  }

  return (
    <div className="space-y-5">
      {feedback ? <div className="rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-700">{feedback}</div> : null}

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-navy-900">Status və operator qeydi</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
          <label className="form-label">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="form-field">
              {loadStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Operator qeydi
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="form-field min-h-24" placeholder="Zəng nəticəsi, qiymət danışığı, növbəti addım..." />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={isLoading} onClick={() => updateLoad({ status, operatorNote: note }, "Status yeniləndi.")}>
            Statusu yadda saxla
          </Button>
          <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperatorAction("confirm", {}, "Yük təsdiqləndi.")}>
            Yükü təsdiqlə
          </Button>
          <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperatorAction("cancel", {}, "Yük ləğv edildi.")}>
            Yükü ləğv et
          </Button>
          <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperatorAction("complete", {}, "Yük tamamlandı.")}>
            Yükü tamamla
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-navy-900">WhatsApp mesaj şablonu</h2>
            <Button type="button" variant="secondary" onClick={() => copy(whatsappMessage)}>Kopyala</Button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{whatsappMessage}</pre>
        </div>
        <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-navy-900">SMS mesaj şablonu</h2>
            <Button type="button" variant="secondary" onClick={() => copy(smsMessage)}>Kopyala</Button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{smsMessage}</pre>
        </div>
      </section>

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-navy-900">Əlaqə nəticəsi</h2>
            <p className="mt-1 text-sm text-slate-600">Sürücü/dispetçer cavabını seçin, sonra kart üzərindən nəticəni yazın.</p>
          </div>
          <select value={responseStatus} onChange={(event) => setResponseStatus(event.target.value)} className="form-field max-w-xs">
            {responseStatuses.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-navy-900">Uyğun sürücülər</h2>
          {drivers.length ? drivers.map((driver) => (
            <article key={driver.id} className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-navy-900">{driver.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{driver.vehicleType} · {driver.capacityTons} ton · {driver.routes.join(", ")}</p>
                  <p className="mt-1 text-sm font-semibold text-logistics-orange">Aktivlik balı: {driver.activityScore}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={driver.whatsappLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-logistics-orange px-4 py-2 text-sm font-semibold text-white">
                  WhatsApp linki
                </a>
                <Button type="button" variant="secondary" disabled={isLoading} onClick={() => recordAttempt({ driverId: driver.id, channel: "WHATSAPP", message: whatsappMessage })}>
                  Nəticəni yaz
                </Button>
                <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperatorAction("assign-driver", { driverId: driver.id }, "Sürücü təyin edildi.")}>
                  Sürücünü təyin et
                </Button>
              </div>
            </article>
          )) : <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">Uyğun sürücü tapılmadı.</p>}
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-navy-900">Uyğun dispetçerlər</h2>
          {dispatchers.length ? dispatchers.map((dispatcher) => (
            <article key={dispatcher.id} className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-navy-900">{dispatcher.companyName}</h3>
              <p className="mt-1 text-sm text-slate-600">{dispatcher.vehicleCount} maşın · {dispatcher.vehicleTypes.join(", ")}</p>
              <p className="mt-1 text-sm text-slate-600">{dispatcher.routes.join(", ")}</p>
              <p className="mt-1 text-sm font-semibold text-logistics-orange">Aktivlik balı: {dispatcher.activityScore}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={dispatcher.whatsappLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-logistics-orange px-4 py-2 text-sm font-semibold text-white">
                  WhatsApp linki
                </a>
                <Button type="button" variant="secondary" disabled={isLoading} onClick={() => recordAttempt({ dispatcherId: dispatcher.id, channel: "WHATSAPP", message: whatsappMessage })}>
                  Nəticəni yaz
                </Button>
                <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperatorAction("assign-dispatcher", { dispatcherId: dispatcher.id }, "Dispetçer təyin edildi.")}>
                  Dispetçeri təyin et
                </Button>
              </div>
            </article>
          )) : <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">Uyğun dispetçer tapılmadı.</p>}
        </div>
      </section>
    </div>
  );
}
