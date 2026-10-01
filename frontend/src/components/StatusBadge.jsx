function StatusBadge({ status }) {
  if (!status) return null;

  const getStatusClass = (val) => {
    const s = String(val).toLowerCase();
    switch (s) {
      case "active":
      case "paid":
      case "successful":
      case "completed":
        return "badge-success";

      case "vacant":
        return "badge-vacant";

      case "occupied":
        return "badge-occupied";

      case "reserved":
        return "badge-reserved";

      case "due":
      case "partial":
      case "partially occupied":
      case "pending":
        return "badge-warning";

      case "overdue":
      case "failed":
      case "maintenance":
      case "inactive":
        return "badge-danger";

      default:
        return "badge-default";
    }
  };

  return <span className={`badge ${getStatusClass(status)}`}>{status}</span>;
}

export default StatusBadge;
