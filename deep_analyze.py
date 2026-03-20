import os
import re

def get_identifiers(content):
    # This regex is a bit simplistic but catches most vars, functions, classes
    return set(re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b', content))

def analyze_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    content = "".join(lines)
    # Remove strings and comments for usage check
    content_clean = re.sub(r'//.*', '', content)
    content_clean = re.sub(r'/\*.*?\*/', '', content_clean, flags=re.DOTALL)
    content_clean = re.sub(r"'(.*?)'", "''", content_clean)
    content_clean = re.sub(r'"(.*?)"', '""', content_clean)
    content_clean = re.sub(r'`(.*?)`', '""', content_clean, flags=re.DOTALL)

    report = []
    
    # Check Imports
    for line in lines:
        if line.strip().startswith('import '):
            # Extract names manually (simplified)
            names_match = re.search(r'import\s+(.*?)\s+from', line)
            if names_match:
                names_part = names_match.group(1)
                # Handle { a, b as c }
                named = re.search(r'{(.*?)}', names_part)
                if named:
                    for n in named.group(1).split(','):
                        n = n.strip()
                        if not n: continue
                        name = n.split(' as ')[-1].strip()
                        # Count occurrences in cleaned content (excluding import line)
                        # The import line itself contains the name
                        if len(re.findall(r'\b' + re.escape(name) + r'\b', content_clean)) <= 1:
                            report.append(f"Unused Import: {name}")
                else:
                    # Default or namespace import
                    name = names_part.strip().split(',')[-1].split(' as ')[-1].strip()
                    if name and len(re.findall(r'\b' + re.escape(name) + r'\b', content_clean)) <= 1:
                        report.append(f"Unused Import: {name}")

    # Check local variables / functions
    # const myVar = ...
    # function myFunc(...) {
    local_defs = re.findall(r'\b(?:const|let|var|function)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b', content_clean)
    for name in local_defs:
        if name in ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'React']: continue
        # If it only appears once, it's just the definition
        if len(re.findall(r'\b' + re.escape(name) + r'\b', content_clean)) == 1:
            # Check if exported (export const ...)
            if not re.search(r'export\s+(?:const|let|var|function)\s+' + re.escape(name), content):
                report.append(f"Unused Local: {name}")

    return report

def main():
    for root, _, files in os.walk('src'):
        for file in files:
            if file.endswith(('.js', '.jsx')):
                path = os.path.join(root, file)
                issues = analyze_file(path)
                if issues:
                    print(f"\n--- {path} ---")
                    for issue in issues:
                        print(f"  [!] {issue}")

if __name__ == "__main__":
    main()
