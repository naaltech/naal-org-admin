import { SkeletonText } from '@carbon/react'

export interface Stat {
  label: string
  value: React.ReactNode
}

/** Liste sayfalarının üstündeki özet sayılar. */
export default function StatStrip({ stats, loading }: { stats: Stat[]; loading?: boolean }) {
  return (
    <dl className="stat-strip">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-strip__item">
          <dt className="stat-strip__label">{stat.label}</dt>
          <dd className="stat-strip__value">{loading ? <SkeletonText heading width="3rem" /> : stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
