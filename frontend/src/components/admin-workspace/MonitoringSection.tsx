import React, { useState } from "react";
import BandwidthSparkline, { BandwidthPoint } from "./BandwidthSparkline";

type MonitoringTab = "ping" | "alerts" | "interface" | "queue";

type MonitoringSectionProps = {
  workspaceName?: string;
  initialTab?: MonitoringTab;
};

const MonitoringSection: React.FC<MonitoringSectionProps> = ({ workspaceName, initialTab }) => {
  const [activeTab, setActiveTab] = useState<MonitoringTab>(initialTab ?? "ping");

  const renderPing = () => {
    const devices = [
      { name: "Router Kantor Pusat", ip: "10.0.0.1", latencyMs: 18, loss: 0.2, status: "UP" },
      { name: "Router POP Bandung", ip: "10.10.0.1", latencyMs: 35, loss: 0.8, status: "UP" },
      { name: "Server Billing", ip: "10.0.10.5", latencyMs: 120, loss: 5.3, status: "DOWN" },
    ];

    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Monitoring Ping
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3.5">
          Tabel latency dan packet loss per device. Grafik per device bisa ditambahkan
          menggunakan data historis dari backend.
        </p>

        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-md shadow-slate-900/5">
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-slate-100">
              <tr className="text-left text-slate-500">
                <th className="px-2.5 py-2">Device</th>
                <th className="px-2.5 py-2">IP Address</th>
                <th className="px-2.5 py-2">Latency (ms)</th>
                <th className="px-2.5 py-2">Packet Loss (%)</th>
                <th className="px-2.5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.ip} className="hover:bg-slate-50">
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    {d.name}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200 text-slate-600">
                    {d.ip}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    {d.latencyMs}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    {d.loss}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        d.status === "UP"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderAlerts = () => {
    const alerts = [
      {
        id: 1,
        title: "Ping timeout - Router Kantor Pusat",
        severity: "High",
        since: "5 menit lalu",
        type: "Ping",
      },
      {
        id: 2,
        title: "BW > 80% - ether1-UPLINK",
        severity: "Medium",
        since: "25 menit lalu",
        type: "Bandwidth",
      },
    ];

    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Alert Monitoring
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3.5">
          Daftar alert aktif dan riwayat singkat. Tombol acknowledge/close saat ini
          masih dummy dan akan dihubungkan ke backend kemudian.
        </p>

        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-md shadow-slate-900/5">
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-slate-100">
              <tr className="text-left text-slate-500">
                <th className="px-2.5 py-2">Alert</th>
                <th className="px-2.5 py-2">Tipe</th>
                <th className="px-2.5 py-2">Severitas</th>
                <th className="px-2.5 py-2">Sejak</th>
                <th className="px-2.5 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    {a.title}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200 text-slate-600">
                    {a.type}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        a.severity === "High"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : a.severity === "Medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200 text-slate-600">
                    {a.since}
                  </td>
                  <td className="px-2.5 py-2 border-t border-slate-200">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      Acknowledge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderInterface = () => {
    const bandwidthSamples: BandwidthPoint[] = [
      { time: "10:00", rx: 12, tx: 6 },
      { time: "10:05", rx: 18, tx: 9 },
      { time: "10:10", rx: 22, tx: 11 },
      { time: "10:15", rx: 30, tx: 15 },
      { time: "10:20", rx: 26, tx: 13 },
      { time: "10:25", rx: 32, tx: 18 },
      { time: "10:30", rx: 40, tx: 20 },
      { time: "10:35", rx: 34, tx: 17 },
      { time: "10:40", rx: 28, tx: 14 },
      { time: "10:45", rx: 22, tx: 11 },
      { time: "10:50", rx: 18, tx: 9 },
      { time: "10:55", rx: 14, tx: 7 },
    ];

    const rxValues = bandwidthSamples.map((p) => p.rx);
    const txValues = bandwidthSamples.map((p) => p.tx);

    const sum = (values: number[]) =>
      values.reduce((acc, val) => acc + val, 0);

    const rxAvg = rxValues.length ? sum(rxValues) / rxValues.length : 0;
    const txAvg = txValues.length ? sum(txValues) / txValues.length : 0;

    const rxMax = rxValues.length ? Math.max(...rxValues) : 0;
    const txMax = txValues.length ? Math.max(...txValues) : 0;

    const rxMin = rxValues.length ? Math.min(...rxValues) : 0;
    const txMin = txValues.length ? Math.min(...txValues) : 0;

    const lastSample = bandwidthSamples[bandwidthSamples.length - 1];

    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Monitoring Bandwidth per Interface
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3.5">
          Pilih router dan interface untuk melihat grafik penggunaan bandwidth
          (rx/tx) per waktu.
        </p>

        <div className="flex flex-wrap gap-2.5 mb-3.5">
          <select
            className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] min-w-[180px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            defaultValue="router1"
          >
            <option value="router1">Router Kantor Pusat</option>
            <option value="router2">Router POP Bandung</option>
          </select>
          <select
            className="px-2.5 py-1.5 rounded-full border border-slate-200 text-[12px] min-w-[180px] bg-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
            defaultValue="iface1"
          >
            <option value="iface1">ether1-UPLINK</option>
            <option value="iface2">ether2-POP</option>
            <option value="iface3">vlan10-Client</option>
          </select>
        </div>
        <div className="rounded-2xl px-4 py-3 bg-white/90 border border-slate-200 shadow-lg shadow-slate-900/5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="m-0 text-[11px] text-slate-500">Grafik waktu nyata (dummy)</p>
              <p className="m-0 text-[13px] font-semibold text-slate-900">
                ether1-UPLINK
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>RX Mbps</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span>TX Mbps</span>
              </div>
            </div>
          </div>

          <BandwidthSparkline data={bandwidthSamples} />

          <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
              <span>
                RX: {rxAvg.toFixed(1)} Mbps avg,
                {" "}
                {rxMin.toFixed(1)} min,
                {" "}
                {rxMax.toFixed(1)} max
              </span>
              <span>
                TX: {txAvg.toFixed(1)} Mbps avg,
                {" "}
                {txMin.toFixed(1)} min,
                {" "}
                {txMax.toFixed(1)} max
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
              <span>
                current: RX {lastSample.rx.toFixed(1)} Mbps / TX
                {" "}
                {lastSample.tx.toFixed(1)} Mbps
              </span>
              <span>
                periode: {bandwidthSamples[0].time} -
                {" "}
                {bandwidthSamples[bandwidthSamples.length - 1].time}
              </span>
            </div>
            <p className="m-0 mt-1 text-[10px] text-slate-400">
              Angka di atas masih dummy, nanti akan mengikuti data historis
              dari backend sehingga keterangan statistiknya mirip SmokePing.
            </p>
          </div>
        </div>
      </section>
    );
  };

  const renderQueue = () => {
    const queues = [
      { name: "Queue-Office", usageMbps: 45 },
      { name: "Queue-Home", usageMbps: 32 },
      { name: "Queue-Business", usageMbps: 28 },
    ];

    return (
      <section>
        <h2 className="m-0 mb-1 text-[18px] font-semibold text-slate-900">
          Monitoring Bandwidth per Queue (Mikrotik)
        </h2>
        <p className="m-0 text-[12px] text-slate-500 mb-3.5">
          List queue dan grafik usage. Data di bawah masih dummy dan akan diisi
          dari API Mikrotik nanti.
        </p>

        <div className="rounded-2xl p-4 bg-white/90 border border-slate-200 shadow-lg shadow-slate-900/5">
          <ul className="list-none p-0 m-0 text-[12px] text-slate-600">
            {queues.map((q) => (
              <li
                key={q.name}
                className="flex justify-between py-1.5 border-b border-slate-200"
              >
                <span>{q.name}</span>
                <span className="font-semibold text-slate-900">
                  {q.usageMbps} Mbps
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 px-3 py-3 rounded-xl bg-slate-50 text-[11px] text-slate-400 text-center">
            Placeholder grafik time-series usage queue.
          </div>
        </div>
      </section>
    );
  };

  const renderContent = () => {
    if (activeTab === "ping") return renderPing();
    if (activeTab === "alerts") return renderAlerts();
    if (activeTab === "interface") return renderInterface();
    return renderQueue();
  };

  return (
    <section className="max-w-5xl mx-auto">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="m-0 mb-1 text-[20px] font-bold text-slate-900">
            Monitoring Jaringan {workspaceName ? `- ${workspaceName}` : ""}
          </h1>
          <p className="m-0 text-[12px] text-slate-500">
            Pantau ping, alert, dan penggunaan bandwidth per interface / queue
            dalam satu halaman.
          </p>
        </div>
      </header>

      {renderContent()}
    </section>
  );
};

export default MonitoringSection;
