import React from 'react';
import { useData } from '../contexts/DataContext';

const InvitationsList = () => {
    const { invitations, acceptInvitation, rejectInvitation } = useData();

    if (!invitations || invitations.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Davetler</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{invitation.groupName}</h3>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">{invitation.invitedByName}</span> seni bu gruba davet etti.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => acceptInvitation(invitation.id)}
                                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                Kabul Et
                            </button>
                            <button
                                onClick={() => rejectInvitation(invitation.id)}
                                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                                Reddet
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InvitationsList;
