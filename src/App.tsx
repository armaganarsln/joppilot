import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { ListPanel } from './components/ListPanel';
import { ChatBox } from './components/ChatBox';
import { LoginScreen } from './components/LoginScreen';
import { LoadingState } from './components/StateViews';

// Heavy / route-level views are code-split so the initial bundle stays small.
// The map (leaflet), charts (recharts) and WebRTC screens are the biggest
// dependencies and are only loaded when their tab/overlay is first opened.
const MapArea = lazy(() => import('./components/MapArea').then(m => ({ default: m.MapArea })));
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const VehiclesView = lazy(() => import('./components/VehiclesView').then(m => ({ default: m.VehiclesView })));
const VehicleDetailView = lazy(() => import('./components/VehicleDetailView').then(m => ({ default: m.VehicleDetailView })));
const RemoteAssistanceView = lazy(() => import('./components/RemoteAssistanceView').then(m => ({ default: m.RemoteAssistanceView })));
const MissionLogsView = lazy(() => import('./components/MissionLogsView').then(m => ({ default: m.MissionLogsView })));
const OddSettingsView = lazy(() => import('./components/OddSettingsView').then(m => ({ default: m.OddSettingsView })));
const IssuesView = lazy(() => import('./components/IssuesView').then(m => ({ default: m.IssuesView })));
const ReportsView = lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const InspectionsView = lazy(() => import('./components/InspectionsView').then(m => ({ default: m.InspectionsView })));
const RemindersView = lazy(() => import('./components/RemindersView').then(m => ({ default: m.RemindersView })));
const ServiceView = lazy(() => import('./components/ServiceView').then(m => ({ default: m.ServiceView })));
const ChargingEnergyView = lazy(() => import('./components/ChargingEnergyView').then(m => ({ default: m.ChargingEnergyView })));
const ContactsUsersView = lazy(() => import('./components/ContactsUsersView').then(m => ({ default: m.ContactsUsersView })));
const PartsInventoryView = lazy(() => import('./components/PartsInventoryView').then(m => ({ default: m.PartsInventoryView })));
const PlacesView = lazy(() => import('./components/PlacesView').then(m => ({ default: m.PlacesView })));
const TeleoperationView = lazy(() => import('./components/TeleoperationView').then(m => ({ default: m.TeleoperationView })));
const TestVehicleScreen = lazy(() => import('./components/TestVehicleScreen').then(m => ({ default: m.TestVehicleScreen })));

import { INITIAL_VEHICLES, INITIAL_REQUESTS, GLARUS_VEHICLES, GLARUS_REQUESTS } from './mockData';
import { Vehicle, CollectionRequest, Alert, OperatorProfile, WorkspaceProject } from './types';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getAdminProject } from './config/access';
import { useToast } from './components/ToastProvider';
import { PLACES_BY_PROJECT } from './config/places';
import { Clock, XCircle, LogOut, ShieldAlert } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<OperatorProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeVehicleDetailId, setActiveVehicleDetailId] = useState<string | null>(null);
  const [teleopVehicleId, setTeleopVehicleId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [requests, setRequests] = useState<CollectionRequest[]>(INITIAL_REQUESTS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [listMode, setListMode] = useState<'vehicles' | 'tasks'>('vehicles');
  // Optional manual override of the active city workspace (the header switcher).
  // Null = follow the operator's own assigned project.
  const [projectOverride, setProjectOverride] = useState<WorkspaceProject | null>(null);
  // Tracks vehicles already flagged for low battery so each only alerts once per drain cycle.
  const lowBatteryAlertedRef = useRef<Set<string>>(new Set());
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  // Helper to enter demo mode
  const enterDemoMode = () => {
    localStorage.setItem('joppilot_demo_session', 'true');
    const demoProfile: OperatorProfile = {
      uid: 'demo-operator-uid',
      email: 'demo-operator@joeppli.ch',
      role: 'admin',
      status: 'approved',
      project: 'zurich',
      createdAt: new Date().toISOString()
    };
    const mockDemoUser = {
      uid: 'demo-operator-uid',
      email: 'demo-operator@joeppli.ch',
      displayName: 'Demo Admin Operator',
      emailVerified: true
    } as any;
    
    setCurrentUser(mockDemoUser);
    setCurrentUserProfile(demoProfile);
    setIsAuthenticated(true);
    setIsAdmin(true);
    setIsProfileLoading(false);
  };

  // Helper to safely clear all auth states
  const handleLogout = async () => {
    localStorage.removeItem('joppilot_demo_session');
    setCurrentUser(null);
    setCurrentUserProfile(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    await auth.signOut();
  };

  // Real-time Firebase Authentication & Operator Profile listener
  useEffect(() => {
    const isDemo = localStorage.getItem('joppilot_demo_session') === 'true';
    if (isDemo) {
      const demoProfile: OperatorProfile = {
        uid: 'demo-operator-uid',
        email: 'demo-operator@joeppli.ch',
        role: 'admin',
        status: 'approved',
        project: 'zurich',
        createdAt: new Date().toISOString()
      };
      const mockDemoUser = {
        uid: 'demo-operator-uid',
        email: 'demo-operator@joeppli.ch',
        displayName: 'Demo Admin Operator',
        emailVerified: true
      } as any;
      
      setCurrentUser(mockDemoUser);
      setCurrentUserProfile(demoProfile);
      setIsAuthenticated(true);
      setIsAdmin(true);
      setIsProfileLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;
    
    setIsProfileLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // Listen to operator document in real-time
        unsubscribeProfile = onSnapshot(doc(db, 'operators', user.uid), (docSnap) => {
          const adminProject = getAdminProject(user.email);

          if (adminProject) {
            const adminProfile: OperatorProfile = {
              uid: user.uid,
              email: user.email,
              role: 'admin',
              status: 'approved',
              project: adminProject,
              createdAt: docSnap.exists() ? (docSnap.data().createdAt || new Date().toISOString()) : new Date().toISOString()
            };

            setCurrentUserProfile(adminProfile);
            setIsAdmin(true);

            // Auto-heal Firestore if the record is missing or incorrect
            const currentDbData = docSnap.exists() ? docSnap.data() : null;
            if (
              !currentDbData ||
              currentDbData.role !== 'admin' ||
              currentDbData.status !== 'approved' ||
              currentDbData.project !== adminProject
            ) {
              setDoc(doc(db, 'operators', user.uid), adminProfile, { merge: true })
                .then(() => console.log("Admin Firestore profile successfully healed."))
                .catch(err => console.error("Error healing admin Firestore profile:", err));
            }
          } else if (docSnap.exists()) {
            const profile = docSnap.data() as OperatorProfile;
            setCurrentUserProfile(profile);
            setIsAdmin(profile.role === 'admin');
          } else {
            // First time Google or email user - fallback / wait for setDoc
            setCurrentUserProfile({
              uid: user.uid,
              email: user.email,
              role: 'operator',
              status: 'pending',
              project: 'zurich'
            });
            setIsAdmin(false);
          }
          setIsProfileLoading(false);
        }, (error) => {
          console.error("Error fetching operator profile snapshot:", error);
          setIsProfileLoading(false);
        });
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsProfileLoading(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // The active workspace = manual switcher override if set, else the operator's
  // assigned project. All workspace-aware views read from this derived profile.
  const effectiveProject: WorkspaceProject = projectOverride ?? currentUserProfile?.project ?? 'zurich';
  const effectiveProfile: OperatorProfile | null = currentUserProfile
    ? { ...currentUserProfile, project: effectiveProject }
    : null;

  // Dynamically switch vehicle, request, and alert configurations between city workspaces
  useEffect(() => {
    if (!currentUserProfile) return;

    if (effectiveProject === 'glarus') {
      setVehicles(GLARUS_VEHICLES);
      setRequests(GLARUS_REQUESTS);
      setAlerts([
        {
          id: 'a0',
          message: 'System online. GL-01 and GL-02 ready for deployment in Glarus.',
          type: 'info',
          timestamp: new Date(),
          read: false
        },
        {
          id: 'a1',
          message: 'ASSISTANCE REQUESTED: GL-02 encountered unmapped obstacle.',
          type: 'error',
          timestamp: new Date(),
          read: false
        }
      ]);
    } else {
      setVehicles(INITIAL_VEHICLES);
      setRequests(INITIAL_REQUESTS);
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
    }
    // Reset transient selections when the workspace changes.
    setSelectedVehicleId(null);
    setTeleopVehicleId(null);
  }, [effectiveProject, currentUserProfile]);

  useEffect(() => {

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

        // Trigger battery alerts — fire once when a vehicle first drops to the
        // low-battery threshold, and re-arm only after it recharges above 25%.
        newVehicles.forEach(v => {
          if (v.battery <= 20 && !lowBatteryAlertedRef.current.has(v.id)) {
            lowBatteryAlertedRef.current.add(v.id);
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
          } else if (v.battery > 25) {
            lowBatteryAlertedRef.current.delete(v.id);
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

    // Transient feedback that routing has started.
    toastInfo(`Calculating street-accurate route for ${vehicle.name}…`);

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

    // Confirm the route is ready (toast) and keep a persistent entry in the alert log.
    toastSuccess(`${vehicle.name} en route to ${req.address}`);
    setAlerts(prev => [
      {
        id: `route_${vehicleId}_${Date.now()}`,
        message: `Route calculated: ${vehicle.name} is navigating to ${req.address} via OpenStreetMap.`,
        type: 'info',
        timestamp: new Date(),
        read: false
      },
      ...prev
    ]);
  };

  const handleSendMessage = async (msg: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          fleetState: { vehicles, requests, alerts, project: currentUserProfile?.project },
        }),
      });
      if (!response.ok) throw new Error(`Chat API responded ${response.status}`);
      const data = await response.json();
      return data.reply ?? "No response from fleet intelligence.";
    } catch (error) {
      console.error("Chat request failed:", error);
      return "Unable to reach fleet intelligence. Please check your connection and try again.";
    }
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

          // Enforce active workspace geofence limits (Zürich vs Glarus)
          const activeProj = currentUserProfile?.project ?? 'zurich';
          const bounds = PLACES_BY_PROJECT[activeProj]?.bounds;
          if (bounds && data.lat && data.lng) {
            const isOutside = data.lat < bounds.latMin || data.lat > bounds.latMax || data.lng < bounds.lngMin || data.lng > bounds.lngMax;
            if (isOutside && data.avState !== 'MRM') {
              // Trigger automatic emergency safety stop in Firestore
              setDoc(doc(db, 'test_vehicles', data.id), {
                avState: 'MRM',
                throttle: 0,
                steeringAngle: 0,
                operatorCommand: 'WAIT',
                operatorCommandTimestamp: Date.now(),
                updatedAt: Date.now()
              }, { merge: true }).catch(() => {});

              // Queue system alert warning log
              setAlerts(prev => [
                {
                  id: `geofence_${data.id}_${Date.now()}`,
                  message: `CRITICAL GEOFENCE VIOLATION: Vehicle ${data.name || data.id} crossed ODD boundary. Emergency MRM engaged.`,
                  type: 'error',
                  timestamp: new Date(),
                  read: false
                },
                ...prev
              ]);

              toastError(`CRITICAL: Geofence violation on ${data.name || data.id}! Safety halt engaged.`);
            }
          }
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
    return (
      <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><LoadingState label="Loading test vehicle…" /></div>}>
        <TestVehicleScreen onBack={() => setIsSimulatedMode(false)} />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLogin={() => setIsAuthenticated(true)} 
        onLoginDemo={enterDemoMode}
        onEnterTestVehicle={() => setIsSimulatedMode(true)} 
      />
    );
  }

  if (isAuthenticated && isProfileLoading) {
    return (
      <div className="min-h-screen bg-joppli-light flex flex-col justify-center items-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-joppli-blue/20 border-t-joppli-blue rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase tracking-widest text-joppli-dark/60">Loading Workspace Profile...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && currentUserProfile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-joppli-light flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-joppli-blue/20">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-end gap-1">
              <span className="text-5xl font-black tracking-tight text-joppli-dark">jöppli</span>
              <div className="flex gap-1 mb-3 ml-1">
                <span className="w-2.5 h-2.5 bg-joppli-green rounded-full animate-ping"></span>
              </div>
            </div>
          </div>
          
          <div className="bg-white py-10 px-6 shadow-sm sm:rounded-2xl border border-joppli-grey sm:px-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-joppli-yellow/10 flex items-center justify-center text-joppli-yellow mb-6 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-joppli-dark uppercase">
              Access Pending Approval
            </h2>
            <p className="mt-3 text-sm text-joppli-dark/60 text-center font-medium leading-relaxed">
              Your municipal operator registration has been successfully recorded. A workspace administrator must approve your credentials before you can log in.
            </p>
            
            <div className="w-full bg-joppli-light border border-joppli-grey/80 rounded-xl p-4 my-6 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-joppli-dark/50">Operator Email</span>
                <span className="font-bold text-joppli-dark lowercase">{currentUserProfile.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-joppli-dark/50">Workspace City</span>
                <span className="font-extrabold text-joppli-blue uppercase tracking-wider">
                  {currentUserProfile.project === 'zurich' ? 'Zürich (ERZ)' : 'Glarus'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-joppli-dark/50">Review Status</span>
                <span className="px-2.5 py-1 rounded bg-joppli-yellow/15 border border-joppli-yellow/30 text-joppli-yellow font-black text-[9px] uppercase tracking-widest animate-pulse">
                  Awaiting Admin
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 bg-joppli-green rounded-full animate-ping"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-joppli-dark/55">
                Listening for real-time activation...
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-joppli-grey bg-white hover:bg-joppli-red/5 hover:text-joppli-red hover:border-joppli-red/20 px-4 py-3 text-xs font-bold text-joppli-dark uppercase tracking-widest transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Disconnect Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && currentUserProfile?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-joppli-light flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-joppli-red/20">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-6">
            <span className="text-4xl font-black tracking-tight text-joppli-dark">jöppli</span>
          </div>
          
          <div className="bg-white py-10 px-6 shadow-sm sm:rounded-2xl border border-joppli-grey sm:px-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-joppli-red/10 flex items-center justify-center text-joppli-red mb-6">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-joppli-dark uppercase">
              Access Authorization Denied
            </h2>
            <p className="mt-3 text-sm text-joppli-dark/60 text-center font-medium leading-relaxed">
              Your municipal operator request was reviewed and declined by the city administration. Please contact your local supervisor to coordinate authorization.
            </p>
            
            <div className="w-full bg-joppli-light border border-joppli-grey/80 rounded-xl p-4 my-6 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-joppli-dark/50">Operator Email</span>
                <span className="font-bold text-joppli-dark lowercase">{currentUserProfile.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-joppli-dark/50">Workspace City</span>
                <span className="font-extrabold text-joppli-blue uppercase tracking-wider">
                  {currentUserProfile.project === 'zurich' ? 'Zürich (ERZ)' : 'Glarus'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase tracking-widest text-joppli-dark/50">Review Status</span>
                <span className="px-2.5 py-1 rounded bg-joppli-red/15 border border-joppli-red/30 text-joppli-red font-black text-[9px] uppercase tracking-widest">
                  Access Blocked
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-joppli-dark text-white hover:bg-joppli-blue px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Return to Login Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex font-sans text-joppli-dark selection:bg-joppli-green/20">
      <LeftSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentUserProfile={effectiveProfile}
        isAdmin={isAdmin}
        activeProject={effectiveProject}
        onProjectChange={(p) => {
          setProjectOverride(p);
          toastInfo(`Switched to ${p === 'glarus' ? 'Glarus' : 'Zürich (ERZ)'} workspace`);
        }}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <TopBar 
          alerts={alerts} 
          vehicles={vehicles}
          requests={requests}
          currentUser={currentUser}
          currentUserProfile={effectiveProfile}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onClearAlerts={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}
        />
        
        <main className="flex-1 overflow-hidden flex bg-joppli-light">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LoadingState label="Loading view…" /></div>}>
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
                      currentUserProfile={effectiveProfile}
                    />
                 </div>
                 
                 <ChatBox onSendMessage={handleSendMessage} />
              </div>
            </>
          )}

          {activeTab === 'dashboard' && (
             <DashboardView currentUserProfile={effectiveProfile} />
          )}

          {activeTab === 'assistance' && (
             <RemoteAssistanceView vehicles={vehicles} project={effectiveProject} onRemoteDrive={setTeleopVehicleId} />
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
             <ContactsUsersView currentUserProfile={effectiveProfile} />
          )}

          {activeTab === 'inventory' && (
             <PartsInventoryView />
          )}

          {activeTab === 'places' && (
             <PlacesView project={effectiveProject} />
          )}

          </Suspense>
        </main>
      </div>

      {teleopVehicleId && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-[#0c0d12] flex items-center justify-center"><LoadingState label="Initializing teleoperation…" /></div>}>
          <TeleoperationView
            vehicleId={teleopVehicleId}
            project={effectiveProject}
            operatorEmail={currentUser?.email}
            onExit={() => setTeleopVehicleId(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
