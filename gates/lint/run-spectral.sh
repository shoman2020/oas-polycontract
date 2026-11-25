#!/bin/sh
set -eu

output_file=$(mktemp)
trap 'rm -f "$output_file"' EXIT INT TERM

if spectral "$@" >"$output_file" 2>&1; then
  spectral_status=0
else
  spectral_status=$?
fi

# Filter only Spectral's known Node DEP0040 punycode notice and its help line.
awk '
  /^\(node:[0-9]+\) \[DEP0040\] DeprecationWarning: The `punycode` module is deprecated\./ {
    suppress_help=1
    next
  }
  suppress_help && /^\(Use `spectral --trace-deprecation/ {
    suppress_help=0
    next
  }
  suppress_help { suppress_help=0 }
  { print }
' "$output_file"

exit "$spectral_status"
