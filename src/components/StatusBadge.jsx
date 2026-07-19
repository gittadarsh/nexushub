import { STATUS_LABELS } from '../services/events';

const STATUS_STYLES = {
  open: 'bg-green-100 text-green-800',
  few_seats: 'bg-signal/10 text-signal',
  closed: 'bg-line text-muted',
  completed: 'bg-line text-muted'
};

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
