import React, { useState } from 'react';
import apiClient from '../api/client';

const Waitlist = () => {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        role: 'homeowner',
        consent_given: false
    });
    const [status, setStatus] = useState('idle'); // idle, submitting, success, error

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            await apiClient.post('/waitlist', formData);
            setStatus('success');
            setTimeout(() => {
                setShowModal(false);
                setStatus('idle');
                setFormData({ full_name: '', email: '', role: 'homeowner', consent_given: false });
            }, 3000);
        } catch (error) {
            console.error('Waitlist error:', error);
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80')] opacity-10 bg-cover bg-center"></div>
                <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                        The Growth Engine for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                            Real Estate Professionals
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                        Serving <strong>Miami-Dade County</strong>. Expanding to Broward & Palm Beach in <strong>Spring 2026</strong>.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold py-4 px-10 rounded-full shadow-lg transform transition hover:scale-105"
                    >
                        Join the Waitlist
                    </button>
                </div>
            </section>

            {/* The Problem */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl font-bold mb-6 text-slate-900">Stop Chasing. Start Closing.</h2>
                            <p className="text-lg text-gray-600 mb-6">
                                The old way is broken. Messy spreadsheets, missed calls, and guessing property values are costing you money.
                            </p>
                            <p className="text-lg text-gray-600">
                                <strong>BizLeadFinders</strong> connects data, AI, and automation into a single powerhouse platform.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                            <div className="space-y-4">
                                <div className="flex items-center p-4 bg-red-50 rounded-lg text-red-700">
                                    <span className="mr-3">❌</span> Missed 5 calls while on a roof
                                </div>
                                <div className="flex items-center p-4 bg-red-50 rounded-lg text-red-700">
                                    <span className="mr-3">❌</span> Bought a lead list that was 6 months old
                                </div>
                                <div className="flex items-center p-4 bg-emerald-50 rounded-lg text-emerald-700 font-bold">
                                    <span className="mr-3">✅</span> AI Assistant booked 3 jobs automatically
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* For Contractors */}
            <section className="py-24 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm">The Pro Suite</span>
                        <h2 className="text-4xl font-bold mt-2">For Service Contractors</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        <FeatureCard
                            icon="🤖"
                            title="AI Virtual Assistant"
                            desc="Never miss a lead. Our AI answers calls, schedules appointments, and qualifies homeowners 24/7."
                        />
                        <FeatureCard
                            icon="🎯"
                            title="Lead Generation"
                            desc="Target new homeowners with equity. Get verified phone numbers instantly with built-in Skip Tracing."
                        />
                        <FeatureCard
                            icon="📧"
                            title="Marketing Automation"
                            desc="Send professional campaigns in seconds. Import your own lists or use our fresh data."
                        />
                        <FeatureCard
                            icon="⭐"
                            title="Reputation Management"
                            desc="Showcase your work and collect Google Reviews automatically after every job."
                        />
                    </div>
                </div>
            </section>

            {/* For Investors */}
            <section className="py-24 bg-slate-900 text-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-emerald-400 font-bold tracking-wider uppercase text-sm">The SAAS Model</span>
                        <h2 className="text-4xl font-bold mt-2">For Real Estate Investors</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                            <div className="text-4xl mb-4">🧠</div>
                            <h3 className="text-xl font-bold mb-3">Smart Intent</h3>
                            <p className="text-gray-400">We analyze Lis Pendens, Tax Liens, and Code Violations to predict who is ready to sell.</p>
                        </div>
                        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-xl font-bold mb-3">True Data</h3>
                            <p className="text-gray-400">Access appraised values, legal data, and equity calculations you can actually trust.</p>
                        </div>
                        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                            <div className="text-4xl mb-4">🛠️</div>
                            <h3 className="text-xl font-bold mb-3">Power Tools</h3>
                            <p className="text-gray-400">House Flipping Calculators, FSBO Scrapers, and integrated Skip Tracing.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-24 bg-blue-600 text-white text-center">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-4xl font-bold mb-6">Ready to grow your business?</h2>
                    <p className="text-xl text-blue-100 mb-10">Join the waitlist today to get early access when we launch in Spring 2026.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-white text-blue-600 text-lg font-bold py-4 px-10 rounded-full shadow-lg hover:bg-gray-100 transition"
                    >
                        Get Early Access
                    </button>
                </div>
            </section>

            {/* Waitlist Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>

                        {status === 'success' ? (
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">🎉</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h3>
                                <p className="text-gray-600">We'll be in touch soon.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Join the Waitlist</h3>
                                <p className="text-gray-600 mb-6">Be the first to know when we launch.</p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                                        <select
                                            className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="homeowner">Homeowner</option>
                                            <option value="provider">Service Contractor</option>
                                            <option value="investor">Real Estate Investor</option>
                                        </select>
                                    </div>

                                    <div className="flex items-start mt-4">
                                        <input
                                            id="consent"
                                            type="checkbox"
                                            required
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                                            checked={formData.consent_given}
                                            onChange={e => setFormData({ ...formData, consent_given: e.target.checked })}
                                        />
                                        <label htmlFor="consent" className="ml-2 block text-xs text-gray-500">
                                            I agree to receive updates and marketing emails from BizLeadFinders. You can unsubscribe at any time.
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={status === 'submitting'}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 mt-6"
                                    >
                                        {status === 'submitting' ? 'Joining...' : 'Join Waitlist'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mr-4">
            {icon}
        </div>
        <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{desc}</p>
        </div>
    </div>
);

export default Waitlist;
