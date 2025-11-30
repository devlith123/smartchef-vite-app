import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    increment,
    runTransaction
} from 'firebase/firestore';

// --- Firebase Configuration ---
// 🔴 ACTION REQUIRED: PASTE YOUR FIREBASE KEYS HERE AGAIN 🔴
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
            return 0; 
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
            return validColor; 
        }
     };
    const hoverColor = darkenColor(validColor, 20);
    document.documentElement.style.setProperty('--primary-hover-color', hoverColor);
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true); 
    const [loadingData, setLoadingData] = useState(false); 
    const [restaurant, setRestaurant] = useState(null);
    const [activeScreen, setActiveScreen] = useState('dashboard');
    const [appError, setAppError] = useState(null); // ** NEW: Global Error State **

    // Stage 1: Listen for auth changes
    useEffect(() => {
        setLoadingAuth(true); 
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
            } else {
                setUser(null);
                setRestaurant(null); 
                applyTheme('#4f46e5'); 
            }
            setLoadingAuth(false); 
        });
        return () => unsubscribe();
    }, []); 

    // Stage 2: Fetch data
    useEffect(() => {
        const fetchRestaurantData = async (currentUser) => {
            if (!currentUser) {
                setRestaurant(null);
                setLoadingData(false); 
                return;
            }

            setLoadingData(true); 
            setAppError(null); // Clear previous errors

            try {
                const restaurantRef = doc(db, 'restaurants', currentUser.uid);
                const docSnap = await getDoc(restaurantRef);
                let restData;
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    restData = {
                        ...data,
                        cuisineType: data.cuisineType || '', targetAudience: data.targetAudience || '',
                        dishes: (data.dishes || []).map(d => ({...d, cost: d.cost || 100})), 
                        phone: data.phone || '', logoUrl: data.logoUrl || '',
                        themeColor: data.themeColor || '#4f46e5',
                        aggregatorCommission: data.aggregatorCommission || 25,
                    };
                } else {
                    restData = {
                        owner: currentUser.displayName || 'Restaurant Owner', name: `${currentUser.displayName || 'My'}'s Place`,
                        subscription: 'free',
                        dishes: [
                            { id: 'dish1', name: 'Chicken Biryani', cost: 120 },
                            { id: 'dish2', name: 'Paneer Butter Masala', cost: 100 },
                            { id: 'dish3', name: 'Masala Dosa', cost: 40 }
                        ],
                        phone: '', cuisineType: '', targetAudience: '', logoUrl: '', themeColor: '#4f46e5',
                        aggregatorCommission: 25,
                        createdAt: Timestamp.now(),
                    };
                    await setDoc(restaurantRef, restData);
                }
                applyTheme(restData.themeColor);
                setRestaurant(restData);
            } catch (error) {
                console.error("CRITICAL: Error in fetchRestaurantData:", error);
                // ** FIX: Show error instead of logging out **
                setAppError(error.message); 
            } finally {
                setLoadingData(false); 
            }
        };

        if (!loadingAuth) { 
            fetchRestaurantData(user);
        }
    }, [user, loadingAuth]);


    const updateRestaurant = (newData) => {
        const updatedRestaurant = { ...restaurant, ...newData };
        setRestaurant(updatedRestaurant);
        if (newData.themeColor) {
             applyTheme(newData.themeColor);
        }
     };

    useEffect(() => {
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

    // ** Error Screen (Debugging) **
    if (appError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center">
                <h2 className="text-2xl font-bold text-red-700 mb-2">Something went wrong</h2>
                <p className="text-gray-700 mb-4">We couldn't load your restaurant data.</p>
                <div className="bg-white p-4 rounded border border-red-200 text-left w-full max-w-md overflow-auto mb-4">
                    <p className="text-xs font-mono text-red-600 break-all">{appError}</p>
                </div>
                {appError.includes("permission") && (
                    <div className="bg-yellow-100 p-3 rounded text-sm text-yellow-800 mb-4">
                        <strong>Tip:</strong> This usually means your Firestore Database Rules are blocking access. 
                        Go to Firebase Console {'>'} Build {'>'} Firestore Database {'>'} Rules and paste the rules provided in the chat.
                    </div>
                )}
                 {appError.includes("api-key") && (
                    <div className="bg-yellow-100 p-3 rounded text-sm text-yellow-800 mb-4">
                        <strong>Tip:</strong> Double check your API Key in the code. It might still be the placeholder "YOUR_API_KEY".
                    </div>
                )}
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (loadingAuth) return <LoadingScreen message="Connecting..." />;
    if (!user) return <AuthScreen />;
    if (loadingData) return <LoadingScreen message="Loading Restaurant..." />;
    
    // Fallback if no error but no data (shouldn't happen with new logic)
    if (!restaurant) return <LoadingScreen message="Initializing..." />;

    const ScreenComponent = {
        dashboard: <DashboardScreen restaurant={restaurant} userId={user.uid} />,
        marketing: <MarketingScreen restaurant={restaurant} userId={user.uid}/>,
        orders: <LiveOrdersScreen restaurant={restaurant} userId={user.uid} />,
        inventory: <InventoryScreen restaurant={restaurant} userId={user.uid} />,
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

const AuthScreen = ({}) => {
     const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            alert(`Login Failed: ${error.message}`); // Show alert on login fail
        }
    };
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

const Header = ({ title, logoUrl }) => (
    <div className="flex items-center justify-between mb-4 px-4 pt-4">
        {logoUrl ? (
            <img src={logoUrl} alt={`${title} logo`} className="h-10 w-auto mr-3 rounded" onError={(e) => {e.target.style.display='none'; e.target.onerror=null;}}/>
        ) : (
             <div className="w-10 h-10 mr-3 flex-shrink-0"></div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 flex-grow truncate">{title}</h1>
    </div>
);


const DashboardScreen = ({ restaurant, userId }) => {
    const currentDishes = useMemo(() => restaurant?.dishes || [], [restaurant]);
    const [isSalesModalOpen, setSalesModalOpen] = useState(false);
    const [predictions, setPredictions] = useState([]);
    const [loadingPredictions, setLoadingPredictions] = useState(false);
    const [predictionError, setPredictionError] = useState('');
    const [lowStockItems, setLowStockItems] = useState([]);
    const [weeklySavings, setWeeklySavings] = useState({ wastage: 0, commission: 0, total: 0 });
    const [loadingSavings, setLoadingSavings] = useState(true);

    const calculatePredictions = useCallback(async () => {
        if (!userId || currentDishes.length === 0) {
            setPredictions([]);
            return;
        }

        setLoadingPredictions(true);
        setPredictionError('');
        
        try {
            const sevenDaysAgo = new Date(); 
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoMillis = Timestamp.fromDate(sevenDaysAgo).toMillis();

            const salesQuery = query(collection(db, 'daily_sales'), where('userId', '==', userId));
            const querySnapshot = await getDocs(salesQuery);
            
            const salesData = {};
            currentDishes.forEach(d => salesData[d.id] = []);

            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Robust check for valid date and numbers
                const dateMillis = data.date?.toMillis ? data.date.toMillis() : null;
                
                if (dateMillis && dateMillis >= sevenDaysAgoMillis) {
                    if (salesData[data.dishId]) {
                         const safeSold = typeof data.quantitySold === 'number' ? data.quantitySold : 0;
                         const safeWasted = typeof data.quantityWasted === 'number' ? data.quantityWasted : 0;
                         salesData[data.dishId].push({...data, quantitySold: safeSold, quantityWasted: safeWasted});
                    }
                 }
            });

            const hasSalesData = Object.values(salesData).some(arr => arr.length > 0);
            
            if (!hasSalesData) {
                setPredictions([]); 
            } else {
                 const newPredictions = currentDishes.map(dish => {
                    const dishSales = salesData[dish.id];
                    let prediction = 5, confidence = 20, totalSold = 0, totalWasted = 0;
                    
                    if (dishSales && dishSales.length > 0) {
                        const sum = dishSales.reduce((acc, curr) => acc + (curr.quantitySold || 0), 0);
                        prediction = Math.max(0, Math.round(sum / dishSales.length));
                        confidence = Math.min(95, 20 + dishSales.length * 10);
                        totalSold = dishSales.reduce((acc, curr) => acc + (curr.quantitySold || 0), 0);
                        totalWasted = dishSales.reduce((acc, curr) => acc + (curr.quantityWasted || 0), 0);
                    }
                    
                    const totalPrepared = totalSold + totalWasted;
                    const wastagePercent = totalPrepared > 0 ? Math.round((totalWasted / totalPrepared) * 100) : 0;
                    return { id: dish.id, name: dish.name, prediction, confidence, wastage: wastagePercent > 15, wastagePercent };
                });
                setPredictions(newPredictions);
            }
        } catch (error) {
            console.error("Dashboard: Failed to calculate predictions:", error);
            // Display the actual error message to help debugging
            setPredictionError(`Error: ${error.message || "Unknown calculation error"}`);
        } finally {
            setLoadingPredictions(false);
        }
    }, [userId, currentDishes]);

    // Initial Calculation Effect
    useEffect(() => {
        calculatePredictions();
    }, [calculatePredictions]);

    // Fetch Low Stock Logic
    useEffect(() => {
        if (!userId) return;
        const inventoryQuery = query(collection(db, 'inventory'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(inventoryQuery, (querySnapshot) => {
            const lowItems = [];
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                if (item.currentStock <= item.lowStockThreshold) { lowItems.push(item); }
            });
            setLowStockItems(lowItems);
        }, (error) => {
             // Ignore permission errors for inventory if not set up
             console.warn("Inventory fetch warning:", error.message);
        });
        return () => unsubscribe();
    }, [userId]);

    // Savings Calculation Logic
    const calculateWeeklySavings = useCallback(async () => {
        setLoadingSavings(true);
        let totalWastageSavings = 0;
        let totalCommissionSavings = 0;
        
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);
            const dishCostMap = new Map(currentDishes.map(d => [d.id, d.cost || 0]));

            const salesQuery = query(collection(db, 'daily_sales'), where('userId', '==', userId));
            const salesSnapshot = await getDocs(salesQuery);
            salesSnapshot.forEach(doc => {
                const data = doc.data();
                const dateMillis = data.date?.toMillis ? data.date.toMillis() : 0;
                if (dateMillis >= sevenDaysAgoTimestamp.toMillis()) {
                    const cost = dishCostMap.get(data.dishId) || 0;
                    totalWastageSavings += (data.quantityWasted || 0) * cost;
                }
            });

            const ordersQuery = query(collection(db, 'live_orders'), where('userId', '==', userId));
            const ordersSnapshot = await getDocs(ordersQuery);
            let totalOrderValue = 0;
            ordersSnapshot.forEach(doc => { 
                 const data = doc.data();
                 const dateMillis = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
                 if(dateMillis >= sevenDaysAgoTimestamp.toMillis()){
                     totalOrderValue += data.total || 0; 
                 }
            });
            const commissionRate = restaurant.aggregatorCommission / 100 || 0.25;
            totalCommissionSavings = totalOrderValue * commissionRate;

            setWeeklySavings({ wastage: Math.round(totalWastageSavings), commission: Math.round(totalCommissionSavings), total: Math.round(totalWastageSavings + totalCommissionSavings) });
        } catch (error) { console.error("Error calculating weekly savings:", error); }
        finally { setLoadingSavings(false); }
    }, [userId, currentDishes, restaurant.aggregatorCommission]);

    useEffect(() => {
        calculateWeeklySavings();
    }, [calculateWeeklySavings]);

    const sendWhatsAppReport = () => {
        if (!restaurant.phone) { alert("Please add your WhatsApp phone number in the Settings tab first."); return; }
        let reportText = `*SmartChef AI - Tomorrow's Forecast*\n\n`;
        predictions.forEach(item => { reportText += `*${item.name}*: ${item.prediction} plates\n`; if (item.wastage) { reportText += `_⚠️ High Wastage Alert (${item.wastagePercent}%)_\n`; } });
        reportText += `\nReply with corrections if needed (e.g., Biryani 25, Paneer 15)`;
        const encodedText = encodeURIComponent(reportText);
        const whatsappUrl = `https://wa.me/${restaurant.phone}?text=${encodedText}`;
        window.location.href = whatsappUrl;
    };

    return (
        <div>
            {/* Savings Widget */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 border-l-4 border-green-500">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Weekly Savings</h2>
                {loadingSavings ? <p>Calculating savings...</p> : (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-lg"> <span className="text-gray-600">Commission Saved:</span> <span className="font-bold text-green-600">₹{weeklySavings.commission.toLocaleString()}</span> </div>
                         <div className="flex justify-between items-center text-lg"> <span className="text-gray-600">Wastage Reduced:</span> <span className="font-bold text-green-600">₹{weeklySavings.wastage.toLocaleString()}</span> </div>
                        <hr className="my-1"/>
                         <div className="flex justify-between items-center text-xl"> <span className="font-bold text-gray-800">Total Saved:</span> <span className="font-extrabold text-green-700">₹{weeklySavings.total.toLocaleString()}</span> </div>
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                <button onClick={() => setSalesModalOpen(true)} className="w-full bg-primary text-on-primary font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition duration-300 flex items-center justify-center">
                    <PlusIcon className="h-6 w-6 mr-2" /> <span>Enter Yesterday's Sales</span>
                </button>
                <button onClick={sendWhatsAppReport} disabled={loadingPredictions || predictions.length === 0 || !!predictionError} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                    <SendIcon className="h-6 w-6 mr-2" /> <span>Send Report via WhatsApp</span>
                </button>
            </div>

            {/* Alerts */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow mb-4" role="alert">
                    <h3 className="font-bold text-lg flex items-center"> <AlertTriangleIcon className="h-6 w-6 mr-2"/> Low Stock Alerts! </h3>
                    <ul className="list-disc list-inside mt-2 text-sm"> {lowStockItems.map(item => ( <li key={item.id}> <strong>{item.name}:</strong> Only {item.currentStock} {item.unit} left. (Threshold is {item.lowStockThreshold}) </li> ))} </ul>
                </div>
            )}

            {/* Forecast List */}
            <h2 className="text-xl font-bold text-gray-800 mb-3">Tomorrow's Forecast</h2>
            {loadingPredictions ? ( <p className="text-gray-500 italic">Calculating predictions...</p> )
            : predictionError ? ( 
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"> 
                    <strong className="font-bold">Error: </strong> 
                    <span className="block sm:inline">{predictionError}</span> 
                    <button onClick={calculatePredictions} className="block mt-2 bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-bold">Retry Calculation</button>
                </div> 
            )
            : predictions.length > 0 ? (
                <div className="space-y-3">
                    {predictions.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-lg shadow relative">
                            <h3 className="font-bold text-lg">{item.name}</h3>
                            <p className="text-gray-600">Prediction: {item.prediction} plates (Confidence: {item.confidence}%)</p>
                            {item.wastage && ( <p className="text-yellow-600 font-semibold flex items-center mt-1"> <AlertTriangleIcon className="h-5 w-5 mr-1" /> High wastage last week! ({item.wastagePercent}%) </p> )}
                        </div>
                    ))}
                </div>
             ) : (
                <div className="bg-white p-4 rounded-lg shadow text-center">
                    <p className="text-gray-600">No predictions to show.</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {(!restaurant.dishes || restaurant.dishes.length === 0) ? "Please add some dishes in the Settings tab." : "Enter yesterday's sales data to generate the first forecast."}
                    </p>
                </div>
             )}

            {isSalesModalOpen && (
                <SalesEntryModal dishes={restaurant.dishes || []} userId={userId} onClose={() => setSalesModalOpen(false)} onSave={() => { calculatePredictions(); calculateWeeklySavings(); }}/>
             )}
        </div>
    );
};


const SalesEntryModal = ({ dishes, userId, onClose, onSave }) => {
    if (!userId) return null;
    const [salesData, setSalesData] = useState(
        dishes.reduce((acc, dish) => {
            acc[dish.id] = { sold: '', wasted: '' };
            return acc;
        }, {})
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (dishId, field, value) => {
        const numValue = value === '' ? '' : Math.max(0, parseInt(value, 10));
        setSalesData(prev => ({
            ...prev,
            [dishId]: { ...prev[dishId], [field]: numValue }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const date = Timestamp.fromDate(yesterday);
            const formattedDate = formatDate(date);
            const batch = writeBatch(db);

            for (const dish of dishes) {
                const sold = salesData[dish.id]?.sold === '' ? 0 : Number(salesData[dish.id]?.sold ?? 0);
                const wasted = salesData[dish.id]?.wasted === '' ? 0 : Number(salesData[dish.id]?.wasted ?? 0);

                if (sold > 0 || wasted > 0) {
                    const docId = `${userId}_${formattedDate}_${dish.id}`;
                    const saleRef = doc(db, 'daily_sales', docId);
                    batch.set(saleRef, {
                        userId,
                        dishId: dish.id,
                        dishName: dish.name,
                        quantitySold: sold,
                        quantityWasted: wasted,
                        date,
                    });
                }
            }
            await batch.commit();
            onSave();
            onClose();
        } catch (error) {
            console.error("Error saving sales data: ", error);
            alert("Failed to save sales data. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                 <div className="p-4 border-b"> <h2 className="text-xl font-bold">Enter Yesterday's Sales</h2> </div>
                 <div className="p-4 space-y-4 overflow-y-auto">
                    {(dishes || []).map(dish => (
                        <div key={dish.id} className="p-3 bg-gray-50 rounded-md border">
                            <p className="font-semibold text-gray-800">{dish.name}</p>
                            <div className="flex items-center space-x-3 mt-2">
                                <div className="flex-1"> <label className="text-sm text-gray-500">Quantity Sold</label> <input type="number" min="0" value={salesData[dish.id]?.sold ?? ''} onChange={(e) => handleInputChange(dish.id, 'sold', e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="e.g., 25" /> </div>
                                <div className="flex-1"> <label className="text-sm text-gray-500">Quantity Wasted</label> <input type="number" min="0" value={salesData[dish.id]?.wasted ?? ''} onChange={(e) => handleInputChange(dish.id, 'wasted', e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="e.g., 2" /> </div>
                            </div>
                        </div>
                    ))}
                    {(!dishes || dishes.length === 0) && (<p className="text-gray-500 text-center">Please add some dishes in the Settings tab first.</p>)}
                 </div>
                 <div className="p-4 border-t flex justify-end space-x-3">
                     <button onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                     <button onClick={handleSave} disabled={isSaving || !dishes || dishes.length === 0} className="px-4 py-2 bg-primary text-on-primary rounded-md disabled:opacity-50"> {isSaving ? 'Saving...' : 'Save'} </button>
                 </div>
            </div>
        </div>
    );
};


const LiveOrdersScreen = ({ restaurant, userId }) => {
    if (!userId) return <LoadingScreen message="Waiting for user data..." />;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ordersQuery = query(
            collection(db, 'live_orders'),
            where('userId', '==', userId),
            where('status', 'in', ['pending', 'accepted'])
        );

        const unsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
            const liveOrders = [];
            querySnapshot.forEach((doc) => {
                liveOrders.push({ id: doc.id, ...doc.data() });
            });
            liveOrders.sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0);
            });
            setOrders(liveOrders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching live orders: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const addTestOrder = async () => {
        const testCustomer = {
            name: 'Test Customer ' + Math.floor(Math.random() * 100),
            phone: '919876500000'
        };
        try {
            const orderTotal = 200;
            const pointsEarned = Math.floor(orderTotal);

            await addDoc(collection(db, 'live_orders'), {
                userId: userId,
                customerName: testCustomer.name,
                customerPhone: testCustomer.phone,
                items: [
                    { name: restaurant.dishes[0]?.name || 'Test Dish 1', quantity: 1, price: 100 },
                    { name: restaurant.dishes[1]?.name || 'Test Dish 2', quantity: 2, price: 50 }
                ],
                total: orderTotal,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            const customerDocId = `${userId}_${testCustomer.phone}`;
            const customerRef = doc(db, 'customers', customerDocId);
            const customerSnap = await getDoc(customerRef);
            let currentPoints = 0;
            let notificationAlreadySent = false;

            if (customerSnap.exists()) {
                currentPoints = customerSnap.data().loyaltyPoints || 0;
                notificationAlreadySent = customerSnap.data().pointsNotificationSent || false;
            }

            const newTotalPoints = currentPoints + pointsEarned;

            await setDoc(customerRef, {
                userId: userId, name: testCustomer.name, phone: testCustomer.phone,
                lastOrderAt: Timestamp.now(),
                loyaltyPoints: increment(pointsEarned),
                pointsNotificationSent: newTotalPoints >= 1000 ? notificationAlreadySent : false // Reset flag if below 1000
            }, { merge: true });

            if (newTotalPoints >= 1000 && !notificationAlreadySent) {
                console.log(`Customer ${testCustomer.name} reached 1000 points! Sending notification...`);
                const message = `🎉 Congratulations ${testCustomer.name}! You've reached ${newTotalPoints} loyalty points at ${restaurant.name}! Enjoy a special 1+1 offer on your next order as our valued customer! 🎁`;
                const encodedText = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${testCustomer.phone}?text=${encodedText}`;
                window.open(whatsappUrl, `_blank_reward`);
                await updateDoc(customerRef, { pointsNotificationSent: true });
                alert(`Reward notification opened for ${testCustomer.name}.`);
            }
        } catch (error) { console.error("Error adding test order/customer/points: ", error); }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        const orderRef = doc(db, 'live_orders', orderId);
        try { await updateDoc(orderRef, { status: newStatus }); }
        catch (error) { console.error("Error updating order status: ", error); }
    };

    return (
        <div>
            <button onClick={addTestOrder} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center mb-4"> Add Test Order (Adds Points) </button>
             {loading ? <p>Loading live orders...</p> : (
                orders.length === 0 ? ( <p className="text-center text-gray-500 mt-8">No live orders yet.</p> )
                : ( <div className="space-y-3">
                     {orders.map(order => (
                         <div key={order.id} className="bg-white p-4 rounded-lg shadow">
                             <div className="flex justify-between items-center mb-2">
                                <div> <h3 className="font-bold text-lg">{order.customerName}</h3> {order.customerPhone && <p className="text-sm text-gray-500">{order.customerPhone}</p>} </div>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-sm ${ order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800' }`}> {order.status} </span>
                             </div>
                             <ul className="list-disc list-inside text-gray-700 mb-2"> {(order.items || []).map((item, index) => ( <li key={`${item.name}-${index}`}>{item.quantity}x {item.name}</li> ))} </ul>
                             <p className="font-bold text-right mb-3">Total: ₹{order.total}</p>
                             <div className="flex space-x-2">
                                {order.status === 'pending' && ( <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="w-full bg-green-500 text-white py-2 rounded-md">Accept</button> )}
                                {order.status === 'accepted' && ( <> <button className="w-1/2 bg-blue-500 text-white py-2 rounded-md">Book Delivery (WIP)</button> <button onClick={() => updateOrderStatus(order.id, 'completed')} className="w-1/2 bg-primary text-on-primary py-2 rounded-md">Mark Completed</button> </> )}
                             </div>
                         </div>
                     ))}
                    </div> )
            )}
        </div>
    );
};


const MarketingScreen = ({ restaurant, userId }) => {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Instagram');
    const [generatedPost, setGeneratedPost] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const callGeminiAPI = useCallback(async (systemPrompt, userQuery) => {
        setIsLoading(true); setError(''); setGeneratedPost('');
        // 🔴 ACTION REQUIRED: PASTE YOUR GEMINI API KEY HERE AGAIN 🔴
        const apiKey = "AIzaSyAiG1X8N41d4SRQquhDhHk-Qf7q_om0YVo"; 
        
        if (apiKey === "YOUR_GEMINI_API_KEY" || apiKey.includes("YOUR_")) { 
             setError("API Key for Gemini not set in code."); 
             setIsLoading(false); 
             return null; 
        }
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const payload = { contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, };
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API failed: ${response.status}`);
            const result = await response.json();
            const candidate = result.candidates?.[0];
            if (candidate && candidate.content?.parts?.[0]?.text) { return candidate.content.parts[0].text; }
            else { throw new Error('Unexpected API response.'); }
        } catch (err) { console.error('Gemini Error:', err); setError(`AI Error: ${err.message}`); return null; }
        finally { setIsLoading(false); }
    }, []);

    const generateSocialMediaPost = async (promptTopic) => {
        const finalTopic = promptTopic || topic;
        if (!finalTopic.trim()) { setError('Please enter a topic.'); return; }
        const systemPrompt = `Act as a creative restaurant marketing expert. Restaurant: ${restaurant.name}, Cuisine: ${restaurant.cuisineType || 'delicious food'}, Target: ${restaurant.targetAudience || 'local food lovers'}. Platform: ${platform}. Use emojis & hashtags.`;
        const userQuery = `Generate a post about: ${finalTopic}.`;
        const result = await callGeminiAPI(systemPrompt, userQuery);
        if (result) { setGeneratedPost(result); setTopic(finalTopic); }
    };
    
    const generatePostForToday = () => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[new Date().getDay()];
        const popularDish = restaurant.dishes[0]?.name || 'our delicious food';
        let autoTopic = `A special offer for ${dayOfWeek}!`;
        if (dayOfWeek === 'Friday' || dayOfWeek === 'Saturday') { autoTopic = `It's the weekend! Time to enjoy ${popularDish} at ${restaurant.name}!`; }
        else if (dayOfWeek === 'Monday') { autoTopic = `Start your week right with a meal from ${restaurant.name}.`; }
        generateSocialMediaPost(autoTopic);
    };

    const copyToClipboard = () => {
        const textArea = document.createElement("textarea"); textArea.value = generatedPost; document.body.appendChild(textArea); textArea.select();
        try { document.execCommand('copy'); alert('Post copied!'); } catch (err) { alert('Failed to copy.'); }
        document.body.removeChild(textArea);
    };

    return (
        <div>
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Create a New Post</h3>
                <button onClick={generatePostForToday} disabled={isLoading} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center disabled:opacity-50 mb-4"> <SparklesIcon className="h-6 w-6 mr-2" /> Generate AI Post for Today </button>
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1"> Or enter a custom topic: </label>
                    <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="E.g., Special offer on Biryani" className="w-full p-2 border rounded-md mb-3"/>
                     <label className="block text-sm font-medium text-gray-700 mb-1"> Platform </label>
                    <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full p-2 border rounded-md bg-white mb-4"> <option value="Instagram">Instagram</option> <option value="Facebook">Facebook</option> </select>
                    <button onClick={() => generateSocialMediaPost(topic)} disabled={isLoading} className="w-full bg-primary text-on-primary font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition duration-300 flex items-center justify-center disabled:opacity-50"> {isLoading ? <SpinnerIcon className="h-6 w-6 mr-2 animate-spin"/> : <SparklesIcon className="h-6 w-6 mr-2"/>} {isLoading ? 'Generating...' : 'Generate Custom Post'} </button>
                </div>
                 {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            </div>
            {generatedPost && (
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-2">Generated Post:</h3>
                    <textarea value={generatedPost} onChange={(e) => setGeneratedPost(e.target.value)} className="w-full p-2 border rounded-md h-40 mb-3 bg-gray-50" readOnly={isLoading}/>
                    <button onClick={copyToClipboard} className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center"> <ClipboardIcon className="h-5 w-5 mr-2" /> Copy Post Text </button>
                </div>
            )}
        </div>
    );
};


const InventoryScreen = ({ restaurant, userId }) => {
    const [inventory, setInventory] = useState([]);
    const [checklist, setChecklist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ name: '', currentStock: '', unit: 'kg', lowStockThreshold: '' });
    const [showAddItem, setShowAddItem] = useState(false);
    const [cleanlinessTasks, setCleanlinessTasks] = useState([
        { id: 'task1', name: 'Wipe down all counters & prep surfaces', completed: false },
        { id: 'task2', name: 'Sweep and mop kitchen floor', completed: false },
        { id: 'task3', name: 'Check and log fridge/freezer temperatures', completed: false },
        { id: 'task4', name: 'Empty all trash bins', completed: false },
        { id: 'task5', name: 'Clean cooking equipment (grill, fryers)', completed: false },
    ]);
    const [logLoading, setLogLoading] = useState(false);
    const [lastLog, setLastLog] = useState(null);

    useEffect(() => {
        setLoading(true);
        const invQuery = query(collection(db, 'inventory'), where('userId', '==', userId), orderBy('name'));
        const unsubscribe = onSnapshot(invQuery, (snapshot) => {
            const items = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            setInventory(items);
            setLoading(false);
        }, err => { console.error("Error fetching inventory:", err); setLoading(false); });
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const logQuery = query(collection(db, 'cleanliness_logs'), where('userId', '==', userId), where('date', '==', todayStr), limit(1));
        const unsubscribe = onSnapshot(logQuery, (snapshot) => {
             if (!snapshot.empty) {
                const logData = snapshot.docs[0].data();
                setLastLog(logData);
                setCleanlinessTasks(tasks => tasks.map(task => ({ 
                    ...task, 
                    completed: logData.tasks?.includes(task.name) || false 
                })));
            } else {
                setLastLog(null);
                setCleanlinessTasks(tasks => tasks.map(task => ({ ...task, completed: false })));
            }
        });
        return () => unsubscribe();
    }, [userId]);

    const handleItemChange = (e) => { const { name, value } = e.target; setNewItem(prev => ({ ...prev, [name]: value })); };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.name || !newItem.currentStock || !newItem.unit || !newItem.lowStockThreshold) { alert("Please fill out all fields."); return; }
        try { await addDoc(collection(db, 'inventory'), { userId: userId, name: newItem.name, currentStock: parseFloat(newItem.currentStock), unit: newItem.unit, lowStockThreshold: parseFloat(newItem.lowStockThreshold), }); setNewItem({ name: '', currentStock: '', unit: 'kg', lowStockThreshold: '' }); setShowAddItem(false); }
        catch (error) { console.error("Error adding item: ", error); alert("Failed to add item."); }
    };

    const updateStock = async (itemId, amount) => {
        const itemRef = doc(db, 'inventory', itemId);
        try { await runTransaction(db, async (transaction) => { const itemDoc = await transaction.get(itemRef); if (!itemDoc.exists()) throw "Item does not exist!"; const newStock = Math.max(0, (itemDoc.data().currentStock || 0) + amount); transaction.update(itemRef, { currentStock: newStock }); }); }
        catch (error) { console.error("Error updating stock: ", error); alert("Failed to update stock."); }
    };

    const handleTaskToggle = (taskId) => { if (lastLog) return; setCleanlinessTasks(tasks => tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task)); };
    
    const submitCleanlinessLog = async () => {
        setLogLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const completedTasks = cleanlinessTasks.filter(t => t.completed).map(t => t.name);
        if (completedTasks.length !== cleanlinessTasks.length) { alert("Please complete all tasks before submitting."); setLogLoading(false); return; }
        const log = { userId: userId, date: todayStr, completedAt: Timestamp.now(), completedBy: auth.currentUser.displayName, tasks: completedTasks };
        try { await setDoc(doc(db, 'cleanliness_logs', `${userId}_${todayStr}`), log); setLastLog(log); alert("Cleanliness log submitted!"); }
        catch (error) { console.error("Error submitting log: ", error); alert("Failed to submit log."); }
        finally { setLogLoading(false); }
    };

    return (
        <div>
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <div className="flex justify-between items-center mb-2"> <h3 className="font-bold text-lg">Inventory / Stock</h3> <button onClick={() => setShowAddItem(!showAddItem)} className="text-primary font-semibold text-sm"> {showAddItem ? 'Cancel' : '+ Add Item'} </button> </div>
                {showAddItem && ( <form onSubmit={handleAddItem} className="bg-gray-50 p-3 rounded-md mb-3 space-y-2 border"> <input name="name" value={newItem.name} onChange={handleItemChange} placeholder="Item Name (e.g., Rice)" className="w-full p-2 border rounded"/> <div className="flex space-x-2"> <input name="currentStock" type="number" value={newItem.currentStock} onChange={handleItemChange} placeholder="Current Stock" className="w-1/2 p-2 border rounded"/> <select name="unit" value={newItem.unit} onChange={handleItemChange} className="w-1/2 p-2 border rounded bg-white"> <option value="kg">kg</option> <option value="liters">liters</option> <option value="pieces">pieces</option> <option value="packs">packs</option> </select> </div> <input name="lowStockThreshold" type="number" value={newItem.lowStockThreshold} onChange={handleItemChange} placeholder="Low stock threshold" className="w-full p-2 border rounded"/> <button type="submit" className="w-full bg-primary text-on-primary font-semibold py-2 rounded-md hover:bg-primary-hover">Save Item</button> </form> )}
                {loading ? <p>Loading inventory...</p> : ( <div className="divide-y divide-gray-200 max-h-60 overflow-y-auto"> {inventory.length === 0 && <p className="text-gray-500 text-center py-2">No inventory items added yet.</p>} {inventory.map(item => ( <div key={item.id} className="py-2"> <div className="flex justify-between items-center"> <span className="font-semibold">{item.name}</span> <span className={`font-bold ${item.currentStock <= item.lowStockThreshold ? 'text-red-500' : 'text-gray-700'}`}> {item.currentStock} {item.unit} </span> </div> <div className="flex items-center justify-end space-x-2 mt-1"> <button onClick={() => updateStock(item.id, -1)} className="px-2 py-0.5 bg-red-100 text-red-700 rounded">-1</button> <button onClick={() => updateStock(item.id, -5)} className="px-2 py-0.5 bg-red-100 text-red-700 rounded">-5</button> <button onClick={() => updateStock(item.id, 5)} className="px-2 py-0.5 bg-green-100 text-green-700 rounded">+5</button> <button onClick={() => updateStock(item.id, 10)} className="px-2 py-0.5 bg-green-100 text-green-700 rounded">+10</button> </div> </div> ))} </div> )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                 <h3 className="font-bold text-lg mb-2">Daily Kitchen Checklist</h3>
                 <div className="space-y-2"> {cleanlinessTasks.map(task => ( <label key={task.id} className={`flex items-center space-x-3 ${lastLog ? 'cursor-not-allowed' : ''}`}> <input type="checkbox" checked={task.completed} disabled={!!lastLog} onChange={() => handleTaskToggle(task.id)} className="h-5 w-5 rounded border-gray-300 text-primary ring-primary disabled:opacity-50"/> <span className={`text-gray-700 ${ task.completed ? 'line-through text-gray-400' : ''}`}> {task.name} </span> </label> ))} </div>
                 {lastLog ? ( <p className="text-center text-sm text-green-600 font-semibold mt-4">Log submitted for today by {lastLog.completedBy.split(' ')[0]}!</p> ) : ( <button onClick={submitCleanlinessLog} disabled={logLoading || cleanlinessTasks.some(t => !t.completed)} className="w-full mt-4 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50"> {logLoading ? 'Submitting...' : 'Submit Log for Today'} </button> )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center opacity-50">
                 <h3 className="font-bold text-lg mb-2">AI Vendor & Wastage Insights (Coming Soon)</h3>
                 <p className="text-sm text-gray-600"> Future Pro Feature: Link inventory items to dishes to automatically track raw material wastage and get AI-powered vendor purchasing suggestions. </p>
            </div>
        </div>
    );
};


const AIInsightsScreen = ({ restaurant, userId }) => {
    const [salesAnalysis, setSalesAnalysis] = useState('');
    const [feedbackSummary, setFeedbackSummary] = useState('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [offerModal, setOfferModal] = useState({ isOpen: false, customer: null, message: '' });
    const [loadingOffer, setLoadingOffer] = useState(false);
    const [error, setError] = useState('');
    
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalCost, setTotalCost] = useState(0);
    const [estimatedProfit, setEstimatedProfit] = useState(0);
    const [loadingFinancials, setLoadingFinancials] = useState(true);
    const [cfoAdvice, setCfoAdvice] = useState('');
    const [loadingCfo, setLoadingCfo] = useState(false);

    const dishCostMap = useMemo(() => {
        return new Map((restaurant.dishes || []).map(d => [d.id, d.cost || 0]));
    }, [restaurant.dishes]);

    useEffect(() => {
        setLoadingCustomers(true);
        const customersQuery = query(collection(db, 'customers'), where('userId', '==', userId));
        const unsubscribeCust = onSnapshot(customersQuery, (snapshot) => {
            const list = []; snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => (b.lastOrderAt?.toDate() || 0) - (a.lastOrderAt?.toDate() || 0));
            setCustomers(list); setLoadingCustomers(false);
        });

        setLoadingFinancials(true);
        let revenue = 0;
        let costOfGoods = 0;
        const ordersQuery = query(collection(db, 'live_orders'), where('userId', '==', userId), where('status', '==', 'completed'));
        const getRevenue = getDocs(ordersQuery).then(snapshot => {
            snapshot.forEach(doc => { revenue += doc.data().total || 0; });
        });

        const salesQuery = query(collection(db, 'daily_sales'), where('userId', '==', userId));
        const getCost = getDocs(salesQuery).then(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                const cost = dishCostMap.get(data.dishId) || 0;
                costOfGoods += (data.quantitySold || 0) * cost;
            });
        });

        Promise.all([getRevenue, getCost]).then(() => {
            setTotalRevenue(revenue);
            setTotalCost(costOfGoods);
            setEstimatedProfit(revenue - costOfGoods);
            setLoadingFinancials(false);
        }).catch(err => {
            console.error("Error fetching financials: ", err);
            setError("Could not load financial data.");
            setLoadingFinancials(false);
        });

        return () => { unsubscribeCust(); };
    }, [userId, dishCostMap]);

    const callGeminiAPI = async (systemPrompt, userQuery) => {
        setError('');
        // 🔴 ACTION REQUIRED: PASTE YOUR GEMINI API KEY HERE AGAIN 🔴
        const apiKey = "AIzaSyAiG1X8N41d4SRQquhDhHk-Qf7q_om0YVo"; 
        if (apiKey === "YOUR_GEMINI_API_KEY" || apiKey.includes("YOUR_")) { setError("API Key for Gemini not set."); return null; }
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const payload = { contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, };
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API failed: ${response.status}`);
            const result = await response.json();
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) return result.candidates[0].content.parts[0].text;
            throw new Error('Unexpected API response.');
        } catch (err) { console.error('Gemini Error:', err); setError(`AI Error: ${err.message}`); return null; }
    };
    
    const generateCfoAdvice = async () => {
        setLoadingCfo(true); setCfoAdvice('');
        const profitMargin = totalRevenue > 0 ? Math.round((estimatedProfit / totalRevenue) * 100) : 0;
        const systemPrompt = `You are an expert Restaurant CFO and Business Consultant. Analyze the restaurant's financial data and provide 3 strategic recommendations: 1) Profit Optimization (based on margin), 2) Expansion Readiness (can they afford a new branch?), 3) A trending menu item suggestion based on their cuisine. Be professional yet encouraging.`;
        const userQuery = `Restaurant: ${restaurant.name} (${restaurant.cuisineType}). Total Revenue: ₹${totalRevenue.toLocaleString()}. Total Cost of Goods Sold: ₹${totalCost.toLocaleString()}. Total Gross Profit: ₹${estimatedProfit.toLocaleString()} (Margin: ${profitMargin}%). Provide strategic business advice.`;
        const result = await callGeminiAPI(systemPrompt, userQuery);
        if (result) setCfoAdvice(result);
        setLoadingCfo(false);
    };

    const generateSalesAnalysis = async () => {
        setLoadingAnalysis(true); setSalesAnalysis(''); setError('');
        try {
            const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);
            const salesQuery = query(collection(db, 'daily_sales'), where('userId', '==', userId));
            const querySnapshot = await getDocs(salesQuery);
            const salesSummary = {};
            (restaurant.dishes || []).forEach(d => salesSummary[d.id] = { name: d.name, sold: 0, wasted: 0 });
            let salesFound = false;
            querySnapshot.forEach(doc => { 
                const data = doc.data(); 
                if(data.date && data.date.toMillis() >= thirtyDaysAgoTimestamp.toMillis()) {
                    if (salesSummary[data.dishId]) { salesSummary[data.dishId].sold += (data.quantitySold || 0); salesSummary[data.dishId].wasted += (data.quantityWasted || 0); salesFound = true; }
                }
            });
            let dataSummary = "Last 30 Days Sales Data:\n";
            Object.values(salesSummary).forEach(item => { const prepared = item.sold + item.wasted; const wastagePerc = prepared > 0 ? Math.round((item.wasted / prepared) * 100) : 0; dataSummary += `- ${item.name}: Sold ${item.sold}, Wasted ${item.wasted} (${wastagePerc}% wastage)\n`; });
            if (!salesFound) dataSummary = "No sales data found for the last 30 days.";
            const systemPrompt = `You are a helpful AI assistant for restaurant owners...`;
            const userQuery = `Analyze...:\n\n${dataSummary}`;
            const analysisResult = await callGeminiAPI(systemPrompt, userQuery);
            if (analysisResult) setSalesAnalysis(analysisResult);
        } catch (err) { console.error("Error generating sales analysis:", err); setError("Failed to fetch/analyze sales data."); }
        finally { setLoadingAnalysis(false); }
    };

    const addTestFeedback = async () => {
        const testFeedbacks = [ { rating: 5, comment: "Biryani was amazing!" }, { rating: 3, comment: "Service was slow." } ];
        const randomFeedback = testFeedbacks[Math.floor(Math.random() * testFeedbacks.length)];
        try { await addDoc(collection(db, 'feedback'), { userId: userId, rating: randomFeedback.rating, comment: randomFeedback.comment, createdAt: Timestamp.now(), source: 'Test Data' }); alert("Test feedback added!"); }
        catch (error) { console.error("Error adding test feedback:", error); alert("Failed to add feedback."); }
    };
    
    const generateFeedbackSummary = async () => {
        setLoadingFeedback(true); setFeedbackSummary(''); setError('');
        try {
            const feedbackQuery = query(collection(db, 'feedback'), where('userId', '==', userId), limit(30));
            const querySnapshot = await getDocs(feedbackQuery);
            if (querySnapshot.empty) { setFeedbackSummary("No feedback found."); setLoadingFeedback(false); return; }
            let feedbackList = [];
            querySnapshot.forEach(doc => feedbackList.push(doc.data()));
            feedbackList.sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
            let feedbackText = "Recent Feedback:\n";
            feedbackList.forEach(data => { feedbackText += `- ${data.rating}/5: ${data.comment}\n`; });
            const systemPrompt = `Summarize customer feedback...`;
            const userQuery = `Summarize:\n\n${feedbackText}`;
            const summaryResult = await callGeminiAPI(systemPrompt, userQuery);
            if (summaryResult) setFeedbackSummary(summaryResult);
        } catch (err) { console.error("Error generating feedback summary:", err); setError("Failed to fetch/analyze feedback."); }
        finally { setLoadingFeedback(false); }
    };
    
    const sendInsightsToWhatsApp = (reportContent, reportType) => {
        if (!restaurant.phone) { alert("Add phone in Settings."); return; }
        const message = `*${reportType} Report*\n\n${reportContent}`;
        const encodedText = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${restaurant.phone}?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleGenerateOffer = async (customer) => {
        setLoadingOffer(true);
        setOfferModal({ isOpen: true, customer, message: 'Generating...' });
        const systemPrompt = `You are a friendly restaurant marketing assistant...`;
        const userQuery = `Offer for ${customer.name}, ${customer.loyaltyPoints} points.`;
        const result = await callGeminiAPI(systemPrompt, userQuery);
        if (result) { setOfferModal({ isOpen: true, customer, message: result }); }
        else { setOfferModal({ isOpen: true, customer, message: `Failed to generate offer.` }); }
        setLoadingOffer(false);
    };
    
    const sendOfferToCustomer = (customer, message) => {
        if (!customer.phone || !message) { alert("Customer phone or message is missing."); return; }
        const encodedText = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
        setOfferModal({ isOpen: false, customer: null, message: '' });
    };

     return (
        <div>
            {error && <p className="text-red-600 text-sm mb-3 bg-red-100 p-2 rounded">{error}</p>}
            
            <div className="bg-white p-4 rounded-lg shadow mb-4 border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-3 text-gray-800">💰 Financial Health (AI CFO)</h3>
                {loadingFinancials ? <p className="text-sm text-gray-500">Calculating financials...</p> : (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Total Revenue</p>
                            <p className="text-xl font-bold text-green-700">₹{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Gross Profit</p>
                            <p className="text-xl font-bold text-blue-700">₹{estimatedProfit.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">(Est. {totalRevenue > 0 ? Math.round((estimatedProfit/totalRevenue)*100) : 0}% Margin)</p>
                        </div>
                    </div>
                )}
                <button onClick={generateCfoAdvice} disabled={loadingCfo} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center justify-center disabled:opacity-50">
                    {loadingCfo ? <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" /> : <SparklesIcon className="h-5 w-5 mr-2" />} {loadingCfo ? 'Consulting AI...' : 'Ask AI CFO for Advice'}
                </button>
                {cfoAdvice && ( <div className="mt-3 p-3 bg-gray-50 rounded border"> <pre className="whitespace-pre-wrap text-sm text-gray-700">{cfoAdvice}</pre> </div> )}
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Sales Analysis (30 Days)</h3>
                <button onClick={generateSalesAnalysis} disabled={loadingAnalysis} className="w-full bg-primary text-on-primary font-bold py-2 px-4 rounded-lg hover:bg-primary-hover transition duration-300 flex items-center justify-center disabled:opacity-50 mb-3">
                    {loadingAnalysis ? <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" /> : <BarChartIcon className="h-5 w-5 mr-2" />} {loadingAnalysis ? 'Analyzing...' : 'Generate Report'}
                </button>
                {salesAnalysis && ( <div className="mt-3 p-3 bg-gray-50 rounded border"> <pre className="whitespace-pre-wrap text-sm text-gray-700">{salesAnalysis}</pre> <button onClick={() => sendInsightsToWhatsApp(salesAnalysis, "Sales Analysis")} className="w-full mt-3 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center text-sm"> <SendIcon className="h-5 w-5 mr-2" /> Send to Owner </button> </div> )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-4">
                 <h3 className="font-bold text-lg mb-2">Customer Feedback</h3>
                 <div className="flex space-x-2 mb-3">
                     <button onClick={generateFeedbackSummary} disabled={loadingFeedback} className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center disabled:opacity-50"> {loadingFeedback ? <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" /> : <MessageSquareIcon className="h-5 w-5 mr-2" />} Summarize </button>
                     <button onClick={addTestFeedback} className="flex-1 bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300 flex items-center justify-center"> <PlusIcon className="h-5 w-5 mr-2"/> Add Test </button>
                 </div>
                 {feedbackSummary && ( <div className="mt-3 p-3 bg-gray-50 rounded border"> <pre className="whitespace-pre-wrap text-sm text-gray-700">{feedbackSummary}</pre> </div> )}
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Customer Loyalty</h3>
                {loadingCustomers ? <p>Loading...</p> : (
                    customers.length === 0 ? ( <p className="text-center text-gray-500 mt-4">No customers yet.</p> ) : (
                        <div className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                            {customers.map(cust => (
                                <div key={cust.id} className="py-3 flex justify-between items-center">
                                    <div> <p className="font-semibold">{cust.name}</p> <p className="text-sm text-gray-500">{cust.phone}</p> </div>
                                    <div> <p className="font-semibold text-primary text-right">{cust.loyaltyPoints || 0} pts</p> <button onClick={() => handleGenerateOffer(cust)} className="mt-1 bg-blue-100 text-blue-700 font-bold py-1 px-2 rounded text-xs flex items-center"> <GiftIcon className="h-3 w-3 mr-1" /> Offer </button> </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
            
            {offerModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
                        <div className="p-4 border-b"> <h2 className="text-xl font-bold">Send Offer to {offerModal.customer?.name}</h2> </div>
                        <div className="p-4 space-y-4 overflow-y-auto"> {loadingOffer ? <SpinnerIcon className="h-8 w-8 animate-spin text-primary mx-auto" /> : <textarea value={offerModal.message} onChange={(e) => setOfferModal(prev => ({ ...prev, message: e.target.value }))} className="w-full p-2 border rounded-md h-32 bg-gray-50" /> } </div>
                        <div className="p-4 border-t flex justify-between space-x-3"> <button onClick={() => setOfferModal({ isOpen: false, customer: null, message: '' })} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button> <button onClick={() => sendOfferToCustomer(offerModal.customer, offerModal.message)} className="px-4 py-2 bg-green-500 text-white rounded-md flex items-center justify-center"> <SendIcon className="h-5 w-5 mr-2" /> WhatsApp </button> </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const SettingsScreen = ({ user, restaurant, updateRestaurant }) => {
    if (!user) return <LoadingScreen message="Waiting for user data..." />;
    const [dishes, setDishes] = useState(restaurant.dishes || []);
    const [phone, setPhone] = useState(restaurant.phone || '');
    const [cuisineType, setCuisineType] = useState(restaurant.cuisineType || '');
    const [targetAudience, setTargetAudience] = useState(restaurant.targetAudience || '');
    const [logoUrl, setLogoUrl] = useState(restaurant.logoUrl || '');
    const [themeColor, setThemeColor] = useState(restaurant.themeColor || '#4f46e5');
    const [aggregatorCommission, setAggregatorCommission] = useState(restaurant.aggregatorCommission || 25);
    const [newDishName, setNewDishName] = useState('');
    const [newDishCost, setNewDishCost] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDishes(restaurant.dishes || []); setPhone(restaurant.phone || '');
        setCuisineType(restaurant.cuisineType || ''); setTargetAudience(restaurant.targetAudience || '');
        setLogoUrl(restaurant.logoUrl || ''); setThemeColor(restaurant.themeColor || '#4f46e5');
        setAggregatorCommission(restaurant.aggregatorCommission || 25);
     }, [restaurant]);

    const handleAddDish = () => {
        if (newDishName.trim() === '') return;
        const newDish = { id: `dish${Date.now()}`, name: newDishName.trim(), cost: parseFloat(newDishCost) };
        setDishes([...dishes, newDish]); setNewDishName(''); setNewDishCost('');
     };
    const handleRemoveDish = (idToRemove) => { setDishes(dishes.filter(dish => dish.id !== idToRemove)); };
    const handleDishCostChange = (id, cost) => { setDishes(dishes.map(dish => dish.id === id ? { ...dish, cost: parseFloat(cost) || 0 } : dish )); };
    
    const handleSaveChanges = async () => {
        setIsSaving(true); const restaurantRef = doc(db, 'restaurants', user.uid);
        try { const updatedData = { dishes, phone, cuisineType, targetAudience, logoUrl, themeColor, aggregatorCommission: Number(aggregatorCommission) };
              await updateDoc(restaurantRef, updatedData); updateRestaurant(updatedData);
              alert("Changes saved!");
        } catch(error) { console.error("Save Error: ", error); alert("Save failed."); }
        finally { setIsSaving(false); }
    };
    
    const shareQrViaWhatsApp = () => {
         const menuUrl = `${window.location.origin}/menu/${user.uid}`;
         const message = `Check out our menu: ${menuUrl}`;
         const encodedText = encodeURIComponent(message);
         const whatsappUrl = `https://wa.me/?text=${encodedText}`;
         window.open(whatsappUrl, '_blank');
     };
    const feedbackUrl = `${window.location.origin}/feedback/${user.uid}`;

    return (
        <div>
            <div className="bg-white p-4 rounded-lg shadow mb-4"> <p className="font-semibold">{user.displayName}</p> <p className="text-sm text-gray-500">{user.email}</p> </div>
            {/* Branding Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                 <h3 className="font-bold text-lg mb-1">Branding</h3>
                 <div> <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label> <input type="url" id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full p-2 border rounded-md"/> {logoUrl && <img src={logoUrl} alt="Preview" className="mt-2 h-10 w-auto rounded" onError={(e) => e.target.style.display='none'}/>} </div>
                 <div> <label htmlFor="themeColor" className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label> <div className="flex items-center space-x-2"> <input type="color" id="themeColor" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="p-1 h-10 w-10 block bg-white border rounded-lg cursor-pointer"/> <input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} placeholder="#4f46e5" className="w-full p-2 border rounded-md"/> </div> </div>
            </div>
            {/* Business Settings Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                 <h3 className="font-bold text-lg mb-1">Business Details (for AI)</h3>
                 <div> <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label> <input type="text" id="cuisineType" value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} placeholder="e.g., South Indian" className="w-full p-2 border rounded-md"/> </div>
                 <div> <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">Customers</label> <input type="text" id="targetAudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., Families" className="w-full p-2 border rounded-md"/> </div>
                 <div> <label htmlFor="aggregatorCommission" className="block text-sm font-medium text-gray-700 mb-1">Aggregator Commission (%)</label> <input type="number" id="aggregatorCommission" value={aggregatorCommission} onChange={(e) => setAggregatorCommission(e.target.value)} placeholder="25" className="w-full p-2 border rounded-md"/> <p className="text-xs text-gray-500">Avg. % you pay Zomato/Swiggy. Used to calculate savings.</p> </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow mb-4"> <h3 className="font-bold text-lg mb-2">WhatsApp</h3> <p className="text-sm text-gray-600 mb-2">Your number (with country code) for reports.</p> <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 919876543210" className="w-full p-2 border rounded-md"/> </div>
            {/* Dishes Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-4"> 
                <h3 className="font-bold text-lg mb-2">Manage Dishes & Costs</h3>
                <p className="text-sm text-gray-600 mb-3">Add items and their *raw material cost* to track savings & profit.</p>
                <div className="space-y-2 mb-4"> 
                    {(dishes || []).map(dish => ( 
                        <div key={dish.id} className="p-3 bg-gray-50 rounded-md border">
                            <div className="flex items-center justify-between"> <span className="font-semibold text-gray-800">{dish.name}</span> <button onClick={() => handleRemoveDish(dish.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button> </div>
                            <label className="text-xs text-gray-500">Raw Cost (₹)</label>
                            <input type="number" value={dish.cost || ''} onChange={(e) => handleDishCostChange(dish.id, e.target.value)} placeholder="e.g., 100" className="w-full mt-1 p-2 border rounded-md text-sm"/>
                        </div> 
                    ))} 
                </div> 
                <div className="flex space-x-2 border-t pt-4"> 
                    <input type="text" value={newDishName} onChange={(e) => setNewDishName(e.target.value)} placeholder="New dish name" className="flex-grow p-2 border rounded-md"/>
                    <input type="number" value={newDishCost} onChange={(e) => setNewDishCost(e.target.value)} placeholder="Cost (₹)" className="w-24 p-2 border rounded-md"/>
                    <button onClick={handleAddDish} className="px-4 py-2 bg-blue-500 text-white rounded-md font-semibold">+</button>
                </div> 
            </div>
            <button onClick={handleSaveChanges} disabled={isSaving} className="w-full mb-4 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300"> {isSaving ? 'Saving...' : 'Save All Changes'} </button>
            {/* QR Codes */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 text-center"> <h3 className="font-bold text-lg mb-2">Ordering QR</h3> <div className="flex justify-center my-2"><div className="p-2 border rounded-md"> <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/menu/${user.uid}`} alt="QR Code" /> </div></div> <p className="text-xs text-gray-500 mb-3">Scan to order!</p> <button onClick={shareQrViaWhatsApp} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center text-sm"> <Share2Icon className="h-5 w-5 mr-2" /> Share Link </button> </div>
            <div className="bg-white p-4 rounded-lg shadow mb-4 text-center"> <h3 className="font-bold text-lg mb-2">Feedback QR</h3> <div className="flex justify-center my-2"><div className="p-2 border rounded-md"> <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${feedbackUrl}`} alt="Feedback QR" /> </div></div> <p className="text-xs text-gray-500 mb-3">Place on tables/receipts.</p> </div>
            {/* Sign Out */}
            <button onClick={() => signOut(auth)} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 flex items-center justify-center"> <LogOutIcon className="h-6 w-6 mr-2" /> Sign Out </button>
        </div>
    );
};


const ProFeatureLock = ({ title, description }) => (
     <div>
        <div className="bg-white p-6 rounded-lg shadow text-center mt-4">
            <LockIcon className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">This is a Pro Feature</h2>
            <p className="text-gray-600 mb-6">{description}</p>
            <button className="w-full bg-primary text-on-primary font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition duration-300">
                Upgrade to Pro
            </button>
        </div>
    </div>
);


const BottomNavBar = ({ activeScreen, setActiveScreen, isPro, themeColor }) => {
    const finalNavItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
        { id: 'marketing', label: 'Marketing', icon: SparklesIcon },
        { id: 'orders', label: 'Orders', icon: ShoppingCartIcon },
        { id: 'inventory', label: 'Operations', icon: ClipboardListIcon },
        { id: 'insights', label: 'AI Insights', icon: BrainCircuitIcon },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];

    return (
         <div className="bg-white shadow-t sticky bottom-0 border-t z-10 overflow-x-auto">
            <div className="flex justify-between min-w-full px-2">
                {finalNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveScreen(item.id)}
                        className={`flex flex-col items-center justify-center min-w-[60px] pt-3 pb-2 transition duration-300 ${
                            activeScreen === item.id ? 'text-primary' : 'text-gray-500 hover:text-primary'
                        }`}
                        disabled={item.pro && !isPro}
                    >
                         <div className="relative"> {item.pro && !isPro && <LockIcon className="absolute -top-1 -right-1 h-3 w-3 text-gray-400" />} <item.icon className={`h-6 w-6 mb-1 ${item.pro && !isPro ? 'text-gray-300' : ''}`} /> </div>
                         <span className={`text-[10px] ${item.pro && !isPro ? 'text-gray-300' : ''}`}>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
     );
};


// --- Icon Components ---
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
const GiftIcon = () => <Icon><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></Icon>;
const ClipboardListIcon = () => <Icon><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></Icon>;