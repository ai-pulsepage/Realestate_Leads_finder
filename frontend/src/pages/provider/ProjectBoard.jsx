import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

/**
 * Project Board - Marketplace for Renovation Projects
 * Providers view projects and bid.
 * Homeowners (for MVP demo) can also post here.
 */
const ProjectBoard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showBidModal, setShowBidModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [filters, setFilters] = useState({ category: 'All Categories', location: 'Anywhere' });

    // Load Projects
    useEffect(() => {
        loadProjects();
    }, [filters]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.category !== 'All Categories') params.category = filters.category;
            const res = await apiClient.get('/projects', { params });
            setProjects(res.data);
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBidClick = (project) => {
        setSelectedProject(project);
        setShowBidModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Project Board</h1>
                        <p className="mt-2 text-gray-600">
                            Find active projects posted by homeowners.
                        </p>
                    </div>
                    <div className="flex space-x-4">
                        {/* Filter Controls */}
                        <select
                            className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm"
                            onChange={e => setFilters({ ...filters, category: e.target.value })}
                        >
                            <option>All Categories</option>
                            <option>Roofing</option>
                            <option>Plumbing</option>
                            <option>Remodeling</option>
                            <option>HVAC</option>
                        </select>
                        <button
                            onClick={() => setShowPostModal(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-green-700"
                        >
                            + Post New Project
                        </button>
                    </div>
                </div>

                {/* Project List */}
                <div className="grid gap-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading active projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                            <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
                            <p className="text-gray-500">Be the first to post a project!</p>
                        </div>
                    ) : (
                        projects.map((project) => (
                            <ProjectCard key={project.project_id} project={project} onBid={() => handleBidClick(project)} />
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            {showPostModal && (
                <PostProjectModal
                    onClose={() => setShowPostModal(false)}
                    onSuccess={() => { setShowPostModal(false); loadProjects(); }}
                />
            )}

            {showBidModal && selectedProject && (
                <BidModal
                    project={selectedProject}
                    onClose={() => setShowBidModal(false)}
                    onSuccess={() => { setShowBidModal(false); /* Maybe show success toast */ }}
                />
            )}
        </div>
    );
};

// Sub-components
const ProjectCard = ({ project, onBid }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center space-x-3 mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {project.category || 'General'}
                    </span>
                    <span className="text-sm text-gray-500">• Posted {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
                <p className="text-gray-600 mb-4 max-w-2xl text-sm line-clamp-2">{project.description}</p>

                <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                        <span className="mr-2">📍</span> {project.location_zip}
                    </div>
                    <div className="flex items-center">
                        <span className="mr-2">💰</span> {project.budget_range}
                    </div>
                </div>
            </div>
            <button
                onClick={onBid}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
                Submit Bid
            </button>
        </div>
    </div>
);

const PostProjectModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '', description: '', category: 'Roofing', location_zip: '', budget_range: '$1k-$5k'
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiClient.post('/projects', formData);
            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Failed to post project');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
                <h3 className="text-xl font-bold mb-4">Post a Project</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        className="w-full border p-2 rounded"
                        placeholder="Project Title (e.g. Roof Repair)"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                    <textarea
                        className="w-full border p-2 rounded h-24"
                        placeholder="Describe the work needed..."
                        required
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <select
                            className="border p-2 rounded"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option>Roofing</option>
                            <option>Plumbing</option>
                            <option>HVAC</option>
                            <option>Remodeling</option>
                        </select>
                        <input
                            className="border p-2 rounded"
                            placeholder="Zip Code"
                            required
                            value={formData.location_zip}
                            onChange={e => setFormData({ ...formData, location_zip: e.target.value })}
                        />
                    </div>
                    <input
                        className="w-full border p-2 rounded"
                        placeholder="Budget Range (e.g. $500 - $1000)"
                        required
                        value={formData.budget_range}
                        onChange={e => setFormData({ ...formData, budget_range: e.target.value })}
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
                        <button
                            disabled={submitting}
                            className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700"
                        >
                            {submitting ? 'Posting...' : 'Post Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BidModal = ({ project, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [proposal, setProposal] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiClient.post('/bids', {
                project_id: project.project_id,
                amount: parseFloat(amount),
                proposal_text: proposal
            });
            alert('Bid submitted successfully! (5 Tokens deducted)');
            onSuccess();
        } catch (err) {
            console.error(err);
            // Check for specific token error
            if (err.response?.data?.error === 'Insufficient tokens') {
                alert(`Insufficient Tokens! You need 5 tokens but have ${err.response.data.current}.`);
            } else {
                alert('Failed to submit bid.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
                <h3 className="text-xl font-bold mb-1">Submit Bid</h3>
                <p className="text-sm text-gray-500 mb-4">for {project.title} • Cost: <span className="font-bold text-orange-600">5 Tokens</span></p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Bid Amount ($)</label>
                        <input
                            type="number"
                            className="w-full border p-2 rounded"
                            placeholder="e.g. 1500.00"
                            required
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Proposal / Message</label>
                        <textarea
                            className="w-full border p-2 rounded h-32"
                            placeholder="Why are you the best fit? When can you start?"
                            required
                            value={proposal}
                            onChange={e => setProposal(e.target.value)}
                        />
                    </div>

                    <div className="bg-orange-50 p-3 rounded text-xs text-orange-800 flex items-start">
                        <span className="mr-2">⚡</span>
                        Your account will be debited 5 tokens immediately upon submission. This ensures high-quality bids for homeowners.
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
                        <button
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
                        >
                            {submitting ? 'Submitting...' : 'Confirm Bid (-5 Tokens)'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectBoard;
