-- Create database trigger to automatically create profile when user confirms email
-- This trigger fires after a user's email is confirmed in auth.users

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, is_admin, assigned_path, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    FALSE, -- Default to non-admin (admins must be manually set)
    COALESCE(NEW.raw_user_meta_data->>'training_path', NULL), -- Extract training_path from metadata
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires when a new user is created in auth.users
-- Note: This fires on INSERT, but you may want it to fire on email confirmation
-- For email confirmation, you might need to use a webhook or check email_confirmed_at
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL) -- Only create profile when email is confirmed
  EXECUTE FUNCTION public.handle_new_user();

-- Alternative: If you want to create profile immediately and update on confirmation
-- You can create a separate trigger for email confirmation updates
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- If email was just confirmed and profile doesn't exist, create it
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, email, name, is_admin, assigned_path, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      FALSE,
      COALESCE(NEW.raw_user_meta_data->>'training_path', NULL), -- Extract training_path from metadata
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email,
        assigned_path = COALESCE(NEW.raw_user_meta_data->>'training_path', profiles.assigned_path), -- Update if not already set
        updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for email confirmation updates
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user confirms their email';
COMMENT ON FUNCTION public.handle_user_email_confirmed() IS 'Creates or updates profile when user confirms their email';
