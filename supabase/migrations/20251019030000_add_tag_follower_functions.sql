/*
  # Tag Follower Count Functions

  Add database functions to safely increment and decrement tag follower counts
*/

-- Function to increment tag follower count
CREATE OR REPLACE FUNCTION increment_tag_followers(tag_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE tags
  SET follower_count = follower_count + 1
  WHERE id = tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement tag follower count
CREATE OR REPLACE FUNCTION decrement_tag_followers(tag_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE tags
  SET follower_count = GREATEST(follower_count - 1, 0)
  WHERE id = tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
