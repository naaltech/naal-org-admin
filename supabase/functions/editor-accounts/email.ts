export interface Email {
  to: string
  subject: string
  text: string
  html: string
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** Editöre giriş bilgilerini ileten e-posta; şifre sıfırlandığında da aynı biçimde gönderilir. */
export function buildCredentialsEmail(input: {
  to: string
  name: string
  clubName: string
  password: string
  loginUrl: string
  reset: boolean
}): Email {
  const { to, name, clubName, password, loginUrl, reset } = input
  const greeting = name ? `Merhaba ${name},` : 'Merhaba,'
  const intro = reset
    ? `${clubName} dergi editörü hesabınız için yeni bir şifre oluşturuldu. Eski şifreniz artık geçerli değil.`
    : `${clubName} sizi dergi editörü olarak ekledi. Aşağıdaki bilgilerle kulüp yönetim paneline giriş yaparak dergi sayılarını ekleyebilir, düzenleyebilir ve yayımlayabilirsiniz.`
  const advice = 'Şifrenizi kimseyle paylaşmayın. Unutursanız kulüpten yeni şifre isteyebilirsiniz.'
  const footer = `Bu e-posta ${clubName} adına NAAL Etkileşim Ağı (naal.org.tr) üzerinden gönderildi. Sorularınız için bu e-postayı yanıtlayabilirsiniz.`

  const text = [
    greeting,
    '',
    intro,
    '',
    `Giriş adresi: ${loginUrl}`,
    `E-posta: ${to}`,
    `Şifre: ${password}`,
    '',
    advice,
    '',
    '—',
    footer,
  ].join('\n')

  const row = (label: string, value: string, mono = false) =>
    `<tr><td style="padding:8px 12px 8px 0;color:#525252;width:30%">${escapeHtml(label)}</td>` +
    `<td style="padding:8px 0;${mono ? 'font-family:Menlo,Consolas,monospace;font-size:15px;' : ''}">${escapeHtml(value)}</td></tr>`
  const html = `<!doctype html><html lang="tr"><body style="margin:0;padding:24px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#161616">
<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px">
<p style="margin:0 0 16px;font-size:13px;color:#525252">${escapeHtml(clubName)}</p>
<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;line-height:1.5">${escapeHtml(intro)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 24px">
${row('Giriş adresi', loginUrl)}
${row('E-posta', to, true)}
${row('Şifre', password, true)}
</table>
<p style="margin:0 0 24px"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:12px 20px;background:#0f62fe;color:#ffffff;text-decoration:none">Panele giriş yap</a></p>
<p style="margin:0;line-height:1.5;color:#525252">${escapeHtml(advice)}</p>
<p style="margin:32px 0 0;font-size:12px;color:#6f6f6f;line-height:1.5">${escapeHtml(footer)}</p>
</div></body></html>`

  return {
    to,
    subject: reset ? `${clubName}: yeni şifreniz` : `${clubName}: dergi editörü hesabınız`,
    text,
    html,
  }
}
