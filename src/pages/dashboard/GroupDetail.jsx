import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import InviteMember from '../../components/InviteMember';
import { Users, Calendar, Plus, Copy, Check, UserPlus, Trophy, Play, Square, Mail, Trash2, Shield, ShieldAlert, Video, FileText } from 'lucide-react';

const GroupDetail = () => {
    const { groupId } = useParams();
    const { groups, getGroupMatches, addGuestMember, startSeason, endSeason, getSeasonStats, getAllTimeStats, assignMatchToSeason, removeMember, removeGuestMember, addAdmin, removeAdmin, getUsersDetails } = useData();
    const { currentUser } = useAuth();
    const [copied, setCopied] = useState(false);
    const [showAddGuest, setShowAddGuest] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestError, setGuestError] = useState('');
    const [seasonName, setSeasonName] = useState('');
    const [showStartSeason, setShowStartSeason] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [memberDetails, setMemberDetails] = useState([]);

    const group = groups.find(g => g.id === groupId);
    const matches = getGroupMatches(groupId);

    useEffect(() => {
        const fetchMembers = async () => {
            if (group && group.members) {
                const details = await getUsersDetails(group.members);
                setMemberDetails(details);
            }
        };
        fetchMembers();
    }, [group?.members]); // Re-fetch if members change

    if (!group) return <div>Grup bulunamadı.</div>;

    const isAdmin = (group.admins || [group.createdBy]).includes(currentUser.uid || currentUser.id);

    // Sort members alphabetically
    const sortedMembers = [...memberDetails].sort((a, b) =>
        (a.name || 'Unknown').localeCompare(b.name || 'Unknown', 'tr')
    );

    // Sort guests alphabetically
    const sortedGuests = [...(group.guestPlayers || [])].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'tr')
    );

    const [selectedSeasonId, setSelectedSeasonId] = useState('active');

    useEffect(() => {
        if (group?.activeSeasonId) {
            setSelectedSeasonId(group.activeSeasonId);
        } else {
            setSelectedSeasonId('all-time');
        }
    }, [group?.activeSeasonId]);

    const activeSeason = group.activeSeasonId
        ? group.seasons?.find(s => s.id === group.activeSeasonId)
        : null;

    // Determine which stats to show based on selection
    const displayedStats = selectedSeasonId === 'all-time'
        ? getAllTimeStats(groupId)
        : getSeasonStats(groupId, selectedSeasonId);

    // Filter matches based on selection and sort by date (oldest first)
    const displayedMatches = matches.filter(m => {
        if (selectedSeasonId === 'all-time') return true;
        return m.seasonId === selectedSeasonId;
    }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const copyCode = () => {
        navigator.clipboard.writeText(group.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddGuest = async (e) => {
        e.preventDefault();
        if (guestName.trim()) {
            const result = await addGuestMember(groupId, guestName.trim());
            if (result.success) {
                setGuestName('');
                setGuestError('');
                setShowAddGuest(false);
            } else {
                setGuestError(result.error);
            }
        }
    };

    const handleStartSeason = (e) => {
        e.preventDefault();
        if (!isAdmin) return;
        if (seasonName.trim()) {
            startSeason(groupId, seasonName.trim());
            setSeasonName('');
            setShowStartSeason(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!isAdmin) return;
        if (window.confirm('Bu üyeyi gruptan çıkarmak istediğinize emin misiniz?')) {
            await removeMember(groupId, memberId);
        }
    };

    const handleRemoveGuest = async (guestId) => {
        if (!isAdmin) return;
        if (window.confirm('Bu misafir oyuncuyu silmek istediğinize emin misiniz?')) {
            await removeGuestMember(groupId, guestId);
        }
    };

    const handleToggleAdmin = async (memberId, isCurrentAdmin) => {
        if (!isAdmin) return;
        if (isCurrentAdmin) {
            if (window.confirm('Bu kişinin yöneticiliğini almak istediğinize emin misiniz?')) {
                await removeAdmin(groupId, memberId);
            }
        } else {
            if (window.confirm('Bu kişiyi yönetici yapmak istediğinize emin misiniz?')) {
                await addAdmin(groupId, memberId);
            }
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{group.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="flex-center" style={{ gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Katılım Kodu:</span>
                            <code style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{group.joinCode}</code>
                            <button onClick={copyCode} style={{ marginLeft: '0.5rem', color: copied ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
                <Link to={`/dashboard/groups/${groupId}/matches/create`} className="btn btn-primary">
                    <Plus size={18} /> Maç Oluştur
                </Link>
            </div>

            {/* Season Section */}
            <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Trophy size={20} color="var(--accent-secondary)" />
                            Sezon:
                        </h3>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                            style={{
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem'
                            }}
                        >
                            {activeSeason && (
                                <option value={activeSeason.id}>
                                    Aktif: {activeSeason.name}
                                </option>
                            )}
                            <option value="all-time">Tüm Zamanlar</option>
                            {(group.seasons || []).filter(s => s.id !== group.activeSeasonId && s.status === 'completed').length > 0 && (
                                <optgroup label="Geçmiş Sezonlar">
                                    {(group.seasons || [])
                                        .filter(s => s.id !== group.activeSeasonId && s.status === 'completed')
                                        .map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))
                                    }
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div>
                        {activeSeason && selectedSeasonId === activeSeason.id ? (
                            isAdmin && (
                                <button onClick={() => endSeason(groupId)} className="btn btn-secondary" style={{ color: '#ff4444', borderColor: '#ff4444' }}>
                                    <Square size={16} fill="#ff4444" /> Sezonu Bitir
                                </button>
                            )
                        ) : (
                            !showStartSeason && isAdmin && !activeSeason && (
                                <button onClick={() => setShowStartSeason(true)} className="btn btn-primary">
                                    <Play size={16} /> Sezon Başlat
                                </button>
                            )
                        )}
                    </div>
                </div>

                {showStartSeason && (
                    <form onSubmit={handleStartSeason} style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Sezon Adı (Örn: Kış 2025)"
                            value={seasonName}
                            onChange={(e) => setSeasonName(e.target.value)}
                            style={{ flex: 1 }}
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary">Başlat</button>
                        <button type="button" onClick={() => setShowStartSeason(false)} className="btn btn-secondary">İptal</button>
                    </form>
                )}

                {/* Stats Table */}
                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        {selectedSeasonId === 'all-time' ? 'Genel İstatistikler (Tüm Zamanlar)' : 'Sezon İstatistikleri'}
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>Oyuncu</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Maç</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Gol</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Asist</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedStats.length > 0 ? (
                                displayedStats.map((stat, index) => (
                                    <tr key={stat.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                background: index === 0 ? 'gold' : (index === 1 ? 'silver' : (index === 2 ? '#cd7f32' : 'var(--bg-primary)')),
                                                color: index < 3 ? 'black' : 'var(--text-secondary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold'
                                            }}>
                                                {index + 1}
                                            </span>
                                            {stat.name}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{stat.matches}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{stat.goals}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{stat.assists}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        Henüz istatistik oluşmadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Matches Section */}
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} /> Maçlar
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {displayedMatches.length > 0 ? (
                            displayedMatches.map(match => (
                                <div key={match.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            {new Date(match.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            {' '}
                                            {new Date(match.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {match.venue}
                                            {match.videoUrl && <Video size={14} color="var(--accent-primary)" />}
                                            {match.matchSummary && <FileText size={14} color="var(--accent-secondary)" />}
                                        </div>
                                        {match.seasonId ? (
                                            <span style={{ fontSize: '0.7rem', background: 'var(--accent-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'white' }}>Sezon Maçı</span>
                                        ) : (
                                            activeSeason && (
                                                <button
                                                    onClick={() => assignMatchToSeason(match.id, activeSeason.id)}
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        background: 'transparent',
                                                        border: '1px solid var(--accent-primary)',
                                                        color: 'var(--accent-primary)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        marginTop: '0.25rem'
                                                    }}
                                                >
                                                    + {activeSeason.name} Ekle
                                                </button>
                                            )
                                        )}
                                    </div>

                                    {match.status === 'played' ? (
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                                            {match.score.a} - {match.score.b}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '0.25rem 0.75rem', background: 'rgba(255, 165, 0, 0.1)', color: 'orange', borderRadius: '1rem', fontSize: '0.875rem' }}>
                                            Planlandı
                                        </div>
                                    )}

                                    <Link to={`/dashboard/matches/${match.id}`} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                                        Detay
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                Henüz maç oluşturulmamış.
                            </div>
                        )}
                    </div>
                </div>

                {/* Members Section */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={20} /> Üyeler
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setShowInvite(!showInvite)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                <Mail size={16} /> Davet Et
                            </button>
                            <button onClick={() => setShowAddGuest(!showAddGuest)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                <UserPlus size={16} /> Misafir Ekle
                            </button>
                        </div>
                    </div>

                    {showInvite && <InviteMember groupId={groupId} />}

                    {showAddGuest && (
                        <form onSubmit={handleAddGuest} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Misafir Oyuncu Adı"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                style={{ marginBottom: '0.5rem' }}
                                autoFocus
                            />
                            {guestError && <div className="text-red-500 text-sm mb-2">{guestError}</div>}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>Kaydet</button>
                        </form>
                    )}

                    <div className="card" style={{ padding: '0' }}>
                        {sortedMembers.map((member, index) => {
                            const isMemberAdmin = (group.admins || [group.createdBy]).includes(member.id);
                            return (
                                <div key={member.id} style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                        {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {member.id === currentUser.id ? `${member.name} (Sen)` : member.name}
                                            {isMemberAdmin && <Shield size={14} color="gold" fill="gold" />}
                                        </span>
                                    </div>

                                    {isAdmin && (
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                            {member.id !== currentUser.id && (
                                                <button
                                                    onClick={() => handleToggleAdmin(member.id, isMemberAdmin)}
                                                    style={{ background: 'none', border: 'none', color: isMemberAdmin ? 'gold' : 'var(--text-secondary)', cursor: 'pointer' }}
                                                    title={isMemberAdmin ? "Yöneticiliği Al" : "Yönetici Yap"}
                                                >
                                                    {isMemberAdmin ? <ShieldAlert size={16} /> : <Shield size={16} />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                title="Üyeyi Çıkar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {sortedGuests.map((guest, index) => (
                            <div key={guest.id} style={{
                                padding: '1rem',
                                borderBottom: index !== sortedGuests.length - 1 ? '1px solid var(--border-color)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    M
                                </div>
                                <span>{guest.name} (Misafir)</span>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleRemoveGuest(guest.id)}
                                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                        title="Misafiri Sil"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupDetail;
