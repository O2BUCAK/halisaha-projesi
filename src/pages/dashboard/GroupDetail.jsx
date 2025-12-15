import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { toTitleCase } from '../../utils';
import InviteMember from '../../components/InviteMember';
import { Users, Calendar, Plus, Copy, Check, UserPlus, Trophy, Play, Square, Mail, Trash2, Shield, ShieldAlert, Video, FileText, X, Save, Hash, Share2, Link2 } from 'lucide-react';
import AdSenseBanner from '../../components/AdSenseBanner';

const GroupDetail = () => {
    const { groupId } = useParams();
    const {
        groups, getGroupMatches, addGuestMember, startSeason, endSeason,
        getSeasonStats, getAllTimeStats, assignMatchToSeason, removeMember,
        removeGuestMember, addAdmin, removeAdmin, getUsersDetails,
        fetchGroup, sendJoinRequest, getJoinRequests, respondToJoinRequest,
        updateGroupJerseyNumbers, mergeGuestToUser
    } = useData();
    const { currentUser } = useAuth();
    const [fetchedGroup, setFetchedGroup] = useState(null);
    const [joinRequests, setJoinRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary'); // summary, matches, members, requests
    const [statType, setStatType] = useState('players'); // players, goalkeepers
    const [joinStatus, setJoinStatus] = useState(null); // null, success, error
    const [copied, setCopied] = useState(false);
    const [showAddGuest, setShowAddGuest] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestError, setGuestError] = useState('');
    const [seasonName, setSeasonName] = useState('');
    const [showStartSeason, setShowStartSeason] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [memberDetails, setMemberDetails] = useState([]);
    const [jerseyMap, setJerseyMap] = useState({});
    const [isEditingJersey, setIsEditingJersey] = useState(false);

    // Guest Merge State
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [selectedGuestForMerge, setSelectedGuestForMerge] = useState(null);
    const [selectedMemberForMerge, setSelectedMemberForMerge] = useState('');
    const [selectedSeasonId, setSelectedSeasonId] = useState('active');

    // Use group from context if available (member), otherwise use fetched group (public)
    const contextGroup = groups.find(g => g.id === groupId);
    const group = contextGroup || fetchedGroup;

    // Determine if user is a member
    const isMember = group?.members?.includes(currentUser?.uid || currentUser?.id);
    const isAdmin = group && (group.admins || [group.createdBy]).includes(currentUser?.uid || currentUser?.id);

    const [loading, setLoading] = useState(!contextGroup); // Initial loading if not in context

    useEffect(() => {
        // If not found in context (not a member), fetch it
        if (!contextGroup && groupId) {
            setLoading(true);
            const loadGroup = async () => {
                const g = await fetchGroup(groupId);
                setFetchedGroup(g);
                setLoading(false);
            };
            loadGroup();
        } else {
            setLoading(false);
        }
    }, [groupId, contextGroup]);

    useEffect(() => {
        if (isAdmin) {
            const loadRequests = async () => {
                setRequestsLoading(true);
                const reqs = await getJoinRequests(groupId);
                setJoinRequests(reqs);
                setRequestsLoading(false);
            };
            loadRequests();
        }
    }, [isAdmin, groupId]);

    useEffect(() => {
        if (group) {
            setJerseyMap(group.jerseyNumbers || {});
        }
    }, [group]);

    useEffect(() => {
        if (group?.members) {
            const loadMembers = async () => {
                const details = await getUsersDetails(group.members);
                setMemberDetails(details);
            };
            loadMembers();
        }
    }, [group?.members]);

    useEffect(() => {
        if (group?.activeSeasonId) {
            setSelectedSeasonId(group.activeSeasonId);
        } else {
            setSelectedSeasonId('all-time');
        }
    }, [group?.activeSeasonId]);

    const handleJoinRequest = async () => {
        setJoinStatus('loading');
        const result = await sendJoinRequest(groupId);
        if (result.success) {
            setJoinStatus('success');
        } else {
            setJoinStatus('error');
            alert(result.error);
        }
    };

    const handleRequestResponse = async (req, status) => {
        await respondToJoinRequest(req.id, status, groupId, req.userId);
        // Refresh list locally
        setJoinRequests(prev => prev.filter(r => r.id !== req.id));
    };

    if (loading) return <div className="p-4 text-center">Yükleniyor...</div>;
    if (!group) return <div className="p-4 text-center">Grup bulunamadı veya erişim izniniz yok.</div>;

    // Remove blocking view for non-members
    // if (!isMember && !isAdmin) { ... }

    // Sort members alphabetically
    const sortedMembers = [...memberDetails].sort((a, b) =>
        (a.name || 'Unknown').localeCompare(b.name || 'Unknown', 'tr')
    );

    // Sort guests alphabetically
    const sortedGuests = [...(group.guestPlayers || [])].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'tr')
    );

    const activeSeason = group.activeSeasonId
        ? group.seasons?.find(s => s.id === group.activeSeasonId)
        : null;

    // Determine which stats to show based on selection
    const displayedStats = selectedSeasonId === 'all-time'
        ? getAllTimeStats(groupId)
        : getSeasonStats(groupId, selectedSeasonId);

    // Sort logic for displayedStats based on statType
    const sortedStats = [...displayedStats].sort((a, b) => {
        if (statType === 'goalkeepers') {
            // Sort by clean sheets desc, then saves desc
            if (b.cleanSheets !== a.cleanSheets) return (b.cleanSheets || 0) - (a.cleanSheets || 0);
            return (b.saves || 0) - (a.saves || 0);
        }
        // Default players: Goals desc
        return b.goals - a.goals;
    });

    // Filter matches based on selection and sort by date (oldest first) using string comparison
    const displayedMatches = getGroupMatches(groupId).filter(m => {
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

    const handleJerseyChange = (userId, number) => {
        setJerseyMap(prev => ({ ...prev, [userId]: number }));
    };

    const saveJerseyNumbers = async () => {
        await updateGroupJerseyNumbers(groupId, jerseyMap);
        setIsEditingJersey(false);
    };

    const handleOpenMergeModal = (guest) => {
        setSelectedGuestForMerge(guest);
        setShowMergeModal(true);
        setSelectedMemberForMerge('');
    };

    const handleMergeGuest = async () => {
        if (!selectedGuestForMerge || !selectedMemberForMerge) return;

        if (window.confirm(`${selectedGuestForMerge.name} adlı misafir oyuncuyu, seçilen üyeyle eşleştirmek istiyor musunuz? Bu işlem geri alınamaz ve tüm geçmiş istatistikler aktarılacaktır.`)) {
            const result = await mergeGuestToUser(groupId, selectedGuestForMerge.id, selectedMemberForMerge);
            if (result.success) {
                alert('Eşleştirme başarılı!');
                setShowMergeModal(false);
                setSelectedGuestForMerge(null);
                // Refresh happens automatically via Snapshot
            } else {
                alert(result.error);
            }
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="responsive-header">
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{group.name}</h2>
                    <div className="responsive-header-content">
                        <div className="flex-center" style={{ gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Katılım Kodu:</span>
                            <code style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{group.joinCode}</code>
                            <button onClick={copyCode} style={{ marginLeft: '0.5rem', color: copied ? 'var(--accent-success)' : 'var(--text-secondary)' }} title="Kopyala">
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Grup bağlantısı kopyalandı! Bu linki arkadaşlarınızla paylaşabilirsiniz.');
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            title="Paylaş"
                        >
                            <Share2 size={18} /> Paylaş
                        </button>
                        {/* Join Button for Non-Members */}
                        {!isMember && (
                            currentUser ? (
                                joinStatus === 'success' ? (
                                    <div className="text-green-500 text-sm font-bold">İstek Gönderildi</div>
                                ) : (
                                    <button onClick={handleJoinRequest} className="btn btn-primary" disabled={joinStatus === 'loading'} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                                        {joinStatus === 'loading' ? '...' : 'Gruba Katıl'}
                                    </button>
                                )
                            ) : (
                                <Link to="/login" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>Gruba Katıl</Link>
                            )
                        )}
                    </div>
                </div>
                {isMember && (
                    <Link to={`/dashboard/groups/${groupId}/matches/create`} className="btn btn-primary">
                        <Plus size={18} /> Maç Oluştur
                    </Link>
                )}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                            {selectedSeasonId === 'all-time' ? 'Genel İstatistikler (Tüm Zamanlar)' : 'Sezon İstatistikleri'}
                        </h4>
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
                            <button
                                onClick={() => setStatType('players')}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: statType === 'players' ? 'var(--accent-primary)' : 'transparent',
                                    color: statType === 'players' ? 'white' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}>
                                Oyuncular
                            </button>
                            <button
                                onClick={() => setStatType('goalkeepers')}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: statType === 'goalkeepers' ? 'var(--accent-primary)' : 'transparent',
                                    color: statType === 'goalkeepers' ? 'white' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}>
                                Kaleciler
                            </button>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>Oyuncu</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Maç</th>
                                {statType === 'players' ? (
                                    <>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Gol</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Asist</th>
                                    </>
                                ) : (
                                    <>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Kurtarış</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Gol Yememe</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStats.length > 0 ? (
                                sortedStats.map((stat, index) => (
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
                                            {(() => {
                                                const member = memberDetails.find(m => m.id === stat.id);
                                                // Prefer member name (from live profile), fallback to stat name (historical/guest)
                                                return member ? (member.name || member.nickname) : stat.name;
                                            })()}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{stat.matches}</td>
                                        {statType === 'players' ? (
                                            <>
                                                <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{stat.goals}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{stat.assists}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{stat.saves || 0}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{stat.cleanSheets || 0}</td>
                                            </>
                                        )}
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

            <div className="responsive-grid-2-1">
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
                        {isAdmin && (
                            <div className="flex gap-2">
                                <button onClick={() => setShowInvite(!showInvite)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                    <Mail size={16} /> Davet Et
                                </button>
                                <button onClick={() => setShowAddGuest(!showAddGuest)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                    <UserPlus size={16} /> Misafir Ekle
                                </button>
                                {isEditingJersey ? (
                                    <button onClick={saveJerseyNumbers} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--accent-success)' }}>
                                        <Save size={16} /> Kaydet
                                    </button>
                                ) : (
                                    <button onClick={() => setIsEditingJersey(true)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                        <Hash size={16} /> Forma No
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {showInvite && <InviteMember groupId={groupId} />}

                    {showAddGuest && (
                        <form onSubmit={handleAddGuest} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Misafir Oyuncu Adı"
                                value={guestName}
                                onChange={(e) => setGuestName(toTitleCase(e.target.value))}
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
                                            {currentUser && member.id === currentUser.id ? `${member.name} (Sen)` : member.name}
                                            {isMemberAdmin && <Shield size={14} color="gold" fill="gold" />}
                                            {/* Jersey Number Display / Edit */}
                                            {isEditingJersey ? (
                                                <input
                                                    type="text"
                                                    value={jerseyMap[member.id] || ''}
                                                    onChange={(e) => handleJerseyChange(member.id, e.target.value)}
                                                    placeholder="#"
                                                    style={{ width: '40px', padding: '2px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                />
                                            ) : (
                                                (jerseyMap[member.id] || group.jerseyNumbers?.[member.id]) && (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                        #{jerseyMap[member.id] || group.jerseyNumbers?.[member.id]}
                                                    </span>
                                                )
                                            )}
                                        </span>
                                    </div>

                                    {isAdmin && (
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                            {currentUser && member.id !== currentUser.id && (
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
                                <span style={{ marginLeft: '0.5rem' }}>
                                    {isEditingJersey ? (
                                        <input
                                            type="text"
                                            value={jerseyMap[guest.id] || ''}
                                            onChange={(e) => handleJerseyChange(guest.id, e.target.value)}
                                            placeholder="#"
                                            style={{ width: '40px', padding: '2px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        (jerseyMap[guest.id] || group.jerseyNumbers?.[guest.id]) && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                #{jerseyMap[guest.id] || group.jerseyNumbers?.[guest.id]}
                                            </span>
                                        )
                                    )}
                                </span>
                                {isAdmin && (
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleOpenMergeModal(guest)}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                                            title="Üyeyle Eşleştir"
                                        >
                                            <Link2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveGuest(guest.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                            title="Misafiri Sil"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isAdmin && joinRequests.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserPlus size={20} /> Katılma İstekleri
                    </h3>
                    <div className="card">
                        {joinRequests.map(req => (
                            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{req.userName}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.userEmail}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => handleRequestResponse(req, 'approved')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', background: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>
                                        <Check size={16} /> Onayla
                                    </button>
                                    <button onClick={() => handleRequestResponse(req, 'rejected')} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}>
                                        <X size={16} /> Reddet
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Merge Modal */}
            {showMergeModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Misafiri Üyeyle Eşleştir</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            <strong>{selectedGuestForMerge?.name}</strong> adlı misafir oyuncunun tüm istatistiklerini aşağıdaki üyeye aktar:
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Üye Seçin</label>
                            <select
                                value={selectedMemberForMerge}
                                onChange={(e) => setSelectedMemberForMerge(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                            >
                                <option value="">Bir üye seçin...</option>
                                {memberDetails.map(m => (
                                    <option key={m.id} value={m.id}>{m.name || m.nickname} ({m.email})</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowMergeModal(false)} className="btn btn-secondary">İptal</button>
                            <button onClick={handleMergeGuest} className="btn btn-primary" disabled={!selectedMemberForMerge}>Eşleştir</button>
                        </div>
                    </div>
                </div>
            )}

            <AdSenseBanner />
        </div>
    );
};

export default GroupDetail;
