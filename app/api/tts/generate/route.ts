-- 1. API USAGE HISTORY
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key_id UUID,
    voice_name TEXT NOT NULL,
    model_used TEXT NOT NULL DEFAULT 'eleven_v3',
    status TEXT NOT NULL,
    credits_deducted INTEGER NOT NULL DEFAULT 0,
    character_count INTEGER NOT NULL DEFAULT 0,
    remaining_free INTEGER,
    remaining_paid INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_usage_logs_user_created_idx
ON public.api_usage_logs (user_id, created_at DESC);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own API usage"
ON public.api_usage_logs;

CREATE POLICY "Users view own API usage"
ON public.api_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON public.api_usage_logs FROM anon;
GRANT SELECT ON public.api_usage_logs TO authenticated;
GRANT ALL ON public.api_usage_logs TO service_role;


-- 2. ATOMIC CREDIT DEDUCTION
CREATE OR REPLACE FUNCTION public.consume_api_credit(
    p_api_key_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_key RECORD;
BEGIN
    UPDATE public.api_keys
    SET
        free_requests_remaining =
            GREATEST(COALESCE(free_requests_remaining, 0) - 1, 0),

        paid_requests_remaining =
            CASE
                WHEN COALESCE(free_requests_remaining, 0) > 0
                THEN COALESCE(paid_requests_remaining, 0)
                ELSE GREATEST(COALESCE(paid_requests_remaining, 0) - 1, 0)
            END

    WHERE id = p_api_key_id
      AND user_id = p_user_id
      AND is_active = TRUE
      AND (
          COALESCE(free_requests_remaining, 0) > 0
          OR COALESCE(paid_requests_remaining, 0) > 0
      )

    RETURNING
        free_requests_remaining,
        paid_requests_remaining
    INTO updated_key;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'free_remaining', updated_key.free_requests_remaining,
        'paid_remaining', updated_key.paid_requests_remaining,
        'remaining_credits',
            updated_key.free_requests_remaining
            + updated_key.paid_requests_remaining
    );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_credit(UUID, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_api_credit(UUID, UUID)
TO service_role;