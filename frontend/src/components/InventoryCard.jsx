export function Occupancy({ occupied, total, label = 'Occupancy Rate' }) {
  const rate = total ? Math.round(occupied * 100 / total) : 0;
  return (
    <div className="occupancy-section">
      <div className="occupancy-header"><span>{label}</span><strong>{rate}%</strong></div>
      <div className="progress-bar" role="progressbar" aria-label={label} aria-valuenow={rate}>
        <div className={`progress-fill ${rate >= 80 ? 'fill-forest' : 'fill-green'}`} style={{ width: `${rate}%` }} />
      </div>
      <small>{occupied} of {total} beds occupied</small>
    </div>
  );
}

export default function InventoryCard({ layout = 'property', title, summary, icon, badge, stats, beds, actions }) {
  const isFloor = layout === 'floor';
  return (
    <article className={`${layout}-card inventory-card`}>
      <div className="inventory-card-heading">
        {badge}
        {icon}
      </div>
      <h3>{title}</h3>
      {summary}
      <div className={isFloor ? 'floor-stats-grid' : 'property-stats'}>
        {stats.map(([label, value]) => (
          <div key={label} className={isFloor ? 'floor-stat-item' : ''}><strong>{value}</strong><span>{label}</span></div>
        ))}
      </div>
      <Occupancy occupied={beds.filter((bed) => bed.status === 'Occupied').length} total={beds.length} />
      {actions}
    </article>
  );
}
