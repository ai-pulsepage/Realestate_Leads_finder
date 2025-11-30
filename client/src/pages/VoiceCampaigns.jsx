import { useState, useEffect } from 'react';
import axios from 'axios';
import { Phone, Play, Pause, Plus, Upload, Users, BarChart } from 'lucide-react';

const VoiceCampaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newCampaign, setNewCampaign] = useState({ name: '', leads: '' }); // leads = comma separated phones for MVP

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        // Placeholder: Fetch campaigns from API (Need to implement GET /api/voice-campaigns)
        // For now, we'll just mock or show empty
        setLoading(false);
    };

    const handleCreate = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));

            // Parse leads (simple CSV or newline split)
            const leads = newCampaign.leads.split(/[\n,]+/).map(l => l.trim()).filter(l => l);

            // 1. Create Campaign (Mock ID for now or implement API)
            const campaignId = 'temp-campaign-' + Date.now();

            // 2. Add to Queue
            await axios.post('http://localhost:8080/api/voice-ai/enqueue', {
                campaignId,
                userId: user.user_id,
                leads: leads.map(phone => ({ phone, name: 'Valued Lead' }))
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Campaign started! Added ${leads.length} calls to the queue.`);
            setShowCreate(false);
            setNewCampaign({ name: '', leads: '' });
        } catch (err) {
            console.error(err);
            alert('Failed to start campaign');
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Voice Campaigns</h1>
                <button
                    onClick={() => setShowCreate(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={20} /> New Campaign
                </button>
            </div>

            {showCreate && (
                <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-blue-100">
                    <h2 className="text-xl font-semibold mb-4">Launch Outbound Campaign</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block font-medium mb-1">Campaign Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={newCampaign.name}
                                onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Leads (Phone Numbers)</label>
                            <textarea
                                className="w-full h-32 p-2 border rounded font-mono text-sm"
                                placeholder="3055550101, 3055550102..."
                                value={newCampaign.leads}
                                onChange={e => setNewCampaign({ ...newCampaign, leads: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Enter phone numbers separated by commas or new lines.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                            >
                                <Play size={18} /> Launch Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                            <Phone size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Active Calls</p>
                            <h3 className="text-2xl font-bold">0</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-full">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Leads Contacted</p>
                            <h3 className="text-2xl font-bold">0</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                            <BarChart size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Appointments Set</p>
                            <h3 className="text-2xl font-bold">0</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign List (Placeholder) */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-medium text-gray-600">Campaign Name</th>
                            <th className="p-4 font-medium text-gray-600">Status</th>
                            <th className="p-4 font-medium text-gray-600">Progress</th>
                            <th className="p-4 font-medium text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-4 text-gray-500 text-center" colSpan="4">
                                No active campaigns. Click "New Campaign" to start.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VoiceCampaigns;
