import React, { useState, useEffect } from 'react';
import { Users, Gift, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        referrers: { total: 0, active: 0 },
        signups: { total: 0, thisMonth: 0 },
        commissions: { total: 0, pending: 0 },
        revenue: { total: 0, thisMonth: 0 }
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Load referrer stats
            const referrersRes = await apiClient.get('/admin/referrers');
            const refStats = referrersRes.data.stats;

            setStats({
                referrers: {
                    total: refStats.total_referrers || 0,
                    active: refStats.active_referrers || 0
                },
                signups: {
                    total: refStats.total_signups || 0,
                    thisMonth: 0 // TODO: Add monthly tracking
                },
                commissions: {
                    total: parseFloat(refStats.total_commission_earned || 0),
                    pending: parseFloat(refStats.pending_payouts || 0)
                },
                revenue: {
                    total: 0, // TODO: Add revenue tracking
                    thisMonth: 0
                }
            });

            // Get recent referrers as "activity"
            setRecentActivity(referrersRes.data.referrers?.slice(0, 5) || []);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600">Overview of your referral and commission system</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Referrers"
                        value={stats.referrers.total}
                        subtitle={`${stats.referrers.active} active`}
                        icon={Users}
                        color="purple"
                        link="/admin/referrers"
                    />
                    <StatCard
                        title="Referred Signups"
                        value={stats.signups.total}
                        subtitle="All time"
                        icon={TrendingUp}
                        color="blue"
                        link="/admin/referrers"
                    />
                    <StatCard
                        title="Commission Earned"
                        value={`$${stats.commissions.total.toFixed(2)}`}
                        subtitle="Total paid to referrers"
                        icon={DollarSign}
                        color="green"
                        link="/admin/commissions"
                    />
                    <StatCard
                        title="Pending Payouts"
                        value={`$${stats.commissions.pending.toFixed(2)}`}
                        subtitle="Awaiting payment"
                        icon={AlertCircle}
                        color="orange"
                        link="/admin/commissions"
                    />
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <ActionButton
                                label="Add Referrer"
                                icon="👤"
                                href="/admin/referrers"
                            />
                            <ActionButton
                                label="Create Coupon"
                                icon="🎫"
                                href="/admin/coupons"
                            />
                            <ActionButton
                                label="Process Payouts"
                                icon="💰"
                                href="/admin/commissions"
                            />
                            <ActionButton
                                label="View Analytics"
                                icon="📊"
                                href="/admin/analytics"
                            />
                        </div>
                    </div>

                    {/* Recent Referrers */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Referrers</h2>
                        {recentActivity.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No referrers yet</p>
                        ) : (
                            <div className="space-y-3">
                                {recentActivity.map((ref) => (
                                    <div key={ref.referrer_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="font-medium text-gray-900">{ref.name}</div>
                                            <div className="text-sm text-gray-500">Code: {ref.referral_code}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-green-600">
                                                {ref.total_signups || 0} signups
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${ref.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {ref.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, link }) => {
    const colorClasses = {
        purple: 'bg-purple-100 text-purple-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    return (
        <a href={link} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-gray-400 text-sm">View →</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
            <div className="text-sm text-gray-500">{title}</div>
            {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </a>
    );
};

const ActionButton = ({ label, icon, href }) => (
    <a
        href={href}
        className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-purple-50 hover:border-purple-200 border border-gray-100 transition-colors"
    >
        <span className="text-2xl">{icon}</span>
        <span className="font-medium text-gray-700">{label}</span>
    </a>
);

export default AdminDashboard;
