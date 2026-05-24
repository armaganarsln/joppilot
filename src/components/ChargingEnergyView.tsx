import React, { useState } from 'react';
import { BatteryCharging, Zap, History, TrendingUp, Info } from 'lucide-react';

interface Charger {
  id: string;
  name: string;
  status: 'charging' | 'available' | 'offline';
  connectedVehicle?: 'JÖP-01' | 'JÖP-02';
  kWLimit: number;
  currentKWRate: number;
  etaFullMinutes?: number;
}

interface ChargeSession {
  id: string;
  vehicle: 'JÖP-01' | 'JÖP-02';
  startTime: string;
  endTime: string;
  kWhDelivered: number;
  costCHF: number;
}

export const ChargingEnergyView: React.FC = () => {
  const [chargers] = useState<Charger[]>([
    {
      id: 'CHG-01',
      name: 'Depot HighPower Bay 1',
      status: 'charging',
      connectedVehicle: 'JÖP-02',
      kWLimit: 22,
      currentKWRate: 18.2,
      etaFullMinutes: 44
    },
    {
      id: 'CHG-02',
      name: 'Depot SafePlug Bay 2',
      status: 'available',
      kWLimit: 11,
      currentKWRate: 0
    }
  ]);

  const [sessions] = useState<ChargeSession[]>([
    { id: 'SESS-2104', vehicle: 'JÖP-01', startTime: '2026-05-22 22:15', endTime: '2026-05-23 01:10', kWhDelivered: 32.5, costCHF: 7.80 },
    { id: 'SESS-2101', vehicle: 'JÖP-02', startTime: '2026-05-22 13:02', endTime: '2026-05-22 15:45', kWhDelivered: 45.1, costCHF: 10.82 },
    { id: 'SESS-2099', vehicle: 'JÖP-01', startTime: '2026-05-21 21:00', endTime: '2026-05-22 00:30', kWhDelivered: 35.8, costCHF: 8.59 },
    { id: 'SESS-2088', vehicle: 'JÖP-02', startTime: '2026-05-20 18:30', endTime: '2026-05-20 21:45', kWhDelivered: 48.0, costCHF: 11.52 }
  ]);

  const routeEfficiency = [
    { routeName: 'Alt-Wiedikon Residential R1', distance: '12.4 km', kwhPerKm: 0.16 },
    { routeName: 'Birmensdorfer slope collector R2', distance: '8.2 km', kwhPerKm: 0.22 },
    { routeName: 'Zweierstrasse shopping lane R3', distance: '15.1 km', kwhPerKm: 0.14 },
    { routeName: 'Kalkbreite dense collection R4', distance: '6.5 km', kwhPerKm: 0.19 }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BatteryCharging className="w-8 h-8 text-joppli-green" />
            <div>
              <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Charging & Energy</h1>
              <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">Depot DC/AC Fast Charging Hub & Smart Efficiency Analytics</p>
            </div>
          </div>
        </div>

        {/* Chargers Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {chargers.map(chg => (
            <div key={chg.id} className="bg-white border border-joppli-grey rounded-xl shadow-sm p-5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] text-joppli-dark/50 font-mono font-bold uppercase">{chg.id}</span>
                  <h3 className="text-sm font-black uppercase tracking-wide text-joppli-dark">{chg.name}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest uppercase border ${
                  chg.status === 'charging' ? 'bg-joppli-green/10 text-joppli-green border-joppli-green/20' :
                  chg.status === 'available' ? 'bg-joppli-blue/10 text-joppli-blue border-joppli-blue/20' :
                  'bg-joppli-grey text-joppli-dark/50 border-joppli-grey'
                }`}>
                  {chg.status}
                </span>
              </div>

              {chg.status === 'charging' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-joppli-light p-3 rounded-lg border border-joppli-grey/40">
                    <Zap className="w-8 h-8 text-joppli-green animate-pulse" />
                    <div>
                      <div className="text-xs text-joppli-dark/50 uppercase tracking-wider font-bold">Currently Connected</div>
                      <div className="text-sm font-black text-joppli-dark uppercase tracking-wide">{chg.connectedVehicle}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-joppli-light/40 p-2.5 rounded border border-joppli-grey/20">
                      <span className="block text-[10px] text-joppli-dark/50 uppercase tracking-widest font-bold mb-0.5">Charge Rate</span>
                      <strong className="text-sm text-joppli-dark font-mono">{chg.currentKWRate} kW</strong>
                    </div>
                    <div className="bg-joppli-light/40 p-2.5 rounded border border-joppli-grey/20">
                      <span className="block text-[10px] text-joppli-dark/50 uppercase tracking-widest font-bold mb-0.5">ETA Full</span>
                      <strong className="text-sm text-joppli-dark font-mono">{chg.etaFullMinutes} min</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-joppli-dark/40 border border-dashed border-joppli-grey/80 rounded-lg">
                  <Zap className="w-6 h-6 mb-2 text-joppli-dark/30" />
                  <span className="text-xs uppercase font-extrabold tracking-widest">Awaiting Plug Connection</span>
                  <span className="text-[10px] tracking-wide text-joppli-dark/55 mt-1">Capacity up to {chg.kWLimit} kW AC Charging</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Efficiency Analytics Chart & Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* SVG Visualizer Trend */}
          <div className="bg-white border border-joppli-grey rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 border-b border-joppli-grey/50 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-joppli-dark/60 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-joppli-blue" />
                Route Smart Energy Efficiency (kWh/km)
              </h3>
            </div>

            <div className="space-y-4">
              {routeEfficiency.map(route => {
                const percentage = (route.kwhPerKm / 0.3) * 100; // normalized to max 0.3 kWh/km
                return (
                  <div key={route.routeName}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-joppli-dark uppercase truncate max-w-[240px]">{route.routeName}</span>
                      <span className="font-mono text-joppli-dark/80 font-bold">{route.kwhPerKm} kWh/km</span>
                    </div>
                    <div className="w-full h-2 bg-joppli-light border border-joppli-grey/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          route.kwhPerKm > 0.2 ? 'bg-joppli-yellow' : 'bg-joppli-green'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-joppli-dark/40 uppercase font-bold mt-0.5">Length: {route.distance}</div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-5 p-2 bg-joppli-light border border-joppli-grey/40 text-[10px] font-medium rounded text-joppli-dark/60 italic flex gap-1.5 items-start">
              <Info className="w-3.5 h-3.5 text-joppli-blue drop-shadow shrink-0 mt-0.5" />
              <span>Alt-Wiedikon route slope and payload limits influence rates. Goal target is less than 0.20 kWh/km.</span>
            </div>
          </div>

          {/* Table: Charging Session History */}
          <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-joppli-light/40 border-b border-joppli-grey flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-joppli-dark/60">Charging Session Logs</span>
              <span className="text-[10px] font-mono font-bold bg-joppli-dark/10 text-joppli-dark px-2 py-0.5 rounded-full">
                4 COMPLETED
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs text-joppli-dark">
                <thead>
                  <tr className="border-b border-joppli-grey/80 bg-joppli-light/20 uppercase font-black text-joppli-dark/50 hover:bg-transparent">
                    <th className="p-3 pl-4">Vehicle</th>
                    <th className="p-3">Connected Time</th>
                    <th className="p-3">Delivered</th>
                    <th className="p-3 pr-4 text-right">Cost (CHF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-joppli-grey">
                  {sessions.map(sess => (
                    <tr key={sess.id} className="hover:bg-joppli-light/25 transition-colors font-medium">
                      <td className="p-3 pl-4 whitespace-nowrap">
                        <span className="bg-joppli-blue/10 text-joppli-blue font-bold px-2 py-0.5 rounded font-mono">
                          {sess.vehicle}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-joppli-dark text-[11px] font-mono font-bold">{sess.startTime}</div>
                        <div className="text-joppli-dark/50 text-[10px] font-mono whitespace-nowrap">to {sess.endTime.split(' ')[1]}</div>
                      </td>
                      <td className="p-3 font-mono font-bold whitespace-nowrap">
                        {sess.kWhDelivered} kWh
                      </td>
                      <td className="p-3 pr-4 text-right font-mono font-bold whitespace-nowrap">
                        CHF {sess.costCHF.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
