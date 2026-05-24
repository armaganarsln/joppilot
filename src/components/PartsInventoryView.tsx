import React, { useState } from 'react';
import { Package, AlertTriangle, Check, RefreshCw, Plus } from 'lucide-react';

interface PartItem {
  name: string;
  sku: string;
  onHand: number;
  reorderThreshold: number;
  supplier: string;
}

export const PartsInventoryView: React.FC = () => {
  const [inventory, setInventory] = useState<PartItem[]>([
    { name: 'Spare Front Wide Camera Lens Module (CM-024)', sku: 'JOP-HW-CAM-FW', onHand: 2, reorderThreshold: 3, supplier: 'Teledyne FLIR Europe' },
    { name: 'Spare LIDAR Puck Alignment Sensor Unit', sku: 'JOP-HW-LIDAR-VLP16', onHand: 1, reorderThreshold: 1, supplier: 'Velodyne Europe' },
    { name: 'Optic Sensor Cleaning Fluid Premium Kit', sku: 'JOP-MAINT-CLN-FLUID', onHand: 12, reorderThreshold: 4, supplier: 'ERZ Central Depot Supplies' },
    { name: 'Jöppli Composite Rear Brake Pad Set', sku: 'JOP-CHASS-BRK-REAR', onHand: 8, reorderThreshold: 6, supplier: 'Knorr-Bremse AG' },
    { name: 'Reinforced Autonomous Low-Noise City Tires', sku: 'JOP-HW-TYRE-AN18', onHand: 3, reorderThreshold: 4, supplier: 'Continental Swiss Branch' },
    { name: 'Spare High-Contrast Side View Mirror Panel', sku: 'JOP-CHASS-MIR-SIDE', onHand: 5, reorderThreshold: 2, supplier: 'Jöppli GmbH Munich' }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newSKU, setNewSKU] = useState('');
  const [newOnHand, setNewOnHand] = useState('5');
  const [newThreshold, setNewThreshold] = useState('3');
  const [newSupplier, setNewSupplier] = useState('Jöppli GmbH Munich');

  const handleStockUpdate = (sku: string, diff: number) => {
    setInventory(prev => prev.map(item => {
      if (item.sku === sku) {
        return { ...item, onHand: Math.max(0, item.onHand + diff) };
      }
      return item;
    }));
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: PartItem = {
      name: newPartName,
      sku: newSKU || `JOP-${Math.floor(10000 + Math.random() * 90000)}`,
      onHand: Number(newOnHand) || 0,
      reorderThreshold: Number(newThreshold) || 1,
      supplier: newSupplier
    };
    setInventory([...inventory, newItem]);
    setIsAdding(false);
    setNewPartName('');
    setNewSKU('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-joppli-light font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-joppli-dark" />
            <div>
              <h1 className="text-2xl font-black text-joppli-dark uppercase tracking-wide">Parts & Depot Inventory</h1>
              <p className="text-xs text-joppli-dark/50 uppercase tracking-widest font-bold">Spare sensors, clean consumables, wheels and chassis kits</p>
            </div>
          </div>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-joppli-dark text-white rounded-lg text-sm font-bold shadow-sm hover:bg-joppli-blue transition-all uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Add Spare Part
            </button>
          )}

          {isAdding && (
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 border border-joppli-grey bg-white text-joppli-dark hover:bg-joppli-light rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
            >
              Back to Inventory
            </button>
          )}
        </div>

        {/* Low Stock Watch Warning Bar */}
        {inventory.some(item => item.onHand < item.reorderThreshold) && (
          <div className="mb-6 p-4 bg-joppli-red/10 border border-joppli-red/20 rounded-xl text-xs font-medium text-joppli-red flex items-start gap-2.5 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-joppli-red mt-0.5 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold uppercase tracking-widest block mb-0.5">Critical Supply Warning</span>
              Certain critical hardware components have fallen below their recommended reorder threshold bounds at the depot. Dispatch procurement.
            </div>
          </div>
        )}

        {/* Add Part Form */}
        {isAdding && (
          <form onSubmit={handleAddPart} className="bg-white border border-joppli-grey rounded-xl shadow-sm p-6 mb-8 text-joppli-dark">
            <h2 className="text-base font-black uppercase tracking-wider mb-4 border-b border-joppli-grey/50 pb-2">
              Log Newly Procured Supply Stack
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Part Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spare Ultrasonics UX-400"
                  value={newPartName}
                  onChange={e => setNewPartName(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold focus:outline-none focus:border-joppli-blue bg-white uppercase text-joppli-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Unique SKU Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. JOP-HW-SENS-US"
                  value={newSKU}
                  onChange={e => setNewSKU(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-mono focus:outline-none focus:border-joppli-blue bg-white uppercase text-joppli-dark"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Initial On-Hand Stock</label>
                <input
                  type="number"
                  required
                  value={newOnHand}
                  onChange={e => setNewOnHand(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm focus:outline-none focus:border-joppli-blue bg-white text-joppli-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1 font-sans">Reorder Threshold Limit</label>
                <input
                  type="number"
                  required
                  value={newThreshold}
                  onChange={e => setNewThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm focus:outline-none focus:border-joppli-blue bg-white text-joppli-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-joppli-dark/60 mb-1">Supplier Entity</label>
                <input
                  type="text"
                  required
                  value={newSupplier}
                  onChange={e => setNewSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-joppli-grey rounded-lg text-sm font-bold uppercase focus:outline-none focus:border-joppli-blue bg-white text-joppli-dark"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-joppli-grey/50">
              <button
                type="submit"
                className="px-4 py-2 bg-joppli-blue text-white rounded-lg text-xs font-bold uppercase hover:bg-joppli-blue/95 transition-colors"
              >
                Stock Spare Hardware
              </button>
            </div>
          </form>
        )}

        {/* Inventory Parts Table */}
        <div className="bg-white border border-joppli-grey rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-4 py-3 bg-joppli-light/40 border-b border-joppli-grey flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-widest text-joppli-dark/60">Spare Stock Catalogue</span>
            <span className="text-[10px] bg-joppli-dark/10 px-2 py-0.5 rounded font-mono font-bold text-joppli-dark/60">
              {inventory.length} SKUs REGISTERED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-joppli-dark">
              <thead>
                <tr className="border-b border-joppli-grey/80 bg-joppli-light/20 uppercase font-black text-joppli-dark/50 hover:bg-transparent">
                  <th className="p-3 pl-4">Part Name</th>
                  <th className="p-3">SKU Code</th>
                  <th className="p-3">On Hand</th>
                  <th className="p-3">Reorder Point</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3 pr-4 text-center">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-joppli-grey">
                {inventory.map(item => {
                  const belowLimit = item.onHand < item.reorderThreshold;
                  return (
                    <tr key={item.sku} className={`hover:bg-joppli-light/20 transition-colors font-medium ${belowLimit ? 'bg-joppli-red/[0.01]' : ''}`}>
                      <td className="p-3 pl-4 font-bold text-joppli-dark uppercase tracking-normal max-w-[240px] truncate">{item.name}</td>
                      <td className="p-3 font-mono font-bold text-joppli-dark/50">{item.sku}</td>
                      <td className={`p-3 font-mono font-black ${belowLimit ? 'text-joppli-red' : 'text-joppli-dark'}`}>
                        {item.onHand} units
                      </td>
                      <td className="p-3 font-mono text-joppli-dark/60">{item.reorderThreshold} units</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border ${
                          belowLimit ? 'bg-joppli-red/10 text-joppli-red border-joppli-red/20' : 'bg-joppli-green/10 text-joppli-green border-joppli-green/20'
                        }`}>
                          {belowLimit ? 'Reorder' : 'Adequate'}
                        </span>
                      </td>
                      <td className="p-3 text-joppli-dark/70 font-semibold max-w-[140px] truncate">{item.supplier}</td>
                      <td className="p-3 pr-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-1.5 font-mono">
                          <button
                            onClick={() => handleStockUpdate(item.sku, -1)}
                            className="w-6 h-6 border border-joppli-grey/80 text-joppli-dark bg-white rounded-md hover:bg-joppli-light font-bold text-sm leading-none"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleStockUpdate(item.sku, 1)}
                            className="w-6 h-6 border border-joppli-grey/80 text-joppli-dark bg-white rounded-md hover:bg-joppli-light font-bold text-sm leading-none"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
