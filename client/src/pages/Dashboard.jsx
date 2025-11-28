import { useState } from 'react';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Mic, Mail, LogOut, Users } from 'lucide-react';
import VoicePersonaEditor from './VoicePersonaEditor';

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-lg">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-blue-600">RealEstate AI</h1>
                </div>
                <nav className="p-4 space-y-2">
                    <Link to="/" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                        <LayoutDashboard size={20} className="mr-3" />
                        Overview
                    </Link>
                    <Link to="/voice-ai" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                        <Mic size={20} className="mr-3" />
                        Voice Persona
                    </Link>
                    <Link to="/email" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                        <Mail size={20} className="mr-3" />
                        Email Campaigns
                    </Link>
                    <Link to="/leads" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                        <Users size={20} className="mr-3" />
                        Leads
                    </Link>
                </nav>
                <div className="absolute bottom-0 w-64 p-4 border-t">
                    <button onClick={handleLogout} className="flex items-center w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <LogOut size={20} className="mr-3" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-8">
                <Routes>
                    <Route path="/" element={<h2 className="text-2xl font-bold">Welcome to Dashboard</h2>} />
                    <Route path="/voice-ai" element={<VoicePersonaEditor />} />
                    <Route path="/email" element={<h2 className="text-2xl font-bold">Email Campaigns (Coming Soon)</h2>} />
                    <Route path="/leads" element={<h2 className="text-2xl font-bold">Leads Manager (Coming Soon)</h2>} />
                </Routes>
            </div>
        </div>
    );
};

export default Dashboard;
