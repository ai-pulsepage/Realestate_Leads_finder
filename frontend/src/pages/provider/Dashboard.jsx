import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertiesApi } from '../../api/properties';
import apiClient from '../../api/client';

const ProviderDashboard = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        newLeads: 0,
        activeBids: 0,
        wonProjects: 0,
        profileViews: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        // Get user from localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch (e) {
                console.error('Error parsing user');
            }
        }
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // Fetch real data from APIs
            const [leadsRes, bidsRes, projectsRes] = await Promise.allSettled([
                propertiesApi.getRecentSales(1),
                apiClient.get('/bids/my-bids'),
                apiClient.get('/projects')
            ]);

            const leads = leadsRes.status === 'fulfilled' ? leadsRes.value : [];
            const bids = bidsRes.status === 'fulfilled' ? bidsRes.value.data?.bids || [] : [];
            const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.data?.projects || [] : [];

            const activeBids = bids.filter(b => b.status === 'pending' || b.status === 'submitted').length;
            const wonProjects = bids.filter(b => b.status === 'accepted').length;

            setStats({
                newLeads: leads.length,
                activeBids: activeBids,
                wonProjects: wonProjects,
                profileViews: Math.floor(Math.random() * 20) + 5 // Placeholder until analytics implemented
            });
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const userName = user?.full_name || user?.email?.split('@')[0] || 'Pro';

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {userName}. Here's what's happening today.</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="New Leads (30 Days)"
                        value={loading ? '...' : stats.newLeads}
                        icon="🏠"
                        color="blue"
                        link="/provider/leads"
                    />
                    <StatCard
                        title="Active Bids"
                        value={stats.activeBids}
                        icon="📝"
                        color="yellow"
                        link="/provider/bids"
                    />
                    <StatCard
                        title="Won Projects"
                        value={stats.wonProjects}
                        icon="🏆"
                        color="green"
                        link="/provider/projects"
                    />
                    <StatCard
                        title="Profile Views"
                        value={stats.profileViews}
                        icon="👀"
                        color="purple"
                        link="/provider/profile"
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Activity / Notifications */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                        <div className="space-y-4">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity, index) => (
                                    <ActivityItem
                                        key={index}
                                        icon={activity.icon || "🔔"}
                                        text={activity.text}
                                        time={activity.time}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>No recent activity</p>
                                    <p className="text-sm mt-1">New leads and project updates will appear here</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 text-center">
                            <Link to="/provider/projects" className="text-blue-600 font-medium hover:text-blue-700">
                                View Project Board &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* Tools Shortcut */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Tools & Marketing</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <ToolShortcut
                                title="AI Receptionist"
                                desc="Manage call forwarding"
                                icon="🤖"
                                link="/provider/tools"
                            />
                            <ToolShortcut
                                title="Email Marketing"
                                desc="Send campaigns"
                                icon="📧"
                                link="/provider/tools"
                            />
                            <ToolShortcut
                                title="My Profile"
                                desc="Update portfolio"
                                icon="user"
                                link="/provider/profile"
                            />
                            <ToolShortcut
                                title="Token Wallet"
                                desc="Balance: 500"
                                icon="🪙"
                                link="/provider/tools"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, link }) => (
    <Link to={link} className="block bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-${color}-100 text-2xl`}>
                {icon}
            </div>
            <span className="text-gray-400 text-sm">View &rarr;</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-500">{title}</div>
    </Link>
);

const ActivityItem = ({ icon, text, time }) => (
    <div className="flex items-start space-x-3 pb-3 border-b border-gray-50 last:border-0">
        <div className="text-xl">{icon}</div>
        <div>
            <p className="text-gray-800 text-sm font-medium">{text}</p>
            <p className="text-gray-500 text-xs">{time}</p>
        </div>
    </div>
);

const ToolShortcut = ({ title, desc, icon, link }) => (
    <Link to={link} className="block p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
        <div className="flex items-center space-x-3 mb-2">
            <span className="text-xl">{icon === 'user' ? '👤' : icon}</span>
            <span className="font-bold text-gray-900">{title}</span>
        </div>
        <p className="text-xs text-gray-500">{desc}</p>
    </Link>
);

export default ProviderDashboard;
