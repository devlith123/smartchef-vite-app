import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState(null);
    const [activeScreen, setActiveScreen] = useState('dashboard');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const restaurantRef = doc(db, 'restaurants', currentUser.uid);
                const docSnap = await getDoc(restaurantRef);
                if (docSnap.exists()) {
                    setRestaurant(docSnap.data());
                } else {
                    const newRestaurant = {
                        owner: currentUser.displayName,
                        name: `${currentUser.displayName}'s Place`,
                        subscription: 'free',
                        dishes: [],
                        createdAt: Timestamp.now(),
                    };
                    await setDoc(restaurantRef, newRestaurant);
                    setRestaurant(newRestaurant);
                }
                setUser(currentUser);
            } else {
                setUser(null);
                setRestaurant(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading SmartChef AI...</div></div>;
    }

    if (!user) {
        return <AuthScreen />;
    }

    if (!restaurant) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading Restaurant...</div></div>;
    }

    const ScreenComponent = {
        dashboard: <DashboardScreen restaurant={restaurant} />,
        orders: <LiveOrdersScreen restaurant={restaurant} />,
        reports: <ReportsScreen restaurant={restaurant} />,
        settings: <SettingsScreen user={user} />,
    }[activeScreen];

    return (
        <div className="md:max-w-sm md:mx-auto bg-gray-100 min-h-screen font-sans flex flex-col">
            <main className="flex-grow p-4">
                {ScreenComponent}
            </main>
            <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} isPro={restaurant.subscription === 'pro'} />
        </div>
    );
}

// --- Screens & Components ---

const AuthScreen = () => {
    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <h1 className="text-4xl font-bold text-indigo-600 mb-2">SmartChef AI</h1>
            <p className="text-gray-600 mb-8">Your AI-Powered Restaurant Assistant</p>
            <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300"
            >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                Sign in with Google
            </button>
        </div>
    );
};


const DashboardScreen = ({ restaurant }) => {
    // Mock data for predictions
    const predictions = useMemo(() => [
        { id: 1, name: 'Chicken Biryani', prediction: 22, confidence: 92, wastage: true },
        { id: 2, name: 'Paneer Butter Masala', prediction: 12, confidence: 85, wastage: false },
        { id: 3, name: 'Masala Dosa', prediction: 40, confidence: 95, wastage: false },
    ], []);

    return (
        <div>
            <Header title={`${restaurant.name}`} />
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <button className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center justify-center">
                    <PlusIcon className="h-6 w-6 mr-2" />
                    Enter Yesterday's Sales
                </button>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Tomorrow's Forecast</h2>
            <div className="space-y-3">
                {predictions.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-lg shadow">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-gray-600">Prediction: {item.prediction} plates (Confidence: {item.confidence}%)</p>
                        {item.wastage && (
                            <p className="text-yellow-600 font-semibold flex items-center mt-1">
                                <AlertTriangleIcon className="h-5 w-5 mr-1" /> High wastage last week!
                            </p>
                        )}
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-indigo-600">
                           <PencilIcon className="h-5 w-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LiveOrdersScreen = ({ restaurant }) => {
    const isPro = restaurant.subscription === 'pro';

    // Mock data for orders
     const orders = useMemo(() => [
        { id: 101, customerName: 'Anjali Rao', status: 'pending', total: 550, items: ["2x Chicken Biryani", "1x Gulab Jamun"] },
        { id: 102, customerName: 'Vikram Singh', status: 'accepted', total: 350, items: ["1x Masala Dosa", "1x Veg Hakka Noodles"] },
        { id: 103, customerName: 'Priya Sharma', status: 'delivered', total: 720, items: ["3x Paneer Butter Masala", "4x Naan"] },
    ], []);

    if (!isPro) {
        return <ProFeatureLock title="Live Order Hub" description="Upgrade to Pro to manage commission-free direct orders from your own QR code." />;
    }

    return (
        <div>
            <Header title="Live Orders" />
            <div className="space-y-3">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-lg shadow relative">
                         <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${
                            order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                            order.status === 'accepted' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                        }`}>{order.status}</span>
                        <h3 className="font-bold text-lg">{order.customerName} - #{order.id}</h3>
                        <p className="text-gray-600 text-sm">{order.items.join(', ')}</p>
                        <p className="font-bold text-gray-800 mt-2">Total: ₹{order.total}</p>
                        <div className="mt-3 flex space-x-2">
                           {order.status === 'pending' && <button className="flex-1 bg-green-500 text-white font-bold py-2 px-3 rounded-lg text-sm">Accept</button>}
                           {order.status === 'accepted' && <button className="flex-1 bg-cyan-500 text-white font-bold py-2 px-3 rounded-lg text-sm">Book Delivery</button>}
                           <button className="flex-1 bg-red-500 text-white font-bold py-2 px-3 rounded-lg text-sm">Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsScreen = ({ restaurant }) => {
    const isPro = restaurant.subscription === 'pro';

    if (!isPro) {
        return <ProFeatureLock title="Advanced Reports" description="Upgrade to Pro to download sales data and get advanced menu engineering insights." />;
    }
    
    return (
         <div>
            <Header title="Reports & Insights" />
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-2">Menu Engineering</h3>
                <p className="text-sm text-gray-600 mb-3">📈 <span className="font-semibold">Top Performer:</span> Chicken Biryani is your most sold and most profitable item. Consider creating a combo offer with it.</p>
                <p className="text-sm text-gray-600">🤔 <span className="font-semibold">Opportunity:</span> Paneer Butter Masala sells well but has high wastage. Our AI suggests reducing prep quantity by 2 units on weekdays.</p>
            </div>
             <div className="bg-white p-4 rounded-lg shadow mt-4">
                <h3 className="font-bold text-lg mb-2">Export Data</h3>
                <button className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-300 flex items-center justify-center">
                    <DownloadIcon className="h-6 w-6 mr-2" />
                    Download Sales Data (CSV)
                </button>
            </div>
        </div>
    );
};


const SettingsScreen = ({ user }) => {
    return (
        <div>
            <Header title="Settings" />
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow mb-4 text-center">
                <h3 className="font-bold text-lg mb-2">Your Restaurant QR Code</h3>
                <div className="flex justify-center my-2">
                    <div className="p-2 border rounded-md">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://smartchef-ai.netlify.app/menu/${user.uid}`} alt="Restaurant QR Code" />
                    </div>
                </div>
                <p className="text-xs text-gray-500">Customers can scan this to order directly!</p>
            </div>
            <button
                onClick={() => signOut(auth)}
                className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 flex items-center justify-center"
            >
                <LogOutIcon className="h-6 w-6 mr-2" />
                Sign Out
            </button>
        </div>
    );
};

const Header = ({ title }) => (
    <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
);


const ProFeatureLock = ({ title, description }) => (
    <div>
        <Header title={title} />
        <div className="bg-white p-6 rounded-lg shadow text-center">
            <LockIcon className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">This is a Pro Feature</h2>
            <p className="text-gray-600 mb-6">{description}</p>
            <button className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300">
                Upgrade to Pro
            </button>
        </div>
    </div>
);

const BottomNavBar = ({ activeScreen, setActiveScreen, isPro }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
        { id: 'orders', label: 'Orders (Pro)', icon: ShoppingCartIcon, pro: true },
        { id: 'reports', label: 'Reports (Pro)', icon: BarChartIcon, pro: true },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];

    return (
        <div className="bg-white shadow-t sticky bottom-0 border-t">
            <div className="flex justify-around">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveScreen(item.id)}
                        className={`flex flex-col items-center justify-center w-full pt-3 pb-2 transition duration-300 ${
                            activeScreen === item.id ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
                        }`}
                        disabled={item.pro && !isPro}
                    >
                        <div className="relative">
                            {item.pro && !isPro && <LockIcon className="absolute -top-1 -right-1 h-3 w-3 text-gray-400" />}
                            <item.icon className={`h-6 w-6 mb-1 ${item.pro && !isPro ? 'text-gray-300' : ''}`} />
                        </div>
                        <span className={`text-xs ${item.pro && !isPro ? 'text-gray-300' : ''}`}>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Icon Components (Lucide React) ---
const Icon = ({ children }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const PlusIcon = () => <Icon><path d="M5 12h14"/><path d="M12 5v14"/></Icon>;
const AlertTriangleIcon = () => <Icon><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>;
const PencilIcon = () => <Icon><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></Icon>;
const LogOutIcon = () => <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></Icon>;
const LockIcon = () => <Icon><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>;
const DownloadIcon = () => <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></Icon>;
const LayoutDashboardIcon = () => <Icon><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></Icon>;
const ShoppingCartIcon = () => <Icon><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></Icon>;
const BarChartIcon = () => <Icon><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></Icon>;
const SettingsIcon = () => <Icon><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Icon>;
