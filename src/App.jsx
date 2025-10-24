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
    orderBy
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
    // ... (unchanged)
    const d = date.toDate();
    return d.toISOString().split('T')[0];
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [restaurant, setRestaurant] = useState(null);
    const [activeScreen, setActiveScreen] = useState('dashboard'); // Start on Dashboard

    const fetchRestaurantData = useCallback(async (currentUser) => {
        setLoading(true);
        if (!currentUser) {
            setUser(null);
            setRestaurant(null);
            setActiveScreen('dashboard');
            setLoading(false);
            return;
        }

        try {
            const restaurantRef = doc(db, 'restaurants', currentUser.uid);
            const docSnap = await getDoc(restaurantRef);
            if (docSnap.exists()) {
                // Ensure essential fields exist
                 const data = docSnap.data();
                 setRestaurant({
                    ...data,
                    cuisineType: data.cuisineType || '', // Add default empty string
                    targetAudience: data.targetAudience || '', // Add default empty string
                    dishes: data.dishes || [],
                    phone: data.phone || ''
                 });
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
                    phone: '',
                    cuisineType: '', // Added field
                    targetAudience: '', // Added field
                    createdAt: Timestamp.now(),
                };
                await setDoc(restaurantRef, newRestaurant);
                setRestaurant(newRestaurant);
            }
            setUser(currentUser);
        } catch (error) {
            console.error("Error fetching restaurant data:", error);
            setUser(null);
            setRestaurant(null);
        } finally {
            setLoading(false);
        }
    }, []);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(null);
            setRestaurant(null);
            setLoading(true);
            fetchRestaurantData(firebaseUser);
        });
        return () => unsubscribe();
    }, [fetchRestaurantData]);

    const updateRestaurant = (newData) => {
        setRestaurant(prev => ({ ...prev, ...newData }));
    };

    if (loading) {
        return <LoadingScreen message="Loading SmartChef AI..." />;
    }

    if (!user) {
        return <AuthScreen />;
    }

    if (!restaurant) {
        // Handle case where restaurant data might still be loading or failed
        return <LoadingScreen message="Initializing Restaurant..." />;
    }

    // Map screen IDs to components
    const ScreenComponent = {
        dashboard: <DashboardScreen restaurant={restaurant} userId={user.uid} />,
        marketing: <MarketingScreen restaurant={restaurant} userId={user.uid}/>, // New Marketing Screen
        orders: <LiveOrdersScreen restaurant={restaurant} userId={user.uid} />,
        customers: <CustomersScreen restaurant={restaurant} userId={user.uid} />,
        settings: <SettingsScreen user={user} restaurant={restaurant} updateRestaurant={updateRestaurant} />,
    }[activeScreen];

    return (
        <div className="md:max-w-sm md:mx-auto bg-gray-100 min-h-screen font-sans flex flex-col">
            <main className="flex-grow p-4 pb-20">
                {ScreenComponent}
            </main>
            <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} isPro={restaurant.subscription === 'pro'} />
        </div>
    );
}

// --- Screens & Components ---

const LoadingScreen = ({ message }) => (
    // ... (unchanged)
     <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">{message}</div>
    </div>
);

const AuthScreen = () => {
    // ... (unchanged)
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
    // ... (logic unchanged)
    if (!userId) return <LoadingScreen message="Waiting for user data..." />; 
    
    const [isSalesModalOpen, setSalesModalOpen] = useState(false);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);

    const calculatePredictions = useCallback(async () => {
        if (!userId || !restaurant.dishes || restaurant.dishes.length === 0) {
            setPredictions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);
            const sevenDaysAgoMillis = sevenDaysAgoTimestamp.toMillis();

            const salesQuery = query(
                collection(db, 'daily_sales'),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(salesQuery);
            const salesData = {};
            restaurant.dishes.forEach(d => salesData[d.id] = []);

            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.date.toMillis() >= sevenDaysAgoMillis) {
                    if (salesData[data.dishId]) {
                        salesData[data.dishId].push(data);
                    }
                }
            });

            const newPredictions = restaurant.dishes.map(dish => {
                const dishSales = salesData[dish.id];
                let prediction = 5; 
                let confidence = 20;
                let totalSold = 0;
                let totalWasted = 0;

                if (dishSales && dishSales.length > 0) {
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
            setPredictions([]); 
        } finally {
            setLoading(false);
        }
    }, [userId, restaurant.dishes]); 

    useEffect(() => {
        calculatePredictions(); 
    }, [calculatePredictions]);

    const sendWhatsAppReport = () => {
       // ... (unchanged)
        if (!restaurant.phone) {
            alert("Please add your WhatsApp phone number in the Settings tab first.");
            return;
        }

        let reportText = `*SmartChef AI - Tomorrow's Forecast*\n\n`;
        predictions.forEach(item => {
            reportText += `*${item.name}*: ${item.prediction} plates\n`;
            if (item.wastage) {
                reportText += `_⚠️ High Wastage Alert (${item.wastagePercent}%)_\n`;
            }
        });
        reportText += `\nReply with corrections if needed (e.g., Biryani 25, Paneer 15)`;

        const encodedText = encodeURIComponent(reportText);
        const whatsappUrl = `https://wa.me/${restaurant.phone}?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        // ... (UI unchanged)
        <div>
            <Header title={restaurant.name} />
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                <button 
                    onClick={() => setSalesModalOpen(true)}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center justify-center"
                >
                    <PlusIcon className="h-6 w-6 mr-2" />
                    Enter Yesterday's Sales
                </button>
                <button 
                    onClick={sendWhatsAppReport}
                    disabled={loading || predictions.length === 0}
                    className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SendIcon className="h-6 w-6 mr-2" />
                    Send Report via WhatsApp
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
                )
            )}
            {isSalesModalOpen && (
                <SalesEntryModal 
                    dishes={restaurant.dishes || []} 
                    userId={userId} 
                    onClose={() => setSalesModalOpen(false)}
                    onSave={calculatePredictions}
                />
            )}
        </div>
    );
};

const SalesEntryModal = ({ dishes, userId, onClose, onSave }) => {
    // ... (logic unchanged)
    if (!userId) {
        console.error("SalesEntryModal: userId is missing!");
        return null; 
    }
    
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
                const sold = salesData[dish.id].sold || 0;
                const wasted = salesData[dish.id].wasted || 0;
                
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
        // ... (UI unchanged)
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Enter Yesterday's Sales</h2>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    {(dishes || []).map(dish => (
                        <div key={dish.id} className="p-3 bg-gray-50 rounded-md border">
                             <p className="font-semibold text-gray-800">{dish.name}</p>
                             <div className="flex items-center space-x-3 mt-2">
                                <div className="flex-1">
                                    <label className="text-sm text-gray-500">Quantity Sold</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={salesData[dish.id]?.sold || ''}
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
                                        value={salesData[dish.id]?.wasted || ''}
                                        onChange={(e) => handleInputChange(dish.id, 'wasted', e.target.value)}
                                        className="w-full mt-1 p-2 border rounded-md"
                                        placeholder="e.g., 2"
                                    />
                                </div>
                             </div>
                        </div>
                    ))}
                    {(!dishes || dishes.length === 0) && (
                        <p className="text-gray-500 text-center">Please add some dishes in the Settings tab first.</p>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving || !dishes || dishes.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LiveOrdersScreen = ({ restaurant, userId }) => {
    // ... (logic unchanged)
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
            const orderRef = await addDoc(collection(db, 'live_orders'), {
                userId: userId, 
                customerName: testCustomer.name,
                customerPhone: testCustomer.phone, 
                items: [
                    { name: restaurant.dishes[0]?.name || 'Test Dish 1', quantity: 1, price: 100 },
                    { name: restaurant.dishes[1]?.name || 'Test Dish 2', quantity: 2, price: 50 }
                ],
                total: 200,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            const customerDocId = `${userId}_${testCustomer.phone}`; 
            const customerRef = doc(db, 'customers', customerDocId);
            await setDoc(customerRef, {
                userId: userId, 
                name: testCustomer.name,
                phone: testCustomer.phone,
                lastOrderAt: Timestamp.now()
            }, { merge: true }); 

        } catch (error) {
            console.error("Error adding test order or customer: ", error);
        }
    };
    
    const updateOrderStatus = async (orderId, newStatus) => {
        const orderRef = doc(db, 'live_orders', orderId);
        try {
            await updateDoc(orderRef, { status: newStatus });
        } catch (error) {
            console.error("Error updating order status: ", error);
        }
    };

    return (
        // ... (UI unchanged)
        <div>
            <Header title="Live Orders" />
            <button
                onClick={addTestOrder}
                className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center mb-4"
            >
                Add Test Order (Captures Customer)
            </button>
            {loading ? <p>Loading live orders...</p> : (
                orders.length === 0 ? (
                    <p className="text-center text-gray-500 mt-8">No live orders yet.</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-lg shadow">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg">{order.customerName}</h3>
                                        {order.customerPhone && <p className="text-sm text-gray-500">{order.customerPhone}</p>}
                                    </div>
                                    <span className={`font-semibold px-2 py-0.5 rounded-full text-sm ${
                                        order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                                    }`}>
                                        {order.status}
                                    </span>
                                </div>
                                <ul className="list-disc list-inside text-gray-700 mb-2">
                                    {(order.items || []).map((item, index) => (
                                        <li key={`${item.name}-${index}`}>{item.quantity}x {item.name}</li>
                                    ))}
                                </ul>
                                <p className="font-bold text-right mb-3">Total: ₹{order.total}</p>
                                <div className="flex space-x-2">
                                    {order.status === 'pending' && (
                                        <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="w-full bg-green-500 text-white py-2 rounded-md">Accept</button>
                                    )}
                                    {order.status === 'accepted' && (
                                        <>
                                        <button className="w-1/2 bg-blue-500 text-white py-2 rounded-md">Book Delivery (WIP)</button>
                                        <button onClick={() => updateOrderStatus(order.id, 'completed')} className="w-1/2 bg-indigo-500 text-white py-2 rounded-md">Mark Completed</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

const CustomersScreen = ({ restaurant, userId }) => {
    // ... (logic unchanged)
    if (!userId) return <LoadingScreen message="Waiting for user data..." />;

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const customersQuery = query(
            collection(db, 'customers'),
            where('userId', '==', userId), 
            orderBy('lastOrderAt', 'desc') 
        );

        const unsubscribe = onSnapshot(customersQuery, (querySnapshot) => {
            const customerList = [];
            querySnapshot.forEach((doc) => {
                customerList.push({ id: doc.id, ...doc.data() });
            });
            setCustomers(customerList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching customers: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]); 

    const sendBulkWhatsApp = () => {
        if (!message.trim()) {
            alert("Please enter a message to send.");
            return;
        }
        if (customers.length === 0) {
            alert("No customers found to send messages to.");
            return;
        }
        
        setSending(true);
        customers.forEach((customer, index) => {
            setTimeout(() => {
                 if (customer.phone) {
                    const encodedText = encodeURIComponent(message);
                    const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodedText}`;
                    window.open(whatsappUrl, `_blank_${index}`);
                 }
                 if (index === customers.length - 1) {
                     setSending(false);
                 }
            }, index * 1000); 
        });
        setMessage(''); 
    };

    return (
        // ... (UI unchanged)
        <div>
            <Header title="Customers & Marketing" />

            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Send WhatsApp Offer</h3>
                 <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your offer message here..."
                    className="w-full p-2 border rounded-md mb-2 h-24"
                />
                 <button 
                    onClick={sendBulkWhatsApp} 
                    disabled={sending || loading || customers.length === 0}
                    className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SendIcon className="h-6 w-6 mr-2" />
                    {sending ? 'Sending...' : `Send to ${customers.length} Customers`}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">Note: This will open WhatsApp for each customer individually.</p>
            </div>

             <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Your Customers</h3>
                {loading ? <p>Loading customers...</p> : (
                    customers.length === 0 ? (
                        <p className="text-center text-gray-500 mt-4">No customers captured yet. They will appear here after placing orders.</p>
                    ) : (
                        <div className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                            {customers.map(cust => (
                                <div key={cust.id} className="py-2">
                                    <p className="font-semibold">{cust.name}</p>
                                    <p className="text-sm text-gray-500">{cust.phone}</p>
                                    <p className="text-xs text-gray-400">Last Order: {cust.lastOrderAt ? formatDate(cust.lastOrderAt) : 'N/A'}</p>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow text-center opacity-70">
                 <h3 className="font-bold text-lg mb-2">AI Personalized Messaging (Coming Soon)</h3>
                 <p className="text-sm text-gray-600">
                    Future Pro Feature: Let AI send smart messages based on weather (e.g., "Rainy day? Order hot Biryani!"), festivals ("Special Diwali offer!"), or even check in on regular single customers ("Hope you're having a good meal tonight!").
                 </p>
            </div>
        </div>
    );
};

// ** New Marketing AI Screen **
const MarketingScreen = ({ restaurant, userId }) => {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Instagram'); // Default platform
    const [generatedPost, setGeneratedPost] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const generateSocialMediaPost = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic for the post.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedPost('');

        const systemPrompt = `Act as a creative and engaging social media marketing expert specializing in restaurants. You are writing a post for ${restaurant.name}, a restaurant known for ${restaurant.cuisineType || 'delicious food'}. Their target audience is primarily ${restaurant.targetAudience || 'local food lovers'}. Generate a social media post for the ${platform} platform. Keep it concise, exciting, and include relevant emojis. Include 3-5 relevant hashtags. Do not include placeholders like "[Restaurant Name]" or "[Dish Name]"; use the actual details provided. If a specific dish is mentioned, highlight it.`;

        const userQuery = `Generate a social media post about: ${topic}. Restaurant name is ${restaurant.name}. Cuisine type: ${restaurant.cuisineType}. Target audience: ${restaurant.targetAudience}.`;

        const apiKey = ""; // Leave empty for automatic handling
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        try {
            // Basic exponential backoff implementation
            let response;
            let attempts = 0;
            const maxAttempts = 3;
            let delay = 1000; // Start with 1 second

            while (attempts < maxAttempts) {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    break; // Success
                } else if (response.status === 429 || response.status >= 500) {
                    // Throttling or server error, retry
                    attempts++;
                    if (attempts >= maxAttempts) {
                        throw new Error(`API call failed after ${maxAttempts} attempts with status: ${response.status}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Double the delay
                } else {
                    // Other client-side error, don't retry
                    throw new Error(`API call failed with status: ${response.status}`);
                }
            }


            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
                setGeneratedPost(candidate.content.parts[0].text);
            } else {
                 console.error("Unexpected API response structure:", result);
                 setError('Failed to generate post. Unexpected response from AI.');
            }
        } catch (err) {
            console.error('Error generating post:', err);
            setError(`Failed to generate post: ${err.message}. Please check your connection and API key (if applicable).`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Function to copy text to clipboard
    const copyToClipboard = () => {
        const textArea = document.createElement("textarea");
        textArea.value = generatedPost;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy'); // Use execCommand for broader compatibility in iframes
            alert('Post copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        }
        document.body.removeChild(textArea);
    };


    return (
        <div>
            <Header title="AI Social Media Post Generator" />

            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Create a New Post</h3>
                <div className="mb-3">
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                        What's the topic? (e.g., Today's Special, Weekend Offer)
                    </label>
                    <input
                        type="text"
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="E.g., Special offer on Chicken Biryani"
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                 <div className="mb-4">
                    <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
                        Platform
                    </label>
                    <select
                        id="platform"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full p-2 border rounded-md bg-white"
                    >
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        {/* <option value="Twitter">Twitter</option> */}
                    </select>
                </div>
                <button
                    onClick={generateSocialMediaPost}
                    disabled={isLoading}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center justify-center disabled:opacity-50"
                >
                    {isLoading ? (
                        <SpinnerIcon className="h-6 w-6 mr-2 animate-spin" />
                    ) : (
                        <SparklesIcon className="h-6 w-6 mr-2" />
                    )}
                    {isLoading ? 'Generating...' : 'Generate Post with AI'}
                </button>
                 {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            </div>

            {generatedPost && (
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-2">Generated Post:</h3>
                    <textarea
                        value={generatedPost}
                        onChange={(e) => setGeneratedPost(e.target.value)} // Allow editing
                        className="w-full p-2 border rounded-md h-40 mb-3 bg-gray-50"
                        readOnly={isLoading}
                    />
                     <button
                        onClick={copyToClipboard}
                        className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center"
                    >
                       <ClipboardIcon className="h-5 w-5 mr-2" /> Copy Post Text
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">You can edit the text above before copying.</p>

                </div>
            )}
        </div>
    );
};


const SettingsScreen = ({ user, restaurant, updateRestaurant }) => {
    // Ensure user object is valid before proceeding
    if (!user) return <LoadingScreen message="Waiting for user data..." />;

    // Use state derived from props
    const [dishes, setDishes] = useState(restaurant.dishes || []);
    const [phone, setPhone] = useState(restaurant.phone || '');
    const [cuisineType, setCuisineType] = useState(restaurant.cuisineType || '');
    const [targetAudience, setTargetAudience] = useState(restaurant.targetAudience || '');
    const [newDishName, setNewDishName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Update local state if the restaurant prop changes
    useEffect(() => {
        setDishes(restaurant.dishes || []);
        setPhone(restaurant.phone || '');
        setCuisineType(restaurant.cuisineType || '');
        setTargetAudience(restaurant.targetAudience || '');
    }, [restaurant]);


    const handleAddDish = () => { /* ... unchanged ... */ 
        if (newDishName.trim() === '') return;
        const newDish = { id: `dish${Date.now()}`, name: newDishName.trim() };
        setDishes([...dishes, newDish]);
        setNewDishName('');
    };

    const handleRemoveDish = (idToRemove) => { /* ... unchanged ... */ 
        setDishes(dishes.filter(dish => dish.id !== idToRemove));
    };
    
    const handleSaveChanges = async () => {
        setIsSaving(true);
        const restaurantRef = doc(db, 'restaurants', user.uid);
        try {
            // Include new marketing fields
            const updatedData = { dishes, phone, cuisineType, targetAudience };
            await updateDoc(restaurantRef, updatedData);
            updateRestaurant(updatedData); 
            alert("Changes saved successfully!");
        } catch(error) {
            console.error("Error saving changes: ", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const shareQrViaWhatsApp = () => { /* ... unchanged ... */ 
         const menuUrl = `${window.location.origin}/menu/${user.uid}`; 
         const message = `Check out our menu and order directly here: ${menuUrl}`;
         const encodedText = encodeURIComponent(message);
         const whatsappUrl = `https://wa.me/?text=${encodedText}`; 
         window.open(whatsappUrl, '_blank');
    }

    return (
        <div>
            <Header title="Settings" />
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
            </div>

             {/* Restaurant Details for AI */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 space-y-3">
                 <h3 className="font-bold text-lg mb-1">Restaurant Details (for AI)</h3>
                 <div>
                    <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 mb-1">
                        Type of Cuisine (e.g., Indian, Italian, Cafe)
                    </label>
                    <input
                        type="text"
                        id="cuisineType"
                        value={cuisineType}
                        onChange={(e) => setCuisineType(e.target.value)}
                        placeholder="e.g., South Indian, Hyderabadi"
                        className="w-full p-2 border rounded-md"
                    />
                 </div>
                 <div>
                     <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Customers (e.g., Families, Students, Office Workers)
                    </label>
                    <input
                        type="text"
                        id="targetAudience"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g., Families, Young Professionals"
                        className="w-full p-2 border rounded-md"
                    />
                 </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">WhatsApp Integration</h3>
                <p className="text-sm text-gray-600 mb-2">Enter your WhatsApp number with country code (e.g., 91xxxxxxxxxx for India). Used for sending reports.</p>
                <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., 919876543210"
                    className="w-full p-2 border rounded-md"
                />
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="font-bold text-lg mb-2">Manage Your Dishes</h3>
                 <div className="space-y-2 mb-4">
                    {(dishes || []).map(dish => (
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
            </div>

            <button 
                onClick={handleSaveChanges} 
                disabled={isSaving}
                className="w-full mb-4 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition duration-300"
            >
                {isSaving ? 'Saving...' : 'Save All Changes'}
            </button>
            
            <div className="bg-white p-4 rounded-lg shadow mb-4 text-center">
                 {/* ... QR Code and Share Button ... */}
                 <h3 className="font-bold text-lg mb-2">Your Restaurant QR Code</h3>
                <div className="flex justify-center my-2">
                    <div className="p-2 border rounded-md">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/menu/${user.uid}`} alt="Restaurant QR Code" />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">Customers scan this to order directly!</p>
                 <button 
                    onClick={shareQrViaWhatsApp}
                    className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300 flex items-center justify-center text-sm"
                >
                    <Share2Icon className="h-5 w-5 mr-2" />
                    Share QR Link via WhatsApp
                </button>
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

// --- Other Components ---
const Header = ({ title }) => (
    // ... (unchanged)
    <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
);
const ProFeatureLock = ({ title, description }) => (
    // ... (unchanged)
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
// ** Updated BottomNavBar **
const BottomNavBar = ({ activeScreen, setActiveScreen, isPro }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
        { id: 'marketing', label: 'Marketing AI', icon: SparklesIcon }, // New Marketing Icon
        { id: 'orders', label: 'Orders', icon: ShoppingCartIcon },
        { id: 'customers', label: 'Customers', icon: UsersIcon },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ];
    return (
        <div className="bg-white shadow-t sticky bottom-0 border-t z-10"> 
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

// --- Icon Components (Lucide React - Added SparklesIcon, SpinnerIcon, ClipboardIcon) ---
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

