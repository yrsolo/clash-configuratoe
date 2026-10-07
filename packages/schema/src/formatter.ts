/** Resolve the deployment's formatter without depending on the original owner's host. */
export const getDefaultFormatterUrl = () =>
  typeof location !== "undefined" && /^https?:$/.test(location.protocol)
    ? `${location.origin}/api/formatter`
    : "https://formatter.invalid/api/formatter";
