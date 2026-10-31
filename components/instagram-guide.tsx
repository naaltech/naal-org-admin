'use client'

import { Accordion, AccordionItem, Link, ListItem, OrderedList, Stack, UnorderedList } from '@carbon/react'

const STEPS = [
  {
    title: 'Hesap türünü kontrol edin',
    items: [
      <>Kulüp hesabı <strong>İşletme</strong> veya <strong>İçerik Üreticisi</strong> olmalı. Kişisel hesap bağlanamaz.</>,
      'Instagram’da Ayarlar › Hesap türü ve araçlar bölümünden bakabilirsiniz.',
    ],
  },
  {
    title: 'Test kullanıcısı davetini kabul edin',
    items: [
      'Bilgisayar veya telefon tarayıcısından kulüp hesabıyla Instagram’a girin.',
      <>
        <Link href="https://www.instagram.com/accounts/manage_access/" target="_blank" rel="noopener noreferrer">
          instagram.com/accounts/manage_access
        </Link>{' '}
        adresini açın.
      </>,
      <><strong>Test kullanıcısı davetleri</strong> (Tester Invites) sekmesine geçin.</>,
      <><strong>nevzatayazal sync</strong> davetini kabul edin.</>,
    ],
  },
  {
    title: 'Hesabı bağlayın',
    items: [
      <>Bu sayfada <strong>Instagram hesabı bağla</strong> düğmesine basın.</>,
      <>Onay kutusunu işaretleyip <strong>Instagram ile devam et</strong> düğmesine basın.</>,
      'Instagram’a kişisel hesabınızla değil, kulüp hesabıyla giriş yapın ve izin verin.',
    ],
  },
  {
    title: 'Sonucu kontrol edin',
    items: ['Hesap bu listede görünür. Yeni postlar 20 dakika içinde siteye aktarılır.'],
  },
]

const PROBLEMS = [
  { title: '“Unsupported request” hatası', body: 'Davet kabul edilmemiş. 2. adımı yapıp hesabı yeniden bağlayın.' },
  {
    title: 'Davet görünmüyor',
    body: 'Doğru hesapla girdiğinizi kontrol edin. Yine görünmüyorsa kullanıcı adını panel yöneticisine iletin.',
  },
]

/** Hesap bağlanmadıysa adımlar açık gelir; kulüpler rehbere başka yerde bakmak zorunda kalmaz. */
export default function InstagramGuide({ open }: { open: boolean }) {
  return (
    <Accordion>
      <AccordionItem title="Hesap nasıl bağlanır?" open={open}>
        <Stack gap={6}>
          <OrderedList>
            {STEPS.map((step) => (
              <ListItem key={step.title}>
                <strong>{step.title}</strong>
                <UnorderedList nested>
                  {step.items.map((item, index) => (
                    <ListItem key={index}>{item}</ListItem>
                  ))}
                </UnorderedList>
              </ListItem>
            ))}
          </OrderedList>
          <Stack gap={3}>
            <strong>Sorun olursa</strong>
            {PROBLEMS.map((problem) => (
              <p key={problem.title}>
                <strong>{problem.title}:</strong> {problem.body}
              </p>
            ))}
          </Stack>
        </Stack>
      </AccordionItem>
    </Accordion>
  )
}
