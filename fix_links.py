import os
import re
import urllib.parse

# Mapping for removing accents
ACCENT_MAP = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ö': 'o', 'ü': 'u', 'ő': 'o', 'ű': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ö': 'O', 'Ü': 'U', 'Ő': 'O', 'Ű': 'U',
    'ŕ': 'r', 'ṕ': 'p', 'ŧ': 't', 'ő': 'o', 'ű': 'u' # adding some extra if needed
}

def remove_accents(text):
    return "".join(ACCENT_MAP.get(c, c) for c in text)

def url_encode_accents(text):
    # We only want to encode the accented characters, not the whole URL
    # because encoding / or ? would break it.
    # A simple way is to encode the whole string and then decode the non-accented parts,
    # but that's complex. 
    # Better: iterate through characters and if it's accented, use its percent encoding.
    result = []
    for char in text:
        if char in ACCENT_MAP or ord(char) > 127:
            # Encode the character
            result.append(urllib.parse.quote(char))
        else:
            result.append(char)
    return "".join(result)

# Regex patterns
# Group 1: The prefix/attribute, Group 2: The URL
IMAGE_PATTERN = re.compile(r'(og:image|twitter:image|image["\']?\s*[:=]\s*["\']|src=["\'])(https?://[^"\']+\.(?:webp|jpg|jpeg|png|gif|svg))', re.IGNORECASE)
LINK_PATTERN = re.compile(r'(href|og:url|url["\']?\s*[:=]\s*["\']|canonical["\']?\s*[:=]\s*["\']|hasMap["\']?\s*[:=]\s*["\'])(https?://[^"\']+)', re.IGNORECASE)

def process_content(content):
    # We must be careful not to let the link pattern overwrite the image pattern if they overlap.
    # We'll process images first, then links.
    # However, a URL might be matched by both if it's an image in an href.
    # But the user said: "a képeket url encode-val - a linkeket ékezet nélküli-re".
    # Usually, an image URL is in src or og:image. A link URL is in href or og:url.
    
    # Let's use a single pass with a callback to avoid double-processing.
    
    def replacer(match):
        prefix = match.group(1)
        url = match.group(2)
        
        # Check if it's an image based on extension or prefix
        is_image = False
        if any(ext in url.lower() for ext in ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg']):
            is_image = True
        if any(p in prefix.lower() for p in ['og:image', 'twitter:image', 'image']):
            is_image = True
            
        if is_image:
            # URL encode accents
            new_url = url_encode_accents(url)
            return f"{prefix}{new_url}"
        else:
            # Remove accents
            new_url = remove_accents(url)
            return f"{prefix}{new_url}"

    # Combine patterns into one to ensure each match is handled once
    combined_pattern = re.compile(r'(?:(og:image|twitter:image|image["\']?\s*[:=]\s*["\']|src=["\'])(https?://[^"\']+\.(?:webp|jpg|jpeg|png|gif|svg))|(href|og:url|url["\']?\s*[:=]\s*["\']|canonical["\']?\s*[:=]\s*["\']|hasMap["\']?\s*[:=]\s*["\'])(https?://[^"\']+))', re.IGNORECASE)

    def combined_replacer(match):
        # If the first group of the OR matched (Image)
        if match.group(1):
            prefix = match.group(1)
            url = match.group(2)
            return f"{prefix}{url_encode_accents(url)}"
        # If the second group of the OR matched (Link)
        else:
            prefix = match.group(3)
            url = match.group(4)
            return f"{prefix}{remove_accents(url)}"

    return combined_pattern.sub(combined_replacer, content)

def main():
    files_processed = 0
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                print(f"Processing: {file_path}")
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = process_content(content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"  [UPDATED] {file_path}")
                    files_processed += 1
                else:
                    print(f"  [NO CHANGE] {file_path}")
                    
    print(f"\nDone! Updated {files_processed} files.")

if __name__ == "__main__":
    main()
