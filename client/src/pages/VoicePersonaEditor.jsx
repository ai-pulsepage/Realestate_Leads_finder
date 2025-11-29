import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Wand2, Loader2, Settings, MessageSquare, Calendar } from 'lucide-react';

const VoicePersonaEditor = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('persona'); // 'persona' or 'receptionist'

    const [settings, setSettings] = useState({
        system_prompt: '',
        greeting_en: '',
        greeting_es: '',
        receptionist_config: {
            ask_email: true,
            calendar_link: '',
            sms_followup: false
        }
    });
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.user_id;

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:8080/api/admin-ai/voice-settings/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            setSettings({
                system_prompt: data.voice_settings?.system_prompt || '',
                greeting_en: data.languages?.en?.greeting || '',
                greeting_es: data.languages?.es?.greeting || '',
                receptionist_config: data.voice_settings?.receptionist_config || {
                    ask_email: true,
                    calendar_link: '',
                    sms_followup: false
                }
            });
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!description) return;
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:8080/api/admin-ai/generate-persona',
                { description, company_name: 'Biz Lead Finders' },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSettings(prev => ({
                ...prev,
                system_prompt: res.data.generated_prompt
            }));
            setMessage({ type: 'success', text: 'Persona generated! Review and save.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to generate persona.' });
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:8080/api/admin-ai/voice-settings/${userId}`, {
                system_prompt: settings.system_prompt,
                languages: {
                    en: { greeting: settings.greeting_en },
                    es: { greeting: settings.greeting_es }
                },
                receptionist_config: settings.receptionist_config
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Voice Persona Editor</h2>

            {message.text && (
                <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b mb-6">
                <button
                    className={`px-6 py-3 font-medium flex items-center ${activeTab === 'persona' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}
                    onClick={() => setActiveTab('persona')}
                >
                    <Wand2 className="mr-2" size={18} />
                    Persona & Scripts
                </button>
                <button
                    className={`px-6 py-3 font-medium flex items-center ${activeTab === 'receptionist' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}
                    onClick={() => setActiveTab('receptionist')}
                >
                    <Settings className="mr-2" size={18} />
                    Receptionist Rules
                </button>
            </div>

            {activeTab === 'persona' && (
                <>
                    {/* AI Generator */}
                    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Wand2 className="mr-2 text-purple-600" />
                            AI Persona Generator
                        </h3>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Describe your agent (e.g., 'A friendly pirate who sells mansions')"
                                className="flex-1 p-2 border rounded"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={generating || !description}
                                className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"
                            >
                                {generating ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
                                Generate
                            </button>
                        </div>
                    </div>

                    {/* Editor Form */}
                    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
                        <div>
                            <label className="block font-medium mb-2">System Prompt (The Brain)</label>
                            <textarea
                                className="w-full h-64 p-4 border rounded font-mono text-sm bg-gray-50"
                                value={settings.system_prompt}
                                onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                            />
                            <p className="text-sm text-gray-500 mt-1">Instructions for the AI on how to behave, speak, and what rules to follow.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block font-medium mb-2">Greeting (English)</label>
                                <textarea
                                    className="w-full h-24 p-3 border rounded"
                                    value={settings.greeting_en}
                                    onChange={(e) => setSettings({ ...settings, greeting_en: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-2">Greeting (Spanish)</label>
                                <textarea
                                    className="w-full h-24 p-3 border rounded"
                                    value={settings.greeting_es}
                                    onChange={(e) => setSettings({ ...settings, greeting_es: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'receptionist' && (
                <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
                    <h3 className="text-xl font-semibold mb-4">Inbound Call Rules</h3>

                    <div className="space-y-4">
                        <div className="flex items-start p-4 border rounded hover:bg-gray-50">
                            <input
                                type="checkbox"
                                className="mt-1 mr-4 h-5 w-5 text-blue-600"
                                checked={settings.receptionist_config.ask_email}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    receptionist_config: { ...settings.receptionist_config, ask_email: e.target.checked }
                                })}
                            />
                            <div>
                                <label className="font-bold block">Collect Email Address</label>
                                <p className="text-sm text-gray-600">The AI will politely ask the caller for their email address if they are interested.</p>
                            </div>
                        </div>

                        <div className="flex items-start p-4 border rounded hover:bg-gray-50">
                            <input
                                type="checkbox"
                                className="mt-1 mr-4 h-5 w-5 text-blue-600"
                                checked={settings.receptionist_config.sms_followup}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    receptionist_config: { ...settings.receptionist_config, sms_followup: e.target.checked }
                                })}
                            />
                            <div>
                                <label className="font-bold block">Send SMS Follow-up</label>
                                <p className="text-sm text-gray-600">Automatically text the caller a thank you message after the call.</p>
                            </div>
                        </div>

                        <div className="p-4 border rounded bg-gray-50">
                            <label className="font-bold block mb-2 flex items-center">
                                <Calendar className="mr-2" size={18} />
                                Calendar Booking Link
                            </label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                placeholder="https://calendly.com/your-link"
                                value={settings.receptionist_config.calendar_link}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    receptionist_config: { ...settings.receptionist_config, calendar_link: e.target.value }
                                })}
                            />
                            <p className="text-sm text-gray-500 mt-1">If provided, the AI will offer to text this link to interested leads.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-6 mt-6 border-t">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default VoicePersonaEditor;
