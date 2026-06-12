export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return { error: 'RESEND_API_KEY environment variable is not set' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@gerak.online',
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      let message = `Resend API error: ${response.status} ${response.statusText}`
      try {
        const body: unknown = await response.json()
        if (
          body !== null &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as Record<string, unknown>).message === 'string'
        ) {
          message = (body as Record<string, string>).message
        }
      } catch {
        // body is not JSON — keep the status-based message
      }
      return { error: message }
    }

    return { error: null }
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { error: err.message }
    }
    return { error: 'An unknown network error occurred while sending email' }
  }
}
