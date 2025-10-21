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
    Timestamp 
} from 'firebase/firestore';

// --- Firebase Configuration ---
// IMPORTANT: Make sure this is replaced with your own Firebase project configuration.
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState(null);
    const [activeScreen, setActiveScreen] = useState('dashboard');

    const fetchRestaurantData = useCallback(async (currentUser) => {
        if (!currentUser) {
            setUser(null);
            setRestaurant(null);
            setLoading(false);
            return;
        }

        const restaurantRef = doc(db, 'restaurants', currentUser.uid);
        const docSnap = await getDoc(restaurantRef);
        if (docSnap.exists()) {
            setRestaurant(docSnap.data());
        } else {
            const newRestaurant = {
                owner: currentUser.displayName,
                name: `${currentUser.displayName}'s Place`,
                subscription: 'free',
                dishes: [
                    { id: 'dish1', name: 'Chicken Biryani' },
                    { id: 'dish2', name: 'Paneer Butter Masala' },
                    { id: 'dish3', name: 'Masala Dosa' },
                ],
                createdAt: Timestamp.now(),
            };
            await setDoc(restaurantRef, newRestaurant);
            setRestaurant(newRestaurant);
        }
        setUser(currentUser);
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, fetchRestaurantData);
        return () => unsubscribe();
    }, [fetchRestaurantData]);
    
    const updateRestaurant = (newData) => {
        setRestaurant(prev => ({...prev, ...newData}));
    };

    if (loading) {
        return <LoadingScreen message="Loading SmartChef AI..." />;
    }

    if (!user) {
        return <AuthScreen />;
    }

    if (!restaurant) {
        return <LoadingScreen message="Loading Restaurant..." />;
    }

    const ScreenComponent = {
        dashboard: <DashboardScreen restaurant={restaurant} userId={user.uid} />,
        orders: <LiveOrdersScreen restaurant={restaurant} />,
        reports: <ReportsScreen restaurant={restaurant} />,
        settings: <SettingsScreen user={user} restaurant={restaurant} updateRestaurant={updateRestaurant} />,
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

const LoadingScreen = ({ message }) => (
    <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">{message}</div>
    </div>
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

const DashboardScreen = ({ restaurant, userId }) => {
    const [isSalesModalOpen, setSalesModalOpen] = useState(false);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);

    const calculatePredictions = useCallback(async () => {
        setLoading(true);
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

            const salesQuery = query(
                collection(db, 'daily_sales'),
                where('userId', '==', userId),
                where('date', '>=', sevenDaysAgoTimestamp)
            );

            const querySnapshot = await getDocs(salesQuery);
            const salesData = {};
            restaurant.dishes.forEach(d => salesData[d.id] = []);

            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (salesData[data.dishId]) {
                    salesData[data.dishId].push(data);
                }
            });

            const newPredictions = restaurant.dishes.map(dish => {
                const dishSales = salesData[dish.id];
                let prediction = 5; // Default prediction
                let confidence = 20;
                let totalSold = 0;
                let totalWasted = 0;

                if (dishSales.length > 0) {
                    const sum = dishSales.reduce((acc, curr) => acc + curr.quantitySold, 0);
                    prediction = Math.round(sum / dishSales.length);
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
            
            setPredictions(newPredictions);
        } catch (error) {
            console.error("Failed to calculate predictions:", error);
            // Optionally set an error state to show in the UI
        } finally {
            setLoading(false);
        }
    }, [userId, restaurant.dishes]);

    useEffect(() => {
        calculatePredictions();
    }, [calculatePredictions]);

    return (
        <div>
            <Header title={restaurant.name} />
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <button 
                    onClick={() => setSalesModalOpen(true)}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center justify-center"
                >
                    <PlusIcon className="h-6 w-6 mr-2" />
                    Enter Yesterday's Sales
                </button>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Tomorrow's Forecast</h2>
            {loading ? <p>Calculating predictions...</p> : (
                predictions.length > 0 ? (
                    <div className="space-y-3">
                        {predictions.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-lg shadow relative">
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                <p className="text-gray-600">Prediction: {item.prediction} plates (Confidence: {item.confidence}%)</p>
                                {item.wastage && (
                                    <p className="text-yellow-600 font-semibold flex items-center mt-1">
                                        <AlertTriangleIcon className="h-5 w-5 mr-1" /> High wastage last week! ({item.wastagePercent}%)
                                    </p>
                                )}
                                {/* Edit Button Placeholder */}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-4 rounded-lg shadow text-center">
                        <p className="text-gray-600">No predictions to show.</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Please add some dishes in the Settings tab to get started.
                        </p>
                    </div>
                )
            )}
            {isSalesModalOpen && (
                <SalesEntryModal 
                    dishes={restaurant.dishes} 
                    userId={userId}
                    onClose={() => setSalesModalOpen(false)}
                    onSave={calculatePredictions}
                />
            )}
        </div>
    );
};

const SalesEntryModal = ({ dishes, userId, onClose, onSave }) => {
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
            const batch = writeBatch(db);

            for (const dish of dishes) {
                const sold = salesData[dish.id].sold || 0;
                const wasted = salesData[dish.id].wasted || 0;
                
                if (sold > 0 || wasted > 0) {
                    const docId = `${formatDate(date)}-${dish.id}`;
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
            onSave(); // Refresh dashboard predictions
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
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Enter Yesterday's Sales</h2>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    {dishes.map(dish => (
                        <div key={dish.id} className="p-3 bg-gray-50 rounded-md border">
                             <p className="font-semibold text-gray-800">{dish.name}</p>
                             <div className="flex items-center space-x-3 mt-2">
                                <div className="flex-1">
                                    <label className="text-sm text-gray-500">Quantity Sold</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={salesData[dish.id].sold}
                                        onChange={(e) => handleInputChange(dish.id, 'sold', e.target.value)}
                                        className="w-full mt-1 p-2 border rounded-md"
                                        placeholder="e.g., 25"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-gray-500">Quantity Wasted</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={salesData[dish.id].wasted}
                                        onChange={(e) => handleInputChange(dish.id, 'wasted', e.target.value)}
                                        className="w-full mt-1 p-2 border rounded-md"
                                        placeholder="e.g., 2"
                                    />
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-md">
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SettingsScreen = ({ user, restaurant, updateRestaurant }) => {
    const [dishes, setDishes] = useState(restaurant.dishes || []);
    const [newDishName, setNewDishName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddDish = () => {
        if (newDishName.trim() === '') return;
        const newDish = {
            id: `dish${Date.now()}`,
            name: newDishName.trim()
        };
        setDishes([...dishes, newDish]);
        setNewDishName('');
    };

    const handleRemoveDish = (idToRemove) => {
        setDishes(dishes.filter(dish => dish.id !== idToRemove));
    };
    
    const handleSaveChanges = async () => {
        setIsSaving(true);
        const restaurantRef = doc(db, 'restaurants', user.uid);
        try {
            await updateDoc(restaurantRef, { dishes });
            updateRestaurant({ dishes }); // Update local state in App
            alert("Changes saved successfully!");
        } catch(error) {
            console.error("Error saving changes: ", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <Header title="Settings" />
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Manage Your Dishes</h3>
                <div className="space-y-2 mb-4">
                    {dishes.map(dish => (
                         <div key={dish.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                            <span className="text-gray-700">{dish.name}</span>
                            <button onClick={() => handleRemoveDish(dish.id)} className="text-red-500 hover:text-red-700">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex space-x-2">
                    <input 
                        type="text"
                        value={newDishName}
                        onChange={(e) => setNewDishName(e.target.value)}
                        placeholder="Add new dish name"
                        className="flex-grow p-2 border rounded-md"
                    />
                    <button onClick={handleAddDish} className="px-4 py-2 bg-blue-500 text-white rounded-md font-semibold">+</button>
                </div>
                 <button 
                    onClick={handleSaveChanges} 
                    disabled={isSaving}
                    className="w-full mt-4 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
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

// --- Other Components (unchanged from before) ---
const LiveOrdersScreen = ({ restaurant }) => {
    const isPro = restaurant.subscription === 'pro';
    if (!isPro) return <ProFeatureLock title="Live Order Hub" description="Upgrade to Pro to manage commission-free direct orders from your own QR code." />;
    return <div><Header title="Live Orders" /><p className="text-center text-gray-500 mt-8">No live orders yet.</p></div>;
};
const ReportsScreen = ({ restaurant }) => {
    const isPro = restaurant.subscription === 'pro';
    if (!isPro) return <ProFeatureLock title="Advanced Reports" description="Upgrade to Pro to download sales data and get advanced menu engineering insights." />;
    return <div><Header title="Reports & Insights" /><p className="text-center text-gray-500 mt-8">No reports available yet.</p></div>;
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
                    <button key={item.id} onClick={() => setActiveScreen(item.id)} className={`flex flex-col items-center justify-center w-full pt-3 pb-2 transition duration-300 ${activeScreen === item.id ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`} disabled={item.pro && !isPro}>
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
const LogOutIcon = () => <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></Icon>;
const LockIcon = () => <Icon><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>;
const TrashIcon = () => <Icon><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></Icon>;
const LayoutDashboardIcon = () => <Icon><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></Icon>;
const ShoppingCartIcon = () => <Icon><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></Icon>;
const BarChartIcon = () => <Icon><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></Icon>;
const SettingsIcon = () => <Icon><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0-2l-.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Icon>;

