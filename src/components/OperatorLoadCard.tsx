"use client";

import { useState } from "react";
import { MessageCircle, Phone, Search, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import type { MockDriver } from "@/lib/mock-drivers";
import type { MockDispatcher } from "@/lib/mock-dispatchers";
import type { MockLoad, OperatorLoadStatus } from "@/lib/mock-loads";
import { buildSmsMessage, buildWhatsappMessage } from "@/lib/message-templates";
import { Button } from "@/components/ui/Button";
import { DriverMatchCard } from "@/components/DriverMatchCard";
import { MessageTemplateBox } from "@/components/MessageTemplateBox";
import { StatusBadge } from "@/components/StatusBadge";

export function OperatorLoadCard({
  load,
  drivers,
  dispatchers
}: {
  load: MockLoad;
  drivers: MockDriver[];
  dispatchers: MockDispatcher[];
}) {
  const [status, setStatus] = useState<OperatorLoadStatus>(load.status);
  const [showMatches, setShowMatches] = useState(false);
  const [template, setTemplate] = useState<"whatsapp" | "sms" | null>(null);
  const [lastAction, setLastAction] = useState<string>("Operator əməliyyatı gözlənilir.");

  function updateStatus(nextStatus: OperatorLoadStatus, action: string) {
    setStatus(nextStatus);
    setLastAction(action);
  }

  return (
    <article className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-navy-900">{load.title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {load.route} · {load.tonnage} ton · {load.requiredVehicleType}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
        <span>Qiymət: <strong className="text-navy-900">{load.price}</strong></span>
        <span>Tarix: <strong className="text-navy-900">{load.date}</strong></span>
        <span>Əlaqə: <strong className="text-navy-900">{load.contactPhone}</strong></span>
      </div>

      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{load.note}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowMatches((current) => !current);
            updateStatus("MATCHING", "Uyğun sürücü və dispetçerlər siyahısı açıldı.");
          }}
        >
          <Search className="h-4 w-4" aria-hidden />
          Uyğun sürücüləri göstər
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setTemplate("whatsapp");
            updateStatus("CONTACTING_DRIVERS", "WhatsApp mesajı hazırlandı.");
          }}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          WhatsApp mesajı hazırla
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setTemplate("sms");
            updateStatus("CONTACTING_DRIVERS", "SMS mətni hazırlandı.");
          }}
        >
          <Send className="h-4 w-4" aria-hidden />
          SMS mətni hazırla
        </Button>
        <Button type="button" variant="secondary" onClick={() => updateStatus("WAITING_RESPONSE", "Zəng edildi, cavab gözlənilir.")}>
          <Phone className="h-4 w-4" aria-hidden />
          Zəng edildi
        </Button>
        <Button type="button" onClick={() => updateStatus("DRIVER_ACCEPTED", "Sürücü 1 - gedirəm cavabını verdi.")}>
          <ThumbsUp className="h-4 w-4" aria-hidden />
          Sürücü razılaşdı
        </Button>
        <Button type="button" variant="secondary" onClick={() => updateStatus("PRICE_TOO_LOW", "Sürücü 3 - qiymət azdır cavabını verdi.")}>
          <ThumbsDown className="h-4 w-4" aria-hidden />
          Qiymət azdır
        </Button>
        <Button type="button" variant="secondary" onClick={() => updateStatus("WAITING_RESPONSE", "Sürücü cavab vermədi, təkrar əlaqə üçün gözləmədədir.")}>
          Cavab vermədi
        </Button>
        <Button type="button" variant="secondary" onClick={() => updateStatus("CONFIRMED", "Razılaşma bağlandı və yük təsdiqləndi.")}>
          Bağlandı
        </Button>
      </div>

      <p className="mt-4 text-sm font-semibold text-navy-700">{lastAction}</p>

      {showMatches ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-3">
            {drivers.map((driver) => (
              <DriverMatchCard key={driver.id} driver={driver} />
            ))}
          </div>
          <div className="rounded-lg border border-navy-100 bg-slate-50 p-4">
            <h4 className="font-bold text-navy-900">Uyğun dispetçerlər</h4>
            <div className="mt-3 space-y-3">
              {dispatchers.map((dispatcher) => (
                <div key={dispatcher.id} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                  <p className="font-bold text-navy-900">{dispatcher.name}</p>
                  <p className="mt-1 text-slate-600">{dispatcher.teamName} · {dispatcher.vehicleCount} maşın</p>
                  <p className="mt-1 text-slate-500">{dispatcher.vehicleTypes.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {template === "whatsapp" ? (
        <div className="mt-5">
          <MessageTemplateBox title="WhatsApp mesaj şablonu" message={buildWhatsappMessage(load)} />
        </div>
      ) : null}

      {template === "sms" ? (
        <div className="mt-5">
          <MessageTemplateBox title="SMS mesaj şablonu" message={buildSmsMessage(load)} />
        </div>
      ) : null}
    </article>
  );
}
