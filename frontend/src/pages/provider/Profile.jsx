import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

const Profile = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        business_name: '',
        phone: '',
        website: '',
        bio: '',
        license_number: '',
        service_area_radius_miles: 25,
        trades: [],
        service_zip_codes: []
    });

    // Mock User ID for demo (in real app, get from auth context)
    const USER_ID = 'provider_123';

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            // In a real app, we'd use the logged-in user's ID
            // For now, we'll just try to fetch or default to empty
            const response = await apiClient.get(`/profiles/${USER_ID}`).catch(() => null);
            if (response && response.data) {
                setFormData({
                    ...formData,
                    ...response.data
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTradeChange = (trade) => {
        setFormData(prev => {
            const trades = prev.trades || [];
            if (trades.includes(trade)) {
                return { ...prev, trades: trades.filter(t => t !== trade) };
            } else {
                return { ...prev, trades: [...trades, trade] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await apiClient.put(`/profiles/${USER_ID}`, formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Error saving profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setSaving(false);
        }
    };

    const TRADES_LIST = [
        'Roofing', 'Plumbing', 'Electrical', 'HVAC',
        'Landscaping', 'General Contractor', 'Painting', 'Flooring'
    ];

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header / Logo Section */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-6">
                        <div className="h-24 w-24 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 text-2xl font-bold shadow-sm">
                            {formData.business_name ? formData.business_name.charAt(0) : 'Logo'}
                        </div>
                        <div>
                            <button className="text-sm text-blue-600 font-medium hover:text-blue-800">Upload New Logo</button>
                            <p className="text-xs text-gray-500 mt-1">Recommended: 400x400px, PNG or JPG</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                                <input
                                    type="text"
                                    name="business_name"
                                    value={formData.business_name}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    placeholder="e.g. Joe's Roofing"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                                <input
                                    type="text"
                                    name="license_number"
                                    value={formData.license_number}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    placeholder="e.g. CGC1500000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Bio</label>
                            <textarea
                                rows={4}
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="Tell customers about your experience and services..."
                            />
                        </div>

                        {/* Trades */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Trades & Specialties</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {TRADES_LIST.map(trade => (
                                    <label key={trade} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(formData.trades || []).includes(trade)}
                                            onChange={() => handleTradeChange(trade)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{trade}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Service Area */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Service Radius (Miles)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    name="service_area_radius_miles"
                                    min="5"
                                    max="100"
                                    step="5"
                                    value={formData.service_area_radius_miles}
                                    onChange={handleChange}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-bold text-gray-900 w-16 text-right">
                                    {formData.service_area_radius_miles} mi
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
