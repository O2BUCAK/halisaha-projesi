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
import { toTitleCase } from '../utils';

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
            const formattedGuestName = toTitleCase(guestName.trim().replace(/\s+/g, ' '));

            if (group && group.guestPlayers) {
                const exists = group.guestPlayers.some(p =>
                    p.name.trim().toLowerCase().replace(/\s+/g, ' ') === formattedGuestName.toLowerCase()
                );
                if (exists) {
                    return { success: false, error: 'Bu isimde bir misafir oyuncu zaten var.' };
                }
            }

            const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const newGuest = { id: guestId, name: formattedGuestName };

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

    const cleanupGuestDuplicates = async (groupId) => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (!groupSnap.exists()) return { success: false, error: 'Grup bulunamadı.' };
            const groupData = groupSnap.data();

            // 1. Fetch ALL matches for this group to find all guest appearances
            const matchesRef = collection(db, 'matches');
            const matchesQ = query(matchesRef, where("groupId", "==", groupId));
            const matchesSnap = await getDocs(matchesQ);

            // 2. Build a map of Name -> [IDs] from both Group List and Match History
            // We trust the Group List as the primary source for "Current" IDs, but history might have orphans.
            const nameToIds = new Map(); // "can deveci" -> Set(id1, id2)
            const idToName = new Map();  // id1 -> "Can Deveci"
            const idToFullObj = new Map();

            // Helper to normalize
            const normalize = (name) => name ? name.trim().toLowerCase().replace(/\s+/g, ' ') : '';

            // Scan Group List
            (groupData.guestPlayers || []).forEach(p => {
                const norm = normalize(p.name);
                if (!norm) return;
                if (!nameToIds.has(norm)) nameToIds.set(norm, new Set());
                nameToIds.get(norm).add(p.id);
                idToName.set(p.id, p.name); // Keep original casing preference
                idToFullObj.set(p.id, p);
            });

            // Scan Matches for any "guest_" IDs that might not be in the list or are duplicates
            matchesSnap.docs.forEach(doc => {
                const m = doc.data();
                const players = [...(m.teamA || []), ...(m.teamB || [])];
                players.forEach(p => {
                    if (p.id && typeof p.id === 'string' && p.id.startsWith('guest_')) {
                        const norm = normalize(p.name);
                        if (!norm) return;
                        if (!nameToIds.has(norm)) nameToIds.set(norm, new Set());
                        nameToIds.get(norm).add(p.id);

                        // If we don't have a name/obj from group list, use this one
                        if (!idToName.has(p.id)) {
                            idToName.set(p.id, p.name);
                            idToFullObj.set(p.id, p);
                        }
                    }
                });
            });

            let totalMerged = 0;
            const batchPromises = [];

            // 3. Process each Name Group
            for (const [normName, idsSet] of nameToIds.entries()) {
                if (idsSet.size >= 1) { // Process even if single ID to fix intra-match duplicates
                    const ids = Array.from(idsSet);
                    // Master ID: Prefer the one that is in `groupData.guestPlayers` if possible.
                    // If multiple are in group list, pick the first one.
                    const currentGroupGuestIds = new Set((groupData.guestPlayers || []).map(g => g.id));

                    let masterId = ids.find(id => currentGroupGuestIds.has(id));
                    if (!masterId) masterId = ids[0]; // Fallback to first found

                    const masterName = idToName.get(masterId); // Best casing
                    const idsToRemove = ids.filter(id => id !== masterId);

                    if (idsToRemove.length > 0) {
                        totalMerged += idsToRemove.length;
                    }

                    // A. Update Matches
                    matchesSnap.docs.forEach(mDoc => {
                        const mData = mDoc.data();
                        let needsUpdate = false;
                        const updatePayload = {};

                        // Helper to merge players in a team array
                        const mergeTeam = (team) => {
                            if (!team) return team;
                            // Check if this team has any of the IDs to remove OR the master ID
                            const hasTarget = team.some(p => idsSet.has(p.id));
                            if (!hasTarget) return team;

                            // We must reconstruct the team. 
                            // 1. Filter out all instances of the group (master + toRemove)
                            // 2. Add ONE instance of Master (if any of them were present)

                            const validPlayers = team.filter(p => !idsSet.has(p.id));
                            const anyDuplicatePresent = team.some(p => idsSet.has(p.id));
                            // Special case: Is he a goalkeeper in ANY of the instances?
                            const wasGoalkeeper = team.some(p => idsSet.has(p.id) && p.isGoalkeeper);

                            if (anyDuplicatePresent) {
                                // Add Master back
                                const masterObj = {
                                    ...idToFullObj.get(masterId),
                                    name: masterName,
                                    id: masterId,
                                    isGoalkeeper: wasGoalkeeper
                                };
                                validPlayers.push(masterObj);
                                return validPlayers;
                            }
                            return team;
                        };

                        const newTeamA = mergeTeam(mData.teamA);
                        const newTeamB = mergeTeam(mData.teamB);

                        if (JSON.stringify(newTeamA) !== JSON.stringify(mData.teamA)) {
                            updatePayload.teamA = newTeamA;
                            needsUpdate = true;
                        }
                        if (JSON.stringify(newTeamB) !== JSON.stringify(mData.teamB)) {
                            updatePayload.teamB = newTeamB;
                            needsUpdate = true;
                        }

                        // Stats Merge
                        if (mData.stats) {
                            const newStats = { ...mData.stats };
                            let statsChanged = false;

                            // Check if we have stats to merge
                            const duplicatesWithStats = idsToRemove.filter(id => newStats[id]);
                            const masterHasStats = !!newStats[masterId];

                            if (duplicatesWithStats.length > 0) {
                                if (!newStats[masterId]) {
                                    newStats[masterId] = { goals: 0, assists: 0, saves: 0 };
                                }

                                duplicatesWithStats.forEach(dupId => {
                                    newStats[masterId].goals = (newStats[masterId].goals || 0) + (newStats[dupId].goals || 0);
                                    newStats[masterId].assists = (newStats[masterId].assists || 0) + (newStats[dupId].assists || 0);
                                    newStats[masterId].saves = (newStats[masterId].saves || 0) + (newStats[dupId].saves || 0);
                                    delete newStats[dupId];
                                });
                                statsChanged = true;
                            }

                            if (statsChanged) {
                                updatePayload.stats = newStats;
                                needsUpdate = true;
                            }
                        }

                        // Ratings Merge - similar logic
                        if (mData.ratings) {
                            // Complex to merge ratings (votes). We can merge the objects {voterId: score}.
                            // If same voter voted for both (unlikely), take max or latest? Let's take duplicate's vote overwriting master.
                            const newRatings = { ...mData.ratings };
                            let ratingsChanged = false;

                            const duplicatesWithRatings = idsToRemove.filter(id => newRatings[id]);
                            if (duplicatesWithRatings.length > 0) {
                                if (!newRatings[masterId]) newRatings[masterId] = {};

                                duplicatesWithRatings.forEach(dupId => {
                                    newRatings[masterId] = { ...newRatings[masterId], ...newRatings[dupId] };
                                    delete newRatings[dupId];
                                });
                                ratingsChanged = true;
                            }

                            if (ratingsChanged) {
                                updatePayload.ratings = newRatings;
                                needsUpdate = true;
                            }
                        }

                        if (needsUpdate) {
                            batchPromises.push(updateDoc(doc(db, 'matches', mDoc.id), updatePayload));
                        }
                    });

                    // B. Update Group List (Remove duplicates from the array)
                    // We need to act on the LATEST group data, but we can just filter the current list we fetched.
                    // But wait, we iterate on `nameToIds`. We should do one final update to Group.
                }
            }

            if (totalMerged === 0) return { success: true, count: 0 };

            await Promise.all(batchPromises);

            // 4. Final Group Update: Re-read group to be safe or just filter the one we have?
            // Safer to just filter 'groupData.guestPlayers' to only include Master IDs for names we processed, 
            // and merge any others. 
            // Actually simpler: Just filter the `guestPlayers` array.
            // For every group of IDs in nameToIds, we only strictly keep the MasterID in the guest list.

            const mastersToKeep = new Set();
            for (const [_, idsSet] of nameToIds.entries()) {
                const ids = Array.from(idsSet);
                // logic repeated from above to deterministic
                const currentGroupGuestIds = new Set((groupData.guestPlayers || []).map(g => g.id));
                let masterId = ids.find(id => currentGroupGuestIds.has(id));
                if (!masterId) masterId = ids[0];
                mastersToKeep.add(masterId);
            }

            // The new guest list should ONLY contain people who were already in the group list,
            // but filtered to be the master version.
            const newGuestPlayers = (groupData.guestPlayers || []).filter(p => mastersToKeep.has(p.id));

            await updateDoc(groupRef, { guestPlayers: newGuestPlayers });

            return { success: true, count: totalMerged };
        } catch (error) {
            console.error("Error cleaning matches:", error);
            return { success: false, error: 'Temizleme sırasında hata oluştu.' };
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

    const mergeGuestToUser = async (groupId, guestId, targetUserId) => {
        try {
            // 1. Get User Details to get the new name
            const userDoc = await getDoc(doc(db, 'users', targetUserId));
            if (!userDoc.exists()) return { success: false, error: 'Kullanıcı bulunamadı.' };
            const userData = userDoc.data();
            const newName = userData.name || userData.nickname; // Prefer name (Name Surname)

            // 2. Fetch Group to remove guest
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            if (!groupSnap.exists()) return { success: false, error: 'Grup bulunamadı.' };
            const groupData = groupSnap.data();

            const updatedGuests = (groupData.guestPlayers || []).filter(g => g.id !== guestId);

            // 3. Update all matches
            const matchesRef = collection(db, 'matches');
            const matchesQ = query(matchesRef, where("groupId", "==", groupId));
            const matchesSnap = await getDocs(matchesQ);

            const batchPromises = matchesSnap.docs.map(async (mDoc) => {
                const matchData = mDoc.data();
                let needsUpdate = false;
                const updatePayload = {};

                // Update Team A
                if (matchData.teamA && matchData.teamA.some(p => p.id === guestId)) {
                    updatePayload.teamA = matchData.teamA.map(p => p.id === guestId ? { ...p, id: targetUserId, name: newName } : p);
                    needsUpdate = true;
                }
                // Update Team B
                if (matchData.teamB && matchData.teamB.some(p => p.id === guestId)) {
                    updatePayload.teamB = matchData.teamB.map(p => p.id === guestId ? { ...p, id: targetUserId, name: newName } : p);
                    needsUpdate = true;
                }

                // Update Stats
                if (matchData.stats && matchData.stats[guestId]) {
                    const newStats = { ...matchData.stats };
                    // If target user already has stats in this match (unlikely but possible), merge them? 
                    // For now, assuming distinct.
                    newStats[targetUserId] = newStats[guestId];
                    delete newStats[guestId];
                    updatePayload.stats = newStats;
                    needsUpdate = true;
                }

                // Update Ratings
                if (matchData.ratings && matchData.ratings[guestId]) {
                    const newRatings = { ...matchData.ratings };
                    // Merge votes from guest to target user
                    // If target user already has votes (duplicate scenario), merge them
                    newRatings[targetUserId] = {
                        ...(newRatings[guestId] || {}),
                        ...(newRatings[targetUserId] || {})
                    };
                    delete newRatings[guestId];
                    updatePayload.ratings = newRatings;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    return updateDoc(doc(db, 'matches', mDoc.id), updatePayload);
                }
            });

            await Promise.all(batchPromises);

            // 4. Update Group
            await updateDoc(groupRef, {
                guestPlayers: updatedGuests
            });

            return { success: true };
        } catch (error) {
            console.error("Error merging guest:", error);
            return { success: false, error: 'Eşleştirme sırasında hata oluştu.' };
        }
    };

    const givePlayerRating = async (matchId, targetPlayerId, score) => {
        try {
            if (!currentUser) return { success: false, error: 'Giriş yapmalısınız.' };
            const voterId = currentUser.uid || currentUser.id;

            if (targetPlayerId === voterId) return { success: false, error: 'Kendinize puan veremezsiniz.' };

            const matchRef = doc(db, 'matches', matchId);
            const matchSnap = await getDoc(matchRef);
            if (!matchSnap.exists()) return { success: false, error: 'Maç bulunamadı.' };

            // Allow if match is finished ? Usually ratings are given after match.
            // But let's allow it anytime for now.

            // Construct update path: ratings.{targetPlayerId}.{voterId}
            // We use a map: ratings: { targetId: { voterId: score } }

            const updateKey = `ratings.${targetPlayerId}.${voterId}`;

            await updateDoc(matchRef, {
                [updateKey]: score
            });

            return { success: true };
        } catch (error) {
            console.error("Error giving rating:", error);
            return { success: false, error: 'Puan verilirken hata oluştu.' };
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

    const fetchMatch = async (matchId) => {
        try {
            const matchDoc = await getDoc(doc(db, 'matches', matchId));
            if (matchDoc.exists()) {
                return { id: matchDoc.id, ...matchDoc.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching match:", error);
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

    const finishMatch = async (matchId, scoreA, scoreB, playerStats, teamA, teamB, teamAName, teamBName, videoUrls = [], matchSummary = '') => {
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
                videoUrls,
                matchSummary
            });
        } catch (error) {
            console.error("Error finishing match:", error);
        }
    };

    const updateMatchTeams = async (matchId, teamA, teamB) => {
        try {
            const matchRef = doc(db, 'matches', matchId);
            await updateDoc(matchRef, {
                teamA,
                teamB
            });
            return { success: true };
        } catch (error) {
            console.error("Error updating match teams:", error);
            return { success: false, error: 'Takımlar güncellenemedi.' };
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

    const updateGroupJerseyNumbers = async (groupId, jerseyNumbers) => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                jerseyNumbers
            });
            return { success: true };
        } catch (error) {
            console.error("Error updating jersey numbers:", error);
            return { success: false, error: 'Numaralar güncellenemedi.' };
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

            // Aggregate Ratings
            if (match.ratings) {
                Object.entries(match.ratings).forEach(([playerId, playerRatings]) => {
                    if (stats[playerId]) {
                        const votes = Object.values(playerRatings);
                        if (votes.length > 0) {
                            const sum = votes.reduce((a, b) => a + b, 0);
                            const avg = sum / votes.length;

                            if (!stats[playerId].totalRatingSum) stats[playerId].totalRatingSum = 0;
                            if (!stats[playerId].ratedMatchCount) stats[playerId].ratedMatchCount = 0;

                            stats[playerId].totalRatingSum += avg;
                            stats[playerId].ratedMatchCount += 1;
                        }
                    }
                });
            }
        });

        // Calculate Average
        Object.values(stats).forEach(playerStat => {
            playerStat.averageRating = playerStat.ratedMatchCount > 0
                ? (playerStat.totalRatingSum / playerStat.ratedMatchCount).toFixed(1)
                : '-';
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
        mergeGuestToUser,
        givePlayerRating,
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
        fetchMatch,
        sendJoinRequest,
        getJoinRequests,
        respondToJoinRequest,
        updateMatchTeams,
        updateGroupJerseyNumbers,
        cleanupGuestDuplicates
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
