-- Store the user's preferred language so it can be injected into every system prompt.
-- Valid values: 'hinglish' | 'hindi' | 'english' (validated in persona router).
-- Defaults to 'hinglish' for existing rows and new rows with no explicit preference.
ALTER TABLE public.persona ADD COLUMN language_pref TEXT NOT NULL DEFAULT 'hinglish';
