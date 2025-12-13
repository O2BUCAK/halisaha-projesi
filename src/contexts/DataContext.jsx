import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    getDocs,
    getDoc,
    serverTimestamp
} from 'firebase/firestore';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [groups, setGroups] = useState([]);
    const [matches, setMatches] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]); // New state for admin view
    const [loading, setLoading] = useState(true);

    // Subscribe to user's groups
    useEffect(() => {
        if (!currentUser) {
            setGroups([]);
            setMatches([]);
            setLoading(false);
            return;
        }

        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where("members", "array-contains", currentUser.uid || currentUser.id));

        const unsubscribeGroups = onSnapshot(q, (snapshot) => {
            const groupsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setGroups(groupsData);
            setLoading(false);
        });

        return () => unsubscribeGroups();
    }, [currentUser]);

    // Subscribe to user's invitations
    useEffect(() => {
        if (!currentUser) {
            setInvitations([]);
            return;
        }

        const invitationsRef = collection(db, 'invitations');
        const q = query(
            invitationsRef,
            where("email", "==", currentUser.email),
            where("status", "==", "pending")
        );

        const unsubscribeInvitations = onSnapshot(q, (snapshot) => {
            const invitationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInvitations(invitationsData);
        });

        return () => unsubscribeInvitations();
    }, [currentUser]);

    // Subscribe to matches for the groups the user is in
    useEffect(() => {
        if (groups.length === 0) {
            setMatches([]);
            return;
        }

        const groupIds = groups.map(g => g.id);
        // Firestore 'in' query is limited to 10 items. 
        // For now, we'll just subscribe to matches collection and filter client-side or 
        // if the app grows, we'd need a better structure (e.g. subcollections).
        // A simple approach for this scale: query matches where groupId is in the list.
        // If > 10 groups, we might need multiple queries or a different strategy.
        // Let's assume < 10 groups for now or just fetch all matches (not ideal but works for MVP).

        // Better MVP approach: Query matches for EACH group separately? No, too many listeners.
        // Let's try the 'in' query if groups < 10.

        let unsubscribeMatches = () => { };

        if (groupIds.length > 0 && groupIds.length <= 10) {
            const matchesRef = collection(db, 'matches');
            const q = query(matchesRef, where("groupId", "in", groupIds));

            unsubscribeMatches = onSnapshot(q, (snapshot) => {
                const matchesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMatches(matchesData);
            });
        } else if (groupIds.length > 10) {
            // Fallback: Fetch all matches (or optimize later)
            // For this project, it's unlikely a single user is in > 10 active groups.
            // We will just take the first 10 for now to avoid errors.
            const matchesRef = collection(db, 'matches');
            const q = query(matchesRef, where("groupId", "in", groupIds.slice(0, 10)));

            unsubscribeMatches = onSnapshot(q, (snapshot) => {
                const matchesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMatches(matchesData);
            });
        }

        return () => unsubscribeMatches();
    }, [groups]);

    const createGroup = async (name) => {
        if (!currentUser) return;

        const newGroup = {
            name,
            createdBy: currentUser.uid || currentUser.id,
            members: [currentUser.uid || currentUser.id],
            admins: [currentUser.uid || currentUser.id],
            guestPlayers: [],
            joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            activeSeasonId: null,
            seasons: [],
            createdAt: serverTimestamp()
        };

        try {
            const docRef = await addDoc(collection(db, 'groups'), newGroup);
            return { ...newGroup, id: docRef.id };
        } catch (error) {
            console.error("Error creating group:", error);
            throw error;
        }
    };

    const joinGroup = async (code) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };

        try {
            const groupsRef = collection(db, 'groups');
            const q = query(groupsRef, where("joinCode", "==", code));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return { success: false, error: 'Geçersiz kod' };
            }

            const groupDoc = querySnapshot.docs[0];
            const groupData = groupDoc.data();

            if (groupData.members.includes(currentUser.uid || currentUser.id)) {
                return { success: false, error: 'Zaten üyesiniz' };
            }

            await updateDoc(doc(db, 'groups', groupDoc.id), {
                members: arrayUnion(currentUser.uid || currentUser.id)
            });

            return { success: true, group: { id: groupDoc.id, ...groupData } };
        } catch (error) {
            console.error("Error joining group:", error);
            return { success: false, error: 'Bir hata oluştu' };
        }
    };

    const addGuestMember = async (groupId, guestName) => {
        try {
            const group = groups.find(g => g.id === groupId);
            if (group && group.guestPlayers) {
                const exists = group.guestPlayers.some(p => p.name.toLowerCase() === guestName.toLowerCase());
                if (exists) {
                    return { success: false, error: 'Bu isimde bir misafir oyuncu zaten var.' };
                }
            }

            const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const newGuest = { id: guestId, name: guestName };

            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                guestPlayers: arrayUnion(newGuest)
            });

            return { success: true, guest: newGuest };
        } catch (error) {
            console.error("Error adding guest:", error);
            return { success: false, error: 'Bir hata oluştu.' };
        }
    };

    const removeGuestMember = async (groupId, guestId) => {
        try {
            const group = groups.find(g => g.id === groupId);
            if (!group) return { success: false, error: 'Grup bulunamadı' };

            const updatedGuests = (group.guestPlayers || []).filter(p => p.id !== guestId);

            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                guestPlayers: updatedGuests
            });

            return { success: true };
        } catch (error) {
            console.error("Error removing guest:", error);
            return { success: false, error: 'Bir hata oluştu.' };
        }
    };



    const removeMember = async (groupId, memberId) => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                members: arrayRemove(memberId),
                admins: arrayRemove(memberId) // Also remove from admins if they leave
            });
            return { success: true };
        } catch (error) {
            console.error("Error removing member:", error);
            return { success: false, error: 'Bir hata oluştu.' };
        }
    };

    const addAdmin = async (groupId, memberId) => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                admins: arrayUnion(memberId)
            });
            return { success: true };
        } catch (error) {
            console.error("Error adding admin:", error);
            return { success: false, error: 'Bir hata oluştu.' };
        }
    };

    const removeAdmin = async (groupId, memberId) => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                admins: arrayRemove(memberId)
            });
            return { success: true };
        } catch (error) {
            console.error("Error removing admin:", error);
            return { success: false, error: 'Bir hata oluştu.' };
        }
    };

    const getUsersDetails = async (userIds) => {
        if (!userIds || userIds.length === 0) return [];
        try {
            const userPromises = userIds.map(id => getDoc(doc(db, 'users', id)));
            const userSnapshots = await Promise.all(userPromises);
            return userSnapshots.map(snap => ({ id: snap.id, ...snap.data() }));
        } catch (error) {
            console.error("Error fetching user details:", error);
            return [];
        }
    };

    const fetchGroup = async (groupId) => {
        try {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
                return { id: groupDoc.id, ...groupDoc.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching group:", error);
            return null;
        }
    };

    const sendInvitation = async (groupId, email, guestId = null) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };

        try {
            // Check if user is already a member
            const group = groups.find(g => g.id === groupId);
            // We can't easily check if the invited email is already a member ID without fetching all users,
            // but we can check if they are already invited.

            // Check for existing pending invitation
            const invitationsRef = collection(db, 'invitations');
            const q = query(
                invitationsRef,
                where("groupId", "==", groupId),
                where("email", "==", email),
                where("status", "==", "pending")
            );
            const existingInvites = await getDocs(q);

            if (!existingInvites.empty) {
                return { success: false, error: 'Bu kullanıcı zaten davet edilmiş.' };
            }

            const newInvitation = {
                groupId,
                groupName: group?.name || 'Unknown Group',
                email,
                guestId, // Store linked guest ID
                invitedBy: currentUser.uid || currentUser.id,
                invitedByName: currentUser.name || currentUser.displayName || 'Bir kullanıcı',
                status: 'pending',
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'invitations'), newInvitation);
            return { success: true };
        } catch (error) {
            console.error("Error sending invitation:", error);
            return { success: false, error: 'Davet gönderilemedi.' };
        }
    };

    const acceptInvitation = async (invitationId) => {
        if (!currentUser) return;

        try {
            const invitationRef = doc(db, 'invitations', invitationId);
            // Fetch invitation to get details (guestId etc)
            const invitationSnap = await getDoc(invitationRef);
            if (!invitationSnap.exists()) return { success: false, error: 'Davet bulunamadı.' };

            const invData = invitationSnap.data();

            // 1. Update invitation status
            await updateDoc(invitationRef, { status: 'accepted' });

            // 2. Add user to group
            const groupId = invData.groupId;
            const groupRef = doc(db, 'groups', groupId);

            // Prepare updates
            const updates = {
                members: arrayUnion(currentUser.uid || currentUser.id)
            };

            // 3. Handle Guest Merging if guestId exists
            if (invData.guestId) {
                // Remove from guestPlayers
                // We need to read the group to filter the array locally or use arrayRemove (requires exact object match)
                // Since guestPlayers is array of objects {id, name}, we need to find the object to remove it via arrayRemove
                // OR just read, filter, update. Read-modify-write is safer here.
                const groupSnap = await getDoc(groupRef);
                if (groupSnap.exists()) {
                    const groupData = groupSnap.data();
                    const updatedGuests = (groupData.guestPlayers || []).filter(g => g.id !== invData.guestId);
                    updates.guestPlayers = updatedGuests;

                    // Also update all historical matches!
                    // This is heavy, but necessary. 
                    const matchesRef = collection(db, 'matches');
                    const matchesQ = query(matchesRef, where("groupId", "==", groupId));
                    const matchesSnap = await getDocs(matchesQ);

                    const batchPromises = matchesSnap.docs.map(async (mDoc) => {
                        const matchData = mDoc.data();
                        let needsUpdate = false;
                        const updatePayload = {};

                        // Update Team A
                        if (matchData.teamA && matchData.teamA.some(p => p.id === invData.guestId)) {
                            updatePayload.teamA = matchData.teamA.map(p => p.id === invData.guestId ? { ...p, id: currentUser.uid || currentUser.id, name: currentUser.name } : p);
                            needsUpdate = true;
                        }
                        // Update Team B
                        if (matchData.teamB && matchData.teamB.some(p => p.id === invData.guestId)) {
                            updatePayload.teamB = matchData.teamB.map(p => p.id === invData.guestId ? { ...p, id: currentUser.uid || currentUser.id, name: currentUser.name } : p);
                            needsUpdate = true;
                        }

                        // Update Stats
                        if (matchData.stats && matchData.stats[invData.guestId]) {
                            const newStats = { ...matchData.stats };
                            newStats[currentUser.uid || currentUser.id] = newStats[invData.guestId];
                            delete newStats[invData.guestId];
                            updatePayload.stats = newStats;
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            return updateDoc(doc(db, 'matches', mDoc.id), updatePayload);
                        }
                    });

                    await Promise.all(batchPromises);
                }
            }

            await updateDoc(groupRef, updates);

            return { success: true };
        } catch (error) {
            console.error("Error accepting invitation:", error);
            return { success: false, error: 'İşlem başarısız.' };
        }
    };

    const rejectInvitation = async (invitationId) => {
        try {
            const invitationRef = doc(db, 'invitations', invitationId);
            await updateDoc(invitationRef, { status: 'rejected' });
            return { success: true };
        } catch (error) {
            console.error("Error rejecting invitation:", error);
            return { success: false, error: 'İşlem başarısız.' };
        }
    };

    const sendJoinRequest = async (groupId) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            // Check if request exists
            const requestsRef = collection(db, 'joinRequests');
            const q = query(requestsRef, where("groupId", "==", groupId), where("userId", "==", currentUser.uid || currentUser.id), where("status", "==", "pending"));
            const existing = await getDocs(q);
            if (!existing.empty) return { success: false, error: 'Zaten beklemede bir isteğiniz var.' };

            await addDoc(collection(db, 'joinRequests'), {
                groupId,
                userId: currentUser.uid || currentUser.id,
                userName: currentUser.name || currentUser.displayName,
                userEmail: currentUser.email,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error("Error sending join request:", error);
            return { success: false, error: 'İstek gönderilemedi.' };
        }
    };

    const getJoinRequests = async (groupId) => {
        try {
            const requestsRef = collection(db, 'joinRequests');
            const q = query(requestsRef, where("groupId", "==", groupId), where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting join requests:", error);
            return [];
        }
    };

    const respondToJoinRequest = async (requestId, status, groupId, userId) => {
        try {
            const requestRef = doc(db, 'joinRequests', requestId);
            await updateDoc(requestRef, { status });

            if (status === 'approved') {
                const groupRef = doc(db, 'groups', groupId);
                await updateDoc(groupRef, {
                    members: arrayUnion(userId)
                });
            }
            return { success: true };
        } catch (error) {
            console.error("Error responding to request:", error);
            return { success: false, error: 'İşlem başarısız.' };
        }
    };

    const createMatch = async (groupId, date, venue, teamA, teamB, teamAName = 'Takım A', teamBName = 'Takım B') => {
        const group = groups.find(g => g.id === groupId);
        const seasonId = group?.activeSeasonId || null;

        const newMatch = {
            groupId,
            seasonId,
            date,
            venue,
            teamA,
            teamB,
            teamAName,
            teamBName,
            status: 'scheduled',
            score: null,
            stats: {},
            createdAt: serverTimestamp()
        };

        try {
            const docRef = await addDoc(collection(db, 'matches'), newMatch);
            return { ...newMatch, id: docRef.id };
        } catch (error) {
            console.error("Error creating match:", error);
        }
    };

    const finishMatch = async (matchId, scoreA, scoreB, playerStats, teamA, teamB, teamAName, teamBName, videoUrl = '', matchSummary = '') => {
        try {
            const matchRef = doc(db, 'matches', matchId);
            await updateDoc(matchRef, {
                status: 'played',
                score: { a: scoreA, b: scoreB },
                stats: playerStats,
                teamA,
                teamB,
                teamAName,
                teamBName,
                videoUrl,
                matchSummary
            });
        } catch (error) {
            console.error("Error finishing match:", error);
        }
    };

    const assignMatchToSeason = async (matchId, seasonId) => {
        try {
            const matchRef = doc(db, 'matches', matchId);
            await updateDoc(matchRef, { seasonId });
        } catch (error) {
            console.error("Error assigning match:", error);
        }
    };

    const startSeason = async (groupId, seasonName) => {
        const seasonId = Date.now().toString();
        const newSeason = {
            id: seasonId,
            name: seasonName,
            startDate: new Date().toISOString(),
            status: 'active'
        };

        try {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                activeSeasonId: seasonId,
                seasons: arrayUnion(newSeason)
            });
        } catch (error) {
            console.error("Error starting season:", error);
        }
    };

    const endSeason = async (groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (!group || !group.activeSeasonId) return;

        const updatedSeasons = (group.seasons || []).map(s =>
            s.id === group.activeSeasonId ? { ...s, endDate: new Date().toISOString(), status: 'completed' } : s
        );

        try {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                activeSeasonId: null,
                seasons: updatedSeasons
            });
        } catch (error) {
            console.error("Error ending season:", error);
        }
    };

    const calculateStats = (matchList) => {
        const stats = {};

        matchList.forEach(match => {
            const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
            allPlayers.forEach(player => {
                if (!player || !player.id) return; // Safety check

                if (!stats[player.id]) {
                    stats[player.id] = {
                        id: player.id,
                        name: player.name || 'Bilinmeyen',
                        matches: 0,
                        goals: 0,
                        assists: 0,
                        wins: 0,
                        saves: 0,
                        cleanSheets: 0
                    };
                }
                stats[player.id].matches += 1;

                // Check for Clean Sheet
                const isTeamA = (match.teamA || []).some(p => p.id === player.id);
                const isTeamB = (match.teamB || []).some(p => p.id === player.id);

                if (isTeamA && match.score && match.score.b === 0) {
                    stats[player.id].cleanSheets += 1;
                }
                if (isTeamB && match.score && match.score.a === 0) {
                    stats[player.id].cleanSheets += 1;
                }
            });

            if (match.stats) {
                Object.entries(match.stats).forEach(([playerId, playerStats]) => {
                    if (stats[playerId]) {
                        stats[playerId].goals += (playerStats.goals || 0);
                        stats[playerId].assists += (playerStats.assists || 0);
                        stats[playerId].saves += (playerStats.saves || 0);
                    }
                });
            }
        });

        return Object.values(stats).sort((a, b) => b.goals - a.goals);
    };

    const getSeasonStats = (groupId, seasonId) => {
        const seasonMatches = matches.filter(m =>
            m.groupId === groupId &&
            m.seasonId === seasonId &&
            m.status === 'played'
        );
        return calculateStats(seasonMatches);
    };

    const getAllTimeStats = (groupId) => {
        const groupMatches = matches.filter(m =>
            m.groupId === groupId &&
            m.status === 'played'
        );
        return calculateStats(groupMatches);
    };

    const getMyGroups = () => {
        return groups; // Already filtered by subscription
    };

    const getGroupMatches = (groupId) => {
        return matches.filter(m => m.groupId === groupId);
    };

    const value = {
        groups,
        matches,
        invitations,
        createGroup,
        joinGroup,
        addGuestMember,
        removeGuestMember,
        removeMember,
        addAdmin,
        removeAdmin,
        getUsersDetails,
        sendInvitation,
        acceptInvitation,
        rejectInvitation,
        createMatch,
        finishMatch,
        assignMatchToSeason,
        startSeason,
        endSeason,
        getSeasonStats,
        getAllTimeStats,
        getMyGroups,
        getGroupMatches,
        fetchGroup,
        sendJoinRequest,
        getJoinRequests,
        respondToJoinRequest
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
