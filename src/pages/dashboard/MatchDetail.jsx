import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Save, Users, UserPlus, Video, FileText, ExternalLink, Hand, Share2, Star } from 'lucide-react';

import TacticalBoard from '../../components/TacticalBoard';

const MatchDetail = () => {
    const { matchId } = useParams();
    const { matches, groups, finishMatch, getUsersDetails, updateMatchTeams, fetchMatch, fetchGroup, givePlayerRating } = useData();
    const { currentUser } = useAuth();
    const contextMatch = matches.find(m => m.id === matchId);
    const contextGroup = contextMatch ? groups.find(g => g.id === contextMatch.groupId) : null;

    const [fetchedMatch, setFetchedMatch] = useState(null);
    const [fetchedGroup, setFetchedGroup] = useState(null);
    // If we don't have the match in context, we need to load it.
    const [loading, setLoading] = useState(!contextMatch && !!matchId);

    const match = contextMatch || fetchedMatch;
    const group = contextGroup || fetchedGroup;

    // Fetch match/group data if not in context
    useEffect(() => {
        if (!contextMatch && matchId) {
            setLoading(true);
            const loadData = async () => {
                // 1. Fetch Match
                const m = await fetchMatch(matchId);
                if (m) {
                    setFetchedMatch(m);
                    // 2. Fetch Group if not in context
                    // Try to find group in context first (unlikely if match wasn't there, but possible if subscription was slow)
                    const gInContext = groups.find(g => g.id === m.groupId);
                    if (gInContext) {
                        setFetchedGroup(gInContext); // Should ideally rely on contextGroup logic, but this is safe
                    } else {
                        const g = await fetchGroup(m.groupId);
                        setFetchedGroup(g);
                    }
                }
                setLoading(false);
            };
            loadData();
        }
    }, [matchId, contextMatch]);

    const [scoreA, setScoreA] = useState(match?.score?.a || 0);
    const [scoreB, setScoreB] = useState(match?.score?.b || 0);

    // Squad State
    const [teamA, setTeamA] = useState(match?.teamA || []);
    const [teamB, setTeamB] = useState(match?.teamB || []);
    const [teamAName, setTeamAName] = useState(match?.teamAName || 'Takım A');
    const [teamBName, setTeamBName] = useState(match?.teamBName || 'Takım B');

    // Media & Content State
    const [videoUrl, setVideoUrl] = useState(match?.videoUrl || '');
    const [matchSummary, setMatchSummary] = useState(match?.matchSummary || '');

    // Stats State: { playerId: { goals: 0, assists: 0 } }
    const [playerStats, setPlayerStats] = useState(match?.stats || {});

    const [isEditing, setIsEditing] = useState(match?.status !== 'played');
    const [memberDetails, setMemberDetails] = useState([]);

    useEffect(() => {
        if (match) {
            setScoreA(match.score?.a || 0);
            setScoreB(match.score?.b || 0);
            setTeamA(match.teamA || []);
            setTeamB(match.teamB || []);
            setTeamAName(match.teamAName || 'Takım A');
            setTeamBName(match.teamBName || 'Takım B');
            setVideoUrl(match.videoUrl || '');
            setMatchSummary(match.matchSummary || '');
            setPlayerStats(match.stats || {});
            setIsEditing(match.status !== 'played');
        }
    }, [match]);

    useEffect(() => {
        const fetchMembers = async () => {
            if (group && group.members) {
                const details = await getUsersDetails(group.members);
                setMemberDetails(details);
            }
        };
        fetchMembers();
    }, [group?.members]);

    if (loading) return <div>Yükleniyor...</div>;
    if (!match || !group) return <div>Maç bulunamadı.</div>;

    // Combine all available players and sort alphabetically
    const currentUserId = currentUser ? String(currentUser.uid || currentUser.id) : null;
    const isAdmin = currentUser && (group.admins || [group.createdBy]).includes(currentUserId);

    // Check if current user is already in the details list
    const isCurrentUserInDetails = currentUserId && memberDetails.some(m => String(m.id) === currentUserId);

    let effectiveMemberDetails = [...memberDetails];

    // Force add current user if they are creator OR member, and not in details
    if (currentUser && !isCurrentUserInDetails && group.members?.includes(currentUserId)) {
        effectiveMemberDetails.push({
            id: currentUserId,
            name: currentUser.name || currentUser.displayName || 'Siz',
            ...currentUser
        });
    }

    const allPlayers = [
        ...effectiveMemberDetails.map(m => ({
            id: m.id,
            name: String(m.id) === currentUserId ? `${m.name} (Sen)` : m.name
        })),
        ...(group.guestPlayers || [])
    ].sort((a, b) => (a.name || 'Unknown').localeCompare(b.name || 'Unknown', 'tr'));

    const handleStatChange = (playerId, type, value) => {
        setPlayerStats(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [type]: parseInt(value) || 0
            }
        }));
    };

    const togglePlayerTeam = (player, team) => {
        if (team === 'A') {
            if (teamA.find(p => p.id === player.id)) {
                setTeamA(teamA.filter(p => p.id !== player.id));
            } else {
                setTeamA([...teamA, { ...player, isGoalkeeper: false }]); // Default to not GK
                setTeamB(teamB.filter(p => p.id !== player.id)); // Remove from B if exists
            }
        } else {
            if (teamB.find(p => p.id === player.id)) {
                setTeamB(teamB.filter(p => p.id !== player.id));
            } else {
                setTeamB([...teamB, { ...player, isGoalkeeper: false }]); // Default to not GK
                setTeamA(teamA.filter(p => p.id !== player.id)); // Remove from A if exists
            }
        }
    };

    const toggleGoalkeeper = (player, team) => {
        if (team === 'A') {
            setTeamA(teamA.map(p =>
                p.id === player.id ? { ...p, isGoalkeeper: !p.isGoalkeeper } : p
            ));
        } else {
            setTeamB(teamB.map(p =>
                p.id === player.id ? { ...p, isGoalkeeper: !p.isGoalkeeper } : p
            ));
        }
    };

    const handleSave = () => {
        finishMatch(matchId, parseInt(scoreA), parseInt(scoreB), playerStats, teamA, teamB, teamAName, teamBName, videoUrl, matchSummary);
        setIsEditing(false);
    };

    const handleTacticalSave = async (newTeamA, newTeamB) => {
        setTeamA(newTeamA);
        setTeamB(newTeamB);
        // Persist immediate changes for tactical board
        const result = await updateMatchTeams(matchId, newTeamA, newTeamB);
        if (result.success) {
            alert('Taktik/Pozisyonlar kaydedildi!');
        } else {
            alert('Kaydedilirken hata oluştu.');
        }
    };

    // Rating Logic
    const ratings = match?.ratings || {};

    // Check if current user is a player in the match (Auth user only)
    const isPlayerInMatch = currentUser && (
        teamA.some(p => p.id === (currentUser.uid || currentUser.id)) ||
        teamB.some(p => p.id === (currentUser.uid || currentUser.id))
    );

    const getPlayerRatingData = (playerId) => {
        const playerRatings = ratings[playerId] || {};
        const votes = Object.values(playerRatings);
        if (votes.length === 0) return { average: '-', count: 0 };
        const sum = votes.reduce((a, b) => a + b, 0);
        return { average: (sum / votes.length).toFixed(1), count: votes.length };
    };

    const getMyVote = (playerId) => {
        if (!currentUser) return '';
        const playerRatings = ratings[playerId] || {};
        return playerRatings[currentUser.uid || currentUser.id] || '';
    };

    const handleRate = async (playerId, score) => {
        if (!currentUser) return;
        const result = await givePlayerRating(matchId, playerId, parseInt(score));
        if (!result.success) {
            // alert(result.error);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            {/* Scoreboard */}
            <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2rem 1rem' }}>
                <h2 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{match.venue}</h2>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {new Date(match.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {' '}
                    {new Date(match.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <button
                    onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Maç bağlantısı kopyalandı! Bu linki arkadaşlarınızla paylaşabilirsiniz.');
                    }}
                    className="btn btn-secondary"
                    style={{ margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Share2 size={16} /> Paylaş
                </button>

                {/* Video Link Display (Only if exists and not editing) */}
                {!isEditing && videoUrl && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Video size={18} /> Maç Videosunu İzle <ExternalLink size={14} />
                        </a>
                    </div>
                )}

                {/* Video Link Input (Editing) */}
                {isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                        <Video size={18} color="var(--text-secondary)" />
                        <input
                            type="url"
                            placeholder="Maç Videosu Linki (YouTube vb.)"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        {isEditing ? (
                            <input
                                type="text"
                                value={teamAName}
                                onChange={(e) => setTeamAName(e.target.value)}
                                style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-primary)', textAlign: 'center', width: '100%', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                        ) : (
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>{teamAName}</h3>
                        )}
                        {isEditing ? (
                            <input
                                type="number"
                                value={scoreA}
                                onChange={(e) => setScoreA(e.target.value)}
                                style={{ width: '80px', fontSize: '2rem', textAlign: 'center', padding: '0.5rem' }}
                            />
                        ) : (
                            <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{scoreA}</div>
                        )}
                    </div>

                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>-</div>

                    <div style={{ textAlign: 'center', flex: 1 }}>
                        {isEditing ? (
                            <input
                                type="text"
                                value={teamBName}
                                onChange={(e) => setTeamBName(e.target.value)}
                                style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-secondary)', textAlign: 'center', width: '100%', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            />
                        ) : (
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-secondary)' }}>{teamBName}</h3>
                        )}
                        {isEditing ? (
                            <input
                                type="number"
                                value={scoreB}
                                onChange={(e) => setScoreB(e.target.value)}
                                style={{ width: '80px', fontSize: '2rem', textAlign: 'center', padding: '0.5rem' }}
                            />
                        ) : (
                            <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{scoreB}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Match Summary Section */}
            {(matchSummary || isEditing) && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} /> Maç Özeti & Değerlendirme
                    </h3>
                    {isEditing ? (
                        <textarea
                            placeholder="Maç hakkında notlar, değerlendirmeler, önemli anlar..."
                            value={matchSummary}
                            onChange={(e) => setMatchSummary(e.target.value)}
                            style={{
                                width: '100%',
                                minHeight: '150px',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                resize: 'vertical',
                                lineHeight: '1.5',
                                fontFamily: 'inherit'
                            }}
                        />
                    ) : (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                            {matchSummary}
                        </div>
                    )}
                </div>
            )}

            {/* Tactical Board */}
            <div style={{ marginBottom: '2rem' }}>
                <TacticalBoard match={{ teamA, teamB }} group={group} onSave={isAdmin ? handleTacticalSave : undefined} readOnly={!isAdmin} />
            </div>

            {/* Squad Selection (Only visible when editing) */}
            {isEditing && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} /> Kadro Seçimi
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {allPlayers.map(player => {
                            const inA = teamA.find(p => p.id === player.id);
                            const inB = teamB.find(p => p.id === player.id);

                            return (
                                <div key={player.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'var(--bg-primary)',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <span style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {player.name}
                                        {(inA?.isGoalkeeper || inB?.isGoalkeeper) && <Hand size={14} fill="gold" color="gold" />}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button
                                            onClick={() => togglePlayerTeam(player, 'A')}
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                background: inA ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                                color: inA ? '#000' : 'inherit',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            A
                                        </button>
                                        <button
                                            onClick={() => togglePlayerTeam(player, 'B')}
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                background: inB ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)',
                                                color: inB ? '#000' : 'inherit',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            B
                                        </button>
                                        {(inA || inB) && (
                                            <button
                                                onClick={() => toggleGoalkeeper(player, inA ? 'A' : 'B')}
                                                style={{
                                                    padding: '0.25rem',
                                                    borderRadius: '4px',
                                                    background: (inA?.isGoalkeeper || inB?.isGoalkeeper) ? '#FFD700' : 'rgba(255,255,255,0.2)', // Increased contrast
                                                    color: (inA?.isGoalkeeper || inB?.isGoalkeeper) ? '#000' : 'var(--text-primary)', // Brighter text when inactive
                                                    border: '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginLeft: '4px' // Added margin
                                                }}
                                                title="Kaleci Yap"
                                            >
                                                <Hand size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Player Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Team A Stats */}
                <div className="card">
                    <h3 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{teamAName} İstatistikleri</h3>
                    {teamA.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Oyuncu seçilmedi.</p>}
                    {teamA.map(player => (
                        <div key={player.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {player.name}
                                {player.isGoalkeeper && <Hand size={14} fill="gold" color="gold" />}
                            </span>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Gol</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            min="0"
                                            value={playerStats[player.id]?.goals || 0}
                                            onChange={(e) => handleStatChange(player.id, 'goals', e.target.value)}
                                            style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}
                                        />
                                    ) : (
                                        <span style={{ fontWeight: 'bold' }}>{playerStats[player.id]?.goals || 0}</span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Asist</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            min="0"
                                            value={playerStats[player.id]?.assists || 0}
                                            onChange={(e) => handleStatChange(player.id, 'assists', e.target.value)}
                                            style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}
                                        />
                                    ) : (
                                        <span style={{ fontWeight: 'bold' }}>{playerStats[player.id]?.assists || 0}</span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Kurtarış</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            min="0"
                                            value={playerStats[player.id]?.saves || 0}
                                            onChange={(e) => handleStatChange(player.id, 'saves', e.target.value)}
                                            style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}
                                        />
                                    ) : (
                                        <span style={{ fontWeight: 'bold' }}>{playerStats[player.id]?.saves || 0}</span>
                                    )}
                                </div>
                                {/* Rating Column */}
                                <div style={{ marginLeft: '1rem', minWidth: '80px', textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Puan</label>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                                            {getPlayerRatingData(player.id).average}
                                        </span>
                                        <Star size={12} fill="var(--accent-primary)" color="var(--accent-primary)" />
                                        {/* Vote Input */}
                                        {isPlayerInMatch && player.id !== (currentUser.uid || currentUser.id) && !isEditing && (
                                            <select
                                                value={getMyVote(player.id)}
                                                onChange={(e) => handleRate(player.id, e.target.value)}
                                                style={{
                                                    marginLeft: '4px',
                                                    width: '40px',
                                                    padding: '2px',
                                                    fontSize: '0.8rem',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <option value="">-</option>
                                                {[...Array(10)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Team B Stats */}
                <div className="card">
                    <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{teamBName} İstatistikleri</h3>
                    {teamB.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Oyuncu seçilmedi.</p>}
                    {teamB.map(player => (
                        <div key={player.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {player.name}
                                {player.isGoalkeeper && <Hand size={14} fill="gold" color="gold" />}
                            </span>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Gol</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            min="0"
                                            value={playerStats[player.id]?.goals || 0}
                                            onChange={(e) => handleStatChange(player.id, 'goals', e.target.value)}
                                            style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}
                                        />
                                    ) : (
                                        <span style={{ fontWeight: 'bold' }}>{playerStats[player.id]?.goals || 0}</span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Asist</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            min="0"
                                            value={playerStats[player.id]?.assists || 0}
                                            onChange={(e) => handleStatChange(player.id, 'assists', e.target.value)}
                                            style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}
                                        />
                                    ) : (
                                        <span style={{ fontWeight: 'bold' }}>{playerStats[player.id]?.assists || 0}</span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Kurtarış</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            min="0"
                                            value={playerStats[player.id]?.saves || 0}
                                            onChange={(e) => handleStatChange(player.id, 'saves', e.target.value)}
                                            style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}
                                        />
                                    ) : (
                                        <span style={{ fontWeight: 'bold' }}>{playerStats[player.id]?.saves || 0}</span>
                                    )}
                                </div>
                                {/* Rating Column */}
                                <div style={{ marginLeft: '1rem', minWidth: '80px', textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-secondary)' }}>Puan</label>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                                            {getPlayerRatingData(player.id).average}
                                        </span>
                                        <Star size={12} fill="var(--accent-primary)" color="var(--accent-primary)" />
                                        {/* Vote Input */}
                                        {isPlayerInMatch && player.id !== (currentUser.uid || currentUser.id) && !isEditing && (
                                            <select
                                                value={getMyVote(player.id)}
                                                onChange={(e) => handleRate(player.id, e.target.value)}
                                                style={{
                                                    marginLeft: '4px',
                                                    width: '40px',
                                                    padding: '2px',
                                                    fontSize: '0.8rem',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                <option value="">-</option>
                                                {[...Array(10)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isEditing ? (
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button onClick={handleSave} className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
                        <Save size={20} /> Maçı Bitir ve Kaydet
                    </button>
                </div>
            ) : (
                isAdmin && (
                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button onClick={() => setIsEditing(true)} className="btn btn-secondary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
                            Düzenle / İstatistik Gir
                        </button>
                    </div>
                )
            )}
        </div>
    );
};

export default MatchDetail;
