import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

/**
 * My Bids - Tracks bids submitted by the provider
 */
const MyBids = () => {
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBids = async () => {
            try {
                const res = await apiClient.get('/bids/my-bids');
                setBids(res.data);
            } catch (err) {
                console.error('Failed to load bids:', err);
            } finally {
                setLoading(false);
            }
        };
        loadBids();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bids</h1>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading your bids...</div>
                ) : bids.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed">
                        <h3 className="text-lg font-medium text-gray-900">No bids yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mt-1">
                            Go to the Project Board to find work and submit your first proposal.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bids.map((bid) => (
                                    <tr key={bid.bid_id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{bid.project_title}</div>
                                            <div className="text-sm text-gray-500">Project #{bid.project_id.split('-')[0]}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">${bid.amount}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{new Date(bid.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                    bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {bid.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button className="text-blue-600 hover:text-blue-900 mr-4">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBids;
