/**
 * Badge Component - 状态标签
 */

import { statusBadge } from '../utils';

export default function Badge({ status, text, type }) {
  const badgeInfo = text
    ? { text, cls: `badge-${type || 'info'}` }
    : statusBadge(status);

  return (
    <span className={`badge ${badgeInfo.cls}`}>
      {badgeInfo.text}
    </span>
  );
}
