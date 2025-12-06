import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertiesApi } from '../../api/properties';

const ProviderDashboard = () => {
    const [stats, setStats] = useState({
        newLeads: 0,
        activeBids: 0,
        wonProjects: 0,
        profileViews: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // Mock stats for now, but fetch real leads count
            const leads = await propertiesApi.getRecentSales(1); // Last 1 month
            setStats({
                newLeads: leads.length,
                activeBids: 3, // Mock
                wonProjects: 1, // Mock
                profileViews: 12 // Mock
            });
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
                    <p className="text-gray-600">Welcome back, Pro. Here's what's happening today.</p>
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
                            <ActivityItem
                                icon="🔔"
                                text="New project posted: 'Kitchen Remodel in Miami'"
                                time="2 hours ago"
                            />
                            <ActivityItem
                                icon="💰"
                                text="Your bid for 'Roof Repair' was viewed"
                                time="5 hours ago"
                            />
                            <ActivityItem
                                icon="🏠"
                                text="15 new homeowner leads in your area"
                                time="Yesterday"
                            />
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
