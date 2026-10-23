// api/my-voice.js
// Main Naija Pidgin — Secure Voice Playback API
// V5: Authentication + Chairman Allowlist + Ownership + Lock Enforcement

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing server-side Supabase environment variables');
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Configure in Vercel:
// CHAIRMAN_EMAILS=tapbomba.ai@gmail.com
const CHAIRMAN_ALLOWLIST = (
  process.env.CHAIRMAN_EMAILS || 'tapbomba.ai@gmail.com'
)
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

// Signed playback URL lifetime: 60 seconds.
const SIGNED_URL_TTL_SECONDS = 60;

// Worker policy:
// - Workers can access only their own recordings.
// - Workers cannot play locked recordings.
// - Workers can play pending or approved recordings.
// - Chairman can access recordings of any status.
const WORKER_ALLOWED_STATUSES = new Set([
  'pending',
  'approved'
]);

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');

  // Only allow GET requests.
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendError(res, 405, 'Method not allowed');
  }

  // Validate query parameter.
  const fileName = req.query?.file;

  if (
    typeof fileName !== 'string' ||
    !fileName.trim() ||
    fileName.length > 500
  ) {
    return sendError(res, 400, 'Invalid file');
  }

  try {
    // 1. Authenticate the Supabase user.
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();

    if (!token) {
      return sendError(res, 401, 'Login required');
    }

    const {
      data: userData,
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !userData?.user) {
      return sendError(res, 401, 'Session expired');
    }

    const user = userData.user;

    // 2. Find the recording by its exact database path.
    const {
      data: byFileName,
      error: fileNameError
    } = await supabaseAdmin
      .from('recordings')
      .select(
        'id,user_id,file_name,audio_path,admin_status,locked_for_worker,api_number'
      )
      .eq('file_name', fileName)
      .maybeSingle();

    if (fileNameError) {
      console.error('Recording lookup error:', fileNameError.message);
      return sendError(res, 500, 'Cannot process request');
    }

    let rec = byFileName;

    // Try audio_path only if file_name did not match.
    if (!rec) {
      const {
        data: byAudioPath,
        error: audioPathError
      } = await supabaseAdmin
        .from('recordings')
        .select(
          'id,user_id,file_name,audio_path,admin_status,locked_for_worker,api_number'
        )
        .eq('audio_path', fileName)
        .maybeSingle();

      if (audioPathError) {
        console.error(
          'Audio path lookup error:',
          audioPathError.message
        );
        return sendError(res, 500, 'Cannot process request');
      }

      rec = byAudioPath;
    }

    if (!rec) {
      return sendError(res, 404, 'Recording not found');
    }

    // 3. Resolve and validate the actual Storage object path.
    const storagePath = rec.audio_path || rec.file_name;

    if (
      typeof storagePath !== 'string' ||
      !storagePath.trim() ||
      storagePath.length > 500 ||
      storagePath.startsWith('/') ||
      storagePath.includes('..') ||
      storagePath.includes('//') ||
      storagePath.includes('\\')
    ) {
      console.error('Invalid stored audio path for recording:', rec.id);
      return sendError(res, 400, 'Invalid storage path');
    }

    // The requested path must exactly match a stored path.
    if (
      fileName !== rec.file_name &&
      fileName !== rec.audio_path
    ) {
      return sendError(res, 403, 'Invalid file path');
    }

    // 4. Determine chairman access using trusted server-side config.
    // A matching email alone grants no privileges unless it is allowlisted.
    const authenticatedEmail = (
      user.email || ''
    ).trim().toLowerCase();

    const emailIsAllowlisted =
      Boolean(authenticatedEmail) &&
      CHAIRMAN_ALLOWLIST.includes(authenticatedEmail);

    let isChairman = false;

    if (emailIsAllowlisted) {
      const {
        data: profile,
        error: profileError
      } = await supabaseAdmin
        .from('profiles')
        .select('is_chairman')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          'Chairman profile lookup error:',
          profileError.message
        );
        return sendError(res, 500, 'Cannot process request');
      }

      // Require both the allowlisted authenticated account
      // and its server-maintained chairman flag.
      isChairman = profile?.is_chairman === true;
    }

    // 5. Enforce authorization before creating a signed URL.
    if (!isChairman) {
      // Workers may access only their own recordings.
      if (rec.user_id !== user.id) {
        return sendError(res, 403, 'Not your recording');
      }

      // Workers cannot play rejected or other disallowed statuses.
      if (!WORKER_ALLOWED_STATUSES.has(rec.admin_status)) {
        return sendError(
          res,
          403,
          'This recording is not available for playback'
        );
      }

      // Workers cannot replay locked recordings.
      if (rec.locked_for_worker === true) {
        return sendError(
          res,
          403,
          'Recording locked after submission'
        );
      }
    }

    // 6. Create a short-lived signed URL only after authorization.
    const {
      data: signed,
      error: signError
    } = await supabaseAdmin
      .storage
      .from('voices')
      .createSignedUrl(
        storagePath,
        SIGNED_URL_TTL_SECONDS
      );

    if (signError || !signed?.signedUrl) {
      console.error(
        'Signed URL creation failed:',
        signError?.message || 'No signed URL returned'
      );
      return sendError(res, 500, 'Cannot create playback URL');
    }

    // 7. Return the authorized playback URL.
    return res.status(200).json({
      success: true,
      signedUrl: signed.signedUrl,
      status: rec.admin_status,
      locked: rec.locked_for_worker === true,
      pid: rec.api_number || null,
      expiresIn: SIGNED_URL_TTL_SECONDS
    });

  } catch (error) {
    console.error(
      'Unexpected my-voice API error:',
      error?.message || 'Unknown error'
    );

    return sendError(res, 500, 'Cannot process request');
  }
}