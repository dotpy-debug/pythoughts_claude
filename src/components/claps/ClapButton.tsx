import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Hand } from 'lucide-react';

type ClapButtonProps = {
  postId: string;
};

export function ClapButton({ postId }: ClapButtonProps) {
  const { user } = useAuth();
  const [totalClaps, setTotalClaps] = useState(0);
  const [userClaps, setUserClaps] = useState(0);
  const [isClapping, setIsClapping] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const loadClaps = useCallback(async () => {
    try {
      const { data: allClaps, error: totalError } = await supabase
        .from('claps')
        .select('clap_count')
        .eq('post_id', postId);

      if (totalError) throw totalError;

      const total = allClaps?.reduce((sum, clap) => sum + clap.clap_count, 0) || 0;
      setTotalClaps(total);

      if (user) {
        const { data: userClapData } = await supabase
          .from('claps')
          .select('clap_count')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();

        setUserClaps(userClapData?.clap_count || 0);
      }
    } catch (error) {
      console.error('Error loading claps:', error);
    }
  }, [postId, user]);

  useEffect(() => {
    loadClaps();

    const channel = supabase
      .channel(`claps:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'claps', filter: `post_id=eq.${postId}` },
        () => {
          loadClaps();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, loadClaps]);

  const handleClap = async () => {
    if (!user || isClapping) return;

    if (userClaps >= 50) {
      return;
    }

    setIsClapping(true);
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 500);

    try {
      const newCount = userClaps + 1;

      if (userClaps === 0) {
        await supabase.from('claps').insert({
          user_id: user.id,
          post_id: postId,
          clap_count: 1,
        });
      } else {
        await supabase
          .from('claps')
          .update({ clap_count: newCount })
          .eq('user_id', user.id)
          .eq('post_id', postId);
      }

      setUserClaps(newCount);
      setTotalClaps(totalClaps + 1);
    } catch (error) {
      console.error('Error clapping:', error);
    } finally {
      setTimeout(() => setIsClapping(false), 200);
    }
  };

  const clapPercentage = userClaps > 0 ? (userClaps / 50) * 100 : 0;

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={handleClap}
        disabled={!user || isClapping || userClaps >= 50}
        className={`relative group ${
          !user || userClaps >= 50 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
        title={user ? `${userClaps}/50 claps given` : 'Sign in to clap'}
      >
        <div
          className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-200 ${
            userClaps > 0
              ? 'border-terminal-green bg-terminal-green/20'
              : 'border-gray-700 bg-gray-800'
          } ${
            !user || userClaps >= 50
              ? ''
              : 'hover:border-terminal-green hover:bg-terminal-green/10 hover:scale-110'
          } ${showAnimation ? 'animate-bounce' : ''}`}
        >
          {userClaps > 0 && (
            <div
              className="absolute inset-0 rounded-full bg-terminal-green/30 transition-all duration-300"
              style={{
                clipPath: `inset(${100 - clapPercentage}% 0 0 0)`,
              }}
            />
          )}
          <Hand
            size={28}
            className={`relative z-10 transition-all duration-200 ${
              userClaps > 0 ? 'text-terminal-green' : 'text-gray-400'
            } ${showAnimation ? 'scale-125' : ''}`}
          />
        </div>

        {showAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-terminal-green font-bold text-xl animate-ping">
              +1
            </span>
          </div>
        )}
      </button>

      <div className="flex flex-col">
        <div className="text-2xl font-bold text-gray-100 font-mono">
          {totalClaps.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 font-mono">
          {totalClaps === 1 ? 'clap' : 'claps'}
        </div>
        {user && userClaps > 0 && (
          <div className="text-xs text-terminal-green font-mono mt-1">
            You: {userClaps}
          </div>
        )}
      </div>
    </div>
  );
}