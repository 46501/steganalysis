/**
 * StegoShield AI - Universal Safe Error Formatter
 * 
 * Safely normalizes any error, backend exception, FastAPI 422 Pydantic validation array,
 * Axios error object, or network failure into a safe string.
 * Guarantees that React Invariant #31 (Objects are not valid as a React child) cannot occur.
 */
export const formatApiError = (err, fallback = 'Operation failed') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  // Extract candidate message/detail
  const detail =
    err.response?.data?.detail ??
    err.response?.data?.message ??
    err.message ??
    err;

  if (typeof detail === 'string') return detail;

  // FastAPI 422 Pydantic validation list: [{type, loc, msg, input}, ...]
  if (Array.isArray(detail)) {
    const formatted = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return item.msg || item.message || JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean)
      .join('; ');
    return formatted || fallback;
  }

  // Single error object
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail || fallback);
};

export default formatApiError;
