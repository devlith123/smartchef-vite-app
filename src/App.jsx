import React from 'react';
import { useState, useEffect, useCallback } from 'react';
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
    updateDoc,
    collection,
    writeBatch,
    query,
    where,
    getDocs,
    onSnapshot,
    addDoc,
    Timestamp,
    orderBy,
    limit,
    increment
} from 'firebase/firestore';

// --- Firebase Configuration ---
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

// --- Helper Functions ---
const formatDate = (date) => {
    if (!date || typeof date.toDate !== 'function') return 'Invalid Date';
    const d = date.toDate();
    return d.toISOString().split('T')[0];
};

// --- Theme Application ---
const applyTheme = (color) => {
    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
    const validColor = hexColorRegex.test(color) ? color : '#4f46e5';
    document.documentElement.style.setProperty('--primary-color', validColor);

    const calculateLuminance = (hex) => {
        try {
            const rgb = parseInt(hex.slice(1), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;
            const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            return luminance;
        } catch (e) {
            return 0; // Default to dark background luminance on error
        }
     };
    const luminance = calculateLuminance(validColor);
    const textColor = luminance > 0.5 ? '#000000' : '#FFFFFF';
    document.documentElement.style.setProperty('--primary-text-color', textColor);

    const darkenColor = (hex, amount) => {
       try {
            let color = hex.startsWith('#') ? hex.slice(1) : hex;
            let num = parseInt(color, 16);
            let r = (num >> 16) - amount;
            let g = ((num >> 8) & 0x00FF) - amount;
            let b = (num & 0x0000FF) - amount;
            r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
            return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
        } catch (e) {
            return validColor; // Return original valid color on error
        }
     };
    const hoverColor = darkenColor(validColor, 20);
    document.documentElement.style.setProperty('--primary-hover-color', hoverColor);
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState(null);
    const [activeScreen, setActiveScreen] = useState('dashboard');
    const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);

    const fetchRestaurantData = useCallback(async (currentUser) => {
        console.log("fetchRestaurantData start for user:", currentUser?.uid || "null");

        if (!currentUser) {
            console.log("No current user provided to fetchRestaurantData.");
            setUser(null);
            setRestaurant(null);
            setActiveScreen('dashboard');
            applyTheme('#4f46e5');
            setInitialAuthCheckComplete(true);
            console.log("fetchRestaurantData end (logged out)");
            return;
        }

        try {
            console.log("Fetching restaurant doc:", currentUser.uid);
            const restaurantRef = doc(db, 'restaurants', currentUser.uid);
            const docSnap = await getDoc(restaurantRef);
            let restData;
            if (docSnap.exists()) {
                console.log("Restaurant doc found.");
                 const data = docSnap.data();
                 restData = {
                    ...data,
                    cuisineType: data.cuisineType || '', targetAudience: data.targetAudience || '',
                    dishes: data.dishes || [], phone: data.phone || '', logoUrl: data.logoUrl || '',
                    themeColor: data.themeColor || '#4f46e5',
                 };
            } else {
                console.log("Restaurant doc missing, creating default.");
                restData = {
                    owner: currentUser.displayName || 'Restaurant Owner', name: `${currentUser.displayName || 'My'}'s Place`,
                    subscription: 'free',
                    dishes: [{ id: 'dish1', name: 'Chicken Biryani' }, { id: 'dish2', name: 'Paneer Butter Masala' }, { id: 'dish3', name: 'Masala Dosa' }],
                    phone: '', cuisineType: '', targetAudience: '', logoUrl: '', themeColor: '#4f46e5',
                    createdAt: Timestamp.now(),
                };
                await setDoc(restaurantRef, restData);
                console.log("Default restaurant created.");
            }
            console.log("Applying theme:", restData.themeColor);
            applyTheme(restData.themeColor);
            console.log("Setting restaurant state.");
            setRestaurant(restData);
            console.log("Setting user state.");
            setUser(currentUser);
        } catch (error) {
            console.error("CRITICAL: Error in fetchRestaurantData:", error);
            setUser(null);
            setRestaurant(null);
            applyTheme('#4f46e5');
        } finally {
            setInitialAuthCheckComplete(true);
            console.log("fetchRestaurantData end (logged in/error)");
        }
    }, []);

    useEffect(() => {
        console.log("Attaching onAuthStateChanged listener.");
        setLoading(true);
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log("onAuthStateChanged event. User:", firebaseUser?.uid || "null");
            setInitialAuthCheckComplete(false);
            setUser(null);
            setRestaurant(null);
            fetchRestaurantData(firebaseUser).finally(() => {
                setLoading(false);
                console.log("Auth state change fully processed. Loading false.");
            });
        });
        return () => {
            console.log("Detaching onAuthStateChanged listener.");
            unsubscribe();
        };
    }, [fetchRestaurantData]);


    const updateRestaurant = (newData) => {
        const updatedRestaurant = { ...restaurant, ...newData };
        setRestaurant(updatedRestaurant);
        if (newData.themeColor) {
             applyTheme(newData.themeColor);
        }
     };

    useEffect(() => {
        console.log("Applying CSS theme variables (runs once).");
        const styleId = 'dynamic-theme-styles';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                :root {
                    --primary-color: #4f46e5;
                    --primary-hover-color: #4338ca;
                    --primary-text-color: #ffffff;
                }
                .bg-primary { background-color: var(--primary-color); }
                .text-primary { color: var(--primary-color); }
                .border-primary { border-color: var(--primary-color); }
                .hover\\:bg-primary-hover:hover { background-color: var(--primary-hover-color); }
                .ring-primary:focus { --tw-ring-color: var(--primary-color); }
                .text-on-primary { color: var(--primary-text-color); }
            `;
            document.head.appendChild(style);
        }
        applyTheme(restaurant?.themeColor || '#4f46e5');
    }, [restaurant?.themeColor]);

    if (loading || !initialAuthCheckComplete) {
         console.log("App Render: LoadingScreen (loading:", loading, "authCheck:", initialAuthCheckComplete, ")");
         return <LoadingScreen message="Loading SmartChef AI..." />;
    }

    if (!user) {
         console.log("App Render: AuthScreen (no user after auth check)");
         return <AuthScreen />;
    }

    if (!restaurant) {
         console.log("App Render: LoadingScreen (Error state: user exists but restaurant fetch failed)");
         return <LoadingScreen message="Error loading restaurant data. Please refresh." />;
    }

    console.log("App Render: Main App UI for screen:", activeScreen);
    const ScreenComponent = {
        dashboard: <DashboardScreen restaurant={restaurant} userId={user.uid} />,
        marketing: <MarketingScreen restaurant={restaurant} userId={user.uid}/>,
        orders: <LiveOrdersScreen restaurant={restaurant} userId={user.uid} />,
        insights: <AIInsightsScreen restaurant={restaurant} userId={user.uid} />,
        settings: <SettingsScreen user={user} restaurant={restaurant} updateRestaurant={updateRestaurant} />,
    }[activeScreen];

    return (
        <div className="md:max-w-sm md:mx-auto bg-gray-100 min-h-screen font-sans flex flex-col">
            {restaurant && <Header title={restaurant.name} logoUrl={restaurant.logoUrl} />}
            <main className="flex-grow p-4 pb-20">
                {ScreenComponent}
            </main>
            {restaurant && <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} isPro={restaurant.subscription === 'pro'} themeColor={restaurant.themeColor}/>}
        </div>
    );
}

// --- Screens & Components ---

const LoadingScreen = ({ message }) => (
     <div className="flex items-center justify-center h-screen bg-gray-100"> <div className="text-xl font-semibold text-gray-700">{message}</div> </div>
);

const AuthScreen = () => {
     const signInWithGoogle = async () => { /* ... unchanged ... */ };
    // ** FIX: Restored AuthScreen JSX implementation **
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <h1 className="text-4xl font-bold text-primary mb-2">SmartChef AI</h1>
            <p className="text-gray-600 mb-8">Your AI-Powered Restaurant Assistant</p>
            <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center bg-primary text-on-primary font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-primary-hover transition duration-300"
            >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 48 48"> <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path> </svg>
                Sign in with Google
            </button>
        </div>
     );
};


const Header = ({ title, logoUrl }) => ( /* ... unchanged ... */ );
const DashboardScreen = ({ restaurant, userId }) => { /* ... unchanged ... */ };
const SalesEntryModal = ({ dishes, userId, onClose, onSave }) => { /* ... unchanged ... */ };
const LiveOrdersScreen = ({ restaurant, userId }) => { /* ... unchanged ... */ };
const MarketingScreen = ({ restaurant, userId }) => { /* ... unchanged ... */ };
const AIInsightsScreen = ({ restaurant, userId }) => { /* ... unchanged ... */ };
const SettingsScreen = ({ user, restaurant, updateRestaurant }) => { /* ... unchanged ... */ };
const ProFeatureLock = ({ title, description }) => ( /* ... unchanged ... */ );
const BottomNavBar = ({ activeScreen, setActiveScreen, isPro, themeColor }) => { /* ... unchanged ... */ };

// --- Icon Components ---
// ... (All icons unchanged) ...
const Icon = ({ children }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const PlusIcon = () => <Icon><path d="M5 12h14"/><path d="M12 5v14"/></Icon>;
const AlertTriangleIcon = () => <Icon><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>;
const LogOutIcon = () => <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></Icon>;
const LockIcon = () => <Icon><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>;
const TrashIcon = () => <Icon><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></Icon>;
const LayoutDashboardIcon = () => <Icon><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></Icon>;
const ShoppingCartIcon = () => <Icon><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></Icon>;
const BarChartIcon = () => <Icon><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></Icon>;
const SettingsIcon = () => <Icon><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0-2l-.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Icon>;
const SendIcon = () => <Icon><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Icon>;
const Share2Icon = () => <Icon><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></Icon>;
const UsersIcon = () => <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
const SparklesIcon = () => <Icon><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></Icon>;
const SpinnerIcon = () => <Icon><path d="M21 12a9 9 0 1 1-6.219-8.56"/></Icon>;
const ClipboardIcon = () => <Icon><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></Icon>;
const BrainCircuitIcon = () => <Icon><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588 3 3 0 1 0 5.997-.125 4 4 0 0 0 2.526-5.77 4 4 0 0 0-.556-6.588Z"/><path d="M17.125 7.375A3 3 0 1 0 14 10.5a4.002 4.002 0 0 0 4.125 2.125 4 4 0 0 0 3.75-3.75 3 3 0 1 0-4.75-1.5Z"/><path d="M6.25 15.75a3 3 0 1 0-3.375-3.375 4 4 0 0 0-1.75 4.75 4 4 0 0 0 5.125 1.75Z"/><path d="M12 14v1"/><path d="M12 9v1"/><path d="M14.5 12.5h-1"/><path d="M9.5 12.5h1"/><path d="m10 14 1-1"/><path d="m14 10-1 1"/><path d="m14 14 1 1"/><path d="m10 10-1-1"/><path d="M17.5 7.5h1"/><path d="M17.5 12.5h-1"/><path d="m15.5 10.5 1-1"/><path d="m19.5 8.5-1 1"/><path d="M6.5 18.5v-1"/><path d="M9.5 15.5v1"/><path d="M8 17h1"/><path d="M5 17h-1"/><path d="m7 16-1-1"/><path d="m10 19-1-1"/></Icon>;
const MessageSquareIcon = () => <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>;

