function generateBedOccupancyChartSVG(totalBeds, occupied) {
  const width = 700; const height = 60; const padding = 10;
  const free = Math.max(0, totalBeds - occupied);
  const occW = totalBeds ? Math.round((occupied/totalBeds) * (width - padding*2)) : 0;
  const freeW = width - padding*2 - occW;
  return `<div><h3>Bed Occupancy</h3><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" fill="#f9fbff"/><rect x="${padding}" y="${padding}" width="${occW}" height="40" fill="#2b7bd3" rx="6"/><rect x="${padding + occW}" y="${padding}" width="${freeW}" height="40" fill="#dfefff" rx="6"/><text x="${padding+6}" y="${padding+26}" fill="#fff" font-size="14">Occupied: ${occupied}</text><text x="${padding+occW+6}" y="${padding+26}" fill="#000" font-size="14">Free: ${free}</text></svg></div>`;
}

function generateWardOccupancyBarChartSVG(wards) {
  const width = 700; const barH = 18; const gap = 8; const left=120; const height = wards.length * (barH + gap) + 40;
  const maxBeds = Math.max(...wards.map(w=>w.beds||1),1);
  let rows = wards.map((w,i)=>{
    const x = left; const y = 20 + i*(barH+gap);
    const baseW = (width - left - 40);
    let wlen = Math.round(((w.occ||0)/ (w.beds||1)) * baseW);
    // If there's no occupancy bar (wlen <= 0) show a full gray placeholder to indicate none
    let fillCol = '#61b878';
    let textCol = '#fff';
    if (!wlen || wlen <= 0) {
      wlen = baseW;
      fillCol = '#cfcfcf';
      textCol = '#000';
    }
    return `<rect x="0" y="${y-6}" width="${width}" height="${barH+8}" fill="#ffffff" opacity="0.9"/>` +
           `<text x="8" y="${y+12}" font-size="12">${w.name}</text><rect x="${x}" y="${y}" width="${wlen}" height="${barH}" fill="${fillCol}"/><text x="${x + Math.max(6,wlen-30)}" y="${y+12}" font-size="12" fill="${textCol}">${w.occ||0}/${w.beds||0}</text>`;
  }).join('');
  return `<div><h3>Ward Occupancy</h3><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" fill="#f9fbff"/></svg><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${rows}</svg></div>`;
}

// Estimate wait time based on recent discharge rate or average length-of-stay
function estimateWaitTime(waiting) {
  const now = new Date();
  // count discharges in last 30 days
  const dis30 = DB.patient.filter(p => p.status === 'Discharged' && p.actualLeave).filter(p => {
    const d = new Date(p.actualLeave);
    if (isNaN(d)) return false;
    return (now - d) <= (30*24*60*60*1000);
  }).length;
  const dailyRate = dis30 / 30;
  if (dailyRate >= 0.01) {
    const days = Math.ceil(waiting / dailyRate) || 0;
    return days + ' days (~' + Math.ceil(days/7) + ' wk) based on recent discharge rate';
  }

  // fallback: compute average length-of-stay and infer throughput
  const los = DB.patient.filter(p => p.status === 'Discharged' && p.actualLeave && p.placedDate).map(p => {
    const a = new Date(p.actualLeave), b = new Date(p.placedDate);
    if (isNaN(a) || isNaN(b)) return null;
    return Math.max(1, Math.round((a - b)/(24*60*60*1000)));
  }).filter(Boolean);
  if (los.length) {
    const avgLos = los.reduce((s,v)=>s+v,0)/los.length;
    const a = generateDashboardAnalysis();
    const occ = a.occupied || 0;
    const daily = avgLos > 0 ? (occ / avgLos) : 0;
    if (daily >= 0.01) {
      const days = Math.ceil(waiting / daily) || 0;
      return days + ' days (~' + Math.ceil(days/7) + ' wk) based on avg length-of-stay';
    }
  }

  return 'Insufficient recent discharge data to estimate';
}

