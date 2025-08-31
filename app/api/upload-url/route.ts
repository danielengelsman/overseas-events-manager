import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { fileName, contentType } = await req.json();
  const bucket = 'documents';
  const key = `${crypto.randomUUID()}-${fileName}`;

  const { data, error } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUploadUrl(key, { upsert: false, contentType });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ key, signedUrl: data.signedUrl, path: data.path });
}
