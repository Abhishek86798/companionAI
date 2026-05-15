-- Anonymous users get a real conversation row so the frontend can pass
-- conversation_id across the auth redirect and claim it on first authenticated
-- message (see get_or_create_conversation in messages.py).
ALTER TABLE public.conversations ALTER COLUMN user_id DROP NOT NULL;
