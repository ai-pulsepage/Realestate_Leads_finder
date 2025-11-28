import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Wand2, Save, X, Loader2 } from 'lucide-react';

const EmailTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        template_name: '',
        subject_line: '',
        html_body: '',
        category: 'outreach'
    });

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [generating, setGenerating] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.user_id;
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/email-templates/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(res.data.templates);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingTemplate) {
                await axios.put(`http://localhost:8080/api/email-templates/${editingTemplate.template_id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:8080/api/email-templates', { ...formData, user_id: userId }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            setEditingTemplate(null);
            setFormData({ template_name: '', subject_line: '', html_body: '', category: 'outreach' });
            fetchTemplates();
        } catch (err) {
            console.error(err);
            alert('Failed to save template');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await axios.delete(`http://localhost:8080/api/email-templates/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTemplates();
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt) return;
        setGenerating(true);
        try {
            const res = await axios.post('http://localhost:8080/api/email-templates/ai-assist', {
                prompt: aiPrompt,
                context: 'Real Estate Lead Outreach'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const content = res.data.generated_content;
            setFormData(prev => ({
                ...prev,
                subject_line: content.subject_line,
                html_body: content.html_body
            }));
            setShowAIModal(false);
        } catch (err) {
            console.error(err);
            alert('AI Generation Failed');
        } finally {
            setGenerating(false);
        }
    };

    const openEdit = (template) => {
        setEditingTemplate(template);
        setFormData({
            template_name: template.template_name,
            subject_line: template.subject_line,
            html_body: template.html_body,
            category: template.category
        });
        setShowModal(true);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Email Templates</h2>
                <button
                    onClick={() => { setEditingTemplate(null); setFormData({ template_name: '', subject_line: '', html_body: '', category: 'outreach' }); setShowModal(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700"
                >
                    <Plus size={20} className="mr-2" /> New Template
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                    <div key={t.template_id} className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs px-2 py-1 rounded ${t.template_type === 'system' ? 'bg-gray-200' : 'bg-blue-100 text-blue-800'}`}>
                                {t.template_type}
                            </span>
                            {t.template_type !== 'system' && (
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(t)} className="text-gray-500 hover:text-blue-600"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(t.template_id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-lg mb-1">{t.template_name}</h3>
                        <p className="text-sm text-gray-600 mb-2 truncate">{t.subject_line}</p>
                        <div className="text-xs text-gray-400">Used: {t.usage_count} times</div>
                    </div>
                ))}
            </div>

            {/* EDITOR MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Template Name</label>
                                <input
                                    className="w-full p-2 border rounded"
                                    value={formData.template_name}
                                    onChange={e => setFormData({ ...formData, template_name: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Subject Line</label>
                                    <input
                                        className="w-full p-2 border rounded"
                                        value={formData.subject_line}
                                        onChange={e => setFormData({ ...formData, subject_line: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={() => setShowAIModal(true)}
                                    className="bg-purple-100 text-purple-700 px-3 py-2 rounded border border-purple-200 hover:bg-purple-200 flex items-center h-[42px]"
                                >
                                    <Wand2 size={18} className="mr-2" /> AI Assist
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email Body (HTML)</label>
                                <textarea
                                    className="w-full h-64 p-2 border rounded font-mono text-sm"
                                    value={formData.html_body}
                                    onChange={e => setFormData({ ...formData, html_body: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Supported variables: {'{{first_name}}'}, {'{{company_name}}'}</p>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSave}
                                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center"
                                >
                                    <Save size={18} className="mr-2" /> Save Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI MODAL */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center"><Wand2 className="mr-2 text-purple-600" /> AI Writer</h3>
                        <textarea
                            className="w-full h-32 p-2 border rounded mb-4"
                            placeholder="Describe the email you want (e.g., 'Follow up with a lead who is interested in Miami condos')"
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAIModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                            <button
                                onClick={handleGenerateAI}
                                disabled={generating || !aiPrompt}
                                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"
                            >
                                {generating ? <Loader2 className="animate-spin mr-2" /> : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailTemplates;
