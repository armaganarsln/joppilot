import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { ListPanel } from './components/ListPanel';
import { MapArea } from './components/MapArea';
import { DashboardView } from './components/DashboardView';
import { VehiclesView } from './components/VehiclesView';
import { VehicleDetailView } from './components/VehicleDetailView';
import { RemoteAssistanceView } from './components/RemoteAssistanceView';
import { MissionLogsView } from './components/MissionLogsView';
import { OddSettingsView } from './components/OddSettingsView';
import { IssuesView } from './components/IssuesView';
import { ReportsView } from './components/ReportsView';
import { InspectionsView } from './components/InspectionsView';
import { RemindersView } from './components/RemindersView';
import { ServiceView } from './components/ServiceView';
import { ChargingEnergyView } from './components/ChargingEnergyView';
import { ContactsUsersView } from './components/ContactsUsersView';
import { PartsInventoryView } from './components/PartsInventoryView';
import { PlacesView } from './components/PlacesView';
import { ChatBox } from './components/ChatBox';
import { LoginScreen } from './components/LoginScreen';
import { TeleoperationView } from './components/TeleoperationView';
import { INITIAL_VEHICLES, INITIAL_REQUESTS } from './mockData';
import { Vehicle, CollectionRequest, Alert } from './types';
import { TestVehicleScreen } from './components/TestVehicleScreen';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeVehicleDetailId, setActiveVehicleDetailId] = useState<string | null>(null);
  const [teleopVehicleId, setTeleopVehicleId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [requests, setRequests] = useState<CollectionRequest[]>(INITIAL_REQUESTS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [listMode, setListMode] = useState<'vehicles' | 'tasks'>('vehicles');

  useEffect(() => {
    // Generate initial welcome alert
    setAlerts([
      {
        id: 'a0',
        message: 'System online. JÖP-01 and JÖP-02 ready for deployment in Alt-Wiedikon.',
        type: 'info',
        timestamp: new Date(),
        read: false
      },
      {
        id: 'a1',
        message: 'ASSISTANCE REQUESTED: JÖP-02 encountered unmapped obstacle.',
        type: 'error',
        timestamp: new Date(),
        read: false
      }
    ]);

    // Simple simulation loop for vehicles moving along routes
    const tick = setInterval(() => {
      setVehicles(prevVehicles => {
        let changed = false;
        const newVehicles = prevVehicles.map(v => {
          let updated = { ...v };
          
          if (updated.isTestVehicleActive) {
            return updated;
          }
          
          if (updated.id === 'v2' && !updated.isTestVehicleActive) updated.status = 'alert';
          
          if (updated.route.length > 0 && updated.status !== 'alert') {
            changed = true;
            const target = updated.route[0];
            const dx = target.lng - updated.location.lng;
            const dy = target.lat - updated.location.lat;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 0.0002) { 
              // Reached target
              updated.location = { ...target };
              updated.route = updated.route.slice(1);
              if (updated.route.length === 0) {
                updated.status = 'idle';
              }
            } else {
              // Move towards target
              updated.status = 'on_route';
              const speed = 0.0003; 
              updated.location = {
                ...updated.location,
                lng: updated.location.lng + (dx / dist) * speed,
                lat: updated.location.lat + (dy / dist) * speed,
              };
              // Calculate bearing/heading in degrees (normalized for CSS rotate where East/Right is 0)
              const angleRad = Math.atan2(dy, dx);
              const angleDeg = angleRad * (180 / Math.PI);
              updated.heading = -angleDeg;
            }
          }
          
          if (updated.status === 'on_route' || Math.random() < 0.2) {
            updated.battery = Math.max(0, parseFloat((updated.battery - 0.2).toFixed(1)));
            changed = true;
          }

          return updated;
        });

        // Trigger battery alerts
        newVehicles.forEach(v => {
          if (v.battery < 20 && v.battery > 19) {
            setAlerts(prev => [
              {
                id: `batt_${v.id}_${Date.now()}`,
                message: `Low Battery: ${v.name} is at ${Math.floor(v.battery)}%`,
                type: 'warning',
                timestamp: new Date(),
                read: false,
              },
              ...prev
            ]);
            if (v.id !== 'v2') v.status = 'alert';
          }
        });

        return changed ? newVehicles : prevVehicles;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  const fetchOSRMRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates;
        return coordinates.map((coord: [number, number], index: number) => ({
          id: `osrm_${Date.now()}_${index}`,
          lat: coord[1],
          lng: coord[0],
          label: index === coordinates.length - 1 ? 'Destination' : `Waypoint ${index}`
        }));
      }
    } catch (e) {
      console.warn("OSRM routing failed, falling back to straight line:", e);
    }
    return [
      {
        id: `direct_${Date.now()}`,
        lat: end.lat,
        lng: end.lng,
        label: 'Destination'
      }
    ];
  };

  const handleAddToRoute = async (reqId: string, vehicleId: string) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    // Remove task from pending list and set view to fleet immediately
    setRequests(prev => prev.filter(r => r.id !== reqId));
    setListMode('vehicles');

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const startLoc = vehicle.route.length > 0 ? vehicle.route[vehicle.route.length - 1] : vehicle.location;
    
    // Add calculating alert
    setAlerts(prev => [
      {
        id: `calc_${vehicleId}_${Date.now()}`,
        message: `Calculating street-accurate route for ${vehicle.name}...`,
        type: 'info',
        timestamp: new Date(),
        read: false
      },
      ...prev
    ]);

    const streetPath = await fetchOSRMRoute(startLoc, req.location);

    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          status: 'on_route',
          route: [...v.route, ...streetPath]
        };
      }
      return v;
    }));

    // Update alert when route is ready
    setAlerts(prev => [
      {
        id: `route_${vehicleId}_${Date.now()}`,
        message: `Route calculated: ${vehicle.name} is navigating Alt-Wiedikon streets via OpenStreetMap.`,
        type: 'info',
        timestamp: new Date(),
        read: false
      },
      ...prev
    ]);
  };

  const handleSendMessage = async (msg: string) => {
    // keeping signature
    return "Local mode active";
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'vehicles') {
       setActiveVehicleDetailId(null);
    }
  };

  const [isSimulatedMode, setIsSimulatedMode] = useState(false);

  // Firestore sync for active test vehicle telemetry
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'test_vehicles'), (snapshot) => {
      const activeTestVehicles: Record<string, any> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isActive) {
          activeTestVehicles[data.id] = data;
        }
      });

      setVehicles(prevVehicles => {
        const merged = prevVehicles.map(v => {
          const simData = activeTestVehicles[v.id];
          if (simData) {
            return {
              ...v,
              battery: simData.battery,
              heading: simData.heading || 0,
              avState: simData.avState,
              isTestVehicleActive: true,
              status: simData.avState === 'ASSISTANCE_REQUESTED' ? 'alert' : simData.avState === 'MANUAL' ? 'idle' : 'on_route',
              location: {
                ...v.location,
                lat: simData.lat,
                lng: simData.lng
              }
            };
          } else {
            if (v.isTestVehicleActive) {
              return {
                ...v,
                isTestVehicleActive: false,
                avState: undefined,
                status: 'idle'
              };
            }
            return v;
          }
        });
        return merged;
      });
    }, (error) => {
      console.warn("Firestore listener error (expected if offline):", error);
    });

    return () => unsub();
  }, []);

  if (isSimulatedMode) {
    return <TestVehicleScreen onBack={() => setIsSimulatedMode(false)} />;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLogin={() => setIsAuthenticated(true)} 
        onEnterTestVehicle={() => setIsSimulatedMode(true)} 
      />
    );
  }

  return (
    <div className="h-screen flex font-sans text-joppli-dark selection:bg-joppli-green/20">
      <LeftSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <TopBar 
          alerts={alerts} 
          vehicles={vehicles}
          requests={requests}
          onLogout={() => setIsAuthenticated(false)}
          onClearAlerts={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}
        />
        
        <main className="flex-1 overflow-hidden flex bg-joppli-light">
          {activeTab === 'dispatch' && (
            <>
              <ListPanel 
                 vehicles={vehicles}
                 requests={requests}
                 mode={listMode}
                 onModeChange={setListMode}
                 selectedVehicleId={selectedVehicleId}
                 onSelectVehicle={setSelectedVehicleId}
                 onAddToRoute={handleAddToRoute}
                 onRemoteDrive={setTeleopVehicleId}
              />
              
              <div className="flex-1 relative flex flex-col min-w-0 bg-joppli-light shadow-inner shadow-joppli-grey/50">
                 <div className="flex-1 relative overflow-hidden">
                    <MapArea 
                      vehicles={vehicles} 
                      selectedVehicleId={selectedVehicleId} 
                      onSelectVehicle={setSelectedVehicleId} 
                      requests={requests}
                      onAssignRequest={handleAddToRoute}
                    />
                 </div>
                 
                 <ChatBox onSendMessage={handleSendMessage} />
              </div>
            </>
          )}

          {activeTab === 'dashboard' && (
             <DashboardView />
          )}

          {activeTab === 'assistance' && (
             <RemoteAssistanceView onRemoteDrive={setTeleopVehicleId} />
          )}

          {activeTab === 'missions' && (
             <MissionLogsView />
          )}

          {activeTab === 'odd' && (
             <OddSettingsView />
          )}

          {activeTab === 'vehicles' && activeVehicleDetailId === null && (
             <VehiclesView vehicles={vehicles} onSelectVehicle={setActiveVehicleDetailId} />
          )}
          
          {activeTab === 'vehicles' && activeVehicleDetailId !== null && (
             <VehicleDetailView vehicleId={activeVehicleDetailId} onRemoteDrive={() => setTeleopVehicleId(activeVehicleDetailId)} onBack={() => setActiveVehicleDetailId(null)} />
          )}

          {activeTab === 'issues' && (
             <IssuesView />
          )}

          {activeTab === 'reports' && (
             <ReportsView />
          )}

          {activeTab === 'inspections' && (
             <InspectionsView />
          )}

          {activeTab === 'reminders' && (
             <RemindersView />
          )}

          {activeTab === 'service' && (
             <ServiceView />
          )}

          {activeTab === 'fuel' && (
             <ChargingEnergyView />
          )}

          {activeTab === 'users' && (
             <ContactsUsersView />
          )}

          {activeTab === 'inventory' && (
             <PartsInventoryView />
          )}

          {activeTab === 'places' && (
             <PlacesView />
          )}


        </main>
      </div>

      {teleopVehicleId && (
        <TeleoperationView vehicleId={teleopVehicleId} onExit={() => setTeleopVehicleId(null)} />
      )}
    </div>
  );
}
