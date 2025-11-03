import { useState } from 'react';
import { User, MapPin, Briefcase, Calendar, Globe, Github, Twitter, Linkedin, CreditCard as Edit } from 'lucide-react';
import { Profile, UserProfileExtended, UserSkill } from '../../lib/supabase';
import { ShadcnCard, ShadcnCardContent, ShadcnCardHeader } from '../ui/ShadcnCard';
import { ShadcnButton } from '../ui/ShadcnButton';
import { ShadcnBadge } from '../ui/ShadcnBadge';
import { sanitizeURL } from '../../utils/security';
import { ReputationBadge } from '../reputation/ReputationBadge';
import { BadgeGallery } from '../badges/BadgeGallery';

type UserProfileCardProperties = {
  profile: Profile;
  extended?: UserProfileExtended;
  skills?: UserSkill[];
  isOwnProfile: boolean;
  onEdit?: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onBlock?: () => void;
  isFollowing?: boolean;
  isBlocked?: boolean;
};

export function UserProfileCard({
  profile,
  extended,
  skills = [],
  isOwnProfile,
  onEdit,
  onFollow,
  onUnfollow,
  onBlock,
  isFollowing = false,
  isBlocked = false,
}: UserProfileCardProperties) {
  const [showAllSkills, setShowAllSkills] = useState(false);
  const displayedSkills = showAllSkills ? skills : skills.slice(0, 6);

  const proficiencyColors: Record<string, string> = {
    beginner: 'bg-blue-500',
    intermediate: 'bg-green-500',
    advanced: 'bg-yellow-500',
    expert: 'bg-purple-500',
  };

  return (
    <ShadcnCard>
      <ShadcnCardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {profile.avatar_url ? (
              <img
                src={sanitizeURL(profile.avatar_url)}
                alt={profile.username}
                className="w-20 h-20 rounded-full border-2 border-terminal-green object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-800 border-2 border-terminal-purple rounded-full flex items-center justify-center">
                <User size={40} className="text-terminal-purple" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-100">{profile.username}</h2>
              {extended?.job_title && (
                <p className="text-sm text-terminal-blue font-mono">{extended.job_title}</p>
              )}
              {extended?.company && (
                <p className="text-xs text-gray-400 font-mono">@ {extended.company}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            {isOwnProfile ? (
              <ShadcnButton size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
                Edit Profile
              </ShadcnButton>
            ) : (
              <>
                {!isBlocked && (
                  <ShadcnButton
                    size="sm"
                    variant={isFollowing ? 'secondary' : 'default'}
                    onClick={isFollowing ? onUnfollow : onFollow}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </ShadcnButton>
                )}
                <ShadcnButton
                  size="sm"
                  variant="destructive"
                  onClick={onBlock}
                >
                  {isBlocked ? 'Unblock' : 'Block'}
                </ShadcnButton>
              </>
            )}
          </div>
        </div>
      </ShadcnCardHeader>

      <ShadcnCardContent className="space-y-6">
        {profile.bio && (
          <div>
            <p className="text-gray-300 font-mono text-sm">{profile.bio}</p>
          </div>
        )}

        {extended?.bio_extended && (
          <div>
            <p className="text-gray-400 font-mono text-sm">{extended.bio_extended}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-400 font-mono">
          {extended?.location && (
            <div className="flex items-center space-x-1">
              <MapPin size={14} className="text-terminal-blue" />
              <span>{extended.location}</span>
            </div>
          )}
          {extended?.company && (
            <div className="flex items-center space-x-1">
              <Briefcase size={14} className="text-terminal-purple" />
              <span>{extended.company}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar size={14} className="text-terminal-green" />
            <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {(extended?.website || extended?.github_url || extended?.twitter_url || extended?.linkedin_url) && (
          <div className="flex space-x-3">
            {extended.website && (
              <a
                href={sanitizeURL(extended.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-blue hover:text-terminal-green transition-colors"
              >
                <Globe size={20} />
              </a>
            )}
            {extended.github_url && (
              <a
                href={sanitizeURL(extended.github_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-blue hover:text-terminal-green transition-colors"
              >
                <Github size={20} />
              </a>
            )}
            {extended.twitter_url && (
              <a
                href={sanitizeURL(extended.twitter_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-blue hover:text-terminal-green transition-colors"
              >
                <Twitter size={20} />
              </a>
            )}
            {extended.linkedin_url && (
              <a
                href={sanitizeURL(extended.linkedin_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-blue hover:text-terminal-green transition-colors"
              >
                <Linkedin size={20} />
              </a>
            )}
          </div>
        )}

        {extended && (
          <div className="flex space-x-6 text-sm font-mono">
            <div>
              <span className="text-terminal-green font-bold">{extended.total_posts}</span>
              <span className="text-gray-400 ml-1">posts</span>
            </div>
            <div>
              <span className="text-terminal-blue font-bold">{extended.total_followers}</span>
              <span className="text-gray-400 ml-1">followers</span>
            </div>
            <div>
              <span className="text-terminal-purple font-bold">{extended.total_following}</span>
              <span className="text-gray-400 ml-1">following</span>
            </div>
          </div>
        )}

        {/* Reputation Badge */}
        <ReputationBadge userId={profile.id} variant="full" showProgress={true} />

        {/* Badge Gallery */}
        <BadgeGallery userId={profile.id} variant="full" />

        {skills.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-100 mb-3 font-mono">$ skills</h3>
            <div className="flex flex-wrap gap-2">
              {displayedSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="relative group"
                >
                  <ShadcnBadge variant="secondary" className="cursor-help">
                    <span className={`w-2 h-2 rounded-full ${proficiencyColors[skill.proficiency_level]} mr-2`} />
                    {skill.skill_name}
                    {skill.years_experience > 0 && (
                      <span className="ml-1 text-terminal-blue">({skill.years_experience}y)</span>
                    )}
                  </ShadcnBadge>
                  <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {skill.proficiency_level}
                  </div>
                </div>
              ))}
            </div>
            {skills.length > 6 && (
              <button
                onClick={() => setShowAllSkills(!showAllSkills)}
                className="mt-2 text-xs text-terminal-blue hover:text-terminal-green transition-colors font-mono"
              >
                {showAllSkills ? '$ show_less' : `$ show_all (${skills.length - 6} more)`}
              </button>
            )}
          </div>
        )}
      </ShadcnCardContent>
    </ShadcnCard>
  );
}
