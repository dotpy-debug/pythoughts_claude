#!/usr/bin/env python3
"""
Automated fix for logger.error() API call issues.

This script systematically fixes all logger.error() calls that pass non-Error
objects in the error property by converting them to proper Error objects.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

# Patterns to fix
PATTERNS = [
    # Pattern 1: { error: errorMessage } where errorMessage is a string
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*error:\s*errorMessage\s*,',
        'replace': lambda m: f'logger.error({m.group(1)}, new Error(errorMessage), {{',
        'description': 'Fix { error: errorMessage } pattern'
    },
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*error:\s*errorMessage\s*\}\s*\)',
        'replace': lambda m: f'logger.error({m.group(1)}, new Error(errorMessage))',
        'description': 'Fix { error: errorMessage } (only property) pattern'
    },
    # Pattern 2: { error: error.message } where error is Supabase error
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*error:\s*([a-zA-Z_]+)\.message\s*,',
        'replace': lambda m: f'logger.error({m.group(1)}, new Error({m.group(2)}.message), {{',
        'description': 'Fix { error: supabaseError.message } pattern'
    },
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*error:\s*([a-zA-Z_]+)\.message\s*\}\s*\)',
        'replace': lambda m: f'logger.error({m.group(1)}, new Error({m.group(2)}.message))',
        'description': 'Fix { error: supabaseError.message } (only property) pattern'
    },
    # Pattern 3: { error: result.error } where result.error is a string
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*error:\s*result\.error\s*\}\s*\)',
        'replace': lambda m: f'logger.error({m.group(1)}, new Error(result.error))',
        'description': 'Fix { error: result.error } pattern'
    },
    # Pattern 4: { error: err.message } in catch blocks
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*error:\s*err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*[^,}]+\s*\}\s*\)',
        'replace': lambda m: f'logger.error({m.group(1)}, err instanceof Error ? err : new Error(String(err)))',
        'description': 'Fix { error: err instanceof Error ? err.message : ... } pattern'
    },
    # Pattern 5: { postError: error.message }
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*(\w+Error):\s*(\w+)\.message\s*,',
        'replace': lambda m: f'logger.error({m.group(1)}, new Error({m.group(3)}.message), {{ {m.group(2)}Type: \'{m.group(2)}\',',
        'description': 'Fix { namedError: error.message } pattern'
    },
    # Pattern 6: Complex error with stack
    {
        'search': r'logger\.error\(([^,]+),\s*\{\s*error:\s*([a-zA-Z_]+)\.message\s*,\s*stack:\s*\2\.stack\s*,',
        'replace': lambda m: f'logger.error({m.group(1)}, {m.group(2)}, {{',
        'description': 'Fix { error: err.message, stack: err.stack } pattern'
    },
]

def should_skip_file(filepath: str) -> bool:
    """Check if file should be skipped."""
    skip_patterns = [
        'node_modules',
        '.git',
        'coverage',
        'dist',
        'build',
        '.next',
        'DEBUG.md',
        'fix-logger-errors.py',
        'logger.ts',  # Don't modify the logger itself
    ]
    return any(pattern in filepath for pattern in skip_patterns)

def fix_file(filepath: Path) -> Tuple[bool, int]:
    """Fix logger.error() calls in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        fixes_count = 0

        # Apply each pattern
        for pattern in PATTERNS:
            matches = re.findall(pattern['search'], content)
            if matches:
                content = re.sub(pattern['search'], pattern['replace'], content)
                fixes_count += len(matches)

        # If content changed, write back
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, fixes_count

        return False, 0

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False, 0

def find_files_with_logger_errors(root_dir: str) -> List[Path]:
    """Find all TypeScript/TSX files with logger.error() calls."""
    files = []
    root_path = Path(root_dir)

    for ext in ['*.ts', '*.tsx']:
        for filepath in root_path.rglob(ext):
            if should_skip_file(str(filepath)):
                continue

            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'logger.error(' in content:
                        files.append(filepath)
            except Exception:
                continue

    return files

def main():
    """Main function."""
    print("=" * 80)
    print("Logger.error() API Fix Script")
    print("=" * 80)
    print()

    # Find all files with logger.error()
    root_dir = Path(__file__).parent / 'src'
    print(f"Scanning {root_dir} for files with logger.error() calls...")
    files = find_files_with_logger_errors(str(root_dir))
    print(f"Found {len(files)} files with logger.error() calls")
    print()

    # Fix each file
    fixed_files = []
    total_fixes = 0

    for filepath in files:
        rel_path = filepath.relative_to(Path(__file__).parent)
        modified, fixes = fix_file(filepath)

        if modified:
            fixed_files.append(str(rel_path))
            total_fixes += fixes
            print(f"✓ Fixed {fixes} issue(s) in {rel_path}")

    # Summary
    print()
    print("=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"Total files scanned: {len(files)}")
    print(f"Total files fixed: {len(fixed_files)}")
    print(f"Total fixes applied: {total_fixes}")
    print()

    if fixed_files:
        print("Fixed files:")
        for f in sorted(fixed_files):
            print(f"  - {f}")
    else:
        print("No files needed fixing (or all already fixed manually)")

    print()
    print("Next steps:")
    print("1. Review the changes with git diff")
    print("2. Run: npx tsc --noEmit")
    print("3. Run tests: npm test")
    print("4. Commit changes")

if __name__ == '__main__':
    main()
