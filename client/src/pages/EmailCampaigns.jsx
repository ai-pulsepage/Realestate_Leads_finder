import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const EmailCampaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.user_id;
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/email-campaigns/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaigns(res.data.campaigns);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'sent': return <CheckCircle className="text-green-500" size={20} />;
            case 'queued': return <Clock className="text-orange-500" size={20} />;
            case 'draft': return <Edit className="text-gray-500" size={20} />;
            default: return <AlertCircle className="text-red-500" size={20} />;
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Email Campaigns</h2>
                <Link
                    to="/email/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700"
                >
                    <Plus size={20} className="mr-2" /> New Campaign
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {campaigns.map(c => (
                            <tr key={c.campaign_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{c.campaign_name}</div>
                                    <div className="text-sm text-gray-500">{c.subject_line}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${c.status === 'sent' ? 'bg-green-100 text-green-800' :
                                            c.status === 'queued' ? 'bg-orange-100 text-orange-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {c.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {c.total_recipients}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(c.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {campaigns.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No campaigns found. Create your first one!
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailCampaigns;
