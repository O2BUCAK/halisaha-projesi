# Feature Implementation Plan: Profile Updates, Guest Mapping, Public Groups

## Goal Description
Enable users to:
1.  **Update Profiles**: (Existing functionality verified, ensuring completeness).
2.  **Map Guests to Users**: When an admin invites a guest player via email, and the user accepts, their guest stats should merge into their real user account.
3.  **Public Group View & access**: Allow non-members to view minimal group details and request to join. Admins can approve/reject requests.

## User Review Required
> [!IMPORTANT]
> **Guest Stat Merging**: When a guest account is merged into a real user, the historical match data for that guest will be updated to point to the new user ID. This is irreversible.

## Proposed Changes

### Data Layer (`src/contexts/DataContext.jsx`)
#### [MODIFY] [DataContext.jsx](file:///c:/Users/ersinozbucak/Documents/halisaha-projesi/src/contexts/DataContext.jsx)
*   **update `sendInvitation`**: Add optional `guestId` parameter to link invitation to a specific guest.
*   **update `acceptInvitation`**: 
    *   Check for `guestId` in invitation.
    *   If present, find all matches for the group.
    *   Replace `guestId` with `currentUser.uid` in match `teamA`, `teamB` arrays and `stats` object.
    *   Remove guest from `group.guestPlayers`.
*   **add `fetchGroup(groupId)`**: Allow fetching a group document by ID (for non-members viewing public links).
*   **add `sendJoinRequest(groupId)`**: Create a document in `joinRequests` collection.
*   **add `getJoinRequests(groupId)`**: Fetch pending requests for a group (for admins).
*   **add `respondToJoinRequest(requestId, status)`**: Approve (add member) or Reject.
*   **update `finishMatch`**: Accept `saves` in `stats` object. Supports goalkeeper specific stats.
*   **update `saveLineup(matchId, lineup)`**: Save X/Y coordinates of players for the tactical board.
*   **update `calculateStats`**: Aggregate `saves` for goalkeeper list.

### UI Layer
#### [MODIFY] [GroupDetail.jsx](file:///c:/Users/ersinozbucak/Documents/halisaha-projesi/src/pages/dashboard/GroupDetail.jsx)
*   **Public View**:
    *   If user is not in `members` list, show "Public View".
    *   Hide "Add Match", "Settings", "Invite" buttons.
    *   Show "Katılma İsteği Gönder" (Join Request) button.
*   **Admin View**:
    *   Add a section or modal to view and manage "Join Requests".
*   **Stats Tab**:
    *   Add a "Goalkeepers" toggle or separate table showing "Saves" and "Clean Sheets" (matches with 0 goals allowed).

#### [MODIFY] [MatchDetail.jsx](file:///c:/Users/ersinozbucak/Documents/halisaha-projesi/src/pages/dashboard/MatchDetail.jsx)
*   **Stats Input**: Add "Kurtarış" (Saves) column to the player stats input table.
*   **Goalkeeper Selection**: Allow designating a goalkeeper per team (visual indicator).
*   **Tactical Board**:
    *   Add a new tab "Taktik Tahtası".
    *   Canvas/Div representation of a football field.
    *   Draggable player circles (names from Team A/B).
    *   "Save Formation" button.

#### [NEW] [TacticalBoard.jsx](file:///c:/Users/ersinozbucak/Documents/halisaha-projesi/src/components/TacticalBoard.jsx)
*   Visual interactive component for positioning players.

#### [MODIFY] [App.jsx](file:///c:/Users/ersinozbucak/Documents/halisaha-projesi/src/App.jsx)
*   Ensure routing allows access to `GroupDetail` (currently likely under `PrivateRoute` which is fine, as users must be logged in, but we need to ensure they can navigate there even if not a member).

## Verification Plan
### Automated Tests
*   N/A (No test suite present).

### Manual Verification
1.  **Guest Mapping**:
    *   Create a group, add guest "Ahmet".
    *   Create a match, give "Ahmet" goals.
    *   Invite "Ahmet" (enter valid email) and select "Ahmet" from guest list.
    *   Log in as that email user.
    *   Accept invite.
    *   Verify "Ahmet" guest is gone, and user is member.
    *   Verify match stats now belong to the user.
2.  **Public Group**:
    *   Copy group URL.
    *   Log in as non-member.
    *   Visit URL.
    *   Verify "View Only" mode (no edit buttons).
    *   Click "Join Request".
    *   Log in as Admin.
    *   Approve request.
    *   Verify user is now member.
