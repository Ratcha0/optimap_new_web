import os
import re

def extract_imported_names(import_line):
    names = []
    # Remove 'import' and 'from ...'
    m = re.match(r'import\s+(.*?)\s+from\s+', import_line)
    if not m: return []
    part = m.group(1)
    
    # Handle { named }
    named_match = re.search(r'{(.*?)}', part)
    if named_match:
        named_part = named_match.group(1)
        # Handle 'a as b'
        for name in named_part.split(','):
            name = name.strip()
            if not name: continue
            if ' as ' in name:
                names.append(name.split(' as ')[1].strip())
            else:
                names.append(name)
        # Remove the { part } to check for default imports outside
        part = part.replace(named_match.group(0), '')
    
    # Handle default import or * as namespace
    # After removing { ... }, we might have "default_import," or "*, " or "* as ns"
    remaining = part.split(',')
    for r in remaining:
        r = r.strip()
        if not r: continue
        if r.startswith('* as '):
            names.append(r.replace('* as ', '').strip())
        elif r == '*':
            # Should not happen in modern JS usually alone
            pass
        else:
            names.append(r)
            
    return names

def check_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    content = "".join(lines)
    # Remove comments
    content_no_comments = re.sub(r'//.*', '', content)
    content_no_comments = re.sub(r'/\*.*?\*/', '', content_no_comments, flags=re.DOTALL)
    
    import_lines = []
    for line in lines:
        if line.strip().startswith('import '):
            import_lines.append(line.strip())
            
    all_imported = []
    for line in import_lines:
        all_imported.extend(extract_imported_names(line))
        
    unused = []
    for name in all_imported:
        # Search in the code WITHOUT the import lines
        # This is a bit safer
        code_only = content_no_comments
        for line in import_lines:
            code_only = code_only.replace(line, '')
            
        pattern = r'\b' + re.escape(name) + r'\b'
        # Check if it appears in the code (not in import statements)
        if len(re.findall(pattern, code_only)) == 0:
            unused.append(name)
            
    return unused

def main():
    report = {}
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith(('.js', '.jsx')):
                path = os.path.join(root, file)
                try:
                    unused = check_file(path)
                    if unused:
                        report[path] = sorted(list(set(unused)))
                except Exception as e:
                    print(f"Error checking {path}: {e}")
    
    for path, names in sorted(report.items()):
        print(f"{path}: {', '.join(names)}")

if __name__ == "__main__":
    main()
