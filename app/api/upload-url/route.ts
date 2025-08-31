import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { fileName } = await req.json();           // <— no contentType needed
  const bucket = 'documents';
  const key = `${crypto.randomUUID()}-${fileName}`;

  const { data, error } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUploadUrl(key, { upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // data contains: { signedUrl, token, path }
  return NextResponse.json({ key, ...data });
}
