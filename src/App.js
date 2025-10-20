import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    Timestamp
} from 'firebase/firestore';

// --- Firebase Configuration ---
// IMPORTANT: Replace this with your own Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyBftMuoj3qY5uE36I_x5WtBX4JAh1wFZgc",
  authDomain: "smartchefai-78cae.firebaseapp.com",
  projectId: "smartchefai-78cae",
  storageBucket: "smartchefai-78cae.firebasestorage.app",
  messagingSenderId: "279030560133",
  appId: "1:279030560133:web:02577656535c3d919180ec",
  measurementId: "G-DRZ41NQ6J4"
};

// --- Initialize Firebase ---
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// --- SVG ICONS ---
const ChefHatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17.5a2.5 2.5 0 0 1 5 0Z"/><path d="M10 15.5a2.5 2.5 0 0 1 5 0v-2.5a2.5 2.5 0 0 1-5 0v2.5Z"/><path d="M2 13h20a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M12 2a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z"/></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
const ShoppingCartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const GoogleIcon = () => <svg viewBox="0 0 48 48" width="24" height="24"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.552-3.443-11.179-8.169l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,36.218,44,30.551,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>;

// --- MOCK DATA (for initial UI dev and fallback) ---
const MOCK_PREDICTIONS = [
    { id: 'd1', name: 'Chicken Biryani', prediction: 22, confidence: 92, wastageAlert: true },
    { id: 'd2', name: 'Paneer Butter Masala', prediction: 12, confidence: 85, wastageAlert: false },
    { id: 'd3', name: 'Masala Dosa', prediction: 40, confidence: 95, wastageAlert: false },
];
const MOCK_ORDERS = [
    { id: 'o1', customerName: 'Ravi Kumar', total: 450, items: [{name: 'Chicken Biryani', qty: 2}], status: 'pending' },
    { id: 'o2', customerName: 'Priya Sharma', total: 720, items: [{name: 'Paneer Butter Masala', qty: 3}], status: 'accepted' },
];

// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState(null);
    const [currentScreen, setCurrentScreen] = useState('dashboard');

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                const restaurantDocRef = doc(db, "restaurants", user.uid);
                const restaurantDoc = await getDoc(restaurantDocRef);
                if (restaurantDoc.exists()) {
                    setRestaurant({ id: user.uid, ...restaurantDoc.data() });
                } else {
                    const newRestaurantProfile = { 
                        id: user.uid, 
                        name: user.displayName ? `${user.displayName}'s Place` : "My Restaurant", 
                        dishes: [], 
                        subscription: "basic" 
                    };
                    await setDoc(restaurantDocRef, newRestaurantProfile);
                    setRestaurant(newRestaurantProfile);
                }
            } else {
                setUser(null);
                setRestaurant(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            setUser(null);
            setRestaurant(null);
            setCurrentScreen('dashboard');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading SmartChef AI...</div></div>;
    }

    if (!user) {
        return <AuthScreen />;
    }

    // FIX: Add a loading state for the restaurant data to prevent rendering with null props.
    if (!restaurant) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading Restaurant...</div></div>;
    }

    const ScreenComponent = {
        dashboard: <DashboardScreen restaurant={restaurant} />,
        orders: <LiveOrdersScreen restaurant={restaurant} />,
        reports: <ReportsScreen restaurant={restaurant} />,
        settings: <SettingsScreen restaurant={restaurant} setRestaurant={setRestaurant} handleLogout={handleLogout}/>,
    }[currentScreen];

    return (
        <div className="h-screen w-screen bg-gray-50 font-sans flex flex-col md:max-w-sm md:mx-auto md:shadow-2xl">
            <header className="bg-white p-4 border-b border-gray-200 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ChefHatIcon />
                    {restaurant?.name || 'SmartChef AI'}
                </h1>
            </header>
            <main className="flex-grow overflow-y-auto p-4">
                {ScreenComponent}
            </main>
            <BottomNavBar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} restaurant={restaurant} />
        </div>
    );
}

// --- AUTHENTICATION SCREEN ---
function AuthScreen() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        if (!auth) {
            setError("Firebase not initialized.");
            return;
        }
        setLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const restaurantDocRef = doc(db, "restaurants", user.uid);
            const restaurantDoc = await getDoc(restaurantDocRef);

            if (!restaurantDoc.exists()) {
                await setDoc(restaurantDocRef, {
                    name: user.displayName ? `${user.displayName}'s Place` : "My New Restaurant",
                    dishes: [],
                    subscription: "basic",
                    createdAt: Timestamp.now(),
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-600 text-white p-3 rounded-full">
                        <ChefHatIcon />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Welcome to SmartChef AI</h2>
                <p className="text-center text-gray-500 mb-8">Sign in to manage your restaurant.</p>
                {error && <p className="text-red-500 text-xs italic mb-4 text-center">{error}</p>}
                <button 
                    onClick={handleGoogleSignIn}
                    disabled={loading} 
                    className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:bg-gray-200 flex items-center justify-center gap-3 transition-colors"
                >
                    <GoogleIcon />
                    {loading ? "Signing in..." : "Sign in with Google"}
                </button>
            </div>
        </div>
    );
}

// --- DASHBOARD SCREEN ---
function DashboardScreen({ restaurant }) {
    const [showDataEntry, setShowDataEntry] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [predictions, setPredictions] = useState(MOCK_PREDICTIONS);

    return (
        <div className="space-y-6">
            <div>
                <button 
                    onClick={() => setShowDataEntry(true)}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-2"
                >
                    <PlusIcon /> Enter Yesterday's Sales
                </button>
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-700 mb-3">Tomorrow's Forecast</h2>
                <div className="space-y-3">
                    {predictions.map(dish => (
                        <div key={dish.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-800">{dish.name}</p>
                                <p className="text-sm text-gray-500">
                                    Prediction: <span className="font-bold text-indigo-600">{dish.prediction} plates</span> (Confidence: {dish.confidence}%)
                                </p>
                                {dish.wastageAlert && <p className="text-xs text-red-500 font-semibold mt-1">⚠️ High wastage last week!</p>}
                            </div>
                            <button onClick={() => setShowEditModal(dish)} className="p-2 text-gray-500 hover:text-indigo-600">
                                <EditIcon />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {showDataEntry && <DailyDataEntryScreen restaurant={restaurant} onClose={() => setShowDataEntry(false)} />}
            {showEditModal && <EditForecastModal dish={showEditModal} onClose={() => setShowEditModal(null)} onUpdate={() => setShowEditModal(null)} />}
        </div>
    );
}

// --- DAILY DATA ENTRY MODAL ---
function DailyDataEntryScreen({ restaurant, onClose }) {
    const [salesData, setSalesData] = useState({});

    useEffect(() => {
        const initialData = {};
        restaurant.dishes.forEach(dish => {
            initialData[dish.id] = { sold: '', wasted: '' };
        });
        setSalesData(initialData);
    }, [restaurant.dishes]);
    
    const handleInputChange = (dishId, field, value) => {
        setSalesData(prev => ({ ...prev, [dishId]: { ...prev[dishId], [field]: value } }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        alert("Sales data submitted! Your new forecast will be ready shortly.");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Enter Daily Sales</h3>
                    <p className="text-sm text-gray-500">For yesterday: {new Date(Date.now() - 864e5).toLocaleDateString()}</p>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto p-4 flex-grow">
                    <div className="space-y-4">
                        {(restaurant.dishes || []).map(dish => (
                            <div key={dish.id} className="p-3 border rounded-lg">
                                <p className="font-semibold text-gray-700 mb-2">{dish.name}</p>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">Quantity Sold</label>
                                        <input type="number" className="w-full px-2 py-1 border border-gray-300 rounded-md" value={salesData[dish.id]?.sold || ''} onChange={(e) => handleInputChange(dish.id, 'sold', e.target.value)} placeholder="e.g., 25" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">Quantity Wasted</label>
                                        <input type="number" className="w-full px-2 py-1 border border-gray-300 rounded-md" value={salesData[dish.id]?.wasted || ''} onChange={(e) => handleInputChange(dish.id, 'wasted', e.target.value)} placeholder="e.g., 2" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </form>
                <div className="p-4 border-t flex gap-3">
                    <button onClick={onClose} className="w-full bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSubmit} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">Submit</button>
                </div>
            </div>
        </div>
    );
}

// --- EDIT FORECAST MODAL ---
function EditForecastModal({ dish, onClose, onUpdate }) {
    const [feedback, setFeedback] = useState(dish.prediction);
    const blendedForecast = useMemo(() => Math.round(dish.prediction * 0.7 + Number(feedback) * 0.3), [dish.prediction, feedback]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="p-4 border-b"><h3 className="text-lg font-bold text-gray-800">{dish.name}</h3></div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-600">AI Prediction: <span className="font-bold">{dish.prediction} plates</span></p>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Your Estimate</label>
                        <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg text-center font-bold" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg text-center">
                        <p className="text-sm text-indigo-700">Blended Forecast</p>
                        <p className="text-2xl font-extrabold text-indigo-600">{blendedForecast} plates</p>
                    </div>
                </div>
                <div className="p-4 border-t flex gap-3">
                    <button onClick={onClose} className="w-full bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={() => onUpdate(dish, feedback)} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg">Update</button>
                </div>
            </div>
        </div>
    );
}

// --- LIVE ORDERS SCREEN (PRO) ---
function LiveOrdersScreen({ restaurant }) {
    const [orders, setOrders] = useState(MOCK_ORDERS);
    const [showDeliveryModal, setShowDeliveryModal] = useState(null);
    const isPro = restaurant.subscription === 'pro';

    if (!isPro) return <UpgradeToPro feature="Live Order Management" />;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-700">Live Orders</h2>
            {orders.length === 0 && <p className="text-gray-500 text-center py-8">No new orders right now.</p>}
            {orders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-gray-800">{order.customerName}</p>
                            <p className="text-sm text-gray-500">Total: ₹{order.total}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{order.status}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">{order.items.map(item => `${item.qty}x ${item.name}`).join(', ')}</div>
                    {order.status === 'pending' && (
                        <div className="mt-4 flex gap-2">
                            <button className="flex-1 bg-green-500 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1"><CheckCircleIcon /></button>
                            <button className="flex-1 bg-red-500 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1"><XCircleIcon /></button>
                        </div>
                    )}
                    {order.status === 'accepted' && <button onClick={() => setShowDeliveryModal(order)} className="mt-4 w-full bg-blue-500 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-2"><TruckIcon /> Book Delivery</button>}
                </div>
            ))}
            {showDeliveryModal && <DeliveryPartnerModal order={showDeliveryModal} onClose={() => setShowDeliveryModal(null)} />}
        </div>
    );
}

// --- DELIVERY PARTNER MODAL ---
function DeliveryPartnerModal({ order, onClose }) {
    const deliveryPartners = [{ name: 'Dunzo', eta: '12 mins', cost: 45 }, { name: 'Rapido', eta: '15 mins', cost: 40 }];
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="p-4 border-b"><h3 className="text-lg font-bold text-gray-800">Book a Delivery Partner</h3></div>
                <div className="p-4 space-y-3">
                    {deliveryPartners.map(partner => (
                        <div key={partner.name} className="flex justify-between items-center p-3 border rounded-lg">
                            <div><p className="font-semibold">{partner.name}</p><p className="text-sm text-gray-500">{partner.eta} - ₹{partner.cost}</p></div>
                            <button onClick={() => { alert(`Booked with ${partner.name}!`); onClose(); }} className="bg-indigo-600 text-white text-sm font-bold py-1 px-3 rounded-lg">Book</button>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t"><button onClick={onClose} className="w-full bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg">Cancel</button></div>
            </div>
        </div>
    );
}

// --- REPORTS SCREEN (PRO) ---
function ReportsScreen({ restaurant }) {
    const isPro = restaurant.subscription === 'pro';
    if (!isPro) return <UpgradeToPro feature="Advanced Reports & Data Export" />;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-700">Weekly Reports</h2>
            <div className="p-4 bg-white rounded-lg shadow-sm border">
                <h3 className="font-semibold mb-2">Sales per Dish</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><div className="w-24">Biryani</div><div className="h-4 bg-green-500 rounded" style={{width: '80%'}}></div></div>
                    <div className="flex items-center gap-2"><div className="w-24">Paneer</div><div className="h-4 bg-green-500 rounded" style={{width: '50%'}}></div></div>
                </div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm border">
                <h3 className="font-semibold mb-2">Wastage % per Dish</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><div className="w-24">Biryani</div><div className="h-4 bg-red-400 rounded" style={{width: '15%'}}></div></div>
                    <div className="flex items-center gap-2"><div className="w-24">Paneer</div><div className="h-4 bg-red-400 rounded" style={{width: '8%'}}></div></div>
                </div>
            </div>
            <button onClick={() => alert("Generating sales report...")} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg">Download Sales Data (CSV)</button>
        </div>
    );
}

// --- SETTINGS SCREEN ---
function SettingsScreen({ restaurant, setRestaurant, handleLogout }) {
    const [dishes, setDishes] = useState(restaurant.dishes || []);
    const [newDishName, setNewDishName] = useState('');

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://your-ordering-website.com/menu/${restaurant.id}`;

    const handleAddDish = async () => {
        if (!newDishName.trim()) return;
        const newDish = { id: `d${Date.now()}`, name: newDishName.trim() };
        const updatedDishes = [...dishes, newDish];
        
        await setDoc(doc(db, "restaurants", restaurant.id), { dishes: updatedDishes }, { merge: true });
        setDishes(updatedDishes);
        setRestaurant(prev => ({ ...prev, dishes: updatedDishes }));
        setNewDishName('');
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-white rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-800 mb-4">Manage Dishes</h3>
                <div className="space-y-2">{dishes.map(dish => <div key={dish.id} className="p-2 border rounded bg-gray-50">{dish.name}</div>)}</div>
                <div className="mt-4 flex gap-2">
                    <input type="text" value={newDishName} onChange={e => setNewDishName(e.target.value)} placeholder="New dish name" className="flex-grow px-3 py-2 border rounded-md" />
                    <button onClick={handleAddDish} className="bg-indigo-600 text-white p-2 rounded-md"><PlusIcon /></button>
                </div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-800 mb-2">Your Ordering QR Code</h3>
                <div className="flex justify-center p-2"><img src={qrCodeUrl} alt="Restaurant QR Code" className="rounded-lg border-4 border-gray-200" /></div>
                <p className="text-center text-sm text-gray-500 mt-2">Place this on tables for direct orders.</p>
            </div>
            {restaurant.subscription === 'basic' && (
                <div className="p-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg text-white text-center">
                    <h3 className="text-lg font-bold">Upgrade to SmartChef Pro!</h3>
                    <p className="text-sm mt-1 mb-3">Unlock live orders, delivery integration, and advanced reports.</p>
                    <button className="bg-white text-green-500 font-bold py-2 px-6 rounded-full">Upgrade Now</button>
                </div>
            )}
            <button onClick={handleLogout} className="w-full bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                <LogoutIcon /> Logout
            </button>
        </div>
    );
}

// --- UPGRADE TO PRO COMPONENT ---
function UpgradeToPro({ feature }) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full p-6 bg-gray-100 rounded-lg">
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4"><ShoppingCartIcon /></div>
            <h2 className="text-xl font-bold text-gray-800">Unlock {feature}</h2>
            <p className="text-gray-600 mt-2 mb-4">This is a SmartChef Pro feature. Upgrade your plan to accept direct orders, save on commissions, and grow your business.</p>
            <button className="bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-2 px-6 rounded-full shadow-lg">Upgrade to Pro</button>
        </div>
    );
}

// --- BOTTOM NAVIGATION BAR ---
function BottomNavBar({ currentScreen, setCurrentScreen, restaurant }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <ChefHatIcon /> },
        { id: 'orders', label: 'Orders', icon: <ShoppingCartIcon />, pro: true },
        { id: 'reports', label: 'Reports', icon: <ChartIcon />, pro: true },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    ];

    return (
        <div className="bg-white border-t border-gray-200 shadow-t-md flex justify-around">
            {navItems.map(item => {
                const isActive = currentScreen === item.id;
                const isProFeature = item.pro && restaurant.subscription !== 'pro';
                return (
                    <button 
                        key={item.id} 
                        onClick={() => setCurrentScreen(item.id)}
                        className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs ${isActive ? 'text-indigo-600' : 'text-gray-500'} hover:bg-indigo-50`}
                    >
                        {item.icon}
                        <span className="mt-1">{item.label} {isProFeature && "(Pro)"}</span>
                        {isActive && <div className="w-8 h-1 bg-indigo-600 rounded-full mt-1"></div>}
                    </button>
                );
            })}
        </div>
    );
}



