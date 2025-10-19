/*
  # Create Admin User
  
  Creates the admin user account with credentials:
  - Email: admin@pythoughts.com
  - Password: Block@1559!!
  - Admin privileges enabled
  
  This migration:
  1. Creates the user in auth.users table
  2. Creates the corresponding profile with is_admin = true
  3. Confirms the email automatically
*/

-- Insert admin user into auth.users
-- Note: Supabase auth uses bcrypt for password hashing
-- The password 'Block@1559!!' will be hashed by Supabase Auth API
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate a consistent UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Insert into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@pythoughts.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@pythoughts.com',
      crypt('Block@1559!!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"],"is_admin":true}'::jsonb,
      '{"username":"admin"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );
    
    -- Create profile for admin user
    INSERT INTO public.profiles (
      id,
      username,
      avatar_url,
      bio,
      is_admin,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      'admin',
      '',
      'Platform Administrator',
      true,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET is_admin = true,
        username = 'admin',
        bio = 'Platform Administrator';
    
    RAISE NOTICE 'Admin user created successfully with email: admin@pythoughts.com';
  ELSE
    -- Update existing user to be admin
    UPDATE auth.users 
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{is_admin}',
      'true'::jsonb
    )
    WHERE email = 'admin@pythoughts.com';
    
    UPDATE public.profiles
    SET is_admin = true,
        bio = 'Platform Administrator'
    WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@pythoughts.com');
    
    RAISE NOTICE 'Existing user updated to admin status';
  END IF;
END $$;
