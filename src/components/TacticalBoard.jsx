import React, { useState, useRef, useEffect } from 'react';

const TacticalBoard = ({ match, group, onSave }) => {
    const [players, setPlayers] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('teamA');
    const containerRef = useRef(null);

    useEffect(() => {
        if (!match) return;

        // Initialize players with saved positions or default positions
        const teamAPlayers = (match.teamA || []).map(p => ({
            ...p,
            team: 'teamA',
            x: p.x || 20,
            y: p.y || 50,
            color: p.isGoalkeeper ? '#FFD700' : 'var(--accent-primary)', // Gold for GK
            number: group?.jerseyNumbers?.[p.id] || null
        }));

        const teamBPlayers = (match.teamB || []).map(p => ({
            ...p,
            team: 'teamB',
            x: p.x || 80,
            y: p.y || 50,
            color: p.isGoalkeeper ? '#FFD700' : 'var(--accent-secondary)', // Gold for GK
            number: group?.jerseyNumbers?.[p.id] || null
        }));

        setPlayers([...teamAPlayers, ...teamBPlayers]);
    }, [match]);

    const handleDragStart = (e, playerId) => {
        e.dataTransfer.setData('text/plain', playerId);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const playerId = e.dataTransfer.getData('text/plain');
        const container = containerRef.current.getBoundingClientRect();

        const x = ((e.clientX - container.left) / container.width) * 100;
        const y = ((e.clientY - container.top) / container.height) * 100;

        setPlayers(prev => prev.map(p =>
            p.id === playerId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
        ));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleSave = () => {
        // Separate back into teams with new coords
        const teamAUpdates = players.filter(p => p.team === 'teamA');
        const teamBUpdates = players.filter(p => p.team === 'teamB');
        onSave(teamAUpdates, teamBUpdates);
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Taktik Tahtası</h3>
                <button onClick={handleSave} className="btn btn-primary">Kaydet</button>
            </div>

            <div
                ref={containerRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                    width: '100%',
                    aspectRatio: '1.6',
                    background: '#2e7d32', // Grass green
                    borderRadius: '8px',
                    position: 'relative',
                    border: '2px solid white',
                    overflow: 'hidden'
                }}
            >
                {/* Field Markings */}
                <div style={{ // Center line
                    position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.5)', transform: 'translateX(-50%)'
                }} />
                <div style={{ // Center circle
                    position: 'absolute', left: '50%', top: '50%', width: '20%', paddingBottom: '20%', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%', transform: 'translate(-50%, -50%)'
                }} />

                {/* Players */}
                {players.map(p => (
                    <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        style={{
                            position: 'absolute',
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: 'move',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            zIndex: 10
                        }}
                    >
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: p.color,
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', color: 'white',
                            fontSize: '0.8rem'
                        }}>
                            {p.number || p.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{
                            fontSize: '0.7rem', color: 'white',
                            textShadow: '0 1px 2px black',
                            background: 'rgba(0,0,0,0.4)',
                            padding: '2px 4px', borderRadius: '4px',
                            marginTop: '4px',
                            whiteSpace: 'nowrap'
                        }}>
                            {p.name}
                        </span>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Oyuncuları sürükleyip bırakarak pozisyonlarını ayarlayın.
            </div>
        </div>
    );
};

export default TacticalBoard;
