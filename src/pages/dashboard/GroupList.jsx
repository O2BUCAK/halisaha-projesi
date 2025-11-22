import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Users, ArrowRight, Plus } from 'lucide-react';

const GroupList = () => {
    const { getMyGroups, joinGroup } = useData();
    const myGroups = getMyGroups();
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');

    const handleJoin = (e) => {
        e.preventDefault();
        setError('');
        const result = joinGroup(joinCode);
        if (result.success) {
            setJoinCode('');
            // Refresh or show success? The list updates automatically via context
        } else {
            setError(result.error);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.8rem' }}>Gruplarım</h2>
                <Link to="/dashboard/groups/create" className="btn btn-primary">
                    <Plus size={18} /> Yeni Grup
                </Link>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleJoin} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Grup Katılım Kodu</label>
                        <input
                            type="text"
                            placeholder="Kodu buraya girin..."
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-secondary">Katıl</button>
                </form>
                {error && <p style={{ color: 'var(--accent-danger)', marginTop: '0.5rem', fontSize: '0.875rem' }}>{error}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {myGroups.length > 0 ? (
                    myGroups.map(group => (
                        <Link key={group.id} to={`/dashboard/groups/${group.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div style={{ padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
                                    <Users size={24} />
                                </div>
                                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }}>
                                    {group.members.length} Üye
                                </span>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{group.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: '600' }}>
                                Detaylar <ArrowRight size={16} />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                        Henüz bir gruba üye değilsiniz.
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupList;
