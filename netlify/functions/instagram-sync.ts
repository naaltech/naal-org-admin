// Netlify zamanlanmış fonksiyonu: Instagram senkronizasyon route'unu düzenli olarak tetikler.
// URL, Netlify'ın sitenin ana adresi için sağladığı ortam değişkenidir.

export default async function handler() {
  const response = await fetch(`${process.env.URL}/api/instagram/cron`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  console.log('Instagram sync', response.status, await response.text())
}

export const config = {
  schedule: '*/20 * * * *',
}
