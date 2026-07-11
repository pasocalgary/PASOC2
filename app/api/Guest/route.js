export const dynamic = 'force-dynamic';

import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req) {
  const { name, email } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  try {
    // Check for duplicate
    const [existing] = await pool.query(
      'SELECT id FROM GuestUsers WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'duplicate' }, { status: 409 });
    }

    await pool.query(
      'INSERT INTO GuestUsers (name, email) VALUES (?, ?)',
      [name, email]
    );

    const resend = getResend();
    await resend.emails.send({
      from: 'Pangasinan Society of Calgary <noreply@pasoc.cloud>',
      to: email,
      subject: `Welcome to PASOC, ${name}!`,
      html: `
        <h2>Thank you for signing up as a guest!</h2>
        <p>Hi ${name},</p>
        <p>We're glad to have you connected with the Pangasinan Society of Calgary. 
        We'll keep you updated on upcoming events and community news.</p>
        <br/>
        <p>Warm regards,<br/>Pangasinan Society of Calgary</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}