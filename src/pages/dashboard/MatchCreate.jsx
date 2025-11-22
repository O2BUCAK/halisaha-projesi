import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Calendar, MapPin, Clock } from 'lucide-react';

const MatchCreate = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { createMatch } = useData();

    // Custom Date State
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [hour, setHour] = useState('');
    const [minute, setMinute] = useState('00');

    const [venue, setVenue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!day || !month || !year || !hour || !minute || !venue) return;

        // Format: YYYY-MM-DDTHH:mm
        const formattedMonth = month.toString().padStart(2, '0');
        const formattedDay = day.toString().padStart(2, '0');
        const fullDate = `${year}-${formattedMonth}-${formattedDay}T${hour}:${minute}`;

        createMatch(groupId, fullDate, venue, [], []);
        navigate(`/dashboard/groups/${groupId}`);
    };

    // Generate options
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = [
        { value: 1, label: 'Ocak' }, { value: 2, label: 'Şubat' }, { value: 3, label: 'Mart' },
        { value: 4, label: 'Nisan' }, { value: 5, label: 'Mayıs' }, { value: 6, label: 'Haziran' },
        { value: 7, label: 'Temmuz' }, { value: 8, label: 'Ağustos' }, { value: 9, label: 'Eylül' },
        { value: 10, label: 'Ekim' }, { value: 11, label: 'Kasım' }, { value: 12, label: 'Aralık' }
    ];
    const years = [2024, 2025, 2026];
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Maç Planla</h2>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tarih</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={day}
                                onChange={(e) => setDay(e.target.value)}
                                required
                                style={{ flex: 1 }}
                            >
                                <option value="">Gün</option>
                                {days.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                required
                                style={{ flex: 2 }}
                            >
                                <option value="">Ay</option>
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>

                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                required
                                style={{ flex: 1 }}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Saat</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Clock size={20} style={{ color: 'var(--text-secondary)' }} />
                            <select
                                value={hour}
                                onChange={(e) => setHour(e.target.value)}
                                required
                                style={{ flex: 1 }}
                            >
                                <option value="">Saat</option>
                                {hours.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <span style={{ fontWeight: 'bold' }}>:</span>
                            <select
                                value={minute}
                                onChange={(e) => setMinute(e.target.value)}
                                required
                                style={{ flex: 1 }}
                            >
                                {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Halı Saha / Mekan</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={20} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)', zIndex: 10 }} />
                            <input
                                type="text"
                                required
                                placeholder="Örn: Yıldız Halı Saha"
                                value={venue}
                                onChange={(e) => setVenue(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary" style={{ flex: 1 }}>
                            İptal
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            Planla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MatchCreate;
