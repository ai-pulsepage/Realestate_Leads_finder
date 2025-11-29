import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Send, Loader2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const CreateCampaign = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [templates, setTemplates] = useState([]);
    const [leads, setLeads] = useState([]);
    const [userBalance, setUserBalance] = useState(0);

    // Cost Preview
    const [estimatedCost, setEstimatedCost] = useState(0);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        campaign_name: '',
        subject_line: '',
        template_id: '',
        selected_leads: [] // Array of lead objects
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.user_id;
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch Cost when entering Step 4
    useEffect(() => {
        if (step === 4) {
            fetchCost();
        }
    }, [step, formData.selected_leads]);

    const fetchData = async () => {
        try {
            const [tplRes, leadsRes, userRes] = await Promise.all([
                axios.get(`http://localhost:8080/api/email-templates/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`http://localhost:8080/api/saved-leads/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`http://localhost:8080/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }) // Assuming /me exists or fetch user
            ]);
            setTemplates(tplRes.data.templates);
            setLeads(leadsRes.data.leads);
            // Assuming userRes returns balance, if not we might need a specific endpoint or rely on localstorage (less safe)
            // For now, let's assume we can get it or fetch from a balance endpoint if exists. 
            // If /auth/me doesn't return balance, we might need to add it or use a different endpoint.
            // Let's try to fetch from a dedicated balance endpoint if we made one, or just /users/:id
            const balanceRes = await axios.get(`http://localhost:8080/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            setUserBalance(balanceRes.data.token_balance);

        } catch (err) {
            console.error(err);
        }
    };

    const fetchCost = async () => {
        try {
            const qty = formData.selected_leads.length;
            if (qty === 0) return;
            const res = await axios.get(`http://localhost:8080/api/token-pricing/cost/email_send?quantity=${qty}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEstimatedCost(res.data.total_cost);
        } catch (err) {
            console.error("Failed to fetch cost", err);
        }
    };

    const handleLaunchClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmLaunch = async () => {
        setLoading(true);
        try {
            // 1. Get Template Content
            const selectedTemplate = templates.find(t => t.template_id === formData.template_id);

            // 2. Prepare Recipients
            const recipients = formData.selected_leads.map(lead => ({
                saved_lead_id: lead.lead_id,
                email: 'test@example.com', // TODO: In real app, lead needs email field. Using dummy for now if missing.
                name: lead.owner_name || 'Homeowner',
                template_variables: {
                    first_name: (lead.owner_name || 'Homeowner').split(' ')[0],
                    property_address: lead.address
                }
            }));

            // 3. Create Campaign
            const res = await axios.post('http://localhost:8080/api/email-campaigns', {
                user_id: userId,
                campaign_name: formData.campaign_name,
                template_id: formData.template_id,
                subject_line: formData.subject_line,
                html_body: selectedTemplate.html_body,
                recipients: recipients,
                campaign_type: 'manual'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const campaignId = res.data.campaign.campaign_id;

            // 4. Queue it immediately
            await axios.post(`http://localhost:8080/api/email-campaigns/${campaignId}/send`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShowConfirmModal(false);
            navigate('/email');
        } catch (err) {
            console.error(err);
            alert('Failed to create campaign: ' + (err.response?.data?.message || err.message));
            setShowConfirmModal(false);
        } finally {
            setLoading(false);
        }
    };

    const toggleLead = (lead) => {
        const isSelected = formData.selected_leads.find(l => l.lead_id === lead.lead_id);
        if (isSelected) {
            setFormData(prev => ({ ...prev, selected_leads: prev.selected_leads.filter(l => l.lead_id !== lead.lead_id) }));
        } else {
            setFormData(prev => ({ ...prev, selected_leads: [...prev.selected_leads, lead] }));
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>

            {/* Steps Indicator */}
            <div className="flex mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`flex-1 h-2 rounded-full mx-1 ${step >= i ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
            </div>

            <div className="bg-white p-8 rounded-lg shadow">

                {/* STEP 1: DETAILS */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold mb-4">Step 1: Campaign Details</h3>
                        <div>
                            <label className="block font-medium mb-1">Campaign Name</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.campaign_name}
                                onChange={e => setFormData({ ...formData, campaign_name: e.target.value })}
                                placeholder="e.g., Miami Condos Outreach"
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Subject Line</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.subject_line}
                                onChange={e => setFormData({ ...formData, subject_line: e.target.value })}
                                placeholder="e.g., Question about your property at {{property_address}}"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 2: TEMPLATE */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold mb-4">Step 2: Select Template</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {templates.map(t => (
                                <div
                                    key={t.template_id}
                                    onClick={() => setFormData({ ...formData, template_id: t.template_id })}
                                    className={`p-4 border rounded cursor-pointer ${formData.template_id === t.template_id ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="font-bold">{t.template_name}</div>
                                    <div className="text-sm text-gray-500">{t.subject_line}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: AUDIENCE */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold mb-4">Step 3: Select Audience</h3>
                        <div className="max-h-96 overflow-y-auto border rounded">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Select</th>
                                        <th className="px-4 py-2 text-left">Owner</th>
                                        <th className="px-4 py-2 text-left">Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map(lead => (
                                        <tr key={lead.lead_id} className="border-t hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!!formData.selected_leads.find(l => l.lead_id === lead.lead_id)}
                                                    onChange={() => toggleLead(lead)}
                                                />
                                            </td>
                                            <td className="px-4 py-2">{lead.owner_name}</td>
                                            <td className="px-4 py-2">{lead.address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-gray-500">Selected: {formData.selected_leads.length} leads</p>
                    </div>
                )}

                {/* STEP 4: REVIEW */}
                {step === 4 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold mb-4">Step 4: Review & Launch</h3>
                        <div className="bg-gray-50 p-4 rounded space-y-2">
                            <div><strong>Name:</strong> {formData.campaign_name}</div>
                            <div><strong>Subject:</strong> {formData.subject_line}</div>
                            <div><strong>Template:</strong> {templates.find(t => t.template_id === formData.template_id)?.template_name}</div>
                            <div><strong>Recipients:</strong> {formData.selected_leads.length} leads</div>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                                <div className="flex justify-between items-center text-lg font-medium">
                                    <span>Estimated Cost:</span>
                                    <span className="text-blue-600 font-bold">{estimatedCost} Tokens</span>
                                </div>
                                <div className="text-sm text-gray-500 text-right">
                                    Your Balance: {userBalance} Tokens
                                </div>
                            </div>
                        </div>
                        <div className="text-center py-4">
                            <button
                                onClick={handleLaunchClick}
                                disabled={loading}
                                className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center mx-auto"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                                Launch Campaign
                            </button>
                        </div>
                    </div>
                )}

                {/* NAVIGATION */}
                <div className="flex justify-between mt-8 pt-4 border-t">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="flex items-center text-gray-600 hover:text-black">
                            <ArrowLeft className="mr-2" size={20} /> Back
                        </button>
                    ) : <div></div>}

                    {step < 4 && (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={
                                (step === 1 && !formData.campaign_name) ||
                                (step === 2 && !formData.template_id) ||
                                (step === 3 && formData.selected_leads.length === 0)
                            }
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            Next <ArrowRight className="ml-2" size={20} />
                        </button>
                    )}
                </div>

            </div>

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmLaunch}
                title="Confirm Campaign Launch"
                message={`You are about to send "${formData.campaign_name}" to ${formData.selected_leads.length} recipients.`}
                cost={estimatedCost}
                currentBalance={userBalance}
                isLoading={loading}
            />
        </div>
    );
};

export default CreateCampaign;
