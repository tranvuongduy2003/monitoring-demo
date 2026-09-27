interface StatusBadgeProps {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}

export function StatusBadge({ active, activeLabel, inactiveLabel }: StatusBadgeProps) {
  return (
    <span className={`status ${active ? 'online' : ''}`}>
      <span className="status-dot" aria-hidden="true" />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
