import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Users } from 'lucide-react';

const GroupCreate = () => {
    const [name, setName] = useState('');
    const { createGroup } = useData();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const newGroup = createGroup(name);
        navigate(`/dashboard/groups/${newGroup.id}`);
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Yeni Grup Oluştur</h2>

            <div className="card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                        <Users size={48} />
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Arkadaşlarınızla maçlarınızı yönetmek için yeni bir grup oluşturun.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Grup Adı</label>
                        <input
                            type="text"
                            required
                            placeholder="Örn: Çılgınlar FC"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary" style={{ flex: 1 }}>
                            İptal
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            Oluştur
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GroupCreate;
