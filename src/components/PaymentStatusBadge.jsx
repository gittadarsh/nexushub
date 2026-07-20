const PAYMENT_LABELS = {
  not_required: 'Free',
  pending_proof: 'Awaiting proof',
  pending_review: 'Needs review',
  approved: 'Paid',
  rejected: 'Rejected'
};

const PAYMENT_STYLES = {
  not_required: 'bg-line text-muted',
  pending_proof: 'bg-line text-muted',
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-signal/10 text-signal'
};

export default function PaymentStatusBadge({ status }) {
  if (!status || status === 'not_required') return null;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${PAYMENT_STYLES[status]}`}>
      {PAYMENT_LABELS[status]}
    </span>
  );
}
