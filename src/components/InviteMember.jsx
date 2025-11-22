import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

const InviteMember = ({ groupId }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const { sendInvitation } = useData();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Davet gönderiliyor...' });

        const result = await sendInvitation(groupId, email);

        if (result.success) {
            setStatus({ type: 'success', message: 'Davet başarıyla gönderildi!' });
            setEmail('');
            setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        } else {
            setStatus({ type: 'error', message: result.error || 'Bir hata oluştu.' });
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mt-4">
            <h3 className="text-lg font-semibold mb-3">Üye Davet Et</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-posta Adresi
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="arkadas@ornek.com"
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={status.type === 'loading'}
                    className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {status.type === 'loading' ? 'Gönderiliyor...' : 'Davet Gönder'}
                </button>

                {status.message && (
                    <div className={`text-sm p-2 rounded ${status.type === 'success' ? 'bg-green-50 text-green-700' :
                            status.type === 'error' ? 'bg-red-50 text-red-700' : 'text-gray-600'
                        }`}>
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
};

export default InviteMember;
