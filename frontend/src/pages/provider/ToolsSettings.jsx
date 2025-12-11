import React, { useState, useEffect } from 'react';
import {
    Phone, PhoneOutgoing, PhoneIncoming, Calendar, Wallet,
    Mail, Settings, Save, Loader2, CheckCircle, AlertCircle,
    Mic, Volume2, Clock, Users, MessageSquare, Zap, Sparkles
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Tools & Settings - Premium Configuration Dashboard
 * Features: Dual-Agent Voice AI, Token Wallet, Email Marketing
 */
const ToolsSettings = () => {
    // Voice AI State
    const [aiEnabled, setAiEnabled] = useState(true);
    const [activeTab, setActiveTab] = useState('inbound'); // 'inbound' | 'outbound'
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Inbound Config
    const [inboundConfig, setInboundConfig] = useState({
        twilioNumber: '',
        forwardingNumber: '',
        greeting: "Hello! You've reached [Company Name]. How can we help you today?",
        knowledgeBase: "",
        afterHours: 'voicemail'
    });

    // Outbound Config
    const [outboundConfig, setOutboundConfig] = useState({
        agentName: 'Sarah',
        objective: 'qualify_lead',
        openingScript: "Hi, this is Sarah from [Company]. I'm following up on your recent inquiry.",
        voicemailDrop: "Hi, this is Sarah from [Company]. Please call us back. Thanks!",
        detectVoicemail: true,
        maxAttempts: 3
    });

    // Modals
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [calendarConnected, setCalendarConnected] = useState(false);

    // AI Generate State
    const [generateData, setGenerateData] = useState({ companyName: '', description: '' });
    const [generating, setGenerating] = useState(false);

    // Twilio Number Management
    const [areaCodeSearch, setAreaCodeSearch] = useState('');
    const [availableNumbers, setAvailableNumbers] = useState([]);
    const [searchingNumbers, setSearchingNumbers] = useState(false);
    const [selectedNumber, setSelectedNumber] = useState(null);
    const [purchasingNumber, setPurchasingNumber] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualNumber, setManualNumber] = useState('');

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch(`${API_BASE}/admin/dual-agent-settings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success) {
                    if (data.inbound_config && Object.keys(data.inbound_config).length > 0) {
                        setInboundConfig(prev => ({ ...prev, ...data.inbound_config }));
                    }
                    if (data.outbound_config && Object.keys(data.outbound_config).length > 0) {
                        setOutboundConfig(prev => ({ ...prev, ...data.outbound_config }));
                    }
                    if (data.twilio_number) {
                        setInboundConfig(prev => ({ ...prev, twilioNumber: data.twilio_number }));
                    }
                    setCalendarConnected(data.calendar_connected || false);
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/admin/dual-agent-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    inbound_config: inboundConfig,
                    outbound_config: outboundConfig,
                    ai_enabled: aiEnabled
                })
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to save');
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Search for available Twilio numbers
    const searchNumbers = async () => {
        if (!areaCodeSearch || areaCodeSearch.length < 3) {
            setError('Please enter a 3-digit area code');
            return;
        }

        setSearchingNumbers(true);
        setError(null);
        setAvailableNumbers([]);

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/twilio/available-numbers?areaCode=${areaCodeSearch}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setAvailableNumbers(data.numbers || []);
                if (data.numbers?.length === 0) {
                    setError('No numbers available in this area code. Try another.');
                }
            } else {
                setError(data.message || 'Failed to search numbers');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Failed to search numbers. Check your connection.');
        } finally {
            setSearchingNumbers(false);
        }
    };

    // Purchase selected number
    const purchaseNumber = async () => {
        if (!selectedNumber) return;

        setPurchasingNumber(true);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const res = await fetch(`${API_BASE}/twilio/purchase-number`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    phoneNumber: selectedNumber,
                    userId: user.user_id
                })
            });

            const data = await res.json();

            if (data.success) {
                setInboundConfig(prev => ({ ...prev, twilioNumber: data.number.phoneNumber }));
                setShowBuyModal(false);
                setSelectedNumber(null);
                setAvailableNumbers([]);
            } else {
                setError(data.message || 'Failed to purchase number');
            }
        } catch (err) {
            console.error('Purchase error:', err);
            setError('Failed to purchase number');
        } finally {
            setPurchasingNumber(false);
        }
    };

    // Set number manually (for admin/testing)
    const setNumberManually = async () => {
        if (!manualNumber) return;

        setPurchasingNumber(true);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const res = await fetch(`${API_BASE}/twilio/set-number-manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    phoneNumber: manualNumber,
                    userId: user.user_id,
                    configureWebhooks: true
                })
            });

            const data = await res.json();

            if (data.success) {
                setInboundConfig(prev => ({ ...prev, twilioNumber: data.phoneNumber }));
                setShowBuyModal(false);
                setManualNumber('');
                setManualMode(false);
            } else {
                setError(data.message || 'Failed to set number');
            }
        } catch (err) {
            console.error('Manual set error:', err);
            setError('Failed to set number');
        } finally {
            setPurchasingNumber(false);
        }
    };

    // Generate Knowledge Base with AI
    const generateKnowledgeBase = async () => {
        if (!generateData.companyName || !generateData.description) {
            setError('Please enter your company name and description');
            return;
        }

        setGenerating(true);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE}/admin/generate-persona`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    description: generateData.description,
                    company_name: generateData.companyName
                })
            });

            const data = await res.json();

            if (data.success && data.generated_prompt) {
                // Set the generated knowledge base
                setInboundConfig(prev => ({ ...prev, knowledgeBase: data.generated_prompt }));
                setShowGenerateModal(false);
                setGenerateData({ companyName: '', description: '' });
            } else {
                setError(data.message || 'Failed to generate knowledge base');
            }
        } catch (err) {
            console.error('Generate error:', err);
            setError('Failed to generate knowledge base. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            Tools & Configuration
                        </h1>
                        <p className="text-gray-500 mt-1">Manage your AI agents, tokens, and integrations</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 ${saved
                            ? 'bg-green-500 shadow-green-500/25'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 hover:shadow-xl hover:scale-105'
                            }`}
                    >
                        {saving ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                        ) : saved ? (
                            <><CheckCircle className="w-5 h-5" /> Saved!</>
                        ) : (
                            <><Save className="w-5 h-5" /> Save Changes</>
                        )}
                    </button>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* WALLET SECTION */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Token Wallet</h2>
                                    <p className="text-emerald-100 text-sm">Credits for AI calls & premium features</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold">500</div>
                                <div className="text-emerald-100 text-sm">Available Tokens</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                            {[
                                { name: 'Starter', tokens: 100, price: 10, popular: false },
                                { name: 'Pro', tokens: 500, price: 45, popular: true },
                                { name: 'Business', tokens: 1000, price: 80, popular: false }
                            ].map(pack => (
                                <div
                                    key={pack.name}
                                    className={`relative rounded-xl p-5 text-center transition-all duration-300 cursor-pointer ${pack.popular
                                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-lg shadow-blue-500/10'
                                        : 'border-2 border-gray-100 hover:border-blue-300 hover:shadow-lg'
                                        }`}
                                >
                                    {pack.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            BEST VALUE
                                        </div>
                                    )}
                                    <div className="text-lg font-bold text-gray-900">{pack.name} Pack</div>
                                    <div className="text-3xl font-bold text-blue-600 my-2">{pack.tokens.toLocaleString()}</div>
                                    <div className="text-gray-500 mb-4">${pack.price}.00</div>
                                    <button className={`w-full py-2.5 rounded-lg font-semibold transition-all ${pack.popular
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}>
                                        Buy Now
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Transaction History */}
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Recent Activity</h3>
                            <div className="space-y-3">
                                {[
                                    { date: 'Today', desc: 'AI Call - Lead Qualification', amount: -5 },
                                    { date: 'Yesterday', desc: 'Purchased Pro Pack', amount: +500 },
                                    { date: 'Dec 01', desc: 'Email Campaign (50 recipients)', amount: -50 }
                                ].map((tx, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="text-sm text-gray-500">{tx.date}</div>
                                            <div className="font-medium text-gray-900">{tx.desc}</div>
                                        </div>
                                        <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* VOICE AI SECTION */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Mic className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Voice AI 2.0</h2>
                                    <p className="text-violet-200 text-sm">Dual-Agent System with Smart Scheduling</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Calendar Status */}
                                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                                    <Calendar className={`w-4 h-4 ${calendarConnected ? 'text-green-300' : 'text-gray-300'}`} />
                                    <span className="text-sm">{calendarConnected ? 'Calendar Connected' : 'Calendar: Not Connected'}</span>
                                    {!calendarConnected && (
                                        <button className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition">
                                            Connect
                                        </button>
                                    )}
                                </div>
                                {/* Master Toggle */}
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${aiEnabled ? 'text-green-300' : 'text-gray-300'}`}>
                                        {aiEnabled ? 'Active' : 'Paused'}
                                    </span>
                                    <button
                                        onClick={() => setAiEnabled(!aiEnabled)}
                                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${aiEnabled ? 'bg-green-400' : 'bg-white/30'}`}
                                    >
                                        <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${aiEnabled ? 'left-8' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-100">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('inbound')}
                                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${activeTab === 'inbound'
                                    ? 'text-violet-600 border-violet-600 bg-violet-50'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <PhoneIncoming className="w-5 h-5" />
                                Inbound Receptionist
                            </button>
                            <button
                                onClick={() => setActiveTab('outbound')}
                                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 ${activeTab === 'outbound'
                                    ? 'text-violet-600 border-violet-600 bg-violet-50'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <PhoneOutgoing className="w-5 h-5" />
                                Outbound Sales Agent
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'inbound' ? (
                            <div className="space-y-6">
                                {/* Phone Numbers */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                            <Phone className="w-4 h-4 text-violet-500" />
                                            Your AI Phone Number
                                        </label>
                                        <div className="flex">
                                            <input
                                                type="text"
                                                value={inboundConfig.twilioNumber}
                                                readOnly
                                                className="flex-1 rounded-l-lg border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 px-4 py-3 font-mono"
                                            />
                                            <button
                                                onClick={() => setShowBuyModal(true)}
                                                className="px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-r-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                            <Users className="w-4 h-4 text-violet-500" />
                                            Fallback / Transfer Number
                                        </label>
                                        <input
                                            type="text"
                                            value={inboundConfig.forwardingNumber}
                                            onChange={(e) => setInboundConfig({ ...inboundConfig, forwardingNumber: e.target.value })}
                                            className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                                            placeholder="+1 (305) 555-0100"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Calls route here if AI is off or caller requests transfer.</p>
                                    </div>
                                </div>

                                {/* Greeting */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <Volume2 className="w-4 h-4 text-violet-500" />
                                        Opening Greeting
                                    </label>
                                    <input
                                        type="text"
                                        value={inboundConfig.greeting}
                                        onChange={(e) => setInboundConfig({ ...inboundConfig, greeting: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                                        placeholder="Thanks for calling [Company]. How can I help you today?"
                                    />
                                </div>

                                {/* Knowledge Base */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <MessageSquare className="w-4 h-4 text-violet-500" />
                                            Knowledge Base
                                        </label>
                                        <button
                                            onClick={() => setShowGenerateModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Generate with AI
                                        </button>
                                    </div>
                                    <textarea
                                        rows={5}
                                        value={inboundConfig.knowledgeBase}
                                        onChange={(e) => setInboundConfig({ ...inboundConfig, knowledgeBase: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition resize-none"
                                        placeholder="Tell your AI about your business, services, hours, and pricing..."
                                    />
                                    <p className="mt-1 text-xs text-gray-500">The AI uses this to answer questions accurately. Be specific!</p>
                                </div>

                                {/* After Hours */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <Clock className="w-4 h-4 text-violet-500" />
                                        After Hours Behavior
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: 'ai', label: 'AI Answers', icon: Mic },
                                            { value: 'voicemail', label: 'Take Voicemail', icon: MessageSquare },
                                            { value: 'forward', label: 'Forward Call', icon: PhoneOutgoing }
                                        ].map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setInboundConfig({ ...inboundConfig, afterHours: option.value })}
                                                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${inboundConfig.afterHours === option.value
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                    }`}
                                            >
                                                <option.icon className="w-5 h-5" />
                                                <span className="font-medium">{option.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* OUTBOUND TAB */
                            <div className="space-y-6">
                                {/* Agent Persona */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                            <Users className="w-4 h-4 text-violet-500" />
                                            Agent Name
                                        </label>
                                        <input
                                            type="text"
                                            value={outboundConfig.agentName}
                                            onChange={(e) => setOutboundConfig({ ...outboundConfig, agentName: e.target.value })}
                                            className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                                            placeholder="Sarah"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">The name your AI introduces itself as.</p>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                            <Zap className="w-4 h-4 text-violet-500" />
                                            Call Objective
                                        </label>
                                        <select
                                            value={outboundConfig.objective}
                                            onChange={(e) => setOutboundConfig({ ...outboundConfig, objective: e.target.value })}
                                            className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                                        >
                                            <option value="qualify_lead">Qualify the Lead</option>
                                            <option value="book_appointment">Book an Appointment</option>
                                            <option value="custom">Custom Script</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Opening Script */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <MessageSquare className="w-4 h-4 text-violet-500" />
                                        Opening Script
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={outboundConfig.openingScript}
                                        onChange={(e) => setOutboundConfig({ ...outboundConfig, openingScript: e.target.value })}
                                        className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition resize-none"
                                        placeholder="Hi, this is [Agent] from [Company]. I'm calling about..."
                                    />
                                </div>

                                {/* Voicemail Drop */}
                                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="flex items-center gap-2 font-semibold text-gray-700">
                                            <Volume2 className="w-5 h-5 text-orange-500" />
                                            Voicemail Drop
                                        </label>
                                        <button
                                            onClick={() => setOutboundConfig({ ...outboundConfig, detectVoicemail: !outboundConfig.detectVoicemail })}
                                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${outboundConfig.detectVoicemail ? 'bg-orange-500' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${outboundConfig.detectVoicemail ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">
                                        When enabled, the AI detects answering machines and leaves a pre-recorded message.
                                    </p>
                                    <textarea
                                        rows={2}
                                        value={outboundConfig.voicemailDrop}
                                        onChange={(e) => setOutboundConfig({ ...outboundConfig, voicemailDrop: e.target.value })}
                                        disabled={!outboundConfig.detectVoicemail}
                                        className={`w-full rounded-lg border-2 px-4 py-3 transition resize-none ${outboundConfig.detectVoicemail
                                            ? 'border-orange-200 bg-white focus:border-orange-400'
                                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        placeholder="Hi, this is [Name] from [Company]. Please call us back at..."
                                    />
                                </div>

                                {/* Max Attempts */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <Phone className="w-4 h-4 text-violet-500" />
                                        Max Call Attempts
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 5].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setOutboundConfig({ ...outboundConfig, maxAttempts: num })}
                                                className={`w-14 h-14 rounded-lg border-2 font-bold text-lg transition-all ${outboundConfig.maxAttempts === num
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                    }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">How many times the AI will attempt to reach a lead before marking as unreachable.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* EMAIL MARKETING SECTION */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-sky-500 to-cyan-600 p-6 text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Mail className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Email Marketing</h2>
                                <p className="text-sky-200 text-sm">AI-powered campaigns via SendGrid</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <div>
                                    <div className="font-semibold text-gray-900">SendGrid Connected</div>
                                    <div className="text-sm text-gray-500">info@bizleadfinders.com</div>
                                </div>
                            </div>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Configure</button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <button className="group p-5 border-2 border-gray-100 rounded-xl hover:border-sky-300 hover:bg-sky-50 transition-all text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-sky-100 rounded-lg text-sky-600 group-hover:bg-sky-200 transition">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div className="font-semibold text-gray-900">Create Campaign</div>
                                </div>
                                <p className="text-sm text-gray-500">Use AI to write a new email blast</p>
                            </button>
                            <button className="group p-5 border-2 border-gray-100 rounded-xl hover:border-sky-300 hover:bg-sky-50 transition-all text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-sky-100 rounded-lg text-sky-600 group-hover:bg-sky-200 transition">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="font-semibold text-gray-900">Manage Lists</div>
                                </div>
                                <p className="text-sm text-gray-500">Import contacts or sync from CRM</p>
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Buy Number Modal */}
            {showBuyModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-100 rounded-lg">
                                    <Phone className="w-5 h-5 text-violet-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {manualMode ? 'Enter Your Number' : 'Get a New Number'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setManualMode(!manualMode)}
                                className="text-xs text-violet-600 hover:underline"
                            >
                                {manualMode ? 'Search Numbers' : 'Enter Manually'}
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {manualMode ? (
                            /* Manual Entry Mode */
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Enter your existing Twilio number. Make sure webhooks are configured.
                                </p>
                                <input
                                    type="text"
                                    value={manualNumber}
                                    onChange={(e) => setManualNumber(e.target.value)}
                                    placeholder="(786) 544-6480 or +17865446480"
                                    className="w-full rounded-lg border-2 border-gray-200 p-3 text-sm focus:border-violet-500 transition font-mono"
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => { setShowBuyModal(false); setManualMode(false); setError(null); }}
                                        className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={setNumberManually}
                                        disabled={purchasingNumber || !manualNumber}
                                        className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition disabled:opacity-50"
                                    >
                                        {purchasingNumber ? 'Saving...' : 'Save Number'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Search & Purchase Mode */
                            <>
                                <p className="text-sm text-gray-500 mb-4">
                                    Search for a local number to use with your AI receptionist.
                                </p>

                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={areaCodeSearch}
                                        onChange={(e) => setAreaCodeSearch(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                        placeholder="Area Code (e.g. 305)"
                                        className="flex-1 rounded-lg border-2 border-gray-200 p-3 text-sm focus:border-violet-500 transition"
                                        maxLength={3}
                                    />
                                    <button
                                        onClick={searchNumbers}
                                        disabled={searchingNumbers}
                                        className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                    >
                                        {searchingNumbers ? 'Searching...' : 'Search'}
                                    </button>
                                </div>

                                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                                    {availableNumbers.length === 0 && !searchingNumbers && (
                                        <div className="text-center text-gray-400 py-8">
                                            Enter an area code and click Search
                                        </div>
                                    )}
                                    {searchingNumbers && (
                                        <div className="text-center text-gray-500 py-8">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Searching available numbers...
                                        </div>
                                    )}
                                    {availableNumbers.map(num => (
                                        <div
                                            key={num.phoneNumber}
                                            onClick={() => setSelectedNumber(num.phoneNumber)}
                                            className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition ${selectedNumber === num.phoneNumber
                                                ? 'border-violet-500 bg-violet-50'
                                                : 'border-gray-100 hover:border-violet-300 hover:bg-violet-50'
                                                }`}
                                        >
                                            <div>
                                                <span className="font-semibold text-gray-900 font-mono">{num.friendlyName}</span>
                                                {num.locality && (
                                                    <span className="ml-2 text-xs text-gray-400">{num.locality}, {num.region}</span>
                                                )}
                                            </div>
                                            <span className="text-sm text-gray-500">${num.monthlyPrice}/mo</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => { setShowBuyModal(false); setAvailableNumbers([]); setSelectedNumber(null); setError(null); }}
                                        className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={purchaseNumber}
                                        disabled={purchasingNumber || !selectedNumber}
                                        className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                                    >
                                        {purchasingNumber ? 'Purchasing...' : 'Buy Selected'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Generate Knowledge Base Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Generate with AI</h3>
                                <p className="text-sm text-gray-500">Let AI create your knowledge base</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    value={generateData.companyName}
                                    onChange={(e) => setGenerateData({ ...generateData, companyName: e.target.value })}
                                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                                    placeholder="e.g., Smith's Roofing"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Describe Your Business
                                </label>
                                <textarea
                                    rows={4}
                                    value={generateData.description}
                                    onChange={(e) => setGenerateData({ ...generateData, description: e.target.value })}
                                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition resize-none"
                                    placeholder="e.g., We're a roofing contractor in Miami specializing in residential repairs and new installations. We offer free estimates and 24/7 emergency service. Hourly rate starts at $75..."
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Include: services, pricing, hours, location, and any FAQs
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowGenerateModal(false);
                                    setGenerateData({ companyName: '', description: '' });
                                    setError(null);
                                }}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={generateKnowledgeBase}
                                disabled={generating || !generateData.companyName || !generateData.description}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition disabled:opacity-50"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolsSettings;
