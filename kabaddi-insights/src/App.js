import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy,
    doc,
    setDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
// These global variables are expected to be provided by the environment.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "YOUR_API_KEY", // Fallback for local dev
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kabaddi-insights';


// --- Helper Components ---
const Spinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    </div>
);

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md relative animate-fade-in-up">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {children}
        </div>
    </div>
);

// --- Main App Component ---
function App() {
    const [page, setPage] = useState('user'); // 'user', 'admin', 'login'
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- Firebase Initialization ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                setLoading(true);
                if (currentUser) {
                    setUser(currentUser);
                    // Simple admin check - in a real app, use custom claims or a separate user roles collection
                    if (currentUser.uid === 'ADMIN_USER_ID_PLACEHOLDER' || localStorage.getItem('isAdmin') === 'true') {
                        setIsAdmin(true);
                        setPage('admin');
                    }
                } else {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                         await signInWithCustomToken(authInstance, __initial_auth_token);
                    } else {
                         await signInAnonymously(authInstance);
                    }
                }
                setLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase Initialization Error:", error);
            setLoading(false);
        }
    }, []);

    const handleAdminLogin = (password) => {
        // In a real app, this would be a secure authentication flow.
        // For this example, we use a simple password and local storage for persistence.
        if (password === 'kabaddi_admin') {
            setIsAdmin(true);
            localStorage.setItem('isAdmin', 'true');
            setPage('admin');
            return true;
        }
        return false;
    };
    
    const handleLogout = () => {
        setIsAdmin(false);
        localStorage.removeItem('isAdmin');
        setPage('user');
    }

    const renderPage = () => {
        if (loading) return <Spinner />;
        
        switch (page) {
            case 'admin':
                return isAdmin ? <AdminPage db={db} handleLogout={handleLogout} /> : <LoginPage onLogin={handleAdminLogin} setPage={setPage} />;
            case 'login':
                 return <LoginPage onLogin={handleAdminLogin} setPage={setPage} />;
            default:
                return <UserPage db={db} user={user} setAdminPage={() => setPage('login')} />;
        }
    };
    
    return (
         <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
            `}</style>
            <div className="container mx-auto p-4 md:p-8">
                {renderPage()}
            </div>
        </div>
    );
}


// --- Admin Login Page ---
function LoginPage({ onLogin, setPage }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!onLogin(password)) {
            setError('Incorrect password. Please try again.');
        } else {
            setError('');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl animate-fade-in-up">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Login</h1>
                    <p className="mt-2 text-gray-600">Enter password to access the dashboard.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            placeholder="Password"
                            className="w-full px-4 py-3 text-gray-700 bg-gray-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            required
                        />
                    </div>
                     {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <div className="flex items-center justify-between gap-4">
                         <button type="button" onClick={() => setPage('user')} className="w-full px-4 py-3 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-transform transform hover:scale-105">
                            Go to User Form
                        </button>
                        <button type="submit" className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105">
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Admin Page ---
function AdminPage({ db, handleLogout }) {
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState([]);
    const [view, setView] = useState('questions'); // 'questions', 'responses'
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch questions
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, `apps/${appId}/questions`), orderBy("order"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const questionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuestions(questionsData);
        }, (error) => console.error("Error fetching questions:", error));
        return () => unsubscribe();
    }, [db]);

    // Fetch responses
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, `apps/${appId}/responses`));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const responsesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setResponses(responsesData);
        }, (error) => console.error("Error fetching responses:", error));
        return () => unsubscribe();
    }, [db]);

    return (
        <div className="animate-fade-in-up">
            <header className="flex justify-between items-center mb-8 pb-4 border-b">
                 <div>
                    <h1 className="text-4xl font-bold text-gray-900">Kabaddi Insights Dashboard</h1>
                    <p className="text-gray-600">Manage questions and view user responses.</p>
                </div>
                 <button onClick={handleLogout} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform hover:scale-105">
                    Logout
                </button>
            </header>
            
            <div className="mb-6">
                <nav className="flex space-x-2 bg-gray-200 p-1 rounded-lg">
                    <button onClick={() => setView('questions')} className={`w-full py-2.5 text-sm font-medium leading-5 rounded-lg ${view === 'questions' ? 'bg-white shadow text-blue-700' : 'text-gray-700 hover:bg-white/[0.5]'}`}>
                        Manage Questions ({questions.length})
                    </button>
                    <button onClick={() => setView('responses')} className={`w-full py-2.5 text-sm font-medium leading-5 rounded-lg ${view === 'responses' ? 'bg-white shadow text-blue-700' : 'text-gray-700 hover:bg-white/[0.5]'}`}>
                        View Responses ({responses.length})
                    </button>
                </nav>
            </div>

            {view === 'questions' && (
                <div>
                    <button onClick={() => setShowAddModal(true)} className="mb-6 w-full md:w-auto px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Add New Question
                    </button>
                    <QuestionList questions={questions} />
                </div>
            )}

            {view === 'responses' && <ResponseList responses={responses} questions={questions} />}

            {showAddModal && <AddQuestionModal db={db} questions={questions} onClose={() => setShowAddModal(false)} />}
        </div>
    );
}

// --- Admin Sub-Components ---
const QuestionList = ({ questions }) => (
    <div className="space-y-4">
        {questions.length > 0 ? questions.map((q, index) => (
            <div key={q.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                <p className="font-bold text-lg text-gray-800">{index + 1}. {q.text}</p>
                <div className="mt-3 text-sm text-gray-600 space-y-2">
                    <p><span className="font-semibold">Type:</span> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">{q.type}</span></p>
                    {q.options && q.options.length > 0 && (
                        <div><span className="font-semibold">Options:</span> {q.options.join(', ')}</div>
                    )}
                    <p><span className="font-semibold">Mandatory:</span> {q.required ? 'Yes' : 'No'}</p>
                    {q.conditionalOn && q.conditionalOn.questionId && (
                         <p><span className="font-semibold">Conditional:</span> Shows if Q#{q.conditionalOn.questionId.slice(-1)} is '{q.conditionalOn.answer}'</p>
                    )}
                </div>
            </div>
        )) : <p className="text-center text-gray-500 py-8">No questions added yet. Click 'Add New Question' to start.</p>}
    </div>
);

const ResponseList = ({ responses, questions }) => {
    const getQuestionText = (questionId) => {
        const question = questions.find(q => q.id === questionId);
        return question ? question.text : 'Unknown Question';
    };

    return (
         <div className="space-y-4">
            {responses.length > 0 ? responses.map(res => (
                <div key={res.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                         <p className="font-semibold text-gray-500 text-sm">User: <span className="font-mono text-xs">{res.userId || 'Anonymous'}</span></p>
                         <p className="font-semibold text-gray-500 text-sm">Submitted: <span className="font-normal">{new Date(res.submittedAt.seconds * 1000).toLocaleString()}</span></p>
                    </div>
                    <div className="space-y-3">
                    {Object.entries(res.answers).map(([qid, answer]) => (
                         <div key={qid}>
                             <p className="font-bold text-gray-700">{getQuestionText(qid)}</p>
                             <p className="text-blue-700 pl-4 border-l-2 border-blue-200 mt-1">{Array.isArray(answer) ? answer.join(', ') : answer}</p>
                         </div>
                    ))}
                    </div>
                </div>
            )) : <p className="text-center text-gray-500 py-8">No responses received yet.</p>}
        </div>
    );
};

const AddQuestionModal = ({ db, questions, onClose }) => {
    const [text, setText] = useState('');
    const [type, setType] = useState('text');
    const [options, setOptions] = useState(['']);
    const [required, setRequired] = useState(false);
    const [conditionalOn, setConditionalOn] = useState({ questionId: '', answer: '' });

    const handleAddOption = () => setOptions([...options, '']);
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };
    const handleRemoveOption = (index) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newQuestion = {
            text,
            type,
            required,
            order: questions.length + 1,
            options: (type === 'multiple-choice' || type === 'multiselect') ? options.filter(o => o.trim() !== '') : [],
            conditionalOn: conditionalOn.questionId ? conditionalOn : null,
        };

        try {
            await addDoc(collection(db, `apps/${appId}/questions`), newQuestion);
            onClose();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };
    
    const conditionalQuestions = useMemo(() => {
        return questions.filter(q => q.type === 'multiple-choice');
    }, [questions]);
    
    const selectedConditionalQuestion = useMemo(() => {
        return questions.find(q => q.id === conditionalOn.questionId)
    }, [questions, conditionalOn.questionId]);

    return (
        <Modal onClose={onClose}>
            <h2 className="text-2xl font-bold mb-6 text-center">Add New Question</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Question Text</label>
                    <input type="text" value={text} onChange={(e) => setText(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Question Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="text">Text Input</option>
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="multiselect">Multi-Select (Checkboxes)</option>
                    </select>
                </div>

                {(type === 'multiple-choice' || type === 'multiselect') && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Options</label>
                        {options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="text" value={option} onChange={(e) => handleOptionChange(index, e.target.value)} className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
                                <button type="button" onClick={() => handleRemoveOption(index)} className="px-2 py-1 text-red-600 hover:text-red-800">&times;</button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddOption} className="text-sm text-blue-600 hover:underline">Add Option</button>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conditional Logic</label>
                     <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-md border">
                         <select 
                            value={conditionalOn.questionId} 
                            onChange={(e) => setConditionalOn({ questionId: e.target.value, answer: '' })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md"
                        >
                             <option value="">No Condition</option>
                             {conditionalQuestions.map(q => <option key={q.id} value={q.id}>Show if Q#{q.order} is...</option>)}
                         </select>
                         {selectedConditionalQuestion && (
                             <select
                                value={conditionalOn.answer}
                                onChange={(e) => setConditionalOn({...conditionalOn, answer: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md"
                             >
                                 <option value="">Select an answer...</option>
                                 {selectedConditionalQuestion.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                         )}
                    </div>
                </div>

                <div className="flex items-center">
                    <input type="checkbox" id="required" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="required" className="ml-2 block text-sm text-gray-900">Mandatory Question</label>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                     <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                     <button type="submit" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Question</button>
                </div>
            </form>
        </Modal>
    );
};


// --- User Page ---
function UserPage({ db, user, setAdminPage }) {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const q = query(collection(db, `apps/${appId}/questions`), orderBy("order"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const questionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuestions(questionsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching questions:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };
    
    const handleMultiSelectChange = (questionId, option, checked) => {
        setAnswers(prev => {
            const existingAnswers = prev[questionId] || [];
            if (checked) {
                return { ...prev, [questionId]: [...existingAnswers, option] };
            } else {
                return { ...prev, [questionId]: existingAnswers.filter(a => a !== option) };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = {
            userId: user ? user.uid : 'anonymous',
            submittedAt: new Date(),
            answers: answers,
        };
        try {
            await addDoc(collection(db, `apps/${appId}/responses`), response);
            setSubmitted(true);
        } catch (error) {
            console.error("Error submitting response: ", error);
        }
    };
    
    const visibleQuestions = useMemo(() => {
        return questions.filter(q => {
            if (!q.conditionalOn || !q.conditionalOn.questionId) {
                return true; // Always show if not conditional
            }
            const dependencyAnswer = answers[q.conditionalOn.questionId];
            return dependencyAnswer === q.conditionalOn.answer;
        });
    }, [questions, answers]);

    if (loading) return <Spinner />;

    if (submitted) {
        return (
            <div className="text-center p-10 bg-white rounded-2xl shadow-xl animate-fade-in-up max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-green-600 mb-4">Thank You!</h1>
                <p className="text-gray-700 mb-6">Your response has been submitted successfully.</p>
                 <h2 className="text-2xl font-semibold text-gray-800 border-t pt-6 mt-6 mb-4">Your Answers:</h2>
                <div className="text-left space-y-4">
                {Object.entries(answers).map(([qid, answer]) => {
                    const question = questions.find(q => q.id === qid);
                    return (
                        <div key={qid}>
                             <p className="font-bold text-gray-700">{question ? question.text : '...'}</p>
                             <p className="text-blue-700 pl-4 mt-1">{Array.isArray(answer) ? answer.join(', ') : answer}</p>
                        </div>
                    );
                })}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <header className="text-center mb-10">
                 <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">Kabaddi Insights Survey</h1>
                 <p className="mt-3 text-lg text-gray-600">Share your opinions and help us gather valuable insights!</p>
            </header>
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl space-y-8 animate-fade-in-up">
                {visibleQuestions.map(q => (
                    <div key={q.id} className="border-b pb-6 last:border-b-0 animate-fade-in-up">
                        <label className="block text-lg font-semibold text-gray-800 mb-3">
                            {q.text} {q.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {q.type === 'text' && (
                             <input
                                type="text"
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                required={q.required}
                                className="w-full px-4 py-2 text-gray-700 bg-gray-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                             />
                        )}
                        
                        {q.type === 'multiple-choice' && (
                            <div className="space-y-2">
                            {q.options.map(option => (
                                <label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-100 transition cursor-pointer">
                                    <input
                                        type="radio"
                                        name={q.id}
                                        value={option}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                        required={q.required}
                                        className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-gray-700">{option}</span>
                                </label>
                            ))}
                            </div>
                        )}
                        
                        {q.type === 'multiselect' && (
                            <div className="space-y-2">
                             {q.options.map(option => (
                                <label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-100 transition cursor-pointer">
                                     <input
                                        type="checkbox"
                                        value={option}
                                        onChange={(e) => handleMultiSelectChange(q.id, option, e.target.checked)}
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                     <span className="ml-3 text-gray-700">{option}</span>
                                 </label>
                             ))}
                             </div>
                        )}
                    </div>
                ))}

                <div className="pt-4">
                    <button type="submit" className="w-full px-6 py-4 text-lg font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105">
                        Submit My Response
                    </button>
                </div>
            </form>
            <footer className="text-center mt-8">
                 <button onClick={setAdminPage} className="text-sm text-gray-500 hover:underline">Admin Login</button>
            </footer>
        </div>
    );
}

export default App;
