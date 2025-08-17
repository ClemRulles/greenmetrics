#!/bin/bash
# scripts/check-i18n-parity.sh
# Validates that all i18n namespace files have identical key structures across languages

set -e

LOCALES_DIR="${1:-public/locales}"
LANGUAGES=("en" "fr")

echo "🌍 Checking i18n key parity in ${LOCALES_DIR}..."

# Check if locales directory exists
if [[ ! -d "$LOCALES_DIR" ]]; then
  echo "❌ Locales directory not found: $LOCALES_DIR"
  echo "💡 For documentation samples, run: $0 docs/locales-samples"
  exit 1
fi

# Find all JSON files in the reference language (en)
if [[ ! -d "${LOCALES_DIR}/en" ]]; then
  echo "❌ Reference language directory not found: ${LOCALES_DIR}/en"
  exit 1
fi

error_count=0

for file in $(find "${LOCALES_DIR}/en" -name "*.json" -type f); do
  namespace=$(basename "$file")
  echo "🔍 Checking namespace: $namespace"
  
  # Validate JSON syntax for EN file
  if ! jq empty "$file" 2>/dev/null; then
    echo "❌ Invalid JSON syntax in EN file: $file"
    ((error_count++))
    continue
  fi
  
  en_keys=$(jq '[paths(scalars)] | length' "$file")
  echo "  📊 EN keys: $en_keys"
  
  # Check each target language
  for lang in "${LANGUAGES[@]}"; do
    if [[ "$lang" == "en" ]]; then
      continue  # Skip reference language
    fi
    
    lang_file="${LOCALES_DIR}/${lang}/${namespace}"
    
    # Check if file exists
    if [[ ! -f "$lang_file" ]]; then
      echo "❌ Missing file: $lang_file"
      ((error_count++))
      continue
    fi
    
    # Validate JSON syntax
    if ! jq empty "$lang_file" 2>/dev/null; then
      echo "❌ Invalid JSON syntax in $lang file: $lang_file"
      ((error_count++))
      continue
    fi
    
    # Count keys
    lang_keys=$(jq '[paths(scalars)] | length' "$lang_file")
    echo "  📊 $lang keys: $lang_keys"
    
    # Compare key counts
    if [[ "$en_keys" != "$lang_keys" ]]; then
      echo "❌ Key count mismatch in $namespace: EN=$en_keys, $lang=$lang_keys"
      
      # Show detailed diff if jq supports it
      if command -v diff >/dev/null 2>&1; then
        echo "🔍 Key structure diff:"
        diff <(jq -r '[paths(scalars)] | sort | .[]' "$file") \
             <(jq -r '[paths(scalars)] | sort | .[]' "$lang_file") || true
      fi
      
      ((error_count++))
      continue
    fi
    
    # Verify key paths match (not just counts)
    en_paths=$(jq -r '[paths(scalars)] | sort | .[]' "$file")
    lang_paths=$(jq -r '[paths(scalars)] | sort | .[]' "$lang_file")
    
    if [[ "$en_paths" != "$lang_paths" ]]; then
      echo "❌ Key structure mismatch in $namespace between EN and $lang"
      echo "🔍 Differing paths:"
      diff <(echo "$en_paths") <(echo "$lang_paths") || true
      ((error_count++))
      continue
    fi
  done
  
  echo "✅ $namespace: parity verified across all languages"
done

echo ""
if [[ $error_count -eq 0 ]]; then
  echo "🎉 All i18n files have perfect key parity!"
  echo "📋 Summary:"
  echo "   - Locales directory: $LOCALES_DIR"
  echo "   - Languages checked: ${LANGUAGES[*]}"
  echo "   - Namespaces verified: $(find "${LOCALES_DIR}/en" -name "*.json" | wc -l)"
  exit 0
else
  echo "💥 Found $error_count i18n parity issues"
  echo "🔧 Fix all key mismatches before proceeding"
  exit 1
fi
