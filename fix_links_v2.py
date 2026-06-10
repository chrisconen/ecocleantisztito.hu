import os
import re
import urllib.parse

# Mapping for removing accents
ACCENT_MAP = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ö': 'o', 'ü': 'u', 'ő': 'o', 'ű': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ö': 'O', 'Ü': 'U', 'Ő': 'O', 'Ű': 'U',
}

# Mapping for URL encoding accents (pre-computed for speed and precision)
# We'll use urllib.parse.quote on the individual accented characters.
ACCENT_ENCODE_MAP = {c: urllib.parse.quote(c) for c in ACCENT_MAP.keys()}
# Also include the uppercase ones in the encode map if they aren't in ACCENT_MAP
for c in ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ö', 'Ü', 'Ő', 'Ű']:
    if c not in ACCENT_ENCODE_MAP:
        ACCENT_ENCODE_MAP[c] = urllib.parse.quote(c)

def remove_accents(text):
    return "".join(ACCENT_MAP.get(c, c) for c in text)

def url_encode_accents(text):
    result = []
    for char in text:
        if char in ACCENT_ENCODE_MAP:
            result.append(ACCENT_ENCODE_MAP[char])
        else:
            result.append(char)
    return "".join(result)

# Regex to find https:// links
# It matches https:// followed by any character that is NOT a quote, whitespace, or angle bracket
LINK_REGEX = re.compile(r'https?://[^"\'\s<>]+')

def process_content(content):
    def replacer(match):
        url = match.start(), match.end(), match.group(0)
        start, end, original_url = url
        
        # Check context: 30 characters before the match
        context_start = max(0, start - 40)
        context = content[context_start:start].lower()
        
        # Determine if it's an image
        is_image = False
        # 1. Check context for image-related keywords
        if any(kw in context for kw in ['image', 'og:image', 'twitter:image', 'src']):
            is_image = True
        # 2. Check extension
        if any(original_url.lower().endswith(ext) for ext in ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg']):
            is_image = True
            
        if is_image:
            return url_encode_accents(original_url)
        else:
            return remove_accents(original_url)

    # We use a list of matches to avoid issues with changing string length during iteration
    # But re.sub with a callback is generally safe and handles this.
    return LINK_REGEX.sub(replacer, content)

def main():
    files_processed = 0
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = process_content(content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {file_path}")
                    files_processed += 1
                else:
                    pass # Too much noise if we print every file
                    
    print(f"\nDone! Updated {files_processed} files.")

if __name__ == "__main__":
    main()
