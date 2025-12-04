import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { UserMap, MapMember } from '../types';

interface MemberAvatarsProps {
  activeMap: UserMap;
}

export const MemberAvatars: React.FC<MemberAvatarsProps> = ({ activeMap }) => {
  const [clickedMemberUid, setClickedMemberUid] = useState<string | null>(null);

  if (activeMap.isDefault || !activeMap.memberInfo || activeMap.memberInfo.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-24 left-4 z-10 flex flex-col-reverse gap-1 pointer-events-auto">
      {activeMap.memberInfo.slice(0, 10).map((member, index) => (
        <div key={member.uid} className="relative">
          <button
            onClick={() => {
              setClickedMemberUid(clickedMemberUid === member.uid ? null : member.uid);
              setTimeout(() => setClickedMemberUid(null), 3000);
            }}
            className={`w-10 h-10 rounded-full border-2 shadow-lg transition-all duration-200 overflow-hidden
              ${clickedMemberUid === member.uid
                ? 'border-blue-400 scale-110 ring-2 ring-blue-400/50'
                : 'border-gray-700 hover:border-gray-500 hover:scale-105'}
              ${member.uid === activeMap.ownerUid ? 'ring-2 ring-purple-500/50' : ''}
            `}
            style={{ zIndex: 10 - index }}
          >
            {member.photoURL ? (
              <img
                src={member.photoURL}
                alt={member.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <UserIcon size={16} className="text-gray-400" />
              </div>
            )}
          </button>

          {/* Tooltip on click */}
          {clickedMemberUid === member.uid && (
            <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap animate-scale-in z-20">
              <div className="text-white text-sm font-medium">
                {member.displayName}
              </div>
              <div className="text-xs text-gray-400">
                {member.uid === activeMap.ownerUid ? 'Owner' : 'Member'}
              </div>
              {/* Arrow */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 border-l border-b border-gray-600 rotate-45" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
