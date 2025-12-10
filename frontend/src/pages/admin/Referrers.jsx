import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Copy, ExternalLink, Users, DollarSign, TrendingUp, MoreVertical, Pause, Play, Trash2 } from 'lucide-react';
import apiClient from '../../api/client';

const Referrers = () => {
    const [referrers, setReferrers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newReferrer, setNewReferrer] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        commission_percent: 10,
        notes: ''
    });
    const [creating, setCreating] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    useEffect(() => {
        loadReferrers();
    }, [statusFilter, searchQuery]);

    const loadReferrers = async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await apiClient.get(`/admin/referrers?${params}`);
            setReferrers(response.data.referrers);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error loading referrers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReferrer = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const response = await apiClient.post('/admin/referrers', newReferrer);
            setReferrers([response.data.referrer, ...referrers]);
            setShowCreateModal(false);
            setNewReferrer({ name: '', email: '', phone: '', company: '', commission_percent: 10, notes: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create referrer');
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(`https://app.bizleadfinders.com/signup?ref=${code}`);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const toggleStatus = async (referrer) => {
        const newStatus = referrer.status === 'active' ? 'paused' : 'active';
        try {
            await apiClient.put(`/admin/referrers/${referrer.referrer_id}`, { status: newStatus });
            loadReferrers();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Referral Partners</h1>
                        <p className="text-gray-600">Manage your affiliate and referral network</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add Referrer
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Referrers"
                        value={stats.total_referrers || 0}
                        subtitle={`${stats.active_referrers || 0} active`}
                        icon={Users}
                        color="purple"
                    />
                    <StatCard
                        title="Total Signups"
                        value={stats.total_signups || 0}
                        subtitle="From referrals"
                        icon={TrendingUp}
                        color="blue"
                    />
                    <StatCard
                        title="Commission Earned"
                        value={`$${parseFloat(stats.total_commission_earned || 0).toFixed(2)}`}
                        subtitle="All time"
                        icon={DollarSign}
                        color="green"
                    />
                    <StatCard
                        title="Pending Payouts"
                        value={`$${parseFloat(stats.pending_payouts || 0).toFixed(2)}`}
                        subtitle="Awaiting payment"
                        icon={DollarSign}
                        color="orange"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>

                {/* Referrers Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signups</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : referrers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No referrers found. Click "Add Referrer" to create one.
                                    </td>
                                </tr>
                            ) : (
                                referrers.map((referrer) => (
                                    <tr key={referrer.referrer_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{referrer.name}</div>
                                                <div className="text-sm text-gray-500">{referrer.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                                                    {referrer.referral_code}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(referrer.referral_code)}
                                                    className="p-1 text-gray-400 hover:text-purple-600"
                                                    title="Copy referral link"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                {copiedCode === referrer.referral_code && (
                                                    <span className="text-xs text-green-600">Copied!</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{referrer.signup_count || referrer.total_signups}</div>
                                            <div className="text-xs text-gray-500">{referrer.active_count || 0} active</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-green-600">
                                                ${parseFloat(referrer.total_commission_earned || 0).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-orange-600">
                                                ${parseFloat(referrer.pending_commission || 0).toFixed(2)} pending
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${referrer.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    referrer.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {referrer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/admin/referrers/${referrer.referrer_id}`}
                                                    className="p-1 text-gray-400 hover:text-purple-600"
                                                    title="View details"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => toggleStatus(referrer)}
                                                    className="p-1 text-gray-400 hover:text-blue-600"
                                                    title={referrer.status === 'active' ? 'Pause' : 'Activate'}
                                                >
                                                    {referrer.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Create Referrer Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Referrer</h2>
                            <form onSubmit={handleCreateReferrer} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newReferrer.name}
                                        onChange={(e) => setNewReferrer({ ...newReferrer, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="John Smith"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={newReferrer.email}
                                        onChange={(e) => setNewReferrer({ ...newReferrer, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={newReferrer.phone}
                                            onChange={(e) => setNewReferrer({ ...newReferrer, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={newReferrer.commission_percent}
                                            onChange={(e) => setNewReferrer({ ...newReferrer, commission_percent: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={newReferrer.company}
                                        onChange={(e) => setNewReferrer({ ...newReferrer, company: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={newReferrer.notes}
                                        onChange={(e) => setNewReferrer({ ...newReferrer, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        {creating ? 'Creating...' : 'Create Referrer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorClasses = {
        purple: 'bg-purple-100 text-purple-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
            <div className="text-sm text-gray-500">{title}</div>
            {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </div>
    );
};

export default Referrers;
