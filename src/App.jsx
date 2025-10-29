import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    increment // Import increment for points
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
    const d = date.toDate();
    return d.toISOString().split('T')[0];
};

// --- Theme Application ---
const applyTheme = (color) => {
    // Basic validation for hex color
    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
    const validColor = hexColorRegex.test(color) ? color : '#4f46e5'; // Default indigo if invalid

    document.documentElement.style.setProperty('--primary-color', validColor);
    // You might want to derive hover/darker shades programmatically or define them here
    // For simplicity, we'll just use the primary color for hover too
    document.documentElement.style.setProperty('--primary-hover-color', validColor);
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState(null);
    const [activeScreen, setActiveScreen] = useState('dashboard');

    const fetchRestaurantData = useCallback(async (currentUser) => {
        setLoading(true);
        if (!currentUser) {
            setUser(null);
            setRestaurant(null);
            setActiveScreen('dashboard');
            applyTheme('#4f46e5'); // Reset theme on logout
            setLoading(false);
            return;
        }
        try {
            const restaurantRef = doc(db, 'restaurants', currentUser.uid);
            const docSnap = await getDoc(restaurantRef);
            let restData;
            if (docSnap.exists()) {
                 const data = docSnap.data();
                 restData = { // Ensure all fields have defaults
                    ...data,
                    cuisineType: data.cuisineType || '',
                    targetAudience: data.targetAudience || '',
                    dishes: data.dishes || [],
                    phone: data.phone || '',
                    logoUrl: data.logoUrl || '', // Add logoUrl
                    themeColor: data.themeColor || '#4f46e5', // Add themeColor with default
                 };
                 setRestaurant(restData);
            } else {
                restData = {
                    owner: currentUser.displayName,
                    name: `${currentUser.displayName}'s Place`,
                    subscription: 'free',
                    dishes: [{ id: 'dish1', name: 'Chicken Biryani' }, { id: 'dish2', name: 'Paneer Butter Masala' }, { id: 'dish3', name: 'Masala Dosa' }],
                    phone: '', cuisineType: '', targetAudience: '',
                    logoUrl: '', themeColor: '#4f46e5', // Defaults for new restaurant
                    createdAt: Timestamp.now(),
                };
                await setDoc(restaurantRef, restData);
                setRestaurant(restData);
            }
            applyTheme(restData.themeColor); // Apply fetched or default theme
            setUser(currentUser);
        } catch (error) { console.error("Error fetching restaurant data:", error); setUser(null); setRestaurant(null); applyTheme('#4f46e5'); } // Reset theme on error
        finally { setLoading(false); }
    }, []);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(null); setRestaurant(null); setLoading(true); fetchRestaurantData(firebaseUser);
        });
        return () => unsubscribe();
    }, [fetchRestaurantData]);

    const updateRestaurant = (newData) => {
        const updatedRestaurant = { ...restaurant, ...newData };
        setRestaurant(updatedRestaurant);
        if (newData.themeColor) {
             applyTheme(newData.themeColor); // Apply theme immediately on update
        }
     };

    // Apply initial theme styles (could also be done in index.css)
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --primary-color: #4f46e5;
                --primary-hover-color: #4338ca; /* Default darker indigo */
            }
            .bg-primary { background-color: var(--primary-color); }
            .text-primary { color: var(--primary-color); }
            .border-primary { border-color: var(--primary-color); }
            .hover\\:bg-primary-hover:hover { background-color: var(--primary-hover-color); }
            .ring-primary:focus { --tw-ring-color: var(--primary-color); } /* Example for focus rings */
        `;
        document.head.appendChild(style);
        // Apply theme from loaded restaurant data (or default)
        applyTheme(restaurant?.themeColor || '#4f46e5');
    }, [restaurant?.themeColor]); // Rerun if themeColor changes

    if (loading) return <LoadingScreen message="Loading SmartChef AI..." />;
    if (!user) return <AuthScreen />;
    if (!restaurant) return <LoadingScreen message="Initializing Restaurant..." />;

    // Pass restaurant logo and theme to screens that might need it
    const ScreenComponent = {
        dashboard: <DashboardScreen restaurant={restaurant} userId={user.uid} />,
        marketing: <MarketingScreen restaurant={restaurant} userId={user.uid}/>,
        orders: <LiveOrdersScreen restaurant={restaurant} userId={user.uid} />,
        insights: <AIInsightsScreen restaurant={restaurant} userId={user.uid} />,
        settings: <SettingsScreen user={user} restaurant={restaurant} updateRestaurant={updateRestaurant} />,
    }[activeScreen];

    return (
        <div className="md:max-w-sm md:mx-auto bg-gray-100 min-h-screen font-sans flex flex-col">
             {/* Pass logo to Header */}
            <Header title={restaurant.name} logoUrl={restaurant.logoUrl} />
            <main className="flex-grow p-4 pb-20">
                {ScreenComponent}
            </main>
            {/* Pass theme color to BottomNavBar */}
            <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} isPro={restaurant.subscription === 'pro'} themeColor={restaurant.themeColor}/>
        </div>
    );
}

// --- Screens & Components ---

const LoadingScreen = ({ message }) => (
     <div className="flex items-center justify-center h-screen bg-gray-100"> <div className="text-xl font-semibold text-gray-700">{message}</div> </div>
);

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
            <h1 className="text-4xl font-bold text-primary mb-2">SmartChef AI</h1> {/* Use theme color */}
            <p className="text-gray-600 mb-8">Your AI-Powered Restaurant Assistant</p>
            <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center bg-primary text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-primary-hover transition duration-300" // Use theme colors
            >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 48 48"> {/* Google SVG */} </svg>
                Sign in with Google
            </button>
        </div>
     );
};

// Pass restaurant to Header
const Header = ({ title, logoUrl }) => (
    <div className="flex items-center justify-between mb-4">
        {logoUrl ? (
            <img src={logoUrl} alt={`${title} logo`} className="h-10 w-auto mr-3 rounded" onError={(e) => e.target.style.display='none'}/> // Added basic error handling
        ) : (
            <div className="w-10 h-10 mr-3"></div> // Placeholder if no logo
        )}
        <h1 className="text-2xl font-bold text-gray-900 flex-grow">{title}</h1>
        {/* Potentially add other header elements here */}
    </div>
);


const DashboardScreen = ({ restaurant, userId }) => {
    if (!userId) return <LoadingScreen message="Waiting for user data..." />;

    const [isSalesModalOpen, setSalesModalOpen] = useState(false);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [predictionError, setPredictionError] = useState(''); // State for errors

    const calculatePredictions = useCallback(async () => {
        // ** FIX: Ensure loading state is always updated, clear previous errors **
        console.log("Starting calculatePredictions..."); // Log start
        setLoading(true);
        setPredictionError(''); // Clear previous errors
        setPredictions([]); // Clear previous predictions

        // Ensure we have a valid userId and dishes before querying
        if (!userId || !restaurant.dishes || restaurant.dishes.length === 0) {
            console.log("calculatePredictions: No userId or no dishes found.");
            setLoading(false);
            return;
        }

        try {
            console.log("Fetching sales data...");
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);
            const sevenDaysAgoMillis = sevenDaysAgoTimestamp.toMillis();

            const salesQuery = query(
                collection(db, 'daily_sales'),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(salesQuery);
            console.log(`Fetched ${querySnapshot.size} sales documents.`);
            const salesData = {};
            restaurant.dishes.forEach(d => salesData[d.id] = []);

            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Add extra checks for data validity
                if (data.date && typeof data.date.toMillis === 'function' && data.date.toMillis() >= sevenDaysAgoMillis) {
                    if (salesData[data.dishId] && typeof data.quantitySold === 'number' && typeof data.quantityWasted === 'number') {
                         salesData[data.dishId].push(data);
                    } else {
                         console.warn("Skipping invalid sales data:", data);
                    }
                }
            });
            console.log("Sales data processed:", salesData);

            const newPredictions = restaurant.dishes.map(dish => {
                const dishSales = salesData[dish.id];
                let prediction = 5;
                let confidence = 20;
                let totalSold = 0;
                let totalWasted = 0;

                if (dishSales && dishSales.length > 0) {
                    const sum = dishSales.reduce((acc, curr) => acc + curr.quantitySold, 0);
                    prediction = Math.max(0, Math.round(sum / dishSales.length)); // Ensure prediction isn't negative
                    confidence = Math.min(95, 20 + dishSales.length * 10);
                    totalSold = dishSales.reduce((acc, curr) => acc + curr.quantitySold, 0);
                    totalWasted = dishSales.reduce((acc, curr) => acc + curr.quantityWasted, 0);
                }

                const totalPrepared = totalSold + totalWasted;
                const wastagePercent = totalPrepared > 0 ? Math.round((totalWasted / totalPrepared) * 100) : 0;

                return {
                    id: dish.id,
                    name: dish.name,
                    prediction,
                    confidence,
                    wastage: wastagePercent > 15,
                    wastagePercent
                };
            });

            console.log("Generated predictions:", newPredictions);
            setPredictions(newPredictions);
        } catch (error) {
            console.error("Failed to calculate predictions:", error);
            setPredictionError("Error calculating predictions. Please try again later."); // Set error message
            setPredictions([]); // Clear predictions on error
        } finally {
            console.log("Finished calculatePredictions.");
            setLoading(false); // ** FIX: Ensure loading is always set to false **
        }
    }, [userId, restaurant.dishes]);

    useEffect(() => {
        console.log("DashboardScreen mounted or dependencies changed. Calling calculatePredictions.");
        calculatePredictions();
    }, [calculatePredictions]); // Dependency array is correct, function identity changes when userId/dishes change

    const sendWhatsAppReport = () => { /* ... unchanged ... */ };

    return (
        <div>
            {/* Header rendered globally */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                 <button onClick={() => setSalesModalOpen(true)} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition duration-300 flex items-center justify-center"> {/* ... */} </button>
                 <button onClick={sendWhatsAppReport} disabled={loading || predictions.length === 0 || !!predictionError} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"> {/* ... */} </button>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-3">Tomorrow's Forecast</h2>

            {/* ** FIX: Display Loading, Error, No Predictions, or Predictions ** */}
            {loading ? (
                <p>Calculating predictions...</p>
            ) : predictionError ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{predictionError}</span>
                </div>
            ) : predictions.length > 0 ? (
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
                        {!restaurant.dishes || restaurant.dishes.length === 0
                            ? "Please add some dishes in the Settings tab to get started."
                            : "Enter yesterday's sales data to generate the first forecast."}
                    </p>
                </div>
            )}

            {isSalesModalOpen && (
                <SalesEntryModal dishes={restaurant.dishes || []} userId={userId} onClose={() => setSalesModalOpen(false)} onSave={calculatePredictions}/>
            )}
        </div>
    );
};

// ... (Rest of the components: SalesEntryModal, LiveOrdersScreen, MarketingScreen, AIInsightsScreen, SettingsScreen, Header, ProFeatureLock, BottomNavBar, Icons remain unchanged from previous correct version) ...
// Ensure all necessary components and icons are included below
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
                                <div className="flex-1">
                                    <label className="text-sm text-gray-500">Quantity Sold</label>
                                    <input type="number" min="0" value={salesData[dish.id]?.sold ?? ''} onChange={(e) => handleInputChange(dish.id, 'sold', e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="e.g., 25" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-gray-500">Quantity Wasted</label>
                                    <input type="number" min="0" value={salesData[dish.id]?.wasted ?? ''} onChange={(e) => handleInputChange(dish.id, 'wasted', e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="e.g., 2" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!dishes || dishes.length === 0) && (<p className="text-gray-500 text-center">Please add some dishes in the Settings tab first.</p>)}
                </div>
                <div className="p-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving || !dishes || dishes.length === 0} className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"> {isSaving ? 'Saving...' : 'Save'} </button>
                </div>
            </div>
        </div>
    );
};

const LiveOrdersScreen = ({ restaurant, userId }) => {
    if (!userId) return <LoadingScreen message="Waiting for user data..." />;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { /* ... Firestore listener ... */ }, [userId]);

    const addTestOrder = async () => { /* ... unchanged ... */ };
    const updateOrderStatus = async (orderId, newStatus) => { /* ... unchanged ... */ };

    return (
        <div>
            {/* Header rendered globally */}
            <button onClick={addTestOrder} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center mb-4"> Add Test Order (Adds Points) </button>
             {loading ? <p>Loading live orders...</p> : (
                orders.length === 0 ? ( <p className="text-center text-gray-500 mt-8">No live orders yet.</p> )
                : ( <div className="space-y-3"> {orders.map(order => ( <div key={order.id} className="bg-white p-4 rounded-lg shadow"> {/* ... order details UI ... */} </div> ))} </div> )
            )}
        </div>
    );
};

const MarketingScreen = ({ restaurant, userId }) => { /* ... unchanged ... */
    const [topic, setTopic] = useState(''); const [platform, setPlatform] = useState('Instagram'); const [generatedPost, setGeneratedPost] = useState(''); const [isLoading, setIsLoading] = useState(false); const [error, setError] = useState(''); const generateSocialMediaPost = async () => { /* ... Gemini API call ... */ }; const copyToClipboard = () => { /* ... */ };
    return (
        <div>
             {/* Header rendered globally */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                 {/* ... Topic and Platform inputs ... */}
                 <button onClick={generateSocialMediaPost} disabled={isLoading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition duration-300 flex items-center justify-center disabled:opacity-50"> {/* Use theme color */}
                     {isLoading ? <SpinnerIcon/> : <SparklesIcon/>} {isLoading ? 'Generating...' : 'Generate Post with AI'}
                 </button>
                 {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            </div>
            {generatedPost && (
                <div className="bg-white p-4 rounded-lg shadow"> {/* ... Generated post display ... */} </div>
            )}
        </div>
    );
};

// --- New AI Insights Screen ---
const AIInsightsScreen = ({ restaurant, userId }) => {
    const [salesAnalysis, setSalesAnalysis] = useState('');
    const [feedbackSummary, setFeedbackSummary] = useState('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [error, setError] = useState('');

    const callGeminiAPI = async (systemPrompt, userQuery) => { /* ... unchanged ... */ };
    const generateSalesAnalysis = async () => { /* ... unchanged ... */ };
    const addTestFeedback = async () => { /* ... unchanged ... */ };
    const generateFeedbackSummary = async () => { /* ... unchanged ... */ };
    const sendInsightsToWhatsApp = (reportContent, reportType) => { /* ... unchanged ... */ };

    return (
        <div>
            {/* Header rendered globally */}
            {error && <p className="text-red-600 text-sm mb-3 bg-red-100 p-2 rounded">{error}</p>}
            {/* Sales Analysis Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">AI Sales Analysis (Last 30 Days)</h3>
                <button onClick={generateSalesAnalysis} disabled={loadingAnalysis} className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover transition duration-300 flex items-center justify-center disabled:opacity-50 mb-3">
                    {loadingAnalysis ? <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" /> : <BarChartIcon className="h-5 w-5 mr-2" />} {loadingAnalysis ? 'Analyzing Sales...' : 'Generate Sales Report & Recommendations'}
                </button>
                {salesAnalysis && ( <div className="mt-3 p-3 bg-gray-50 rounded border"> <pre className="whitespace-pre-wrap text-sm text-gray-700">{salesAnalysis}</pre> <button onClick={() => sendInsightsToWhatsApp(salesAnalysis, "Sales Analysis")} className="w-full mt-3 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center text-sm"> <SendIcon className="h-5 w-5 mr-2" /> Send to Owner via WhatsApp </button> </div> )}
            </div>
            {/* Customer Feedback Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                 <h3 className="font-bold text-lg mb-2">AI Customer Feedback Summary</h3>
                 <div className="flex space-x-2 mb-3">
                     <button onClick={generateFeedbackSummary} disabled={loadingFeedback} className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center disabled:opacity-50">
                         {loadingFeedback ? <SpinnerIcon className="h-5 w-5 mr-2 animate-spin" /> : <MessageSquareIcon className="h-5 w-5 mr-2" />} {loadingFeedback ? 'Analyzing...' : 'Summarize Feedback'}
                     </button>
                     <button onClick={addTestFeedback} className="flex-1 bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300 flex items-center justify-center"> <PlusIcon className="h-5 w-5 mr-2"/> Add Test Feedback </button>
                 </div>
                 {feedbackSummary && ( <div className="mt-3 p-3 bg-gray-50 rounded border"> <pre className="whitespace-pre-wrap text-sm text-gray-700">{feedbackSummary}</pre> <button onClick={() => sendInsightsToWhatsApp(feedbackSummary, "Feedback Summary")} className="w-full mt-3 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center text-sm"> <SendIcon className="h-5 w-5 mr-2" /> Send to Owner via WhatsApp </button> </div> )}
            </div>
             {/* Vendor Management Placeholder */}
            <div className="bg-white p-4 rounded-lg shadow text-center opacity-50">
                 <h3 className="font-bold text-lg mb-2">AI Vendor Management (Coming Soon)</h3>
                 <p className="text-sm text-gray-600"> Future Pro Feature: Track vendor quality and costs, get AI suggestions for better supplier management and cost optimization. </p>
            </div>
        </div>
    );
};

// ** Updated Settings Screen with Branding **
const SettingsScreen = ({ user, restaurant, updateRestaurant }) => {
    if (!user) return <LoadingScreen message="Waiting for user data..." />;

    const [dishes, setDishes] = useState(restaurant.dishes || []);
    const [phone, setPhone] = useState(restaurant.phone || '');
    const [cuisineType, setCuisineType] = useState(restaurant.cuisineType || '');
    const [targetAudience, setTargetAudience] = useState(restaurant.targetAudience || '');
    const [logoUrl, setLogoUrl] = useState(restaurant.logoUrl || '');
    const [themeColor, setThemeColor] = useState(restaurant.themeColor || '#4f46e5');
    const [newDishName, setNewDishName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { /* ... unchanged ... */ }, [restaurant]);
    const handleAddDish = () => { /* ... unchanged ... */ };
    const handleRemoveDish = (idToRemove) => { /* ... unchanged ... */ };
    const handleSaveChanges = async () => { /* ... unchanged ... */ };
    const shareQrViaWhatsApp = () => { /* ... unchanged ... */ };
    const feedbackUrl = `${window.location.origin}/feedback/${user.uid}`;

    return (
        <div>
            {/* Header rendered globally */}
            <div className="bg-white p-4 rounded-lg shadow mb-4"> <p className="font-semibold">{user.displayName}</p> <p className="text-sm text-gray-500">{user.email}</p> </div>
            {/* Branding Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                 <h3 className="font-bold text-lg mb-1">Branding & Appearance</h3>
                 <div> <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label> <input type="url" id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://your-logo-image.com/logo.png" className="w-full p-2 border rounded-md"/> {logoUrl && <img src={logoUrl} alt="Logo Preview" className="mt-2 h-10 w-auto rounded" onError={(e) => e.target.style.display='none'}/>} </div>
                 <div> <label htmlFor="themeColor" className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label> <div className="flex items-center space-x-2"> <input type="color" id="themeColor" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="p-1 h-10 w-10 block bg-white border border-gray-300 cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none"/> <input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} placeholder="#4f46e5" className="w-full p-2 border rounded-md"/> </div> </div>
            </div>
            {/* Restaurant Details for AI */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                 <h3 className="font-bold text-lg mb-1">Restaurant Details (for AI)</h3>
                 <div> <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 mb-1">Type of Cuisine</label> <input type="text" id="cuisineType" value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} placeholder="e.g., South Indian" className="w-full p-2 border rounded-md"/> </div>
                 <div> <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">Primary Customers</label> <input type="text" id="targetAudience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., Families" className="w-full p-2 border rounded-md"/> </div>
            </div>
            {/* WhatsApp Integration */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">WhatsApp Integration</h3> <p className="text-sm text-gray-600 mb-2">Enter your WhatsApp number with country code (e.g., 91xxxxxxxxxx for India). Used for sending reports.</p> <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 919876543210" className="w-full p-2 border rounded-md"/>
            </div>
            {/* Manage Dishes */}
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Manage Your Dishes</h3>
                 <div className="space-y-2 mb-4"> {(dishes || []).map(dish => ( <div key={dish.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md"> <span className="text-gray-700">{dish.name}</span> <button onClick={() => handleRemoveDish(dish.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button> </div> ))} </div>
                 <div className="flex space-x-2"> <input type="text" value={newDishName} onChange={(e) => setNewDishName(e.target.value)} placeholder="Add new dish name" className="flex-grow p-2 border rounded-md"/> <button onClick={handleAddDish} className="px-4 py-2 bg-blue-500 text-white rounded-md font-semibold">+</button> </div>
            </div>
            <button onClick={handleSaveChanges} disabled={isSaving} className="w-full mb-4 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300"> {isSaving ? 'Saving...' : 'Save All Changes'} </button>
            {/* QR Codes */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 text-center"> <h3 className="font-bold text-lg mb-2">Direct Ordering QR Code</h3> <div className="flex justify-center my-2"><div className="p-2 border rounded-md"> <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/menu/${user.uid}`} alt="Restaurant QR Code" /> </div></div> <p className="text-xs text-gray-500 mb-3">Customers scan this to order directly!</p> <button onClick={shareQrViaWhatsApp} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center text-sm"> <Share2Icon className="h-5 w-5 mr-2" /> Share QR Link via WhatsApp </button> </div>
            <div className="bg-white p-4 rounded-lg shadow mb-4 text-center"> <h3 className="font-bold text-lg mb-2">Customer Feedback QR Code</h3> <div className="flex justify-center my-2"><div className="p-2 border rounded-md"> <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${feedbackUrl}`} alt="Customer Feedback QR Code" /> </div></div> <p className="text-xs text-gray-500 mb-3">Place this QR on tables/receipts for customer feedback.</p> </div>
            {/* Sign Out Button */}
            <button onClick={() => signOut(auth)} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 flex items-center justify-center"> <LogOutIcon className="h-6 w-6 mr-2" /> Sign Out </button>
        </div>
    );
};

// --- Other Components ---
const ProFeatureLock = ({ title, description }) => (
     <div>
        <Header title={title} />
        <div className="bg-white p-6 rounded-lg shadow text-center">
            <LockIcon className="h-12 w-12 text-primary mx-auto mb-4" /> {/* Use theme color */}
            <h2 className="text-xl font-bold text-gray-800 mb-2">This is a Pro Feature</h2>
            <p className="text-gray-600 mb-6">{description}</p>
            <button className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition duration-300"> {/* Use theme colors */}
                Upgrade to Pro
            </button>
        </div>
    </div>
);

// ** Updated BottomNavBar **
const BottomNavBar = ({ activeScreen, setActiveScreen, isPro, themeColor }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
        { id: 'marketing', label: 'Marketing AI', icon: SparklesIcon },
        { id: 'orders', label: 'Orders', icon: ShoppingCartIcon },
        { id: 'insights', label: 'AI Insights', icon: BrainCircuitIcon },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];
    return (
         <div className="bg-white shadow-t sticky bottom-0 border-t z-10">
            <div className="flex justify-around">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveScreen(item.id)}
                        // Apply theme color dynamically to active icon
                        className={`flex flex-col items-center justify-center w-full pt-3 pb-2 transition duration-300 ${
                            activeScreen === item.id ? 'text-primary' : 'text-gray-500 hover:text-primary'
                        }`}
                        disabled={item.pro && !isPro}
                    >
                         <div className="relative"> {item.pro && !isPro && <LockIcon className="absolute -top-1 -right-1 h-3 w-3 text-gray-400" />} <item.icon className={`h-6 w-6 mb-1 ${item.pro && !isPro ? 'text-gray-300' : ''}`} /> </div>
                         <span className={`text-xs ${item.pro && !isPro ? 'text-gray-300' : ''}`}>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
     );
};


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

